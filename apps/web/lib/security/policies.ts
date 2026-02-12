import type { SSOConfig, SecurityPolicy } from "@prisma/client";
import { prisma } from "@repo/database";
import type { OrgRoleType } from "@/lib/permissions";

const DEFAULT_SESSION_TIMEOUT_MINUTES = 43200;

export interface UserSecurityContext {
  organizationId: string;
  organizationSlug: string;
  role: OrgRoleType;
  securityPolicy: SecurityPolicy | null;
  ssoConfig: SSOConfig | null;
}

export async function getUserSecurityContexts(
  userId: string
): Promise<UserSecurityContext[]> {
  const memberships = await prisma.organizationMember.findMany({
    where: { userId },
    include: {
      organization: {
        include: {
          securityPolicy: true,
          ssoConfig: true,
        },
      },
    },
  });

  return memberships
    .map((membership) => {
      const organization = membership.organization;
      if (!organization) return null;

      return {
        organizationId: membership.organizationId,
        organizationSlug: organization.slug,
        role: membership.role as OrgRoleType,
        securityPolicy: organization.securityPolicy ?? null,
        ssoConfig: organization.ssoConfig ?? null,
      };
    })
    .filter((context): context is UserSecurityContext => context !== null);
}

export function ensureSSOLoginAllowed(contexts: UserSecurityContext[]) {
  const enforcedOrgs = contexts.filter(
    (context) => context.ssoConfig?.enabled && context.ssoConfig.enforceSSO
  );

  if (enforcedOrgs.length === 0) {
    return;
  }

  const names = enforcedOrgs
    .map((context) => context.organizationSlug)
    .join(", ");

  throw new Error(
    `Password logins are disabled for ${names || "your organization"}. Please sign in using your configured SSO provider.`
  );
}

interface EnsureSecurityPolicyOptions {
  hasMfa: boolean;
  ipAddress?: string | null;
}

export function ensureSecurityPolicyCompliance(
  contexts: UserSecurityContext[],
  { hasMfa, ipAddress }: EnsureSecurityPolicyOptions
) {
  const policies = collectActivePolicies(contexts);
  if (policies.length === 0) return;

  const userRoles = new Set(contexts.map((context) => context.role));
  const requiresMfa = policies.some((policy) => {
    if (policy.mfaRequired) {
      return true;
    }
    const roleSet = policy.mfaRequiredRoles ?? [];
    return roleSet.some((role) => userRoles.has(role as OrgRoleType));
  });

  if (requiresMfa && !hasMfa) {
    throw new Error("Multi-factor authentication is required for this organization");
  }

  const ipPolicies = policies.filter((policy) => policy.ipWhitelistEnabled);
  if (ipPolicies.length > 0) {
    if (!ipAddress) {
      throw new Error("Unable to determine your IP address for whitelist enforcement");
    }

    const whitelist = ipPolicies.flatMap((policy) => policy.allowedIPs ?? []);
    const isAllowed = isIpAllowed(ipAddress, whitelist);

    if (!isAllowed) {
      throw new Error("Your IP address is not allowed by the configured whitelist");
    }
  }
}

export function getEffectiveSessionTimeout(contexts: UserSecurityContext[]): number {
  const policies = collectActivePolicies(contexts);
  if (policies.length === 0) {
    return DEFAULT_SESSION_TIMEOUT_MINUTES;
  }

  const timeouts = policies
    .map((policy) => policy.sessionTimeoutMinutes)
    .filter((value): value is number => typeof value === "number");

  if (timeouts.length === 0) {
    return DEFAULT_SESSION_TIMEOUT_MINUTES;
  }

  return Math.min(...timeouts, DEFAULT_SESSION_TIMEOUT_MINUTES);
}

function collectActivePolicies(contexts: UserSecurityContext[]): SecurityPolicy[] {
  return contexts
    .map((context) => context.securityPolicy)
    .filter((policy): policy is SecurityPolicy => Boolean(policy));
}

function isIpAllowed(ip: string, allowedList: string[]): boolean {
  if (!allowedList.length) return false;

  for (const entry of allowedList) {
    const trimmed = entry.trim();
    if (!trimmed) continue;

    if (trimmed.includes("/")) {
      if (isIpInCidr(ip, trimmed)) {
        return true;
      }
      continue;
    }

    if (trimmed === ip) {
      return true;
    }
  }

  return false;
}

function isIpInCidr(ip: string, cidr: string): boolean {
  const [network, prefix] = cidr.split("/");
  if (!network || !prefix) return false;

  const prefixLength = Number(prefix);
  if (Number.isNaN(prefixLength) || prefixLength < 0 || prefixLength > 32) {
    return false;
  }

  const ipValue = parseIPv4(ip);
  const networkValue = parseIPv4(network);
  if (ipValue === null || networkValue === null) {
    return false;
  }

  const mask = prefixLength === 0 ? 0 : (0xffffffff << (32 - prefixLength)) >>> 0;
  return (ipValue & mask) === (networkValue & mask);
}

function parseIPv4(value: string): number | null {
  const parts = value.split(".");
  if (parts.length !== 4) return null;

  let accumulator = 0;
  for (const part of parts) {
    const number = Number(part);
    if (!Number.isInteger(number) || number < 0 || number > 255) {
      return null;
    }

    accumulator = (accumulator << 8) | number;
  }

  return accumulator >>> 0;
}

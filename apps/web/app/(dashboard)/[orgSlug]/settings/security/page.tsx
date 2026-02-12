import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getOrganizationBySlug } from "@/lib/organization";
import { hasPermission, Permission } from "@/lib/permissions";
import { prisma } from "@repo/database";
import { SecuritySettingsForm } from "@/components/organization/security-settings-form";

interface PageProps {
  params: Promise<{ orgSlug: string }>;
}

export const metadata = {
  title: "Security Settings",
};

const defaultPolicy = {
  passwordMinLength: 8,
  passwordRequireUpper: true,
  passwordRequireLower: true,
  passwordRequireNumber: true,
  passwordRequireSpecial: false,
  sessionTimeoutMinutes: 43200,
  mfaRequired: false,
  mfaRequiredRoles: "",
  ipWhitelistEnabled: false,
  allowedIPs: "",
};

export default async function SecuritySettingsPage({ params }: PageProps) {
  const { orgSlug } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return null;
  }

  const { organization, membership } = await getOrganizationBySlug(
    orgSlug,
    session.user.id
  );

  if (!organization || !membership) {
    notFound();
  }

  const canManageSecurity = hasPermission(
    membership.role,
    Permission.ORG_MANAGE_SECURITY
  );

  if (!canManageSecurity) {
    notFound();
  }

  const policyRecord = await prisma.securityPolicy.findUnique({
    where: { organizationId: organization.id },
  });

  const policy = policyRecord
    ? {
        passwordMinLength: policyRecord.passwordMinLength,
        passwordRequireUpper: policyRecord.passwordRequireUpper,
        passwordRequireLower: policyRecord.passwordRequireLower,
        passwordRequireNumber: policyRecord.passwordRequireNumber,
        passwordRequireSpecial: policyRecord.passwordRequireSpecial,
        sessionTimeoutMinutes: policyRecord.sessionTimeoutMinutes,
        mfaRequired: policyRecord.mfaRequired,
        mfaRequiredRoles: policyRecord.mfaRequiredRoles?.join(" ") ?? "",
        ipWhitelistEnabled: policyRecord.ipWhitelistEnabled,
        allowedIPs: policyRecord.allowedIPs?.join(", ") ?? "",
      }
    : defaultPolicy;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Security
        </p>
        <h1 className="text-2xl font-bold tracking-tight">
          Organization security policy
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          Define password requirements, session timeouts, MFA enforcement, and IP
          controls for your organization.
        </p>
      </div>
      <SecuritySettingsForm
        organizationId={organization.id}
        canEdit={canManageSecurity}
        policy={policy}
      />
    </div>
  );
}

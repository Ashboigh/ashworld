import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getOrganizationBySlug } from "@/lib/organization";
import { hasPermission, Permission } from "@/lib/permissions";
import { prisma } from "@repo/database";
import {
  getOIDCCallbackUrl,
  getSAMLCallbackUrl,
  getSAMLMetadataUrl,
} from "@/lib/sso";
import { SSOSettingsPanel } from "@/components/organization/sso-settings-panel";
import type { SSOProvider } from "@/lib/sso/types";

interface PageProps {
  params: Promise<{ orgSlug: string }>;
}

export const metadata = {
  title: "SSO & Access",
};

export default async function SSOSettingsPage({ params }: PageProps) {
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

  if (!hasPermission(membership.role, Permission.ORG_MANAGE_SSO)) {
    notFound();
  }

  const ssoConfigRecord = await prisma.sSOConfig.findUnique({
    where: { organizationId: organization.id },
  });

  const ssoConfig = ssoConfigRecord
    ? {
        provider: ssoConfigRecord.provider as SSOProvider,
        enabled: ssoConfigRecord.enabled,
        enforceSSO: ssoConfigRecord.enforceSSO,
        samlEntryPoint: ssoConfigRecord.samlEntryPoint,
        samlIssuer: ssoConfigRecord.samlIssuer,
        samlCertificate: ssoConfigRecord.samlCertificate,
        oidcClientId: ssoConfigRecord.oidcClientId,
        oidcClientSecret: ssoConfigRecord.oidcClientSecret,
        oidcIssuerUrl: ssoConfigRecord.oidcIssuerUrl,
        oidcScopes: ssoConfigRecord.oidcScopes,
        allowedDomains: ssoConfigRecord.allowedDomains,
        lastTestedAt: ssoConfigRecord.lastTestedAt?.toISOString() ?? null,
        testStatus: ssoConfigRecord.testStatus ?? null,
      }
    : null;

  const callbackUrls = {
    saml: getSAMLCallbackUrl(organization.slug),
    oidc: getOIDCCallbackUrl(organization.slug),
    samlMetadata: getSAMLMetadataUrl(organization.slug),
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Security
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Single Sign-On</h1>
        <p className="text-muted-foreground max-w-2xl">
          Configure organization-wide SAML or OIDC providers, enforce SSO, and
          ensure every login flows through your identity provider.
        </p>
      </div>

      <SSOSettingsPanel
        organizationId={organization.id}
        ssoConfig={ssoConfig}
        callbackUrls={callbackUrls}
      />
    </div>
  );
}

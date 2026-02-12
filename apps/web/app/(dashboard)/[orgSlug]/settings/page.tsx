import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getOrganizationBySlug } from "@/lib/organization";
import { hasPermission, Permission } from "@/lib/permissions";
import { GeneralSettingsForm } from "@/components/organization/general-settings-form";

interface PageProps {
  params: Promise<{ orgSlug: string }>;
}

export const metadata = {
  title: "General Settings",
};

export default async function GeneralSettingsPage({ params }: PageProps) {
  const { orgSlug } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return null;
  }

  const { organization, membership } = await getOrganizationBySlug(orgSlug, session.user.id);

  if (!organization || !membership) {
    notFound();
  }

  const canEdit = hasPermission(membership.role, Permission.ORG_UPDATE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">General Settings</h1>
        <p className="text-muted-foreground">
          Manage your organization settings
        </p>
      </div>

      <GeneralSettingsForm organization={organization} canEdit={canEdit} />
    </div>
  );
}

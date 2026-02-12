import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getOrganizationBySlug, getUserOrganizations } from "@/lib/organization";
import { OrgHeader } from "@/components/organization/org-header";
import { OrgSidebar } from "@/components/organization/org-sidebar";

interface OrgLayoutProps {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}

export default async function OrgLayout({ children, params }: OrgLayoutProps) {
  const { orgSlug } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { organization } = await getOrganizationBySlug(orgSlug, session.user.id);

  if (!organization) {
    notFound();
  }

  const organizations = await getUserOrganizations(session.user.id);

  return (
    <div className="min-h-screen bg-background">
      <OrgHeader
        organization={organization}
        organizations={organizations}
        user={session.user}
      />
      <div className="flex">
        <OrgSidebar orgSlug={orgSlug} userRole={organization.role} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}

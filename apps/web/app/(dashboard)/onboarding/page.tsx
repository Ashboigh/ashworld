import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@repo/database";
import { CreateOrganizationForm } from "@/components/organization/create-organization-form";

export const metadata = {
  title: "Create Organization - Enterprise Chatbot Platform",
  description: "Set up your organization to get started",
};

export default async function OnboardingPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Check if user already has any organizations
  const existingOrg = await prisma.organizationMember.findFirst({
    where: { userId: session.user.id },
    include: {
      organization: {
        select: { slug: true },
      },
    },
  });

  // If user has an organization, redirect to it
  if (existingOrg) {
    redirect(`/${existingOrg.organization.slug}`);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
      <CreateOrganizationForm />
    </div>
  );
}

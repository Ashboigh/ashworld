import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getUserOrganizations } from "@/lib/organization";

export default async function LiveChatStandalonePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  const organizations = await getUserOrganizations(session.user.id);
  const first = organizations[0];

  if (!first) {
    redirect("/onboarding");
  }

  redirect(`/${first.slug}/live-chat`);
}


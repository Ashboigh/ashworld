import { Suspense } from "react";
import { AcceptInvitation } from "@/components/organization/accept-invitation";

export const metadata = {
  title: "Accept Invitation - Enterprise Chatbot Platform",
};

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: PageProps) {
  const { token } = await params;

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AcceptInvitation token={token} />
    </Suspense>
  );
}

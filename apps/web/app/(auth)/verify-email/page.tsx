import { Suspense } from "react";
import { VerifyEmail } from "@/components/auth/verify-email";

export const metadata = {
  title: "Verify Email - Enterprise Chatbot Platform",
  description: "Verify your email address",
};

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyEmail />
    </Suspense>
  );
}

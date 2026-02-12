"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@repo/ui";

type VerificationStatus = "loading" | "success" | "error";

export function VerifyEmail() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<VerificationStatus>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setStatus("error");
        setMessage("Invalid verification link");
        return;
      }

      try {
        const response = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const result = await response.json();

        if (!response.ok) {
          setStatus("error");
          setMessage(result.error || "Verification failed");
          return;
        }

        setStatus("success");
        setMessage(result.message);
      } catch {
        setStatus("error");
        setMessage("An error occurred during verification");
      }
    };

    verifyEmail();
  }, [token]);

  return (
    <Card>
      <CardHeader className="space-y-1">
        <div className="flex justify-center mb-4">
          {status === "loading" && (
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
          )}
          {status === "success" && (
            <CheckCircle className="h-12 w-12 text-green-500" />
          )}
          {status === "error" && (
            <XCircle className="h-12 w-12 text-destructive" />
          )}
        </div>
        <CardTitle className="text-2xl text-center">
          {status === "loading" && "Verifying your email..."}
          {status === "success" && "Email Verified!"}
          {status === "error" && "Verification Failed"}
        </CardTitle>
        <CardDescription className="text-center">{message}</CardDescription>
      </CardHeader>
      <CardContent>
        {status === "success" && (
          <p className="text-sm text-muted-foreground text-center">
            Your email has been verified. You can now sign in to your account.
          </p>
        )}
        {status === "error" && (
          <p className="text-sm text-muted-foreground text-center">
            The verification link may have expired or is invalid. Please try
            signing up again.
          </p>
        )}
      </CardContent>
      <CardFooter className="flex justify-center">
        {status !== "loading" && (
          <Button asChild>
            <Link href="/login">
              {status === "success" ? "Sign In" : "Back to Sign In"}
            </Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

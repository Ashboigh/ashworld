"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Button,
  Input,
  Label,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui";
import { Shield, KeyRound, LogOut } from "lucide-react";

export default function MFAChallengePage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [isBackupCode, setIsBackupCode] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: session?.user?.id,
          code: code.replace(/\s/g, ""),
          isBackupCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Verification failed");
        return;
      }

      // Update the session to mark MFA as verified
      await update({ mfaVerified: true });

      // Redirect to onboarding
      router.push("/onboarding");
      router.refresh();
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: "/login" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Two-Factor Authentication</CardTitle>
          <CardDescription>
            {isBackupCode
              ? "Enter one of your backup codes"
              : "Enter the 6-digit code from your authenticator app"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="code">
                {isBackupCode ? "Backup Code" : "Verification Code"}
              </Label>
              <Input
                id="code"
                type="text"
                placeholder={isBackupCode ? "XXXX-XXXX" : "000000"}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="text-center text-lg tracking-widest"
                maxLength={isBackupCode ? 9 : 6}
                autoComplete="one-time-code"
                autoFocus
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Verifying..." : "Verify"}
            </Button>

            <div className="flex items-center justify-between pt-4 text-sm">
              <button
                type="button"
                onClick={() => {
                  setIsBackupCode(!isBackupCode);
                  setCode("");
                  setError("");
                }}
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
              >
                <KeyRound className="h-4 w-4" />
                {isBackupCode ? "Use authenticator app" : "Use backup code"}
              </button>

              <button
                type="button"
                onClick={handleSignOut}
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

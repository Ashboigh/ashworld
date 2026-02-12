"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { toast } from "sonner";
import { Building2, CheckCircle, XCircle, Loader2 } from "lucide-react";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@repo/ui";
import { ROLE_DISPLAY_NAMES, OrgRoleType } from "@/lib/permissions";

interface InvitationDetails {
  id: string;
  email: string;
  role: string;
  organization: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
  };
  invitedBy: {
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
  expiresAt: string;
}

interface AcceptInvitationProps {
  token: string;
}

type Status = "loading" | "loaded" | "accepting" | "accepted" | "error";

export function AcceptInvitation({ token }: AcceptInvitationProps) {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const fetchInvitation = async () => {
      try {
        const response = await fetch(`/api/invitations/${token}`);
        const data = await response.json();

        if (!response.ok) {
          setStatus("error");
          setError(data.error || "Invalid invitation");
          return;
        }

        setInvitation(data);
        setStatus("loaded");
      } catch {
        setStatus("error");
        setError("Failed to load invitation");
      }
    };

    fetchInvitation();
  }, [token]);

  const handleAccept = async () => {
    if (!session) {
      // Redirect to login with callback
      router.push(`/login?callbackUrl=/invite/${token}`);
      return;
    }

    setStatus("accepting");

    try {
      const response = await fetch(`/api/invitations/${token}`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        setStatus("error");
        setError(data.error || "Failed to accept invitation");
        return;
      }

      setStatus("accepted");
      toast.success("Invitation accepted!");

      // Redirect to the organization
      setTimeout(() => {
        router.push(`/${data.organization.slug}`);
      }, 2000);
    } catch {
      setStatus("error");
      setError("An error occurred");
    }
  };

  if (status === "loading" || sessionStatus === "loading") {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">Loading invitation...</p>
        </CardContent>
      </Card>
    );
  }

  if (status === "error") {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <CardTitle>Invalid Invitation</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardFooter className="justify-center">
          <Button asChild variant="outline">
            <Link href="/login">Go to Sign In</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (status === "accepted") {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <CardTitle>Welcome!</CardTitle>
          <CardDescription>
            You&apos;ve joined {invitation?.organization.name}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground">
            Redirecting to your dashboard...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!invitation) {
    return null;
  }

  const inviterName =
    invitation.invitedBy.firstName && invitation.invitedBy.lastName
      ? `${invitation.invitedBy.firstName} ${invitation.invitedBy.lastName}`
      : invitation.invitedBy.email;

  const needsAuth = !session;
  const emailMismatch =
    session && session.user?.email?.toLowerCase() !== invitation.email.toLowerCase();

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          {invitation.organization.logoUrl ? (
            <img
              src={invitation.organization.logoUrl}
              alt={invitation.organization.name}
              className="w-10 h-10 rounded"
            />
          ) : (
            <Building2 className="h-8 w-8 text-primary" />
          )}
        </div>
        <CardTitle>You&apos;re invited!</CardTitle>
        <CardDescription>
          {inviterName} has invited you to join{" "}
          <strong>{invitation.organization.name}</strong>
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="rounded-lg bg-muted p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Organization</span>
            <span className="font-medium">{invitation.organization.name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Your role</span>
            <span className="font-medium">
              {ROLE_DISPLAY_NAMES[invitation.role as OrgRoleType] ||
                invitation.role}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium">{invitation.email}</span>
          </div>
        </div>

        {emailMismatch && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4">
            <p className="text-sm text-destructive">
              This invitation was sent to <strong>{invitation.email}</strong>,
              but you&apos;re signed in as{" "}
              <strong>{session.user?.email}</strong>. Please sign in with the
              correct account.
            </p>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex-col gap-3">
        {needsAuth ? (
          <>
            <Button className="w-full" onClick={handleAccept}>
              Sign in to accept
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Don&apos;t have an account?{" "}
              <Link
                href={`/signup?callbackUrl=/invite/${token}`}
                className="text-primary hover:underline"
              >
                Sign up
              </Link>
            </p>
          </>
        ) : emailMismatch ? (
          <Button className="w-full" variant="outline" asChild>
            <Link href="/login">Sign in with different account</Link>
          </Button>
        ) : (
          <Button
            className="w-full"
            onClick={handleAccept}
            disabled={status === "accepting"}
          >
            {status === "accepting" ? (
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              "Accept invitation"
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

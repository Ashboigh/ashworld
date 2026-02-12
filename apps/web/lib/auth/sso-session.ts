import crypto from "crypto";
import type { User } from "@prisma/client";
import { encode } from "next-auth/jwt";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import {
  getEffectiveSessionTimeout,
  getUserSecurityContexts,
} from "@/lib/security/policies";
import { getRequestIp } from "@/lib/network/get-request-ip";
import { createUserSessionRecord } from "@/lib/auth/session-manager";

export interface IssueSSOSessionOptions {
  user: Pick<User, "id" | "email" | "firstName" | "lastName" | "image" | "mfaEnabled">;
  provider: string;
  redirectUrl?: string;
  organizationId: string;
  request?: NextRequest;
}

export async function issueSSOSession({
  user,
  provider,
  redirectUrl,
  organizationId,
  request,
}: IssueSSOSessionOptions) {
  const contexts = await getUserSecurityContexts(user.id);
  const relevantContexts = contexts.filter(
    (context) => context.organizationId === organizationId
  );

  const timeoutMinutes = getEffectiveSessionTimeout(
    relevantContexts.length > 0 ? relevantContexts : contexts
  );

  const baseToken = {
    name: [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.email,
    email: user.email,
    picture: user.image ?? undefined,
    sub: user.id,
    id: user.id,
    sessionTimeoutMinutes: timeoutMinutes,
    organizationId,
  };

  const sessionId = crypto.randomUUID();

  const jwtCallback = authOptions.callbacks?.jwt;
  const token = jwtCallback
    ? await jwtCallback({
        token: {
          ...baseToken,
          sessionId,
        },
        user: { id: user.id, mfaEnabled: user.mfaEnabled },
        account: { provider, type: "oauth" },
        trigger: "signIn",
      })
    : {
        ...baseToken,
        sessionId,
      };

  const now = Math.floor(Date.now() / 1000);
  const expiresAt = new Date(now * 1000 + timeoutMinutes * 60_000);
  const finalToken = {
    ...token,
    iat: now,
    exp: Math.floor(expiresAt.getTime() / 1000),
  };

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET must be set to issue SSO session");
  }

  const sessionToken = await encode({
    token: finalToken,
    secret,
    maxAge: timeoutMinutes * 60,
  });

  const secure = process.env.NODE_ENV === "production";
  const cookieName = secure ? "__Secure-next-auth.session-token" : "next-auth.session-token";

  const response = NextResponse.redirect(redirectUrl ?? "/");

  await createUserSessionRecord({
    sessionToken: sessionId,
    userId: user.id,
    expiresAt,
    ipAddress: request ? getRequestIp(request.headers) : null,
    userAgent: request?.headers.get("user-agent") ?? null,
    deviceInfo: {
      userAgent: request?.headers.get("user-agent") ?? null,
    },
  });

  response.cookies.set({
    name: cookieName,
    value: sessionToken,
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: timeoutMinutes * 60,
  });

  return response;
}

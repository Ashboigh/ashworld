import crypto from "crypto";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { type NextAuthOptions } from "next-auth";
import { type Adapter } from "next-auth/adapters";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import AzureADProvider from "next-auth/providers/azure-ad";
import bcrypt from "bcryptjs";
import { prisma } from "@repo/database";
import type { NextApiRequest } from "next";
import {
  ensureSecurityPolicyCompliance,
  ensureSSOLoginAllowed,
  getEffectiveSessionTimeout,
  getUserSecurityContexts,
  type UserSecurityContext,
} from "@/lib/security/policies";
import { getRequestIp } from "@/lib/network/get-request-ip";
import {
  createUserSessionRecord,
  refreshUserSession,
} from "@/lib/auth/session-manager";

// Extend the JWT and Session types to include MFA fields
declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    provider?: string;
    mfaPending?: boolean;
    mfaVerified?: boolean;
    sessionId?: string;
    sessionExpiresAt?: number;
    sessionTimeoutMinutes?: number;
    organizationId?: string | null;
  }
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      mfaPending?: boolean;
      mfaVerified?: boolean;
      sessionId?: string;
      sessionExpiresAt?: number;
      sessionTimeoutMinutes?: number;
    };
  }

  interface User {
    mfaEnabled?: boolean;
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        mfaCode: { label: "MFA Code", type: "text" },
      },
      async authorize(credentials, req: NextApiRequest) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        });

        if (!user || !user.passwordHash) {
          throw new Error("Invalid email or password");
        }

        const isPasswordValid =
          user.passwordHash &&
          (await bcrypt.compare(credentials.password, user.passwordHash));

        if (!isPasswordValid) {
          throw new Error("Invalid email or password");
        }

        if (!user.emailVerified) {
          throw new Error("Please verify your email before signing in");
        }

        const contexts = await getUserSecurityContexts(user.id);
        ensureSSOLoginAllowed(contexts);
        const ipAddress = req ? getRequestIp(req.headers) : null;
        ensureSecurityPolicyCompliance(contexts, {
          hasMfa: !!user.mfaEnabled,
          ipAddress,
        });

        // Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || null,
          image: user.image,
          mfaEnabled: user.mfaEnabled,
        };
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
    ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
      ? [
          GitHubProvider({
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
          }),
        ]
      : []),
    ...(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET
      ? [
          AzureADProvider({
            clientId: process.env.MICROSOFT_CLIENT_ID,
            clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
            tenantId: process.env.MICROSOFT_TENANT_ID || "common",
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user, account, trigger, req }) {
      const nowMs = Date.now();
      const nowSeconds = Math.floor(nowMs / 1000);
      let contexts: UserSecurityContext[] = [];
      const defaultTimeout = 43200;
      let sessionTimeoutMinutes =
        token.sessionTimeoutMinutes ?? defaultTimeout;

      if (user) {
        token.id = user.id;
        contexts = await getUserSecurityContexts(user.id);
        sessionTimeoutMinutes = getEffectiveSessionTimeout(contexts);
        token.sessionTimeoutMinutes = sessionTimeoutMinutes;

        if (user.mfaEnabled) {
          token.mfaPending = true;
          token.mfaVerified = false;
        } else {
          token.mfaPending = false;
          token.mfaVerified = true;
        }
      }

      if (account) {
        token.provider = account.provider;
      }

      if (trigger === "update" && token.mfaPending) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { mfaEnabled: true },
        });
        if (dbUser && !dbUser.mfaEnabled) {
          token.mfaPending = false;
          token.mfaVerified = true;
        }
      }

      const ipAddress = req ? getRequestIp(req.headers) : null;
      const userAgent = req?.headers.get("user-agent") ?? null;

      if (!token.sessionId && user) {
        const sessionId = crypto.randomUUID();
        const expiresAt = new Date(
          nowMs + sessionTimeoutMinutes * 60_000
        );

        await createUserSessionRecord({
          sessionToken: sessionId,
          userId: user.id,
          expiresAt,
          ipAddress,
          userAgent,
          deviceInfo: { userAgent },
        });

        token.sessionId = sessionId;
        token.sessionExpiresAt = expiresAt.getTime();
        token.organizationId = contexts[0]?.organizationId ?? null;
      }

      if (token.sessionId) {
        const expiresAt = new Date(
          nowMs + sessionTimeoutMinutes * 60_000
        );
        token.sessionExpiresAt = expiresAt.getTime();
        token.exp = Math.floor(expiresAt.getTime() / 1000);
        token.iat = nowSeconds;

        await refreshUserSession(token.sessionId, expiresAt, {
          ipAddress,
          userAgent,
        });
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.mfaPending = token.mfaPending;
        session.user.mfaVerified = token.mfaVerified;
        session.user.sessionId = token.sessionId;
        session.user.sessionExpiresAt = token.sessionExpiresAt;
        session.user.sessionTimeoutMinutes = token.sessionTimeoutMinutes;
      }
      return session;
    },
    async signIn({ user, account }) {
      const contexts = await getUserSecurityContexts(user.id);
      ensureSecurityPolicyCompliance(contexts, {
        hasMfa: !!user.mfaEnabled,
      });

      if (account?.provider !== "credentials") {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email! },
        });

        if (existingUser && !existingUser.emailVerified) {
          await prisma.user.update({
            where: { id: existingUser.id },
            data: { emailVerified: new Date() },
          });
        }
      }
      return true;
    },
  },
};

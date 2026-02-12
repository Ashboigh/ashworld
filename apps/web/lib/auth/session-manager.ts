import { prisma } from "@repo/database";

export interface UserSessionRecord {
  sessionToken: string;
  userId: string;
  expiresAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceInfo?: Record<string, unknown> | null;
}

export async function createUserSessionRecord(record: UserSessionRecord) {
  return prisma.userSession.create({
    data: {
      sessionToken: record.sessionToken,
      userId: record.userId,
      expiresAt: record.expiresAt,
      ipAddress: record.ipAddress ?? null,
      userAgent: record.userAgent ?? null,
      deviceInfo: record.deviceInfo ?? null,
      lastActiveAt: new Date(),
    },
  });
}

export async function refreshUserSession(
  sessionToken: string,
  expiresAt: Date,
  options?: { ipAddress?: string | null; userAgent?: string | null }
) {
  return prisma.userSession.updateMany({
    where: { sessionToken },
    data: {
      lastActiveAt: new Date(),
      expiresAt,
      ipAddress: options?.ipAddress ?? undefined,
      userAgent: options?.userAgent ?? undefined,
    },
  });
}

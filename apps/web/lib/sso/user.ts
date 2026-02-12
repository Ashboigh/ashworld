import { prisma } from "@repo/database";
import type { SSOUserProfile } from "./types";
import { OrgRole } from "@/lib/permissions";

export async function ensureSSOUser({
  profile,
  organizationId,
}: {
  profile: SSOUserProfile;
  organizationId: string;
}) {
  if (!profile.email) {
    throw new Error("SSO profile did not include an email address");
  }

  const normalizedEmail = profile.email.toLowerCase();
  const firstName = profile.firstName ?? profile.displayName ?? null;
  const lastName = profile.lastName ?? null;
  const picture =
    typeof profile.rawAttributes?.picture === "string"
      ? profile.rawAttributes.picture
      : undefined;
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  const user =
    existingUser
      ? await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            firstName: firstName ?? existingUser.firstName,
            lastName: lastName ?? existingUser.lastName,
            image: picture ?? existingUser.image,
            emailVerified: existingUser.emailVerified ?? new Date(),
          },
        })
      : await prisma.user.create({
          data: {
            email: normalizedEmail,
            firstName,
            lastName,
            emailVerified: new Date(),
            passwordHash: null,
            ...(picture ? { image: picture } : {}),
          },
        });

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId,
        userId: user.id,
      },
    },
    create: {
      organizationId,
      userId: user.id,
      role: OrgRole.VIEWER,
    },
    update: {},
  });

  return user;
}

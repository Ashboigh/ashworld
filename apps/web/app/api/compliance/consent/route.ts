import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@repo/database";
import { z } from "zod";

const consentSchema = z.object({
  organizationId: z.string().min(1),
  consentType: z.string().min(1),
  granted: z.boolean(),
});

export async function GET(_request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const consents = await prisma.dataConsent.findMany({
    where: {
      userId: session.user.id,
    },
  });
  return NextResponse.json({ consents });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = consentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const consent = await prisma.dataConsent.upsert({
    where: {
      organizationId_userId_consentType: {
        organizationId: parsed.data.organizationId,
        userId: session.user.id,
        consentType: parsed.data.consentType,
      },
    },
    create: {
      organizationId: parsed.data.organizationId,
      userId: session.user.id,
      consentType: parsed.data.consentType,
      granted: parsed.data.granted,
    },
    update: {
      granted: parsed.data.granted,
      grantedAt: new Date(),
      revokedAt: parsed.data.granted ? null : new Date(),
    },
  });

  return NextResponse.json({ consent });
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@repo/database";
import { authOptions } from "@/lib/auth";
import { hasPermission, Permission, type OrgRoleType } from "@/lib/permissions";
import { listPendingFlags, reviewFlag } from "@/lib/ai-optimization/quality";
import { z } from "zod";

const reviewSchema = z.object({
  flagId: z.string().cuid(),
  action: z.enum(["reviewed", "dismissed"]),
});

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const organizationId = url.searchParams.get("organizationId");
  if (!organizationId) {
    return NextResponse.json({ error: "organizationId is required" }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId: session.user.id,
      },
    },
  });
  if (!membership || !hasPermission(membership.role as OrgRoleType, Permission.ANALYTICS_VIEW)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const flags = await listPendingFlags(organizationId);
  return NextResponse.json({ flags });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const flag = await reviewFlag(parsed.data.flagId, session.user.id, parsed.data.action);
  return NextResponse.json({ flag });
}

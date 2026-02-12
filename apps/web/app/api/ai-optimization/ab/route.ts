import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission, Permission, type OrgRoleType } from "@/lib/permissions";
import { prisma } from "@repo/database";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const workspaceId = url.searchParams.get("workspaceId");
  const organizationId = url.searchParams.get("organizationId");
  if (!workspaceId || !organizationId) {
    return NextResponse.json({ error: "workspaceId and organizationId required" }, { status: 400 });
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
  if (!membership || !hasPermission(membership.role as OrgRoleType, Permission.CHATBOT_UPDATE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tests = await prisma.promptTest.findMany({
    where: {
      promptVersion: {
        template: {
          workspaceId,
        },
      },
    },
    include: {
      promptVersion: {
        select: {
          version: true,
          modelName: true,
        },
      },
    },
  });

  return NextResponse.json({ tests });
}

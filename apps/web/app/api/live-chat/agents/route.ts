import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@repo/database";
import { hasPermission, Permission, type OrgRoleType } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");
    if (!orgId) {
      return NextResponse.json({ error: "Organization ID is required" }, { status: 400 });
    }

    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: session.user.id,
        },
      },
    });

    if (!membership || !hasPermission(membership.role as OrgRoleType, Permission.LIVE_CHAT_VIEW)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const members = await prisma.organizationMember.findMany({
      where: { organizationId: orgId },
      select: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            agentAvailability: {
              select: {
                id: true,
                status: true,
                maxConversations: true,
                currentConversations: true,
                skills: true,
              },
            },
          },
        },
      },
    });

    const agents = members.map((member) => {
      const availability = member.user.agentAvailability;
      return {
        id: availability?.id ?? member.user.id,
        status: (availability?.status as string | undefined) ?? "offline",
        maxConversations: availability?.maxConversations ?? 3,
        currentConversations: availability?.currentConversations ?? 0,
        skills: availability?.skills ?? [],
        user: member.user,
      };
    });

    const currentAgent = agents.find((agent) => agent.user.id === session.user.id) ?? null;

    return NextResponse.json({ agents, currentAgent });
  } catch (error) {
    console.error("Agent list error:", error);
    return NextResponse.json(
      { error: "Failed to load agent availability" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { status, maxConversations } = body;

    const availability = await prisma.agentAvailability.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        status: status ?? "offline",
        maxConversations: maxConversations ?? 3,
      },
      update: {
        status: status ?? "offline",
        maxConversations: maxConversations ?? 3,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return NextResponse.json({ availability });
  } catch (error) {
    console.error("Update availability error:", error);
    return NextResponse.json(
      { error: "Failed to update agent availability" },
      { status: 500 }
    );
  }
}

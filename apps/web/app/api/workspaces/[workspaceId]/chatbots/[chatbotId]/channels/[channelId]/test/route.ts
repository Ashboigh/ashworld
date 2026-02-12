import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@repo/database";
import { authOptions } from "@/lib/auth";
import { hasPermission, Permission } from "@/lib/permissions";
import { getWorkspaceAccess } from "@/lib/workspace-access";
import { getChannelProvider } from "@/lib/channels/providers";
import type { ChannelType } from "@/lib/chatbot/types";

interface RouteParams {
  params: Promise<{
    workspaceId: string;
    chatbotId: string;
    channelId: string;
  }>;
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceId, chatbotId, channelId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const access = await getWorkspaceAccess(workspaceId, session.user.id);
    if (!access || !hasPermission(access.role, Permission.CHATBOT_UPDATE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const channel = await prisma.channel.findFirst({
      where: {
        id: channelId,
        chatbotId,
      },
    });

    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    const provider = getChannelProvider(channel.type as ChannelType);
    if (!provider) {
      return NextResponse.json({ error: "Unsupported channel" }, { status: 400 });
    }

    const result = await provider.testConnection(
      (channel.config ?? {}) as Record<string, unknown>,
      (channel.credentials ?? {}) as Record<string, unknown>
    );

    return NextResponse.json({ ...result });
  } catch (error) {
    console.error("Channel test failed:", error);
    return NextResponse.json(
      { error: "Failed to test connection" },
      { status: 500 }
    );
  }
}

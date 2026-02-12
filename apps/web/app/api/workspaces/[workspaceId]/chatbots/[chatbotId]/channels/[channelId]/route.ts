import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@repo/database";
import { authOptions } from "@/lib/auth";
import { updateChannelSchema } from "@/lib/validations/chatbot";
import { hasPermission, Permission } from "@/lib/permissions";
import { getWorkspaceAccess } from "@/lib/workspace-access";
import { getChannelMetadata } from "@/lib/channels/metadata";
import type { ChannelType } from "@/lib/chatbot/types";

interface RouteParams {
  params: Promise<{
    workspaceId: string;
    chatbotId: string;
    channelId: string;
  }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

    const body = await request.json();
    const parsed = updateChannelSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const existingConfig = (channel.config || {}) as object;
    const existingCredentials = (channel.credentials || {}) as object;

    const updated = await prisma.channel.update({
      where: { id: channel.id },
      data: {
        name: parsed.data.name ?? undefined,
        status: parsed.data.status ?? undefined,
        config: parsed.data.config
          ? { ...existingConfig, ...parsed.data.config } as object
          : undefined,
        credentials: parsed.data.credentials
          ? { ...existingCredentials, ...parsed.data.credentials } as object
          : undefined,
      },
    });

    return NextResponse.json({
      channel: updated,
      provider: getChannelMetadata(updated.type as ChannelType),
    });
  } catch (error) {
    console.error("Update channel error:", error);
    return NextResponse.json(
      { error: "Failed to update channel" },
      { status: 500 }
    );
  }
}

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@repo/database";
import { authOptions } from "@/lib/auth";
import { createChannelSchema } from "@/lib/validations/chatbot";
import { hasPermission, Permission } from "@/lib/permissions";
import { getWorkspaceAccess } from "@/lib/workspace-access";
import { getChannelProvider } from "@/lib/channels/providers";
import { getChannelMetadata } from "@/lib/channels/metadata";
import type { ChannelType } from "@/lib/chatbot/types";

interface RouteParams {
  params: Promise<{ workspaceId: string; chatbotId: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceId, chatbotId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const access = await getWorkspaceAccess(workspaceId, session.user.id);
    if (!access || !hasPermission(access.role, Permission.CHATBOT_VIEW)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const channels = await prisma.channel.findMany({
      where: { chatbotId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        webhookUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const providers = channels.map((channel) => ({
      ...channel,
      provider: getChannelProvider(channel.type as ChannelType)?.displayName,
    }));

    return NextResponse.json({ channels: providers });
  } catch (error) {
    console.error("Channels list failed:", error);
    return NextResponse.json(
      { error: "Failed to load channels" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceId, chatbotId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const access = await getWorkspaceAccess(workspaceId, session.user.id);
    if (!access || !hasPermission(access.role, Permission.CHATBOT_UPDATE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const chatbot = await prisma.chatbot.findUnique({
      where: { id: chatbotId },
      select: { id: true, workspaceId: true },
    });

    if (!chatbot) {
      return NextResponse.json({ error: "Chatbot not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = createChannelSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const provider = getChannelProvider(parsed.data.type);
    if (!provider) {
      return NextResponse.json({ error: "Unsupported channel" }, { status: 400 });
    }

    const testResult = await provider.testConnection(
      parsed.data.config,
      parsed.data.credentials
    );

    if (!testResult.success) {
      return NextResponse.json(
        { error: testResult.message },
        { status: 400 }
      );
    }

    const webhookSecret = crypto.randomBytes(16).toString("hex");

    let channel = await prisma.channel.create({
      data: {
        chatbotId: chatbot.id,
        type: parsed.data.type,
        name: parsed.data.name,
        status: "inactive",
        config: parsed.data.config as object,
        credentials: parsed.data.credentials as object,
        webhookSecret,
        webhookUrl: null,
      },
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        webhookUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const webhookUrl = provider.requiresWebhook
      ? `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/api/channels/${channel.id}/webhook`
      : null;

    if (provider.requiresWebhook) {
      const refreshed = await prisma.channel.update({
        where: { id: channel.id },
        data: { webhookUrl },
        select: {
          id: true,
          name: true,
          type: true,
          status: true,
          webhookUrl: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      channel = refreshed;
    }

    return NextResponse.json({
      channel,
      provider: getChannelMetadata(parsed.data.type),
      webhookUrl,
      message: testResult.message,
    });
  } catch (error) {
    console.error("Channel creation error:", error);
    return NextResponse.json(
      { error: "Failed to create channel" },
      { status: 500 }
    );
  }
}

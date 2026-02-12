import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@repo/database";
import { hasPermission, Permission, type OrgRoleType } from "@/lib/permissions";
import { getLiveChatEventTarget } from "@/lib/live-chat/events";

export async function GET(request: NextRequest) {
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

  const target = getLiveChatEventTarget();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const handler = (event: Event) => {
        const customEvent = event as CustomEvent;
        const detail = customEvent.detail as {
          type?: string;
          payload?: Record<string, unknown>;
        };
        const payload = detail?.payload ?? {};
        const eventOrgId = typeof payload.organizationId === "string" ? payload.organizationId : null;
        if (eventOrgId !== orgId) {
          return;
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(detail)}\n\n`));
      };

      target.addEventListener("live-chat", handler);
      controller.enqueue(encoder.encode(":\n\n"));

      const keepAlive = setInterval(() => {
        controller.enqueue(encoder.encode(":\n\n"));
      }, 15000);

      request.signal.addEventListener("abort", () => {
        target.removeEventListener("live-chat", handler);
        clearInterval(keepAlive);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

import { NextRequest } from "next/server";
import { prisma } from "@repo/database";
import { getLiveChatEventTarget } from "@/lib/live-chat/events";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chatbotId: string }> }
) {
  const { chatbotId } = await params;
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return json({ error: "sessionId is required" }, 400);
  }

  const conversation = await prisma.conversation.findFirst({
    where: {
      sessionId,
      chatbotId,
    },
    select: {
      id: true,
    },
  });

  if (!conversation) {
    return json({ error: "Conversation not found" }, 404);
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

        const payload = (detail?.payload ?? {}) as { conversationId?: string };
        if (payload.conversationId !== conversation.id) {
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
      ...CORS_HEADERS,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}


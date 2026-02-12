import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const DEFAULT_CORS_MAX_AGE_SECONDS = 60 * 60 * 24; // 24 hours

const CHAT_API_CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": String(DEFAULT_CORS_MAX_AGE_SECONDS),
};

export function withChatApiCors(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(CHAT_API_CORS_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

export function chatApiCorsPreflight(request: NextRequest): NextResponse {
  const requestedHeaders = request.headers.get("access-control-request-headers");

  return new NextResponse(null, {
    status: 204,
    headers: {
      ...CHAT_API_CORS_HEADERS,
      ...(requestedHeaders ? { "Access-Control-Allow-Headers": requestedHeaders } : {}),
    },
  });
}


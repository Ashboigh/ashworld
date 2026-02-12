import { NextRequest, NextResponse } from "next/server";
import { requireApiKey } from "@/lib/api-keys/middleware";
import { ApiKeyScopes } from "@/lib/api-keys/scopes";

export async function GET(req: NextRequest) {
  try {
    const result = await requireApiKey(req, {
      requiredScopes: [ApiKeyScopes.CHATBOT_READ],
    });

    return NextResponse.json({
      message: "API key authentication succeeded",
      apiKeyId: result.apiKeyId,
      organizationId: result.organizationId,
      scopes: result.scopes,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "API key authentication failed",
      },
      { status: 401 }
    );
  }
}

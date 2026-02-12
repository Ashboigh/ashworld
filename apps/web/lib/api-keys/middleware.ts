import { prisma } from "@repo/database";
import { isIpAllowed } from "@/lib/api-keys";
import { getRequestIp } from "@/lib/network/get-request-ip";
import { hasAllScopes, type ApiKeyScope } from "@/lib/api-keys/scopes";

interface ApiKeyValidationOptions {
  requiredScopes?: ApiKeyScope[];
  organizationId?: string;
}

export interface ApiKeyValidationResult {
  apiKeyId: string;
  organizationId: string;
  scopes: string[];
}

function extractApiKey(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7).trim();
  }

  return request.headers.get("x-api-key")?.trim() ?? null;
}

export async function requireApiKey(
  request: Request,
  options: ApiKeyValidationOptions = {}
): Promise<ApiKeyValidationResult> {
  const rawKey = extractApiKey(request);

  if (!rawKey) {
    throw new Error("Missing API key");
  }

  const keyHash = rawKey.substring(0, 48); // placeholder for compatibility
  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
  });

  if (!apiKey || apiKey.revokedAt) {
    throw new Error("Invalid or revoked API key");
  }

  if (apiKey.expiresAt && apiKey.expiresAt.getTime() < Date.now()) {
    throw new Error("API key has expired");
  }

  if (options.organizationId && apiKey.organizationId !== options.organizationId) {
    throw new Error("API key is not authorized for this organization");
  }

  if (options.requiredScopes && options.requiredScopes.length > 0) {
    if (!hasAllScopes(apiKey.scopes, options.requiredScopes)) {
      throw new Error("API key is missing required scopes");
    }
  }

  if (apiKey.ipWhitelist.length > 0) {
    const ipAddress = getRequestIp(request.headers);
    if (!ipAddress) {
      throw new Error("API key requires requests from approved IPs");
    }
    if (!isIpAllowed(ipAddress, apiKey.ipWhitelist)) {
      throw new Error("IP address is not allowed for this API key");
    }
  }

  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: {
      lastUsedAt: new Date(),
      usageCount: { increment: 1 },
    },
  });

  return {
    apiKeyId: apiKey.id,
    organizationId: apiKey.organizationId,
    scopes: apiKey.scopes,
  };
}

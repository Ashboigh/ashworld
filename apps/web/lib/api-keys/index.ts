import crypto from "crypto";

const API_KEY_PREFIX = "ek_"; // Enterprise Key prefix
const API_KEY_RANDOM_BYTES = 32;

/**
 * API Key scopes for fine-grained access control
 */
export const ApiKeyScopes = {
  CHATBOT_READ: "chatbot:read",
  CHATBOT_WRITE: "chatbot:write",
  CHATBOT_CHAT: "chatbot:chat",
  KB_READ: "kb:read",
  KB_WRITE: "kb:write",
  CONVERSATION_READ: "conversation:read",
  CONVERSATION_WRITE: "conversation:write",
  ANALYTICS_READ: "analytics:read",
  WORKFLOW_READ: "workflow:read",
  WORKFLOW_WRITE: "workflow:write",
  WORKFLOW_EXECUTE: "workflow:execute",
} as const;

export type ApiKeyScope = (typeof ApiKeyScopes)[keyof typeof ApiKeyScopes];

export const API_KEY_SCOPE_DESCRIPTIONS: Record<ApiKeyScope, string> = {
  [ApiKeyScopes.CHATBOT_READ]: "Read chatbot configurations",
  [ApiKeyScopes.CHATBOT_WRITE]: "Create and modify chatbots",
  [ApiKeyScopes.CHATBOT_CHAT]: "Send messages to chatbots",
  [ApiKeyScopes.KB_READ]: "Read knowledge base content",
  [ApiKeyScopes.KB_WRITE]: "Manage knowledge base documents",
  [ApiKeyScopes.CONVERSATION_READ]: "View conversation history",
  [ApiKeyScopes.CONVERSATION_WRITE]: "Manage conversations",
  [ApiKeyScopes.ANALYTICS_READ]: "Access analytics data",
  [ApiKeyScopes.WORKFLOW_READ]: "Read workflow configurations",
  [ApiKeyScopes.WORKFLOW_WRITE]: "Create and modify workflows",
  [ApiKeyScopes.WORKFLOW_EXECUTE]: "Trigger workflow execution",
};

/**
 * Generate a new API key
 */
export function generateApiKey(): {
  key: string;
  keyPrefix: string;
  keyHash: string;
} {
  const randomBytes = crypto.randomBytes(API_KEY_RANDOM_BYTES);
  const keyBody = randomBytes.toString("base64url");
  const key = `${API_KEY_PREFIX}${keyBody}`;
  const keyPrefix = `${API_KEY_PREFIX}${keyBody.slice(0, 8)}...`;
  const keyHash = hashApiKey(key);
  return { key, keyPrefix, keyHash };
}

/**
 * Hash an API key using SHA-256
 */
export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

/**
 * Validate API key format
 */
export function isValidApiKeyFormat(key: string): boolean {
  if (!key.startsWith(API_KEY_PREFIX)) {
    return false;
  }
  const keyBody = key.slice(API_KEY_PREFIX.length);
  return keyBody.length >= 40;
}

/**
 * Check if an IP address matches any pattern in the whitelist
 */
export function isIpAllowed(ip: string, whitelist: string[]): boolean {
  if (whitelist.length === 0) {
    return true;
  }

  for (const pattern of whitelist) {
    if (pattern.includes("/")) {
      if (isIpInCidr(ip, pattern)) {
        return true;
      }
    } else {
      if (ip === pattern) {
        return true;
      }
    }
  }

  return false;
}

function isIpInCidr(ip: string, cidr: string): boolean {
  const parts = cidr.split("/");
  const range = parts[0];
  const bits = parts[1];

  if (!range || !bits) {
    return false;
  }

  const mask = parseInt(bits, 10);

  if (isNaN(mask) || mask < 0 || mask > 32) {
    return false;
  }

  const ipNum = ipToNumber(ip);
  const rangeNum = ipToNumber(range);

  if (ipNum === null || rangeNum === null) {
    return false;
  }

  const maskNum = ~((1 << (32 - mask)) - 1);
  return (ipNum & maskNum) === (rangeNum & maskNum);
}

function ipToNumber(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) {
    return null;
  }

  let num = 0;
  for (const part of parts) {
    const octet = parseInt(part, 10);
    if (isNaN(octet) || octet < 0 || octet > 255) {
      return null;
    }
    num = (num << 8) | octet;
  }

  return num >>> 0;
}

export function hasScope(grantedScopes: string[], requiredScope: ApiKeyScope): boolean {
  return grantedScopes.includes(requiredScope);
}

export function hasAllScopes(grantedScopes: string[], requiredScopes: ApiKeyScope[]): boolean {
  return requiredScopes.every((scope) => grantedScopes.includes(scope));
}

export function hasAnyScope(grantedScopes: string[], requiredScopes: ApiKeyScope[]): boolean {
  return requiredScopes.some((scope) => grantedScopes.includes(scope));
}

export function validateScopes(scopes: string[]): { valid: boolean; invalidScopes: string[] } {
  const validScopes = Object.values(ApiKeyScopes);
  const invalidScopes = scopes.filter((s) => !validScopes.includes(s as ApiKeyScope));
  return {
    valid: invalidScopes.length === 0,
    invalidScopes,
  };
}

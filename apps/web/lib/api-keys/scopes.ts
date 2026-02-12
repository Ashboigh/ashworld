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
  const invalidScopes = scopes.filter((value) => !validScopes.includes(value as ApiKeyScope));
  return {
    valid: invalidScopes.length === 0,
    invalidScopes,
  };
}

// Organization roles (hierarchical - higher roles inherit lower permissions)
export const OrgRole = {
  ORG_ADMIN: "org_admin",
  WORKSPACE_ADMIN: "workspace_admin",
  BUILDER: "builder",
  CONTENT_MANAGER: "content_manager",
  ANALYST: "analyst",
  VIEWER: "viewer",
} as const;

export type OrgRoleType = (typeof OrgRole)[keyof typeof OrgRole];

// Workspace roles
export const WorkspaceRole = {
  WORKSPACE_ADMIN: "workspace_admin",
  BUILDER: "builder",
  CONTENT_MANAGER: "content_manager",
  ANALYST: "analyst",
  VIEWER: "viewer",
} as const;

export type WorkspaceRoleType = (typeof WorkspaceRole)[keyof typeof WorkspaceRole];

// Role hierarchy (index determines permission level - lower is more powerful)
const ORG_ROLE_HIERARCHY: OrgRoleType[] = [
  OrgRole.ORG_ADMIN,
  OrgRole.WORKSPACE_ADMIN,
  OrgRole.BUILDER,
  OrgRole.CONTENT_MANAGER,
  OrgRole.ANALYST,
  OrgRole.VIEWER,
];

// Permissions
export const Permission = {
  // Organization permissions
  ORG_VIEW: "org:view",
  ORG_UPDATE: "org:update",
  ORG_DELETE: "org:delete",
  ORG_MANAGE_MEMBERS: "org:manage_members",
  ORG_MANAGE_BILLING: "org:manage_billing",
  ORG_VIEW_AUDIT_LOGS: "org:view_audit_logs",

  // Security permissions
  ORG_MANAGE_SSO: "org:manage_sso",
  ORG_MANAGE_SECURITY: "org:manage_security",
  ORG_MANAGE_API_KEYS: "org:manage_api_keys",
  ORG_VIEW_API_KEYS: "org:view_api_keys",
  ORG_MANAGE_SESSIONS: "org:manage_sessions",
  ORG_EXPORT_AUDIT_LOGS: "org:export_audit_logs",
  LIVE_CHAT_VIEW: "live_chat:view",
  LIVE_CHAT_MANAGE: "live_chat:manage",

  // Workspace permissions
  WORKSPACE_CREATE: "workspace:create",
  WORKSPACE_VIEW: "workspace:view",
  WORKSPACE_UPDATE: "workspace:update",
  WORKSPACE_DELETE: "workspace:delete",
  WORKSPACE_MANAGE_MEMBERS: "workspace:manage_members",

  // Chatbot permissions
  CHATBOT_CREATE: "chatbot:create",
  CHATBOT_VIEW: "chatbot:view",
  CHATBOT_UPDATE: "chatbot:update",
  CHATBOT_DELETE: "chatbot:delete",
  CHATBOT_PUBLISH: "chatbot:publish",

  // Workflow permissions
  WORKFLOW_CREATE: "workflow:create",
  WORKFLOW_VIEW: "workflow:view",
  WORKFLOW_UPDATE: "workflow:update",
  WORKFLOW_DELETE: "workflow:delete",
  WORKFLOW_PUBLISH: "workflow:publish",

  // Knowledge Base permissions
  KB_CREATE: "kb:create",
  KB_VIEW: "kb:view",
  KB_UPDATE: "kb:update",
  KB_DELETE: "kb:delete",

  // Analytics permissions
  ANALYTICS_VIEW: "analytics:view",
  ANALYTICS_EXPORT: "analytics:export",

  // Conversation permissions
  CONVERSATION_VIEW: "conversation:view",
  CONVERSATION_RESPOND: "conversation:respond",
} as const;

export type PermissionType = (typeof Permission)[keyof typeof Permission];

// Role -> Permissions mapping for organization-level
const ORG_ROLE_PERMISSIONS: Record<OrgRoleType, PermissionType[]> = {
  [OrgRole.ORG_ADMIN]: Object.values(Permission), // All permissions
  [OrgRole.WORKSPACE_ADMIN]: [
    Permission.ORG_VIEW,
    Permission.WORKSPACE_CREATE,
    Permission.WORKSPACE_VIEW,
    Permission.WORKSPACE_UPDATE,
    Permission.WORKSPACE_DELETE,
    Permission.WORKSPACE_MANAGE_MEMBERS,
    Permission.CHATBOT_CREATE,
    Permission.CHATBOT_VIEW,
    Permission.CHATBOT_UPDATE,
    Permission.CHATBOT_DELETE,
    Permission.CHATBOT_PUBLISH,
    Permission.WORKFLOW_CREATE,
    Permission.WORKFLOW_VIEW,
    Permission.WORKFLOW_UPDATE,
    Permission.WORKFLOW_DELETE,
    Permission.WORKFLOW_PUBLISH,
    Permission.KB_CREATE,
    Permission.KB_VIEW,
    Permission.KB_UPDATE,
    Permission.KB_DELETE,
    Permission.ANALYTICS_VIEW,
    Permission.ANALYTICS_EXPORT,
    Permission.CONVERSATION_VIEW,
    Permission.CONVERSATION_RESPOND,
    Permission.LIVE_CHAT_VIEW,
  ],
  [OrgRole.BUILDER]: [
    Permission.ORG_VIEW,
    Permission.WORKSPACE_VIEW,
    Permission.CHATBOT_CREATE,
    Permission.CHATBOT_VIEW,
    Permission.CHATBOT_UPDATE,
    Permission.CHATBOT_DELETE,
    Permission.CHATBOT_PUBLISH,
    Permission.WORKFLOW_CREATE,
    Permission.WORKFLOW_VIEW,
    Permission.WORKFLOW_UPDATE,
    Permission.WORKFLOW_DELETE,
    Permission.WORKFLOW_PUBLISH,
    Permission.KB_CREATE,
    Permission.KB_VIEW,
    Permission.KB_UPDATE,
    Permission.KB_DELETE,
    Permission.ANALYTICS_VIEW,
    Permission.CONVERSATION_VIEW,
    Permission.CONVERSATION_RESPOND,
    Permission.LIVE_CHAT_VIEW,
  ],
  [OrgRole.CONTENT_MANAGER]: [
    Permission.ORG_VIEW,
    Permission.WORKSPACE_VIEW,
    Permission.CHATBOT_VIEW,
    Permission.KB_CREATE,
    Permission.KB_VIEW,
    Permission.KB_UPDATE,
    Permission.KB_DELETE,
    Permission.CONVERSATION_VIEW,
    Permission.CONVERSATION_RESPOND,
    Permission.LIVE_CHAT_VIEW,
  ],
  [OrgRole.ANALYST]: [
    Permission.ORG_VIEW,
    Permission.WORKSPACE_VIEW,
    Permission.CHATBOT_VIEW,
    Permission.KB_VIEW,
    Permission.ANALYTICS_VIEW,
    Permission.ANALYTICS_EXPORT,
    Permission.CONVERSATION_VIEW,
    Permission.LIVE_CHAT_VIEW,
  ],
  [OrgRole.VIEWER]: [
    Permission.ORG_VIEW,
    Permission.WORKSPACE_VIEW,
    Permission.CHATBOT_VIEW,
    Permission.KB_VIEW,
    Permission.ANALYTICS_VIEW,
    Permission.CONVERSATION_VIEW,
    Permission.LIVE_CHAT_VIEW,
  ],
};

// Helper functions
export function hasPermission(
  userRole: OrgRoleType,
  permission: PermissionType
): boolean {
  const permissions = ORG_ROLE_PERMISSIONS[userRole];
  return permissions?.includes(permission) ?? false;
}

export function hasAnyPermission(
  userRole: OrgRoleType,
  permissions: PermissionType[]
): boolean {
  return permissions.some((p) => hasPermission(userRole, p));
}

export function hasAllPermissions(
  userRole: OrgRoleType,
  permissions: PermissionType[]
): boolean {
  return permissions.every((p) => hasPermission(userRole, p));
}

export function isRoleAtLeast(
  userRole: OrgRoleType,
  minimumRole: OrgRoleType
): boolean {
  const userIndex = ORG_ROLE_HIERARCHY.indexOf(userRole);
  const minIndex = ORG_ROLE_HIERARCHY.indexOf(minimumRole);
  return userIndex !== -1 && minIndex !== -1 && userIndex <= minIndex;
}

export function canManageRole(
  managerRole: OrgRoleType,
  targetRole: OrgRoleType
): boolean {
  // Can only manage roles lower than your own
  const managerIndex = ORG_ROLE_HIERARCHY.indexOf(managerRole);
  const targetIndex = ORG_ROLE_HIERARCHY.indexOf(targetRole);
  return managerIndex < targetIndex;
}

export function getAvailableRolesToAssign(managerRole: OrgRoleType): OrgRoleType[] {
  const managerIndex = ORG_ROLE_HIERARCHY.indexOf(managerRole);
  if (managerIndex === -1) return [];
  return ORG_ROLE_HIERARCHY.slice(managerIndex + 1);
}

// Role display names
export const ROLE_DISPLAY_NAMES: Record<OrgRoleType | WorkspaceRoleType, string> = {
  [OrgRole.ORG_ADMIN]: "Organization Admin",
  [OrgRole.WORKSPACE_ADMIN]: "Workspace Admin",
  [OrgRole.BUILDER]: "Builder",
  [OrgRole.CONTENT_MANAGER]: "Content Manager",
  [OrgRole.ANALYST]: "Analyst",
  [OrgRole.VIEWER]: "Viewer",
};

export const ROLE_DESCRIPTIONS: Record<OrgRoleType, string> = {
  [OrgRole.ORG_ADMIN]: "Full access to organization settings, billing, security, SSO, and all workspaces",
  [OrgRole.WORKSPACE_ADMIN]: "Can manage workspaces and all resources within them",
  [OrgRole.BUILDER]: "Can create and manage chatbots, workflows, and knowledge bases",
  [OrgRole.CONTENT_MANAGER]: "Can manage knowledge base content and respond to conversations",
  [OrgRole.ANALYST]: "Can view analytics and export data",
  [OrgRole.VIEWER]: "Read-only access to view resources",
};

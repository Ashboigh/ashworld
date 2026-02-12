/**
 * SCIM 2.0 Protocol Types
 * https://www.rfc-editor.org/rfc/rfc7643
 */

// SCIM Schema URIs
export const SCIM_SCHEMAS = {
  USER: "urn:ietf:params:scim:schemas:core:2.0:User",
  GROUP: "urn:ietf:params:scim:schemas:core:2.0:Group",
  ENTERPRISE_USER: "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User",
  LIST_RESPONSE: "urn:ietf:params:scim:api:messages:2.0:ListResponse",
  SEARCH_REQUEST: "urn:ietf:params:scim:api:messages:2.0:SearchRequest",
  PATCH_OP: "urn:ietf:params:scim:api:messages:2.0:PatchOp",
  ERROR: "urn:ietf:params:scim:api:messages:2.0:Error",
} as const;

// Common types
export interface SCIMMeta {
  resourceType: "User" | "Group";
  created: string;
  lastModified: string;
  location: string;
  version?: string;
}

export interface SCIMName {
  formatted?: string;
  familyName?: string;
  givenName?: string;
  middleName?: string;
  honorificPrefix?: string;
  honorificSuffix?: string;
}

export interface SCIMEmail {
  value: string;
  type?: "work" | "home" | "other";
  primary?: boolean;
}

export interface SCIMPhoneNumber {
  value: string;
  type?: "work" | "home" | "mobile" | "fax" | "pager" | "other";
  primary?: boolean;
}

export interface SCIMPhoto {
  value: string;
  type?: "photo" | "thumbnail";
  primary?: boolean;
}

export interface SCIMAddress {
  formatted?: string;
  streetAddress?: string;
  locality?: string;
  region?: string;
  postalCode?: string;
  country?: string;
  type?: "work" | "home" | "other";
  primary?: boolean;
}

// SCIM User Resource
export interface SCIMUser {
  schemas: string[];
  id: string;
  externalId?: string;
  userName: string;
  name?: SCIMName;
  displayName?: string;
  nickName?: string;
  profileUrl?: string;
  title?: string;
  userType?: string;
  preferredLanguage?: string;
  locale?: string;
  timezone?: string;
  active: boolean;
  password?: string; // Write-only
  emails?: SCIMEmail[];
  phoneNumbers?: SCIMPhoneNumber[];
  photos?: SCIMPhoto[];
  addresses?: SCIMAddress[];
  groups?: Array<{
    value: string;
    $ref?: string;
    display?: string;
    type?: "direct" | "indirect";
  }>;
  roles?: Array<{
    value: string;
    display?: string;
    primary?: boolean;
  }>;
  "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User"?: {
    employeeNumber?: string;
    costCenter?: string;
    organization?: string;
    division?: string;
    department?: string;
    manager?: {
      value?: string;
      $ref?: string;
      displayName?: string;
    };
  };
  meta: SCIMMeta;
}

// SCIM Group Resource
export interface SCIMGroup {
  schemas: string[];
  id: string;
  externalId?: string;
  displayName: string;
  members?: Array<{
    value: string;
    $ref?: string;
    display?: string;
    type?: "User" | "Group";
  }>;
  meta: SCIMMeta;
}

// SCIM List Response
export interface SCIMListResponse<T> {
  schemas: [typeof SCIM_SCHEMAS.LIST_RESPONSE];
  totalResults: number;
  startIndex: number;
  itemsPerPage: number;
  Resources: T[];
}

// SCIM Error Response
export interface SCIMError {
  schemas: [typeof SCIM_SCHEMAS.ERROR];
  status: string;
  scimType?: string;
  detail?: string;
}

// SCIM Patch Operation
export interface SCIMPatchOperation {
  op: "add" | "remove" | "replace";
  path?: string;
  value?: unknown;
}

export interface SCIMPatchRequest {
  schemas: [typeof SCIM_SCHEMAS.PATCH_OP];
  Operations: SCIMPatchOperation[];
}

// SCIM Search Request
export interface SCIMSearchRequest {
  schemas: [typeof SCIM_SCHEMAS.SEARCH_REQUEST];
  filter?: string;
  sortBy?: string;
  sortOrder?: "ascending" | "descending";
  startIndex?: number;
  count?: number;
  attributes?: string[];
  excludedAttributes?: string[];
}

// Create User Request (subset of SCIMUser)
export interface CreateSCIMUserRequest {
  schemas: string[];
  userName: string;
  externalId?: string;
  name?: SCIMName;
  displayName?: string;
  emails?: SCIMEmail[];
  phoneNumbers?: SCIMPhoneNumber[];
  active?: boolean;
  password?: string;
  "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User"?: {
    employeeNumber?: string;
    department?: string;
    manager?: { value?: string };
  };
}

// Create Group Request
export interface CreateSCIMGroupRequest {
  schemas: string[];
  displayName: string;
  externalId?: string;
  members?: Array<{
    value: string;
    display?: string;
  }>;
}

// SCIM Filter parsing types
export interface SCIMFilter {
  attribute: string;
  operator: "eq" | "ne" | "co" | "sw" | "ew" | "gt" | "ge" | "lt" | "le" | "pr";
  value?: string;
}

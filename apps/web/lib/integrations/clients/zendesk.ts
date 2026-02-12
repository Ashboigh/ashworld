/**
 * Zendesk Support API Client
 * https://developer.zendesk.com/api-reference/
 */

import { BaseIntegrationClient, ApiResponse, PaginatedResponse } from "./base";

// Ticket types
export interface ZendeskTicket {
  id: number;
  url: string;
  subject: string;
  description: string;
  status: "new" | "open" | "pending" | "hold" | "solved" | "closed";
  priority: "urgent" | "high" | "normal" | "low" | null;
  type: "problem" | "incident" | "question" | "task" | null;
  requester_id: number;
  submitter_id: number;
  assignee_id: number | null;
  group_id: number | null;
  tags: string[];
  created_at: string;
  updated_at: string;
  custom_fields: Array<{ id: number; value: unknown }>;
}

export interface CreateTicketInput {
  subject: string;
  comment: {
    body: string;
    html_body?: string;
    public?: boolean;
  };
  priority?: ZendeskTicket["priority"];
  type?: ZendeskTicket["type"];
  status?: ZendeskTicket["status"];
  requester_id?: number;
  requester?: {
    name: string;
    email: string;
  };
  assignee_id?: number;
  group_id?: number;
  tags?: string[];
  custom_fields?: Array<{ id: number; value: unknown }>;
}

// User types
export interface ZendeskUser {
  id: number;
  url: string;
  name: string;
  email: string;
  role: "end-user" | "agent" | "admin";
  active: boolean;
  verified: boolean;
  phone: string | null;
  organization_id: number | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateUserInput {
  name: string;
  email: string;
  role?: ZendeskUser["role"];
  phone?: string;
  organization_id?: number;
  tags?: string[];
  verified?: boolean;
}

// Organization types
export interface ZendeskOrganization {
  id: number;
  url: string;
  name: string;
  domain_names: string[];
  details: string | null;
  notes: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

// Comment types
export interface ZendeskComment {
  id: number;
  type: "Comment" | "VoiceComment";
  body: string;
  html_body: string;
  plain_body: string;
  public: boolean;
  author_id: number;
  created_at: string;
}

export interface AddCommentInput {
  body: string;
  html_body?: string;
  public?: boolean;
  author_id?: number;
}

export class ZendeskClient extends BaseIntegrationClient {
  constructor(credentialId: string, subdomain: string) {
    super(credentialId, `https://${subdomain}.zendesk.com/api/v2`);
  }

  /**
   * Test the connection to Zendesk
   */
  async testConnection(): Promise<boolean> {
    const result = await this.get("/users/me.json");
    return result.success;
  }

  // ============ Tickets ============

  /**
   * Create a new ticket
   */
  async createTicket(input: CreateTicketInput): Promise<ApiResponse<{ ticket: ZendeskTicket }>> {
    return this.post("/tickets.json", { ticket: input });
  }

  /**
   * Get a ticket by ID
   */
  async getTicket(ticketId: number): Promise<ApiResponse<{ ticket: ZendeskTicket }>> {
    return this.get(`/tickets/${ticketId}.json`);
  }

  /**
   * Update a ticket
   */
  async updateTicket(
    ticketId: number,
    updates: Partial<CreateTicketInput>
  ): Promise<ApiResponse<{ ticket: ZendeskTicket }>> {
    return this.put(`/tickets/${ticketId}.json`, { ticket: updates });
  }

  /**
   * Delete a ticket
   */
  async deleteTicket(ticketId: number): Promise<ApiResponse<void>> {
    return this.delete(`/tickets/${ticketId}.json`);
  }

  /**
   * List tickets
   */
  async listTickets(
    page: number = 1,
    perPage: number = 25
  ): Promise<ApiResponse<PaginatedResponse<ZendeskTicket>>> {
    const result = await this.get<{
      tickets: ZendeskTicket[];
      count: number;
      next_page: string | null;
    }>("/tickets.json", { page, per_page: perPage });

    if (!result.success || !result.data) {
      return result as ApiResponse<PaginatedResponse<ZendeskTicket>>;
    }

    return {
      success: true,
      data: {
        items: result.data.tickets,
        total: result.data.count,
        hasMore: !!result.data.next_page,
        nextPage: result.data.next_page || undefined,
      },
    };
  }

  /**
   * Search tickets
   */
  async searchTickets(
    query: string,
    page: number = 1
  ): Promise<ApiResponse<PaginatedResponse<ZendeskTicket>>> {
    const result = await this.get<{
      results: ZendeskTicket[];
      count: number;
      next_page: string | null;
    }>("/search.json", {
      query: `type:ticket ${query}`,
      page,
    });

    if (!result.success || !result.data) {
      return result as ApiResponse<PaginatedResponse<ZendeskTicket>>;
    }

    return {
      success: true,
      data: {
        items: result.data.results,
        total: result.data.count,
        hasMore: !!result.data.next_page,
        nextPage: result.data.next_page || undefined,
      },
    };
  }

  /**
   * Get tickets for a user
   */
  async getUserTickets(
    userId: number,
    page: number = 1
  ): Promise<ApiResponse<PaginatedResponse<ZendeskTicket>>> {
    const result = await this.get<{
      tickets: ZendeskTicket[];
      count: number;
      next_page: string | null;
    }>(`/users/${userId}/tickets/requested.json`, { page });

    if (!result.success || !result.data) {
      return result as ApiResponse<PaginatedResponse<ZendeskTicket>>;
    }

    return {
      success: true,
      data: {
        items: result.data.tickets,
        total: result.data.count,
        hasMore: !!result.data.next_page,
        nextPage: result.data.next_page || undefined,
      },
    };
  }

  // ============ Comments ============

  /**
   * Add a comment to a ticket
   */
  async addComment(
    ticketId: number,
    comment: AddCommentInput
  ): Promise<ApiResponse<{ ticket: ZendeskTicket }>> {
    return this.put(`/tickets/${ticketId}.json`, {
      ticket: { comment },
    });
  }

  /**
   * Get comments for a ticket
   */
  async getComments(
    ticketId: number
  ): Promise<ApiResponse<{ comments: ZendeskComment[] }>> {
    return this.get(`/tickets/${ticketId}/comments.json`);
  }

  // ============ Users ============

  /**
   * Create a new user
   */
  async createUser(input: CreateUserInput): Promise<ApiResponse<{ user: ZendeskUser }>> {
    return this.post("/users.json", { user: input });
  }

  /**
   * Create or update a user by email
   */
  async createOrUpdateUser(
    input: CreateUserInput
  ): Promise<ApiResponse<{ user: ZendeskUser }>> {
    return this.post("/users/create_or_update.json", { user: input });
  }

  /**
   * Get a user by ID
   */
  async getUser(userId: number): Promise<ApiResponse<{ user: ZendeskUser }>> {
    return this.get(`/users/${userId}.json`);
  }

  /**
   * Update a user
   */
  async updateUser(
    userId: number,
    updates: Partial<CreateUserInput>
  ): Promise<ApiResponse<{ user: ZendeskUser }>> {
    return this.put(`/users/${userId}.json`, { user: updates });
  }

  /**
   * Search users
   */
  async searchUsers(
    query: string
  ): Promise<ApiResponse<{ users: ZendeskUser[] }>> {
    return this.get("/users/search.json", { query });
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<ApiResponse<ZendeskUser | null>> {
    const result = await this.searchUsers(`email:${email}`);
    if (!result.success) {
      return result as ApiResponse<ZendeskUser | null>;
    }

    return {
      success: true,
      data: result.data?.users[0] || null,
    };
  }

  /**
   * Get current user (authenticated user)
   */
  async getCurrentUser(): Promise<ApiResponse<{ user: ZendeskUser }>> {
    return this.get("/users/me.json");
  }

  // ============ Organizations ============

  /**
   * Get an organization by ID
   */
  async getOrganization(
    orgId: number
  ): Promise<ApiResponse<{ organization: ZendeskOrganization }>> {
    return this.get(`/organizations/${orgId}.json`);
  }

  /**
   * List organizations
   */
  async listOrganizations(
    page: number = 1
  ): Promise<ApiResponse<{ organizations: ZendeskOrganization[] }>> {
    return this.get("/organizations.json", { page });
  }

  // ============ Ticket Fields ============

  /**
   * Get all ticket fields
   */
  async getTicketFields(): Promise<
    ApiResponse<{
      ticket_fields: Array<{
        id: number;
        type: string;
        title: string;
        required: boolean;
        custom_field_options?: Array<{ name: string; value: string }>;
      }>;
    }>
  > {
    return this.get("/ticket_fields.json");
  }

  // ============ Groups ============

  /**
   * List groups
   */
  async listGroups(): Promise<
    ApiResponse<{
      groups: Array<{
        id: number;
        name: string;
        deleted: boolean;
      }>;
    }>
  > {
    return this.get("/groups.json");
  }

  // ============ Tags ============

  /**
   * Add tags to a ticket
   */
  async addTicketTags(
    ticketId: number,
    tags: string[]
  ): Promise<ApiResponse<{ tags: string[] }>> {
    return this.put(`/tickets/${ticketId}/tags.json`, { tags });
  }

  /**
   * Remove tags from a ticket
   */
  async removeTicketTags(
    ticketId: number,
    tags: string[]
  ): Promise<ApiResponse<{ tags: string[] }>> {
    return this.delete(`/tickets/${ticketId}/tags.json`);
  }

  /**
   * Extract error message from Zendesk API response
   */
  protected extractErrorMessage(errorData: unknown): string | null {
    if (typeof errorData === "object" && errorData !== null) {
      const data = errorData as Record<string, unknown>;
      if (data.error) {
        if (typeof data.error === "string") return data.error;
        if (typeof data.error === "object") {
          const error = data.error as Record<string, unknown>;
          return error.message as string;
        }
      }
      if (data.description) return data.description as string;
      if (data.details && typeof data.details === "object") {
        const details = data.details as Record<string, unknown>;
        const firstKey = Object.keys(details)[0];
        if (firstKey && Array.isArray(details[firstKey])) {
          const firstError = (details[firstKey] as Array<{ description?: string }>)[0];
          return firstError?.description || null;
        }
      }
    }
    return null;
  }
}

/**
 * Create a Zendesk client instance
 */
export function createZendeskClient(
  credentialId: string,
  subdomain: string
): ZendeskClient {
  return new ZendeskClient(credentialId, subdomain);
}

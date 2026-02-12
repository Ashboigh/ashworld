/**
 * HubSpot CRM API Client
 * https://developers.hubspot.com/docs/api/overview
 */

import { BaseIntegrationClient, ApiResponse, PaginatedResponse } from "./base";

const HUBSPOT_API_BASE = "https://api.hubapi.com";

// Contact types
export interface HubSpotContact {
  id: string;
  properties: {
    email?: string;
    firstname?: string;
    lastname?: string;
    phone?: string;
    company?: string;
    website?: string;
    lifecyclestage?: string;
    hs_lead_status?: string;
    [key: string]: string | undefined;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateContactInput {
  email: string;
  firstname?: string;
  lastname?: string;
  phone?: string;
  company?: string;
  website?: string;
  lifecyclestage?: string;
  [key: string]: string | undefined;
}

// Company types
export interface HubSpotCompany {
  id: string;
  properties: {
    name?: string;
    domain?: string;
    industry?: string;
    phone?: string;
    website?: string;
    city?: string;
    state?: string;
    country?: string;
    [key: string]: string | undefined;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateCompanyInput {
  name: string;
  domain?: string;
  industry?: string;
  phone?: string;
  website?: string;
  [key: string]: string | undefined;
}

// Deal types
export interface HubSpotDeal {
  id: string;
  properties: {
    dealname?: string;
    amount?: string;
    dealstage?: string;
    pipeline?: string;
    closedate?: string;
    hubspot_owner_id?: string;
    [key: string]: string | undefined;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateDealInput {
  dealname: string;
  amount?: string;
  dealstage?: string;
  pipeline?: string;
  closedate?: string;
  [key: string]: string | undefined;
}

// Ticket types
export interface HubSpotTicket {
  id: string;
  properties: {
    subject?: string;
    content?: string;
    hs_pipeline?: string;
    hs_pipeline_stage?: string;
    hs_ticket_priority?: string;
    [key: string]: string | undefined;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateTicketInput {
  subject: string;
  content?: string;
  hs_pipeline?: string;
  hs_pipeline_stage?: string;
  hs_ticket_priority?: string;
  [key: string]: string | undefined;
}

// Search types
export interface SearchFilter {
  propertyName: string;
  operator: "EQ" | "NEQ" | "LT" | "LTE" | "GT" | "GTE" | "CONTAINS_TOKEN" | "NOT_CONTAINS_TOKEN";
  value: string;
}

export interface SearchRequest {
  filterGroups?: Array<{
    filters: SearchFilter[];
  }>;
  sorts?: Array<{
    propertyName: string;
    direction: "ASCENDING" | "DESCENDING";
  }>;
  properties?: string[];
  limit?: number;
  after?: string;
}

export class HubSpotClient extends BaseIntegrationClient {
  constructor(credentialId: string) {
    super(credentialId, HUBSPOT_API_BASE);
  }

  /**
   * Test the connection to HubSpot
   */
  async testConnection(): Promise<boolean> {
    const result = await this.get("/crm/v3/objects/contacts?limit=1");
    return result.success;
  }

  // ============ Contacts ============

  /**
   * Create a new contact
   */
  async createContact(input: CreateContactInput): Promise<ApiResponse<HubSpotContact>> {
    return this.post("/crm/v3/objects/contacts", {
      properties: input,
    });
  }

  /**
   * Get a contact by ID
   */
  async getContact(
    contactId: string,
    properties?: string[]
  ): Promise<ApiResponse<HubSpotContact>> {
    const params: Record<string, string | undefined> = {};
    if (properties && properties.length > 0) {
      params.properties = properties.join(",");
    }
    return this.get(`/crm/v3/objects/contacts/${contactId}`, params);
  }

  /**
   * Update a contact
   */
  async updateContact(
    contactId: string,
    properties: Record<string, string>
  ): Promise<ApiResponse<HubSpotContact>> {
    return this.patch(`/crm/v3/objects/contacts/${contactId}`, {
      properties,
    });
  }

  /**
   * Delete a contact
   */
  async deleteContact(contactId: string): Promise<ApiResponse<void>> {
    return this.delete(`/crm/v3/objects/contacts/${contactId}`);
  }

  /**
   * Search contacts
   */
  async searchContacts(
    request: SearchRequest
  ): Promise<ApiResponse<PaginatedResponse<HubSpotContact>>> {
    const result = await this.post<{
      total: number;
      results: HubSpotContact[];
      paging?: { next?: { after: string } };
    }>("/crm/v3/objects/contacts/search", request);

    if (!result.success || !result.data) {
      return result as ApiResponse<PaginatedResponse<HubSpotContact>>;
    }

    return {
      success: true,
      data: {
        items: result.data.results,
        total: result.data.total,
        hasMore: !!result.data.paging?.next,
        cursor: result.data.paging?.next?.after,
      },
    };
  }

  /**
   * Get contact by email
   */
  async getContactByEmail(email: string): Promise<ApiResponse<HubSpotContact | null>> {
    const result = await this.searchContacts({
      filterGroups: [
        {
          filters: [
            {
              propertyName: "email",
              operator: "EQ",
              value: email,
            },
          ],
        },
      ],
      limit: 1,
    });

    if (!result.success) {
      return result as ApiResponse<HubSpotContact | null>;
    }

    return {
      success: true,
      data: result.data?.items[0] || null,
    };
  }

  // ============ Companies ============

  /**
   * Create a new company
   */
  async createCompany(input: CreateCompanyInput): Promise<ApiResponse<HubSpotCompany>> {
    return this.post("/crm/v3/objects/companies", {
      properties: input,
    });
  }

  /**
   * Get a company by ID
   */
  async getCompany(
    companyId: string,
    properties?: string[]
  ): Promise<ApiResponse<HubSpotCompany>> {
    const params: Record<string, string | undefined> = {};
    if (properties && properties.length > 0) {
      params.properties = properties.join(",");
    }
    return this.get(`/crm/v3/objects/companies/${companyId}`, params);
  }

  /**
   * Update a company
   */
  async updateCompany(
    companyId: string,
    properties: Record<string, string>
  ): Promise<ApiResponse<HubSpotCompany>> {
    return this.patch(`/crm/v3/objects/companies/${companyId}`, {
      properties,
    });
  }

  /**
   * Search companies
   */
  async searchCompanies(
    request: SearchRequest
  ): Promise<ApiResponse<PaginatedResponse<HubSpotCompany>>> {
    const result = await this.post<{
      total: number;
      results: HubSpotCompany[];
      paging?: { next?: { after: string } };
    }>("/crm/v3/objects/companies/search", request);

    if (!result.success || !result.data) {
      return result as ApiResponse<PaginatedResponse<HubSpotCompany>>;
    }

    return {
      success: true,
      data: {
        items: result.data.results,
        total: result.data.total,
        hasMore: !!result.data.paging?.next,
        cursor: result.data.paging?.next?.after,
      },
    };
  }

  // ============ Deals ============

  /**
   * Create a new deal
   */
  async createDeal(input: CreateDealInput): Promise<ApiResponse<HubSpotDeal>> {
    return this.post("/crm/v3/objects/deals", {
      properties: input,
    });
  }

  /**
   * Get a deal by ID
   */
  async getDeal(
    dealId: string,
    properties?: string[]
  ): Promise<ApiResponse<HubSpotDeal>> {
    const params: Record<string, string | undefined> = {};
    if (properties && properties.length > 0) {
      params.properties = properties.join(",");
    }
    return this.get(`/crm/v3/objects/deals/${dealId}`, params);
  }

  /**
   * Update a deal
   */
  async updateDeal(
    dealId: string,
    properties: Record<string, string>
  ): Promise<ApiResponse<HubSpotDeal>> {
    return this.patch(`/crm/v3/objects/deals/${dealId}`, {
      properties,
    });
  }

  /**
   * Search deals
   */
  async searchDeals(
    request: SearchRequest
  ): Promise<ApiResponse<PaginatedResponse<HubSpotDeal>>> {
    const result = await this.post<{
      total: number;
      results: HubSpotDeal[];
      paging?: { next?: { after: string } };
    }>("/crm/v3/objects/deals/search", request);

    if (!result.success || !result.data) {
      return result as ApiResponse<PaginatedResponse<HubSpotDeal>>;
    }

    return {
      success: true,
      data: {
        items: result.data.results,
        total: result.data.total,
        hasMore: !!result.data.paging?.next,
        cursor: result.data.paging?.next?.after,
      },
    };
  }

  // ============ Tickets ============

  /**
   * Create a new ticket
   */
  async createTicket(input: CreateTicketInput): Promise<ApiResponse<HubSpotTicket>> {
    return this.post("/crm/v3/objects/tickets", {
      properties: input,
    });
  }

  /**
   * Get a ticket by ID
   */
  async getTicket(
    ticketId: string,
    properties?: string[]
  ): Promise<ApiResponse<HubSpotTicket>> {
    const params: Record<string, string | undefined> = {};
    if (properties && properties.length > 0) {
      params.properties = properties.join(",");
    }
    return this.get(`/crm/v3/objects/tickets/${ticketId}`, params);
  }

  /**
   * Update a ticket
   */
  async updateTicket(
    ticketId: string,
    properties: Record<string, string>
  ): Promise<ApiResponse<HubSpotTicket>> {
    return this.patch(`/crm/v3/objects/tickets/${ticketId}`, {
      properties,
    });
  }

  // ============ Associations ============

  /**
   * Associate two objects
   */
  async createAssociation(
    fromObjectType: string,
    fromObjectId: string,
    toObjectType: string,
    toObjectId: string,
    associationType: string
  ): Promise<ApiResponse<void>> {
    return this.put(
      `/crm/v3/objects/${fromObjectType}/${fromObjectId}/associations/${toObjectType}/${toObjectId}/${associationType}`
    );
  }

  /**
   * Get associations for an object
   */
  async getAssociations(
    objectType: string,
    objectId: string,
    toObjectType: string
  ): Promise<ApiResponse<{ results: Array<{ id: string; type: string }> }>> {
    return this.get(
      `/crm/v3/objects/${objectType}/${objectId}/associations/${toObjectType}`
    );
  }

  // ============ Pipelines ============

  /**
   * Get deal pipelines
   */
  async getDealPipelines(): Promise<
    ApiResponse<{
      results: Array<{
        id: string;
        label: string;
        stages: Array<{ id: string; label: string }>;
      }>;
    }>
  > {
    return this.get("/crm/v3/pipelines/deals");
  }

  /**
   * Get ticket pipelines
   */
  async getTicketPipelines(): Promise<
    ApiResponse<{
      results: Array<{
        id: string;
        label: string;
        stages: Array<{ id: string; label: string }>;
      }>;
    }>
  > {
    return this.get("/crm/v3/pipelines/tickets");
  }

  // ============ Properties ============

  /**
   * Get properties for an object type
   */
  async getProperties(
    objectType: string
  ): Promise<ApiResponse<{ results: Array<{ name: string; label: string; type: string }> }>> {
    return this.get(`/crm/v3/properties/${objectType}`);
  }

  // ============ Owners ============

  /**
   * Get all owners
   */
  async getOwners(): Promise<
    ApiResponse<{
      results: Array<{
        id: string;
        email: string;
        firstName: string;
        lastName: string;
      }>;
    }>
  > {
    return this.get("/crm/v3/owners");
  }

  /**
   * Extract error message from HubSpot API response
   */
  protected extractErrorMessage(errorData: unknown): string | null {
    if (typeof errorData === "object" && errorData !== null) {
      const data = errorData as Record<string, unknown>;
      if (data.message) return data.message as string;
      if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
        const firstError = data.errors[0] as Record<string, unknown>;
        return firstError.message as string;
      }
    }
    return null;
  }
}

/**
 * Create a HubSpot client instance
 */
export function createHubSpotClient(credentialId: string): HubSpotClient {
  return new HubSpotClient(credentialId);
}

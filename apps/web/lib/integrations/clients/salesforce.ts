/**
 * Salesforce CRM API Client
 * https://developer.salesforce.com/docs/apis
 */

import { BaseIntegrationClient, ApiResponse, PaginatedResponse } from "./base";
import { prisma } from "@repo/database";
import { decryptCredential } from "../secure-storage";

// Record types
export interface SalesforceRecord {
  Id: string;
  attributes: {
    type: string;
    url: string;
  };
  [key: string]: unknown;
}

export interface SalesforceContact {
  Id: string;
  Email?: string;
  FirstName?: string;
  LastName?: string;
  Phone?: string;
  AccountId?: string;
  Title?: string;
  Department?: string;
  [key: string]: unknown;
}

export interface SalesforceAccount {
  Id: string;
  Name?: string;
  Industry?: string;
  Phone?: string;
  Website?: string;
  BillingCity?: string;
  BillingState?: string;
  BillingCountry?: string;
  [key: string]: unknown;
}

export interface SalesforceOpportunity {
  Id: string;
  Name?: string;
  Amount?: number;
  StageName?: string;
  CloseDate?: string;
  AccountId?: string;
  OwnerId?: string;
  [key: string]: unknown;
}

export interface SalesforceCase {
  Id: string;
  Subject?: string;
  Description?: string;
  Status?: string;
  Priority?: string;
  Origin?: string;
  ContactId?: string;
  AccountId?: string;
  [key: string]: unknown;
}

// Query result
interface QueryResult<T> {
  totalSize: number;
  done: boolean;
  records: T[];
  nextRecordsUrl?: string;
}

export class SalesforceClient extends BaseIntegrationClient {
  private instanceUrl: string = "";

  constructor(credentialId: string) {
    // We'll set the actual instance URL after fetching credentials
    super(credentialId, "");
  }

  /**
   * Initialize the client with instance URL from credentials
   */
  private async ensureInstanceUrl(): Promise<boolean> {
    if (this.instanceUrl) {
      return true;
    }

    try {
      const credential = await prisma.integrationCredential.findUnique({
        where: { id: this.credentialId },
      });

      if (!credential) {
        return false;
      }

      const encryptedData = credential.encryptedCredentials as { data: string; iv: string };
      const credentials = JSON.parse(decryptCredential(encryptedData.data, encryptedData.iv));

      this.instanceUrl = credentials.instance_url || "";
      this.baseUrl = this.instanceUrl;

      return !!this.instanceUrl;
    } catch {
      return false;
    }
  }

  /**
   * Test the connection to Salesforce
   */
  async testConnection(): Promise<boolean> {
    if (!(await this.ensureInstanceUrl())) {
      return false;
    }
    const result = await this.get("/services/data/v58.0/");
    return result.success;
  }

  /**
   * Execute a SOQL query
   */
  async query<T = SalesforceRecord>(soql: string): Promise<ApiResponse<QueryResult<T>>> {
    if (!(await this.ensureInstanceUrl())) {
      return { success: false, error: "Failed to get instance URL" };
    }
    return this.get("/services/data/v58.0/query", {
      q: soql,
    });
  }

  /**
   * Get next page of query results
   */
  async queryMore<T = SalesforceRecord>(
    nextRecordsUrl: string
  ): Promise<ApiResponse<QueryResult<T>>> {
    if (!(await this.ensureInstanceUrl())) {
      return { success: false, error: "Failed to get instance URL" };
    }
    return this.get(nextRecordsUrl);
  }

  // ============ Contacts ============

  /**
   * Create a contact
   */
  async createContact(
    data: Omit<SalesforceContact, "Id">
  ): Promise<ApiResponse<{ id: string; success: boolean }>> {
    if (!(await this.ensureInstanceUrl())) {
      return { success: false, error: "Failed to get instance URL" };
    }
    return this.post("/services/data/v58.0/sobjects/Contact", data);
  }

  /**
   * Get a contact by ID
   */
  async getContact(contactId: string): Promise<ApiResponse<SalesforceContact>> {
    if (!(await this.ensureInstanceUrl())) {
      return { success: false, error: "Failed to get instance URL" };
    }
    return this.get(`/services/data/v58.0/sobjects/Contact/${contactId}`);
  }

  /**
   * Update a contact
   */
  async updateContact(
    contactId: string,
    data: Partial<SalesforceContact>
  ): Promise<ApiResponse<void>> {
    if (!(await this.ensureInstanceUrl())) {
      return { success: false, error: "Failed to get instance URL" };
    }
    return this.patch(`/services/data/v58.0/sobjects/Contact/${contactId}`, data);
  }

  /**
   * Delete a contact
   */
  async deleteContact(contactId: string): Promise<ApiResponse<void>> {
    if (!(await this.ensureInstanceUrl())) {
      return { success: false, error: "Failed to get instance URL" };
    }
    return this.delete(`/services/data/v58.0/sobjects/Contact/${contactId}`);
  }

  /**
   * Search contacts
   */
  async searchContacts(
    searchTerm: string,
    limit: number = 20
  ): Promise<ApiResponse<PaginatedResponse<SalesforceContact>>> {
    const soql = `
      SELECT Id, Email, FirstName, LastName, Phone, AccountId, Title
      FROM Contact
      WHERE FirstName LIKE '%${searchTerm}%'
         OR LastName LIKE '%${searchTerm}%'
         OR Email LIKE '%${searchTerm}%'
      LIMIT ${limit}
    `;

    const result = await this.query<SalesforceContact>(soql);
    if (!result.success || !result.data) {
      return result as ApiResponse<PaginatedResponse<SalesforceContact>>;
    }

    return {
      success: true,
      data: {
        items: result.data.records,
        total: result.data.totalSize,
        hasMore: !result.data.done,
        nextPage: result.data.nextRecordsUrl,
      },
    };
  }

  // ============ Accounts ============

  /**
   * Create an account
   */
  async createAccount(
    data: Omit<SalesforceAccount, "Id">
  ): Promise<ApiResponse<{ id: string; success: boolean }>> {
    if (!(await this.ensureInstanceUrl())) {
      return { success: false, error: "Failed to get instance URL" };
    }
    return this.post("/services/data/v58.0/sobjects/Account", data);
  }

  /**
   * Get an account by ID
   */
  async getAccount(accountId: string): Promise<ApiResponse<SalesforceAccount>> {
    if (!(await this.ensureInstanceUrl())) {
      return { success: false, error: "Failed to get instance URL" };
    }
    return this.get(`/services/data/v58.0/sobjects/Account/${accountId}`);
  }

  /**
   * Update an account
   */
  async updateAccount(
    accountId: string,
    data: Partial<SalesforceAccount>
  ): Promise<ApiResponse<void>> {
    if (!(await this.ensureInstanceUrl())) {
      return { success: false, error: "Failed to get instance URL" };
    }
    return this.patch(`/services/data/v58.0/sobjects/Account/${accountId}`, data);
  }

  // ============ Opportunities ============

  /**
   * Create an opportunity
   */
  async createOpportunity(
    data: Omit<SalesforceOpportunity, "Id">
  ): Promise<ApiResponse<{ id: string; success: boolean }>> {
    if (!(await this.ensureInstanceUrl())) {
      return { success: false, error: "Failed to get instance URL" };
    }
    return this.post("/services/data/v58.0/sobjects/Opportunity", data);
  }

  /**
   * Get an opportunity by ID
   */
  async getOpportunity(oppId: string): Promise<ApiResponse<SalesforceOpportunity>> {
    if (!(await this.ensureInstanceUrl())) {
      return { success: false, error: "Failed to get instance URL" };
    }
    return this.get(`/services/data/v58.0/sobjects/Opportunity/${oppId}`);
  }

  /**
   * Update an opportunity
   */
  async updateOpportunity(
    oppId: string,
    data: Partial<SalesforceOpportunity>
  ): Promise<ApiResponse<void>> {
    if (!(await this.ensureInstanceUrl())) {
      return { success: false, error: "Failed to get instance URL" };
    }
    return this.patch(`/services/data/v58.0/sobjects/Opportunity/${oppId}`, data);
  }

  // ============ Cases ============

  /**
   * Create a case
   */
  async createCase(
    data: Omit<SalesforceCase, "Id">
  ): Promise<ApiResponse<{ id: string; success: boolean }>> {
    if (!(await this.ensureInstanceUrl())) {
      return { success: false, error: "Failed to get instance URL" };
    }
    return this.post("/services/data/v58.0/sobjects/Case", data);
  }

  /**
   * Get a case by ID
   */
  async getCase(caseId: string): Promise<ApiResponse<SalesforceCase>> {
    if (!(await this.ensureInstanceUrl())) {
      return { success: false, error: "Failed to get instance URL" };
    }
    return this.get(`/services/data/v58.0/sobjects/Case/${caseId}`);
  }

  /**
   * Update a case
   */
  async updateCase(
    caseId: string,
    data: Partial<SalesforceCase>
  ): Promise<ApiResponse<void>> {
    if (!(await this.ensureInstanceUrl())) {
      return { success: false, error: "Failed to get instance URL" };
    }
    return this.patch(`/services/data/v58.0/sobjects/Case/${caseId}`, data);
  }

  // ============ Metadata ============

  /**
   * Describe an object (get fields, etc.)
   */
  async describeObject(
    objectName: string
  ): Promise<
    ApiResponse<{
      name: string;
      label: string;
      fields: Array<{ name: string; label: string; type: string }>;
    }>
  > {
    if (!(await this.ensureInstanceUrl())) {
      return { success: false, error: "Failed to get instance URL" };
    }
    return this.get(`/services/data/v58.0/sobjects/${objectName}/describe`);
  }

  /**
   * Get available objects
   */
  async getObjects(): Promise<
    ApiResponse<{
      sobjects: Array<{ name: string; label: string; queryable: boolean }>;
    }>
  > {
    if (!(await this.ensureInstanceUrl())) {
      return { success: false, error: "Failed to get instance URL" };
    }
    return this.get("/services/data/v58.0/sobjects");
  }

  /**
   * Extract error message from Salesforce API response
   */
  protected extractErrorMessage(errorData: unknown): string | null {
    if (Array.isArray(errorData) && errorData.length > 0) {
      const firstError = errorData[0] as Record<string, unknown>;
      return firstError.message as string;
    }
    if (typeof errorData === "object" && errorData !== null) {
      const data = errorData as Record<string, unknown>;
      return (data.message as string) || (data.error_description as string) || null;
    }
    return null;
  }
}

/**
 * Create a Salesforce client instance
 */
export function createSalesforceClient(credentialId: string): SalesforceClient {
  return new SalesforceClient(credentialId);
}

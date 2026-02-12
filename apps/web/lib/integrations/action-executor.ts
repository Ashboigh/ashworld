/**
 * Integration Action Executor
 * Executes integration actions from workflow nodes
 */

import { createIntegrationClient } from "./clients";
import { HubSpotClient, CreateContactInput, CreateTicketInput } from "./clients/hubspot";
import { SalesforceClient } from "./clients/salesforce";
import { ZendeskClient } from "./clients/zendesk";
import type { ApiResponse } from "./clients/base";

// Action types
export type IntegrationActionType =
  // CRM Actions
  | "crm.create_contact"
  | "crm.update_contact"
  | "crm.get_contact"
  | "crm.search_contacts"
  | "crm.create_company"
  | "crm.create_deal"
  | "crm.update_deal"
  // Helpdesk Actions
  | "helpdesk.create_ticket"
  | "helpdesk.update_ticket"
  | "helpdesk.add_comment"
  | "helpdesk.get_ticket"
  | "helpdesk.search_tickets"
  // Generic Actions
  | "integration.test_connection";

// Action input/output types
export interface ActionContext {
  integrationId: string;
  workflowId?: string;
  conversationId?: string;
  variables?: Record<string, unknown>;
}

export interface ActionInput {
  [key: string]: unknown;
}

export interface ActionResult {
  success: boolean;
  data?: unknown;
  error?: string;
  metadata?: {
    provider: string;
    action: string;
    executedAt: string;
  };
}

/**
 * Execute an integration action
 */
export async function executeAction(
  actionType: IntegrationActionType,
  context: ActionContext,
  input: ActionInput
): Promise<ActionResult> {
  const startTime = Date.now();

  try {
    // Get the integration client
    const client = await createIntegrationClient(context.integrationId);
    if (!client) {
      return {
        success: false,
        error: "Failed to create integration client",
      };
    }

    // Determine provider from client type
    const provider = getProviderFromClient(client);

    // Execute the action
    let result: ApiResponse<unknown>;

    switch (actionType) {
      // CRM Actions
      case "crm.create_contact":
        result = await executeCreateContact(client, input);
        break;
      case "crm.update_contact":
        result = await executeUpdateContact(client, input);
        break;
      case "crm.get_contact":
        result = await executeGetContact(client, input);
        break;
      case "crm.search_contacts":
        result = await executeSearchContacts(client, input);
        break;
      case "crm.create_company":
        result = await executeCreateCompany(client, input);
        break;
      case "crm.create_deal":
        result = await executeCreateDeal(client, input);
        break;
      case "crm.update_deal":
        result = await executeUpdateDeal(client, input);
        break;

      // Helpdesk Actions
      case "helpdesk.create_ticket":
        result = await executeCreateTicket(client, input);
        break;
      case "helpdesk.update_ticket":
        result = await executeUpdateTicket(client, input);
        break;
      case "helpdesk.add_comment":
        result = await executeAddComment(client, input);
        break;
      case "helpdesk.get_ticket":
        result = await executeGetTicket(client, input);
        break;
      case "helpdesk.search_tickets":
        result = await executeSearchTickets(client, input);
        break;

      // Generic Actions
      case "integration.test_connection": {
        const connected = await client.testConnection();
        result = { success: connected, data: { connected } };
        break;
      }

      default:
        return {
          success: false,
          error: `Unknown action type: ${actionType}`,
        };
    }

    return {
      success: result.success,
      data: result.data,
      error: result.error,
      metadata: {
        provider,
        action: actionType,
        executedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error(`Action execution error (${actionType}):`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Action execution failed",
    };
  }
}

// ============ CRM Action Handlers ============

async function executeCreateContact(
  client: HubSpotClient | SalesforceClient | ZendeskClient,
  input: ActionInput
): Promise<ApiResponse<unknown>> {
  if (client instanceof HubSpotClient) {
    return client.createContact(input as CreateContactInput);
  }
  if (client instanceof SalesforceClient) {
    return client.createContact({
      Email: input.email as string,
      FirstName: input.firstname as string,
      LastName: input.lastname as string,
      Phone: input.phone as string,
    });
  }
  if (client instanceof ZendeskClient) {
    return client.createUser({
      name: `${input.firstname || ""} ${input.lastname || ""}`.trim(),
      email: input.email as string,
      phone: input.phone as string,
    });
  }
  return { success: false, error: "Unsupported client for create_contact" };
}

async function executeUpdateContact(
  client: HubSpotClient | SalesforceClient | ZendeskClient,
  input: ActionInput
): Promise<ApiResponse<unknown>> {
  const contactId = input.contactId as string;
  const properties = input.properties as Record<string, string>;

  if (client instanceof HubSpotClient) {
    return client.updateContact(contactId, properties);
  }
  if (client instanceof SalesforceClient) {
    return client.updateContact(contactId, properties);
  }
  if (client instanceof ZendeskClient) {
    return client.updateUser(parseInt(contactId, 10), properties);
  }
  return { success: false, error: "Unsupported client for update_contact" };
}

async function executeGetContact(
  client: HubSpotClient | SalesforceClient | ZendeskClient,
  input: ActionInput
): Promise<ApiResponse<unknown>> {
  const contactId = input.contactId as string;

  if (client instanceof HubSpotClient) {
    return client.getContact(contactId);
  }
  if (client instanceof SalesforceClient) {
    return client.getContact(contactId);
  }
  if (client instanceof ZendeskClient) {
    return client.getUser(parseInt(contactId, 10));
  }
  return { success: false, error: "Unsupported client for get_contact" };
}

async function executeSearchContacts(
  client: HubSpotClient | SalesforceClient | ZendeskClient,
  input: ActionInput
): Promise<ApiResponse<unknown>> {
  const query = input.query as string;
  const email = input.email as string;

  if (client instanceof HubSpotClient) {
    if (email) {
      return client.getContactByEmail(email);
    }
    return client.searchContacts({
      filterGroups: query
        ? [
            {
              filters: [
                { propertyName: "email", operator: "CONTAINS_TOKEN", value: query },
              ],
            },
          ]
        : undefined,
      limit: (input.limit as number) || 20,
    });
  }
  if (client instanceof SalesforceClient) {
    return client.searchContacts(query || email, (input.limit as number) || 20);
  }
  if (client instanceof ZendeskClient) {
    return client.searchUsers(email ? `email:${email}` : query);
  }
  return { success: false, error: "Unsupported client for search_contacts" };
}

async function executeCreateCompany(
  client: HubSpotClient | SalesforceClient | ZendeskClient,
  input: ActionInput
): Promise<ApiResponse<unknown>> {
  if (client instanceof HubSpotClient) {
    return client.createCompany({
      name: input.name as string,
      domain: input.domain as string,
      industry: input.industry as string,
    });
  }
  if (client instanceof SalesforceClient) {
    return client.createAccount({
      Name: input.name as string,
      Website: input.domain as string,
      Industry: input.industry as string,
    });
  }
  return { success: false, error: "Unsupported client for create_company" };
}

async function executeCreateDeal(
  client: HubSpotClient | SalesforceClient | ZendeskClient,
  input: ActionInput
): Promise<ApiResponse<unknown>> {
  if (client instanceof HubSpotClient) {
    return client.createDeal({
      dealname: input.name as string,
      amount: input.amount as string,
      dealstage: input.stage as string,
      pipeline: input.pipeline as string,
    });
  }
  if (client instanceof SalesforceClient) {
    return client.createOpportunity({
      Name: input.name as string,
      Amount: input.amount as number,
      StageName: input.stage as string,
      CloseDate: input.closeDate as string,
    });
  }
  return { success: false, error: "Unsupported client for create_deal" };
}

async function executeUpdateDeal(
  client: HubSpotClient | SalesforceClient | ZendeskClient,
  input: ActionInput
): Promise<ApiResponse<unknown>> {
  const dealId = input.dealId as string;
  const properties = input.properties as Record<string, string>;

  if (client instanceof HubSpotClient) {
    return client.updateDeal(dealId, properties);
  }
  if (client instanceof SalesforceClient) {
    return client.updateOpportunity(dealId, properties);
  }
  return { success: false, error: "Unsupported client for update_deal" };
}

// ============ Helpdesk Action Handlers ============

async function executeCreateTicket(
  client: HubSpotClient | SalesforceClient | ZendeskClient,
  input: ActionInput
): Promise<ApiResponse<unknown>> {
  if (client instanceof HubSpotClient) {
    return client.createTicket({
      subject: input.subject as string,
      content: input.description as string,
      hs_ticket_priority: input.priority as string,
    });
  }
  if (client instanceof SalesforceClient) {
    return client.createCase({
      Subject: input.subject as string,
      Description: input.description as string,
      Priority: input.priority as string,
      Status: input.status as string,
    });
  }
  if (client instanceof ZendeskClient) {
    return client.createTicket({
      subject: input.subject as string,
      comment: {
        body: input.description as string,
      },
      priority: input.priority as "urgent" | "high" | "normal" | "low",
      requester: input.requesterEmail
        ? {
            name: input.requesterName as string,
            email: input.requesterEmail as string,
          }
        : undefined,
    });
  }
  return { success: false, error: "Unsupported client for create_ticket" };
}

async function executeUpdateTicket(
  client: HubSpotClient | SalesforceClient | ZendeskClient,
  input: ActionInput
): Promise<ApiResponse<unknown>> {
  const ticketId = input.ticketId as string;
  const updates = input.updates as Record<string, unknown>;

  if (client instanceof HubSpotClient) {
    return client.updateTicket(ticketId, updates as Record<string, string>);
  }
  if (client instanceof SalesforceClient) {
    return client.updateCase(ticketId, updates);
  }
  if (client instanceof ZendeskClient) {
    return client.updateTicket(parseInt(ticketId, 10), updates);
  }
  return { success: false, error: "Unsupported client for update_ticket" };
}

async function executeAddComment(
  client: HubSpotClient | SalesforceClient | ZendeskClient,
  input: ActionInput
): Promise<ApiResponse<unknown>> {
  const ticketId = input.ticketId as string;
  const comment = input.comment as string;
  const isPublic = input.public !== false;

  if (client instanceof ZendeskClient) {
    return client.addComment(parseInt(ticketId, 10), {
      body: comment,
      public: isPublic,
    });
  }

  // HubSpot and Salesforce don't have direct comment APIs in our implementation
  // Would need to use engagement/notes APIs

  return { success: false, error: "Unsupported client for add_comment" };
}

async function executeGetTicket(
  client: HubSpotClient | SalesforceClient | ZendeskClient,
  input: ActionInput
): Promise<ApiResponse<unknown>> {
  const ticketId = input.ticketId as string;

  if (client instanceof HubSpotClient) {
    return client.getTicket(ticketId);
  }
  if (client instanceof SalesforceClient) {
    return client.getCase(ticketId);
  }
  if (client instanceof ZendeskClient) {
    return client.getTicket(parseInt(ticketId, 10));
  }
  return { success: false, error: "Unsupported client for get_ticket" };
}

async function executeSearchTickets(
  client: HubSpotClient | SalesforceClient | ZendeskClient,
  input: ActionInput
): Promise<ApiResponse<unknown>> {
  const query = input.query as string;

  if (client instanceof ZendeskClient) {
    return client.searchTickets(query);
  }

  // HubSpot and Salesforce would need custom search implementations

  return { success: false, error: "Unsupported client for search_tickets" };
}

// ============ Helper Functions ============

function getProviderFromClient(
  client: HubSpotClient | SalesforceClient | ZendeskClient
): string {
  if (client instanceof HubSpotClient) return "hubspot";
  if (client instanceof SalesforceClient) return "salesforce";
  if (client instanceof ZendeskClient) return "zendesk";
  return "unknown";
}

/**
 * Get available actions for a provider
 */
export function getAvailableActions(provider: string): IntegrationActionType[] {
  const crmActions: IntegrationActionType[] = [
    "crm.create_contact",
    "crm.update_contact",
    "crm.get_contact",
    "crm.search_contacts",
    "crm.create_company",
    "crm.create_deal",
    "crm.update_deal",
  ];

  const helpdeskActions: IntegrationActionType[] = [
    "helpdesk.create_ticket",
    "helpdesk.update_ticket",
    "helpdesk.add_comment",
    "helpdesk.get_ticket",
    "helpdesk.search_tickets",
  ];

  const genericActions: IntegrationActionType[] = ["integration.test_connection"];

  switch (provider) {
    case "hubspot":
      return [...crmActions, ...helpdeskActions, ...genericActions];
    case "salesforce":
      return [...crmActions, ...helpdeskActions, ...genericActions];
    case "zendesk":
      return [...helpdeskActions, "crm.create_contact", "crm.update_contact", ...genericActions];
    default:
      return genericActions;
  }
}

/**
 * Get action metadata (description, required inputs, etc.)
 */
export function getActionMetadata(actionType: IntegrationActionType): {
  name: string;
  description: string;
  category: string;
  inputs: Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
  }>;
} {
  const actionMetadata: Record<IntegrationActionType, ReturnType<typeof getActionMetadata>> = {
    "crm.create_contact": {
      name: "Create Contact",
      description: "Create a new contact/lead in the CRM",
      category: "CRM",
      inputs: [
        { name: "email", type: "string", required: true, description: "Contact email" },
        { name: "firstname", type: "string", required: false, description: "First name" },
        { name: "lastname", type: "string", required: false, description: "Last name" },
        { name: "phone", type: "string", required: false, description: "Phone number" },
      ],
    },
    "crm.update_contact": {
      name: "Update Contact",
      description: "Update an existing contact",
      category: "CRM",
      inputs: [
        { name: "contactId", type: "string", required: true, description: "Contact ID" },
        { name: "properties", type: "object", required: true, description: "Properties to update" },
      ],
    },
    "crm.get_contact": {
      name: "Get Contact",
      description: "Retrieve a contact by ID",
      category: "CRM",
      inputs: [
        { name: "contactId", type: "string", required: true, description: "Contact ID" },
      ],
    },
    "crm.search_contacts": {
      name: "Search Contacts",
      description: "Search for contacts",
      category: "CRM",
      inputs: [
        { name: "query", type: "string", required: false, description: "Search query" },
        { name: "email", type: "string", required: false, description: "Email to search" },
        { name: "limit", type: "number", required: false, description: "Max results" },
      ],
    },
    "crm.create_company": {
      name: "Create Company",
      description: "Create a new company/account",
      category: "CRM",
      inputs: [
        { name: "name", type: "string", required: true, description: "Company name" },
        { name: "domain", type: "string", required: false, description: "Company website" },
        { name: "industry", type: "string", required: false, description: "Industry" },
      ],
    },
    "crm.create_deal": {
      name: "Create Deal",
      description: "Create a new deal/opportunity",
      category: "CRM",
      inputs: [
        { name: "name", type: "string", required: true, description: "Deal name" },
        { name: "amount", type: "string", required: false, description: "Deal amount" },
        { name: "stage", type: "string", required: false, description: "Deal stage" },
      ],
    },
    "crm.update_deal": {
      name: "Update Deal",
      description: "Update an existing deal",
      category: "CRM",
      inputs: [
        { name: "dealId", type: "string", required: true, description: "Deal ID" },
        { name: "properties", type: "object", required: true, description: "Properties to update" },
      ],
    },
    "helpdesk.create_ticket": {
      name: "Create Ticket",
      description: "Create a new support ticket",
      category: "Helpdesk",
      inputs: [
        { name: "subject", type: "string", required: true, description: "Ticket subject" },
        { name: "description", type: "string", required: true, description: "Ticket description" },
        { name: "priority", type: "string", required: false, description: "Ticket priority" },
        { name: "requesterEmail", type: "string", required: false, description: "Requester email" },
      ],
    },
    "helpdesk.update_ticket": {
      name: "Update Ticket",
      description: "Update an existing ticket",
      category: "Helpdesk",
      inputs: [
        { name: "ticketId", type: "string", required: true, description: "Ticket ID" },
        { name: "updates", type: "object", required: true, description: "Updates to apply" },
      ],
    },
    "helpdesk.add_comment": {
      name: "Add Comment",
      description: "Add a comment to a ticket",
      category: "Helpdesk",
      inputs: [
        { name: "ticketId", type: "string", required: true, description: "Ticket ID" },
        { name: "comment", type: "string", required: true, description: "Comment text" },
        { name: "public", type: "boolean", required: false, description: "Is public comment" },
      ],
    },
    "helpdesk.get_ticket": {
      name: "Get Ticket",
      description: "Retrieve a ticket by ID",
      category: "Helpdesk",
      inputs: [
        { name: "ticketId", type: "string", required: true, description: "Ticket ID" },
      ],
    },
    "helpdesk.search_tickets": {
      name: "Search Tickets",
      description: "Search for tickets",
      category: "Helpdesk",
      inputs: [
        { name: "query", type: "string", required: true, description: "Search query" },
      ],
    },
    "integration.test_connection": {
      name: "Test Connection",
      description: "Test the integration connection",
      category: "System",
      inputs: [],
    },
  };

  return actionMetadata[actionType];
}

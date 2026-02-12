import type { IntegrationProvider } from "./types";

const crmActions = [
  {
    id: "create_record",
    title: "Create record",
    description: "Create leads, contacts, or deals in the CRM.",
    supportedParams: [
      { key: "object_type", label: "Object type", type: "string", required: true },
      { key: "payload", label: "Payload", type: "json", required: true },
    ],
  },
  {
    id: "update_record",
    title: "Update record",
    description: "Update existing CRM entries.",
    supportedParams: [
      { key: "object_type", label: "Object type", type: "string", required: true },
      { key: "record_id", label: "Record ID", type: "string", required: true },
      { key: "payload", label: "Payload", type: "json", required: true },
    ],
  },
];

const helpdeskActions = [
  {
    id: "create_ticket",
    title: "Create ticket",
    description: "Spin up a new ticket or conversation in the help desk.",
    supportedParams: [
      { key: "subject", label: "Subject", type: "string", required: true },
      { key: "description", label: "Description", type: "string", required: true },
      { key: "metadata", label: "Metadata", type: "json" },
    ],
  },
  {
    id: "update_ticket",
    title: "Update ticket",
    description: "Enrich ticket status or add a comment.",
    supportedParams: [
      { key: "ticket_id", label: "Ticket ID", type: "string", required: true },
      { key: "status", label: "Status", type: "string" },
      { key: "comment", label: "Comment", type: "string" },
    ],
  },
];

const calendarActions = [
  {
    id: "create_event",
    title: "Create calendar event",
    description: "Schedule a new event on the connected calendar.",
    supportedParams: [
      { key: "summary", label: "Event summary", type: "string", required: true },
      { key: "start", label: "Start ISO string", type: "string", required: true },
      { key: "end", label: "End ISO string", type: "string", required: true },
      { key: "attendees", label: "Attendee emails", type: "json" },
    ],
  },
];

export const integrationProviders: IntegrationProvider[] = [
  {
    id: "salesforce",
    name: "Salesforce CRM",
    category: "crm",
    description: "OAuth backed access to Salesforce leads, contacts, and opportunities.",
    icon: "Salesforce",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Salesforce.com_logo.svg/1200px-Salesforce.com_logo.svg.png",
    oauth: {
      authorizeUrl: "https://login.salesforce.com/services/oauth2/authorize",
      tokenUrl: "https://login.salesforce.com/services/oauth2/token",
      scopes: ["full", "refresh_token"],
      redirectUri: "https://yourapp/callback/salesforce",
    },
    webhookEvents: ["lead.created", "contact.updated"],
    actions: crmActions,
  },
  {
    id: "hubspot",
    name: "HubSpot CRM",
    category: "crm",
    description: "Manage HubSpot contacts, deals, and tickets via OAuth.",
    icon: "HubSpot",
    logoUrl: "https://cdn.simpleicons.org/hubspot/FF7A59",
    oauth: {
      authorizeUrl: "https://app.hubspot.com/oauth/authorize",
      tokenUrl: "https://api.hubapi.com/oauth/v1/token",
      scopes: ["crm.objects.contacts.write", "crm.objects.deals.write"],
      redirectUri: "https://yourapp/callback/hubspot",
    },
    webhookEvents: ["contact.created", "deal.updated"],
    actions: crmActions,
  },
  {
    id: "zendesk",
    name: "Zendesk Support",
    category: "helpdesk",
    description: "Ticket creation and updates for Zendesk.",
    icon: "Zendesk",
    logoUrl: "https://cdn.simpleicons.org/zendesk/03363D",
    oauth: {
      authorizeUrl: "https://{subdomain}.zendesk.com/oauth/authorizations/new",
      tokenUrl: "https://{subdomain}.zendesk.com/oauth/tokens",
      scopes: ["read", "write", "tickets"],
      redirectUri: "https://yourapp/callback/zendesk",
    },
    webhookEvents: ["ticket.created", "ticket.updated"],
    actions: helpdeskActions,
  },
  {
    id: "freshdesk",
    name: "Freshdesk",
    category: "helpdesk",
    description: "Freshdesk tickets, notes, and status tracking.",
    icon: "Freshdesk",
    logoUrl: "https://dam.freshworks.com/m/1d230ee78c07681a/original/headerLogoLight.webp",
    oauth: {
      authorizeUrl: "https://yourdomain.freshdesk.com/oauth/authorize",
      tokenUrl: "https://yourdomain.freshdesk.com/oauth/token",
      scopes: ["tickets.read", "tickets.write"],
      redirectUri: "https://yourapp/callback/freshdesk",
    },
    webhookEvents: ["ticket.created", "ticket.resolved"],
    actions: helpdeskActions,
  },
  {
    id: "intercom",
    name: "Intercom",
    category: "helpdesk",
    description: "Intercom conversation and contact automation.",
    icon: "Intercom",
    logoUrl: "https://cdn.simpleicons.org/intercom/6AFDEF",
    oauth: {
      authorizeUrl: "https://app.intercom.com/oauth",
      tokenUrl: "https://api.intercom.io/auth/eagle/token",
      scopes: ["contacts", "conversations"],
      redirectUri: "https://yourapp/callback/intercom",
    },
    webhookEvents: ["conversation.user.created"],
    actions: helpdeskActions,
  },
  {
    id: "google-calendar",
    name: "Google Calendar",
    category: "calendar",
    description: "Schedule meetings using Google Calendar APIs.",
    icon: "Google",
    logoUrl: "https://ssl.gstatic.com/calendar/images/dynamiclogo_2020q4/calendar_29_2x.png",
    oauth: {
      authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      scopes: ["https://www.googleapis.com/auth/calendar.events"],
      redirectUri: "https://yourapp/callback/google-calendar",
    },
    webhookEvents: ["event.created", "event.updated"],
    actions: calendarActions,
  },
  {
    id: "calendly",
    name: "Calendly",
    category: "calendar",
    description: "Automate event scheduling via Calendly booking flows.",
    icon: "Calendly",
    logoUrl: "https://cdn.simpleicons.org/calendly/006BFF",
    oauth: {
      authorizeUrl: "https://auth.calendly.com/oauth/authorize",
      tokenUrl: "https://auth.calendly.com/oauth/token",
      scopes: ["default"],
      redirectUri: "https://yourapp/callback/calendly",
    },
    webhookEvents: ["invitee.created"],
    actions: calendarActions,
  },
];

export function getIntegrationProvider(id: string): IntegrationProvider | undefined {
  return integrationProviders.find((provider) => provider.id === id);
}

export function listIntegrationProvidersByCategory(
  category: IntegrationProvider["category"]
): IntegrationProvider[] {
  return integrationProviders.filter((provider) => provider.category === category);
}

export { integrationProviders as INTEGRATION_PROVIDERS };

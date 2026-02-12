/**
 * Channel Webhook Parsers Index
 * Factory for creating channel-specific webhook parsers
 */

export * from "./telegram";
export * from "./whatsapp";
export * from "./messenger";
export * from "./slack";
export * from "./teams";
export * from "./sms";

import type { ChannelWebhookParser } from "../senders/types";
import { TelegramWebhookParser } from "./telegram";
import { WhatsAppWebhookParser } from "./whatsapp";
import { MessengerWebhookParser } from "./messenger";
import { SlackWebhookParser } from "./slack";
import { TeamsWebhookParser } from "./teams";
import { SMSWebhookParser } from "./sms";

export type ChannelType =
  | "telegram"
  | "whatsapp"
  | "messenger"
  | "slack"
  | "teams"
  | "sms"
  | "web";

/**
 * Create a webhook parser for a specific channel type
 */
export function createChannelParser(channelType: ChannelType): ChannelWebhookParser {
  switch (channelType) {
    case "telegram":
      return new TelegramWebhookParser();
    case "whatsapp":
      return new WhatsAppWebhookParser();
    case "messenger":
      return new MessengerWebhookParser();
    case "slack":
      return new SlackWebhookParser();
    case "teams":
      return new TeamsWebhookParser();
    case "sms":
      return new SMSWebhookParser();
    case "web":
      // Web channel uses the built-in chat widget, no external webhook
      throw new Error("Web channel does not use external webhook parser");
    default:
      throw new Error(`Unknown channel type: ${channelType}`);
  }
}

/**
 * Check if a channel type has a parser implementation
 */
export function hasParserImplementation(channelType: ChannelType): boolean {
  return ["telegram", "whatsapp", "messenger", "slack", "teams", "sms"].includes(channelType);
}

/**
 * Get list of implemented parser channel types
 */
export function getImplementedParserTypes(): ChannelType[] {
  return ["telegram", "whatsapp", "messenger", "slack", "teams", "sms"];
}

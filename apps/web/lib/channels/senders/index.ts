/**
 * Channel Message Senders Index
 * Factory for creating channel-specific message senders
 */

export * from "./types";
export * from "./telegram";
export * from "./whatsapp";
export * from "./messenger";
export * from "./slack";
export * from "./teams";
export * from "./sms";

import type { ChannelMessageSender, ChannelCredentials, ChannelConfig } from "./types";
import { TelegramSender } from "./telegram";
import { WhatsAppSender } from "./whatsapp";
import { MessengerSender } from "./messenger";
import { SlackSender } from "./slack";
import { TeamsSender } from "./teams";
import { SMSSender } from "./sms";

export type ChannelType =
  | "telegram"
  | "whatsapp"
  | "messenger"
  | "slack"
  | "teams"
  | "sms"
  | "web";

/**
 * Create a message sender for a specific channel type
 */
export function createChannelSender(
  channelType: ChannelType,
  credentials: ChannelCredentials,
  config: ChannelConfig = {}
): ChannelMessageSender {
  switch (channelType) {
    case "telegram":
      return new TelegramSender(credentials, config);
    case "whatsapp":
      return new WhatsAppSender(credentials, config);
    case "messenger":
      return new MessengerSender(credentials, config);
    case "slack":
      return new SlackSender(credentials, config);
    case "teams":
      return new TeamsSender(credentials, config);
    case "sms":
      return new SMSSender(credentials, config);
    case "web":
      // Web channel uses the built-in chat widget, no external API needed
      throw new Error("Web channel does not use external message sender");
    default:
      throw new Error(`Unknown channel type: ${channelType}`);
  }
}

/**
 * Check if a channel type has a sender implementation
 */
export function hasSenderImplementation(channelType: ChannelType): boolean {
  return ["telegram", "whatsapp", "messenger", "slack", "teams", "sms"].includes(channelType);
}

/**
 * Get list of implemented channel types
 */
export function getImplementedChannelTypes(): ChannelType[] {
  return ["telegram", "whatsapp", "messenger", "slack", "teams", "sms"];
}

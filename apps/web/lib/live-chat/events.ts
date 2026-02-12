import type { LiveChatEvent } from "./types";

const getEventTarget = () => {
  if (globalThis.liveChatEventTarget) {
    return globalThis.liveChatEventTarget;
  }
  const target = new EventTarget();
  globalThis.liveChatEventTarget = target;
  return target;
};

export function emitLiveChatEvent(event: LiveChatEvent) {
  const target = getEventTarget();
  target.dispatchEvent(new CustomEvent("live-chat", { detail: event }));
  return event;
}

export function getLiveChatEventTarget() {
  return getEventTarget();
}

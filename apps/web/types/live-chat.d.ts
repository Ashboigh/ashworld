export {};

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }

  var liveChatEventTarget: EventTarget | undefined;
}

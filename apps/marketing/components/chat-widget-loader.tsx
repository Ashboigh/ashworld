"use client";

import { useEffect } from "react";

export function ChatWidgetLoader() {
  useEffect(() => {
    // Set config
    (window as any).chatbotConfig = {
      primaryColor: "#6366f1",
      headerTitle: "ChatBot Pro",
      headerSubtitle: "Ask us anything!",
      autoOpen: false,
      showPoweredBy: true,
    };

    // Load widget script
    const script = document.createElement("script");
    script.src = "http://localhost:3001/api/embed/demo";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      // Cleanup on unmount
      document.body.removeChild(script);
      const container = document.querySelector(".chat-widget-container");
      if (container) container.remove();
      delete (window as any).__chatWidgetLoaded;
      delete (window as any).__chatWidget;
    };
  }, []);

  return null;
}

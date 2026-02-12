import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ChatWidgetLoader } from "@/components/chat-widget-loader";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ChatBot Pro - Enterprise AI Chatbot Platform",
  description:
    "Build, deploy, and scale intelligent AI chatbots for your business. Enterprise-grade conversational AI with knowledge bases, workflows, and seamless integrations.",
  keywords: [
    "chatbot",
    "AI",
    "customer support",
    "automation",
    "enterprise",
    "conversational AI",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${inter.className} flex min-h-screen flex-col`}>
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <ChatWidgetLoader />
      </body>
    </html>
  );
}

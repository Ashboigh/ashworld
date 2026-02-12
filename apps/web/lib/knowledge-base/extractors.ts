import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import { parse } from "node-html-parser";

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer);
  return data.text;
}

export async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

export async function extractTextFromHTML(html: string): Promise<string> {
  const root = parse(html);
  ["script", "style", "nav", "footer", "header", "aside", "noscript"].forEach((selector) =>
    root.querySelectorAll(selector).forEach((node) => node.remove())
  );

  const findMain = () =>
    root.querySelector("main") ??
    root.querySelector("article") ??
    root.querySelector(".content") ??
    root.querySelector("#content");

  const mainContent = findMain();
  const text = (mainContent ?? root).innerText || "";

  return text.replace(/\s+/g, " ").trim();
}

export async function extractTextFromURL(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; KnowledgeBaseBot/1.0)",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/pdf")) {
    const buffer = Buffer.from(await response.arrayBuffer());
    return extractTextFromPDF(buffer);
  }

  const html = await response.text();
  return extractTextFromHTML(html);
}

export function extractTextFromTXT(content: string): string {
  return content;
}

export function extractTextFromMD(content: string): string {
  // Simple markdown to text - remove markdown syntax
  return content
    .replace(/#{1,6}\s+/g, "") // Remove headers
    .replace(/\*\*([^*]+)\*\*/g, "$1") // Remove bold
    .replace(/\*([^*]+)\*/g, "$1") // Remove italic
    .replace(/`([^`]+)`/g, "$1") // Remove inline code
    .replace(/```[\s\S]*?```/g, "") // Remove code blocks
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Remove links
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "") // Remove images
    .replace(/^\s*[-*+]\s+/gm, "") // Remove list markers
    .replace(/^\s*\d+\.\s+/gm, "") // Remove numbered list markers
    .replace(/^\s*>\s+/gm, "") // Remove blockquotes
    .replace(/\n{3,}/g, "\n\n") // Normalize multiple newlines
    .trim();
}

export function extractTextFromCSV(content: string): string {
  // Convert CSV to readable text
  const lines = content.split("\n");
  if (lines.length === 0) return "";

  const headers = lines[0]?.split(",").map(h => h.trim().replace(/"/g, "")) || [];
  const rows = lines.slice(1);

  const textParts: string[] = [];

  for (const row of rows) {
    if (!row.trim()) continue;

    const values = row.split(",").map(v => v.trim().replace(/"/g, ""));
    const rowText = headers
      .map((header, i) => `${header}: ${values[i] || ""}`)
      .join(", ");
    textParts.push(rowText);
  }

  return textParts.join("\n");
}

export async function extractText(
  content: Buffer | string,
  type: string
): Promise<string> {
  switch (type.toLowerCase()) {
    case "pdf":
      if (typeof content === "string") {
        throw new Error("PDF content must be a Buffer");
      }
      return extractTextFromPDF(content);

    case "docx":
      if (typeof content === "string") {
        throw new Error("DOCX content must be a Buffer");
      }
      return extractTextFromDOCX(content);

    case "txt":
      return extractTextFromTXT(typeof content === "string" ? content : content.toString("utf-8"));

    case "md":
      return extractTextFromMD(typeof content === "string" ? content : content.toString("utf-8"));

    case "csv":
      return extractTextFromCSV(typeof content === "string" ? content : content.toString("utf-8"));

    case "url":
      if (typeof content !== "string") {
        throw new Error("URL must be a string");
      }
      return extractTextFromURL(content);

    case "html":
      return extractTextFromHTML(typeof content === "string" ? content : content.toString("utf-8"));

    default:
      throw new Error(`Unsupported document type: ${type}`);
  }
}

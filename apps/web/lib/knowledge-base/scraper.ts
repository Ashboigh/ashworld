import * as http from "node:http";
import * as https from "node:https";
import { URL } from "node:url";
import { parse, HTMLElement } from "node-html-parser";

export interface ScrapeOptions {
  selectors?: string[];
}

export interface ScrapeResult {
  url: string;
  title: string | null;
  text: string;
}

function cleanText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function fetchPage(url: string, headers: Record<string, string>) {
  return new Promise<string>((resolve, reject) => {
    const parsed = new URL(url);
    const fetcher = parsed.protocol === "https:" ? https : http;

    const req = fetcher.get(
      {
        hostname: parsed.hostname,
        port: parsed.port || undefined,
        path: parsed.pathname + parsed.search,
        headers,
        timeout: 10000,
      },
      (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`Failed to fetch ${url}: ${res.statusCode}`));
          res.resume();
          return;
        }

        const data: Buffer[] = [];
        res.on("data", (chunk) => data.push(Buffer.from(chunk)));
        res.on("end", () => resolve(Buffer.concat(data).toString("utf-8")));
      }
    );

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy(new Error("Request timed out"));
    });
  });
}

export async function scrapeUrl(
  url: string,
  options: ScrapeOptions = {}
): Promise<ScrapeResult> {
    const html = await fetchPage(url, {
      "User-Agent": "Mozilla/5.0 (compatible; KnowledgeBaseScraper/1.0)",
    });

    const root = parse(html);

    const title = cleanText(root.querySelector("title")?.text || "");

    const removeSelectors = ["script", "style", "nav", "footer", "header", "aside", "noscript"];
    removeSelectors.forEach((selector) => {
      root.querySelectorAll(selector).forEach((node) => node.remove());
    });

    const selectors = options.selectors?.filter(Boolean) ?? [];

    let content = "";
    if (selectors.length > 0) {
      selectors.forEach((selector) => {
        root.querySelectorAll(selector).forEach((node) => {
          content += " " + node.innerText;
        });
      });
    }

    if (!content.trim()) {
      content =
        root.querySelector("main")?.innerText ||
        root.querySelector("article")?.innerText ||
        root.querySelector("section")?.innerText ||
        root.innerText;
    }

  return {
    url,
    title: title || null,
    text: cleanText(content),
  };
}

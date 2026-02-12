"use client";

import { useState } from "react";
import { Code, Copy, Check } from "lucide-react";
import { Button } from "@repo/ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { generateEmbedCode } from "@/lib/chatbot/types";

interface EmbedCodeDialogProps {
  chatbotId: string;
}

export function EmbedCodeDialog({ chatbotId }: EmbedCodeDialogProps) {
  const [copied, setCopied] = useState(false);

  // In production, this would use the actual domain
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const embedCode = generateEmbedCode(chatbotId, baseUrl);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error("Failed to copy to clipboard");
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Code className="w-4 h-4 mr-2" />
          Get Embed Code
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] overflow-visible">
        <DialogHeader>
          <DialogTitle>Embed Your Chatbot</DialogTitle>
          <DialogDescription>
            Copy and paste this code into your website to add the chat widget
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <pre className="p-4 rounded-lg bg-muted text-sm overflow-x-auto max-w-full">
              <code>{embedCode}</code>
            </pre>
            <Button
              size="sm"
              variant="ghost"
              className="absolute top-2 right-2"
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-1" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-1" />
                  Copy
                </>
              )}
            </Button>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-sm">Installation Instructions</h4>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Copy the code above</li>
              <li>Paste it just before the closing <code className="bg-muted px-1 rounded">&lt;/body&gt;</code> tag on your website</li>
              <li>The chat widget will appear in the bottom-right corner</li>
              <li>Customize the appearance in the Widget settings tab</li>
            </ol>
          </div>

          <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Note:</strong> Make sure the chatbot status is set to &quot;Active&quot;
              for the widget to respond to messages.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

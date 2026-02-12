"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Upload,
  FileText,
  Link as LinkIcon,
  X,
  Loader2,
  Type,
  HelpCircle,
  File,
  FileIcon,
  Globe,
} from "lucide-react";
import { Button, Input, Label } from "@repo/ui";

interface DocumentUploadProps {
  workspaceId: string;
  kbId: string;
}

interface QueuedFile {
  file: File;
  name: string;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
}

type TabType = "text" | "qa" | "file" | "pdf" | "url" | "crawler";

const TABS: { id: TabType; label: string; icon: typeof Type }[] = [
  { id: "text", label: "Input Text", icon: Type },
  { id: "qa", label: "Q&A", icon: HelpCircle },
  { id: "file", label: "Text File", icon: FileText },
  { id: "pdf", label: "PDF", icon: File },
  { id: "url", label: "Single Link", icon: LinkIcon },
  { id: "crawler", label: "Web Crawler", icon: Globe },
];

const FILE_ACCEPT_MAP: Record<string, Record<string, string[]>> = {
  file: {
    "text/plain": [".txt"],
    "text/markdown": [".md"],
    "text/csv": [".csv"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  },
  pdf: {
    "application/pdf": [".pdf"],
  },
};

export function DocumentUpload({ workspaceId, kbId }: DocumentUploadProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("text");
  const [isUploading, setIsUploading] = useState(false);

  // Text input state
  const [textTitle, setTextTitle] = useState("");
  const [textContent, setTextContent] = useState("");

  // Q&A state
  const [qaTitle, setQaTitle] = useState("");
  const [qaPairs, setQaPairs] = useState([{ question: "", answer: "" }]);

  // File upload state
  const [queuedFiles, setQueuedFiles] = useState<QueuedFile[]>([]);

  // URL state
  const [url, setUrl] = useState("");
  const [urlName, setUrlName] = useState("");

  // Crawler state
  const [scrapeList, setScrapeList] = useState("");

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => ({
      file,
      name: file.name,
      status: "pending" as const,
    }));
    setQueuedFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const currentAccept = FILE_ACCEPT_MAP[activeTab] || {
    ...FILE_ACCEPT_MAP.file!,
    ...FILE_ACCEPT_MAP.pdf!,
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: currentAccept,
    maxSize: 50 * 1024 * 1024,
  });

  const removeFile = (index: number) => {
    setQueuedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const addQaPair = () => {
    setQaPairs((prev) => [...prev, { question: "", answer: "" }]);
  };

  const updateQaPair = (index: number, field: "question" | "answer", value: string) => {
    setQaPairs((prev) =>
      prev.map((pair, i) => (i === index ? { ...pair, [field]: value } : pair))
    );
  };

  const removeQaPair = (index: number) => {
    if (qaPairs.length <= 1) return;
    setQaPairs((prev) => prev.filter((_, i) => i !== index));
  };

  const submitText = async () => {
    if (!textContent.trim()) {
      toast.error("Please enter some content");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      const blob = new Blob([textContent], { type: "text/plain" });
      const fileName = (textTitle || "Untitled") + ".txt";
      formData.append("file", blob, fileName);
      formData.append("name", textTitle || "Text Input");

      const response = await fetch(
        `/api/workspaces/${workspaceId}/knowledge-bases/${kbId}/documents`,
        { method: "POST", body: formData }
      );

      if (!response.ok) {
        const result = await response.json();
        toast.error(result.error || "Failed to add text");
        return;
      }

      toast.success("Text added and queued for processing");
      setTextTitle("");
      setTextContent("");
      router.refresh();
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsUploading(false);
    }
  };

  const submitQA = async () => {
    const validPairs = qaPairs.filter((p) => p.question.trim() && p.answer.trim());
    if (validPairs.length === 0) {
      toast.error("Please add at least one Q&A pair");
      return;
    }

    setIsUploading(true);
    try {
      const qaContent = validPairs
        .map((p) => `Q: ${p.question}\nA: ${p.answer}`)
        .join("\n\n");

      const formData = new FormData();
      const blob = new Blob([qaContent], { type: "text/plain" });
      const fileName = (qaTitle || "Q&A") + ".txt";
      formData.append("file", blob, fileName);
      formData.append("name", qaTitle || "Q&A Document");

      const response = await fetch(
        `/api/workspaces/${workspaceId}/knowledge-bases/${kbId}/documents`,
        { method: "POST", body: formData }
      );

      if (!response.ok) {
        const result = await response.json();
        toast.error(result.error || "Failed to add Q&A");
        return;
      }

      toast.success("Q&A added and queued for processing");
      setQaTitle("");
      setQaPairs([{ question: "", answer: "" }]);
      router.refresh();
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsUploading(false);
    }
  };

  const uploadFiles = async () => {
    if (queuedFiles.length === 0) return;

    setIsUploading(true);

    for (let i = 0; i < queuedFiles.length; i++) {
      const queuedFile = queuedFiles[i]!;
      if (queuedFile.status !== "pending") continue;

      setQueuedFiles((prev) =>
        prev.map((f, idx) =>
          idx === i ? { ...f, status: "uploading" } : f
        )
      );

      try {
        const formData = new FormData();
        formData.append("file", queuedFile.file);
        formData.append("name", queuedFile.name);

        const response = await fetch(
          `/api/workspaces/${workspaceId}/knowledge-bases/${kbId}/documents`,
          { method: "POST", body: formData }
        );

        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.error || "Upload failed");
        }

        setQueuedFiles((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, status: "done" } : f
          )
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "Upload failed";
        setQueuedFiles((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, status: "error", error: message } : f
          )
        );
      }
    }

    setIsUploading(false);
    router.refresh();
    toast.success("Documents uploaded and queued for processing");

    setTimeout(() => {
      setQueuedFiles((prev) => prev.filter((f) => f.status !== "done"));
    }, 2000);
  };

  const uploadUrl = async () => {
    if (!url) {
      toast.error("Please enter a URL");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("url", url);
      if (urlName) formData.append("name", urlName);

      const response = await fetch(
        `/api/workspaces/${workspaceId}/knowledge-bases/${kbId}/documents`,
        { method: "POST", body: formData }
      );

      if (!response.ok) {
        const result = await response.json();
        toast.error(result.error || "Failed to add URL");
        return;
      }

      toast.success("URL added and queued for processing");
      setUrl("");
      setUrlName("");
      router.refresh();
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsUploading(false);
    }
  };

  const scrapeUrls = async () => {
    if (!scrapeList.trim()) {
      toast.error("Please enter at least one URL");
      return;
    }

    setIsUploading(true);
    try {
      const urls = scrapeList
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line);

      const response = await fetch(
        `/api/workspaces/${workspaceId}/knowledge-bases/${kbId}/scrape`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ urls }),
        }
      );

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Scrape failed");
      }

      toast.success("Scraping started for provided URLs");
      setScrapeList("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Scrape failed");
    } finally {
      setIsUploading(false);
    }
  };

  const fileLabel = activeTab === "pdf" ? "PDF files only" : "TXT, MD, CSV, DOCX";

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === "text" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="textTitle">Title</Label>
            <Input
              id="textTitle"
              placeholder="Enter a title for this content"
              value={textTitle}
              onChange={(e) => setTextTitle(e.target.value)}
              disabled={isUploading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="textContent">Content</Label>
            <textarea
              id="textContent"
              value={textContent}
              rows={8}
              placeholder="Paste or type your content here..."
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-y"
              onChange={(e) => setTextContent(e.target.value)}
              disabled={isUploading}
            />
          </div>
          <Button onClick={submitText} disabled={isUploading || !textContent.trim()}>
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Add Text
              </>
            )}
          </Button>
        </div>
      )}

      {activeTab === "qa" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="qaTitle">Title</Label>
            <Input
              id="qaTitle"
              placeholder="Enter a title for this Q&A set"
              value={qaTitle}
              onChange={(e) => setQaTitle(e.target.value)}
              disabled={isUploading}
            />
          </div>
          <div className="space-y-3">
            {qaPairs.map((pair, index) => (
              <div key={index} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    Q&A Pair {index + 1}
                  </span>
                  {qaPairs.length > 1 && (
                    <button
                      onClick={() => removeQaPair(index)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <Input
                  placeholder="Question"
                  value={pair.question}
                  onChange={(e) => updateQaPair(index, "question", e.target.value)}
                  disabled={isUploading}
                />
                <textarea
                  placeholder="Answer"
                  value={pair.answer}
                  rows={3}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-y"
                  onChange={(e) => updateQaPair(index, "answer", e.target.value)}
                  disabled={isUploading}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={addQaPair}>
              + Add Q&A Pair
            </Button>
            <Button
              onClick={submitQA}
              disabled={isUploading || qaPairs.every((p) => !p.question.trim() || !p.answer.trim())}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Add Q&A
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {(activeTab === "file" || activeTab === "pdf") && (
        <div className="space-y-4">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50"
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
            {isDragActive ? (
              <p>Drop files here...</p>
            ) : (
              <>
                <p className="mb-2">
                  Drag and drop files here, or click to select
                </p>
                <p className="text-sm text-muted-foreground">
                  {fileLabel} (max 50MB)
                </p>
              </>
            )}
          </div>

          {queuedFiles.length > 0 && (
            <div className="space-y-2">
              {queuedFiles.map((qf, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 border rounded-lg"
                >
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{qf.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(qf.file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  {qf.status === "pending" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                  {qf.status === "uploading" && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {qf.status === "done" && (
                    <span className="text-sm text-green-600">Done</span>
                  )}
                  {qf.status === "error" && (
                    <span className="text-sm text-destructive">{qf.error}</span>
                  )}
                </div>
              ))}

              <Button
                onClick={uploadFiles}
                disabled={
                  isUploading || queuedFiles.every((f) => f.status !== "pending")
                }
                className="w-full"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload{" "}
                    {queuedFiles.filter((f) => f.status === "pending").length}{" "}
                    Files
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}

      {activeTab === "url" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="url">URL</Label>
            <Input
              id="url"
              type="url"
              placeholder="https://example.com/docs/article"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isUploading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="urlName">
              Name{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Input
              id="urlName"
              placeholder="Product Documentation"
              value={urlName}
              onChange={(e) => setUrlName(e.target.value)}
              disabled={isUploading}
            />
          </div>
          <Button onClick={uploadUrl} disabled={isUploading || !url}>
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <LinkIcon className="h-4 w-4 mr-2" />
                Add URL
              </>
            )}
          </Button>
        </div>
      )}

      {activeTab === "crawler" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="scrapeUrls">URLs to crawl (one per line)</Label>
            <textarea
              id="scrapeUrls"
              value={scrapeList}
              rows={6}
              placeholder={"https://example.com/page-1\nhttps://example.com/page-2\nhttps://example.com/page-3"}
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-y font-mono"
              onChange={(event) => setScrapeList(event.target.value)}
              disabled={isUploading}
            />
            <p className="text-xs text-muted-foreground">
              Enter up to 10 URLs. Each page will be scraped and its content extracted.
            </p>
          </div>
          <Button onClick={scrapeUrls} disabled={isUploading || !scrapeList.trim()}>
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Starting crawl...
              </>
            ) : (
              <>
                <Globe className="h-4 w-4 mr-2" />
                Start Crawling
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

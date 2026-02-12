"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  FileText,
  Link as LinkIcon,
  Globe,
  Trash2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Eye,
  X,
  ExternalLink,
  Search,
  ChevronRight,
  MoreVertical,
} from "lucide-react";
import { Button, Input } from "@repo/ui";

interface Document {
  id: string;
  name: string;
  type: string;
  status: string;
  fileSize: number | null;
  sourceUrl: string | null;
  rawContent: string | null;
  errorMessage: string | null;
  processedAt: string | null;
  createdAt: string;
  chunkCount?: number;
}

interface Chunk {
  id: string;
  content: string;
  chunkIndex: number;
  tokenCount: number | null;
}

interface DocumentListProps {
  documents: Document[];
  workspaceId: string;
  kbId: string;
  maxDocuments?: number;
}

const TYPE_BADGES: Record<string, { label: string; className: string }> = {
  html: { label: "Crawler", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  url: { label: "URL", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  pdf: { label: "PDF", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  docx: { label: "DOCX", className: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" },
  txt: { label: "Text", className: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400" },
  md: { label: "Markdown", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  csv: { label: "CSV", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
};

const STATUS_ICONS: Record<string, { icon: typeof Clock; className: string }> = {
  pending: { icon: Clock, className: "text-yellow-500" },
  processing: { icon: Loader2, className: "text-blue-500 animate-spin" },
  completed: { icon: CheckCircle, className: "text-green-500" },
  failed: { icon: XCircle, className: "text-destructive" },
};

export function DocumentList({
  documents,
  workspaceId,
  kbId,
  maxDocuments = 100,
}: DocumentListProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [viewingDoc, setViewingDoc] = useState<{
    doc: Document;
    rawContent: string | null;
    chunks: Chunk[];
    loading: boolean;
  } | null>(null);
  const [viewTab, setViewTab] = useState<"content" | "chunks">("content");

  const filteredDocuments = documents.filter((doc) =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.sourceUrl?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async (docId: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;

    setActionInProgress(docId);
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/knowledge-bases/${kbId}/documents/${docId}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        const result = await response.json();
        toast.error(result.error || "Failed to delete");
        return;
      }

      toast.success("Document deleted");
      router.refresh();
    } catch {
      toast.error("An error occurred");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedDocs.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedDocs.size} documents?`)) return;

    for (const docId of selectedDocs) {
      try {
        await fetch(
          `/api/workspaces/${workspaceId}/knowledge-bases/${kbId}/documents/${docId}`,
          { method: "DELETE" }
        );
      } catch {
        // continue deleting others
      }
    }

    setSelectedDocs(new Set());
    toast.success(`Deleted ${selectedDocs.size} documents`);
    router.refresh();
  };

  const handleReprocess = async (docId: string) => {
    setActionInProgress(docId);
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/knowledge-bases/${kbId}/documents/${docId}`,
        { method: "POST" }
      );

      if (!response.ok) {
        const result = await response.json();
        toast.error(result.error || "Failed to reprocess");
        return;
      }

      toast.success("Document queued for reprocessing");
      router.refresh();
    } catch {
      toast.error("An error occurred");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleViewContent = async (doc: Document) => {
    setViewingDoc({ doc, rawContent: null, chunks: [], loading: true });
    setViewTab("content");

    try {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/knowledge-bases/${kbId}/documents/${doc.id}?chunks=true`
      );

      if (!response.ok) {
        toast.error("Failed to load document content");
        setViewingDoc(null);
        return;
      }

      const data = await response.json();
      setViewingDoc({
        doc,
        rawContent: data.rawContent || null,
        chunks: data.chunks || [],
        loading: false,
      });
    } catch {
      toast.error("Failed to load document content");
      setViewingDoc(null);
    }
  };

  const toggleSelectAll = () => {
    if (selectedDocs.size === filteredDocuments.length) {
      setSelectedDocs(new Set());
    } else {
      setSelectedDocs(new Set(filteredDocuments.map((d) => d.id)));
    }
  };

  const toggleSelect = (docId: string) => {
    const next = new Set(selectedDocs);
    if (next.has(docId)) {
      next.delete(docId);
    } else {
      next.add(docId);
    }
    setSelectedDocs(next);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getContentPreview = (doc: Document) => {
    if (doc.rawContent) {
      return doc.rawContent.substring(0, 200).trim() + (doc.rawContent.length > 200 ? "..." : "");
    }
    if (doc.sourceUrl) {
      return doc.sourceUrl;
    }
    return "No content available";
  };

  // Usage meter
  const usagePercent = Math.min((documents.length / maxDocuments) * 100, 100);

  if (documents.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg bg-muted/50">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground font-medium">No documents yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Upload files, add URLs, or scrape websites to get started.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Usage Meter */}
      <div className="mb-4 p-4 border rounded-lg bg-muted/30">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Knowledge Base Usage</span>
          <span className="text-sm text-muted-foreground">
            {documents.length}/{maxDocuments} entries
          </span>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              usagePercent > 90 ? "bg-destructive" : usagePercent > 70 ? "bg-yellow-500" : "bg-primary"
            }`}
            style={{ width: `${usagePercent}%` }}
          />
        </div>
      </div>

      {/* Search & Actions Bar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title or URL..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        {selectedDocs.size > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBulkDelete}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete ({selectedDocs.size})
          </Button>
        )}
      </div>

      {/* Select All */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <input
          type="checkbox"
          checked={selectedDocs.size === filteredDocuments.length && filteredDocuments.length > 0}
          onChange={toggleSelectAll}
          className="h-4 w-4 rounded border-muted-foreground/30"
        />
        <span className="text-sm text-muted-foreground">
          Select All ({filteredDocuments.length} entries)
        </span>
      </div>

      {/* Document Cards */}
      <div className="space-y-3">
        {filteredDocuments.map((doc) => {
          const badge = TYPE_BADGES[doc.type] || TYPE_BADGES.txt!;
          const statusInfo = STATUS_ICONS[doc.status] || STATUS_ICONS.pending!;
          const StatusIcon = statusInfo.icon;
          const isSelected = selectedDocs.has(doc.id);
          const preview = getContentPreview(doc);

          return (
            <div
              key={doc.id}
              className={`border rounded-lg p-4 transition-colors hover:bg-muted/30 ${
                isSelected ? "border-primary bg-primary/5" : ""
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelect(doc.id)}
                  className="h-4 w-4 mt-1 rounded border-muted-foreground/30"
                />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Title Row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium text-sm truncate max-w-md">
                      {doc.sourceUrl || doc.name}
                    </h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.className}`}>
                      {badge.label}
                    </span>
                    <StatusIcon className={`h-4 w-4 ${statusInfo.className}`} />
                  </div>

                  {/* Meta Row */}
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>{formatDate(doc.createdAt)}</span>
                    {doc.fileSize && (
                      <span>{(doc.fileSize / 1024).toFixed(1)} KB</span>
                    )}
                    {doc.chunkCount !== undefined && doc.status === "completed" && (
                      <span>{doc.chunkCount} chunks</span>
                    )}
                    {doc.status === "failed" && doc.errorMessage && (
                      <span className="text-destructive">{doc.errorMessage}</span>
                    )}
                  </div>

                  {/* Content Preview */}
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                    {preview}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {(doc.status === "completed" || doc.status === "failed") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                      onClick={() => handleReprocess(doc.id)}
                      disabled={actionInProgress === doc.id}
                      title="Reprocess"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(doc.id)}
                    disabled={actionInProgress === doc.id}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  {doc.status === "completed" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1"
                      onClick={() => handleViewContent(doc)}
                    >
                      View Details
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredDocuments.length === 0 && searchQuery && (
        <div className="text-center py-8 text-muted-foreground">
          <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No documents match "{searchQuery}"</p>
        </div>
      )}

      {/* Document Content Viewer Modal */}
      {viewingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col mx-4">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold truncate">{viewingDoc.doc.name}</h3>
                {viewingDoc.doc.sourceUrl && (
                  <a
                    href={viewingDoc.doc.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground hover:underline flex items-center gap-1 mt-0.5"
                  >
                    {viewingDoc.doc.sourceUrl}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 ml-2"
                onClick={() => setViewingDoc(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Tabs */}
            <div className="flex border-b px-4">
              <button
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  viewTab === "content"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setViewTab("content")}
              >
                Raw Content
              </button>
              <button
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  viewTab === "chunks"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setViewTab("chunks")}
              >
                Chunks ({viewingDoc.chunks.length})
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {viewingDoc.loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : viewTab === "content" ? (
                viewingDoc.rawContent ? (
                  <pre className="text-sm whitespace-pre-wrap font-mono bg-muted/50 p-4 rounded-lg leading-relaxed">
                    {viewingDoc.rawContent}
                  </pre>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No raw content available for this document.
                  </p>
                )
              ) : viewingDoc.chunks.length > 0 ? (
                <div className="space-y-3">
                  {viewingDoc.chunks.map((chunk) => (
                    <div key={chunk.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">
                          Chunk {chunk.chunkIndex + 1}
                        </span>
                        {chunk.tokenCount && (
                          <span className="text-xs text-muted-foreground">
                            {chunk.tokenCount} tokens
                          </span>
                        )}
                      </div>
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">
                        {chunk.content}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No chunks available. The document may not have been processed yet.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

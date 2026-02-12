"use client";

import Link from "next/link";
import { Database, FileText, MoreVertical, Trash2 } from "lucide-react";
import { Button } from "@repo/ui";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface KnowledgeBase {
  id: string;
  name: string;
  description: string | null;
  embeddingModel: string;
  documentCount: number;
  createdAt: string;
}

interface KBListProps {
  knowledgeBases: KnowledgeBase[];
  workspaceId: string;
  orgSlug: string;
}

export function KBList({ knowledgeBases, workspaceId, orgSlug }: KBListProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this knowledge base? All documents and data will be permanently removed.")) {
      return;
    }

    setDeletingId(id);
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/knowledge-bases/${id}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        const result = await response.json();
        toast.error(result.error || "Failed to delete");
        return;
      }

      toast.success("Knowledge base deleted");
      router.refresh();
    } catch {
      toast.error("An error occurred");
    } finally {
      setDeletingId(null);
      setMenuOpen(null);
    }
  };

  if (knowledgeBases.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg bg-muted/50">
        <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">No knowledge bases yet</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Create a knowledge base to store and search your documents
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {knowledgeBases.map((kb) => (
        <div
          key={kb.id}
          className="relative border rounded-lg p-4 hover:border-primary/50 transition-colors"
        >
          <Link
            href={`/${orgSlug}/knowledge-bases/${kb.id}`}
            className="block"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Database className="h-5 w-5 text-primary" />
              </div>
            </div>
            <h3 className="font-medium mb-1 truncate">{kb.name}</h3>
            {kb.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                {kb.description}
              </p>
            )}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                <span>{kb.documentCount} documents</span>
              </div>
            </div>
          </Link>

          <div className="absolute top-4 right-4">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={(e) => {
                e.preventDefault();
                setMenuOpen(menuOpen === kb.id ? null : kb.id);
              }}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>

            {menuOpen === kb.id && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMenuOpen(null)}
                />
                <div className="absolute right-0 top-8 z-20 w-40 rounded-md border bg-background shadow-lg">
                  <button
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-muted"
                    onClick={() => handleDelete(kb.id)}
                    disabled={deletingId === kb.id}
                  >
                    <Trash2 className="h-4 w-4" />
                    {deletingId === kb.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

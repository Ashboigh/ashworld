"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from "@repo/ui";
import { Textarea } from "@/components/ui/textarea";

interface ResponseRow {
  id: string;
  title: string;
  content: string;
  shortcut: string | null;
  category: string | null;
}

interface CannedResponsesPanelProps {
  organizationId: string;
}

export function CannedResponsesPanel({ organizationId }: CannedResponsesPanelProps) {
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState({
    title: "",
    content: "",
    shortcut: "",
    category: "",
  });
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  const fetchResponses = useCallback(async () => {
    try {
      const response = await fetch(`/api/live-chat/canned-responses?orgId=${organizationId}`);
      const data = await response.json();
      if (response.ok) {
        setResponses(data.responses);
      } else {
        toast.error(data.error || "Failed to load responses");
      }
    } catch (error) {
      console.error("Canned responses fetch", error);
      toast.error("Failed to load responses");
    }
  }, [organizationId]);

  useEffect(() => {
    fetchResponses();
  }, [fetchResponses]);

  const categories = useMemo(
    () =>
      Array.from(
        new Set(responses.map((response) => response.category).filter(Boolean))
      ) as string[],
    [responses]
  );

  const filteredResponses = useMemo(() => {
    return responses.filter((response) => {
      const matchesSearch =
        search.length === 0 ||
        response.title.toLowerCase().includes(search.toLowerCase()) ||
        response.content.toLowerCase().includes(search.toLowerCase()) ||
        (response.shortcut ?? "").toLowerCase().includes(search.toLowerCase());
      const matchesCategory =
        filterCategory.length === 0 ||
        (response.category ?? "")
          .toLowerCase()
          .includes(filterCategory.toLowerCase());
      return matchesSearch && matchesCategory;
    });
  }, [responses, search, filterCategory]);

  const handleCreate = async () => {
    if (!form.title || !form.content) {
      toast.error("Title and content are required");
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch(`/api/live-chat/canned-responses?orgId=${organizationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          content: form.content,
          shortcut: form.shortcut || undefined,
          category: form.category || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to create response");
      }
      toast.success("Canned response saved");
      setForm({ title: "", content: "", shortcut: "", category: "" });
      await fetchResponses();
    } catch (error) {
      console.error("Create canned response", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create response"
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success("Copied canned response");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Canned responses</CardTitle>
        <CardDescription>
          Save common replies so you can reuse them during handoffs.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">
              Search
            </label>
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Quickly search title, shortcut, or content"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">
              Filter by category
            </label>
            <Input
              value={filterCategory}
              onChange={(event) => setFilterCategory(event.target.value)}
              placeholder="e.g. onboarding"
            />
          </div>
        </div>
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {["", ...categories].map((category) => (
              <button
                key={category || "all"}
                type="button"
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  filterCategory.toLowerCase() === category.toLowerCase()
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground"
                }`}
                onClick={() => setFilterCategory(category)}
              >
                {category ? category : "All categories"}
              </button>
            ))}
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Title</label>
            <Input
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Shortcut</label>
            <Input
              value={form.shortcut}
              onChange={(event) => setForm((prev) => ({ ...prev, shortcut: event.target.value }))}
              placeholder="e.g. onboarding"
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs uppercase tracking-wider text-muted-foreground">Category</label>
          <Input
            value={form.category}
            onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs uppercase tracking-wider text-muted-foreground">Content</label>
          <Textarea
            value={form.content}
            onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
          />
        </div>
        <div className="flex justify-end">
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? "Saving…" : "Save response"}
          </Button>
        </div>
        <div className="space-y-2">
          {filteredResponses.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No canned responses match the current search.
            </p>
          )}
          {filteredResponses.map((response) => (
            <div
              key={response.id}
              className="rounded-md border border-border bg-muted/20 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">{response.title}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(response.content)}
                >
                  Copy
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {response.category || "General"} • Shortcut: {response.shortcut || "—"}
              </p>
              <p className="mt-2 text-sm">{response.content}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

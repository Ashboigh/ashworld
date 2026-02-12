"use client";

import { useState } from "react";
import { Search, FileText, Loader2 } from "lucide-react";
import { Button, Input, Label } from "@repo/ui";

interface SearchResult {
  id: string;
  content: string;
  score: number;
  documentId: string;
  documentName: string;
  chunkIndex: number;
}

interface SearchTestProps {
  workspaceId: string;
  kbId: string;
}

export function SearchTest({ workspaceId, kbId }: SearchTestProps) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"vector" | "hybrid">("vector");
  const [limit, setLimit] = useState(5);
  const [threshold, setThreshold] = useState(0.7);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/knowledge-bases/${kbId}/search`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query,
            mode,
            limit,
            threshold,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Search failed");
        return;
      }

      setResults(data.results);
    } catch {
      setError("An error occurred");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <Label htmlFor="search-query" className="sr-only">
              Search query
            </Label>
            <Input
              id="search-query"
              placeholder="Ask a question..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          <Button onClick={handleSearch} disabled={isSearching || !query.trim()}>
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Label htmlFor="mode">Mode:</Label>
            <select
              id="mode"
              className="h-8 px-2 rounded-md border border-input bg-background text-sm"
              value={mode}
              onChange={(e) => setMode(e.target.value as "vector" | "hybrid")}
            >
              <option value="vector">Vector</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Label htmlFor="limit">Results:</Label>
            <Input
              id="limit"
              type="number"
              min={1}
              max={20}
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="w-16 h-8"
            />
          </div>

          <div className="flex items-center gap-2">
            <Label htmlFor="threshold">Threshold:</Label>
            <Input
              id="threshold"
              type="number"
              min={0}
              max={1}
              step={0.1}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-20 h-8"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-medium">Results ({results.length})</h3>
          <div className="space-y-3">
            {results.map((result, index) => (
              <div key={result.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <span>{result.documentName}</span>
                    <span className="text-xs">
                      (Chunk {result.chunkIndex + 1})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      #{index + 1}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        result.score >= 0.9
                          ? "bg-green-100 text-green-700"
                          : result.score >= 0.8
                          ? "bg-blue-100 text-blue-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {(result.score * 100).toFixed(1)}% match
                    </span>
                  </div>
                </div>
                <p className="text-sm whitespace-pre-wrap">{result.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isSearching && results.length === 0 && query && !error && (
        <div className="text-center py-8 text-muted-foreground">
          <Search className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p>No results found. Try a different query.</p>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from "@repo/ui";
import { toast } from "sonner";

export interface AuditLogRow {
  id: string;
  createdAt: string;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  user: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
  } | null;
}

interface AuditLogsPanelProps {
  organizationId: string;
  canExport: boolean;
}

export function AuditLogsPanel({ organizationId, canExport }: AuditLogsPanelProps) {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    action: "",
    resourceType: "",
    userId: "",
    startDate: "",
    endDate: "",
    page: 1,
  });
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const controller = new AbortController();
    async function loadLogs() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", String(filters.page));
        params.set("limit", "20");
        if (filters.action) params.set("action", filters.action);
        if (filters.resourceType) params.set("resourceType", filters.resourceType);
        if (filters.userId) params.set("userId", filters.userId);
        if (filters.startDate) params.set("startDate", filters.startDate);
        if (filters.endDate) params.set("endDate", filters.endDate);

        const response = await fetch(
          `/api/organizations/${organizationId}/audit-logs?${params.toString()}`,
          { signal: controller.signal }
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load logs");
        }

        setLogs(data.logs);
        setTotalPages(data.pagination.totalPages);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error("Audit logs error", error);
        toast.error(
          error instanceof Error ? error.message : "Failed to load audit logs"
        );
      } finally {
        setLoading(false);
      }
    }

    loadLogs();
    return () => controller.abort();
  }, [filters, organizationId]);

  const handleExport = async (format: "csv" | "json") => {
    if (!canExport) return;
    try {
      const params = new URLSearchParams();
      params.set("format", format);
      if (filters.startDate) params.set("startDate", filters.startDate);
      if (filters.endDate) params.set("endDate", filters.endDate);

      const response = await fetch(
        `/api/organizations/${organizationId}/audit-logs/export?${params.toString()}`
      );

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || "Failed to export logs");
        return;
      }

      if (format === "json") {
        const json = await response.json();
        const blob = new Blob([JSON.stringify(json.logs, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `audit-logs-${new Date().toISOString().split("T")[0]}.json`;
        anchor.click();
        URL.revokeObjectURL(url);
        toast.success("Download started");
        return;
      }

      const csv = await response.text();
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success("Download started");
    } catch (error) {
      console.error("Export audit logs error", error);
      toast.error("Failed to export logs");
    }
  };

  const paginationControls = useMemo(() => {
    if (totalPages <= 1) return null;
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={filters.page === 1}
          onClick={() =>
            setFilters((prev) => ({
              ...prev,
              page: Math.max(1, prev.page - 1),
            }))
          }
        >
          Previous
        </Button>
        <span className="text-sm">
          Page {filters.page} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={filters.page >= totalPages}
          onClick={() =>
            setFilters((prev) => ({
              ...prev,
              page: Math.min(totalPages, prev.page + 1),
            }))
          }
        >
          Next
        </Button>
      </div>
    );
  }, [filters.page, totalPages]);

  return (
    <Card className="space-y-4">
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>Audit logs</CardTitle>
          <CardDescription>
            Track login, configuration, and policy changes for compliance.
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport("csv")}
            disabled={!canExport}
          >
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport("json")}
            disabled={!canExport}
          >
            Export JSON
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <Input
            value={filters.action}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, action: event.target.value, page: 1 }))
            }
            placeholder="Action"
          />
          <Input
            value={filters.resourceType}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, resourceType: event.target.value, page: 1 }))
            }
            placeholder="Resource type"
          />
          <Input
            value={filters.userId}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, userId: event.target.value, page: 1 }))
            }
            placeholder="User ID"
          />
          <Input
            type="date"
            value={filters.startDate}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, startDate: event.target.value, page: 1 }))
            }
          />
          <Input
            type="date"
            value={filters.endDate}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, endDate: event.target.value, page: 1 }))
            }
          />
        </div>

        {paginationControls}

        {loading && (
          <p className="text-sm text-muted-foreground">Loading logs…</p>
        )}

        {!loading && logs.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No matching logs found.
          </p>
        )}

        <div className="space-y-3">
          {logs.map((log) => (
            <div
              key={log.id}
              className="rounded-md border border-border bg-background/50 p-4 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{log.action}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(log.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <p>Resource: {log.resourceType || "n/a"}</p>
                <p>ID: {log.resourceId || "n/a"}</p>
                <p>User: {log.user?.email || "system"}</p>
                <p>IP: {log.ipAddress || "n/a"}</p>
              </div>
              {log.newValues && (
                <pre className="mt-2 whitespace-pre-wrap rounded bg-muted/60 p-2 text-xs">
                  {JSON.stringify(log.newValues, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AnalyticsMetrics } from "@/lib/analytics/types";

interface AnalyticsDashboardProps {
  organizationId: string;
}

interface MetricsResponse {
  metrics: AnalyticsMetrics;
  meta: {
    chatbots: Array<{ id: string; name: string; workspaceId: string }>;
    channels: Array<{ id: string; name: string | null; type: string }>;
  };
  range: {
    from: string;
    to: string;
  };
}

export function AnalyticsDashboard({ organizationId }: AnalyticsDashboardProps) {
  const now = new Date();
  const defaultFrom = new Date(now);
  defaultFrom.setDate(defaultFrom.getDate() - 30);
  const [filters, setFilters] = useState({
    from: defaultFrom.toISOString().split("T")[0],
    to: now.toISOString().split("T")[0],
    chatbotId: "",
    channelId: "",
  });
  const [data, setData] = useState<MetricsResponse | null>(null);
  const [reports, setReports] = useState<
    Array<{ id: string; name: string; cadence: string; format: string; nextRunAt: string }>
  >([]);
  const [scheduleName, setScheduleName] = useState("");
  const [cadence, setCadence] = useState<"hourly" | "daily" | "weekly" | "monthly">("daily");
  const [format, setFormat] = useState<"json" | "csv">("json");
  const [isScheduling, setIsScheduling] = useState(false);

  const fetchMetrics = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set("organizationId", organizationId);
      if (filters.from) params.set("from", filters.from);
      if (filters.to) params.set("to", filters.to);

      if (filters.chatbotId) {
        params.set("chatbotId", filters.chatbotId);
      }

      if (filters.channelId) {
        params.set("channelId", filters.channelId);
      }

      const response = await fetch(`/api/analytics/metrics?${params.toString()}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to load analytics");
      }

      const json: MetricsResponse = await response.json();
      setData(json);
    } catch (error) {
      console.error("Analytics fetch error:", error);
      toast.error(error instanceof Error ? error.message : "Unable to load analytics");
    }
  }, [filters, organizationId]);

  const fetchReports = useCallback(async () => {
    try {
      const response = await fetch(`/api/analytics/reports?organizationId=${organizationId}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to load reports");
      }
      const data = await response.json();
      setReports(data.schedules ?? []);
    } catch (error) {
      console.error("Report fetch error:", error);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleExport = (exportFormat: "json" | "csv") => {
    const params = new URLSearchParams();
    params.set("organizationId", organizationId);
    params.set("format", exportFormat);
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    if (filters.chatbotId) params.set("chatbotId", filters.chatbotId);
    if (filters.channelId) params.set("channelId", filters.channelId);
    window.open(`/api/analytics/export?${params.toString()}`, "_blank");
  };

  const channelBreakdown = useMemo(() => {
    return data?.metrics.channelBreakdown ?? [];
  }, [data]);

  const maxTrendValue = useMemo(() => {
    if (!data) return 0;
    return Math.max(...data.metrics.trends.map((entry) => entry.conversations));
  }, [data]);

  const topQueries = data?.metrics.knowledgeBase.topQueries ?? [];
  const topDocuments = data?.metrics.knowledgeBase.topDocuments ?? [];

  const submitSchedule = async () => {
    if (!scheduleName.trim()) {
      toast.error("Give the report a name");
      return;
    }

    setIsScheduling(true);
    try {
      const filtersPayload = {
        from: filters.from,
        to: filters.to,
        chatbotId: filters.chatbotId || undefined,
        channelId: filters.channelId || undefined,
      };

      const response = await fetch("/api/analytics/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          name: scheduleName.trim(),
          cadence,
          format,
          filters: filtersPayload,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to schedule report");
      }

      toast.success("Report scheduled");
      setScheduleName("");
      fetchReports();
    } catch (error) {
      console.error("Schedule error:", error);
      toast.error(error instanceof Error ? error.message : "Unable to schedule report");
    } finally {
      setIsScheduling(false);
    }
  };

  const metrics = data?.metrics;

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-4">
        <Card className="border-border bg-background/60">
          <CardHeader>
            <CardTitle>Total conversations</CardTitle>
            <CardDescription>{filters.from} — {filters.to}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{metrics?.totalConversations ?? "—"}</p>
            <p className="text-xs text-muted-foreground mt-1">Started within the selected window</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-background/60">
          <CardHeader>
            <CardTitle>Total messages</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{metrics?.totalMessages ?? "—"}</p>
            <p className="text-xs text-muted-foreground mt-1">User + assistant responses</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-background/60">
          <CardHeader>
            <CardTitle>Self-service rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {metrics ? `${Math.round(metrics.selfServiceRate * 100)}%` : "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Closed without handoff</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-background/60">
          <CardHeader>
            <CardTitle>Feedback score</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {metrics?.feedback.averageRating ? metrics.feedback.averageRating.toFixed(1) : "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics?.feedback.totalRatings ?? 0} ratings received
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            type="date"
            value={filters.from}
            onChange={(event) => setFilters((prev) => ({ ...prev, from: event.target.value }))}
          />
          <Input
            type="date"
            value={filters.to}
            onChange={(event) => setFilters((prev) => ({ ...prev, to: event.target.value }))}
          />
          <Select
            value={filters.chatbotId || undefined}
            onValueChange={(value) => setFilters((prev) => ({ ...prev, chatbotId: value ?? "" }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Filter by chatbot" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All chatbots</SelectItem>
              {data?.meta.chatbots.map((bot) => (
                <SelectItem key={bot.id} value={bot.id}>
                  {bot.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.channelId || undefined}
            onValueChange={(value) => setFilters((prev) => ({ ...prev, channelId: value ?? "" }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Filter by channel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All channels</SelectItem>
              {data?.meta.channels.map((channel) => (
                <SelectItem key={channel.id} value={channel.id}>
                  {channel.name ?? channel.type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="secondary" size="sm" type="button" onClick={() => handleExport("json")}>
            Export JSON
          </Button>
          <Button variant="secondary" size="sm" type="button" onClick={() => handleExport("csv")}>
            Export CSV
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <Card>
          <CardHeader>
            <CardTitle>Conversation trends</CardTitle>
            <CardDescription>Daily counts for conversations and messages</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data?.metrics.trends.length ? (
              data.metrics.trends.map((entry) => {
                const width = maxTrendValue ? (entry.conversations / maxTrendValue) * 100 : 0;
                return (
                  <div key={entry.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span>{entry.label}</span>
                      <span>{entry.conversations} conv · {entry.messages} msgs</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-primary"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">No data yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Channel breakdown</CardTitle>
            <CardDescription>Where conversations originate</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {channelBreakdown.map((item) => (
                <li key={item.channelId}>
                  <div className="flex items-center justify-between">
                    <span>{item.channelId ?? "widget"}</span>
                    <span className="font-semibold">{item.count}</span>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Knowledge base insights</CardTitle>
            <CardDescription>Search volume, failed queries, top results</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm">
              Total searches: {data?.metrics.knowledgeBase.totalSearches ?? 0}
              <br />
              Failed searches: {data?.metrics.knowledgeBase.failedSearches ?? 0}
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Top queries</p>
              <ul className="space-y-2 text-sm">
                {topQueries.length ? (
                  topQueries.map((entry) => (
                    <li key={entry.query} className="flex justify-between">
                      <span>{entry.query}</span>
                      <span className="text-xs text-muted-foreground">{entry.count}</span>
                    </li>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">No queries yet</p>
                )}
              </ul>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Top documents</p>
              <ul className="space-y-2 text-sm">
                {topDocuments.length ? (
                  topDocuments.map((doc) => (
                    <li key={doc.documentName} className="flex justify-between">
                      <span>{doc.documentName}</span>
                      <span className="text-xs text-muted-foreground">{doc.count}</span>
                    </li>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">No documents surfaced yet</p>
                )}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Scheduled reports</CardTitle>
            <CardDescription>Create recurring exports for your team</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2 text-xs text-muted-foreground">
              <label className="block text-xs font-semibold">Report name</label>
              <Input value={scheduleName} onChange={(event) => setScheduleName(event.target.value)} />
            </div>
            <div className="flex gap-2">
              <Select value={cadence} onValueChange={(value) => setCadence(value as typeof cadence)}>
                <SelectTrigger>
                  <SelectValue placeholder="Cadence" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
              <Select value={format} onValueChange={(value) => setFormat(value as typeof format)}>
                <SelectTrigger>
                  <SelectValue placeholder="Format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="secondary"
              onClick={submitSchedule}
              disabled={isScheduling || !scheduleName.trim()}
            >
              {isScheduling ? "Scheduling…" : "Create schedule"}
            </Button>
            <div className="space-y-2 text-sm">
              {reports.length ? (
                reports.map((report) => (
                  <div key={report.id as string} className="rounded-md border px-3 py-2">
                    <p className="text-sm font-semibold">{report.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {report.cadence} · {report.format} · Next run{" "}
                      {new Date(report.nextRunAt as string).toLocaleString()}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">No schedules yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

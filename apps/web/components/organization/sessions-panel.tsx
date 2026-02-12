"use client";

import { useState } from "react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui";
import { toast } from "sonner";

export interface SessionRow {
  id: string;
  userId: string;
  userEmail: string | null;
  userName: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  deviceInfo: string | null;
  lastActiveAt: string;
  createdAt: string;
}

interface SessionsPanelProps {
  organizationId: string;
  canManage: boolean;
  initialSessions: SessionRow[];
}

export function SessionsPanel({
  organizationId,
  canManage,
  initialSessions,
}: SessionsPanelProps) {
  const [sessions, setSessions] = useState(initialSessions);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);

  const revokeSession = async (sessionId: string) => {
    if (!canManage) return;
    setRevokingId(sessionId);
    try {
      const response = await fetch(
        `/api/organizations/${organizationId}/sessions/${sessionId}`,
        {
          method: "DELETE",
        }
      );
      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || "Failed to revoke session");
        return;
      }
      setSessions((prev) => prev.filter((session) => session.id !== sessionId));
      toast.success("Session revoked");
    } catch (error) {
      console.error("Revoke session error", error);
      toast.error("Failed to revoke session");
    } finally {
      setRevokingId(null);
    }
  };

  const revokeAll = async () => {
    if (!canManage) return;
    setRevokingAll(true);
    try {
      const response = await fetch(
        `/api/organizations/${organizationId}/sessions`,
        {
          method: "DELETE",
        }
      );
      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || "Failed to revoke sessions");
        return;
      }
      setSessions([]);
      toast.success("All sessions revoked except yours");
    } catch (error) {
      console.error("Revoke all sessions error", error);
      toast.error("Failed to revoke sessions");
    } finally {
      setRevokingAll(false);
    }
  };

  return (
    <Card className="space-y-4">
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>Active sessions</CardTitle>
          <CardDescription>
            See every device your team is signed in from and revoke access instantly.
          </CardDescription>
        </div>
        <Button
          variant="outline"
          onClick={revokeAll}
          disabled={!canManage || revokingAll}
        >
          {revokingAll ? "Revoking…" : "Revoke all sessions"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {sessions.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No active sessions found.
          </p>
        )}
        <div className="space-y-3">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="grid gap-3 rounded-md border border-border bg-background/50 p-4 md:grid-cols-2"
            >
              <div className="space-y-1 text-sm">
                <p className="font-semibold">
                  {session.userName || session.userEmail || "Unknown user"}
                </p>
                <p className="text-xs text-muted-foreground">
                  User ID: {session.userId}
                </p>
                <p className="text-xs text-muted-foreground">
                  IP: {session.ipAddress || "unknown"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Device: {session.deviceInfo || session.userAgent || "n/a"}
                </p>
              </div>
              <div className="space-y-1 text-sm">
                <p>
                  Last active:{" "}
                  {new Date(session.lastActiveAt).toLocaleString()}
                </p>
                <p>
                  Issued at: {new Date(session.createdAt).toLocaleString()}
                </p>
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => revokeSession(session.id)}
                    disabled={!canManage || revokingId === session.id}
                  >
                    {revokingId === session.id ? "Revoking…" : "Revoke"}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

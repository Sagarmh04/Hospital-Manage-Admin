"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Loader2, Monitor, Smartphone, Tablet } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Session {
  id: string;
  createdAt: string;
  expiresAt: string;
  lastActivityAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  browser: string | null;
  os: string | null;
  deviceType: string | null;
  revoked: boolean;
  isCurrent: boolean;
}

export function DevicesSection() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, []);

  async function fetchSessions() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/user/sessions");
      
      if (!res.ok) {
        throw new Error("Failed to fetch sessions");
      }

      const data = await res.json();
      setSessions(data.sessions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  }

  async function revokeSession(sessionId: string) {
    if (!confirm("Are you sure you want to revoke this session?")) {
      return;
    }

    try {
      setRevoking(sessionId);
      const res = await fetch(`/api/auth/session/${sessionId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to revoke session");
      }

      await fetchSessions();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to revoke session");
    } finally {
      setRevoking(null);
    }
  }

  async function revokeAllSessions() {
    if (!confirm("⚠️ This will log you out from ALL devices. Continue?")) {
      return;
    }

    try {
      setRevokingAll(true);
      const res = await fetch("/api/auth/logout-all", {
        method: "POST",
      });

      const data = await res.json();

      if (res.ok) {
        alert(data.message || "Logged out from all devices");
        window.location.href = "/login";
      } else {
        throw new Error(data.error || "Failed to logout");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to logout");
      setRevokingAll(false);
    }
  }

  function getDeviceIcon(deviceType: string | null) {
    switch (deviceType) {
      case "mobile":
        return <Smartphone className="h-5 w-5" />;
      case "tablet":
        return <Tablet className="h-5 w-5" />;
      default:
        return <Monitor className="h-5 w-5" />;
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString();
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active Devices</CardTitle>
          <CardDescription>Manage your active sessions</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active Devices</CardTitle>
          <CardDescription>Manage your active sessions</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={fetchSessions} variant="outline" className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const activeSessions = sessions.filter(s => !s.revoked);

  return (
    <Card id="devices">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Active Devices</CardTitle>
            <CardDescription>
              You have {activeSessions.length} active session{activeSessions.length !== 1 ? 's' : ''}
            </CardDescription>
          </div>
          {activeSessions.length > 1 && (
            <Button
              onClick={revokeAllSessions}
              disabled={revokingAll}
              variant="destructive"
              size="sm"
            >
              {revokingAll ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging out...
                </>
              ) : (
                "Logout All Devices"
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activeSessions.length === 0 ? (
            <p className="text-sm text-slate-500 py-4">No active sessions found.</p>
          ) : (
            activeSessions.map((session) => (
              <div
                key={session.id}
                className="flex items-start gap-4 p-4 border border-slate-200 rounded-lg"
              >
                <div className="mt-1 text-slate-600">
                  {getDeviceIcon(session.deviceType)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-slate-900">
                      {session.browser || "Unknown Browser"}
                    </p>
                    {session.isCurrent && (
                      <Badge variant="secondary" className="text-xs">
                        Current Device
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 mb-1">
                    {session.os || "Unknown OS"} • {session.deviceType || "desktop"}
                  </p>
                  {session.ipAddress && (
                    <p className="text-sm text-slate-500">IP: {session.ipAddress}</p>
                  )}
                  <p className="text-xs text-slate-500 mt-2">
                    Last active: {formatDate(session.lastActivityAt)}
                  </p>
                </div>
                <Button
                  onClick={() => revokeSession(session.id)}
                  disabled={revoking === session.id}
                  variant="outline"
                  size="sm"
                >
                  {revoking === session.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Revoke"
                  )}
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

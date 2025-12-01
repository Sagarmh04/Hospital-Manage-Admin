"use client";

import { useEffect, useState, useCallback } from "react";
import { DevicesSection } from "@/components/DevicesSection";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface DashboardData {
  user: {
    id: string;
    email: string;
    role: string;
  };
  activeSessions: number;
  stats: {
    todayOPD: number;
    inpatients: number;
    pendingLabReports: number;
    unpaidBills: number;
  };
}

type ViewType = "dashboard" | "devices" | "staff" | "roles" | "patients" | "appointments" | "billing" | "lab" | "integrations" | "settings" | "audit-logs";

interface AdminDashboardClientProps {
  onViewChange?: (view: ViewType) => void;
  currentView?: ViewType;
}

export function AdminDashboardClient({ onViewChange, currentView = "dashboard" }: AdminDashboardClientProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/dashboard");

      if (!res.ok) {
        const errorData = await res.json();
        if (errorData.redirect) {
          window.location.href = errorData.redirect;
          return;
        }
        throw new Error("Failed to fetch dashboard data");
      }

      const dashboardData = await res.json();
      setData(dashboardData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || "Failed to load dashboard"}</AlertDescription>
        </Alert>
        <Button onClick={fetchDashboardData} variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  // Render different views based on currentView
  if (currentView === "devices") {
    return (
      <div className="space-y-6">
        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            Device Management
          </h2>
          <p className="text-sm text-slate-600">
            Manage your active sessions and connected devices.
          </p>
        </section>
        <DevicesSection />
      </div>
    );
  }

  if (currentView === "staff") {
    return (
      <div className="space-y-6">
        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            Staff & Users
          </h2>
          <p className="text-sm text-slate-600">
            Manage hospital staff, doctors, nurses, and administrative users.
          </p>
        </section>
        <div className="bg-slate-100 border border-slate-200 rounded-xl p-8 text-center">
          <p className="text-slate-600">Staff management coming soon...</p>
        </div>
      </div>
    );
  }

  if (currentView === "roles") {
    return (
      <div className="space-y-6">
        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            Roles & Permissions
          </h2>
          <p className="text-sm text-slate-600">
            Configure role-based access control and permissions.
          </p>
        </section>
        <div className="bg-slate-100 border border-slate-200 rounded-xl p-8 text-center">
          <p className="text-slate-600">Role management coming soon...</p>
        </div>
      </div>
    );
  }

  if (currentView === "patients") {
    return (
      <div className="space-y-6">
        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            Patient Management
          </h2>
          <p className="text-sm text-slate-600">
            View and manage patient records and medical history.
          </p>
        </section>
        <div className="bg-slate-100 border border-slate-200 rounded-xl p-8 text-center">
          <p className="text-slate-600">Patient management coming soon...</p>
        </div>
      </div>
    );
  }

  if (currentView === "appointments") {
    return (
      <div className="space-y-6">
        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            Appointments
          </h2>
          <p className="text-sm text-slate-600">
            Schedule and manage patient appointments.
          </p>
        </section>
        <div className="bg-slate-100 border border-slate-200 rounded-xl p-8 text-center">
          <p className="text-slate-600">Appointment management coming soon...</p>
        </div>
      </div>
    );
  }

  if (currentView === "billing") {
    return (
      <div className="space-y-6">
        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            Billing & Finance
          </h2>
          <p className="text-sm text-slate-600">
            Manage billing, payments, and financial reports.
          </p>
        </section>
        <div className="bg-slate-100 border border-slate-200 rounded-xl p-8 text-center">
          <p className="text-slate-600">Billing management coming soon...</p>
        </div>
      </div>
    );
  }

  if (currentView === "lab") {
    return (
      <div className="space-y-6">
        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            Lab & Reports
          </h2>
          <p className="text-sm text-slate-600">
            Manage laboratory tests and medical reports.
          </p>
        </section>
        <div className="bg-slate-100 border border-slate-200 rounded-xl p-8 text-center">
          <p className="text-slate-600">Lab management coming soon...</p>
        </div>
      </div>
    );
  }

  if (currentView === "integrations") {
    return (
      <div className="space-y-6">
        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            Messaging & Integrations
          </h2>
          <p className="text-sm text-slate-600">
            Configure external integrations and messaging systems.
          </p>
        </section>
        <div className="bg-slate-100 border border-slate-200 rounded-xl p-8 text-center">
          <p className="text-slate-600">Integrations coming soon...</p>
        </div>
      </div>
    );
  }

  if (currentView === "settings") {
    return (
      <div className="space-y-6">
        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            System Settings
          </h2>
          <p className="text-sm text-slate-600">
            Configure system-wide settings and preferences.
          </p>
        </section>
        <div className="bg-slate-100 border border-slate-200 rounded-xl p-8 text-center">
          <p className="text-slate-600">Settings coming soon...</p>
        </div>
      </div>
    );
  }

  if (currentView === "audit-logs") {
    return (
      <div className="space-y-6">
        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            Audit Logs
          </h2>
          <p className="text-sm text-slate-600">
            View system audit logs and security events.
          </p>
        </section>
        <div className="bg-slate-100 border border-slate-200 rounded-xl p-8 text-center">
          <p className="text-slate-600">Audit logs coming soon...</p>
        </div>
      </div>
    );
  }

  // Default dashboard view
  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-xl font-semibold text-slate-900 mb-2">
          Overview
        </h2>
        <p className="text-sm text-slate-600">
          This is the admin dashboard. Later, you'll see real-time
          hospital stats here – OPD counts, inpatients, lab workload,
          billing summaries, and alerts.
        </p>
      </section>

      {/* Security Info Card */}
      <section className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🔒</span>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-blue-900 mb-1">
              Security Info
            </h3>
            <p className="text-sm text-blue-800">
              You have <strong>{data.activeSessions}</strong> active session{data.activeSessions !== 1 ? 's' : ''}.
              {data.activeSessions > 1 && (
                <span className="block mt-1">
                  Use <strong>&quot;Logout All Devices&quot;</strong> to sign out from all locations.
                </span>
              )}
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-xl bg-white border border-slate-200 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">
            Today&apos;s OPD
          </p>
          <p className="text-2xl font-semibold text-slate-900">{data.stats.todayOPD}</p>
          <p className="text-xs text-slate-500 mt-1">Placeholder data</p>
        </div>

        <div className="rounded-xl bg-white border border-slate-200 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">
            Inpatients
          </p>
          <p className="text-2xl font-semibold text-slate-900">{data.stats.inpatients}</p>
          <p className="text-xs text-slate-500 mt-1">Placeholder data</p>
        </div>

        <div className="rounded-xl bg-white border border-slate-200 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">
            Pending Lab Reports
          </p>
          <p className="text-2xl font-semibold text-slate-900">{data.stats.pendingLabReports}</p>
          <p className="text-xs text-slate-500 mt-1">Placeholder data</p>
        </div>

        <div className="rounded-xl bg-white border border-slate-200 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">
            Unpaid Bills
          </p>
          <p className="text-2xl font-semibold text-slate-900">₹{data.stats.unpaidBills}</p>
          <p className="text-xs text-slate-500 mt-1">Placeholder data</p>
        </div>
      </section>

      {/* Devices Section */}
      <DevicesSection />
    </div>
  );
}

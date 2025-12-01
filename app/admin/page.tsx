"use client";

import { useState } from "react";
import { AdminDashboardClient } from "@/components/AdminDashboardClient";
import { AdminSidebarClient } from "@/components/AdminSidebarClient";
import { LogoutButton } from "@/components/LogoutButton";

type ViewType = "dashboard" | "devices" | "staff" | "roles" | "patients" | "appointments" | "billing" | "lab" | "integrations" | "settings" | "audit-logs";

export default function AdminDashboardPage() {
  const [currentView, setCurrentView] = useState<ViewType>("dashboard");

  return (
    <div className="min-h-screen flex bg-slate-50">
      <AdminSidebarClient currentView={currentView} onViewChange={setCurrentView} />
      
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-900">
            {currentView === "dashboard" && "Dashboard"}
            {currentView === "devices" && "Device Management"}
            {currentView === "staff" && "Staff & Users"}
            {currentView === "roles" && "Roles & Permissions"}
            {currentView === "patients" && "Patients"}
            {currentView === "appointments" && "Appointments"}
            {currentView === "billing" && "Billing & Finance"}
            {currentView === "lab" && "Lab & Reports"}
            {currentView === "integrations" && "Integrations"}
            {currentView === "settings" && "Settings"}
            {currentView === "audit-logs" && "Audit Logs"}
          </h1>
          <LogoutButton />
        </header>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-y-auto">
          <AdminDashboardClient currentView={currentView} onViewChange={setCurrentView} />
        </main>
      </div>
    </div>
  );
}

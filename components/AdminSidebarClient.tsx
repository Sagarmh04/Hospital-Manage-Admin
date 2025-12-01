"use client";

import { useState } from "react";

type ViewType = "dashboard" | "devices" | "staff" | "roles" | "patients" | "appointments" | "billing" | "lab" | "integrations" | "settings" | "audit-logs";

interface NavItem {
  label: string;
  view: ViewType;
}

const navItems: NavItem[] = [
  { label: "Dashboard", view: "dashboard" },
  { label: "Devices", view: "devices" },
  { label: "Staff & Users", view: "staff" },
  { label: "Roles & Permissions", view: "roles" },
  { label: "Patients", view: "patients" },
  { label: "Appointments", view: "appointments" },
  { label: "Billing & Finance", view: "billing" },
  { label: "Lab & Reports", view: "lab" },
  { label: "Messaging & Integrations", view: "integrations" },
  { label: "System Settings", view: "settings" },
  { label: "Audit Logs", view: "audit-logs" },
];

interface AdminSidebarClientProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

export function AdminSidebarClient({ currentView, onViewChange }: AdminSidebarClientProps) {
  return (
    <aside className="w-64 shrink-0 border-r border-slate-200 bg-white">
      <div className="h-16 flex items-center px-4 border-b border-slate-200">
        <span className="text-lg font-semibold text-slate-900">
          Hospital Admin
        </span>
      </div>
      <nav className="p-3 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.view}
            onClick={() => onViewChange(item.view)}
            className={`block w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
              currentView === item.view
                ? "bg-slate-900 text-white font-medium"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}

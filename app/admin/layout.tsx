import type { ReactNode } from "react";
import { AdminSidebar } from "@/components/Sidebar";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex bg-slate-50">
      <AdminSidebar />
      <main className="flex-1">
        <header className="h-16 flex items-center justify-between px-6 border-b border-slate-200 bg-white">
          <h1 className="text-lg font-semibold text-slate-900">
            Admin Panel
          </h1>
          {/* Placeholder for user menu / logout, etc. */}
          <div className="text-sm text-slate-600">
            {/* e.g. "Logged in as Dr. Admin" later */}
          </div>
        </header>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}

import type { ReactNode } from "react";
import { AdminSidebar } from "@/components/Sidebar";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    // No valid session → kick to login
    redirect("/login");
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      <AdminSidebar />
      <main className="flex-1">
        <header className="h-16 flex items-center justify-between px-6 border-b border-slate-200 bg-white">
          <h1 className="text-lg font-semibold text-slate-900">
            Admin Panel
          </h1>
          <div className="text-sm text-slate-600 flex items-center gap-3">
            <span>Logged in as {user.email}</span>
            {/* You can add a logout button that calls /api/auth/logout via fetch */}
          </div>
        </header>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}


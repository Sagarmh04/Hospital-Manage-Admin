import type { ReactNode } from "react";
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

  // Minimal server-side wrapper - all UI is now client-side in page.tsx
  return <>{children}</>;
}


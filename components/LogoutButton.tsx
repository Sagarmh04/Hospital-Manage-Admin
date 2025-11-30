"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.refresh(); // Clear client cache
    router.push("/login");
  };

  const handleLogoutAll = async () => {
    if (!confirm("⚠️ This will log you out from ALL devices. Continue?")) {
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/logout-all", { method: "POST" });
      const data = await res.json();

      if (res.ok) {
        alert(data.message || "Logged out from all devices");
        router.refresh();
        router.push("/login");
      } else {
        alert(data.error || "Failed to logout");
        setIsLoading(false);
      }
    } catch (err) {
      console.error(err);
      alert("Server error");
      setIsLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-xs text-red-600 hover:text-red-700 font-medium hover:underline"
        disabled={isLoading}
      >
        {isLoading ? "Signing out..." : "Sign out ▾"}
      </button>

      {isOpen && !isLoading && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20">
            <button
              onClick={() => {
                setIsOpen(false);
                handleLogout();
              }}
              className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Logout This Device
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                handleLogoutAll();
              }}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              🔒 Logout All Devices
            </button>
          </div>
        </>
      )}
    </div>
  );
}
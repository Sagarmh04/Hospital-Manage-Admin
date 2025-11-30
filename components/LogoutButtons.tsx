"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface LogoutButtonsProps {
  variant?: "default" | "compact";
}

export default function LogoutButtons({ variant = "default" }: LogoutButtonsProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isLoggingOutAll, setIsLoggingOutAll] = useState(false);
  const router = useRouter();

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (res.ok) {
        router.push("/login");
      } else {
        console.error("Logout failed");
        setIsLoggingOut(false);
      }
    } catch (err) {
      console.error("Logout error:", err);
      setIsLoggingOut(false);
    }
  }

  async function handleLogoutAll() {
    if (!confirm("This will log you out from all devices. Continue?")) {
      return;
    }

    setIsLoggingOutAll(true);
    try {
      const res = await fetch("/api/auth/logout-all", {
        method: "POST",
      });

      const data = await res.json();

      if (res.ok) {
        alert(data.message || "Logged out from all devices");
        router.push("/login");
      } else {
        alert(data.error || "Failed to logout from all devices");
        setIsLoggingOutAll(false);
      }
    } catch (err) {
      console.error("Logout all error:", err);
      alert("Server error");
      setIsLoggingOutAll(false);
    }
  }

  if (variant === "compact") {
    return (
      <div className="flex gap-2">
        <button
          onClick={handleLogout}
          disabled={isLoggingOut || isLoggingOutAll}
          className="px-3 py-1.5 text-sm text-slate-700 hover:text-slate-900 disabled:opacity-50"
        >
          {isLoggingOut ? "Logging out..." : "Logout"}
        </button>
        <button
          onClick={handleLogoutAll}
          disabled={isLoggingOut || isLoggingOutAll}
          className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
        >
          {isLoggingOutAll ? "Logging out..." : "Logout All Devices"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <button
        onClick={handleLogout}
        disabled={isLoggingOut || isLoggingOutAll}
        className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        {isLoggingOut ? "Logging out..." : "Logout This Device"}
      </button>
      <button
        onClick={handleLogoutAll}
        disabled={isLoggingOut || isLoggingOutAll}
        className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        {isLoggingOutAll ? "Logging out..." : "Logout All Devices"}
      </button>
    </div>
  );
}

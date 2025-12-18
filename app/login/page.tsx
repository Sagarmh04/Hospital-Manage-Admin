"use client";

import { useState } from "react";

type SessionDuration = "1h" | "8h" | "24h" | "7d";

const DURATION_OPTIONS: { label: string; value: SessionDuration }[] = [
  { label: "1 hour", value: "1h" },
  { label: "8 hours", value: "8h" },
  { label: "24 hours", value: "24h" },
  { label: "7 days", value: "7d" },
];

type LoginStep = "identifier" | "otp";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState(""); // Email or phone
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [sessionDuration, setSessionDuration] =
    useState<SessionDuration>("8h");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<LoginStep>("identifier");
  const [isDevMode, setIsDevMode] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);

  // Detect if identifier is email or phone
  function detectIdentifierType(value: string): "email" | "phone" | null {
    const trimmed = value.trim();
    if (/^[\+\d]/.test(trimmed)) {
      return "phone";
    }
    if (/@/.test(trimmed)) {
      return "email";
    }
    return null;
  }

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const identifierType = detectIdentifierType(identifier);
      if (!identifierType) {
        setError("Please enter a valid email or phone number");
        return;
      }

      // Determine endpoint based on dev mode and identifier type
      const baseUrl = isDevMode ? "/api/dev" : "/api/auth";
      const endpoint =
        identifierType === "email"
          ? `${baseUrl}/email/request-otp`
          : `${baseUrl}/phone/request-otp`;

      const requestBody =
        identifierType === "email"
          ? { email: identifier, password }
          : { phone: identifier, password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to send OTP");
        return;
      }

      // If dev mode, display the OTP
      if (isDevMode && data.dev_otp) {
        setDevOtp(data.dev_otp);
      }

      // Move to OTP input step
      setStep("otp");
    } catch (err) {
      console.error(err);
      setError("Server error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const endpoint = isDevMode
        ? "/api/dev/verify-otp"
        : "/api/auth/verify-otp";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier,
          password,
          otp,
          sessionDuration,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Invalid OTP");
        return;
      }

      // Redirect to admin panel
      window.location.href = "/admin";
    } catch (err) {
      console.error(err);
      setError("Server error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleBackToIdentifier() {
    setStep("identifier");
    setOtp("");
    setDevOtp(null);
    setError(null);
  }

  // Legacy password login (kept for compatibility, remove if not needed)
  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: identifier,
          password: otp, // Using otp field for password temporarily
          sessionDuration,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }

      // Redirect to admin panel
      window.location.href = "/admin";
    } catch (err) {
      console.error(err);
      setError("Server error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-md bg-white rounded-xl shadow-md p-8">
        <h1 className="text-2xl font-semibold mb-2 text-slate-900">
          Admin Login
        </h1>
        <p className="text-sm text-slate-600 mb-6">
          Sign in to manage hospital staff, settings, and system controls.
        </p>

        {/* Step 1: Enter Email or Phone */}
        {step === "identifier" && (
          <form onSubmit={handleRequestOtp} className="space-y-5">
            <div className="space-y-1.5">
              <label
                htmlFor="identifier"
                className="block text-sm font-medium text-slate-700"
              >
                Email or Phone Number
              </label>
              <input
                id="identifier"
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                placeholder="admin@example.com or +1234567890"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                placeholder="Enter your password"
              />
            </div>

            <div className="space-y-2">
              <span className="block text-sm font-medium text-slate-700">
                Keep me logged in for
              </span>
              <div className="grid grid-cols-2 gap-2">
                {DURATION_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSessionDuration(option.value)}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                      sessionDuration === option.value
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-300 bg-white text-slate-700 hover:border-slate-900"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-slate-900 text-white py-2.5 text-sm font-medium hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {isSubmitting ? "Sending OTP..." : "Send OTP"}
            </button>

            {/* Dev Mode Toggle */}
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDevMode(!isDevMode)}
                className={`text-xs px-3 py-1.5 rounded-md transition ${
                  isDevMode
                    ? "bg-orange-100 text-orange-700 border border-orange-300"
                    : "bg-slate-100 text-slate-600 border border-slate-200"
                }`}
              >
                {isDevMode ? "🔧 Dev Mode ON" : "Dev Mode"}
              </button>
            </div>
          </form>
        )}

        {/* Step 2: Enter OTP */}
        {step === "otp" && (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            {devOtp && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <p className="text-xs font-medium text-orange-800 mb-1">
                  🔧 DEV MODE - OTP:
                </p>
                <p className="text-2xl font-mono font-bold text-orange-900">
                  {devOtp}
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <label
                htmlFor="otp"
                className="block text-sm font-medium text-slate-700"
              >
                Enter OTP
              </label>
              <input
                id="otp"
                type="text"
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                placeholder="000000"
              />
              <p className="text-xs text-slate-500">
                OTP sent to: {identifier}
              </p>
            </div>

            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-slate-900 text-white py-2.5 text-sm font-medium hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {isSubmitting ? "Verifying..." : "Verify OTP"}
            </button>

            <button
              type="button"
              onClick={handleBackToIdentifier}
              className="w-full rounded-lg border border-slate-300 bg-white text-slate-700 py-2.5 text-sm font-medium hover:border-slate-900 transition"
            >
              ← Back
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

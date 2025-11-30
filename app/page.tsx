import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="p-8 rounded-xl shadow-md bg-white max-w-md w-full text-center">
        <h1 className="text-2xl font-semibold mb-4">
          Hospital Admin Panel
        </h1>
        <p className="text-slate-600 mb-6">
          This is the system admin interface for the hospital management platform.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-slate-900 font-medium hover:bg-slate-900 hover:text-white transition"
        >
          Go to Login
        </Link>
      </div>
    </main>
  );
}

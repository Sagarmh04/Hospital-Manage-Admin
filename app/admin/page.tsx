import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DevicesSection } from "@/components/DevicesSection";

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();
  
  // Get active sessions count for security info
  const activeSessions = user
    ? await prisma.session.count({
        where: {
          userId: user.id,
          expiresAt: { gt: new Date() },
        },
      })
    : 0;

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
              You have <strong>{activeSessions}</strong> active session{activeSessions !== 1 ? 's' : ''}.
              {activeSessions > 1 && (
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
          <p className="text-2xl font-semibold text-slate-900">0</p>
          <p className="text-xs text-slate-500 mt-1">Placeholder data</p>
        </div>

        <div className="rounded-xl bg-white border border-slate-200 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">
            Inpatients
          </p>
          <p className="text-2xl font-semibold text-slate-900">0</p>
          <p className="text-xs text-slate-500 mt-1">Placeholder data</p>
        </div>

        <div className="rounded-xl bg-white border border-slate-200 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">
            Pending Lab Reports
          </p>
          <p className="text-2xl font-semibold text-slate-900">0</p>
          <p className="text-xs text-slate-500 mt-1">Placeholder data</p>
        </div>

        <div className="rounded-xl bg-white border border-slate-200 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">
            Unpaid Bills
          </p>
          <p className="text-2xl font-semibold text-slate-900">₹0</p>
          <p className="text-xs text-slate-500 mt-1">Placeholder data</p>
        </div>
      </section>

      {/* Devices Section */}
      <DevicesSection />
    </div>
  );
}

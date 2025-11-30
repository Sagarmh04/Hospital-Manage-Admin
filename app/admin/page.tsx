export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-xl font-semibold text-slate-900 mb-2">
          Overview
        </h2>
        <p className="text-sm text-slate-600">
          This is the admin dashboard. Later, you’ll see real-time
          hospital stats here – OPD counts, inpatients, lab workload,
          billing summaries, and alerts.
        </p>
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
    </div>
  );
}

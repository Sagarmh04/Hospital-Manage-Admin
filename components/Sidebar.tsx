import Link from "next/link";

const navItems = [
  { label: "Dashboard", href: "/admin" },
  { label: "Devices", href: "/admin#devices" },
  { label: "Staff & Users", href: "/admin/staff" },
  { label: "Roles & Permissions", href: "/admin/roles" },
  { label: "Patients", href: "/admin/patients" },
  { label: "Appointments", href: "/admin/appointments" },
  { label: "Billing & Finance", href: "/admin/billing" },
  { label: "Lab & Reports", href: "/admin/lab" },
  { label: "Messaging & Integrations", href: "/admin/integrations" },
  { label: "System Settings", href: "/admin/settings" },
  { label: "Audit Logs", href: "/admin/audit-logs" },
];

export function AdminSidebar() {
  return (
    <aside className="w-64 shrink-0 border-r border-slate-200 bg-white">
      <div className="h-16 flex items-center px-4 border-b border-slate-200">
        <span className="text-lg font-semibold text-slate-900">
          Hospital Admin
        </span>
      </div>
      <nav className="p-3 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block px-3 py-2 rounded-md text-sm text-slate-700 hover:bg-slate-100"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

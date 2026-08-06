import { Users, UserCheck, UserX, Shield } from "lucide-react";

export default function UserStatsCards({ users }) {
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.isActive).length;
  const inactiveUsers = users.filter((u) => !u.isActive).length;
  const admins = users.filter((u) => u.role === "ADMIN").length;

  const cards = [
    {
      label: "Total Users",
      value: totalUsers,
      icon: Users,
      iconClass: "text-slate-500",
      bgClass: "bg-slate-100",
    },
    {
      label: "Active",
      value: activeUsers,
      icon: UserCheck,
      iconClass: "text-emerald-600",
      bgClass: "bg-emerald-50",
    },
    {
      label: "Inactive",
      value: inactiveUsers,
      icon: UserX,
      iconClass: "text-amber-600",
      bgClass: "bg-amber-50",
    },
    {
      label: "Admins",
      value: admins,
      icon: Shield,
      iconClass: "text-violet-600",
      bgClass: "bg-violet-50",
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(({ label, value, icon: Icon, iconClass, bgClass }) => (
        <div
          key={label}
          className="rounded-lg border border-slate-200 bg-white px-5 py-4"
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              {label}
            </p>
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${bgClass}`}>
              <Icon className={`h-4 w-4 ${iconClass}`} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">
            {value}
          </p>
        </div>
      ))}
    </div>
  );
}

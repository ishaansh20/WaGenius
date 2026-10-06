import { Users, UserCheck, UserX, Shield } from "lucide-react";
import { StatCard } from "../ui";

export default function UserStatsCards({ users }) {
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.isActive).length;
  const inactiveUsers = users.filter((u) => !u.isActive).length;
  const admins = users.filter((u) => u.role === "ADMIN").length;

  const cards = [
    { label: "Team members", value: totalUsers, icon: Users, hint: "Everyone on this account" },
    { label: "Active", value: activeUsers, icon: UserCheck, hint: "Can sign in" },
    { label: "Inactive", value: inactiveUsers, icon: UserX, hint: "Access turned off" },
    { label: "Admins", value: admins, icon: Shield, hint: "Full access" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(({ label, value, icon, hint }) => (
        <StatCard key={label} label={label} value={value} icon={icon} hint={hint} />
      ))}
    </div>
  );
}

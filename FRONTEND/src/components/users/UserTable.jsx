import StatusToggle from "./StatusToggle";

const ROLE_CONFIG = {
  ADMIN: { label: "Admin", className: "bg-violet-50 text-violet-700 border border-violet-200" },
  TEAM_LEAD: { label: "Team Lead", className: "bg-blue-50 text-blue-700 border border-blue-200" },
  CAMPAIGN_MANAGER: { label: "Campaign Mgr", className: "bg-amber-50 text-amber-700 border border-amber-200" },
  SUPPORT_AGENT: { label: "Support Agent", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
};

function getInitials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function formatLastLogin(value) {
  if (!value) return "Never";
  const date = new Date(value);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    year: diffDays > 365 ? "numeric" : undefined,
  });
}

export default function UserTable({ users, onChangeRole, onToggleStatus }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {["User", "Role", "Status", "Last Login", "Actions"].map((col) => (
                <th
                  key={col}
                  className="px-5 py-3 text-left text-[12.5px] font-semibold uppercase tracking-wide text-slate-600"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-16 text-center">
                  <p className="text-sm font-medium text-slate-800">No users found</p>
                  <p className="mt-1 text-[13px] text-slate-400">
                    Try adjusting your search or filter.
                  </p>
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const role = ROLE_CONFIG[user.role] || { label: user.role, className: "bg-slate-100 text-slate-600 border border-slate-200" };
                const isAdmin = user.role === "ADMIN";

                return (
                  <tr
                    key={user._id || user.id}
                    className="transition-colors hover:bg-slate-50/70"
                  >
                    {/* User: avatar + name + email */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[11px] font-semibold text-slate-600">
                          {getInitials(user.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[13.5px] font-medium text-slate-900">
                            {user.name}
                          </p>
                          <p className="truncate text-[12px] text-slate-400">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Role badge */}
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${role.className}`}
                      >
                        {role.label}
                      </span>
                    </td>

                    {/* Status badge */}
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                          user.isActive
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-500 border border-slate-200"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${user.isActive ? "bg-emerald-500" : "bg-slate-400"}`}
                        />
                        {user.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>

                    {/* Last Login */}
                    <td className="px-5 py-3.5 text-[13px] tabular-nums text-slate-500">
                      {formatLastLogin(user.lastLogin)}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5">
                      {isAdmin ? (
                        <span className="text-[12px] text-slate-300">—</span>
                      ) : (
                        <div className="flex items-center gap-3">
                          <StatusToggle
                            user={user}
                            onToggleStatus={onToggleStatus}
                          />
                          <span className="h-4 w-px bg-slate-200" />
                          <button
                            onClick={() => onChangeRole(user)}
                            className="text-[12px] font-medium text-slate-500 underline-offset-2 transition hover:text-emerald-700 hover:underline"
                          >
                            Change Role
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

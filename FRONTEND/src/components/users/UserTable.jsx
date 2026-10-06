import { SearchX } from "lucide-react";
import { Badge } from "../ui";
import StatusToggle from "./StatusToggle";

const ROLE_CONFIG = {
  ADMIN: { label: "Admin" },
  TEAM_LEAD: { label: "Team lead" },
  CAMPAIGN_MANAGER: { label: "Campaign manager" },
  SUPPORT_AGENT: { label: "Support agent" },
};

const COLUMNS = ["User", "Role", "Status", "Last login", "Actions"];

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
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-[var(--shadow-card)]">
      <div className="relative overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line bg-[#f6f7f6]">
              {COLUMNS.map((col) => (
                <th
                  key={col}
                  scope="col"
                  className="px-4 py-3 text-left text-[13px] font-medium text-ink-muted"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-line">
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-4">
                  <div className="flex flex-col items-center justify-center rounded-xl bg-canvas px-6 py-12 text-center">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-ink-muted shadow-[var(--shadow-card)]">
                      <SearchX size={20} />
                    </span>
                    <p className="mt-4 text-[15px] font-semibold text-ink">No team members found</p>
                    <p className="mt-1 max-w-xs text-[14px] text-ink-muted">
                      Try a different name or email, or change the role and status filters.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const role = ROLE_CONFIG[user.role] || { label: user.role };
                const isAdmin = user.role === "ADMIN";

                return (
                  <tr
                    key={user._id || user.id}
                    className="transition-colors hover:bg-canvas"
                  >
                    {/* User: avatar + name + email */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[13px] font-semibold text-brand-800">
                          {getInitials(user.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-medium text-ink">
                            {user.name}
                          </p>
                          <p className="truncate text-[13px] text-ink-muted">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Role badge */}
                    <td className="px-4 py-3.5">
                      <Badge tone="neutral" className="text-[13px]">
                        {role.label}
                      </Badge>
                    </td>

                    {/* Status badge */}
                    <td className="px-4 py-3.5">
                      <Badge tone={user.isActive ? "brand" : "neutral"} dot className="text-[13px]">
                        {user.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>

                    {/* Last Login */}
                    <td className="px-4 py-3.5 text-[14px] tabular-nums text-ink-muted">
                      {formatLastLogin(user.lastLogin)}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5">
                      {isAdmin ? (
                        <span className="text-[14px] text-ink-muted" title="Admins can't be changed here">
                          —
                        </span>
                      ) : (
                        <div className="flex items-center gap-3">
                          <StatusToggle
                            user={user}
                            onToggleStatus={onToggleStatus}
                          />
                          <span className="h-5 w-px bg-line" />
                          <button
                            type="button"
                            onClick={() => onChangeRole(user)}
                            className="h-8 rounded-lg px-2.5 text-[14px] font-medium text-brand-700 transition hover:bg-brand-50 hover:text-brand-900"
                          >
                            Change role
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

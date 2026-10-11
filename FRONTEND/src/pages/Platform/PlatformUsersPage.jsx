import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  Users,
  Search,
  Building2,
  KeyRound,
  Pencil,
  Copy,
  Check,
  Eye,
  EyeOff,
  Sparkles,
  RefreshCw,
  UserCheck,
  UserX,
  Crown,
  ChevronDown,
} from "lucide-react";

import {
  fetchAllPlatformUsers,
  toggleUserStatusPlatform,
  updateUserRolePlatform,
  resetUserPasswordPlatform,
  fetchCompanies,
} from "../../services/platformApi";
import PlatformLayout from "../../components/layout/PlatformLayout";
import { Badge, Button, Card, EmptyState, Modal, Select, StatCard, Tabs } from "../../components/ui";

function formatDate(value) {
  if (!value) return "Never";
  return new Date(value).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function generateRandomPassword() {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*";
  let pass = "";
  for (let i = 0; i < 12; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}


const ROLE_LABELS = {
  ADMIN: "Admin",
  CAMPAIGN_MANAGER: "Campaign manager",
  SUPPORT_AGENT: "Support agent",
  TEAM_LEAD: "Team lead",
};

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

function ToolbarSelect({ value, onChange, children, label }) {
  return (
    <div className="relative">
      <select
        aria-label={label}
        value={value}
        onChange={onChange}
        className="h-10 appearance-none rounded-lg border border-line-strong bg-surface pl-3 pr-9 text-[14px] text-ink outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-brand-600/12"
      >
        {children}
      </select>
      <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-subtle" />
    </div>
  );
}

export default function PlatformUsersPage() {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [summary, setSummary] = useState({ total: 0, active: 0, inactive: 0, admins: 0 });
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals state
  const [resetModalUser, setResetModalUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [roleModalUser, setRoleModalUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState("SUPPORT_AGENT");
  const [savingRole, setSavingRole] = useState(false);

  async function loadCompanies() {
    try {
      const res = await fetchCompanies();
      setCompanies(res.data || []);
    } catch (error) {
      console.error("Failed to load companies:", error);
    }
  }

  async function loadUsers() {
    try {
      setLoading(true);
      const res = await fetchAllPlatformUsers({
        page,
        limit: 20,
        search: search.trim() || undefined,
        companyId: companyId || undefined,
        role: role || undefined,
        status: status || undefined,
      });

      setUsers(res.data || []);
      setTotalPages(res.totalPages || 1);
      if (res.summary) {
        setSummary(res.summary);
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load platform users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    loadUsers();
  }, [search, companyId, role, status, page]);

  async function handleToggleStatus(user) {
    const nextStatus = !user.isActive;
    try {
      await toggleUserStatusPlatform(user._id, nextStatus);
      toast.success(`User ${nextStatus ? "activated" : "deactivated"} successfully`);
      setUsers((prev) =>
        prev.map((u) => (u._id === user._id ? { ...u, isActive: nextStatus } : u)),
      );
      setSummary((prev) => ({
        ...prev,
        active: nextStatus ? prev.active + 1 : prev.active - 1,
        inactive: nextStatus ? prev.inactive - 1 : prev.inactive + 1,
      }));
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to toggle status");
    }
  }

  function openResetModal(user) {
    setResetModalUser(user);
    setNewPassword(generateRandomPassword());
    setShowPassword(true);
    setCopied(false);
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    if (!resetModalUser || !newPassword) return;

    try {
      setSavingPassword(true);
      await resetUserPasswordPlatform(resetModalUser._id, newPassword);
      toast.success(`Password reset for ${resetModalUser.email}`);
      setResetModalUser(null);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to reset password");
    } finally {
      setSavingPassword(false);
    }
  }

  function handleCopyPassword() {
    navigator.clipboard.writeText(newPassword);
    setCopied(true);
    toast.success("Password copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  }

  function openRoleModal(user) {
    setRoleModalUser(user);
    setSelectedRole(user.role || "SUPPORT_AGENT");
  }

  async function handleUpdateRole(e) {
    e.preventDefault();
    if (!roleModalUser || !selectedRole) return;

    try {
      setSavingRole(true);
      await updateUserRolePlatform(roleModalUser._id, selectedRole);
      toast.success("User role updated successfully");
      setUsers((prev) =>
        prev.map((u) => (u._id === roleModalUser._id ? { ...u, role: selectedRole } : u)),
      );
      setRoleModalUser(null);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update role");
    } finally {
      setSavingRole(false);
    }
  }

  return (
    <PlatformLayout
      title="Platform users"
      description="Every user account across all companies."
      actions={
        <Button variant="secondary" onClick={loadUsers} leftIcon={RefreshCw} className={loading ? "[&>svg]:animate-spin" : ""}>
          Refresh
        </Button>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total users" value={summary.total} icon={Users} />
          <StatCard label="Active accounts" value={summary.active} icon={UserCheck} />
          <StatCard label="Deactivated" value={summary.inactive} icon={UserX} />
          <StatCard label="Company admins" value={summary.admins} icon={Crown} />
        </div>

        <Card className="p-4 sm:p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[240px] flex-1">
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-subtle" />
              <input
                type="text"
                placeholder="Search by name or email"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="h-10 w-full rounded-lg border border-line-strong bg-surface pl-10 pr-4 text-[14px] text-ink outline-none transition placeholder:text-ink-subtle focus:border-brand-600 focus:ring-4 focus:ring-brand-600/12"
              />
            </div>

            <ToolbarSelect
              label="Filter by company"
              value={companyId}
              onChange={(e) => {
                setCompanyId(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All companies</option>
              {companies.map((comp) => (
                <option key={comp._id} value={comp._id}>
                  {comp.name}
                </option>
              ))}
            </ToolbarSelect>

            <ToolbarSelect
              label="Filter by role"
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All roles</option>
              <option value="ADMIN">Admin</option>
              <option value="CAMPAIGN_MANAGER">Campaign manager</option>
              <option value="SUPPORT_AGENT">Support agent</option>
              <option value="TEAM_LEAD">Team lead</option>
            </ToolbarSelect>

            <Tabs
              items={STATUS_TABS}
              value={status}
              onChange={(v) => {
                setStatus(v);
                setPage(1);
              }}
            />
          </div>
        </Card>

        <Card padded={false} className="overflow-hidden">
          {loading ? (
            <div className="flex h-60 items-center justify-center">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-line border-t-brand-600" />
            </div>
          ) : users.length === 0 ? (
            <div className="p-5">
              <EmptyState icon={Users} title="No users found" description="No users matched your search. Try a different name, company or filter." />
            </div>
          ) : (
            <div className="relative overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[#f6f7f6] text-[13px] text-ink-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">User</th>
                    <th className="px-4 py-3 font-medium">Company</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Last login</th>
                    <th className="px-4 py-3 font-medium">Joined</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-[14px] text-ink">
                  {users.map((u) => (
                    <tr key={u._id} className="transition hover:bg-canvas">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[13px] font-semibold text-brand-800">
                            {u.name?.charAt(0)?.toUpperCase() || "U"}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-ink">{u.name}</p>
                            <p className="truncate text-[13px] text-ink-muted">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        {u.companyId ? (
                          <button
                            onClick={() => {
                              const targetId = typeof u.companyId === "object" ? (u.companyId?._id || u.companyId?.id) : u.companyId;
                              if (targetId && targetId !== "[object Object]") navigate(`/platform/companies/${targetId}`);
                            }}
                            className="inline-flex items-center gap-1.5 text-[14px] font-medium text-brand-700 hover:underline"
                          >
                            <Building2 size={14} />
                            {typeof u.companyId === "object" ? (u.companyId.name || "Company") : "Company"}
                          </button>
                        ) : (
                          <span className="text-ink-muted">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        <Badge tone={u.role === "ADMIN" ? "brand" : "neutral"}>{ROLE_LABELS[u.role] || u.role}</Badge>
                      </td>

                      <td className="px-4 py-3.5">
                        <button
                          onClick={() => handleToggleStatus(u)}
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-medium transition hover:opacity-80 ${
                            u.isActive ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
                          }`}
                          title="Click to toggle status"
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${u.isActive ? "bg-success" : "bg-danger"}`} />
                          {u.isActive ? "Active" : "Inactive"}
                        </button>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 text-ink-muted">{formatDate(u.lastLogin)}</td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-ink-muted">{formatDate(u.createdAt)}</td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1">
                          <Button variant="ghost" size="sm" leftIcon={KeyRound} onClick={() => openResetModal(u)} title="Reset user password">
                            Reset password
                          </Button>
                          <Button variant="ghost" size="sm" leftIcon={Pencil} onClick={() => openRoleModal(u)} title="Edit user role">
                            Role
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-line px-4 py-3 text-[13px] text-ink-muted">
              <p>Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  Previous
                </Button>
                <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      <Modal
        open={!!resetModalUser}
        onClose={() => setResetModalUser(null)}
        title="Reset password"
        description={resetModalUser ? `Set a new password for ${resetModalUser.name} (${resetModalUser.email}).` : undefined}
        size="sm"
      >
        {resetModalUser && (
          <form onSubmit={handleResetPassword} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-[13px] font-medium text-ink">New password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  className="h-11 w-full rounded-xl border border-line-strong bg-surface px-3.5 pr-20 font-mono text-[14px] text-ink outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-600/12"
                />
                <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="rounded-md p-1.5 text-ink-muted hover:bg-canvas hover:text-ink"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyPassword}
                    className="rounded-md p-1.5 text-ink-muted hover:bg-canvas hover:text-ink"
                    title="Copy to clipboard"
                  >
                    {copied ? <Check size={16} className="text-brand-600" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
              <p className="text-[13px] text-ink-muted">At least 6 characters. Share it with the user securely.</p>
            </div>

            <div className="flex justify-end gap-2 border-t border-line pt-4">
              <Button variant="secondary" leftIcon={Sparkles} onClick={() => setNewPassword(generateRandomPassword())}>
                Generate random
              </Button>
              <Button type="submit" loading={savingPassword} disabled={savingPassword}>
                {savingPassword ? "Resetting..." : "Save password"}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        open={!!roleModalUser}
        onClose={() => setRoleModalUser(null)}
        title="Change user role"
        description={roleModalUser ? `Update what ${roleModalUser.name} can do.` : undefined}
        size="sm"
      >
        {roleModalUser && (
          <form onSubmit={handleUpdateRole} className="space-y-5">
            <Select label="Role" value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}>
              <option value="ADMIN">Admin — full management and billing</option>
              <option value="CAMPAIGN_MANAGER">Campaign manager — create and send campaigns</option>
              <option value="SUPPORT_AGENT">Support agent — inbox chat and customer support</option>
              <option value="TEAM_LEAD">Team lead — analytics, assignments and supervision</option>
            </Select>
            <div className="flex justify-end gap-2 border-t border-line pt-4">
              <Button variant="secondary" onClick={() => setRoleModalUser(null)}>
                Cancel
              </Button>
              <Button type="submit" loading={savingRole} disabled={savingRole}>
                {savingRole ? "Updating..." : "Save role"}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </PlatformLayout>
  );
}

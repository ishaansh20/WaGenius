import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  Users,
  Search,
  Building2,
  Shield,
  KeyRound,
  Pencil,
  Copy,
  Check,
  Eye,
  EyeOff,
  Sparkles,
  RefreshCw,
  X,
  UserCheck,
  UserX,
  Crown,
} from "lucide-react";

import {
  fetchAllPlatformUsers,
  toggleUserStatusPlatform,
  updateUserRolePlatform,
  resetUserPasswordPlatform,
  fetchCompanies,
} from "../../services/platformApi";
import PlatformLayout from "../../components/layout/PlatformLayout";

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

const roleBadges = {
  ADMIN: "border-purple-200 bg-purple-50 text-purple-700",
  CAMPAIGN_MANAGER: "border-blue-200 bg-blue-50 text-blue-700",
  SUPPORT_AGENT: "border-emerald-200 bg-emerald-50 text-emerald-700",
  TEAM_LEAD: "border-amber-200 bg-amber-50 text-amber-700",
};

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
      title="Platform Users"
      description="Central multi-tenant directory of all user accounts across companies."
      actions={
        <button
          onClick={loadUsers}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      }
    >
      <div className="space-y-6">
        {/* SUMMARY CARDS */}
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-[#F5F8FB] p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Users</p>
                <p className="text-xl font-bold text-slate-900">{summary.total}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-[#F5F8FB] p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Accounts</p>
                <p className="text-xl font-bold text-emerald-700">{summary.active}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-[#F5F8FB] p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
                <UserX className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Deactivated</p>
                <p className="text-xl font-bold text-red-600">{summary.inactive}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-[#F5F8FB] p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                <Crown className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Company Admins</p>
                <p className="text-xl font-bold text-purple-700">{summary.admins}</p>
              </div>
            </div>
          </div>
        </div>

        {/* SEARCH & FILTERS BAR */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-[#F5F8FB] p-4 shadow-sm">
          <div className="flex flex-1 flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative min-w-[240px] flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search user by name or email..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-4 text-xs text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-[#F5F8FB]"
              />
            </div>

            {/* Company Filter */}
            <select
              value={companyId}
              onChange={(e) => {
                setCompanyId(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-700 outline-none transition focus:border-emerald-500 focus:bg-[#F5F8FB]"
            >
              <option value="">All Companies</option>
              {companies.map((comp) => (
                <option key={comp._id} value={comp._id}>
                  {comp.name}
                </option>
              ))}
            </select>

            {/* Role Filter */}
            <select
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-700 outline-none transition focus:border-emerald-500 focus:bg-[#F5F8FB]"
            >
              <option value="">All Roles</option>
              <option value="ADMIN">ADMIN</option>
              <option value="CAMPAIGN_MANAGER">CAMPAIGN_MANAGER</option>
              <option value="SUPPORT_AGENT">SUPPORT_AGENT</option>
              <option value="TEAM_LEAD">TEAM_LEAD</option>
            </select>

            {/* Status Filter */}
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-700 outline-none transition focus:border-emerald-500 focus:bg-[#F5F8FB]"
            >
              <option value="">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>

        {/* USERS DATA TABLE */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-[#F5F8FB] shadow-sm">
          {loading ? (
            <div className="flex h-60 items-center justify-center">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-600" />
            </div>
          ) : users.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-400">
              No users matched your search criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-5 py-3.5">User</th>
                    <th className="px-5 py-3.5">Company Tenant</th>
                    <th className="px-5 py-3.5">Role</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Last Login</th>
                    <th className="px-5 py-3.5">Joined</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {users.map((u) => (
                    <tr key={u._id} className="transition hover:bg-slate-50/70">
                      {/* USER NAME & EMAIL */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-xs font-bold text-white shadow-sm">
                            {u.name?.charAt(0)?.toUpperCase() || "U"}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{u.name}</p>
                            <p className="text-[11px] text-slate-400">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* COMPANY TENANT */}
                      <td className="px-5 py-3.5">
                        {u.companyId ? (
                          <button
                            onClick={() => {
                              const targetId = typeof u.companyId === "object" ? (u.companyId?._id || u.companyId?.id) : u.companyId;
                              if (targetId && targetId !== "[object Object]") navigate(`/platform/companies/${targetId}`);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
                          >
                            <Building2 className="h-3 w-3 text-slate-400" />
                            {typeof u.companyId === "object" ? (u.companyId.name || "Company") : "Company"}
                          </button>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* ROLE */}
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-bold ${
                            roleBadges[u.role] || "border-slate-200 bg-slate-50 text-slate-600"
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>

                      {/* STATUS */}
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => handleToggleStatus(u)}
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition ${
                            u.isActive
                              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              : "bg-red-50 text-red-600 hover:bg-red-100"
                          }`}
                          title="Click to toggle status"
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              u.isActive ? "bg-emerald-600" : "bg-red-500"
                            }`}
                          />
                          {u.isActive ? "Active" : "Inactive"}
                        </button>
                      </td>

                      {/* LAST LOGIN */}
                      <td className="px-5 py-3.5 text-slate-500">{formatDate(u.lastLogin)}</td>

                      {/* JOINED */}
                      <td className="px-5 py-3.5 text-slate-500">{formatDate(u.createdAt)}</td>

                      {/* ACTIONS */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => openResetModal(u)}
                            className="inline-flex h-7 items-center gap-1 rounded-lg border border-slate-200 px-2 text-[11px] font-medium text-slate-700 transition hover:bg-slate-100"
                            title="Reset user password"
                          >
                            <KeyRound className="h-3 w-3 text-slate-500" />
                            Reset Pass
                          </button>
                          <button
                            onClick={() => openRoleModal(u)}
                            className="inline-flex h-7 items-center gap-1 rounded-lg border border-slate-200 px-2 text-[11px] font-medium text-slate-700 transition hover:bg-slate-100"
                            title="Edit user role"
                          >
                            <Pencil className="h-3 w-3 text-slate-500" />
                            Role
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* PAGINATION */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
              <p>Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border border-slate-200 px-3 py-1 font-medium transition hover:bg-slate-50 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg border border-slate-200 px-3 py-1 font-medium transition hover:bg-slate-50 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PASSWORD RESET MODAL */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-[#F5F8FB] p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <KeyRound className="h-4 w-4" />
                </div>
                <h3 className="text-base font-semibold text-slate-900">Reset Password</h3>
              </div>
              <button
                onClick={() => setResetModalUser(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Directly set a new password for <span className="font-semibold text-slate-800">{resetModalUser.name}</span> ({resetModalUser.email}).
            </p>

            <form onSubmit={handleResetPassword} className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">New Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 pr-20 text-xs font-mono text-slate-900 outline-none focus:border-emerald-500 focus:bg-[#F5F8FB]"
                  />
                  <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="rounded p-1 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyPassword}
                      className="rounded p-1 text-slate-400 hover:text-slate-600"
                      title="Copy to clipboard"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setNewPassword(generateRandomPassword())}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  Generate Random
                </button>
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="inline-flex flex-1 items-center justify-center rounded-xl bg-emerald-600 py-2.5 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
                >
                  {savingPassword ? "Resetting..." : "Save Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ROLE MODAL */}
      {roleModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-[#F5F8FB] p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                  <Shield className="h-4 w-4" />
                </div>
                <h3 className="text-base font-semibold text-slate-900">Change User Role</h3>
              </div>
              <button
                onClick={() => setRoleModalUser(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Update permissions role for <span className="font-semibold text-slate-800">{roleModalUser.name}</span>.
            </p>

            <form onSubmit={handleUpdateRole} className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Select Role</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-emerald-500 focus:bg-[#F5F8FB]"
                >
                  <option value="ADMIN">ADMIN — Full management & billing control</option>
                  <option value="CAMPAIGN_MANAGER">CAMPAIGN_MANAGER — Create & broadcast campaigns</option>
                  <option value="SUPPORT_AGENT">SUPPORT_AGENT — Inbox chat & customer support</option>
                  <option value="TEAM_LEAD">TEAM_LEAD — Analytics, assignments, and supervision</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={savingRole}
                className="w-full rounded-xl bg-emerald-600 py-2.5 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
              >
                {savingRole ? "Updating..." : "Save Role"}
              </button>
            </form>
          </div>
        </div>
      )}
    </PlatformLayout>
  );
}

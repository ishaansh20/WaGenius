import { useEffect, useState } from "react";
import { Lock, Search, UserPlus, Users } from "lucide-react";
import { toast } from "react-hot-toast";
import usePlan from "../../hooks/usePlan";
import {
  getUsers,
  updateUserStatus,
  updateUserRole,
} from "../../services/userService";
import UserStatsCards from "../../components/users/UserStatsCards";
import UserTable from "../../components/users/UserTable";
import CreateUserModal from "../../components/users/CreateUserModal";
import EditRoleModal from "../../components/users/EditRoleModal";
import PricingSettingsPanel from "../../components/settings/PricingSettingsPanel";
import ConnectWhatsAppPanel from "../../components/settings/ConnectWhatsAppPanel";
import DashboardLayout from "../../components/layout/DashboardLayout";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditRoleOpen, setIsEditRoleOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const { canUse, hasReachedLimit } = usePlan();
  const canManageTeam = canUse("teamManagement");
  const usersLimitReached = hasReachedLimit("users");

  const fetchUsers = async () => {
    try {
      const response = await getUsers();
      setUsers(response.users || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleStatus = async (user) => {
    try {
      await updateUserStatus(user._id, !user.isActive);
      await fetchUsers();
    } catch (error) {
      console.error(error);
    }
  };

  const handleUpdateRole = async (userId, role) => {
    try {
      await updateUserRole(userId, role);
      setIsEditRoleOpen(false);
      await fetchUsers();
    } catch (error) {
      console.error(error);
    }
  };

  const openRoleModal = (user) => {
    setSelectedUser(user);
    setIsEditRoleOpen(true);
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "ALL" || user.role === roleFilter;
    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" && user.isActive) ||
      (statusFilter === "INACTIVE" && !user.isActive);
    return matchesSearch && matchesRole && matchesStatus;
  });

  if (loading) {
    return (
      <DashboardLayout title="Settings">
        <main className="flex-1 py-5 sm:py-6 lg:py-2">
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-500" />
            <p className="text-[13px] text-slate-500">Loading settings…</p>
          </div>
        </main>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Settings">
      <main className="flex-1 py-5 sm:py-6 lg:py-2">
        <div className="w-full max-w-none space-y-4">

          {/* Page header */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white shadow-sm">
                <Users className="h-4 w-4 text-slate-600" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  Administration
                </p>
                <h1 className="text-[17px] font-semibold leading-tight text-slate-900">
                  {activeTab === "users" ? "User Management" : activeTab === "pricing" ? "Meta Rates & Fallbacks" : "WhatsApp Connection"}
                </h1>
              </div>
            </div>

            {activeTab === "users" && (
              <button
                onClick={() => {
                  if (!canManageTeam) {
                    toast.error("Team management is available on Pro and Enterprise plans. Upgrade to invite team members.", { icon: "🔒" });
                    return;
                  }
                  if (usersLimitReached) {
                    toast.error("User limit reached for your plan. Upgrade to add more team members.", { icon: "🔒" });
                    return;
                  }
                  setIsCreateModalOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-2 text-[13px] font-medium text-white transition hover:bg-emerald-700 active:bg-emerald-800 shadow-sm"
              >
                {(!canManageTeam || usersLimitReached) ? <Lock className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">Create User</span>
                <span className="sm:hidden">New</span>
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="inline-flex items-center gap-0.5 rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            {[
              { key: "users", label: "Users" },
              { key: "pricing", label: "Meta Rates Fallback" },
              { key: "whatsapp", label: "WhatsApp" },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-md px-3.5 py-1.5 text-[13px] font-medium transition ${
                  activeTab === tab.key
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "pricing" ? (
            <PricingSettingsPanel />
          ) : activeTab === "whatsapp" ? (
            <ConnectWhatsAppPanel />
          ) : (
            <>
          {/* Stats */}
          <UserStatsCards users={users} />

          {/* Filters */}
          <div className="flex flex-col gap-2.5 rounded-lg border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name or email…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 text-[13px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-100"
              />
            </div>

            <div className="flex items-center gap-2">
              {/* Role filter */}
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-[13px] text-slate-700 outline-none transition focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-100"
              >
                <option value="ALL">All Roles</option>
                <option value="ADMIN">Admin</option>
                <option value="TEAM_LEAD">Team Lead</option>
                <option value="CAMPAIGN_MANAGER">Campaign Mgr</option>
                <option value="SUPPORT_AGENT">Support Agent</option>
              </select>

              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-[13px] text-slate-700 outline-none transition focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-100"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>

            {/* Result count */}
            <span className="shrink-0 text-[12px] tabular-nums text-slate-400">
              {filteredUsers.length} / {users.length}
            </span>
          </div>

          {/* Table */}
          <UserTable
            users={filteredUsers}
            onChangeRole={openRoleModal}
            onToggleStatus={handleToggleStatus}
          />
            </>
          )}
        </div>

        <CreateUserModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onUserCreated={fetchUsers}
        />
        <EditRoleModal
          isOpen={isEditRoleOpen}
          onClose={() => setIsEditRoleOpen(false)}
          user={selectedUser}
          onUpdate={handleUpdateRole}
        />
      </main>
    </DashboardLayout>
  );
}

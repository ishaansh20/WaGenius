import { useEffect, useState } from "react";
import { Lock, MessageCircle, ReceiptText, Search, UserPlus, Users } from "lucide-react";
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
import { Button, Skeleton } from "../../components/ui";
import { cn } from "../../utils/cn";

const SECTIONS = [
  {
    key: "users",
    label: "Team members",
    description: "People who can use this account",
    icon: Users,
  },
  {
    key: "pricing",
    label: "Message rates",
    description: "Fallback Meta rates for cost estimates",
    icon: ReceiptText,
  },
  {
    key: "whatsapp",
    label: "WhatsApp connection",
    description: "Link your WhatsApp Business Account",
    icon: MessageCircle,
  },
];

const SECTION_SUBTITLES = {
  users: "Add team members, change their roles and turn access on or off.",
  pricing: "Set the backup rates used to estimate campaign costs.",
  whatsapp: "Connect the WhatsApp Business Account this company sends messages from.",
};

const TOOLBAR_CONTROL =
  "h-10 rounded-lg border border-line-strong bg-surface text-[14px] text-ink outline-none transition placeholder:text-ink-subtle hover:border-ink-subtle focus:border-brand-600 focus:ring-4 focus:ring-brand-600/12";

function SectionNav({ activeTab, onChange }) {
  return (
    <>
      {/* Desktop: vertical sub-navigation */}
      <nav aria-label="Settings sections" className="hidden lg:block">
        <ul className="space-y-1">
          {SECTIONS.map(({ key, label, description, icon: Icon }) => {
            const active = activeTab === key;
            return (
              <li key={key}>
                <button
                  type="button"
                  onClick={() => onChange(key)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl px-3.5 py-3 text-left transition-colors",
                    active ? "bg-brand-50 text-brand-900" : "text-ink hover:bg-surface",
                  )}
                >
                  <Icon
                    size={18}
                    className={cn("mt-0.5 shrink-0", active ? "text-brand-700" : "text-ink-muted")}
                  />
                  <span className="min-w-0">
                    <span className="block text-[14px] font-medium">{label}</span>
                    <span className={cn("mt-0.5 block text-[13px]", active ? "text-brand-800" : "text-ink-muted")}>
                      {description}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Mobile / tablet: segmented scroll row */}
      <div className="max-w-full overflow-x-auto scrollbar-hide lg:hidden">
        <div role="tablist" aria-label="Settings sections" className="inline-flex rounded-lg border border-line bg-surface p-1">
          {SECTIONS.map(({ key, label }) => {
            const active = activeTab === key;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onChange(key)}
                className={cn(
                  "h-9 whitespace-nowrap rounded-md px-3.5 text-[14px] font-medium transition-colors",
                  active ? "bg-brand-900 text-white" : "text-ink-muted hover:bg-canvas hover:text-ink",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

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
        <main className="flex-1 py-5 sm:py-6 lg:py-2" aria-busy="true">
          <p className="sr-only">Loading settings…</p>
          <div className="mb-8 space-y-2.5">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-5 w-72 max-w-full" />
          </div>
          <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
            <div className="hidden space-y-2 lg:block">
              {SECTIONS.map(({ key }) => (
                <Skeleton key={key} className="h-[62px] w-full rounded-xl" />
              ))}
            </div>
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-[112px] rounded-[var(--radius-card)]" />
                ))}
              </div>
              <Skeleton className="h-[320px] w-full rounded-[var(--radius-card)]" />
            </div>
          </div>
        </main>
      </DashboardLayout>
    );
  }

  const createLocked = !canManageTeam || usersLimitReached;

  return (
    <DashboardLayout title="Settings">
      <main className="flex-1 py-5 sm:py-6 lg:py-2">
        <div className="w-full max-w-none">
          {/* Page header */}
          <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-ink sm:text-[30px]">Settings</h1>
              <p className="mt-1.5 text-[15px] text-ink-muted">{SECTION_SUBTITLES[activeTab]}</p>
            </div>

            {activeTab === "users" && (
              <Button
                leftIcon={createLocked ? Lock : UserPlus}
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
                title={createLocked ? "Upgrade your plan to add team members" : undefined}
              >
                Add team member
              </Button>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-8">
            <SectionNav activeTab={activeTab} onChange={setActiveTab} />

            <div className="min-w-0 space-y-5">
              {activeTab === "pricing" ? (
                <PricingSettingsPanel />
              ) : activeTab === "whatsapp" ? (
                <ConnectWhatsAppPanel />
              ) : (
                <>
                  {/* Stats */}
                  <UserStatsCards users={users} />

                  {/* Filters */}
                  <div className="flex flex-col gap-3 md:flex-row md:items-center">
                    <div className="relative flex-1">
                      <Search
                        size={16}
                        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-subtle"
                      />
                      <input
                        type="text"
                        placeholder="Search by name or email"
                        aria-label="Search team members"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={cn(TOOLBAR_CONTROL, "w-full pl-10 pr-3.5")}
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Role filter */}
                      <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        aria-label="Filter by role"
                        className={cn(TOOLBAR_CONTROL, "px-3")}
                      >
                        <option value="ALL">All roles</option>
                        <option value="ADMIN">Admin</option>
                        <option value="TEAM_LEAD">Team lead</option>
                        <option value="CAMPAIGN_MANAGER">Campaign manager</option>
                        <option value="SUPPORT_AGENT">Support agent</option>
                      </select>

                      {/* Status filter */}
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        aria-label="Filter by status"
                        className={cn(TOOLBAR_CONTROL, "px-3")}
                      >
                        <option value="ALL">All statuses</option>
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                      </select>

                      {/* Result count */}
                      <span className="shrink-0 px-1 text-[14px] tabular-nums text-ink-muted">
                        {filteredUsers.length} of {users.length}
                      </span>
                    </div>
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
          </div>
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

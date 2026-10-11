import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  Users,
  Megaphone,
  FileText,
  Radio,
  BarChart3,
  Activity,
  Sliders,
  CreditCard,
  Layers,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { cn } from "../../utils/cn";
import usePlatformAuthStore from "../../store/platformAuthStore";
import { Logo } from "../ui";

const navGroups = [
  {
    label: "Overview",
    items: [
      { id: "dashboard", icon: LayoutDashboard, label: "Dashboard", path: "/platform/dashboard" },
      { id: "analytics", icon: BarChart3, label: "Analytics", path: "/platform/analytics" },
    ],
  },
  {
    label: "Customers",
    items: [
      { id: "companies", icon: Building2, label: "Companies", path: "/platform/companies" },
      { id: "users", icon: Users, label: "Users", path: "/platform/users" },
      { id: "subscriptions", icon: CreditCard, label: "Subscriptions", path: "/platform/subscriptions" },
      { id: "plans", icon: Layers, label: "Plans", path: "/platform/plans" },
    ],
  },
  {
    label: "Activity",
    items: [
      { id: "campaigns", icon: Megaphone, label: "Campaigns", path: "/platform/campaigns" },
      { id: "templates", icon: FileText, label: "Templates", path: "/platform/templates" },
      { id: "whatsapp", icon: Radio, label: "WhatsApp", path: "/platform/whatsapp" },
    ],
  },
  {
    label: "System",
    items: [
      { id: "audit-logs", icon: Activity, label: "Audit logs", path: "/platform/audit-logs" },
      { id: "settings", icon: Sliders, label: "Settings", path: "/platform/settings" },
    ],
  },
];

function NavButton({ item, active, onClick }) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[14px] font-medium transition-colors",
        active ? "bg-brand-50 text-brand-900" : "text-ink-muted hover:bg-canvas hover:text-ink",
      )}
    >
      <Icon size={18} className={active ? "text-brand-700" : "text-ink-muted"} />
      <span>{item.label}</span>
    </button>
  );
}

export default function PlatformLayout({ title, description, actions, children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const platformUser = usePlatformAuthStore((state) => state.platformUser);
  const logout = usePlatformAuthStore((state) => state.logout);
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate("/platform/login");
  }

  const isActive = (item) => location.pathname.startsWith(item.path);
  const initial = platformUser?.name?.charAt(0)?.toUpperCase() || "A";

  const SidebarContent = (
    <div className="flex h-full w-full flex-col">
      <div className="flex shrink-0 flex-col gap-2 px-5 pb-4 pt-5">
        <Logo />
        <span className="inline-flex w-fit items-center rounded-full border border-brand-100 bg-brand-50 px-2.5 py-0.5 text-[12px] font-medium text-brand-800">
          Admin console
        </span>
      </div>

      <nav className="min-h-0 flex-1 space-y-5 overflow-y-auto px-3 py-2">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="px-3 pb-1.5 text-[13px] font-medium text-ink-muted">{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavButton
                  key={item.id}
                  item={item}
                  active={isActive(item)}
                  onClick={() => {
                    setMobileOpen(false);
                    navigate(item.path);
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="shrink-0 space-y-2 border-t border-line p-3">
        <div className="flex items-center gap-3 p-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-900 text-[14px] font-semibold text-white">
            {initial}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-medium text-ink">
              {platformUser?.name || "Super admin"}
            </span>
            <span className="block truncate text-[13px] text-ink-muted">{platformUser?.email}</span>
          </span>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[14px] font-medium text-ink-muted transition-colors hover:bg-danger-soft hover:text-danger"
        >
          <LogOut size={18} />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-canvas text-ink antialiased">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] border-r border-line bg-surface lg:flex">
        {SidebarContent}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/30" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-[272px] max-w-[85vw] border-r border-line bg-surface shadow-xl">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
              className="absolute right-3 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted hover:bg-canvas hover:text-ink"
            >
              <X size={18} />
            </button>
            {SidebarContent}
          </aside>
        </div>
      )}

      <main className="min-h-screen lg:ml-[248px]">
        <header className="sticky top-0 z-30 border-b border-line bg-surface px-4 py-4 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line text-ink-muted hover:bg-canvas hover:text-ink lg:hidden"
              >
                <Menu size={18} />
              </button>
              <div className="min-w-0">
                <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-ink sm:text-[24px]">
                  {title}
                </h1>
                {description && <p className="mt-0.5 text-[14px] text-ink-muted">{description}</p>}
              </div>
            </div>

            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
          </div>
        </header>

        <div className="page-enter mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-8">{children}</div>
      </main>
    </div>
  );
}

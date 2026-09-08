import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
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
  ShieldCheck,
  Menu,
  X,
} from "lucide-react";
import { cn } from "../../utils/cn";
import usePlatformAuthStore from "../../store/platformAuthStore";

const navItems = [
  { id: "dashboard", icon: LayoutDashboard, label: "Dashboard", path: "/platform/dashboard" },
  { id: "companies", icon: Building2, label: "Companies", path: "/platform/companies" },
  { id: "users", icon: Users, label: "Users", path: "/platform/users" },
  { id: "campaigns", icon: Megaphone, label: "Broadcasts", path: "/platform/campaigns" },
  { id: "templates", icon: FileText, label: "Templates", path: "/platform/templates" },
  { id: "whatsapp", icon: Radio, label: "WhatsApp", path: "/platform/whatsapp" },
  { id: "analytics", icon: BarChart3, label: "Analytics", path: "/platform/analytics" },
  { id: "audit-logs", icon: Activity, label: "Audit Logs", path: "/platform/audit-logs" },
  { id: "subscriptions", icon: CreditCard, label: "Subscriptions", path: "/platform/subscriptions" },
  { id: "plans", icon: Layers, label: "Plans", path: "/platform/plans" },
  { id: "settings", icon: Sliders, label: "Settings", path: "/platform/settings" },
];

function NavButton({ item, active, onClick }) {
  const Icon = item.icon;

  return (
    <motion.button
      whileHover={{ x: 2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[13px] font-medium transition-all duration-150",
        active
          ? "bg-[#2E5C8A] text-[#E8F0FA] shadow-sm"
          : "text-[#4A6580] hover:bg-[#D4DEE9] hover:text-[#1A3652]",
      )}
    >
      <span
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg transition",
          active ? "bg-[#1E4A73] text-[#C5D8E8]" : "bg-[#CEDAE6] text-[#4A6580] group-hover:bg-[#BFD0DF] group-hover:text-[#1A3652]",
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span>{item.label}</span>
    </motion.button>
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

  const SidebarContent = (
    <div className="flex h-full flex-col justify-between">
      <div className="flex min-h-0 flex-1 flex-col">
        {/* Header Branding */}
        <div className="flex shrink-0 items-center gap-3 px-4 pt-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#2E5C8A] shadow-sm border border-[#1E4A73]">
            <ShieldCheck className="h-4.5 w-4.5 text-[#C5D8E8]" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#6B8BA5]">
              Wagenius
            </p>
            <p className="truncate text-sm font-semibold tracking-tight text-[#1A3652]">
              Super Admin
            </p>
          </div>
        </div>

        {/* Scrollable Navigation List */}
        <div className="mt-5 min-h-0 flex-1 overflow-y-auto px-3 space-y-1">
          {navItems.map((item) => (
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

      {/* Bottom Profile & Sign out */}
      <div className="shrink-0 space-y-2 border-t border-[#C5D1DE] px-3 pt-3">
        <div className="rounded-xl border border-[#C5D1DE] bg-[#D4DEE9] p-2.5">
          <div className="flex items-center justify-between">
            <p className="truncate text-xs font-semibold text-[#1A3652]">
              {platformUser?.name || "Super Admin"}
            </p>
            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#C5D8E8] text-[#2E5C8A]">
              Root
            </span>
          </div>
          <p className="truncate text-[11px] text-[#6B8BA5] mt-0.5">
            {platformUser?.email}
          </p>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#C5D1DE] bg-[#EFF3F8] py-2 text-xs font-medium text-[#4A6580] transition hover:border-red-300 hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#EFF3F8] text-[#1A3652] font-sans antialiased">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[240px] border-r border-[#C5D1DE] bg-[#E1E8F0]/95 py-5 backdrop-blur-xl lg:flex">
        {SidebarContent}
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-[#1A3652]/30 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[240px] flex-col border-r border-[#C5D1DE] bg-[#E1E8F0] py-5 shadow-2xl">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-lg text-[#8DA3B8] hover:bg-[#D4DEE9] hover:text-[#2E5C8A]"
            >
              <X className="h-4 w-4" />
            </button>
            {SidebarContent}
          </aside>
        </div>
      )}

      <main className="min-h-screen lg:ml-[240px]">
        <header className="sticky top-0 z-30 border-b border-[#C5D1DE] bg-[#EFF3F8]/90 px-5 py-4 backdrop-blur-xl sm:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#C5D1DE] bg-[#E1E8F0] text-[#4A6580] lg:hidden"
              >
                <Menu className="h-4 w-4" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold tracking-tight text-[#1A3652] sm:text-xl">
                    {title}
                  </h1>
                </div>
                {description && (
                  <p className="mt-0.5 text-xs text-[#6B8BA5] sm:text-sm">
                    {description}
                  </p>
                )}
              </div>
            </div>

            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        </header>

        <div className="mx-auto w-full max-w-[1600px] px-5 py-6 sm:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}

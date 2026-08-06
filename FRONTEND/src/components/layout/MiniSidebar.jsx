import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
  BarChart3,
  Bot,
  ChevronRight,
  ClipboardList,
  FileText,
  LayoutDashboard,
  MessageSquareText,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  LogOut,
} from "lucide-react";
import { cn } from "../../utils/cn";
import { useNavigate, useLocation } from "react-router-dom";
import useAuthStore from "../../store/authStore";

const navItems = [
  {
    id: "dashboard",
    icon: BarChart3,
    label: "Dashboard",
    path: "/dashboard",
  },

  {
    id: "inbox",
    icon: MessageSquareText,
    label: "Inbox",
    path: "/inbox",
  },

  {
    id: "campaigns",
    icon: Bot,
    label: "Campaigns",
    submenu: [
      {
        label: "Create Campaign",
        path: "/campaigns/upload",
        icon: Bot,
      },
      {
        label: "Campaign History",
        path: "/campaigns/history",
        icon: ClipboardList,
      },
    ],
  },

  {
    id: "contacts",
    icon: Users,
    label: "Contacts",
    path: "/contacts",
  },

  {
    id: "templates",
    icon: LayoutDashboard,
    label: "Templates",
    submenu: [
      {
        label: "Templates",
        path: "/templates",
        icon: FileText,
      },
      {
        label: "Create Template",
        path: "/templates/create",
        icon: Sparkles,
      },
      {
        label: "Approved Templates",
        path: "/templates/approved",
        icon: ShieldCheck,
      },
    ],
  },

  {
    id: "settings",
    icon: Settings,
    label: "Settings",
    path: "/settings",
  },
];

const ROLE_NAVIGATION = {
  ADMIN: [
    "dashboard",
    "inbox",
    "campaigns",
    "contacts",
    "templates",
    "settings",
  ],

  CAMPAIGN_MANAGER: ["dashboard", "campaigns", "contacts", "templates"],

  SUPPORT_AGENT: ["inbox", "contacts"],

  TEAM_LEAD: ["dashboard", "inbox", "contacts"],
};

const routeMap = {
  dashboard: "/dashboard",
  inbox: "/inbox",
  campaigns: "/campaigns",
  contacts: "/contacts",
  templates: "/templates",
  settings: "/settings",
};

function SidebarButton({ item, active, onClick }) {
  const Icon = item.icon;

  return (
    <motion.button
      whileHover={{ scale: 1.06, x: 2 }}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className={cn(
        "group relative flex h-11 w-11 items-center justify-center rounded-xl border transition-all duration-200",
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 shadow-[0_10px_24px_rgba(16,185,129,0.14)]"
          : "border-transparent bg-transparent text-slate-400 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-950",
      )}
      aria-label={item.label}
    >
      <Icon className="h-5 w-5" />
      <span className="pointer-events-none absolute left-[60px] z-50 whitespace-nowrap rounded-lg bg-slate-950 px-3 py-2 text-xs font-medium text-white opacity-0 shadow-xl transition-all duration-200 group-hover:opacity-100">
        {item.label}
      </span>
    </motion.button>
  );
}

export function MiniSidebar({ onSectionChange }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const [expandedMenu, setExpandedMenu] = useState(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const sidebarRef = useRef(null);
  const allowedItems = ROLE_NAVIGATION[user?.role] || [];
  const logout = useAuthStore((state) => state.logout);

  const filteredNavItems = navItems.filter((item) =>
    allowedItems.includes(item.id),
  );

  const settingsItem = filteredNavItems.find((item) => item.id === "settings");

  const sidebarItems = filteredNavItems.filter(
    (item) => item.id !== "settings",
  );

  const isActive = (item) => {
    if (item.id === "campaigns") {
      return location.pathname.startsWith("/campaigns");
    }

    if (item.id === "templates") {
      return location.pathname.startsWith("/templates");
    }

    return location.pathname === routeMap[item.id];
  };

  const handleNavigate = (path) => {
    setExpandedMenu(null);
    navigate(path);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  useEffect(() => {
    if (!expandedMenu) return undefined;

    const handleDocumentMouseDown = (event) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        setExpandedMenu(null);
      }
    };

    document.addEventListener("mousedown", handleDocumentMouseDown);

    return () => {
      document.removeEventListener("mousedown", handleDocumentMouseDown);
    };
  }, [expandedMenu]);

  return (
    <>
      <aside
        ref={sidebarRef}
        className={cn(
          "fixed inset-y-0 left-0 z-50 hidden w-[80px] flex-col justify-between border-r border-slate-200/80 bg-white/95 px-3 py-4 shadow-[1px_0_0_rgba(15,23,42,0.02)] backdrop-blur-xl lg:flex",
        )}
      >
        <div className="space-y-6">
          <div className="flex items-center justify-center pt-1">
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() =>
                navigate(routeMap[ROLE_NAVIGATION[user?.role]?.[0]] ?? "/login")
              }
              className="relative flex h-12 w-12 cursor-pointer items-center justify-center overflow-hidden rounded-2xl bg-slate-950 text-white shadow-[0_8px_24px_rgba(15,23,42,0.28)]"
              aria-label="Go to home"
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              <div className="relative flex flex-col items-center leading-none">
                <span className="text-[13px] font-black tracking-wide text-white">WA</span>
                <span className="mt-0.5 text-[6px] font-bold uppercase tracking-[0.22em] text-emerald-400">
                  Genius
                </span>
              </div>
            </motion.button>
          </div>

          <div className="space-y-3 pt-1">
            {sidebarItems.map((item) => (
              <div
                key={item.id}
                className="relative flex flex-col items-center"
              >
                <SidebarButton
                  item={item}
                  active={isActive(item)}
                  onClick={() => {
                    if (item.submenu) {
                      setExpandedMenu((current) =>
                        current === item.id ? null : item.id,
                      );
                      return;
                    }

                    onSectionChange?.(item.id);
                    navigate(routeMap[item.id] || item.path);
                  }}
                />

                {item.submenu && expandedMenu === item.id ? (
                  <motion.div
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -6 }}
                    className="absolute left-[calc(100%+12px)] top-0 z-50 w-[236px] rounded-xl border border-slate-200 bg-white p-2 shadow-[0_18px_60px_rgba(15,23,42,0.12)]"
                  >
                    <div className="space-y-1">
                      {item.submenu.map((subItem) => {
                        const SubIcon = subItem.icon || ChevronRight;

                        return (
                          <button
                            key={subItem.path}
                            type="button"
                            onClick={() => handleNavigate(subItem.path)}
                            className={cn(
                              "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition",
                              location.pathname === subItem.path
                                ? "bg-emerald-50 text-emerald-800"
                                : "text-slate-600 hover:bg-slate-50 hover:text-slate-950",
                            )}
                          >
                            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                              <SubIcon className="h-4 w-4" />
                            </span>
                            <span className="flex-1">{subItem.label}</span>
                            <ChevronRight className="h-4 w-4 text-slate-400" />
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 pb-2">
          {settingsItem && (
            <SidebarButton
              item={settingsItem}
              active={isActive(settingsItem)}
              onClick={() => navigate(settingsItem.path)}
            />
          )}

          <div className="relative">
            <button
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl bg-gradient-to-br from-slate-800 to-slate-950 text-sm font-bold text-white shadow-md ring-1 ring-white/10 transition hover:from-slate-700 hover:to-slate-900"
              aria-label="Open account menu"
            >
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </button>

            {profileMenuOpen && (
              <div className="absolute bottom-0 left-[60px] w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-[0_18px_60px_rgba(15,23,42,0.14)]">
                <div className="border-b pb-3">
                  <p className="font-semibold text-slate-900">{user?.name}</p>

                  <p className="text-sm text-slate-500">{user?.email}</p>

                  <p className="mt-1 text-xs font-medium text-emerald-600">
                    {user?.role}
                  </p>
                </div>

                <div className="mt-2 space-y-1">
                  <button
                    onClick={handleLogout}
                    className="cursor-pointer flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

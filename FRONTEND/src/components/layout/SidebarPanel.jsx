import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  LogOut,
  Plug,
} from "lucide-react";
import { cn } from "../../utils/cn";
import useAuthStore from "../../store/authStore";
import usePlan from "../../hooks/usePlan";
import { LogoMark } from "../ui/Logo";
import {
  ROLE_LABELS,
  getHomePathForRole,
  getNavGroupsForRole,
  isItemActive,
} from "./navConfig";

function NavTooltip({ label }) {
  return (
    <span className="pointer-events-none absolute left-[calc(100%+12px)] top-1/2 z-50 -translate-y-1/2 whitespace-nowrap rounded-md bg-ink px-2.5 py-1.5 text-[13px] font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
      {label}
    </span>
  );
}

function WhatsAppStatus({ collapsed, onConnect }) {
  const setupStatus = useAuthStore((s) => s.setupStatus);

  if (setupStatus === "READY") {
    return collapsed ? (
      <div className="group relative flex justify-center py-1" aria-label="WhatsApp connected">
        <span className="h-2.5 w-2.5 rounded-full bg-brand-500 ring-4 ring-brand-100" />
        <NavTooltip label="WhatsApp connected" />
      </div>
    ) : (
      <div className="flex items-center gap-2.5 rounded-lg border border-brand-100 bg-brand-50 px-3 py-2 text-[13px] font-medium text-brand-800">
        <span className="h-2 w-2 rounded-full bg-brand-500 ring-4 ring-brand-100" />
        WhatsApp connected
      </div>
    );
  }

  if (setupStatus === "WHATSAPP_ONBOARDING_REQUIRED") {
    return (
      <button
        type="button"
        onClick={onConnect}
        className={cn(
          "group relative flex items-center gap-2 rounded-lg bg-brand-900 text-[13px] font-medium text-white transition hover:bg-brand-800",
          collapsed ? "mx-auto h-9 w-9 justify-center" : "w-full px-3 py-2",
        )}
      >
        <Plug size={15} />
        {!collapsed && "Connect WhatsApp"}
        {collapsed && <NavTooltip label="Connect WhatsApp" />}
      </button>
    );
  }

  return null;
}

function PlanCard({ onUpgrade }) {
  const { plan, getUsage, getLimit } = usePlan();
  if (!plan) return null;

  const used = getUsage("contacts");
  const limit = getLimit("contacts");
  const unlimited = limit === -1 || limit >= 999999;
  const percent = unlimited || !limit ? 0 : Math.min(Math.round((used / limit) * 100), 100);

  return (
    <div className="rounded-xl border border-line bg-canvas p-3.5">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[14px] font-semibold text-ink">{plan.name || "Your plan"}</p>
        <button
          type="button"
          onClick={onUpgrade}
          className="text-[13px] font-medium text-brand-700 hover:text-brand-900 hover:underline"
        >
          Upgrade
        </button>
      </div>
      <p className="mt-1.5 text-[13px] text-ink-muted tabular-nums">
        {used.toLocaleString()} of {unlimited ? "unlimited" : limit.toLocaleString()} contacts
      </p>
      {!unlimited && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e5e8e6]">
          <div
            className={cn("h-full rounded-full", percent >= 90 ? "bg-danger" : "bg-brand-600")}
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
    </div>
  );
}

function UserMenu({ collapsed }) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const initial = user?.name?.charAt(0)?.toUpperCase() || "U";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Open account menu"
        className={cn(
          "flex w-full items-center gap-3 rounded-lg transition hover:bg-canvas",
          collapsed ? "justify-center p-1.5" : "p-2",
        )}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-900 text-[14px] font-semibold text-white">
          {initial}
        </span>
        {!collapsed && (
          <span className="min-w-0 flex-1 text-left">
            <span className="block truncate text-[14px] font-medium text-ink">{user?.name || "User"}</span>
            <span className="block truncate text-[13px] text-ink-muted">
              {ROLE_LABELS[user?.role] || user?.role}
            </span>
          </span>
        )}
      </button>

      {open && (
        <div
          className={cn(
            "absolute z-50 w-64 rounded-xl border border-line bg-surface p-1.5 text-ink shadow-[var(--shadow-pop)]",
            collapsed ? "bottom-0 left-[calc(100%+12px)]" : "bottom-[calc(100%+8px)] left-0",
          )}
        >
          <div className="border-b border-line px-3 pb-3 pt-2">
            <p className="truncate text-[14px] font-medium">{user?.name}</p>
            <p className="truncate text-[13px] text-ink-muted">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              logout();
              navigate("/login");
            }}
            className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[14px] text-danger transition hover:bg-danger-soft"
          >
            <LogOut size={16} />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Sidebar contents shared by the desktop rail and the mobile drawer.
 * `collapsed` only applies on desktop; `onNavigate` lets the drawer close.
 */
export default function SidebarPanel({ collapsed = false, onToggleCollapse, onNavigate, headerAction }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const user = useAuthStore((s) => s.user);
  const groups = getNavGroupsForRole(user?.role);
  const panelRef = useRef(null);

  // Expanded mode: submenus open inline (the active one opens by default).
  // Collapsed mode: submenus open as a flyout next to the rail.
  const [openMenus, setOpenMenus] = useState(() => {
    const initial = {};
    groups.forEach((group) =>
      group.items.forEach((item) => {
        if (item.submenu && isItemActive(item, pathname)) initial[item.id] = true;
      }),
    );
    return initial;
  });
  const [flyout, setFlyout] = useState(null);

  useEffect(() => {
    if (!flyout) return undefined;
    const onDown = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) setFlyout(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [flyout]);

  const go = (path) => {
    setFlyout(null);
    navigate(path);
    onNavigate?.();
  };

  return (
    <div ref={panelRef} className="flex h-full flex-col border-r border-line bg-surface">
      <div className={cn("flex h-16 items-center", collapsed ? "justify-center px-3" : "justify-between px-5")}>
        <button
          type="button"
          onClick={() => go(getHomePathForRole(user?.role))}
          className="flex items-center gap-2.5"
          aria-label="Go to home"
        >
          <LogoMark className="h-8 w-8" />
          {!collapsed && <span className="text-[18px] font-semibold tracking-[-0.02em] text-ink">Wagenius</span>}
        </button>
        {headerAction}
      </div>

      <div className={cn("pb-1", collapsed ? "px-3" : "px-4")}>
        <WhatsAppStatus collapsed={collapsed} onConnect={() => go("/onboarding/whatsapp")} />
      </div>

      {/* No scroll container when collapsed: overflow would clip the flyouts/tooltips. */}
      <nav className={cn("min-h-0 flex-1 pb-4", collapsed ? "px-3" : "overflow-y-auto px-4 scrollbar-hide")}>
        {groups.map((group) => (
          <div key={group.label} className="mt-5">
            {collapsed ? (
              <div className="mx-auto mb-2 h-px w-6 bg-line" />
            ) : (
              <p className="mb-1 px-3 text-[13px] font-medium text-ink-subtle">{group.label}</p>
            )}

            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isItemActive(item, pathname);
                const menuOpen = collapsed ? flyout === item.id : !!openMenus[item.id];

                return (
                  <li key={item.id} className="relative">
                    <button
                      type="button"
                      aria-label={item.label}
                      aria-expanded={item.submenu ? menuOpen : undefined}
                      onClick={() => {
                        if (!item.submenu) return go(item.path);
                        if (collapsed) return setFlyout((current) => (current === item.id ? null : item.id));
                        setOpenMenus((current) => ({ ...current, [item.id]: !current[item.id] }));
                      }}
                      className={cn(
                        "group relative flex w-full items-center rounded-lg text-[15px] font-medium transition-colors duration-150",
                        collapsed ? "h-10 justify-center" : "h-10 gap-3 px-3",
                        active ? "bg-brand-50 text-brand-900" : "text-[#3a4442] hover:bg-canvas hover:text-ink",
                      )}
                    >
                      <Icon size={18} strokeWidth={active ? 2.2 : 1.9} className={active ? "text-brand-700" : "text-ink-muted"} />
                      {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
                      {!collapsed && item.submenu && (
                        <ChevronDown
                          size={16}
                          className={cn("text-ink-subtle transition-transform", menuOpen && "rotate-180")}
                        />
                      )}
                      {collapsed && !menuOpen && <NavTooltip label={item.label} />}
                    </button>

                    {item.submenu && menuOpen && !collapsed && (
                      <ul className="mb-1 ml-[21px] mt-0.5 space-y-0.5 border-l border-line pl-3">
                        {item.submenu.map((sub) => {
                          const subActive = pathname === sub.path;
                          return (
                            <li key={sub.path}>
                              <button
                                type="button"
                                onClick={() => go(sub.path)}
                                className={cn(
                                  "flex h-9 w-full items-center rounded-md px-3 text-left text-[14px] transition-colors",
                                  subActive
                                    ? "font-medium text-brand-800"
                                    : "text-ink-muted hover:bg-canvas hover:text-ink",
                                )}
                              >
                                {subActive && <span className="-ml-[17px] mr-[13px] h-4 w-0.5 rounded-full bg-brand-600" />}
                                {sub.label}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}

                    {item.submenu && menuOpen && collapsed && (
                      <div className="absolute left-[calc(100%+12px)] top-0 z-50 w-60 rounded-xl border border-line bg-surface p-1.5 text-ink shadow-[var(--shadow-pop)]">
                        <p className="px-3 pb-1 pt-1.5 text-[13px] font-medium text-ink-subtle">{item.label}</p>
                        {item.submenu.map((sub) => {
                          const SubIcon = sub.icon || ChevronRight;
                          const subActive = pathname === sub.path;
                          return (
                            <button
                              key={sub.path}
                              type="button"
                              onClick={() => go(sub.path)}
                              className={cn(
                                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[14px] transition",
                                subActive ? "bg-brand-50 font-medium text-brand-900" : "text-ink hover:bg-canvas",
                              )}
                            >
                              <SubIcon size={16} className={subActive ? "text-brand-700" : "text-ink-muted"} />
                              {sub.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className={cn("space-y-2 border-t border-line py-3", collapsed ? "px-3" : "px-4")}>
        {!collapsed && user?.role === "ADMIN" && <PlanCard onUpgrade={() => go("/billing")} />}
        <UserMenu collapsed={collapsed} />
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className={cn(
              "flex h-9 w-full items-center gap-2 rounded-lg text-[13px] text-ink-muted transition hover:bg-canvas hover:text-ink",
              collapsed ? "justify-center" : "px-3",
            )}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
            {!collapsed && "Collapse sidebar"}
          </button>
        )}
      </div>
    </div>
  );
}

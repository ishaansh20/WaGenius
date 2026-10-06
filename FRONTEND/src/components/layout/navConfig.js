import {
  BarChart3,
  ClipboardList,
  CreditCard,
  FileText,
  Megaphone,
  MessageSquareText,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

// Single source of truth for company-app navigation (desktop + mobile).
export const NAV_GROUPS = [
  {
    label: "Insights",
    items: [{ id: "dashboard", icon: BarChart3, label: "Dashboard", path: "/dashboard" }],
  },
  {
    label: "Engage",
    items: [
      { id: "inbox", icon: MessageSquareText, label: "Inbox", path: "/inbox" },
      { id: "contacts", icon: Users, label: "Contacts", path: "/contacts" },
    ],
  },
  {
    label: "Grow",
    items: [
      {
        id: "campaigns",
        icon: Megaphone,
        label: "Campaigns",
        matchPrefix: "/campaigns",
        submenu: [
          { label: "Create campaign", path: "/campaigns/upload", icon: Send },
          { label: "Campaign history", path: "/campaigns/history", icon: ClipboardList },
        ],
      },
      {
        id: "templates",
        icon: FileText,
        label: "Templates",
        matchPrefix: "/templates",
        submenu: [
          { label: "All templates", path: "/templates", icon: FileText },
          { label: "Create template", path: "/templates/create", icon: Sparkles },
          { label: "Approved templates", path: "/templates/approved", icon: ShieldCheck },
        ],
      },
    ],
  },
  {
    label: "Account",
    items: [
      { id: "billing", icon: CreditCard, label: "Billing & plans", path: "/billing" },
      { id: "settings", icon: Settings, label: "Settings", path: "/settings" },
    ],
  },
];

export const ROLE_NAVIGATION = {
  ADMIN: ["dashboard", "inbox", "campaigns", "contacts", "templates", "billing", "settings"],
  CAMPAIGN_MANAGER: ["dashboard", "campaigns", "contacts", "templates"],
  SUPPORT_AGENT: ["inbox", "contacts"],
  TEAM_LEAD: ["dashboard", "inbox", "contacts"],
};

export const ROLE_LABELS = {
  ADMIN: "Admin",
  CAMPAIGN_MANAGER: "Campaign manager",
  SUPPORT_AGENT: "Support agent",
  TEAM_LEAD: "Team lead",
};

export function getNavGroupsForRole(role) {
  const allowed = ROLE_NAVIGATION[role] || [];
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => allowed.includes(item.id)),
  })).filter((group) => group.items.length > 0);
}

export function getHomePathForRole(role) {
  const firstId = ROLE_NAVIGATION[role]?.[0];
  if (!firstId) return "/login";
  for (const group of NAV_GROUPS) {
    const item = group.items.find((entry) => entry.id === firstId);
    if (item) return item.path || item.submenu[0].path;
  }
  return "/login";
}

export function isItemActive(item, pathname) {
  if (item.matchPrefix) return pathname.startsWith(item.matchPrefix);
  return pathname === item.path;
}

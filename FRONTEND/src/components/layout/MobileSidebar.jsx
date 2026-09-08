import {
  BarChart3,
  Bot,
  ClipboardList,
  CreditCard,
  FileText,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../../store/authStore";

const navItems = [
  { label: "Dashboard", path: "/dashboard", icon: BarChart3, section: "dashboard" },
  { label: "Inbox", path: "/inbox", icon: LayoutDashboard, section: "inbox" },
  { label: "Create Campaign", path: "/campaigns/upload", icon: Bot, section: "campaigns" },
  { label: "Campaign History", path: "/campaigns/history", icon: ClipboardList, section: "campaigns" },
  { label: "Contacts", path: "/contacts", icon: Users, section: "contacts" },
  { label: "Templates", path: "/templates", icon: FileText, section: "templates" },
  { label: "Create Template", path: "/templates/create", icon: Sparkles, section: "templates" },
  { label: "Approved Templates", path: "/templates/approved", icon: ShieldCheck, section: "templates" },
  { label: "Billing & Plans", path: "/billing", icon: CreditCard, section: "billing" },
  { label: "Settings", path: "/settings", icon: Settings, section: "settings" },
];

const ROLE_NAVIGATION = {
  ADMIN: ["dashboard", "inbox", "campaigns", "contacts", "templates", "billing", "settings"],
  CAMPAIGN_MANAGER: ["dashboard", "campaigns", "contacts", "templates"],
  SUPPORT_AGENT: ["inbox", "contacts"],
  TEAM_LEAD: ["dashboard", "inbox", "contacts"],
};

export default function MobileSidebar({ open, onClose }) {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const allowedSections = ROLE_NAVIGATION[user?.role] || [];
  const filteredNavItems = navItems.filter((item) =>
    allowedSections.includes(item.section),
  );

  if (!open) return null;

  const goTo = (path) => {
    navigate(path);
    onClose();
  };

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-sm lg:hidden" />

      <div className="fixed left-0 top-0 z-50 flex h-screen w-[min(88vw,340px)] flex-col border-r border-slate-200 bg-white/95 p-4 shadow-2xl backdrop-blur-xl lg:hidden">
        <div className="mb-5 flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-600">
              Wagenius
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-950">
              Navigation
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-1">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => goTo(item.path)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

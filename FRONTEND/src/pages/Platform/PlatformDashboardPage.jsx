import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  Users,
  FileText,
  Megaphone,
  Contact,
  MessageSquare,
  ArrowRight,
  CreditCard,
  Clock,
  Hourglass,
  BarChart3,
  Activity,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { fetchPlatformDashboard } from "../../services/platformApi";
import PlatformLayout from "../../components/layout/PlatformLayout";
import { Skeleton } from "../../components/ui";
import { cn } from "../../utils/cn";

export default function PlatformDashboardPage() {
  const navigate = useNavigate();

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadDashboard() {
    try {
      setLoading(true);

      const response = await fetchPlatformDashboard();

      setDashboard(response.data);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to load platform dashboard",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const stats = dashboard || {};

  const quickLinks = [
    { label: "Companies", text: "View businesses, change status or inspect WhatsApp accounts.", icon: Building2, path: "/platform/companies" },
    { label: "Subscriptions", text: "Change plans, extend trials and set custom limits.", icon: CreditCard, path: "/platform/subscriptions" },
    { label: "Users", text: "Find a user and check their company and role.", icon: Users, path: "/platform/users" },
    { label: "Analytics", text: "Revenue, new companies and message volume.", icon: BarChart3, path: "/platform/analytics" },
    { label: "WhatsApp", text: "Check connected WhatsApp business accounts.", icon: MessageSquare, path: "/platform/whatsapp" },
    { label: "Audit logs", text: "See who changed what, and when.", icon: Activity, path: "/platform/audit-logs" },
  ];

  return (
    <PlatformLayout
      title="Platform overview"
      description="All companies, activity and subscriptions at a glance."
    >
      {loading ? (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[128px] rounded-[var(--radius-card)]" />
            ))}
          </div>
          <Skeleton className="h-[120px] rounded-[var(--radius-card)]" />
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <KpiCard icon={Building2} label="Companies" value={stats.companies?.total ?? 0} onClick={() => navigate("/platform/companies")} />
            <KpiCard icon={Users} label="Users" value={stats.users?.total ?? 0} onClick={() => navigate("/platform/users")} />
            <KpiCard icon={FileText} label="Templates" value={stats.templates?.total ?? 0} onClick={() => navigate("/platform/templates")} />
            <KpiCard icon={Megaphone} label="Campaigns" value={stats.campaigns?.total ?? 0} onClick={() => navigate("/platform/campaigns")} />
            <KpiCard icon={Contact} label="Contacts" value={stats.contacts?.total ?? 0} />
            <KpiCard icon={MessageSquare} label="WhatsApp connected" value={stats.whatsapp?.connected ?? 0} onClick={() => navigate("/platform/whatsapp")} />
          </div>

          <section className="rounded-[var(--radius-card)] border border-line bg-surface shadow-[var(--shadow-card)]">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 sm:px-6">
              <div>
                <h2 className="text-[17px] font-semibold text-ink">Subscriptions</h2>
                <p className="mt-1 text-[14px] text-ink-muted">Where companies are in their plan journey.</p>
              </div>
              <button
                type="button"
                onClick={() => navigate("/platform/subscriptions")}
                className="inline-flex items-center gap-1.5 text-[14px] font-medium text-brand-700 hover:underline"
              >
                Manage subscriptions <ArrowRight size={16} />
              </button>
            </div>
            <div className="mt-4 grid grid-cols-1 divide-y divide-line border-t border-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <SubFact icon={CreditCard} label="Active subscriptions" value={stats.subscriptions?.active ?? 0} hint="Companies on a paid plan" />
              <SubFact icon={Clock} label="Active trials" value={stats.subscriptions?.trial ?? 0} hint="Companies in the 14-day trial" />
              <SubFact icon={Hourglass} label="Pending setup" value={stats.subscriptions?.pending ?? 0} hint="Waiting to pick a plan" tone="warning" />
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-[17px] font-semibold text-ink">Quick links</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {quickLinks.map((link) => (
                <QuickLink key={link.path} {...link} onClick={() => navigate(link.path)} />
              ))}
            </div>
          </section>
        </div>
      )}
    </PlatformLayout>
  );
}

function KpiCard({ icon: Icon, label, value, onClick }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "group flex flex-col rounded-[var(--radius-card)] border border-line bg-surface p-5 text-left shadow-[var(--shadow-card)] transition",
        onClick && "hover:border-line-strong hover:shadow-[0_8px_24px_rgba(15,28,23,0.08)]",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-[14px] font-medium text-ink-muted">
          <Icon size={16} className="text-brand-600" />
          {label}
        </span>
        {onClick && (
          <ArrowRight size={16} className="text-ink-subtle transition group-hover:translate-x-0.5 group-hover:text-ink" />
        )}
      </div>
      <p className="mt-4 text-[30px] font-semibold leading-none tracking-[-0.02em] text-ink tabular-nums">
        {Number(value).toLocaleString()}
      </p>
    </Tag>
  );
}

function SubFact({ icon: Icon, label, value, hint, tone }) {
  return (
    <div className="flex items-start gap-3 px-5 py-4 sm:px-6">
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
          tone === "warning" ? "bg-warning-soft text-warning" : "bg-brand-50 text-brand-700",
        )}
      >
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        <p className="text-[14px] text-ink-muted">{label}</p>
        <p className="mt-0.5 text-[26px] font-semibold leading-tight tracking-[-0.02em] text-ink tabular-nums">
          {Number(value).toLocaleString()}
        </p>
        <p className="mt-0.5 text-[13px] text-ink-muted">{hint}</p>
      </div>
    </div>
  );
}

function QuickLink({ icon: Icon, label, text, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-start gap-3.5 rounded-[var(--radius-card)] border border-line bg-surface p-5 text-left shadow-[var(--shadow-card)] transition hover:border-line-strong hover:shadow-[0_8px_24px_rgba(15,28,23,0.08)]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
        <Icon size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-ink">{label}</span>
        <span className="mt-0.5 block text-[14px] text-ink-muted">{text}</span>
      </span>
      <ArrowRight size={16} className="mt-1 shrink-0 text-ink-subtle transition group-hover:translate-x-0.5 group-hover:text-ink" />
    </button>
  );
}

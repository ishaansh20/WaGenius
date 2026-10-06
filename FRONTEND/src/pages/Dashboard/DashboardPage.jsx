import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Megaphone,
  MessageSquareText,
  Plus,
  RefreshCw,
  Send,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import DashboardLayout from "../../components/layout/DashboardLayout";
import { Button, Card, StatusPill, Skeleton } from "../../components/ui";
import useAuthStore from "../../store/authStore";
import api, {
  API_BASE_URL,
  fetchMetaPricing,
  fetchContactSegmentationStats,
} from "../../services/api";
import { cn } from "../../utils/cn";

const FILTERS = [
  { label: "24 hours", value: "1d" },
  { label: "7 days", value: "7d" },
  { label: "30 days", value: "30d" },
  { label: "All time", value: "all" },
];

const COLORS = {
  delivered: "#128c5e",
  failed: "#d64545",
  pending: "#c3cad1",
  grid: "#eceeed",
  axis: "#4d5868",
};

const compactNumber = new Intl.NumberFormat("en-IN", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function formatNumber(value) {
  return compactNumber.format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  const now = new Date();
  const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString("en", { weekday: "short" });
  return d.toLocaleDateString("en", { month: "short", day: "numeric" });
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const tooltipStyle = {
  border: "1px solid #e6e8e3",
  borderRadius: 10,
  fontSize: 13,
  boxShadow: "0 12px 32px rgba(15,28,23,0.12)",
  padding: "8px 12px",
};

/* ── Small building blocks ─────────────────────────────────────────── */

function SectionCard({ title, description, action, className, children }) {
  return (
    <Card className={cn("flex flex-col", className)}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-[17px] font-semibold text-ink">{title}</h2>
          {description && <p className="mt-1 text-[14px] text-ink-muted">{description}</p>}
        </div>
        {action}
      </div>
      <div className="flex-1">{children}</div>
    </Card>
  );
}

function Empty({ icon: Icon = Megaphone, title, description, action }) {
  return (
    <div className="flex h-full min-h-[180px] flex-col items-center justify-center rounded-xl bg-canvas px-6 py-8 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-ink-muted shadow-[var(--shadow-card)]">
        <Icon size={20} />
      </span>
      <p className="mt-4 text-[15px] font-semibold text-ink">{title}</p>
      <p className="mt-1 max-w-xs text-[14px] text-ink-muted">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function PeriodPicker({ value, onChange }) {
  return (
    <div role="tablist" aria-label="Time period" className="inline-flex rounded-lg border border-line bg-surface p-1">
      {FILTERS.map((item) => {
        const active = value === item.value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={cn(
              "h-8 whitespace-nowrap rounded-md px-3 text-[14px] font-medium transition-colors",
              active ? "bg-brand-900 text-white" : "text-ink-muted hover:bg-canvas hover:text-ink",
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

function KpiCard({ label, value, caption, icon: Icon, onClick, tone = "default" }) {
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
          <Icon size={16} className={tone === "danger" ? "text-danger" : "text-brand-600"} />
          {label}
        </span>
        {onClick && (
          <ArrowRight size={16} className="text-ink-subtle transition group-hover:translate-x-0.5 group-hover:text-ink" />
        )}
      </div>
      <p
        className={cn(
          "mt-4 text-[32px] font-semibold leading-none tracking-[-0.02em] tabular-nums",
          tone === "danger" ? "text-danger" : "text-ink",
        )}
      >
        {value}
      </p>
      <p className="mt-2 text-[13px] text-ink-muted">{caption}</p>
    </Tag>
  );
}

function AccountFact({ label, value, hint }) {
  return (
    <div className="min-w-0 px-5 py-4">
      <p className="text-[13px] text-ink-muted">{label}</p>
      <p className="mt-1 truncate text-[16px] font-semibold text-ink">{value}</p>
      {hint && <p className="mt-0.5 text-[13px] text-ink-muted">{hint}</p>}
    </div>
  );
}

function BreakdownRow({ label, value, color, percent }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span className="flex items-center gap-2.5 text-[14px] text-ink">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
        {label}
      </span>
      <span className="flex items-baseline gap-2 tabular-nums">
        <span className="text-[15px] font-semibold text-ink">{formatNumber(value)}</span>
        <span className="w-10 text-right text-[13px] text-ink-muted">{percent}%</span>
      </span>
    </div>
  );
}

function CountList({ items, labelKey, capitalize = false }) {
  const max = Math.max(...items.map((item) => item.count || item.total || 0), 1);
  return (
    <ul className="space-y-3.5">
      {items.map((item) => {
        const count = item.count ?? item.total ?? 0;
        return (
          <li key={item[labelKey]}>
            <div className="mb-1.5 flex items-center justify-between gap-3 text-[14px]">
              <span className={cn("truncate text-ink", capitalize && "capitalize")}>{item[labelKey]}</span>
              <span className="font-semibold text-ink tabular-nums">{count}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[#eceeed]">
              <div className="h-full rounded-full bg-brand-600" style={{ width: `${(count / max) * 100}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/* ── Page ──────────────────────────────────────────────────────────── */

function DashboardPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [campaigns, setCampaigns] = useState([]);
  const [filter, setFilter] = useState("7d");
  const [loading, setLoading] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [accountHealth, setAccountHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [metaPricing, setMetaPricing] = useState(null);
  const [metaPricingLoading, setMetaPricingLoading] = useState(false);
  const [segmentationStats, setSegmentationStats] = useState(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`${API_BASE_URL}/api/campaigns`);
      setCampaigns(Array.isArray(data) ? data : []);
    } catch (error) {
      console.log(error);
      setCampaigns([]);
    } finally {
      setLoading(false);
      setIsFirstLoad(false);
    }
  };

  const fetchAccountHealth = async (force = false) => {
    try {
      setHealthLoading(true);
      const { data } = await api.get("/api/meta-account/health", {
        params: force ? { force: "true" } : undefined,
      });
      setAccountHealth(data);
    } catch (error) {
      console.log(error);
      setAccountHealth({ available: false });
    } finally {
      setHealthLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    fetchAccountHealth();
    fetchContactSegmentationStats().then(setSegmentationStats).catch(() => setSegmentationStats(null));
  }, []);

  // Real Meta billing data is bucketed by actual send date server-side, not
  // by campaign.createdAt — it can't be sliced client-side from one fetch
  // the way the estimate used to be, so this refetches whenever the
  // filter (which doubles as the `range` param) changes.
  useEffect(() => {
    setMetaPricingLoading(true);
    fetchMetaPricing(filter)
      .then(setMetaPricing)
      .catch(() => setMetaPricing({ available: false }))
      .finally(() => setMetaPricingLoading(false));
  }, [filter]);

  const filteredCampaigns = useMemo(() => {
    const now = new Date();
    return campaigns.filter((campaign) => {
      if (filter === "all") return true;
      const createdAt = new Date(campaign.createdAt);
      const diff = (now - createdAt) / (1000 * 60 * 60 * 24);
      if (filter === "1d") return diff <= 1;
      if (filter === "7d") return diff <= 7;
      if (filter === "30d") return diff <= 30;
      return true;
    });
  }, [campaigns, filter]);

  const stats = useMemo(() => {
    const totalCampaigns = filteredCampaigns.length;
    // Counts contacts already marked sent/delivered/read on the campaign
    // doc — a "successfully processed" count, not a distinct "sent" stage.
    const delivered = filteredCampaigns.reduce((sum, c) => sum + (c.sentCount || 0), 0);
    const failed = filteredCampaigns.reduce((sum, c) => sum + (c.failedCount || 0), 0);
    // Total contact-slots across every campaign send — the same person
    // targeted by 3 campaigns counts 3 times here. This is what delivered/
    // failed/pending need to add up against below, since those are also
    // send-event counts, not unique-people counts.
    const totalSlots = filteredCampaigns.reduce((sum, c) => sum + (c.totalContacts || 0), 0);
    // Unique people ever targeted, deduped by phone across every campaign
    // in view — what "Audience" should mean (reach), as opposed to
    // totalSlots above (send volume, which double-counts repeat contacts).
    const uniquePhones = new Set();
    filteredCampaigns.forEach((c) => {
      (c.contacts || []).forEach((contact) => {
        if (contact.phone) uniquePhones.add(contact.phone);
      });
    });
    const audience = uniquePhones.size;
    const running = filteredCampaigns.filter((c) => ["processing", "running"].includes(c.status)).length;
    const scheduled = filteredCampaigns.filter((c) => c.status === "scheduled").length;
    const attempted = delivered + failed;
    // Of contacts actually attempted so far, what fraction succeeded — not
    // skewed low by contacts a still-running campaign hasn't reached yet.
    const successRate = attempted > 0 ? Math.round((delivered / attempted) * 100) : 0;
    // Same units as delivered/totalSlots above (send-event counts) — kept
    // distinct from `audience` (unique people), which is a different unit.
    const failureRate = totalSlots > 0 ? Math.round((failed / totalSlots) * 100) : 0;
    return { totalCampaigns, delivered, failed, totalSlots, audience, running, scheduled, successRate, failureRate };
  }, [filteredCampaigns]);

  // Real WhatsApp billing spend for the selected range, straight from Meta
  // — not derived from filteredCampaigns, since Meta buckets by actual send
  // date server-side, not by campaign.createdAt.
  const totalSpend = metaPricing?.available ? metaPricing.actual?.totalCost ?? null : null;

  const trendData = useMemo(() => {
    const grouped = {};
    filteredCampaigns.forEach((campaign) => {
      const date = new Date(campaign.createdAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      });
      if (!grouped[date]) {
        grouped[date] = { date, campaigns: 0, sent: 0, failed: 0, sortDate: new Date(campaign.createdAt) };
      }
      grouped[date].campaigns += 1;
      grouped[date].sent += campaign.sentCount || 0;
      grouped[date].failed += campaign.failedCount || 0;
    });
    return Object.values(grouped).sort((a, b) => a.sortDate - b.sortDate);
  }, [filteredCampaigns]);

  const typeData = useMemo(() => {
    const grouped = {};
    filteredCampaigns.forEach((campaign) => {
      const raw = (campaign.campaignType || "Other").trim();
      // Group case-insensitively ("Followup" and "followup" are the same
      // category) but always display a consistent capitalization.
      const key = raw.toLowerCase();
      const label = key.charAt(0).toUpperCase() + key.slice(1);
      grouped[key] = { type: label, total: (grouped[key]?.total || 0) + 1 };
    });
    return Object.values(grouped).sort((a, b) => b.total - a.total);
  }, [filteredCampaigns]);

  const recentCampaigns = useMemo(
    () => [...filteredCampaigns].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5),
    [filteredCampaigns],
  );

  const pending = Math.max(stats.totalSlots - stats.delivered - stats.failed, 0);
  const deliveryData = [
    { name: "Delivered", value: stats.delivered, color: COLORS.delivered },
    { name: "Failed", value: stats.failed, color: COLORS.failed },
    { name: "Pending", value: pending, color: COLORS.pending },
  ];
  const deliveryTotal = stats.delivered + stats.failed + pending;
  const pct = (value) => (deliveryTotal ? Math.round((value / deliveryTotal) * 100) : 0);

  const spendValue =
    totalSpend !== null
      ? `${metaPricing?.currency === "INR" ? "₹" : metaPricing?.currency || ""}${totalSpend.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : metaPricingLoading
        ? "…"
        : "—";

  const periodLabel = FILTERS.find((item) => item.value === filter)?.label.toLowerCase();
  const refreshing = healthLoading || loading;
  const firstName = user?.name?.split(" ")[0];

  const header = (
    <div className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-ink sm:text-[32px]">
          {greeting()}
          {firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="mt-1.5 text-[16px] text-ink-muted">Here's how your WhatsApp campaigns are doing.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <PeriodPicker value={filter} onChange={setFilter} />
        <Button
          variant="secondary"
          size="icon"
          onClick={() => Promise.all([fetchAccountHealth(true), fetchDashboard()])}
          disabled={refreshing}
          aria-label="Refresh dashboard"
          title="Refresh dashboard"
        >
          <RefreshCw size={16} className={cn(refreshing && "animate-spin")} />
        </Button>
        <Button leftIcon={Plus} onClick={() => navigate("/campaigns/upload")}>
          New campaign
        </Button>
      </div>
    </div>
  );

  /* ── First-load skeleton ── */
  if (isFirstLoad && loading) {
    return (
      <DashboardLayout title="Dashboard">
        {header}
        <div className="space-y-5">
          <Skeleton className="h-[92px] w-full rounded-[var(--radius-card)]" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-[132px] rounded-[var(--radius-card)]" />
            ))}
          </div>
          <Skeleton className="h-[380px] w-full rounded-[var(--radius-card)]" />
        </div>
      </DashboardLayout>
    );
  }

  const qualityLabel = accountHealth?.available ? accountHealth.qualityLabel : accountHealth ? "Unavailable" : "Checking…";
  const tierLabel = accountHealth?.available ? accountHealth.messagingTierLabel : accountHealth ? "Unavailable" : "Checking…";

  return (
    <DashboardLayout title="Dashboard">
      {header}

      <div className="space-y-5">
        {/* ── Account status ── */}
        <Card padded={false} className="grid grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-line [&>*:nth-child(-n+2)]:border-b [&>*:nth-child(-n+2)]:border-line lg:[&>*:nth-child(-n+2)]:border-b-0">
          <div className="flex items-center gap-3 px-5 py-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
              <CheckCircle2 size={20} />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] text-ink-muted">WhatsApp</p>
              <p className="text-[16px] font-semibold text-ink">Connected</p>
            </div>
          </div>
          <AccountFact label="Quality rating" value={qualityLabel} />
          <AccountFact label="Messaging limit" value={tierLabel} />
          <AccountFact
            label="Campaigns in progress"
            value={`${stats.running} running`}
            hint={`${stats.scheduled} scheduled`}
          />
        </Card>

        {/* ── Key numbers ── */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
          <KpiCard
            label="Campaigns"
            value={stats.totalCampaigns}
            caption={`Created in the last ${periodLabel}`}
            icon={Megaphone}
            onClick={() => navigate("/campaigns/history")}
          />
          <KpiCard
            label="Delivered"
            value={formatNumber(stats.delivered)}
            caption={`${stats.successRate}% of attempted messages`}
            icon={Send}
          />
          <KpiCard
            label="People reached"
            value={formatNumber(stats.audience)}
            caption="Unique contacts messaged"
            icon={Users}
          />
          <KpiCard
            label="Failed"
            value={formatNumber(stats.failed)}
            caption={`${stats.failureRate}% of all sends`}
            icon={XCircle}
            tone={stats.failed > 0 ? "danger" : "default"}
          />
          <KpiCard
            label="WhatsApp spend"
            value={spendValue}
            caption={filter === "all" ? "Billed by Meta, last 365 days" : "Billed by Meta"}
            icon={Wallet}
          />
        </section>

        {/* ── Charts ── */}
        <section className="grid gap-5 xl:grid-cols-3">
          <SectionCard
            className="xl:col-span-2"
            title="Messages delivered"
            description="Delivered messages by the day each campaign was created"
          >
            {trendData.length ? (
              <div className="h-[280px] sm:h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                    <defs>
                      <linearGradient id="deliveredFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={COLORS.delivered} stopOpacity={0.16} />
                        <stop offset="100%" stopColor={COLORS.delivered} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke={COLORS.grid} vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: COLORS.axis, fontSize: 13 }}
                      axisLine={false}
                      tickLine={false}
                      dy={8}
                    />
                    <YAxis
                      tick={{ fill: COLORS.axis, fontSize: 13 }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip contentStyle={tooltipStyle} labelStyle={{ fontWeight: 600, color: "#0f1c17" }} />
                    <Area
                      type="monotone"
                      dataKey="sent"
                      name="Delivered"
                      stroke={COLORS.delivered}
                      strokeWidth={2.25}
                      fill="url(#deliveredFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <Empty
                title="No campaigns in this period"
                description="Send a campaign and its deliveries will show up here."
                action={
                  <Button size="sm" variant="secondary" onClick={() => navigate("/campaigns/upload")}>
                    Create a campaign
                  </Button>
                }
              />
            )}
          </SectionCard>

          <SectionCard title="Delivery status" description={`All messages from the last ${periodLabel}`}>
            {deliveryTotal ? (
              <>
                <div className="relative h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={deliveryData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius="68%"
                        outerRadius="92%"
                        paddingAngle={2}
                        stroke="none"
                      >
                        {deliveryData.map((item) => (
                          <Cell key={item.name} fill={item.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[26px] font-semibold leading-none text-ink tabular-nums">{stats.successRate}%</span>
                    <span className="mt-1 text-[13px] text-ink-muted">success rate</span>
                  </div>
                </div>
                <div className="mt-4 divide-y divide-line border-t border-line">
                  {deliveryData.map((item) => (
                    <BreakdownRow
                      key={item.name}
                      label={item.name}
                      value={item.value}
                      color={item.color}
                      percent={pct(item.value)}
                    />
                  ))}
                </div>
              </>
            ) : (
              <Empty icon={Send} title="Nothing sent yet" description="Delivery results appear once a campaign goes out." />
            )}
          </SectionCard>
        </section>

        {/* ── Recent campaigns + attention ── */}
        <section className="grid gap-5 xl:grid-cols-3">
          <SectionCard
            className="xl:col-span-2"
            title="Recent campaigns"
            action={
              <button
                type="button"
                onClick={() => navigate("/campaigns/history")}
                className="inline-flex items-center gap-1 text-[14px] font-medium text-brand-700 hover:text-brand-900"
              >
                View all <ArrowRight size={15} />
              </button>
            }
          >
            {recentCampaigns.length ? (
              <ul className="-mx-2 divide-y divide-line">
                {recentCampaigns.map((campaign) => (
                  <li key={campaign._id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/campaigns/${campaign._id}/analytics`)}
                      className="flex w-full items-center gap-4 rounded-lg px-2 py-3.5 text-left transition hover:bg-canvas"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                        <Megaphone size={18} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-semibold text-ink">{campaign.campaignName}</p>
                        <p className="mt-0.5 truncate text-[13px] text-ink-muted">
                          {campaign.campaignType || "Campaign"} · {formatDate(campaign.createdAt)} ·{" "}
                          {formatNumber(campaign.totalContacts)} contacts
                        </p>
                      </div>
                      <StatusPill status={campaign.status || "draft"} />
                      <ChevronRight size={18} className="shrink-0 text-ink-subtle" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty
                title="No campaigns yet"
                description="Your latest campaigns will be listed here."
                action={
                  <Button size="sm" onClick={() => navigate("/campaigns/upload")} leftIcon={Plus}>
                    New campaign
                  </Button>
                }
              />
            )}
          </SectionCard>

          <SectionCard title="Needs attention">
            <div className="space-y-3">
              {stats.failed > 0 && (
                <button
                  type="button"
                  onClick={() => navigate("/campaigns/history")}
                  className="flex w-full items-start gap-3 rounded-xl border border-[#f3cccc] bg-danger-soft p-4 text-left transition hover:border-danger/40"
                >
                  <AlertTriangle size={18} className="mt-0.5 shrink-0 text-danger" />
                  <span>
                    <span className="block text-[15px] font-semibold text-ink">
                      {stats.failed} {stats.failed === 1 ? "message" : "messages"} failed
                    </span>
                    <span className="mt-0.5 block text-[14px] text-ink-muted">Open the campaign to see why and retry.</span>
                  </span>
                </button>
              )}
              {stats.running > 0 && (
                <div className="flex items-start gap-3 rounded-xl border border-line bg-canvas p-4">
                  <RefreshCw size={18} className="mt-0.5 shrink-0 text-info" />
                  <span>
                    <span className="block text-[15px] font-semibold text-ink">
                      {stats.running} {stats.running === 1 ? "campaign is" : "campaigns are"} sending
                    </span>
                    <span className="mt-0.5 block text-[14px] text-ink-muted">Numbers update as messages are delivered.</span>
                  </span>
                </div>
              )}
              {stats.scheduled > 0 && (
                <div className="flex items-start gap-3 rounded-xl border border-line bg-canvas p-4">
                  <Clock3 size={18} className="mt-0.5 shrink-0 text-warning" />
                  <span>
                    <span className="block text-[15px] font-semibold text-ink">
                      {stats.scheduled} scheduled {stats.scheduled === 1 ? "campaign" : "campaigns"}
                    </span>
                    <span className="mt-0.5 block text-[14px] text-ink-muted">They'll send automatically at the set time.</span>
                  </span>
                </div>
              )}
              {!stats.failed && !stats.running && !stats.scheduled && (
                <div className="flex items-start gap-3 rounded-xl border border-brand-100 bg-brand-50 p-4">
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-brand-700" />
                  <span>
                    <span className="block text-[15px] font-semibold text-ink">Everything looks good</span>
                    <span className="mt-0.5 block text-[14px] text-ink-muted">No failed messages or campaigns in progress.</span>
                  </span>
                </div>
              )}
              <Button
                variant="secondary"
                className="w-full"
                leftIcon={MessageSquareText}
                onClick={() => navigate("/inbox")}
              >
                Open inbox
              </Button>
            </div>
          </SectionCard>
        </section>

        {/* ── Breakdown ── */}
        <section className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
          <SectionCard title="Campaign types" description={`Campaigns from the last ${periodLabel}`}>
            {typeData.length ? (
              <CountList items={typeData} labelKey="type" />
            ) : (
              <Empty title="No campaigns yet" description="Types appear once you've sent campaigns." />
            )}
          </SectionCard>

          {segmentationStats && (
            <SectionCard title="Contacts by tag" description="Your most used tags">
              {segmentationStats.byTag.length ? (
                <CountList items={segmentationStats.byTag.slice(0, 6)} labelKey="tag" />
              ) : (
                <Empty icon={Users} title="No tags yet" description="Tag contacts to group and target them." />
              )}
            </SectionCard>
          )}

          {segmentationStats && (
            <SectionCard title="Your audience" description="Where contacts came from and who opted in">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-brand-50 p-4">
                  <p className="text-[13px] text-brand-800">Opted in</p>
                  <p className="mt-1 text-[24px] font-semibold text-brand-900 tabular-nums">
                    {formatNumber(segmentationStats.optedIn)}
                  </p>
                </div>
                <div className="rounded-xl bg-canvas p-4">
                  <p className="text-[13px] text-ink-muted">Opted out</p>
                  <p className="mt-1 text-[24px] font-semibold text-ink tabular-nums">
                    {formatNumber(segmentationStats.optedOut)}
                  </p>
                </div>
              </div>
              {segmentationStats.bySource.length > 0 && (
                <div className="mt-5">
                  <CountList items={segmentationStats.bySource} labelKey="source" capitalize />
                </div>
              )}
            </SectionCard>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}

export default DashboardPage;

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock3,
  MessageSquareText,
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
import api, { API_BASE_URL, fetchMetaPricing, fetchContactSegmentationStats } from "../../services/api";
import { cn } from "../../utils/cn";

const FILTERS = [
  { label: "24h", value: "1d" },
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
  { label: "All", value: "all" },
];

const TYPE_PALETTE = ["#6366f1", "#059669", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899"];

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

function statusCls(status) {
  const s = (status || "draft").toLowerCase();
  if (["completed", "done"].includes(s)) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (["running", "processing"].includes(s)) return "bg-amber-50 text-amber-700 border-amber-200";
  if (s === "scheduled") return "bg-sky-50 text-sky-700 border-sky-200";
  if (["failed", "error"].includes(s)) return "bg-rose-50 text-rose-700 border-rose-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

function SectionTitle({ eyebrow, title }) {
  return (
    <div className="mb-4 border-b border-slate-100 pb-3">
      <p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
        {eyebrow}
      </p>
      <h2 className="text-[13.5px] font-semibold text-slate-900">{title}</h2>
    </div>
  );
}

function EmptyState({ title, description }) {
  return (
    <div className="flex min-h-[180px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 px-5 text-center">
      <Activity className="h-5 w-5 text-slate-300" />
      <p className="mt-3 text-sm font-medium text-slate-600">{title}</p>
      <p className="mt-1 max-w-xs text-xs leading-5 text-slate-400">{description}</p>
    </div>
  );
}

function DashboardPage() {
  const navigate = useNavigate();
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
    // skewed low by contacts a still-running campaign hasn't reached yet
    // (delivered/totalContacts would dip during a campaign's normal
    // in-progress window and look like a problem when there isn't one).
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
      // category) but always display a consistent capitalization, rather
      // than whichever casing happened to appear first in the list.
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

  const deliveryData = [
    { name: "Delivered", value: stats.delivered, color: "#059669" },
    { name: "Failed", value: stats.failed, color: "#dc2626" },
    { name: "Pending", value: Math.max(stats.totalSlots - stats.delivered - stats.failed, 0), color: "#64748b" },
  ];

  const statItems = [
    {
      label: "Campaigns",
      value: stats.totalCampaigns,
      caption: "campaigns in period",
      icon: Bot,
      route: "/campaigns/history",
      accent: "border-l-violet-500",
      iconCls: "bg-violet-50 text-violet-600",
    },
    {
      label: "Delivered",
      value: formatNumber(stats.delivered),
      caption: `${stats.successRate}% success rate`,
      icon: Send,
      accent: "border-l-emerald-500",
      iconCls: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Audience",
      value: formatNumber(stats.audience),
      caption: "unique contacts reached",
      icon: Users,
      accent: "border-l-blue-500",
      iconCls: "bg-blue-50 text-blue-600",
    },
    {
      label: "Failed",
      value: stats.failed,
      caption: `${stats.failureRate}% of sends`,
      icon: XCircle,
      accent: "border-l-rose-500",
      iconCls: "bg-rose-50 text-rose-600",
    },
    {
      label: "Total Spend",
      value:
        totalSpend !== null
          ? `${metaPricing?.currency === "INR" ? "₹" : (metaPricing?.currency || "")}${totalSpend.toFixed(2)}`
          : metaPricingLoading
            ? "…"
            : "—",
      caption:
        filter === "all"
          ? "actual WhatsApp billing spend, via Meta (capped at 365 days)"
          : "actual WhatsApp billing spend, via Meta",
      icon: Wallet,
      accent: "border-l-amber-500",
      iconCls: "bg-amber-50 text-amber-600",
    },
  ];

  /* ── First-load skeleton ── */
  if (isFirstLoad && loading) {
    return (
      <DashboardLayout title="Dashboard">
        <div className="flex flex-col items-center justify-center gap-3 py-32">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-500" />
          <p className="text-[13px] text-slate-500">Loading dashboard…</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-4 sm:space-y-5">

        {/* ── Hero ── */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(320px,380px)]">
            <div className="flex flex-col justify-between px-5 py-6 sm:px-7 lg:px-8">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      </span>
                      WhatsApp connected
                    </span>

                    {accountHealth?.available ? (
                      <>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
                          Quality: <span className="font-semibold text-slate-800">{accountHealth.qualityLabel}</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
                          Tier: <span className="font-semibold text-slate-800">{accountHealth.messagingTierLabel}</span>
                        </span>
                      </>
                    ) : accountHealth && !accountHealth.available ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-400">
                        Account health unavailable
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => Promise.all([fetchAccountHealth(true), fetchDashboard()])}
                      disabled={healthLoading || loading}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700 disabled:opacity-50"
                      aria-label="Refresh dashboard"
                      title="Refresh dashboard"
                    >
                      <RefreshCw className={cn("h-3.5 w-3.5", (healthLoading || loading) && "animate-spin")} />
                    </button>
                  </div>
                </div>

                <div className="mt-6">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                    Operations
                  </p>
                  <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-950 sm:text-[28px]">
                    Campaign Dashboard
                  </h1>
                  <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                    Delivery health, audience reach, and campaign alerts — all in one place.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() => navigate("/campaigns/upload")}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                >
                  <Bot className="h-4 w-4" />
                  New campaign
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/inbox")}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <MessageSquareText className="h-4 w-4" />
                  Open inbox
                </button>
              </div>
            </div>

            <div className="border-t border-slate-200 bg-slate-50/70 p-5 lg:border-l lg:border-t-0">
              <div className="flex h-full flex-col gap-4">
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Timeframe
                    </p>
                    {loading && (
                      <span className="text-[11px] font-medium text-slate-400">Syncing…</span>
                    )}
                  </div>
                  <div className="grid grid-cols-4 rounded-lg border border-slate-200 bg-white p-1">
                    {FILTERS.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setFilter(item.value)}
                        className={cn(
                          "h-8 rounded-md text-sm font-semibold transition",
                          filter === item.value
                            ? "bg-slate-950 text-white shadow-sm"
                            : "text-slate-400 hover:text-slate-800",
                        )}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid flex-1 grid-cols-2 gap-3">
                  <div className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Running
                    </p>
                    <div>
                      <p className="text-3xl font-bold tracking-tight text-slate-950">{stats.running}</p>
                      <p className="mt-0.5 text-[11px] text-slate-400">active now</p>
                    </div>
                  </div>
                  <div className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Scheduled
                    </p>
                    <div>
                      <p className="text-3xl font-bold tracking-tight text-slate-950">{stats.scheduled}</p>
                      <p className="mt-0.5 text-[11px] text-slate-400">queued up</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Stat cards ── */}
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {statItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => item.route && navigate(item.route)}
                className={cn(
                  "group flex flex-col rounded-xl border border-l-4 border-slate-200 bg-white p-5 text-left shadow-sm transition",
                  item.accent,
                  item.route ? "hover:border-slate-300 hover:shadow-md" : "cursor-default",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className={cn("inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", item.iconCls)}>
                    <Icon className="h-4 w-4" />
                  </span>
                  {item.route && (
                    <ArrowRight className="mt-0.5 h-3.5 w-3.5 text-slate-300 transition group-hover:text-slate-500" />
                  )}
                </div>
                <div className="mt-5">
                  <p className="text-[26px] font-bold leading-none tracking-tight text-slate-950 tabular-nums">
                    {item.value}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-600">{item.label}</p>
                    <p className="text-[11px] tabular-nums text-slate-400">{item.caption}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </section>

        {/* ── Charts ── */}
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.75fr)]">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:p-6">
            <SectionTitle eyebrow="Trend" title="Campaign activity" />
            {trendData.length ? (
              <div className="h-[260px] sm:h-[300px] lg:h-[340px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="sentGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#059669" stopOpacity={0.14} />
                        <stop offset="100%" stopColor="#059669" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#f1f5f9" strokeDasharray="4 4" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#94a3b8", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#94a3b8", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        border: "1px solid #e2e8f0",
                        borderRadius: 8,
                        fontSize: 12,
                        boxShadow: "0 8px 24px rgba(15,23,42,0.1)",
                        padding: "8px 12px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="sent"
                      name="Delivered"
                      stroke="#059669"
                      strokeWidth={2}
                      fill="url(#sentGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState
                title="No activity yet"
                description="Launch a campaign to see delivery trends."
              />
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:p-6">
            <SectionTitle eyebrow="Health" title="Message breakdown" />
            <div className="flex flex-col gap-4">
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={deliveryData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="55%"
                      outerRadius="80%"
                      paddingAngle={3}
                    >
                      {deliveryData.map((item) => (
                        <Cell key={item.name} fill={item.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-slate-50/60">
                {deliveryData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-[13px] font-medium text-slate-700">{item.name}</span>
                    </div>
                    <span className="text-[13px] font-bold tabular-nums text-slate-950">{formatNumber(item.value)}</span>
                  </div>
                ))}
                {stats.totalSlots > 0 && (
                  <div className="flex items-center justify-between gap-3 bg-slate-100/60 px-4 py-2.5">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                      Success rate
                    </span>
                    <span className="text-[13px] font-bold tabular-nums text-emerald-600">
                      {stats.successRate}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── Bottom row ── */}
        <section className="grid gap-4 xl:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <SectionTitle eyebrow="Recent" title="Latest campaigns" />
            {recentCampaigns.length ? (
              <div className="divide-y divide-slate-100">
                {recentCampaigns.map((campaign) => (
                  <button
                    key={campaign._id}
                    type="button"
                    onClick={() => navigate(`/campaigns/${campaign._id}/analytics`)}
                    className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-3 text-left transition hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-semibold text-slate-950">
                        {campaign.campaignName}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {campaign.campaignType || "Campaign"} · {formatDate(campaign.createdAt)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize",
                        statusCls(campaign.status),
                      )}
                    >
                      {campaign.status || "draft"}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No campaigns yet"
                description="Recent campaigns appear here once your team starts sending."
              />
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <SectionTitle eyebrow="Mix" title="Campaign types" />
            {typeData.length ? (
              <div className="space-y-4">
                {typeData.map((item, i) => (
                  <div key={item.type}>
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <span className="truncate text-[13px] font-medium text-slate-700">{item.type}</span>
                      <span className="text-[13px] font-bold tabular-nums text-slate-950">{item.total}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${filteredCampaigns.length ? (item.total / filteredCampaigns.length) * 100 : 0}%`,
                          backgroundColor: TYPE_PALETTE[i % TYPE_PALETTE.length],
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No data"
                description="Campaign type mix appears when data is available."
              />
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <SectionTitle eyebrow="Alerts" title="Operational queue" />
            <div className="space-y-2.5">
              {stats.failed > 0 && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3">
                  <div className="flex items-center gap-2 text-[13px] font-semibold text-rose-700">
                    <XCircle className="h-4 w-4 shrink-0" />
                    {stats.failed} failed contacts
                  </div>
                  <p className="mt-1 text-[11.5px] text-rose-500">Review and retry failed deliveries.</p>
                </div>
              )}
              {stats.running > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                  <div className="flex items-center gap-2 text-[13px] font-semibold text-amber-700">
                    <RefreshCw className="h-4 w-4 shrink-0" />
                    {stats.running} running
                  </div>
                  <p className="mt-1 text-[11.5px] text-amber-500">Monitor live delivery movement.</p>
                </div>
              )}
              {stats.scheduled > 0 && (
                <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3">
                  <div className="flex items-center gap-2 text-[13px] font-semibold text-sky-700">
                    <Clock3 className="h-4 w-4 shrink-0" />
                    {stats.scheduled} scheduled
                  </div>
                  <p className="mt-1 text-[11.5px] text-sky-500">Queued for later delivery.</p>
                </div>
              )}
              {!stats.failed && !stats.running && !stats.scheduled && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <div className="flex items-center gap-2 text-[13px] font-semibold text-emerald-700">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    All systems healthy
                  </div>
                  <p className="mt-1 text-[11.5px] text-emerald-500">No delivery issues or active alerts.</p>
                </div>
              )}
              <button
                type="button"
                onClick={() => navigate("/campaigns/history")}
                className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Campaign history
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </section>

        {segmentationStats && (
          <section className="grid gap-4 xl:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <SectionTitle eyebrow="Address Book" title="Contacts by tag" />
              {segmentationStats.byTag.length ? (
                <div className="space-y-2.5">
                  {segmentationStats.byTag.slice(0, 6).map((item) => (
                    <div key={item.tag} className="flex items-center justify-between gap-3">
                      <span className="truncate text-[13px] text-slate-700">{item.tag}</span>
                      <span className="text-[13px] font-semibold tabular-nums text-slate-950">{item.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState title="No tags yet" description="Tag contacts to see a breakdown here." />
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <SectionTitle eyebrow="Address Book" title="Contacts by source" />
              {segmentationStats.bySource.length ? (
                <div className="space-y-2.5">
                  {segmentationStats.bySource.map((item) => (
                    <div key={item.source} className="flex items-center justify-between gap-3">
                      <span className="truncate text-[13px] capitalize text-slate-700">{item.source}</span>
                      <span className="text-[13px] font-semibold tabular-nums text-slate-950">{item.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState title="No data" description="Contact sources appear here." />
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <SectionTitle eyebrow="Consent" title="Opt-in status" />
              <div className="flex items-center justify-center py-2">
                <PieChart width={140} height={140}>
                  <Pie
                    data={[
                      { name: "Opted in", value: segmentationStats.optedIn, color: "#059669" },
                      { name: "Opted out", value: segmentationStats.optedOut, color: "#dc2626" },
                    ]}
                    dataKey="value"
                    innerRadius={40}
                    outerRadius={65}
                  >
                    {[
                      { color: "#059669" },
                      { color: "#dc2626" },
                    ].map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </div>
              <div className="flex items-center justify-center gap-4 text-[12px]">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="h-2 w-2 rounded-full bg-emerald-600" /> Opted in ({segmentationStats.optedIn})
                </span>
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="h-2 w-2 rounded-full bg-red-600" /> Opted out ({segmentationStats.optedOut})
                </span>
              </div>
            </div>
          </section>
        )}

      </div>
    </DashboardLayout>
  );
}

export default DashboardPage;

import { useEffect, useState } from "react";
import { getInboxSocket, joinRoom, leaveRoom } from "../../services/socket";
import api from "../../services/api";
import { useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { formatPhone } from "../../utils/formatPhone";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";
import {
  Activity,
  BarChart3,
  CheckCircle2,
  Clock3,
  Users,
  XCircle,
  Send,
} from "lucide-react";
import { contactsToCsvFile } from "../../utils/segmentToCsv";

const socket = getInboxSocket();

// Maps a funnel stage key to the Campaign.contacts field that proves a
// contact reached it — used both for counting and for filtering the
// per-contact table when a stage segment is clicked.
const STAGE_TIMESTAMP_FIELD = {
  sent: "sentAt",
  delivered: "deliveredAt",
  read: "readAt",
  replied: "repliedAt",
  failed: "failedAt",
};

const SEGREGATION_THRESHOLDS = [
  { label: "1 Hour", hours: 1 },
  { label: "3 Hours", hours: 3 },
  { label: "24 Hours", hours: 24 },
];

export default function CampaignAnalyticsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trendData, setTrendData] = useState([]);
  const [lastEventAt, setLastEventAt] = useState(null);
  const [replyAnalytics, setReplyAnalytics] = useState(null);
  const [activeStage, setActiveStage] = useState(null);
  const [segregationThresholdHours, setSegregationThresholdHours] = useState(24);
  const [selectedReplierPhones, setSelectedReplierPhones] = useState(new Set());

  const toTrendPoint = (campaignSnapshot, ts = new Date()) => {
    const timestamp = ts;

    return {
      time: `${timestamp.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}.${String(timestamp.getMilliseconds()).padStart(3, "0")}`,

      eventAt: timestamp.toISOString(),

      sent: campaignSnapshot?.sentCount || 0,
      failed: campaignSnapshot?.failedCount || 0,
      pending: Math.max(
        (campaignSnapshot?.totalContacts || 0) -
          ((campaignSnapshot?.sentCount || 0) +
            (campaignSnapshot?.failedCount || 0)),
        0,
      ),
    };
  };

  const formatEventTime = (isoTime) => {
    if (!isoTime) {
      return "--:--:--";
    }

    const parsed = new Date(isoTime);

    if (Number.isNaN(parsed.getTime())) {
      return "--:--:--";
    }

    return parsed.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  useEffect(() => {
    fetchCampaign();
  }, []);

  const fetchCampaign = async () => {
    try {
      const res = await api.get(`/api/campaigns/${id}`);
      const replyRes = await api.get(`/api/campaigns/${id}/replies`);

      setReplyAnalytics(replyRes.data);
      const data = res.data.campaign;

      setCampaign(data);

      const savedTimeline = (data.deliveryTimeline || []).map((point) => {
        const timestamp = new Date(point.time);

        return {
          time: `${timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}.${String(timestamp.getMilliseconds()).padStart(3, "0")}`,

          eventAt: timestamp.toISOString(),

          sent: point.sent || 0,
          failed: point.failed || 0,
          pending: point.pending || 0,
        };
      });

      setTrendData(savedTimeline);

      if (savedTimeline.length) {
        setLastEventAt(savedTimeline[savedTimeline.length - 1].eventAt);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    joinRoom("campaigns");
    const handleSocketConnect = () => undefined;
    const handleSocketDisconnect = () => undefined;

    socket.on("connect", handleSocketConnect);
    socket.on("disconnect", handleSocketDisconnect);

    const handleCampaignUpdate = (updatedCampaign) => {
      if (updatedCampaign._id.toString() === id) {
        const now = new Date(); // capture arrival time immediately
        setCampaign(updatedCampaign);
        const nextPoint = toTrendPoint(updatedCampaign, now); // use arrival time
        setLastEventAt(nextPoint.eventAt);
        setTrendData((prev) => {
          const last = prev[prev.length - 1];
          if (
            last &&
            last.sent === nextPoint.sent &&
            last.failed === nextPoint.failed
          ) {
            return prev;
          }
          return [...prev.slice(-29), nextPoint];
        });
      }
    };
    socket.on("campaign_updated", handleCampaignUpdate);

    return () => {
      socket.off("connect", handleSocketConnect);
      socket.off("disconnect", handleSocketDisconnect);
      socket.off("campaign_updated", handleCampaignUpdate);
      leaveRoom("campaigns");
    };
  }, [id]);

  if (loading) {
    return <div>Loading...</div>;
  }

  const pendingCount = Math.max(
    (campaign?.totalContacts || 0) - ((campaign?.sentCount || 0) + (campaign?.failedCount || 0)),
    0,
  );

  // Of contacts actually attempted so far, what fraction succeeded — not
  // skewed low by contacts a still-running campaign hasn't reached yet
  // (sentCount/totalContacts would dip during a campaign's normal
  // in-progress window and look like a problem when there isn't one).
  const attemptedCount = (campaign?.sentCount || 0) + (campaign?.failedCount || 0);
  const successRate =
    attemptedCount > 0
      ? Math.round(((campaign?.sentCount || 0) / attemptedCount) * 100)
      : 0;

  const chartData = [
    {
      name: "Delivered",
      value: campaign?.sentCount || 0,
    },
    {
      name: "Failed",
      value: campaign?.failedCount || 0,
    },
    {
      name: "Pending",
      value: pendingCount || 0,
    },
  ];

  const COLORS = ["#10b981", "#ef4444", "#64748b"];

  const responseRate =
    campaign?.sentCount > 0
      ? Math.round(
          ((replyAnalytics?.repliedContactsCount || 0) / campaign.sentCount) *
            100,
        )
      : 0;

  const kpiCards = [
    {
      label: "Total Contacts",
      value: campaign?.totalContacts,
      tone: "slate",
      icon: Users,
    },
    {
      label: "Delivered",
      value: campaign?.sentCount,
      tone: "emerald",
      icon: CheckCircle2,
    },
    {
      label: "Failed",
      value: campaign?.failedCount,
      tone: "rose",
      icon: XCircle,
    },
    {
      label: "Replies",
      value: replyAnalytics?.repliedContactsCount || 0,
      tone: "sky",
      icon: Users,
    },
    {
      label: "Response Rate",
      value: `${responseRate}%`,
      tone: "sky",
      icon: Activity,
    },
  ];

  const deliveryLegend = [
    {
      label: "Delivered",
      value: campaign?.sentCount,
      tone: "emerald",
    },
    {
      label: "Failed",
      value: campaign?.failedCount,
      tone: "rose",
    },
    {
      label: "Pending",
      value: pendingCount,
      tone: "slate",
    },
  ];

  const toneMap = {
    slate: {
      badge: "bg-slate-100 text-slate-700 ring-slate-200",
      accent: "text-slate-700",
      icon: "text-slate-500",
      bar: "bg-slate-500",
    },
    emerald: {
      badge: "bg-emerald-50 text-emerald-700 ring-emerald-100",
      accent: "text-emerald-600",
      icon: "text-emerald-500",
      bar: "bg-emerald-500",
    },
    rose: {
      badge: "bg-rose-50 text-rose-700 ring-rose-100",
      accent: "text-rose-600",
      icon: "text-rose-500",
      bar: "bg-rose-500",
    },
    sky: {
      badge: "bg-sky-50 text-sky-700 ring-sky-100",
      accent: "text-sky-600",
      icon: "text-sky-500",
      bar: "bg-sky-500",
    },
  };

  const contacts = campaign?.contacts || [];

  // Independent counts per stage, computed from real per-contact timestamps
  // rather than the single flattened `status` — a contact can e.g. reply
  // without a read receipt ever confirming, so these aren't a strict
  // breakdown of one another.
  const funnelStages = [
    { key: "sent", label: "Sent", count: contacts.filter((c) => c.sentAt).length },
    { key: "delivered", label: "Delivered", count: contacts.filter((c) => c.deliveredAt).length },
    { key: "read", label: "Read", count: contacts.filter((c) => c.readAt).length },
    { key: "replied", label: "Replied", count: contacts.filter((c) => c.repliedAt).length },
    { key: "clicked", label: "Clicked", comingSoon: true },
    { key: "failed", label: "Failed", count: contacts.filter((c) => c.failedAt).length },
  ];

  const totalContactsForFunnel = campaign?.totalContacts || contacts.length || 0;

  const filteredContacts = activeStage
    ? contacts.filter((c) => c[STAGE_TIMESTAMP_FIELD[activeStage]])
    : contacts;

  // Repliers bucketed by how fast they responded, measured from when they
  // were SENT the message (not read) — so a contact who replied without a
  // read receipt ever confirming still gets bucketed correctly.
  const repliersWithTiming = contacts
    .filter((c) => c.repliedAt)
    .map((c) => ({
      ...c,
      hoursToReply: c.sentAt
        ? (new Date(c.repliedAt) - new Date(c.sentAt)) / (1000 * 60 * 60)
        : null,
    }));

  const untimedRepliers = repliersWithTiming.filter((c) => c.hoursToReply === null);
  const bucketedRepliers = repliersWithTiming.filter(
    (c) => c.hoursToReply !== null && c.hoursToReply <= segregationThresholdHours,
  );

  function toggleReplierSelection(phone) {
    setSelectedReplierPhones((prev) => {
      const next = new Set(prev);
      if (next.has(phone)) next.delete(phone);
      else next.add(phone);
      return next;
    });
  }

  function toggleSelectAllRepliers() {
    setSelectedReplierPhones((prev) => {
      const allSelected =
        bucketedRepliers.length > 0 && bucketedRepliers.every((c) => prev.has(c.phone));
      if (allSelected) return new Set();
      return new Set(bucketedRepliers.map((c) => c.phone));
    });
  }

  function handleBroadcastToRepliers() {
    const selected = bucketedRepliers.filter((c) => selectedReplierPhones.has(c.phone));
    if (selected.length === 0) return;

    const file = contactsToCsvFile(selected, "fast-repliers-followup.csv");
    navigate("/campaigns/upload", {
      state: { prefilledFile: file, prefilledCount: selected.length },
    });
  }

  return (
    <DashboardLayout title="Campaign Analytics">
      <div className="mx-auto flex min-h-screen w-full  overflow-hidden lg:px-4 lg:py-5">
        <div className="flex min-h-screen w-full rounded-none border-0 bg-white/0 shadow-none lg:min-h-[calc(100vh-2.5rem)] lg:rounded-[20px] lg:border lg:border-slate-200/80 lg:bg-white">
          <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7">
            {loading ? (
              <div className="space-y-6">
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="h-4 w-40 animate-pulse rounded-full bg-slate-200" />
                  <div className="mt-3 h-3 w-72 max-w-full animate-pulse rounded-full bg-slate-100" />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={index}
                      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                    >
                      <div className="h-3 w-24 animate-pulse rounded-full bg-slate-200" />
                      <div className="mt-4 h-8 w-20 animate-pulse rounded-full bg-slate-100" />
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="h-4 w-36 animate-pulse rounded-full bg-slate-200" />
                    <div className="mt-5 h-[260px] animate-pulse rounded-xl bg-slate-100" />
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="h-4 w-40 animate-pulse rounded-full bg-slate-200" />
                    <div className="mt-5 space-y-3">
                      {Array.from({ length: 3 }).map((_, index) => (
                        <div
                          key={index}
                          className="h-16 animate-pulse rounded-xl bg-slate-100"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    <BarChart3 className="h-4 w-4 text-slate-400" />
                    Campaign Analytics
                  </div>

                  <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                        Campaign Analytics
                      </h1>

                      <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                        Detailed analytics and performance overview for live
                        campaign operations.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Clock3 className="h-4 w-4 text-slate-400" />
                    </div>
                  </div>
                </div>

                <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Campaign overview
                      </p>
                      <h2 className="mt-1 truncate text-xl font-semibold text-slate-900">
                        {campaign?.campaignName}
                      </h2>
                      <p className="mt-1 truncate text-sm text-slate-500">
                        Campaign ID: {campaign?._id}
                      </p>
                    </div>

                    <div
                      className={`inline-flex items-center gap-2 self-start rounded-lg px-3 py-2 text-sm font-medium ring-1 ${toneMap.emerald.badge}`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${toneMap.emerald.bar}`}
                      />
                      <span className="capitalize">{campaign?.status}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 px-5 py-5 md:grid-cols-2 xl:grid-cols-4">
                    {kpiCards.map((card) => {
                      const Icon = card.icon;
                      const tone = toneMap[card.tone];

                      return (
                        <div
                          key={card.label}
                          className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 transition-colors hover:border-slate-300"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                                {card.label}
                              </p>
                              <h3
                                className={`mt-2 text-2xl font-semibold tracking-tight ${tone.accent}`}
                              >
                                {card.value}
                              </h3>
                            </div>

                            <div
                              className={`rounded-lg border border-slate-200 bg-white p-2 ${tone.icon}`}
                            >
                              <Icon className="h-4 w-4" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-base font-semibold text-slate-900">Funnel</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Click a stage to filter the contact table below
                        {activeStage ? " — click again to clear" : ""}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 px-5 py-5 sm:grid-cols-3 lg:grid-cols-6">
                    {funnelStages.map((stage) => {
                      const percent =
                        !stage.comingSoon && totalContactsForFunnel > 0
                          ? Math.round((stage.count / totalContactsForFunnel) * 100)
                          : null;
                      const isActive = activeStage === stage.key;

                      return (
                        <button
                          key={stage.key}
                          type="button"
                          disabled={stage.comingSoon}
                          onClick={() =>
                            setActiveStage((prev) => (prev === stage.key ? null : stage.key))
                          }
                          className={`rounded-xl border px-3 py-3 text-left transition ${
                            stage.comingSoon
                              ? "cursor-default border-dashed border-slate-200 bg-slate-50/50 opacity-60"
                              : isActive
                                ? "border-emerald-300 bg-emerald-50 ring-1 ring-emerald-200"
                                : "border-slate-200 bg-slate-50/70 hover:border-slate-300"
                          }`}
                        >
                          <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-slate-500">
                            {stage.label}
                          </p>
                          {stage.comingSoon ? (
                            <p className="mt-1.5 text-sm font-medium text-slate-400">
                              — <span className="text-[10px]">Coming soon</span>
                            </p>
                          ) : (
                            <>
                              <p className="mt-1.5 text-xl font-semibold text-slate-900">
                                {stage.count}
                              </p>
                              <p className="text-xs text-slate-500">{percent}%</p>
                            </>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-emerald-500" />

                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Delivery Timeline
                        </p>
                      </div>

                      <h2 className="mt-2 text-lg font-semibold text-slate-900">
                        Campaign Delivery Trends
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        Realtime delivery progression powered by websocket
                        updates.
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                          Success Rate
                        </p>

                        <p className="mt-1 text-sm font-semibold text-emerald-600">
                          {successRate}%
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                          Last Update
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {formatEventTime(lastEventAt)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="h-[340px] min-h-[340px] px-3 py-5 sm:px-5">
                    <ResponsiveContainer width="100%" height={320}>
                      <AreaChart
                        data={trendData}
                        margin={{ top: 6, right: 12, left: -8, bottom: 0 }}
                      >
                        <CartesianGrid vertical={false} stroke="#e2e8f0" />

                        <XAxis
                          tick={{ fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                        />

                        <YAxis tickLine={false} axisLine={false} />

                        <Tooltip
                          contentStyle={{
                            borderRadius: 10,
                            border: "1px solid #e2e8f0",
                            boxShadow: "0 10px 20px rgba(15, 23, 42, 0.08)",
                          }}
                          labelFormatter={(_, payload) => {
                            const point = payload?.[0]?.payload;
                            return `Updated ${formatEventTime(point?.eventAt)}`;
                          }}
                        />

                        <Area
                          type="monotone"
                          dataKey="sent"
                          stroke="#10b981"
                          fill="url(#sentGradient)"
                          strokeWidth={2.5}
                          dot={false}
                        />
                        <defs>
                          <linearGradient
                            id="sentGradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#10b981"
                              stopOpacity={0.18}
                            />
                            <stop
                              offset="100%"
                              stopColor="#10b981"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </section>

                <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-base font-semibold text-slate-900">
                        Delivery Breakdown
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Sent vs failed vs pending contacts
                      </p>
                    </div>

                    <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                      <BarChart3 className="h-4 w-4 text-slate-400" />
                      Distribution overview
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6 px-5 py-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-center">
                    <div className="h-[280px] min-h-[280px]">
                      <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                          <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={64}
                            outerRadius={100}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {chartData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index % COLORS.length]}
                              />
                            ))}
                          </Pie>

                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1">
                      {deliveryLegend.map((item) => {
                        const tone = toneMap[item.tone];

                        return (
                          <div
                            key={`legend-${item.label}`}
                            className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`h-2.5 w-2.5 rounded-full ${tone.bar}`}
                                />
                                <p className="text-sm font-medium text-slate-800">
                                  {item.label}
                                </p>
                              </div>
                              <p className="mt-1 text-xs text-slate-500">
                                Delivery segment
                              </p>
                            </div>

                            <p
                              className={`text-lg font-semibold tracking-tight ${tone.accent}`}
                            >
                              {item.value}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>

                {repliersWithTiming.length > 0 && (
                  <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h2 className="text-base font-semibold text-slate-900">
                          Smart Segregation
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                          Replied In
                        </p>
                      </div>

                      <div className="inline-flex items-center gap-0.5 rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                        {SEGREGATION_THRESHOLDS.map((t) => (
                          <button
                            key={t.hours}
                            type="button"
                            onClick={() => setSegregationThresholdHours(t.hours)}
                            className={`rounded-md px-3 py-1.5 text-[12.5px] font-medium transition ${
                              segregationThresholdHours === t.hours
                                ? "bg-white text-slate-900 shadow-sm"
                                : "text-slate-500 hover:text-slate-700"
                            }`}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-slate-500">
                        Message replied by {bucketedRepliers.length} contact
                        {bucketedRepliers.length === 1 ? "" : "s"} within{" "}
                        {segregationThresholdHours} Hour
                        {segregationThresholdHours === 1 ? "" : "s"}
                        {untimedRepliers.length > 0
                          ? ` · ${untimedRepliers.length} repl${untimedRepliers.length === 1 ? "y" : "ies"} can't be timed (sent before tracking was enabled)`
                          : ""}
                      </p>

                      <button
                        type="button"
                        disabled={selectedReplierPhones.size === 0}
                        onClick={handleBroadcastToRepliers}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-[12.5px] font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Send className="h-3.5 w-3.5" />
                        Broadcast to Selected ({selectedReplierPhones.size})
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="w-10 px-5 py-3">
                              <input
                                type="checkbox"
                                checked={
                                  bucketedRepliers.length > 0 &&
                                  bucketedRepliers.every((c) => selectedReplierPhones.has(c.phone))
                                }
                                onChange={toggleSelectAllRepliers}
                                className="h-3.5 w-3.5 cursor-pointer rounded border-slate-300"
                              />
                            </th>
                            <th className="px-5 py-3 text-left text-[12.5px] font-semibold uppercase tracking-wide text-slate-600">
                              Name
                            </th>
                            <th className="px-5 py-3 text-left text-[12.5px] font-semibold uppercase tracking-wide text-slate-600">
                              Mobile Number
                            </th>
                            <th className="px-5 py-3 text-left text-[12.5px] font-semibold uppercase tracking-wide text-slate-600">
                              Read At
                            </th>
                            <th className="px-5 py-3 text-left text-[12.5px] font-semibold uppercase tracking-wide text-slate-600">
                              Replied At
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {bucketedRepliers.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-5 py-8 text-center text-sm text-slate-400">
                                No repliers in this window
                              </td>
                            </tr>
                          ) : (
                            bucketedRepliers.map((c) => (
                              <tr key={c.phone} className="hover:bg-slate-50/70">
                                <td className="px-5 py-3.5">
                                  <input
                                    type="checkbox"
                                    checked={selectedReplierPhones.has(c.phone)}
                                    onChange={() => toggleReplierSelection(c.phone)}
                                    className="h-3.5 w-3.5 cursor-pointer rounded border-slate-300"
                                  />
                                </td>
                                <td className="px-5 py-3.5 text-sm font-medium text-slate-900">
                                  {c.name || "Unknown"}
                                </td>
                                <td className="px-5 py-3.5 text-sm text-slate-600">
                                  {formatPhone(c.phone)}
                                </td>
                                <td className="px-5 py-3.5 text-sm text-slate-500">
                                  {formatEventTime(c.readAt)}
                                </td>
                                <td className="px-5 py-3.5 text-sm text-slate-500">
                                  {formatEventTime(c.repliedAt)}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}

                {replyAnalytics?.repliedContactsCount > 0 && (
                  <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-100 px-5 py-4">
                      <h2 className="text-base font-semibold text-slate-900">
                        Campaign Responses
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        Contacts who replied after receiving this campaign
                      </p>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-5 py-3 text-left">Contact</th>

                            <th className="px-5 py-3 text-left">Phone</th>

                            <th className="px-5 py-3 text-left">Reply Count</th>

                            <th className="px-5 py-3 text-left">First Reply</th>

                            <th className="px-5 py-3 text-left">
                              Latest Reply
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {replyAnalytics?.repliedContacts?.map(
                            (reply, index) => (
                              <tr
                                key={index}
                                onClick={() =>
                                  navigate("/inbox", {
                                    state: {
                                      targetPhone: reply.phone,
                                    },
                                  })
                                }
                                className="cursor-pointer transition hover:bg-slate-50"
                              >
                                <td className="px-5 py-4 font-medium text-slate-900">
                                  {reply.name}
                                </td>

                                <td className="px-5 py-4">{reply.phone}</td>

                                <td className="px-5 py-4">
                                  {reply.replyCount}
                                </td>

                                <td className="px-5 py-4">
                                  {reply.firstReply}
                                </td>

                                <td className="px-5 py-4">
                                  {reply.latestReply}
                                </td>
                              </tr>
                            ),
                          )}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}
                <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-base font-semibold text-slate-900">
                        Contact Delivery Status
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Individual message delivery tracking
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {campaign?.failedCount > 0 && (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              await api.post(
                                `/api/campaigns/${campaign._id}/retry-failed`,
                              );

                              await fetchCampaign();
                            } catch (error) {
                              console.log(error);
                            }
                          }}
                          className="inline-flex items-center rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
                        >
                          Retry Failed ({campaign.failedCount})
                        </button>
                      )}

                      <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
                        <Users className="h-4 w-4 text-slate-500" />
                        {activeStage
                          ? `${filteredContacts.length} of ${campaign?.contacts?.length || 0} Contacts`
                          : `${campaign?.contacts?.length || 0} Contacts`}
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-5 py-3 text-left text-[12.5px] font-semibold uppercase tracking-wide text-slate-600">
                            Contact
                          </th>

                          <th className="px-5 py-3 text-left text-[12.5px] font-semibold uppercase tracking-wide text-slate-600">
                            Sent At
                          </th>
                          <th className="px-5 py-3 text-left text-[12.5px] font-semibold uppercase tracking-wide text-slate-600">
                            Delivered At
                          </th>
                          <th className="px-5 py-3 text-left text-[12.5px] font-semibold uppercase tracking-wide text-slate-600">
                            Read At
                          </th>
                          <th className="px-5 py-3 text-left text-[12.5px] font-semibold uppercase tracking-wide text-slate-600">
                            Replied At
                          </th>

                          <th className="px-5 py-3 text-left text-[12.5px] font-semibold uppercase tracking-wide text-slate-600">
                            Status
                          </th>
                          <th className="px-5 py-3 text-left text-[12.5px] font-semibold uppercase tracking-wide text-slate-600">
                            Shared Inbox
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100 bg-white">
                        {filteredContacts.map((contact, index) => (
                          <tr
                            key={index}
                            onClick={() => {
                              if (contact.status !== "failed") {
                                navigate("/inbox", {
                                  state: {
                                    targetPhone: contact.phone,
                                  },
                                });
                              }
                            }}
                            className={`transition-colors duration-150 hover:bg-slate-50/70 ${
                              contact.status !== "failed"
                                ? "cursor-pointer"
                                : ""
                            }`}
                          >
                            <td className="px-5 py-4">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-900">
                                  {contact.name || "Unknown Contact"}
                                </p>

                                <p className="mt-1 text-sm text-slate-500">
                                  {formatPhone(contact.phone)}
                                </p>
                              </div>
                            </td>

                            <td className="px-5 py-4 text-sm text-slate-500">
                              {contact.sentAt ? formatEventTime(contact.sentAt) : "—"}
                            </td>
                            <td className="px-5 py-4 text-sm text-slate-500">
                              {contact.deliveredAt ? formatEventTime(contact.deliveredAt) : "—"}
                            </td>
                            <td className="px-5 py-4 text-sm text-slate-500">
                              {contact.readAt ? formatEventTime(contact.readAt) : "—"}
                            </td>
                            <td className="px-5 py-4 text-sm text-slate-500">
                              {contact.repliedAt ? formatEventTime(contact.repliedAt) : "—"}
                            </td>

                            <td className="px-5 py-4">
                              <span
                                className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium capitalize ring-1 ${
                                  contact.status === "sent" ||
                                  contact.status === "delivered" ||
                                  contact.status === "read"
                                    ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                                    : contact.status === "failed"
                                      ? "bg-rose-50 text-rose-700 ring-rose-100"
                                      : "bg-slate-100 text-slate-700 ring-slate-200"
                                }`}
                              >
                                {contact.status}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              {contact.status === "failed" ? (
                                <span className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">
                                  Open Inbox
                                </span>
                              ) : (
                                <button
                                  onClick={() =>
                                    navigate("/inbox", {
                                      state: {
                                        targetPhone: contact.phone,
                                      },
                                    })
                                  }
                                  className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                                >
                                  Open Inbox
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            )}
          </main>
        </div>
      </div>
    </DashboardLayout>
  );
}

import { useEffect, useState } from "react";
import { getInboxSocket, joinRoom, leaveRoom } from "../../services/socket";
import api from "../../services/api";
import { useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { Badge, Button, Card, Skeleton, StatusPill } from "../../components/ui";
import { formatPhone } from "../../utils/formatPhone";
import { cn } from "../../utils/cn";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  MessageSquareText,
  RotateCcw,
  Users,
  XCircle,
  Send,
} from "lucide-react";
import { contactsToCsvFile } from "../../utils/segmentToCsv";

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

const CHART = {
  delivered: "#128c5e",
  failed: "#d64545",
  pending: "#c3cad1",
  grid: "#eceeed",
  axis: "#4d5868",
};

const tooltipStyle = {
  border: "1px solid #e6e8e3",
  borderRadius: 10,
  fontSize: 13,
  boxShadow: "0 12px 32px rgba(15,28,23,0.12)",
  padding: "8px 12px",
};

/* ── Small building blocks ─────────────────────────────────────────── */

function SectionCard({ title, description, action, className, bodyClassName, children }) {
  return (
    <Card className={cn("flex flex-col", className)}>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h2 className="text-[17px] font-semibold text-ink">{title}</h2>
          {description && <p className="mt-1 text-[14px] text-ink-muted">{description}</p>}
        </div>
        {action && <div className="flex flex-wrap items-center gap-2.5">{action}</div>}
      </div>
      <div className={cn("flex-1", bodyClassName)}>{children}</div>
    </Card>
  );
}

function Empty({ icon: Icon = Activity, title, description }) {
  return (
    <div className="flex h-full min-h-[200px] flex-col items-center justify-center rounded-xl bg-canvas px-6 py-8 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-ink-muted shadow-[var(--shadow-card)]">
        <Icon size={20} />
      </span>
      <p className="mt-4 text-[15px] font-semibold text-ink">{title}</p>
      <p className="mt-1 max-w-xs text-[14px] text-ink-muted">{description}</p>
    </div>
  );
}

function KpiCard({ label, value, caption, icon: Icon, tone = "default" }) {
  return (
    <div className="flex flex-col rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
      <span className="flex items-center gap-2 text-[14px] font-medium text-ink-muted">
        <Icon size={16} className={tone === "danger" ? "text-danger" : "text-brand-600"} />
        {label}
      </span>
      <p
        className={cn(
          "mt-4 text-[32px] font-semibold leading-none tracking-[-0.02em] tabular-nums",
          tone === "danger" ? "text-danger" : "text-ink",
        )}
      >
        {value ?? "—"}
      </p>
      {caption && <p className="mt-2 text-[13px] text-ink-muted">{caption}</p>}
    </div>
  );
}

function Fact({ label, value, tone = "default" }) {
  return (
    <div className="rounded-lg border border-line bg-canvas px-3.5 py-2">
      <p className="text-[13px] text-ink-muted">{label}</p>
      <p
        className={cn(
          "text-[15px] font-semibold tabular-nums",
          tone === "brand" ? "text-brand-700" : "text-ink",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function Th({ children, className }) {
  return (
    <th scope="col" className={cn("px-4 py-3 text-left text-[13px] font-medium text-ink-muted", className)}>
      {children}
    </th>
  );
}

const checkboxCls = "h-4 w-4 cursor-pointer rounded border-line-strong accent-[#128c5e]";

function LoadingState() {
  return (
    <div className="space-y-5">
      <div>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-3 h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-[132px] rounded-[var(--radius-card)]" />
        ))}
      </div>
      <Skeleton className="h-[160px] w-full rounded-[var(--radius-card)]" />
      <div className="grid gap-5 xl:grid-cols-3">
        <Skeleton className="h-[380px] rounded-[var(--radius-card)] xl:col-span-2" />
        <Skeleton className="h-[380px] rounded-[var(--radius-card)]" />
      </div>
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────────────── */

export default function CampaignAnalyticsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trendData, setTrendData] = useState([]);
  const [lastEventAt, setLastEventAt] = useState(null);
  const [replyAnalytics, setReplyAnalytics] = useState(null);
  const [activeStage, setActiveStage] = useState(null);
  const [segregationThresholdHours, setSegregationThresholdHours] =
    useState(24);
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
    fetchCampaign();
  }, []);

  useEffect(() => {
    const socket = getInboxSocket();

    joinRoom("campaigns");

    const handleSocketConnect = () => undefined;
    const handleSocketDisconnect = () => undefined;

    socket.on("connect", handleSocketConnect);
    socket.on("disconnect", handleSocketDisconnect);

    const handleCampaignUpdate = (updatedCampaign) => {
      if (updatedCampaign._id.toString() === id) {
        const now = new Date();

        setCampaign(updatedCampaign);

        const nextPoint = toTrendPoint(updatedCampaign, now);

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
    return (
      <DashboardLayout title="Campaign Analytics">
        <LoadingState />
      </DashboardLayout>
    );
  }

  const pendingCount = Math.max(
    (campaign?.totalContacts || 0) -
      ((campaign?.sentCount || 0) + (campaign?.failedCount || 0)),
    0,
  );

  // Of contacts actually attempted so far, what fraction succeeded — not
  // skewed low by contacts a still-running campaign hasn't reached yet
  // (sentCount/totalContacts would dip during a campaign's normal
  // in-progress window and look like a problem when there isn't one).
  const attemptedCount =
    (campaign?.sentCount || 0) + (campaign?.failedCount || 0);
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

  const COLORS = [CHART.delivered, CHART.failed, CHART.pending];

  const responseRate =
    campaign?.sentCount > 0
      ? Math.round(
          ((replyAnalytics?.repliedContactsCount || 0) / campaign.sentCount) *
            100,
        )
      : 0;

  const kpiCards = [
    {
      label: "Total contacts",
      value: campaign?.totalContacts,
      caption: "People in this campaign",
      icon: Users,
    },
    {
      label: "Delivered",
      value: campaign?.sentCount,
      caption: `${successRate}% of attempted messages`,
      icon: CheckCircle2,
    },
    {
      label: "Failed",
      value: campaign?.failedCount,
      caption: campaign?.failedCount > 0 ? "You can retry these below" : "No failed messages",
      tone: campaign?.failedCount > 0 ? "danger" : "default",
      icon: XCircle,
    },
    {
      label: "Replies",
      value: replyAnalytics?.repliedContactsCount || 0,
      caption: "Contacts who replied",
      icon: MessageSquareText,
    },
    {
      label: "Response rate",
      value: `${responseRate}%`,
      caption: "Replies out of delivered",
      icon: Activity,
    },
  ];

  const deliveryLegend = [
    {
      label: "Delivered",
      value: campaign?.sentCount,
      color: CHART.delivered,
    },
    {
      label: "Failed",
      value: campaign?.failedCount,
      color: CHART.failed,
    },
    {
      label: "Pending",
      value: pendingCount,
      color: CHART.pending,
    },
  ];

  const contacts = campaign?.contacts || [];

  // Independent counts per stage, computed from real per-contact timestamps
  // rather than the single flattened `status` — a contact can e.g. reply
  // without a read receipt ever confirming, so these aren't a strict
  // breakdown of one another.
  const funnelStages = [
    {
      key: "sent",
      label: "Sent",
      count: contacts.filter((c) => c.sentAt).length,
    },
    {
      key: "delivered",
      label: "Delivered",
      count: contacts.filter((c) => c.deliveredAt).length,
    },
    {
      key: "read",
      label: "Read",
      count: contacts.filter((c) => c.readAt).length,
    },
    {
      key: "replied",
      label: "Replied",
      count: contacts.filter((c) => c.repliedAt).length,
    },
    { key: "clicked", label: "Clicked", comingSoon: true },
    {
      key: "failed",
      label: "Failed",
      count: contacts.filter((c) => c.failedAt).length,
    },
  ];

  const totalContactsForFunnel =
    campaign?.totalContacts || contacts.length || 0;

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

  const untimedRepliers = repliersWithTiming.filter(
    (c) => c.hoursToReply === null,
  );
  const bucketedRepliers = repliersWithTiming.filter(
    (c) =>
      c.hoursToReply !== null && c.hoursToReply <= segregationThresholdHours,
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
        bucketedRepliers.length > 0 &&
        bucketedRepliers.every((c) => prev.has(c.phone));
      if (allSelected) return new Set();
      return new Set(bucketedRepliers.map((c) => c.phone));
    });
  }

  function handleBroadcastToRepliers() {
    const selected = bucketedRepliers.filter((c) =>
      selectedReplierPhones.has(c.phone),
    );
    if (selected.length === 0) return;

    const file = contactsToCsvFile(selected, "fast-repliers-followup.csv");
    navigate("/campaigns/upload", {
      state: { prefilledFile: file, prefilledCount: selected.length },
    });
  }

  const header = (
    <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <button
          type="button"
          onClick={() => navigate("/campaigns/history")}
          className="mb-3 inline-flex items-center gap-1.5 text-[14px] font-medium text-brand-700 hover:text-brand-900"
        >
          <ArrowLeft size={15} />
          All campaigns
        </button>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="min-w-0 truncate text-[28px] font-semibold tracking-[-0.025em] text-ink sm:text-[30px]">
            {campaign?.campaignName || "Campaign analytics"}
          </h1>
          {campaign?.status && <StatusPill status={campaign.status} className="text-[13px]" />}
        </div>
        <p className="mt-1.5 truncate text-[15px] text-ink-muted">
          How this campaign performed, updated live as messages go out.
          {campaign?._id && <span className="ml-1 text-[13px]">Campaign ID: {campaign._id}</span>}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <Fact label="Success rate" value={`${successRate}%`} tone="brand" />
        <Fact label="Last update" value={formatEventTime(lastEventAt)} />
      </div>
    </div>
  );

  return (
    <DashboardLayout title="Campaign Analytics">
      <div className="w-full">
        {loading ? (
          <LoadingState />
        ) : (
          <>
            {header}

            <div className="space-y-5">
              {/* ── Key numbers ── */}
              <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
                {kpiCards.map((card) => (
                  <KpiCard
                    key={card.label}
                    label={card.label}
                    value={card.value}
                    caption={card.caption}
                    icon={card.icon}
                    tone={card.tone}
                  />
                ))}
              </section>

              {/* ── Funnel ── */}
              <SectionCard
                title="Message journey"
                description={`Click a stage to filter the contact table below${activeStage ? " — click again to clear" : ""}`}
              >
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  {funnelStages.map((stage) => {
                    const percent =
                      !stage.comingSoon && totalContactsForFunnel > 0
                        ? Math.round(
                            (stage.count / totalContactsForFunnel) * 100,
                          )
                        : null;
                    const isActive = activeStage === stage.key;
                    const isFailed = stage.key === "failed";

                    return (
                      <button
                        key={stage.key}
                        type="button"
                        disabled={stage.comingSoon}
                        aria-pressed={isActive}
                        onClick={() =>
                          setActiveStage((prev) =>
                            prev === stage.key ? null : stage.key,
                          )
                        }
                        className={cn(
                          "rounded-xl border p-4 text-left transition-colors",
                          stage.comingSoon
                            ? "cursor-default border-dashed border-line bg-canvas"
                            : isActive
                              ? "border-brand-600 bg-brand-50 ring-1 ring-brand-600"
                              : "border-line bg-surface hover:border-line-strong hover:bg-canvas",
                        )}
                      >
                        <p className="text-[14px] font-medium text-ink-muted">
                          {stage.label}
                        </p>
                        {stage.comingSoon ? (
                          <>
                            <p className="mt-2 text-[24px] font-semibold leading-none text-ink-subtle">—</p>
                            <p className="mt-2 text-[13px] text-ink-muted">Coming soon</p>
                          </>
                        ) : (
                          <>
                            <p
                              className={cn(
                                "mt-2 text-[24px] font-semibold leading-none tracking-[-0.02em] tabular-nums",
                                isFailed && stage.count > 0 ? "text-danger" : "text-ink",
                              )}
                            >
                              {stage.count}
                            </p>
                            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#eceeed]">
                              <div
                                className={cn("h-full rounded-full", isFailed ? "bg-danger" : "bg-brand-600")}
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                            <p className="mt-1.5 text-[13px] tabular-nums text-ink-muted">
                              {percent}% of contacts
                            </p>
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
              </SectionCard>

              {/* ── Charts ── */}
              <section className="grid gap-5 xl:grid-cols-3">
                <SectionCard
                  className="xl:col-span-2"
                  title="Delivery over time"
                  description="Updates live while the campaign is sending."
                >
                  {trendData.length ? (
                    <div className="h-[280px] sm:h-[320px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={trendData}
                          margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
                        >
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
                                stopColor={CHART.delivered}
                                stopOpacity={0.16}
                              />
                              <stop
                                offset="100%"
                                stopColor={CHART.delivered}
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>

                          <CartesianGrid vertical={false} stroke={CHART.grid} />

                          <XAxis
                            tick={{ fill: CHART.axis, fontSize: 13 }}
                            tickLine={false}
                            axisLine={false}
                            dy={8}
                          />

                          <YAxis
                            tick={{ fill: CHART.axis, fontSize: 13 }}
                            tickLine={false}
                            axisLine={false}
                          />

                          <Tooltip
                            contentStyle={tooltipStyle}
                            labelStyle={{ fontWeight: 600, color: "#0f1c17" }}
                            labelFormatter={(_, payload) => {
                              const point = payload?.[0]?.payload;
                              return `Updated ${formatEventTime(point?.eventAt)}`;
                            }}
                          />

                          <Area
                            type="monotone"
                            dataKey="sent"
                            stroke={CHART.delivered}
                            fill="url(#sentGradient)"
                            strokeWidth={2.25}
                            dot={false}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <Empty
                      icon={Activity}
                      title="No delivery updates yet"
                      description="The chart fills in as messages are sent."
                    />
                  )}
                </SectionCard>

                <SectionCard title="Delivery status" description="Delivered, failed and still pending">
                  <div className="relative h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          innerRadius="68%"
                          outerRadius="92%"
                          paddingAngle={2}
                          stroke="none"
                          dataKey="value"
                        >
                          {chartData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>

                        <Tooltip contentStyle={tooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-[26px] font-semibold leading-none text-ink tabular-nums">
                        {successRate}%
                      </span>
                      <span className="mt-1 text-[13px] text-ink-muted">success rate</span>
                    </div>
                  </div>

                  <div className="mt-4 divide-y divide-line border-t border-line">
                    {deliveryLegend.map((item) => (
                      <div
                        key={`legend-${item.label}`}
                        className="flex items-center justify-between gap-3 py-2.5"
                      >
                        <span className="flex items-center gap-2.5 text-[14px] text-ink">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          {item.label}
                        </span>
                        <span
                          className={cn(
                            "text-[15px] font-semibold tabular-nums",
                            item.label === "Failed" && item.value > 0 ? "text-danger" : "text-ink",
                          )}
                        >
                          {item.value ?? "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              </section>

              {/* ── Smart segregation ── */}
              {repliersWithTiming.length > 0 && (
                <SectionCard
                  title="Fast repliers"
                  description="Contacts who replied within the time you choose. Select them to send a follow-up."
                  bodyClassName="-mx-5 -mb-5 sm:-mx-6 sm:-mb-6"
                  action={
                    <div
                      role="tablist"
                      aria-label="Replied within"
                      className="inline-flex rounded-lg border border-line bg-surface p-1"
                    >
                      {SEGREGATION_THRESHOLDS.map((t) => {
                        const active = segregationThresholdHours === t.hours;
                        return (
                          <button
                            key={t.hours}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            onClick={() =>
                              setSegregationThresholdHours(t.hours)
                            }
                            className={cn(
                              "h-8 whitespace-nowrap rounded-md px-3 text-[14px] font-medium transition-colors",
                              active ? "bg-brand-900 text-white" : "text-ink-muted hover:bg-canvas hover:text-ink",
                            )}
                          >
                            {t.label}
                          </button>
                        );
                      })}
                    </div>
                  }
                >
                  <div className="flex flex-col gap-3 border-t border-line px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <p className="text-[14px] text-ink-muted">
                      Message replied by{" "}
                      <span className="font-semibold text-ink">
                        {bucketedRepliers.length} contact
                        {bucketedRepliers.length === 1 ? "" : "s"}
                      </span>{" "}
                      within {segregationThresholdHours} Hour
                      {segregationThresholdHours === 1 ? "" : "s"}
                      {untimedRepliers.length > 0
                        ? ` · ${untimedRepliers.length} repl${untimedRepliers.length === 1 ? "y" : "ies"} can't be timed (sent before tracking was enabled)`
                        : ""}
                    </p>

                    <Button
                      size="sm"
                      leftIcon={Send}
                      disabled={selectedReplierPhones.size === 0}
                      onClick={handleBroadcastToRepliers}
                    >
                      Send to selected ({selectedReplierPhones.size})
                    </Button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-y border-line bg-[#f6f7f6]">
                          <th scope="col" className="w-12 px-4 py-3 sm:pl-6">
                            <input
                              type="checkbox"
                              aria-label="Select all repliers"
                              checked={
                                bucketedRepliers.length > 0 &&
                                bucketedRepliers.every((c) =>
                                  selectedReplierPhones.has(c.phone),
                                )
                              }
                              onChange={toggleSelectAllRepliers}
                              className={checkboxCls}
                            />
                          </th>
                          <Th>Name</Th>
                          <Th>Mobile number</Th>
                          <Th>Read at</Th>
                          <Th>Replied at</Th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {bucketedRepliers.length === 0 ? (
                          <tr>
                            <td
                              colSpan={5}
                              className="px-4 py-10 text-center text-[14px] text-ink-muted"
                            >
                              No repliers in this window
                            </td>
                          </tr>
                        ) : (
                          bucketedRepliers.map((c) => (
                            <tr
                              key={c.phone}
                              className="text-[14px] transition-colors hover:bg-canvas"
                            >
                              <td className="px-4 py-3.5 sm:pl-6">
                                <input
                                  type="checkbox"
                                  aria-label={`Select ${c.name || c.phone}`}
                                  checked={selectedReplierPhones.has(c.phone)}
                                  onChange={() =>
                                    toggleReplierSelection(c.phone)
                                  }
                                  className={checkboxCls}
                                />
                              </td>
                              <td className="px-4 py-3.5 font-medium text-ink">
                                {c.name || "Unknown"}
                              </td>
                              <td className="px-4 py-3.5 tabular-nums text-ink">
                                {formatPhone(c.phone)}
                              </td>
                              <td className="px-4 py-3.5 tabular-nums text-ink-muted">
                                {formatEventTime(c.readAt)}
                              </td>
                              <td className="px-4 py-3.5 tabular-nums text-ink-muted">
                                {formatEventTime(c.repliedAt)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </SectionCard>
              )}

              {/* ── Campaign responses ── */}
              {replyAnalytics?.repliedContactsCount > 0 && (
                <SectionCard
                  title="Replies"
                  description="Contacts who replied after receiving this campaign. Click a row to open the chat."
                  bodyClassName="-mx-5 -mb-5 sm:-mx-6 sm:-mb-6"
                >
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-y border-line bg-[#f6f7f6]">
                          <Th className="sm:pl-6">Contact</Th>
                          <Th>Phone</Th>
                          <Th>Replies</Th>
                          <Th>First reply</Th>
                          <Th>Latest reply</Th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-line">
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
                              className="cursor-pointer text-[14px] transition-colors hover:bg-canvas"
                            >
                              <td className="px-4 py-3.5 font-medium text-ink sm:pl-6">
                                {reply.name}
                              </td>

                              <td className="px-4 py-3.5 tabular-nums text-ink">{reply.phone}</td>

                              <td className="px-4 py-3.5 tabular-nums text-ink">
                                {reply.replyCount}
                              </td>

                              <td className="px-4 py-3.5 text-ink-muted">
                                {reply.firstReply}
                              </td>

                              <td className="px-4 py-3.5 text-ink-muted">
                                {reply.latestReply}
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                </SectionCard>
              )}

              {/* ── Per-contact delivery ── */}
              <SectionCard
                title="Contact delivery status"
                description="Where each message is right now. Hover a failed status to see why."
                bodyClassName="-mx-5 -mb-5 sm:-mx-6 sm:-mb-6"
                action={
                  <>
                    <span className="inline-flex h-8 items-center gap-2 rounded-lg bg-canvas px-3 text-[14px] font-medium text-ink">
                      <Users size={15} className="text-brand-600" />
                      {activeStage
                        ? `${filteredContacts.length} of ${campaign?.contacts?.length || 0} contacts`
                        : `${campaign?.contacts?.length || 0} contacts`}
                    </span>
                    {campaign?.failedCount > 0 && (
                      <Button
                        variant="secondary"
                        size="sm"
                        leftIcon={RotateCcw}
                        title="Try sending the failed messages again"
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
                      >
                        Retry failed ({campaign.failedCount})
                      </Button>
                    )}
                  </>
                }
              >
                <div className="overflow-visible">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-y border-line bg-[#f6f7f6]">
                        <Th className="sm:pl-6">Contact</Th>
                        <Th>Sent</Th>
                        <Th>Delivered</Th>
                        <Th>Read</Th>
                        <Th>Replied</Th>
                        <Th>Status</Th>
                        <Th className="sm:pr-6">Chat</Th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-line">
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
                          className={cn(
                            "text-[14px] transition-colors hover:bg-canvas",
                            contact.status !== "failed" && "cursor-pointer",
                          )}
                        >
                          <td className="px-4 py-3.5 sm:pl-6">
                            <div className="min-w-0">
                              <p className="truncate text-[15px] font-medium text-ink">
                                {contact.name || "Unknown Contact"}
                              </p>

                              <p className="mt-0.5 text-[13px] tabular-nums text-ink-muted">
                                {formatPhone(contact.phone)}
                              </p>
                            </div>
                          </td>

                          <td className="px-4 py-3.5 tabular-nums text-ink-muted">
                            {contact.sentAt
                              ? formatEventTime(contact.sentAt)
                              : "—"}
                          </td>
                          <td className="px-4 py-3.5 tabular-nums text-ink-muted">
                            {contact.deliveredAt
                              ? formatEventTime(contact.deliveredAt)
                              : "—"}
                          </td>
                          <td className="px-4 py-3.5 tabular-nums text-ink-muted">
                            {contact.readAt
                              ? formatEventTime(contact.readAt)
                              : "—"}
                          </td>
                          <td className="px-4 py-3.5 tabular-nums text-ink-muted">
                            {contact.repliedAt
                              ? formatEventTime(contact.repliedAt)
                              : "—"}
                          </td>

                          <td className="px-4 py-3.5">
                            {contact.status === "failed" ? (
                              <div className="group relative inline-block">
                                <Badge tone="danger" dot className="cursor-help text-[13px]">
                                  Failed
                                </Badge>

                                <div className="pointer-events-none absolute bottom-full left-1/2 z-[9999] mb-2 hidden w-80 -translate-x-1/2 rounded-xl border border-line bg-surface p-4 text-left shadow-[var(--shadow-pop)] group-hover:block sm:w-96">
                                  <p className="text-[14px] font-semibold text-ink">
                                    Why did this message fail?
                                  </p>

                                  {contact.failure?.title && (
                                    <p className="mt-2 text-[14px] font-medium text-ink">
                                      Message: {contact.failure.title}
                                    </p>
                                  )}

                                  {contact.failure?.details && (
                                    <p className="mt-2 text-[14px] leading-6 text-ink-muted">
                                      {contact.failure.details}
                                    </p>
                                  )}

                                  {contact.failure?.code && (
                                    <p className="mt-3 border-t border-line pt-2 text-[13px] text-ink-muted">
                                      Error code: {contact.failure.code}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <Badge
                                dot
                                tone={
                                  contact.status === "sent" ||
                                  contact.status === "delivered" ||
                                  contact.status === "read"
                                    ? "success"
                                    : "neutral"
                                }
                                className="text-[13px] capitalize"
                              >
                                {contact.status}
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 py-3.5 sm:pr-6">
                            {contact.status === "failed" ? (
                              <span className="inline-flex h-8 cursor-not-allowed items-center gap-1.5 rounded-lg border border-line px-3 text-[13px] font-medium text-ink-subtle">
                                <MessageSquareText size={14} />
                                Open Inbox
                              </span>
                            ) : (
                              <Button
                                variant="secondary"
                                size="sm"
                                leftIcon={MessageSquareText}
                                title="Open this contact's chat in the inbox"
                                onClick={() =>
                                  navigate("/inbox", {
                                    state: {
                                      targetPhone: contact.phone,
                                    },
                                  })
                                }
                              >
                                Open Inbox
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SectionCard>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

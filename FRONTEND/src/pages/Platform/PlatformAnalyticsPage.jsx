import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { TrendingUp, IndianRupee, Users, Sparkles, RefreshCw, Wallet } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

import { fetchPlatformAnalytics } from "../../services/platformApi";
import PlatformLayout from "../../components/layout/PlatformLayout";
import { Button } from "../../components/ui";
import { cn } from "../../utils/cn";

const RANGES = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "1y", label: "1 year" },
];

const GREEN = "#128c5e";
const RED = "#c62828";
const NEUTRAL = "#c3cad1";
const AXIS = { fontSize: 12, fill: "#5d6b66" };
const TOOLTIP_STYLE = {
  backgroundColor: "#ffffff",
  borderColor: "#e3e7e4",
  borderRadius: "10px",
  fontSize: "13px",
};
const CARD =
  "rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6";

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export default function PlatformAnalyticsPage() {
  const [data, setData] = useState(null);
  const [timeRange, setTimeRange] = useState("30d");
  const [loading, setLoading] = useState(true);

  async function loadAnalytics() {
    try {
      setLoading(true);
      const res = await fetchPlatformAnalytics(timeRange);
      setData(res.data || null);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const financials = data?.financials || {
    mrr: 0,
    arr: 0,
    arpu: 0,
    activePaidSubscriptions: 0,
    activeTrials: 0,
  };

  const growth = data?.growth || [];
  const throughput = data?.throughput || [];
  const ai = data?.ai || {
    totalConversations: 0,
    totalAITurns: 0,
    avgTurnsPerConversation: 0,
    totalMessages: 0,
  };

  return (
    <PlatformLayout
      title="Analytics"
      description="Revenue, new companies and message volume across the platform."
      actions={
        <>
          <div role="tablist" aria-label="Time range" className="inline-flex rounded-lg border border-line bg-surface p-1">
            {RANGES.map((range) => {
              const active = timeRange === range.value;
              return (
                <button
                  key={range.value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTimeRange(range.value)}
                  className={cn(
                    "h-8 whitespace-nowrap rounded-md px-3 text-[14px] font-medium transition-colors",
                    active ? "bg-brand-900 text-white" : "text-ink-muted hover:bg-canvas hover:text-ink",
                  )}
                >
                  {range.label}
                </button>
              );
            })}
          </div>
          <Button variant="secondary" onClick={loadAnalytics}>
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi icon={IndianRupee} label="Monthly recurring revenue" value={formatCurrency(financials.mrr)} caption="Based on active subscriptions" />
          <Kpi icon={TrendingUp} label="Annual run rate" value={formatCurrency(financials.arr)} caption="Yearly revenue at the current pace" />
          <Kpi
            icon={Users}
            label="Paying companies"
            value={financials.activePaidSubscriptions}
            caption={
              <>
                Plus <span className="font-medium text-ink">{financials.activeTrials}</span> active trials
              </>
            }
          />
          <Kpi icon={Wallet} label="Average revenue per company" value={formatCurrency(financials.arpu)} caption="Per paying company, per month" />
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <section className={CARD}>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-[17px] font-semibold text-ink">Message volume</h2>
                <p className="mt-1 text-[14px] text-ink-muted">Sent, delivered and failed messages per day</p>
              </div>
              <div className="flex items-center gap-3 text-[13px] text-ink-muted">
                <Legend color={GREEN} label="Delivered" />
                <Legend color={NEUTRAL} label="Sent" />
                <Legend color={RED} label="Failed" />
              </div>
            </div>

            <div className="h-64 w-full">
              {throughput.length === 0 ? (
                <EmptyChart text="No messages were sent in this time range." />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={throughput} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef0ee" vertical={false} />
                    <XAxis dataKey="date" tick={AXIS} stroke="#e3e7e4" />
                    <YAxis tick={AXIS} stroke="#e3e7e4" />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Line type="monotone" dataKey="sent" stroke={NEUTRAL} strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="delivered" stroke={GREEN} strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="failed" stroke={RED} strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>

          <section className={CARD}>
            <div className="mb-4">
              <h2 className="text-[17px] font-semibold text-ink">New companies</h2>
              <p className="mt-1 text-[14px] text-ink-muted">Companies that signed up each month</p>
            </div>

            <div className="h-64 w-full">
              {growth.length === 0 ? (
                <EmptyChart text="No new companies in this time range." />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={growth} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef0ee" vertical={false} />
                    <XAxis dataKey="month" tick={AXIS} stroke="#e3e7e4" />
                    <YAxis tick={AXIS} stroke="#e3e7e4" />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Area
                      type="monotone"
                      dataKey="companies"
                      stroke={GREEN}
                      strokeWidth={2}
                      fillOpacity={0.12}
                      fill={GREEN}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>
        </div>

        <section className={CARD}>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                <Sparkles size={18} />
              </span>
              <div>
                <h2 className="text-[17px] font-semibold text-ink">AI auto-replies (Groq)</h2>
                <p className="mt-0.5 text-[14px] text-ink-muted">How many conversations the AI is answering</p>
              </div>
            </div>
            <span className="rounded-full bg-brand-50 px-3 py-1 text-[13px] font-medium text-brand-800">
              Model: LLaMA 3.3
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <AiFact label="Conversations" value={ai.totalConversations} />
            <AiFact label="AI auto-replies" value={ai.totalAITurns} />
            <AiFact label="Average replies per conversation" value={ai.avgTurnsPerConversation} />
            <AiFact label="Total messages" value={new Intl.NumberFormat("en-IN").format(ai.totalMessages || 0)} />
          </div>
        </section>
      </div>
    </PlatformLayout>
  );
}

function Kpi({ icon: Icon, label, value, caption }) {
  return (
    <div className="flex flex-col rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
      <span className="flex items-center gap-2 text-[14px] font-medium text-ink-muted">
        <Icon size={16} className="text-brand-600" />
        {label}
      </span>
      <p className="mt-4 text-[30px] font-semibold leading-none tracking-[-0.02em] text-ink tabular-nums">{value}</p>
      <p className="mt-2 text-[13px] text-ink-muted">{caption}</p>
    </div>
  );
}

function Legend({ color, label }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function EmptyChart({ text }) {
  return (
    <div className="flex h-full items-center justify-center rounded-xl bg-canvas px-4 text-center text-[14px] text-ink-muted">
      {text}
    </div>
  );
}

function AiFact({ label, value }) {
  return (
    <div className="rounded-xl bg-canvas p-4">
      <p className="text-[14px] text-ink-muted">{label}</p>
      <p className="mt-1 text-[24px] font-semibold tracking-[-0.02em] text-ink tabular-nums">{value}</p>
    </div>
  );
}

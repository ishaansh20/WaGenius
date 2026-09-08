import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import {
  TrendingUp,
  DollarSign,
  Users,
  Sparkles,
  RefreshCw,
  ArrowUpRight,
} from "lucide-react";
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
      title="Platform SaaS Analytics"
      description="Revenue run rate, company expansion trajectory, and global message throughput."
      actions={
        <div className="flex items-center gap-2">
          {/* Time range selector */}
          <div className="flex rounded-xl border border-slate-200 bg-[#F5F8FB] p-1 text-xs font-medium text-slate-600 shadow-sm">
            {["7d", "30d", "90d", "1y"].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`rounded-lg px-2.5 py-1 uppercase transition ${
                  timeRange === range
                    ? "bg-slate-900 font-semibold text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          <button
            onClick={loadAnalytics}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-[#F5F8FB] px-3 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* FINANCIAL KPI CARDS */}
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-[#F5F8FB] p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Monthly Recurring (MRR)</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-black tracking-tight text-slate-900">{formatCurrency(financials.mrr)}</p>
            <p className="mt-1 flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
              <ArrowUpRight className="h-3 w-3" />
              Based on active subscriptions
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-[#F5F8FB] p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Annual Run Rate (ARR)</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-black tracking-tight text-slate-900">{formatCurrency(financials.arr)}</p>
            <p className="mt-1 text-[11px] text-slate-400">Annualized revenue pace</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-[#F5F8FB] p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Paid Tenants</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-black tracking-tight text-purple-700">{financials.activePaidSubscriptions}</p>
            <p className="mt-1 text-[11px] text-slate-500">
              Plus <span className="font-semibold text-slate-800">{financials.activeTrials}</span> active trials
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-[#F5F8FB] p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">ARPU (Avg Revenue)</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-black tracking-tight text-slate-900">{formatCurrency(financials.arpu)}</p>
            <p className="mt-1 text-[11px] text-slate-400">Per paying tenant / mo</p>
          </div>
        </div>

        {/* CHARTS GRID */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* DAILY MESSAGE THROUGHPUT */}
          <div className="rounded-2xl border border-slate-200 bg-[#F5F8FB] p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Platform Message Throughput</h3>
                <p className="text-xs text-slate-400">Daily sent, delivered, and read volume</p>
              </div>
              <div className="flex items-center gap-3 text-[10px] font-semibold">
                <span className="flex items-center gap-1 text-emerald-600">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> Delivered
                </span>
                <span className="flex items-center gap-1 text-sky-600">
                  <span className="h-2 w-2 rounded-full bg-sky-500" /> Sent
                </span>
                <span className="flex items-center gap-1 text-rose-500">
                  <span className="h-2 w-2 rounded-full bg-rose-500" /> Failed
                </span>
              </div>
            </div>

            <div className="h-64 w-full">
              {throughput.length === 0 ? (
                <div className="flex h-full items-center justify-center text-xs text-slate-400">
                  No message activity in this time window.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={throughput} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        borderColor: "#e2e8f0",
                        borderRadius: "12px",
                        fontSize: "12px",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                    />
                    <Line type="monotone" dataKey="sent" stroke="#0284c7" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="delivered" stroke="#10b981" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="failed" stroke="#f43f5e" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* MONTHLY COMPANY ONBOARDING VELOCITY */}
          <div className="rounded-2xl border border-slate-200 bg-[#F5F8FB] p-6 shadow-sm">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-slate-900">Tenant Acquisition Velocity</h3>
              <p className="text-xs text-slate-400">New company onboardings over time</p>
            </div>

            <div className="h-64 w-full">
              {growth.length === 0 ? (
                <div className="flex h-full items-center justify-center text-xs text-slate-400">
                  No tenant acquisition data available.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={growth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="companyGrowth" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        borderColor: "#e2e8f0",
                        borderRadius: "12px",
                        fontSize: "12px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="companies"
                      stroke="#7c3aed"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#companyGrowth)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* AI & AUTOMATION INTELLIGENCE */}
        <div className="rounded-2xl border border-slate-200 bg-[#F5F8FB] p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">AI Auto-Reply Intelligence (Groq LLM)</h3>
                <p className="text-xs text-slate-400">Turn consumption and automated resolution tracking</p>
              </div>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold text-emerald-700">
              Active LLaMA 3.3 Engine
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Conversations</p>
              <p className="mt-1 text-xl font-bold text-slate-900">{ai.totalConversations}</p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total AI Auto-Replies</p>
              <p className="mt-1 text-xl font-bold text-emerald-700">{ai.totalAITurns}</p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Avg Turns / Conversation</p>
              <p className="mt-1 text-xl font-bold text-slate-900">{ai.avgTurnsPerConversation}</p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Message Volume</p>
              <p className="mt-1 text-xl font-bold text-slate-900">
                {new Intl.NumberFormat("en-IN").format(ai.totalMessages || 0)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </PlatformLayout>
  );
}

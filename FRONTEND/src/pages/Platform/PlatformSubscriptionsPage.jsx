import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  CreditCard,
  Building2,
  Filter,
  RefreshCw,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
} from "lucide-react";
import { fetchAllSubscriptions, fetchAllPlans } from "../../services/platformApi";
import PlatformLayout from "../../components/layout/PlatformLayout";

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const statusClasses = {
  TRIAL: "border-amber-200 bg-amber-50 text-amber-800",
  ACTIVE: "border-[#B5C5D5] bg-[#D9E4EE] text-[#1A3652]",
  PENDING: "border-[#C5D1DE] bg-[#EFF3F8] text-[#4A6580]",
  SUSPENDED: "border-red-200 bg-red-50 text-red-600",
  CANCELLED: "border-red-200 bg-red-50 text-red-600",
  EXPIRED: "border-red-200 bg-red-50 text-red-600",
};

export default function PlatformSubscriptionsPage() {
  const navigate = useNavigate();

  const [subscriptions, setSubscriptions] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  async function loadData(showRefreshLoader = false) {
    try {
      if (showRefreshLoader) setRefreshing(true);
      else setLoading(true);

      const [subsRes, plansRes] = await Promise.all([
        fetchAllSubscriptions(),
        fetchAllPlans().catch(() => ({ data: [] })),
      ]);

      setSubscriptions(subsRes.data || []);
      setPlans(plansRes.data || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load subscriptions");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, planFilter]);

  const filteredSubscriptions = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return subscriptions.filter((sub) => {
      const companyName = sub.companyId?.name?.toLowerCase() || "";
      const planName = sub.planId?.name?.toLowerCase() || "";

      const matchesSearch =
        !normalizedSearch ||
        companyName.includes(normalizedSearch) ||
        planName.includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "all" || sub.status === statusFilter;

      const matchesPlan =
        planFilter === "all" || sub.planId?._id === planFilter || sub.planId?.name === planFilter;

      return matchesSearch && matchesStatus && matchesPlan;
    });
  }, [subscriptions, search, statusFilter, planFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredSubscriptions.length / pageSize));
  const paginatedSubscriptions = filteredSubscriptions.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  const hasFilters = search || statusFilter !== "all" || planFilter !== "all";

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setPlanFilter("all");
  }

  return (
    <PlatformLayout
      title="Subscriptions"
      description="Monitor and manage all active company subscriptions, trials, and plans."
      actions={
        <button
          type="button"
          onClick={() => loadData(true)}
          disabled={refreshing}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      }
    >
      {/* FILTER BAR */}
      <div className="rounded-2xl border border-slate-200 bg-[#F5F8FB] p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by company or plan name..."
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-9 text-[12.5px] text-slate-800 outline-none placeholder:text-slate-400 focus:border-emerald-400 focus:bg-[#F5F8FB]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-[12px] text-slate-600 outline-none focus:border-emerald-400"
          >
            <option value="all">All Statuses</option>
            <option value="TRIAL">Trial</option>
            <option value="ACTIVE">Active</option>
            <option value="PENDING">Pending</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="EXPIRED">Expired</option>
          </select>

          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-[12px] text-slate-600 outline-none focus:border-emerald-400"
          >
            <option value="all">All Plans</option>
            {plans.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </select>

          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 text-[11.5px] font-medium text-slate-500 transition hover:bg-slate-50"
            >
              <Filter className="h-3.5 w-3.5" />
              Clear
            </button>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
          <p className="text-[11px] text-slate-400">
            Showing <span className="font-medium text-slate-600">{filteredSubscriptions.length}</span> of{" "}
            <span className="font-medium text-slate-600">{subscriptions.length}</span> subscriptions
          </p>
          {hasFilters && <p className="text-[11px] text-emerald-600">Filters applied</p>}
        </div>
      </div>

      {/* TABLE */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-[#F5F8FB] shadow-sm">
        {loading ? (
          <div className="flex min-h-[350px] items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-600" />
          </div>
        ) : filteredSubscriptions.length === 0 ? (
          <div className="flex min-h-[350px] flex-col items-center justify-center px-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50">
              <CreditCard className="h-5 w-5 text-slate-400" />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-slate-700">No subscriptions found</h3>
            <p className="mt-1 max-w-sm text-[12px] text-slate-400">
              No subscriptions match your search or filter criteria.
            </p>
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 text-[12px] font-medium text-emerald-600 hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    {["Company", "Plan", "Pricing", "Billing Cycle", "Status", "Plan Expiry", "Start Date", ""].map((label, i) => (
                      <th
                        key={label + i}
                        className={`px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400 ${
                          i === 7 ? "text-right" : "text-left"
                        }`}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedSubscriptions.map((sub) => {
                    const company = sub.companyId;
                    const plan = sub.planId;
                    const price = sub.billingCycle === "yearly" ? plan?.pricing?.yearly : plan?.pricing?.monthly;
                    const isFree = plan?.isFree || plan?.pricing?.monthly === 0;

                    let expiryDate = null;
                    let isTrial = sub.status === "TRIAL";
                    let isExpired = sub.status === "EXPIRED";
                    let daysLeft = null;

                    if (!isFree) {
                      if (isTrial && sub.trialEndsAt) {
                        expiryDate = new Date(sub.trialEndsAt);
                      } else if (sub.renewalDate) {
                        expiryDate = new Date(sub.renewalDate);
                      } else if (sub.startDate || sub.createdAt) {
                        const start = new Date(sub.startDate || sub.createdAt);
                        const exp = new Date(start);
                        if (sub.billingCycle === "yearly") exp.setFullYear(exp.getFullYear() + 1);
                        else exp.setMonth(exp.getMonth() + 1);
                        expiryDate = exp;
                      }

                      if (expiryDate) {
                        daysLeft = Math.ceil((expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                        if (daysLeft < 0) isExpired = true;
                      }
                    }

                    return (
                      <tr key={sub._id} className="border-b border-slate-100 transition hover:bg-slate-50/70">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
                              <Building2 className="h-4 w-4 text-emerald-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-[13.5px] font-semibold text-slate-900">
                                {company?.name || "Unknown Company"}
                              </p>
                              <p className="mt-0.5 truncate text-[11.5px] text-slate-400">
                                ID: {company?._id || sub.companyId}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11.5px] font-semibold text-slate-800">
                            {plan?.name || "Custom / Unknown"}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-[12.5px] font-medium text-slate-900">
                          ₹{price ?? 0}
                          <span className="text-[11px] font-normal text-slate-400">
                            /{sub.billingCycle === "yearly" ? "yr" : "mo"}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-[12px] font-medium uppercase text-slate-600">
                          {sub.billingCycle || "monthly"}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full border px-2.5 py-1 text-[10.5px] font-semibold ${
                              statusClasses[sub.status] || statusClasses.PENDING
                            }`}
                          >
                            {sub.status}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-[12px]">
                          {isFree ? (
                            <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                              Lifetime
                            </span>
                          ) : isTrial && expiryDate ? (
                            <div className="flex flex-col items-start gap-0.5">
                              <span className={`text-[12px] font-semibold ${isExpired ? "text-rose-600" : daysLeft <= 3 ? "text-amber-600" : "text-slate-700"}`}>
                                {formatDate(expiryDate)}
                              </span>
                              <span
                                className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${
                                  isExpired
                                    ? "border-rose-200 bg-rose-50 text-rose-600"
                                    : daysLeft <= 3
                                    ? "border-amber-200 bg-amber-50 text-amber-700"
                                    : "border-amber-100 bg-amber-50/80 text-amber-800"
                                }`}
                              >
                                <Clock className="h-2.5 w-2.5" />
                                {isExpired ? "Trial Expired" : `${daysLeft}d trial left`}
                              </span>
                            </div>
                          ) : expiryDate ? (
                            <div className="flex flex-col items-start gap-0.5">
                              <span className={`text-[12px] font-semibold ${isExpired ? "text-rose-600" : daysLeft !== null && daysLeft <= 7 ? "text-amber-600" : "text-slate-700"}`}>
                                {formatDate(expiryDate)}
                              </span>
                              {daysLeft !== null && (
                                <span
                                  className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${
                                    isExpired
                                      ? "border-rose-200 bg-rose-50 text-rose-600"
                                      : daysLeft <= 7
                                      ? "border-amber-200 bg-amber-50 text-amber-700"
                                      : "border-slate-200 bg-slate-50 text-slate-500"
                                  }`}
                                >
                                  {isExpired ? "Expired" : daysLeft === 0 ? "Expires today" : `${daysLeft}d left`}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-[12px] text-slate-400">
                          {formatDate(sub.startDate || sub.createdAt)}
                        </td>

                        <td className="px-5 py-4 text-right">
                          {company?._id && (
                            <button
                              type="button"
                              onClick={() => navigate(`/platform/companies/${company._id}`)}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-[11.5px] font-medium text-slate-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                            >
                              Manage
                              <ExternalLink className="h-3 w-3" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
              <p className="text-[11px] text-slate-400">
                Page <span className="text-slate-600">{page}</span> of{" "}
                <span className="text-slate-600">{totalPages}</span>
              </p>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={page === 1}
                  onClick={() => setPage((c) => Math.max(1, c - 1))}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  disabled={page === totalPages}
                  onClick={() => setPage((c) => Math.min(totalPages, c + 1))}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </PlatformLayout>
  );
}

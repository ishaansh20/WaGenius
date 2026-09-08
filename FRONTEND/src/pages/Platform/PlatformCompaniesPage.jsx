import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  Search,
  Users,
  X,
} from "lucide-react";

import {
  fetchCompanies,
  updateCompanyStatus,
} from "../../services/platformApi";
import PlatformLayout from "../../components/layout/PlatformLayout";

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getStatusLabel(status) {
  if (status === "active") return "Active";
  if (status === "suspended") return "Suspended";
  return status || "Unknown";
}

function getStatusClasses(status) {
  if (status === "active")
    return "border-[#B5C5D5] bg-[#D9E4EE] text-[#1A3652]";
  if (status === "suspended") return "border-red-200 bg-red-50 text-red-600";
  return "border-[#C5D1DE] bg-[#EFF3F8] text-[#6B8BA5]";
}

function getPlanLabel(company) {
  return (
    company?.subscription?.planId?.name ||
    company?.subscription?.plan ||
    company?.plan ||
    company?.pricingPlan ||
    "—"
  );
}

function getSubscriptionStatusBadge(company) {
  const status = company?.subscription?.status;
  if (!status) return null;
  const map = {
    TRIAL: "border-amber-200 bg-amber-50 text-amber-800",
    ACTIVE: "border-[#B5C5D5] bg-[#D9E4EE] text-[#1A3652]",
    PENDING: "border-[#C5D1DE] bg-[#EFF3F8] text-[#6B8BA5]",
    SUSPENDED: "border-red-200 bg-red-50 text-red-600",
    CANCELLED: "border-red-200 bg-red-50 text-red-600",
    EXPIRED: "border-red-200 bg-red-50 text-red-600",
  };
  return (
    <span className={`inline-flex rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${map[status] || "border-[#C5D1DE] bg-[#EFF3F8] text-[#6B8BA5]"}`}>
      {status}
    </span>
  );
}

function getPlanExpiryInfo(company) {
  const sub = company?.subscription;
  if (!sub) {
    return { label: "—", status: "none", isExpired: false, daysLeft: null, isFree: false, isTrial: false };
  }

  const plan = sub.planId;
  const isFree =
    plan?.isFree ||
    plan?.pricing?.monthly === 0 ||
    company?.plan === "Free" ||
    company?.pricingPlan === "Free" ||
    sub?.plan === "Free";

  if (isFree) {
    return { label: "Lifetime", status: "lifetime", isExpired: false, daysLeft: null, isFree: true, isTrial: false };
  }

  const now = new Date();

  if (sub.status === "TRIAL") {
    if (!sub.trialEndsAt) {
      return { label: "Trial (No Date)", status: "trial", isExpired: false, daysLeft: null, isFree: false, isTrial: true };
    }
    const trialEnd = new Date(sub.trialEndsAt);
    const diffTime = trialEnd.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const isExpired = diffDays < 0;

    return {
      label: formatDate(trialEnd),
      status: isExpired ? "expired" : "trial",
      isExpired,
      daysLeft: diffDays,
      isFree: false,
      isTrial: true,
      raw: trialEnd,
    };
  }

  let expiryDate = sub.renewalDate ? new Date(sub.renewalDate) : null;

  // Fallback if renewalDate not explicitly saved
  if (!expiryDate && (sub.startDate || sub.createdAt)) {
    const start = new Date(sub.startDate || sub.createdAt);
    const expiry = new Date(start);
    if (sub.billingCycle === "yearly") {
      expiry.setFullYear(expiry.getFullYear() + 1);
    } else {
      expiry.setMonth(expiry.getMonth() + 1);
    }
    expiryDate = expiry;
  }

  if (!expiryDate) {
    return { label: "—", status: sub.status?.toLowerCase() || "none", isExpired: false, daysLeft: null, isFree: false, isTrial: false };
  }

  const diffTime = expiryDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const isExpired = sub.status === "EXPIRED" || diffDays < 0;

  return {
    label: formatDate(expiryDate),
    status: isExpired ? "expired" : sub.status?.toLowerCase() || "active",
    isExpired,
    daysLeft: diffDays,
    isFree: false,
    isTrial: false,
    raw: expiryDate,
  };
}

function getUserCount(company) {
  return company?.statistics?.users?.total ?? company?.userCount ?? 0;
}

function getCampaignCount(company) {
  return company?.statistics?.campaigns?.total ?? company?.campaignCount ?? 0;
}

function getTemplateCount(company) {
  return company?.statistics?.templates?.total ?? company?.templateCount ?? 0;
}

function getContactCount(company) {
  return company?.statistics?.contacts?.total ?? company?.contactCount ?? 0;
}

function CompanyRow({ company, onView, onToggleStatus, updatingId }) {
  const isActive = company.status === "active";
  const isUpdating = updatingId === company._id;
  const expiryInfo = getPlanExpiryInfo(company);

  return (
    <tr className="border-b border-[#D9E4EE] transition hover:bg-[#EFF3F8]">
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#C5D1DE] bg-[#EFF3F8] text-[#2A4A68]">
            <Building2 className="h-4 w-4 text-[#2A4A68]" />
          </div>
          <div>
            <button
              onClick={() => onView(company)}
              className="text-left font-bold text-[#1A3652] transition hover:underline block"
            >
              {company.name}
            </button>
            <p className="text-xs text-[#8DA3B8]">{company.slug || company._id}</p>
          </div>
        </div>
      </td>

      <td className="px-5 py-4">
        <div className="flex items-center gap-2 text-[12.5px] text-slate-600">
          <Users className="h-3.5 w-3.5 text-slate-400" />
          {getUserCount(company).toLocaleString()}
        </div>
      </td>

      <td className="px-5 py-4">
        <div className="flex flex-col items-start gap-1">
          <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold uppercase text-slate-700">
            {getPlanLabel(company)}
          </span>
          {getSubscriptionStatusBadge(company)}
        </div>
      </td>

      {/* PLAN EXPIRY COLUMN */}
      <td className="px-5 py-4">
        {expiryInfo.status === "none" || expiryInfo.label === "—" ? (
          <span className="text-[12px] text-slate-400">—</span>
        ) : expiryInfo.isFree ? (
          <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
            Lifetime
          </span>
        ) : expiryInfo.isTrial ? (
          <div className="flex flex-col items-start gap-0.5">
            <span
              className={`text-[12px] font-semibold ${
                expiryInfo.isExpired
                  ? "text-rose-600"
                  : expiryInfo.daysLeft <= 3
                  ? "text-amber-600"
                  : "text-slate-700"
              }`}
            >
              {expiryInfo.label}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${
                expiryInfo.isExpired
                  ? "border-rose-200 bg-rose-50 text-rose-600"
                  : expiryInfo.daysLeft <= 3
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : "border-amber-100 bg-amber-50/80 text-amber-800"
              }`}
            >
              <Clock className="h-2.5 w-2.5" />
              {expiryInfo.isExpired
                ? "Trial Expired"
                : `${expiryInfo.daysLeft}d left`}
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-0.5">
            <span
              className={`text-[12px] font-semibold ${
                expiryInfo.isExpired
                  ? "text-rose-600"
                  : expiryInfo.daysLeft !== null && expiryInfo.daysLeft <= 7
                  ? "text-amber-600"
                  : "text-slate-700"
              }`}
            >
              {expiryInfo.label}
            </span>
            {expiryInfo.daysLeft !== null && (
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${
                  expiryInfo.isExpired
                    ? "border-rose-200 bg-rose-50 text-rose-600"
                    : expiryInfo.daysLeft <= 7
                    ? "border-amber-200 bg-amber-50 text-amber-700"
                    : "border-slate-200 bg-slate-50 text-slate-500"
                }`}
              >
                {expiryInfo.isExpired
                  ? "Expired"
                  : expiryInfo.daysLeft === 0
                  ? "Expires today"
                  : `${expiryInfo.daysLeft}d left`}
              </span>
            )}
          </div>
        )}
      </td>

      <td className="px-5 py-4 text-[12.5px] text-slate-600">
        {getCampaignCount(company).toLocaleString()}
      </td>

      <td className="px-5 py-4 text-[12.5px] text-slate-600">
        {getTemplateCount(company).toLocaleString()}
      </td>

      <td className="px-5 py-4 text-[12.5px] text-slate-600">
        {getContactCount(company).toLocaleString()}
      </td>

      <td className="px-5 py-4">
        {company.whatsapp?.connected ? (
          <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-emerald-600">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Connected
          </span>
        ) : (
          <span className="text-[12px] text-slate-400">Not connected</span>
        )}
      </td>

      <td className="px-5 py-4">
        <span
          className={`rounded-full border px-2.5 py-1 text-[10.5px] font-semibold ${getStatusClasses(company.status)}`}
        >
          {getStatusLabel(company.status)}
        </span>
      </td>

      <td className="whitespace-nowrap px-5 py-4 text-[12px] text-slate-400">
        {formatDate(company.createdAt)}
      </td>

      <td className="px-5 py-4">
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => onView(company._id)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11.5px] font-medium text-slate-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
          >
            View
          </button>

          <button
            type="button"
            disabled={isUpdating}
            onClick={() => onToggleStatus(company)}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition disabled:cursor-not-allowed disabled:opacity-50 ${
              isActive
                ? "border-red-200 text-red-500 hover:bg-red-50"
                : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
            }`}
            title={isActive ? "Suspend company" : "Reactivate company"}
          >
            {isUpdating ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : isActive ? (
              <PauseCircle className="h-3.5 w-3.5" />
            ) : (
              <PlayCircle className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function PlatformCompaniesPage() {
  const navigate = useNavigate();

  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [whatsappFilter, setWhatsappFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [expiryFilter, setExpiryFilter] = useState("all");

  const [page, setPage] = useState(1);
  const [updatingId, setUpdatingId] = useState(null);

  const pageSize = 10;

  async function loadCompanies(showRefreshLoader = false) {
    try {
      if (showRefreshLoader) setRefreshing(true);
      else setLoading(true);

      const res = await fetchCompanies();
      setCompanies(res.data || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load companies");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, whatsappFilter, planFilter, expiryFilter]);

  const availablePlans = useMemo(() => {
    const plans = companies
      .map((c) => getPlanLabel(c))
      .filter((p) => p && p !== "—");
    return [...new Set(plans)];
  }, [companies]);

  const filteredCompanies = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return companies.filter((company) => {
      const matchesSearch =
        !normalizedSearch ||
        company.name?.toLowerCase().includes(normalizedSearch) ||
        company._id?.toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "all" || company.status === statusFilter;

      const matchesWhatsapp =
        whatsappFilter === "all" ||
        (whatsappFilter === "connected"
          ? company.whatsapp?.connected
          : !company.whatsapp?.connected);

      const matchesPlan =
        planFilter === "all" || getPlanLabel(company) === planFilter;

      const expiry = getPlanExpiryInfo(company);
      const matchesExpiry =
        expiryFilter === "all" ||
        (expiryFilter === "active" && !expiry.isExpired && expiry.status !== "none") ||
        (expiryFilter === "expiring_soon" && !expiry.isExpired && expiry.daysLeft !== null && expiry.daysLeft <= 7) ||
        (expiryFilter === "expired" && expiry.isExpired) ||
        (expiryFilter === "trial" && expiry.isTrial) ||
        (expiryFilter === "lifetime" && expiry.isFree);

      return (
        matchesSearch &&
        matchesStatus &&
        matchesWhatsapp &&
        matchesPlan &&
        matchesExpiry
      );
    });
  }, [companies, search, statusFilter, whatsappFilter, planFilter, expiryFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredCompanies.length / pageSize),
  );
  const paginatedCompanies = filteredCompanies.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );
  const hasFilters =
    search ||
    statusFilter !== "all" ||
    whatsappFilter !== "all" ||
    planFilter !== "all" ||
    expiryFilter !== "all";

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setWhatsappFilter("all");
    setPlanFilter("all");
    setExpiryFilter("all");
  }

  async function handleToggleStatus(company) {
    const nextStatus = company.status === "active" ? "suspended" : "active";

    if (
      nextStatus === "suspended" &&
      !window.confirm(
        `Suspend ${company.name}? Their team will lose access immediately.`,
      )
    ) {
      return;
    }

    try {
      setUpdatingId(company._id);
      await updateCompanyStatus(company._id, nextStatus);
      toast.success(
        nextStatus === "suspended"
          ? "Company suspended"
          : "Company reactivated",
      );
      await loadCompanies(true);
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to update company status",
      );
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <PlatformLayout
      title="Company Management"
      description="Manage every company registered on the Wagenius platform."
      actions={
        <button
          type="button"
          onClick={() => loadCompanies(true)}
          disabled={refreshing}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
          />
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
              placeholder="Search company name or ID..."
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
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>

          <select
            value={whatsappFilter}
            onChange={(e) => setWhatsappFilter(e.target.value)}
            className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-[12px] text-slate-600 outline-none focus:border-emerald-400"
          >
            <option value="all">All WhatsApp</option>
            <option value="connected">Connected</option>
            <option value="not_connected">Not Connected</option>
          </select>

          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-[12px] text-slate-600 outline-none focus:border-emerald-400"
          >
            <option value="all">All Plans</option>
            {availablePlans.map((plan) => (
              <option key={plan} value={plan}>
                {plan}
              </option>
            ))}
          </select>

          <select
            value={expiryFilter}
            onChange={(e) => setExpiryFilter(e.target.value)}
            className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-[12px] text-slate-600 outline-none focus:border-emerald-400"
          >
            <option value="all">All Expiry</option>
            <option value="active">Active / Valid</option>
            <option value="expiring_soon">Expiring Soon (≤ 7d)</option>
            <option value="expired">Expired Plans</option>
            <option value="trial">In Trial</option>
            <option value="lifetime">Lifetime / Free</option>
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
            Showing{" "}
            <span className="font-medium text-slate-600">
              {filteredCompanies.length}
            </span>{" "}
            of{" "}
            <span className="font-medium text-slate-600">
              {companies.length}
            </span>{" "}
            companies
          </p>
          {hasFilters && (
            <p className="text-[11px] text-emerald-600">Filters applied</p>
          )}
        </div>
      </div>

      {/* TABLE */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-[#F5F8FB] shadow-sm">
        {loading ? (
          <div className="flex min-h-[350px] items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-600" />
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="flex min-h-[350px] flex-col items-center justify-center px-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50">
              <Building2 className="h-5 w-5 text-slate-400" />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-slate-700">
              No companies found
            </h3>
            <p className="mt-1 max-w-sm text-[12px] text-slate-400">
              No company matches the current search or filters.
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
              <table className="w-full min-w-[1250px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    {[
                      "Company",
                      "Users",
                      "Plan",
                      "Plan Expiry",
                      "Campaigns",
                      "Templates",
                      "Contacts",
                      "WhatsApp",
                      "Status",
                      "Created",
                      "",
                    ].map((label, i) => (
                      <th
                        key={label + i}
                        className={`px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400 ${
                          i === 10 ? "text-right" : "text-left"
                        }`}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedCompanies.map((company) => (
                    <CompanyRow
                      key={company._id}
                      company={company}
                      onView={(id) => {
                        const compId = typeof id === "object" ? (id?._id || id?.id) : id;
                        if (compId && compId !== "[object Object]") navigate(`/platform/companies/${compId}`);
                      }}
                      onToggleStatus={handleToggleStatus}
                      updatingId={updatingId}
                    />
                  ))}
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
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  disabled={page === totalPages}
                  onClick={() =>
                    setPage((current) => Math.min(totalPages, current + 1))
                  }
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

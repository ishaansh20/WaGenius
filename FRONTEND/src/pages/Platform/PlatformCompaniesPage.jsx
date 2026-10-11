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
import { Badge, Button, Card, StatusPill, Tabs } from "../../components/ui";

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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

const SELECT_CLASS =
  "h-10 rounded-lg border border-line-strong bg-surface px-3 text-[14px] text-ink outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100";

function ExpiryCell({ expiryInfo }) {
  if (expiryInfo.status === "none" || expiryInfo.label === "—") {
    return <span className="text-[14px] text-ink-muted">—</span>;
  }
  if (expiryInfo.isFree) {
    return <Badge tone="neutral">Lifetime</Badge>;
  }
  const warnAt = expiryInfo.isTrial ? 3 : 7;
  const tone = expiryInfo.isExpired
    ? "danger"
    : expiryInfo.daysLeft !== null && expiryInfo.daysLeft <= warnAt
    ? "warning"
    : expiryInfo.isTrial
    ? "warning"
    : "neutral";
  const textClass = expiryInfo.isExpired
    ? "text-danger"
    : expiryInfo.daysLeft !== null && expiryInfo.daysLeft <= warnAt
    ? "text-warning"
    : "text-ink";

  let pill = null;
  if (expiryInfo.isTrial) {
    pill = expiryInfo.isExpired ? "Trial expired" : `${expiryInfo.daysLeft}d left`;
  } else if (expiryInfo.daysLeft !== null) {
    pill = expiryInfo.isExpired
      ? "Expired"
      : expiryInfo.daysLeft === 0
      ? "Expires today"
      : `${expiryInfo.daysLeft}d left`;
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <span className={`text-[14px] font-medium ${textClass}`}>{expiryInfo.label}</span>
      {pill && (
        <Badge tone={tone}>
          {expiryInfo.isTrial && <Clock className="h-3 w-3" />}
          {pill}
        </Badge>
      )}
    </div>
  );
}

function CompanyRow({ company, onView, onToggleStatus, updatingId }) {
  const isActive = company.status === "active";
  const isUpdating = updatingId === company._id;
  const expiryInfo = getPlanExpiryInfo(company);

  return (
    <tr className="transition-colors hover:bg-canvas">
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
            <Building2 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => onView(company)}
              className="block text-left text-[14px] font-semibold text-ink transition hover:text-brand-700 hover:underline"
            >
              {company.name}
            </button>
            <p className="text-[13px] text-ink-muted">{company.slug || company._id}</p>
          </div>
        </div>
      </td>

      <td className="px-4 py-3.5">
        <div className="flex items-center gap-2 text-[14px] text-ink tabular-nums">
          <Users className="h-3.5 w-3.5 text-ink-muted" />
          {getUserCount(company).toLocaleString()}
        </div>
      </td>

      <td className="px-4 py-3.5">
        <div className="flex flex-col items-start gap-1">
          <Badge tone="brand">{getPlanLabel(company)}</Badge>
          {company?.subscription?.status && (
            <StatusPill status={company.subscription.status} />
          )}
        </div>
      </td>

      <td className="px-4 py-3.5">
        <ExpiryCell expiryInfo={expiryInfo} />
      </td>

      <td className="px-4 py-3.5 text-[14px] text-ink tabular-nums">
        {getCampaignCount(company).toLocaleString()}
      </td>
      <td className="px-4 py-3.5 text-[14px] text-ink tabular-nums">
        {getTemplateCount(company).toLocaleString()}
      </td>
      <td className="px-4 py-3.5 text-[14px] text-ink tabular-nums">
        {getContactCount(company).toLocaleString()}
      </td>

      <td className="px-4 py-3.5">
        {company.whatsapp?.connected ? (
          <span className="inline-flex items-center gap-1.5 text-[14px] font-medium text-brand-700">
            <CheckCircle2 className="h-4 w-4" />
            Connected
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-[14px] text-ink-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-ink-subtle" />
            Not connected
          </span>
        )}
      </td>

      <td className="px-4 py-3.5">
        <StatusPill status={company.status || "unknown"} />
      </td>

      <td className="whitespace-nowrap px-4 py-3.5 text-[14px] text-ink-muted">
        {formatDate(company.createdAt)}
      </td>

      <td className="px-4 py-3.5">
        <div className="flex items-center justify-end gap-1.5">
          <Button variant="secondary" size="sm" onClick={() => onView(company._id)}>
            View
          </Button>
          <Button
            variant={isActive ? "danger-ghost" : "secondary"}
            size="sm"
            disabled={isUpdating}
            onClick={() => onToggleStatus(company)}
            title={isActive ? "Suspend company" : "Reactivate company"}
          >
            {isUpdating ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : isActive ? (
              <PauseCircle className="h-3.5 w-3.5" />
            ) : (
              <PlayCircle className="h-3.5 w-3.5" />
            )}
            {isActive ? "Suspend" : "Activate"}
          </Button>
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


  const statusTabs = [
    { value: "all", label: "All", count: companies.length },
    { value: "active", label: "Active", count: companies.filter((c) => c.status === "active").length },
    { value: "suspended", label: "Suspended", count: companies.filter((c) => c.status === "suspended").length },
  ];

  return (
    <PlatformLayout
      title="Companies"
      description="Manage every company registered on the Wagenius platform."
      actions={
        <Button
          variant="secondary"
          onClick={() => loadCompanies(true)}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      }
    >
      <div className="space-y-5">
        {/* Toolbar */}
        <Card className="!p-4 sm:!p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search company name or ID"
                className="h-10 w-full rounded-lg border border-line-strong bg-surface pl-9 pr-9 text-[14px] text-ink outline-none transition placeholder:text-ink-subtle focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Tabs items={statusTabs} value={statusFilter} onChange={setStatusFilter} />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2.5">
            <select
              value={whatsappFilter}
              onChange={(e) => setWhatsappFilter(e.target.value)}
              className={SELECT_CLASS}
              aria-label="WhatsApp filter"
            >
              <option value="all">All WhatsApp</option>
              <option value="connected">Connected</option>
              <option value="not_connected">Not connected</option>
            </select>

            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className={SELECT_CLASS}
              aria-label="Plan filter"
            >
              <option value="all">All plans</option>
              {availablePlans.map((plan) => (
                <option key={plan} value={plan}>
                  {plan}
                </option>
              ))}
            </select>

            <select
              value={expiryFilter}
              onChange={(e) => setExpiryFilter(e.target.value)}
              className={SELECT_CLASS}
              aria-label="Plan expiry filter"
            >
              <option value="all">All expiry</option>
              <option value="active">Active / valid</option>
              <option value="expiring_soon">Expiring soon (7 days or less)</option>
              <option value="expired">Expired plans</option>
              <option value="trial">In trial</option>
              <option value="lifetime">Lifetime / free</option>
            </select>

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <Filter className="h-3.5 w-3.5" />
                Clear filters
              </Button>
            )}

            <p className="ml-auto text-[13px] text-ink-muted">
              Showing{" "}
              <span className="font-medium text-ink">{filteredCompanies.length}</span>{" "}
              of <span className="font-medium text-ink">{companies.length}</span> companies
              {hasFilters && <span className="text-brand-700"> · filters applied</span>}
            </p>
          </div>
        </Card>

        {/* Table */}
        <Card padded={false} className="overflow-hidden">
          {loading ? (
            <div className="flex min-h-[350px] items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-brand-600" />
            </div>
          ) : filteredCompanies.length === 0 ? (
            <div className="m-5 flex min-h-[300px] flex-col items-center justify-center rounded-xl bg-canvas px-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface shadow-[var(--shadow-card)]">
                <Building2 className="h-5 w-5 text-brand-700" />
              </div>
              <h3 className="mt-4 text-[15px] font-semibold text-ink">No companies found</h3>
              <p className="mt-1 max-w-sm text-[14px] text-ink-muted">
                No company matches the current search or filters.
              </p>
              {hasFilters && (
                <Button variant="secondary" className="mt-4" onClick={clearFilters}>
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="relative overflow-x-auto">
                <table className="w-full min-w-[1250px]">
                  <thead>
                    <tr className="bg-[#f6f7f6]">
                      {[
                        "Company",
                        "Users",
                        "Plan",
                        "Plan expiry",
                        "Campaigns",
                        "Templates",
                        "Contacts",
                        "WhatsApp",
                        "Status",
                        "Created",
                        "Actions",
                      ].map((label, i) => (
                        <th
                          key={label}
                          className={`whitespace-nowrap px-4 py-3 text-[13px] font-medium text-ink-muted ${
                            i === 10 ? "text-right" : "text-left"
                          }`}
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
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

              <div className="flex items-center justify-between border-t border-line px-4 py-3">
                <p className="text-[13px] text-ink-muted">
                  Page <span className="font-medium text-ink">{page}</span> of{" "}
                  <span className="font-medium text-ink">{totalPages}</span>
                </p>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="secondary"
                    size="icon-sm"
                    disabled={page === 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon-sm"
                    disabled={page === totalPages}
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>
    </PlatformLayout>
  );
}

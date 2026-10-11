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
  ChevronDown,
  Clock,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { fetchAllSubscriptions, fetchAllPlans } from "../../services/platformApi";
import PlatformLayout from "../../components/layout/PlatformLayout";
import { Badge, Button, Card, EmptyState, StatCard, StatusPill, Tabs } from "../../components/ui";

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const STATUS_OPTIONS = [
  { value: "TRIAL", label: "Trial" },
  { value: "ACTIVE", label: "Active" },
  { value: "PENDING", label: "Pending" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "EXPIRED", label: "Expired" },
];

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

  const statusCounts = subscriptions.reduce((acc, sub) => {
    acc[sub.status] = (acc[sub.status] || 0) + 1;
    return acc;
  }, {});

  const statusTabs = [
    { value: "all", label: "All", count: subscriptions.length },
    ...STATUS_OPTIONS.map((s) => ({ value: s.value, label: s.label, count: statusCounts[s.value] || 0 })),
  ];

  return (
    <PlatformLayout
      title="Subscriptions"
      description="Every company's plan, billing cycle, trial and renewal date."
      actions={
        <Button
          variant="secondary"
          onClick={() => loadData(true)}
          disabled={refreshing}
          leftIcon={RefreshCw}
          className={refreshing ? "[&>svg]:animate-spin" : ""}
        >
          Refresh
        </Button>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total subscriptions" value={loading ? "—" : subscriptions.length} icon={CreditCard} />
          <StatCard label="Active" value={loading ? "—" : statusCounts.ACTIVE || 0} icon={CheckCircle2} />
          <StatCard label="On trial" value={loading ? "—" : statusCounts.TRIAL || 0} icon={Clock} />
          <StatCard
            label="Suspended, cancelled or expired"
            value={loading ? "—" : (statusCounts.SUSPENDED || 0) + (statusCounts.CANCELLED || 0) + (statusCounts.EXPIRED || 0)}
            icon={AlertTriangle}
          />
        </div>

        <Card className="p-4 sm:p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-subtle" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by company or plan name"
                className="h-10 w-full rounded-lg border border-line-strong bg-surface pl-10 pr-9 text-[14px] text-ink outline-none transition placeholder:text-ink-subtle focus:border-brand-600 focus:ring-4 focus:ring-brand-600/12"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="relative">
              <select
                aria-label="Filter by plan"
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                className="h-10 appearance-none rounded-lg border border-line-strong bg-surface pl-3 pr-9 text-[14px] text-ink outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-brand-600/12"
              >
                <option value="all">All plans</option>
                {plans.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-subtle" />
            </div>

            {hasFilters && (
              <Button variant="ghost" leftIcon={Filter} onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
            <Tabs items={statusTabs} value={statusFilter} onChange={setStatusFilter} />
            <p className="text-[13px] text-ink-muted">
              Showing <span className="font-medium text-ink">{filteredSubscriptions.length}</span> of{" "}
              <span className="font-medium text-ink">{subscriptions.length}</span> subscriptions
              {hasFilters && <span className="text-brand-700"> · Filters applied</span>}
            </p>
          </div>
        </Card>

        <Card padded={false} className="overflow-hidden">
          {loading ? (
            <div className="flex min-h-[350px] items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-brand-600" />
            </div>
          ) : filteredSubscriptions.length === 0 ? (
            <div className="p-5">
              <EmptyState
                icon={CreditCard}
                title="No subscriptions found"
                description="No subscriptions match your search or filters."
                action={
                  hasFilters ? (
                    <Button variant="secondary" onClick={clearFilters}>
                      Clear filters
                    </Button>
                  ) : null
                }
              />
            </div>
          ) : (
            <>
              <div className="relative overflow-x-auto">
                <table className="w-full min-w-[1100px] text-left">
                  <thead className="bg-[#f6f7f6] text-[13px] text-ink-muted">
                    <tr>
                      {["Company", "Plan", "Price", "Billing cycle", "Status", "Plan expiry", "Start date", ""].map((label, i) => (
                        <th key={label + i} className={`px-4 py-3 font-medium ${i === 7 ? "text-right" : "text-left"}`}>
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line text-[14px] text-ink">
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

                      const dateTone = (threshold) =>
                        isExpired ? "text-danger" : daysLeft !== null && daysLeft <= threshold ? "text-warning" : "text-ink";

                      return (
                        <tr key={sub._id} className="transition hover:bg-canvas">
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                                <Building2 size={16} />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate font-medium text-ink">{company?.name || "Unknown company"}</p>
                                <p className="mt-0.5 truncate text-[13px] text-ink-muted">ID: {company?._id || sub.companyId}</p>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            <Badge>{plan?.name || "Custom / unknown"}</Badge>
                          </td>

                          <td className="whitespace-nowrap px-4 py-3.5 font-medium tabular-nums text-ink">
                            ₹{price ?? 0}
                            <span className="text-[13px] font-normal text-ink-muted">/{sub.billingCycle === "yearly" ? "yr" : "mo"}</span>
                          </td>

                          <td className="px-4 py-3.5 capitalize text-ink-muted">{sub.billingCycle || "monthly"}</td>

                          <td className="px-4 py-3.5">
                            <StatusPill status={sub.status} />
                          </td>

                          <td className="px-4 py-3.5">
                            {isFree ? (
                              <Badge>Lifetime</Badge>
                            ) : isTrial && expiryDate ? (
                              <div className="flex flex-col items-start gap-1">
                                <span className={`font-medium ${dateTone(3)}`}>{formatDate(expiryDate)}</span>
                                <Badge tone={isExpired ? "danger" : "warning"}>
                                  <Clock size={12} />
                                  {isExpired ? "Trial expired" : `${daysLeft}d trial left`}
                                </Badge>
                              </div>
                            ) : expiryDate ? (
                              <div className="flex flex-col items-start gap-1">
                                <span className={`font-medium ${dateTone(7)}`}>{formatDate(expiryDate)}</span>
                                {daysLeft !== null && (
                                  <Badge tone={isExpired ? "danger" : daysLeft <= 7 ? "warning" : "neutral"}>
                                    {isExpired ? "Expired" : daysLeft === 0 ? "Expires today" : `${daysLeft}d left`}
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-ink-muted">—</span>
                            )}
                          </td>

                          <td className="whitespace-nowrap px-4 py-3.5 text-ink-muted">{formatDate(sub.startDate || sub.createdAt)}</td>

                          <td className="px-4 py-3.5 text-right">
                            {company?._id && (
                              <Button
                                variant="secondary"
                                size="sm"
                                rightIcon={ExternalLink}
                                onClick={() => navigate(`/platform/companies/${company._id}`)}
                              >
                                Manage
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between border-t border-line px-4 py-3">
                <p className="text-[13px] text-ink-muted">
                  Page <span className="font-medium text-ink">{page}</span> of <span className="font-medium text-ink">{totalPages}</span>
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="secondary"
                    size="icon-sm"
                    aria-label="Previous page"
                    disabled={page === 1}
                    onClick={() => setPage((c) => Math.max(1, c - 1))}
                  >
                    <ChevronLeft size={16} />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon-sm"
                    aria-label="Next page"
                    disabled={page === totalPages}
                    onClick={() => setPage((c) => Math.min(totalPages, c + 1))}
                  >
                    <ChevronRight size={16} />
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

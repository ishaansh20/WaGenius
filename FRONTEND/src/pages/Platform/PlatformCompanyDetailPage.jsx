import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  ArrowLeft,
  CreditCard,
  Users,
  MessageCircle,
  Megaphone,
  FileText,
  PauseCircle,
  PlayCircle,
  Pencil,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Radio,
  X,
} from "lucide-react";

import {
  fetchCompanyDetail,
  fetchCompanyUsers,
  updateCompanyStatus,
  fetchAllPlans,
  updateCompanySubscription,
  fetchCompanyCampaigns,
  fetchCompanyTemplates,
  fetchCompanyContactsSummary,
  fetchCompanyWhatsAppHealth,
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

function formatDateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const statusClasses = {
  TRIAL: "border-amber-200 bg-amber-50 text-amber-700",
  ACTIVE: "border-emerald-200 bg-emerald-50 text-emerald-700",
  PENDING: "border-slate-200 bg-slate-50 text-slate-500",
  SUSPENDED: "border-red-200 bg-red-50 text-red-600",
  CANCELLED: "border-red-200 bg-red-50 text-red-600",
  EXPIRED: "border-red-200 bg-red-50 text-red-600",
};

const metaStatusClasses = {
  APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  PENDING: "border-amber-200 bg-amber-50 text-amber-700",
  REJECTED: "border-rose-200 bg-rose-50 text-rose-700",
  PAUSED: "border-yellow-200 bg-yellow-50 text-yellow-700",
  DISABLED: "border-slate-200 bg-slate-50 text-slate-600",
  not_submitted: "border-slate-200 bg-slate-50 text-slate-500",
};

const campaignStatusClasses = {
  completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  processing: "border-blue-200 bg-blue-50 text-blue-700",
  scheduled: "border-sky-200 bg-sky-50 text-sky-700",
  failed: "border-rose-200 bg-rose-50 text-rose-700",
  draft: "border-slate-200 bg-slate-50 text-slate-600",
};

function StatBlock({ icon: Icon, label, value, subtext }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
        <Icon className="h-4 w-4 text-emerald-600" />
      </div>
      <p className="mt-3 text-[10px] font-medium uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold text-slate-950">{value}</p>
      {subtext && <p className="mt-0.5 text-xs text-slate-500">{subtext}</p>}
    </div>
  );
}

export default function PlatformCompanyDetailPage() {
  const { companyId } = useParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("overview");

  const [detail, setDetail] = useState(null);
  const [users, setUsers] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [contactsSummary, setContactsSummary] = useState(null);
  const [whatsappHealth, setWhatsappHealth] = useState(null);

  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);
  const [updating, setUpdating] = useState(false);

  const [subModalOpen, setSubModalOpen] = useState(false);
  const [availablePlans, setAvailablePlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [subStatus, setSubStatus] = useState("ACTIVE");
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [extendDays, setExtendDays] = useState("");
  const [customRenewalDate, setCustomRenewalDate] = useState("");
  const [customTrialEndsAt, setCustomTrialEndsAt] = useState("");
  const [savingSub, setSavingSub] = useState(false);

  async function loadCoreDetail() {
    try {
      setLoading(true);
      const [detailRes, usersRes] = await Promise.all([
        fetchCompanyDetail(companyId),
        fetchCompanyUsers(companyId).catch(() => ({ data: { users: [] } })),
      ]);

      const detailData = detailRes.data || detailRes;
      setDetail(detailData);
      setUsers(usersRes?.data?.users || []);

      if (detailData?.subscription) {
        setSelectedPlanId(detailData.subscription.planId?._id || detailData.subscription.planId || "");
        setSubStatus(detailData.subscription.status || "ACTIVE");
        setBillingCycle(detailData.subscription.billingCycle || "monthly");
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load company details");
    } finally {
      setLoading(false);
    }
  }

  async function loadTabData(tab) {
    if (tab === "overview") return;
    try {
      setTabLoading(true);
      if (tab === "campaigns" && campaigns.length === 0) {
        const res = await fetchCompanyCampaigns(companyId);
        setCampaigns(res.data || []);
      } else if (tab === "templates" && templates.length === 0) {
        const res = await fetchCompanyTemplates(companyId);
        setTemplates(res.data || []);
      } else if (tab === "contacts" && !contactsSummary) {
        const res = await fetchCompanyContactsSummary(companyId);
        setContactsSummary(res.data || null);
      } else if (tab === "whatsapp" && !whatsappHealth) {
        const res = await fetchCompanyWhatsAppHealth(companyId);
        setWhatsappHealth(res.data || null);
      }
    } catch (error) {
      console.error(`Failed to load data for tab ${tab}:`, error);
    } finally {
      setTabLoading(false);
    }
  }

  useEffect(() => {
    if (!companyId || companyId === "[object Object]" || companyId === "undefined") {
      navigate("/platform/companies", { replace: true });
      return;
    }
    loadCoreDetail();
  }, [companyId]);

  useEffect(() => {
    if (!companyId || companyId === "[object Object]" || companyId === "undefined") {
      return;
    }
    loadTabData(activeTab);
  }, [companyId, activeTab]);

  async function openSubModal() {
    try {
      const plansRes = await fetchAllPlans();
      setAvailablePlans(plansRes.data || []);
      if (detail?.subscription) {
        setSelectedPlanId(detail.subscription.planId?._id || detail.subscription.planId || "");
        setSubStatus(detail.subscription.status || "ACTIVE");
        setBillingCycle(detail.subscription.billingCycle || "monthly");
        setCustomRenewalDate(
          detail.subscription.renewalDate
            ? new Date(detail.subscription.renewalDate).toISOString().split("T")[0]
            : ""
        );
        setCustomTrialEndsAt(
          detail.subscription.trialEndsAt
            ? new Date(detail.subscription.trialEndsAt).toISOString().split("T")[0]
            : ""
        );
      } else {
        setCustomRenewalDate("");
        setCustomTrialEndsAt("");
      }
      setExtendDays("");
      setSubModalOpen(true);
    } catch {
      toast.error("Failed to load plans list");
    }
  }

  async function handleSaveSubscription(e) {
    e.preventDefault();
    try {
      setSavingSub(true);
      const payload = {};
      if (selectedPlanId) payload.planId = selectedPlanId;
      if (subStatus) payload.status = subStatus;
      if (billingCycle) payload.billingCycle = billingCycle;
      if (extendDays && Number(extendDays) > 0) {
        payload.extendTrialDays = Number(extendDays);
      }
      if (customRenewalDate) {
        payload.renewalDate = new Date(customRenewalDate).toISOString();
      }
      if (customTrialEndsAt) {
        payload.trialEndsAt = new Date(customTrialEndsAt).toISOString();
      }

      await updateCompanySubscription(companyId, payload);
      toast.success("Subscription updated successfully");
      setSubModalOpen(false);
      await loadCoreDetail();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update subscription");
    } finally {
      setSavingSub(false);
    }
  }

  async function handleToggleStatus() {
    if (!company) return;

    const nextStatus = company.status === "active" ? "suspended" : "active";

    if (
      nextStatus === "suspended" &&
      !window.confirm(`Suspend ${company.name}? Their team will lose access immediately.`)
    ) {
      return;
    }

    try {
      setUpdating(true);
      await updateCompanyStatus(companyId, nextStatus);
      toast.success(nextStatus === "suspended" ? "Company suspended" : "Company reactivated");
      await loadCoreDetail();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update company status");
    } finally {
      setUpdating(false);
    }
  }

  const company = detail?.company;
  const subscription = detail?.subscription;
  const currentPlan = subscription?.planId;

  const TABS = [
    { id: "overview", label: "Overview & Plan", icon: CreditCard },
    { id: "users", label: `Users (${detail?.users?.total ?? users.length})`, icon: Users },
    { id: "campaigns", label: `Campaigns (${detail?.campaigns?.total ?? 0})`, icon: Megaphone },
    { id: "templates", label: `Templates (${detail?.templates?.total ?? 0})`, icon: FileText },
    { id: "whatsapp", label: "WhatsApp Health", icon: Radio },
    { id: "contacts", label: `Contacts (${detail?.contacts?.total ?? 0})`, icon: MessageCircle },
  ];

  return (
    <PlatformLayout
      title={loading ? "Company Details" : company?.name || "Company"}
      description="Deep visibility, subscription management, resource feeds, and WhatsApp health."
      actions={
        <button
          type="button"
          onClick={() => navigate("/platform/companies")}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Companies
        </button>
      }
    >
      {loading ? (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-600" />
        </div>
      ) : !company ? (
        <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-slate-200 bg-[#F5F8FB]">
          <p className="text-sm text-slate-500">Company details not found.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* HEADER SUMMARY BAR */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-[#F5F8FB] p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-base font-bold text-white shadow-sm">
                {company.name?.charAt(0)?.toUpperCase() || "C"}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900">{company.name}</h2>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                      company.status === "active"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-red-200 bg-red-50 text-red-600"
                    }`}
                  >
                    {company.status}
                  </span>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                      statusClasses[subscription?.status] || statusClasses.PENDING
                    }`}
                  >
                    {subscription?.status || "NO PLAN"}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-400">
                  Slug: <span className="font-mono text-slate-600">{company.slug}</span> • ID:{" "}
                  <span className="font-mono text-slate-600">{company._id}</span> • Joined{" "}
                  {formatDate(company.createdAt)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={openSubModal}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-[#F5F8FB] px-3.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <Pencil className="h-3.5 w-3.5 text-slate-500" />
                Manage Plan
              </button>
              <button
                disabled={updating}
                onClick={handleToggleStatus}
                className={`inline-flex h-9 items-center gap-1.5 rounded-xl px-3.5 text-xs font-semibold text-white shadow-sm transition disabled:opacity-50 ${
                  company.status === "active"
                    ? "bg-red-600 hover:bg-red-500"
                    : "bg-emerald-600 hover:bg-emerald-500"
                }`}
              >
                {company.status === "active" ? (
                  <>
                    <PauseCircle className="h-3.5 w-3.5" />
                    Suspend
                  </>
                ) : (
                  <>
                    <PlayCircle className="h-3.5 w-3.5" />
                    Reactivate
                  </>
                )}
              </button>
            </div>
          </div>

          {/* NAVIGATION TABS */}
          <div className="flex space-x-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-100/70 p-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition ${
                    isActive
                      ? "bg-[#F5F8FB] text-emerald-800 shadow-sm"
                      : "text-slate-600 hover:bg-[#F5F8FB]/50 hover:text-slate-900"
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${isActive ? "text-emerald-600" : "text-slate-400"}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* TAB 1: OVERVIEW & SUBSCRIPTION */}
          {activeTab === "overview" && (
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-2">
                {/* USAGE METRICS */}
                <div className="rounded-2xl border border-slate-200 bg-[#F5F8FB] p-6 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-900">Resource Usage</h3>
                  <div className="mt-4 grid gap-3 sm:grid-cols-4">
                    <StatBlock icon={Users} label="Users" value={detail?.users?.total ?? 0} subtext={`${detail?.users?.active ?? 0} active`} />
                    <StatBlock icon={MessageCircle} label="Contacts" value={detail?.contacts?.total ?? 0} />
                    <StatBlock icon={Megaphone} label="Campaigns" value={detail?.campaigns?.total ?? 0} />
                    <StatBlock icon={FileText} label="Templates" value={detail?.templates?.total ?? 0} />
                  </div>
                </div>

                {/* COMPANY METADATA */}
                <div className="rounded-2xl border border-slate-200 bg-[#F5F8FB] p-6 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-900">Company Profile</h3>
                  <div className="mt-4 grid gap-5 sm:grid-cols-2">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-400">Owner User</p>
                      <p className="mt-1 text-sm font-medium text-slate-800">
                        {users.find((u) => u.role === "ADMIN")?.name || "No Admin Found"} (
                        {users.find((u) => u.role === "ADMIN")?.email || "—"})
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-400">Total Conversations</p>
                      <p className="mt-1 text-sm font-medium text-slate-800">
                        {detail?.conversations?.total ?? 0} threads
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-400">WhatsApp Onboarding</p>
                      <p className="mt-1 text-sm font-medium text-slate-800">
                        {company.whatsapp?.onboardingCompletedAt
                          ? `Completed on ${formatDate(company.whatsapp.onboardingCompletedAt)}`
                          : "Pending / Incomplete"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-400">Created At</p>
                      <p className="mt-1 text-sm font-medium text-slate-800">{formatDateTime(company.createdAt)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* SUBSCRIPTION CARD */}
              <div className="space-y-6">
                <div className="rounded-2xl border border-slate-200 bg-[#F5F8FB] p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-emerald-600" />
                      <h3 className="text-sm font-semibold text-slate-900">Subscription</h3>
                    </div>
                    <button
                      onClick={openSubModal}
                      className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:underline"
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </button>
                  </div>

                  <div className="mt-4 space-y-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-400">Plan</p>
                      <p className="mt-1 text-base font-bold text-slate-900">
                        {currentPlan?.name || "No Plan Selected"}
                      </p>
                      {currentPlan?.pricing && (
                        <p className="text-xs text-slate-500">
                          ₹{subscription?.billingCycle === "yearly" ? currentPlan.pricing.yearly : currentPlan.pricing.monthly}
                          /{subscription?.billingCycle === "yearly" ? "year" : "month"}
                        </p>
                      )}
                    </div>

                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-400">Status</p>
                      <div className="mt-1">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                            statusClasses[subscription?.status] || statusClasses.PENDING
                          }`}
                        >
                          {subscription?.status || "NO SUBSCRIPTION"}
                        </span>
                      </div>
                    </div>

                    {/* PLAN EXPIRY / RENEWAL */}
                    {currentPlan?.isFree || currentPlan?.pricing?.monthly === 0 ? (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-slate-400">Plan Expiry</p>
                        <p className="mt-1 text-xs font-semibold text-slate-700">
                          Lifetime Access (No Expiry)
                        </p>
                      </div>
                    ) : subscription?.status === "TRIAL" ? (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-slate-400">Trial Period</p>
                        {subscription.trialEndsAt ? (
                          <div className="mt-1 flex items-center gap-2">
                            <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                              <Clock className="h-3.5 w-3.5" />
                              Ends {formatDate(subscription.trialEndsAt)}
                            </span>
                            {(() => {
                              const diffDays = Math.ceil(
                                (new Date(subscription.trialEndsAt).getTime() - new Date().getTime()) /
                                  (1000 * 60 * 60 * 24),
                              );
                              return (
                                <span
                                  className={`rounded-full border px-2 py-0.2 text-[10px] font-semibold ${
                                    diffDays < 0
                                      ? "border-rose-200 bg-rose-50 text-rose-600"
                                      : diffDays <= 3
                                      ? "border-amber-200 bg-amber-50 text-amber-700"
                                      : "border-amber-100 bg-amber-50/80 text-amber-800"
                                  }`}
                                >
                                  {diffDays < 0 ? "Expired" : `${diffDays} days remaining`}
                                </span>
                              );
                            })()}
                          </div>
                        ) : (
                          <p className="mt-1 text-xs text-slate-500">—</p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-slate-400">
                          {subscription?.status === "EXPIRED" ? "Expired On" : "Plan Expiry / Renewal Date"}
                        </p>
                        {subscription?.renewalDate || subscription?.startDate ? (
                          <div className="mt-1 flex items-center gap-2">
                            {(() => {
                              let expDate = subscription.renewalDate ? new Date(subscription.renewalDate) : null;
                              if (!expDate && (subscription.startDate || subscription.createdAt)) {
                                const start = new Date(subscription.startDate || subscription.createdAt);
                                const expiry = new Date(start);
                                if (subscription.billingCycle === "yearly") {
                                  expiry.setFullYear(expiry.getFullYear() + 1);
                                } else {
                                  expiry.setMonth(expiry.getMonth() + 1);
                                }
                                expDate = expiry;
                              }

                              if (!expDate) return <span className="text-xs text-slate-500">—</span>;

                              const diffDays = Math.ceil(
                                (expDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
                              );
                              const isExp = subscription.status === "EXPIRED" || diffDays < 0;

                              return (
                                <>
                                  <span className={`text-xs font-semibold ${isExp ? "text-rose-600" : "text-slate-800"}`}>
                                    {formatDate(expDate)}
                                  </span>
                                  <span
                                    className={`rounded-full border px-2 py-0.2 text-[10px] font-semibold ${
                                      isExp
                                        ? "border-rose-200 bg-rose-50 text-rose-600"
                                        : diffDays <= 7
                                        ? "border-amber-200 bg-amber-50 text-amber-700"
                                        : "border-slate-200 bg-slate-50 text-slate-600"
                                    }`}
                                  >
                                    {isExp ? "Expired" : diffDays === 0 ? "Renews today" : `${diffDays} days left`}
                                  </span>
                                </>
                              );
                            })()}
                          </div>
                        ) : (
                          <p className="mt-1 text-xs text-slate-500">—</p>
                        )}
                      </div>
                    )}

                    {currentPlan?.limits && (
                      <div className="border-t border-slate-100 pt-3">
                        <p className="text-[10px] uppercase tracking-wider text-slate-400">Enforced Plan Limits</p>
                        <div className="mt-2 space-y-1.5 text-xs text-slate-600">
                          <div className="flex justify-between">
                            <span>Users:</span>
                            <span className="font-semibold text-slate-900">{currentPlan.limits.users ?? 0} seats</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Contacts:</span>
                            <span className="font-semibold text-slate-900">{currentPlan.limits.contacts ?? 0} max</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Campaigns/mo:</span>
                            <span className="font-semibold text-slate-900">{currentPlan.limits.campaigns ?? 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Templates:</span>
                            <span className="font-semibold text-slate-900">{currentPlan.limits.templates ?? 0}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {currentPlan?.features && (
                      <div className="border-t border-slate-100 pt-3">
                        <p className="text-[10px] uppercase tracking-wider text-slate-400">Enabled Features</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {Object.entries(currentPlan.features).map(([feat, enabled]) => (
                            <span
                              key={feat}
                              className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase ${
                                enabled
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : "border-slate-200 bg-slate-50 text-slate-400"
                              }`}
                            >
                              {feat}: {enabled ? "ON" : "OFF"}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: USERS */}
          {activeTab === "users" && (
            <div className="rounded-2xl border border-slate-200 bg-[#F5F8FB] p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Company Users Roster</h3>
                  <p className="text-xs text-slate-500">All registered team accounts for this company.</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                  {users.length} Users
                </span>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-4 py-3">User</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Last Login</th>
                      <th className="px-4 py-3">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {users.map((u) => (
                      <tr key={u._id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3.5">
                          <p className="font-semibold text-slate-900">{u.name}</p>
                          <p className="text-slate-400">{u.email}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              u.isActive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
                            }`}
                          >
                            {u.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">{formatDate(u.lastLogin)}</td>
                        <td className="px-4 py-3.5">{formatDate(u.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: CAMPAIGNS FEED */}
          {activeTab === "campaigns" && (
            <div className="rounded-2xl border border-slate-200 bg-[#F5F8FB] p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Broadcast Campaigns Feed</h3>
                  <p className="text-xs text-slate-500">Live delivery metrics and status across broadcasts.</p>
                </div>
              </div>

              {tabLoading ? (
                <div className="flex h-40 items-center justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-600" />
                </div>
              ) : campaigns.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-400">No campaigns launched by this company yet.</div>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400">
                      <tr>
                        <th className="px-4 py-3">Campaign</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Recipients</th>
                        <th className="px-4 py-3">Delivery Breakdown</th>
                        <th className="px-4 py-3">Created / Scheduled</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {campaigns.map((c) => (
                        <tr key={c._id} className="hover:bg-slate-50/60">
                          <td className="px-4 py-3.5 font-medium text-slate-900">
                            <p className="font-semibold">{c.campaignName}</p>
                            <p className="text-[11px] text-slate-400 capitalize">{c.campaignType || "broadcast"}</p>
                          </td>
                          <td className="px-4 py-3.5">
                            <span
                              className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase ${
                                campaignStatusClasses[c.status] || campaignStatusClasses.draft
                              }`}
                            >
                              {c.status}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 font-semibold text-slate-800">
                            {c.totalContacts ?? 0}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="space-y-1">
                              <div className="flex gap-2 text-[10px]">
                                <span className="text-emerald-700">Sent: {c.sentCount ?? 0}</span>
                                <span className="text-sky-700">Delivered: {c.deliveredCount ?? 0}</span>
                                <span className="text-indigo-700">Read: {c.readCount ?? 0}</span>
                                <span className="text-rose-600">Failed: {c.failedCount ?? 0}</span>
                              </div>
                              <div className="flex h-1.5 w-36 overflow-hidden rounded-full bg-slate-100">
                                <div
                                  style={{ width: `${c.totalContacts ? ((c.deliveredCount ?? 0) / c.totalContacts) * 100 : 0}%` }}
                                  className="bg-emerald-500"
                                />
                                <div
                                  style={{ width: `${c.totalContacts ? ((c.failedCount ?? 0) / c.totalContacts) * 100 : 0}%` }}
                                  className="bg-rose-500"
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-slate-500">
                            {c.scheduleAt ? `Scheduled: ${formatDateTime(c.scheduleAt)}` : formatDateTime(c.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: TEMPLATES FEED */}
          {activeTab === "templates" && (
            <div className="rounded-2xl border border-slate-200 bg-[#F5F8FB] p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">WhatsApp Message Templates</h3>
                  <p className="text-xs text-slate-500">Meta approval status, categories, and rejection diagnostics.</p>
                </div>
              </div>

              {tabLoading ? (
                <div className="flex h-40 items-center justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-600" />
                </div>
              ) : templates.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-400">No templates created by this company yet.</div>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400">
                      <tr>
                        <th className="px-4 py-3">Template Name</th>
                        <th className="px-4 py-3">Meta Status</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3">Language</th>
                        <th className="px-4 py-3">Diagnostics / Reason</th>
                        <th className="px-4 py-3">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {templates.map((t) => (
                        <tr key={t._id} className="hover:bg-slate-50/60">
                          <td className="px-4 py-3.5">
                            <p className="font-semibold text-slate-900">{t.name}</p>
                            {t.metaTemplateName && (
                              <p className="font-mono text-[10px] text-slate-400">{t.metaTemplateName}</p>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <span
                              className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${
                                metaStatusClasses[t.metaStatus] || metaStatusClasses.not_submitted
                              }`}
                            >
                              {t.metaStatus || "not_submitted"}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                              {t.metaCategory || t.category || "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 uppercase">{t.language || "en_US"}</td>
                          <td className="px-4 py-3.5">
                            {t.rejectionReason ? (
                              <div className="flex items-center gap-1.5 text-rose-600">
                                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                <span className="max-w-xs truncate" title={t.rejectionReason}>
                                  {t.rejectionReason}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-slate-500">{formatDate(t.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: WHATSAPP HEALTH */}
          {activeTab === "whatsapp" && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-[#F5F8FB] p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900">WhatsApp Account Connectivity</h3>
                <p className="text-xs text-slate-500">WABA registration and webhook health status.</p>

                {tabLoading ? (
                  <div className="flex h-40 items-center justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-600" />
                  </div>
                ) : (
                  <div className="mt-5 grid gap-5 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                      <p className="text-[10px] uppercase tracking-wider text-slate-400">Connection Status</p>
                      <div className="mt-1 flex items-center gap-2">
                        {whatsappHealth?.connected ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            <span className="text-sm font-semibold text-emerald-700">Connected & Operational</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4 text-red-500" />
                            <span className="text-sm font-semibold text-red-600">Disconnected / Pending</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                      <p className="text-[10px] uppercase tracking-wider text-slate-400">Token Type</p>
                      <p className="mt-1 text-sm font-semibold uppercase text-slate-800">
                        {whatsappHealth?.tokenType || "Manual"}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                      <p className="text-[10px] uppercase tracking-wider text-slate-400">Phone Number ID</p>
                      <p className="mt-1 font-mono text-xs text-slate-800">
                        {whatsappHealth?.phoneNumberId || "Not Registered"}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                      <p className="text-[10px] uppercase tracking-wider text-slate-400">WABA Account ID</p>
                      <p className="mt-1 font-mono text-xs text-slate-800">
                        {whatsappHealth?.wabaId || "Not Registered"}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                      <p className="text-[10px] uppercase tracking-wider text-slate-400">Connected At</p>
                      <p className="mt-1 text-xs text-slate-700">
                        {formatDateTime(whatsappHealth?.connectedAt)}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                      <p className="text-[10px] uppercase tracking-wider text-slate-400">Total Inbound & Outbound Messages</p>
                      <p className="mt-1 text-base font-bold text-slate-900">
                        {whatsappHealth?.stats?.totalMessages ?? 0} messages
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: CONTACTS & CONSENT */}
          {activeTab === "contacts" && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-[#F5F8FB] p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900">Contacts & Opt-Out Summary</h3>

                {tabLoading ? (
                  <div className="flex h-40 items-center justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-600" />
                  </div>
                ) : (
                  <>
                    <div className="mt-4 grid gap-4 sm:grid-cols-4">
                      <StatBlock
                        icon={Users}
                        label="Total Contacts"
                        value={contactsSummary?.total ?? detail?.contacts?.total ?? 0}
                      />
                      <StatBlock
                        icon={CheckCircle2}
                        label="Active (Opted-in)"
                        value={contactsSummary?.active ?? 0}
                      />
                      <StatBlock
                        icon={XCircle}
                        label="Opted-out (STOP)"
                        value={contactsSummary?.optedOut ?? 0}
                      />
                      <StatBlock
                        icon={AlertTriangle}
                        label="Opt-out Rate"
                        value={`${contactsSummary?.optOutRate ?? 0}%`}
                      />
                    </div>

                    {/* RECENT CONTACTS PREVIEW */}
                    <div className="mt-6">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Recently Added Contacts
                      </h4>
                      <div className="mt-3 overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400">
                            <tr>
                              <th className="px-4 py-2.5">Name</th>
                              <th className="px-4 py-2.5">Phone</th>
                              <th className="px-4 py-2.5">Source</th>
                              <th className="px-4 py-2.5">Consent</th>
                              <th className="px-4 py-2.5">Date Added</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-700">
                            {(contactsSummary?.recentContacts || []).map((contact) => (
                              <tr key={contact._id} className="hover:bg-slate-50/60">
                                <td className="px-4 py-2.5 font-medium text-slate-900">{contact.name}</td>
                                <td className="px-4 py-2.5 font-mono">{contact.phone}</td>
                                <td className="px-4 py-2.5 capitalize">{contact.source}</td>
                                <td className="px-4 py-2.5">
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                      contact.optedOut ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"
                                    }`}
                                  >
                                    {contact.optedOut ? "Opted Out" : "Subscribed"}
                                  </span>
                                </td>
                                <td className="px-4 py-2.5 text-slate-500">{formatDate(contact.createdAt)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBSCRIPTION MANAGEMENT MODAL */}
      {subModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-[#F5F8FB] p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">Manage Subscription</h3>
              <button onClick={() => setSubModalOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSubscription} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Assign Plan</label>
                <select
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-emerald-400 focus:bg-[#F5F8FB]"
                  required
                >
                  <option value="">Select a Plan</option>
                  {availablePlans.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} (₹{p.pricing?.monthly}/mo - {p.trialDays > 0 ? `${p.trialDays}d trial` : "No trial"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Subscription Status</label>
                <select
                  value={subStatus}
                  onChange={(e) => setSubStatus(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-emerald-400 focus:bg-[#F5F8FB]"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="TRIAL">TRIAL</option>
                  <option value="PENDING">PENDING</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                  <option value="CANCELLED">CANCELLED</option>
                  <option value="EXPIRED">EXPIRED</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Billing Cycle</label>
                <select
                  value={billingCycle}
                  onChange={(e) => setBillingCycle(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-emerald-400 focus:bg-[#F5F8FB]"
                >
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Plan Expiry / Next Renewal Date
                </label>
                <input
                  type="date"
                  value={customRenewalDate}
                  onChange={(e) => setCustomRenewalDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-emerald-400 focus:bg-[#F5F8FB]"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Sets the date when the company plan expires or is scheduled to renew.
                </p>
              </div>

              {subStatus === "TRIAL" && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Trial Ends At Date
                  </label>
                  <input
                    type="date"
                    value={customTrialEndsAt}
                    onChange={(e) => setCustomTrialEndsAt(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-emerald-400 focus:bg-[#F5F8FB]"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    Explicit date when free trial will end.
                  </p>
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Extend Trial (Days)</label>
                <input
                  type="number"
                  placeholder="e.g. 7 or 14"
                  value={extendDays}
                  onChange={(e) => setExtendDays(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-emerald-400 focus:bg-[#F5F8FB]"
                />
                <p className="mt-1 text-[11px] text-slate-400">Adds days to trial end date and sets status to TRIAL.</p>
              </div>

              <button
                type="submit"
                disabled={savingSub}
                className="w-full rounded-xl bg-emerald-600 py-2.5 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
              >
                {savingSub ? "Saving Changes..." : "Save Subscription"}
              </button>
            </form>
          </div>
        </div>
      )}
    </PlatformLayout>
  );
}

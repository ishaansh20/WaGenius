import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  ArrowLeft,
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
import { Badge, Button, Card, CardHeader, StatusPill, Tabs } from "../../components/ui";

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

const metaStatusTone = {
  APPROVED: "success",
  PENDING: "warning",
  REJECTED: "danger",
  PAUSED: "warning",
  DISABLED: "neutral",
  not_submitted: "neutral",
};

const INPUT_CLASS =
  "h-11 w-full rounded-lg border border-line-strong bg-surface px-3 text-[14px] text-ink outline-none transition placeholder:text-ink-subtle focus:border-brand-600 focus:ring-2 focus:ring-brand-100";

function StatBlock({ icon: Icon, label, value, subtext }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50">
          <Icon className="h-4 w-4 text-brand-700" />
        </div>
        <p className="text-[13px] font-medium text-ink-muted">{label}</p>
      </div>
      <p className="mt-3 text-[28px] font-semibold tracking-[-0.02em] text-ink tabular-nums">{value}</p>
      {subtext && <p className="mt-0.5 text-[13px] text-ink-muted">{subtext}</p>}
    </div>
  );
}

function InfoItem({ label, children, mono = false }) {
  return (
    <div>
      <p className="text-[13px] text-ink-muted">{label}</p>
      <div className={`mt-1 text-[14px] font-medium text-ink ${mono ? "break-all font-mono text-[13px]" : ""}`}>
        {children}
      </div>
    </div>
  );
}

function SectionCard({ title, description, actions, children }) {
  return (
    <Card>
      <CardHeader title={title} description={description} actions={actions} />
      {children}
    </Card>
  );
}

function TabSpinner() {
  return (
    <div className="flex h-40 items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-brand-600" />
    </div>
  );
}

function EmptyBox({ icon: Icon, title }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl bg-canvas px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface shadow-[var(--shadow-card)]">
        <Icon className="h-5 w-5 text-brand-700" />
      </div>
      <p className="mt-3 text-[15px] font-semibold text-ink">{title}</p>
    </div>
  );
}

function DataTable({ headers, children }) {
  return (
    <div className="relative -mx-5 overflow-x-auto sm:-mx-6">
      <table className="w-full text-left">
        <thead>
          <tr className="bg-[#f6f7f6]">
            {headers.map((h) => (
              <th key={h} className="whitespace-nowrap px-4 py-3 text-[13px] font-medium text-ink-muted first:pl-5 sm:first:pl-6">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line text-[14px] text-ink">{children}</tbody>
      </table>
    </div>
  );
}

const TD = "px-4 py-3.5 first:pl-5 sm:first:pl-6";

function FormField({ label, help, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-medium text-ink">{label}</label>
      {children}
      {help && <p className="mt-1.5 text-[13px] text-ink-muted">{help}</p>}
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
    { value: "overview", label: "Overview & plan" },
    { value: "users", label: "Users", count: detail?.users?.total ?? users.length },
    { value: "campaigns", label: "Campaigns", count: detail?.campaigns?.total ?? 0 },
    { value: "templates", label: "Templates", count: detail?.templates?.total ?? 0 },
    { value: "whatsapp", label: "WhatsApp health" },
    { value: "contacts", label: "Contacts", count: detail?.contacts?.total ?? 0 },
  ];

  const ownerUser = users.find((u) => u.role === "ADMIN");

  return (
    <PlatformLayout
      title={loading ? "Company details" : company?.name || "Company"}
      description="Subscription, team, campaigns, templates, contacts and WhatsApp health for this company."
      actions={
        <Button variant="secondary" onClick={() => navigate("/platform/companies")}>
          <ArrowLeft className="h-4 w-4" />
          Back to companies
        </Button>
      }
    >
      {loading ? (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-line border-t-brand-600" />
        </div>
      ) : !company ? (
        <Card className="flex min-h-[300px] items-center justify-center">
          <p className="text-[15px] text-ink-muted">Company details not found.</p>
        </Card>
      ) : (
        <div className="space-y-5">
          {/* Header summary */}
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-900 text-[18px] font-semibold text-white">
                  {company.name?.charAt(0)?.toUpperCase() || "C"}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-[20px] font-semibold tracking-[-0.01em] text-ink">{company.name}</h2>
                    <StatusPill status={company.status} />
                    {subscription?.status ? (
                      <StatusPill status={subscription.status} />
                    ) : (
                      <Badge tone="neutral">No plan</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-[13px] text-ink-muted">
                    Slug <span className="font-mono text-ink">{company.slug}</span> · ID{" "}
                    <span className="font-mono text-ink">{company._id}</span> · Joined {formatDate(company.createdAt)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={openSubModal}>
                  <Pencil className="h-4 w-4" />
                  Manage plan
                </Button>
                <Button
                  variant={company.status === "active" ? "danger" : "primary"}
                  disabled={updating}
                  onClick={handleToggleStatus}
                >
                  {company.status === "active" ? (
                    <>
                      <PauseCircle className="h-4 w-4" />
                      Suspend
                    </>
                  ) : (
                    <>
                      <PlayCircle className="h-4 w-4" />
                      Reactivate
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>

          {/* KPI row */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatBlock icon={Users} label="Users" value={detail?.users?.total ?? 0} subtext={`${detail?.users?.active ?? 0} active`} />
            <StatBlock icon={MessageCircle} label="Contacts" value={detail?.contacts?.total ?? 0} />
            <StatBlock icon={Megaphone} label="Campaigns" value={detail?.campaigns?.total ?? 0} />
            <StatBlock icon={FileText} label="Templates" value={detail?.templates?.total ?? 0} />
          </div>

          <Tabs items={TABS} value={activeTab} onChange={setActiveTab} />

          {/* Overview & subscription */}
          {activeTab === "overview" && (
            <div className="grid gap-5 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <SectionCard title="Company profile" description="Owner, activity and onboarding details.">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <InfoItem label="Owner">
                      {ownerUser?.name || "No admin found"}
                      <p className="text-[13px] font-normal text-ink-muted">{ownerUser?.email || "—"}</p>
                    </InfoItem>
                    <InfoItem label="Total conversations">{detail?.conversations?.total ?? 0} threads</InfoItem>
                    <InfoItem label="WhatsApp onboarding">
                      {company.whatsapp?.onboardingCompletedAt
                        ? `Completed on ${formatDate(company.whatsapp.onboardingCompletedAt)}`
                        : "Pending / incomplete"}
                    </InfoItem>
                    <InfoItem label="Created at">{formatDateTime(company.createdAt)}</InfoItem>
                  </div>
                </SectionCard>
              </div>

              <SectionCard
                title="Subscription"
                actions={
                  <Button variant="ghost" size="sm" onClick={openSubModal}>
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                }
              >
                <div className="space-y-4">
                  <InfoItem label="Plan">
                    <span className="text-[17px] font-semibold">{currentPlan?.name || "No plan selected"}</span>
                    {currentPlan?.pricing && (
                      <p className="text-[13px] font-normal text-ink-muted">
                        ₹{subscription?.billingCycle === "yearly" ? currentPlan.pricing.yearly : currentPlan.pricing.monthly}
                        /{subscription?.billingCycle === "yearly" ? "year" : "month"}
                      </p>
                    )}
                  </InfoItem>

                  <InfoItem label="Status">
                    {subscription?.status ? (
                      <StatusPill status={subscription.status} />
                    ) : (
                      <Badge tone="neutral">No subscription</Badge>
                    )}
                  </InfoItem>

                  {currentPlan?.isFree || currentPlan?.pricing?.monthly === 0 ? (
                    <InfoItem label="Plan expiry">Lifetime access (no expiry)</InfoItem>
                  ) : subscription?.status === "TRIAL" ? (
                    <InfoItem label="Trial period">
                      {subscription.trialEndsAt ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="flex items-center gap-1.5 text-warning">
                            <Clock className="h-4 w-4" />
                            Ends {formatDate(subscription.trialEndsAt)}
                          </span>
                          {(() => {
                            const diffDays = Math.ceil(
                              (new Date(subscription.trialEndsAt).getTime() - new Date().getTime()) /
                                (1000 * 60 * 60 * 24),
                            );
                            return (
                              <Badge tone={diffDays < 0 ? "danger" : "warning"}>
                                {diffDays < 0 ? "Expired" : `${diffDays} days remaining`}
                              </Badge>
                            );
                          })()}
                        </div>
                      ) : (
                        <span className="text-ink-muted">—</span>
                      )}
                    </InfoItem>
                  ) : (
                    <InfoItem label={subscription?.status === "EXPIRED" ? "Expired on" : "Plan expiry / renewal date"}>
                      {subscription?.renewalDate || subscription?.startDate ? (
                        <div className="flex flex-wrap items-center gap-2">
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

                            if (!expDate) return <span className="text-ink-muted">—</span>;

                            const diffDays = Math.ceil(
                              (expDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
                            );
                            const isExp = subscription.status === "EXPIRED" || diffDays < 0;

                            return (
                              <>
                                <span className={isExp ? "text-danger" : "text-ink"}>{formatDate(expDate)}</span>
                                <Badge tone={isExp ? "danger" : diffDays <= 7 ? "warning" : "neutral"}>
                                  {isExp ? "Expired" : diffDays === 0 ? "Renews today" : `${diffDays} days left`}
                                </Badge>
                              </>
                            );
                          })()}
                        </div>
                      ) : (
                        <span className="text-ink-muted">—</span>
                      )}
                    </InfoItem>
                  )}

                  {currentPlan?.limits && (
                    <div className="border-t border-line pt-4">
                      <p className="text-[13px] text-ink-muted">Plan limits</p>
                      <dl className="mt-2 space-y-2 text-[14px]">
                        {[
                          ["Users", `${currentPlan.limits.users ?? 0} seats`],
                          ["Contacts", `${currentPlan.limits.contacts ?? 0} max`],
                          ["Campaigns / month", currentPlan.limits.campaigns ?? 0],
                          ["Templates", currentPlan.limits.templates ?? 0],
                        ].map(([k, v]) => (
                          <div key={k} className="flex justify-between">
                            <dt className="text-ink-muted">{k}</dt>
                            <dd className="font-medium text-ink tabular-nums">{v}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  )}

                  {currentPlan?.features && (
                    <div className="border-t border-line pt-4">
                      <p className="text-[13px] text-ink-muted">Features</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {Object.entries(currentPlan.features).map(([feat, enabled]) => (
                          <Badge key={feat} tone={enabled ? "brand" : "neutral"}>
                            {feat}: {enabled ? "On" : "Off"}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </SectionCard>
            </div>
          )}

          {/* Users */}
          {activeTab === "users" && (
            <SectionCard
              title="Team members"
              description="All registered team accounts for this company."
              actions={<Badge tone="neutral">{users.length} users</Badge>}
            >
              {users.length === 0 ? (
                <EmptyBox icon={Users} title="No users yet" />
              ) : (
                <DataTable headers={["User", "Role", "Status", "Last login", "Joined"]}>
                  {users.map((u) => (
                    <tr key={u._id} className="hover:bg-canvas">
                      <td className={TD}>
                        <p className="font-semibold text-ink">{u.name}</p>
                        <p className="text-[13px] text-ink-muted">{u.email}</p>
                      </td>
                      <td className={TD}>
                        <Badge tone="neutral">{u.role}</Badge>
                      </td>
                      <td className={TD}>
                        <Badge tone={u.isActive ? "success" : "danger"} dot>
                          {u.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className={`${TD} text-ink-muted`}>{formatDate(u.lastLogin)}</td>
                      <td className={`${TD} text-ink-muted`}>{formatDate(u.createdAt)}</td>
                    </tr>
                  ))}
                </DataTable>
              )}
            </SectionCard>
          )}

          {/* Campaigns */}
          {activeTab === "campaigns" && (
            <SectionCard title="Campaigns" description="Delivery numbers and status for each broadcast.">
              {tabLoading ? (
                <TabSpinner />
              ) : campaigns.length === 0 ? (
                <EmptyBox icon={Megaphone} title="No campaigns launched by this company yet." />
              ) : (
                <DataTable headers={["Campaign", "Status", "Recipients", "Delivery", "Created / scheduled"]}>
                  {campaigns.map((c) => (
                    <tr key={c._id} className="hover:bg-canvas">
                      <td className={TD}>
                        <p className="font-semibold text-ink">{c.campaignName}</p>
                        <p className="text-[13px] capitalize text-ink-muted">{c.campaignType || "broadcast"}</p>
                      </td>
                      <td className={TD}>
                        <StatusPill status={c.status} />
                      </td>
                      <td className={`${TD} font-medium tabular-nums`}>{c.totalContacts ?? 0}</td>
                      <td className={TD}>
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[13px] text-ink-muted">
                            <span>Sent <span className="font-medium text-ink">{c.sentCount ?? 0}</span></span>
                            <span>Delivered <span className="font-medium text-brand-700">{c.deliveredCount ?? 0}</span></span>
                            <span>Read <span className="font-medium text-ink">{c.readCount ?? 0}</span></span>
                            <span>Failed <span className="font-medium text-danger">{c.failedCount ?? 0}</span></span>
                          </div>
                          <div className="flex h-1.5 w-36 overflow-hidden rounded-full bg-[#e6e9e7]">
                            <div
                              style={{ width: `${c.totalContacts ? ((c.deliveredCount ?? 0) / c.totalContacts) * 100 : 0}%` }}
                              className="bg-brand-600"
                            />
                            <div
                              style={{ width: `${c.totalContacts ? ((c.failedCount ?? 0) / c.totalContacts) * 100 : 0}%` }}
                              className="bg-danger"
                            />
                          </div>
                        </div>
                      </td>
                      <td className={`${TD} whitespace-nowrap text-ink-muted`}>
                        {c.scheduleAt ? `Scheduled: ${formatDateTime(c.scheduleAt)}` : formatDateTime(c.createdAt)}
                      </td>
                    </tr>
                  ))}
                </DataTable>
              )}
            </SectionCard>
          )}

          {/* Templates */}
          {activeTab === "templates" && (
            <SectionCard title="Message templates" description="Meta approval status, category and rejection reasons.">
              {tabLoading ? (
                <TabSpinner />
              ) : templates.length === 0 ? (
                <EmptyBox icon={FileText} title="No templates created by this company yet." />
              ) : (
                <DataTable headers={["Template", "Meta status", "Category", "Language", "Reason", "Created"]}>
                  {templates.map((t) => (
                    <tr key={t._id} className="hover:bg-canvas">
                      <td className={TD}>
                        <p className="font-semibold text-ink">{t.name}</p>
                        {t.metaTemplateName && (
                          <p className="font-mono text-[12px] text-ink-muted">{t.metaTemplateName}</p>
                        )}
                      </td>
                      <td className={TD}>
                        <Badge tone={metaStatusTone[t.metaStatus] || "neutral"} dot>
                          {t.metaStatus || "not_submitted"}
                        </Badge>
                      </td>
                      <td className={TD}>
                        <Badge tone="neutral">{t.metaCategory || t.category || "—"}</Badge>
                      </td>
                      <td className={`${TD} uppercase text-ink-muted`}>{t.language || "en_US"}</td>
                      <td className={TD}>
                        {t.rejectionReason ? (
                          <div className="flex items-center gap-1.5 text-danger">
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                            <span className="max-w-xs truncate" title={t.rejectionReason}>
                              {t.rejectionReason}
                            </span>
                          </div>
                        ) : (
                          <span className="text-ink-muted">—</span>
                        )}
                      </td>
                      <td className={`${TD} whitespace-nowrap text-ink-muted`}>{formatDate(t.createdAt)}</td>
                    </tr>
                  ))}
                </DataTable>
              )}
            </SectionCard>
          )}

          {/* WhatsApp health */}
          {activeTab === "whatsapp" && (
            <SectionCard title="WhatsApp connection" description="WhatsApp Business account registration and webhook health.">
              {tabLoading ? (
                <TabSpinner />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-line bg-canvas p-4">
                    <InfoItem label="Connection status">
                      {whatsappHealth?.connected ? (
                        <span className="flex items-center gap-2 text-brand-700">
                          <CheckCircle2 className="h-4 w-4" />
                          Connected and working
                        </span>
                      ) : (
                        <span className="flex items-center gap-2 text-danger">
                          <XCircle className="h-4 w-4" />
                          Disconnected / pending
                        </span>
                      )}
                    </InfoItem>
                  </div>
                  <div className="rounded-xl border border-line bg-canvas p-4">
                    <InfoItem label="Token type">
                      <span className="uppercase">{whatsappHealth?.tokenType || "Manual"}</span>
                    </InfoItem>
                  </div>
                  <div className="rounded-xl border border-line bg-canvas p-4">
                    <InfoItem label="Phone number ID" mono>
                      {whatsappHealth?.phoneNumberId || "Not registered"}
                    </InfoItem>
                  </div>
                  <div className="rounded-xl border border-line bg-canvas p-4">
                    <InfoItem label="WABA account ID" mono>
                      {whatsappHealth?.wabaId || "Not registered"}
                    </InfoItem>
                  </div>
                  <div className="rounded-xl border border-line bg-canvas p-4">
                    <InfoItem label="Connected at">{formatDateTime(whatsappHealth?.connectedAt)}</InfoItem>
                  </div>
                  <div className="rounded-xl border border-line bg-canvas p-4">
                    <InfoItem label="Total inbound and outbound messages">
                      <span className="text-[17px] font-semibold tabular-nums">
                        {whatsappHealth?.stats?.totalMessages ?? 0} messages
                      </span>
                    </InfoItem>
                  </div>
                </div>
              )}
            </SectionCard>
          )}

          {/* Contacts & consent */}
          {activeTab === "contacts" && (
            <SectionCard title="Contacts and opt-outs" description="Consent summary and the most recently added contacts.">
              {tabLoading ? (
                <TabSpinner />
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatBlock icon={Users} label="Total contacts" value={contactsSummary?.total ?? detail?.contacts?.total ?? 0} />
                    <StatBlock icon={CheckCircle2} label="Active (opted in)" value={contactsSummary?.active ?? 0} />
                    <StatBlock icon={XCircle} label="Opted out (STOP)" value={contactsSummary?.optedOut ?? 0} />
                    <StatBlock icon={AlertTriangle} label="Opt-out rate" value={`${contactsSummary?.optOutRate ?? 0}%`} />
                  </div>

                  <h3 className="mb-3 mt-6 text-[15px] font-semibold text-ink">Recently added contacts</h3>
                  <DataTable headers={["Name", "Phone", "Source", "Consent", "Date added"]}>
                    {(contactsSummary?.recentContacts || []).map((contact) => (
                      <tr key={contact._id} className="hover:bg-canvas">
                        <td className={`${TD} font-medium`}>{contact.name}</td>
                        <td className={`${TD} font-mono text-[13px]`}>{contact.phone}</td>
                        <td className={`${TD} capitalize text-ink-muted`}>{contact.source}</td>
                        <td className={TD}>
                          <Badge tone={contact.optedOut ? "danger" : "success"} dot>
                            {contact.optedOut ? "Opted out" : "Subscribed"}
                          </Badge>
                        </td>
                        <td className={`${TD} whitespace-nowrap text-ink-muted`}>{formatDate(contact.createdAt)}</td>
                      </tr>
                    ))}
                  </DataTable>
                </>
              )}
            </SectionCard>
          )}
        </div>
      )}

      {/* Subscription management modal */}
      {subModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(16,24,20,0.45)] px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-surface p-6 shadow-[var(--shadow-card)]">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-[18px] font-semibold text-ink">Manage subscription</h3>
              <Button variant="ghost" size="icon-sm" onClick={() => setSubModalOpen(false)} aria-label="Close">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleSaveSubscription} className="space-y-4">
              <FormField label="Plan">
                <select
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  className={INPUT_CLASS}
                  required
                >
                  <option value="">Select a plan</option>
                  {availablePlans.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} (₹{p.pricing?.monthly}/mo - {p.trialDays > 0 ? `${p.trialDays}d trial` : "No trial"})
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Subscription status">
                <select value={subStatus} onChange={(e) => setSubStatus(e.target.value)} className={INPUT_CLASS}>
                  <option value="ACTIVE">Active</option>
                  <option value="TRIAL">Trial</option>
                  <option value="PENDING">Pending</option>
                  <option value="SUSPENDED">Suspended</option>
                  <option value="CANCELLED">Cancelled</option>
                  <option value="EXPIRED">Expired</option>
                </select>
              </FormField>

              <FormField label="Billing cycle">
                <select value={billingCycle} onChange={(e) => setBillingCycle(e.target.value)} className={INPUT_CLASS}>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </FormField>

              <FormField
                label="Plan expiry / next renewal date"
                help="Sets the date when the company plan expires or is scheduled to renew."
              >
                <input
                  type="date"
                  value={customRenewalDate}
                  onChange={(e) => setCustomRenewalDate(e.target.value)}
                  className={INPUT_CLASS}
                />
              </FormField>

              {subStatus === "TRIAL" && (
                <FormField label="Trial ends on" help="The exact date the free trial ends.">
                  <input
                    type="date"
                    value={customTrialEndsAt}
                    onChange={(e) => setCustomTrialEndsAt(e.target.value)}
                    className={INPUT_CLASS}
                  />
                </FormField>
              )}

              <FormField label="Extend trial (days)" help="Adds days to the trial end date and sets the status to Trial.">
                <input
                  type="number"
                  placeholder="e.g. 7 or 14"
                  value={extendDays}
                  onChange={(e) => setExtendDays(e.target.value)}
                  className={INPUT_CLASS}
                />
              </FormField>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => setSubModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={savingSub}>
                  {savingSub ? "Saving changes..." : "Save subscription"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PlatformLayout>
  );
}

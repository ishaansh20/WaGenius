import { useEffect, useRef, useState } from "react";
import api from "../../services/api";
import { resolveMediaUrl } from "../../utils/media";
import { toast } from "react-hot-toast";
import DashboardLayout from "../../components/layout/DashboardLayout";
import {
  AlertTriangle,
  CalendarClock,
  CheckCheck,
  CheckCircle,
  ChevronDown,
  FileText,
  Plus,
  Send,
  UploadCloud,
  X,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { extractVariableTokens, mergeCategories } from "../../constants/templates";
import { EMPTY_CSV_ANALYSIS, parseCsvAnalysis } from "../../utils/csvAnalysis";
import { fetchSegments, fetchTemplateCategories } from "../../services/api";
import { fetchSegmentAsCsvFile } from "../../utils/segmentToCsv";
import usePlan from "../../hooks/usePlan";
import { Lock } from "lucide-react";
import { Button, Card, Field, Input, Select, Textarea } from "../../components/ui";
import { cn } from "../../utils/cn";

/* ── shared control class (for hand-rolled controls that mirror ui/Field) ── */
const controlCls =
  "block h-11 w-full rounded-xl border border-line-strong bg-surface px-3.5 text-[14px] text-ink placeholder:text-ink-subtle transition-colors hover:border-ink-subtle focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/12";

/* ── Numbered form section ── */
function FormSection({ n, title, description, children }) {
  return (
    <Card as="section">
      <div className="mb-5 flex items-start gap-3.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[14px] font-semibold tabular-nums text-brand-700">
          {n}
        </span>
        <div className="min-w-0 pt-0.5">
          <h2 className="text-[17px] font-semibold text-ink">{title}</h2>
          {description && <p className="mt-1 text-[14px] text-ink-muted">{description}</p>}
        </div>
      </div>
      {children}
    </Card>
  );
}

/* ── Summary row ── */
function SummaryRow({ label, value, valueClass = "text-ink" }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line py-2.5 last:border-0 last:pb-0">
      <span className="text-[14px] text-ink-muted">{label}</span>
      <span className={`max-w-[60%] truncate text-right text-[14px] font-medium ${valueClass}`}>
        {value}
      </span>
    </div>
  );
}

/* ── Stat tile ── */
function StatTile({ label, value, tone }) {
  const tones = {
    default: "text-ink",
    brand: "text-brand-700",
    danger: "text-danger",
    warning: "text-warning",
  };
  return (
    <div className="rounded-xl border border-line bg-canvas px-3.5 py-3">
      <p className="text-[13px] text-ink-muted">{label}</p>
      <p className={`mt-1 text-[22px] font-semibold tracking-[-0.02em] tabular-nums ${tones[tone] || tones.default}`}>
        {value}
      </p>
    </div>
  );
}

/* ── Inline note (success / warning) ── */
function Note({ tone = "brand", icon: Icon, children }) {
  const tones = {
    brand: "border-brand-100 bg-brand-50 text-brand-800",
    warning: "border-warning/20 bg-warning-soft text-warning",
  };
  return (
    <div className={cn("flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-[14px]", tones[tone])}>
      {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0" />}
      <div>{children}</div>
    </div>
  );
}

/* ══ Main component ══════════════════════════════════════════════════════════ */
export default function CampaignUpload() {
  const fileInputRef = useRef(null);
  const templateDropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const prefilledCount = location.state?.prefilledCount;

  const [file, setFile] = useState(location.state?.prefilledFile || null);
  const [segments, setSegments] = useState([]);
  const [selectedSegmentId, setSelectedSegmentId] = useState("");
  const [segmentAudienceCount, setSegmentAudienceCount] = useState(null);
  const [testPhone, setTestPhone] = useState(() => localStorage.getItem("campaignTestPhone") || "");
  const [testSending, setTestSending] = useState(false);
  const [campaignName, setCampaignName] = useState(
    location.state?.prefilledCampaignName || "",
  );
  const [campaignType, setCampaignType] = useState(
    location.state?.prefilledCampaignType || "",
  );
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [categories, setCategories] = useState([]);
  const [dbTemplates, setDbTemplates] = useState([]);
  const [templateSearch, setTemplateSearch] = useState("");
  const [selectedNormalTemplateId, setSelectedNormalTemplateId] = useState("");
  const [csvAnalysis, setCsvAnalysis] = useState(EMPTY_CSV_ANALYSIS);
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);

  const [useMetaTemplate, setUseMetaTemplate] = useState(false);
  const [selectedMetaTemplateId, setSelectedMetaTemplateId] = useState("");
  const [templateVariableValues, setTemplateVariableValues] = useState([]);
  const [buttonVariableValues, setButtonVariableValues] = useState([]);

  const mergedCategories = mergeCategories(categories);

  const { canUse, hasReachedLimit, getLimit, getUsage, plan } = usePlan();
  const canSchedule = canUse("campaignSchedule");
  const campaignLimitReached = hasReachedLimit("campaigns");

  const mergedTemplates = dbTemplates.filter(
    (t) =>
      t.category?.toLowerCase() === campaignType.toLowerCase() &&
      t.status?.toLowerCase() === "active",
  );

  const selectedNormalTemplate = mergedTemplates.find(
    (t) => (t._id || t.id) === selectedNormalTemplateId,
  );

  const metaApprovedTemplates = dbTemplates.filter((t) => t.metaStatus === "APPROVED");
  const selectedMetaTemplate = metaApprovedTemplates.find((t) => t._id === selectedMetaTemplateId);
  // Templates are stored with their original friendly tokens (e.g. {{name}})
  // — only Meta's own copy gets converted to {{1}}, {{2}} at submission time
  // (see templateService.js's toPositionalBody). Counting must recognize
  // both forms, or named-token templates show zero value inputs here.
  const metaVariableCount = selectedMetaTemplate
    ? extractVariableTokens(selectedMetaTemplate.description).length
    : 0;

  // Which of the template's buttons need a per-campaign value — only URL
  // buttons with a dynamic {{1}}; static buttons (fixed URL/phone/quick
  // reply) need nothing at send time.
  const dynamicButtonIndexes = (selectedMetaTemplate?.buttons || [])
    .map((button, index) => ({ button, index }))
    .filter(({ button }) => button.type === "URL" && /\{\{1\}\}/.test(button.url || ""))
    .map(({ index }) => index);

  const hasMessage = message.trim().length > 0;

  async function fetchCategories() {
    try { setCategories(await fetchTemplateCategories()); }
    catch (e) { console.log(e); }
  }

  async function fetchTemplates() {
    try { const r = await api.get("api/templates"); setDbTemplates(r.data.templates || []); }
    catch (e) { console.log(e); }
  }

  async function loadSegments() {
    try {
      const res = await fetchSegments();
      setSegments(res.segments || []);
    } catch (e) { console.log(e); }
  }

  async function handleSegmentSelect(segmentId) {
    setSelectedSegmentId(segmentId);
    if (!segmentId) { setSegmentAudienceCount(null); return; }

    const segment = segments.find((s) => s._id === segmentId);
    try {
      const { file: segmentFile, count, excludedCount } = await fetchSegmentAsCsvFile(segmentId, segment?.name);
      if (excludedCount > 0) {
        toast(`${excludedCount} opted-out contact${excludedCount === 1 ? "" : "s"} excluded`);
      }
      setFile(segmentFile);
      setSegmentAudienceCount(count);
    } catch {
      toast.error("Failed to load segment contacts");
    }
  }

  function handleFileChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".csv")) { toast.error("Only .csv files are allowed"); return; }
    setFile(f);
  }

  function handleDragOver(e) { e.preventDefault(); e.stopPropagation(); setDragActive(true); }
  function handleDragLeave(e) { e.preventDefault(); e.stopPropagation(); setDragActive(false); }
  function handleDrop(e) {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".csv")) { toast.error("Only .csv files are allowed"); return; }
    setFile(f);
  }

  // Shared between the real submit and the test-send call — guarantees
  // "what you test is what you send", since both build the exact same
  // message/template/variables shape from the same form state.
  function buildMessagePayload() {
    if (useMetaTemplate) {
      return {
        useMetaTemplate: true,
        templateId: selectedMetaTemplate?._id,
        templateVariables: templateVariableValues.slice(0, metaVariableCount),
        buttonVariables: buttonVariableValues,
        message: selectedMetaTemplate?.description,
      };
    }
    return {
      useMetaTemplate: false,
      message,
      mediaUrl: selectedNormalTemplate?.mediaUrl || "",
    };
  }

  function isMessageReady() {
    if (useMetaTemplate) {
      if (!selectedMetaTemplate) return false;
      if (templateVariableValues.slice(0, metaVariableCount).some((v) => !v?.trim())) return false;
      if (dynamicButtonIndexes.some((i) => !buttonVariableValues[i]?.trim())) return false;
      return true;
    }
    return message.trim().length > 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) return toast.error("Please upload a CSV file");
    if (!campaignName.trim()) return toast.error("Campaign name is required");
    if (!campaignType) return toast.error("Select a campaign type");
    if (useMetaTemplate) {
      if (!selectedMetaTemplate) return toast.error("Select an approved template");
      if (templateVariableValues.slice(0, metaVariableCount).some((v) => !v?.trim())) {
        return toast.error("Fill in all template variable values");
      }
      if (dynamicButtonIndexes.some((i) => !buttonVariableValues[i]?.trim())) {
        return toast.error("Fill in all button link values");
      }
    } else if (!message.trim()) {
      return toast.error("Message cannot be empty");
    }
    if (csvAnalysis.duplicateContacts > 0) return toast.error(`${csvAnalysis.duplicateContacts} duplicate contacts found`);
    if (csvAnalysis.invalidContacts > 0) return toast.error(`${csvAnalysis.invalidContacts} invalid contacts found`);

    let scheduleAt = null;
    if (isScheduled) {
      if (!scheduleDate || !scheduleTime) return toast.error("Please select schedule date and time");
      scheduleAt = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
    }

    const payload = buildMessagePayload();
    const formData = new FormData();
    formData.append("file", file);
    formData.append("campaignName", campaignName);
    formData.append("campaignType", campaignType);
    formData.append("scheduleAt", scheduleAt || "");
    formData.append("message", payload.message);

    if (useMetaTemplate) {
      formData.append("templateId", payload.templateId);
      formData.append("templateVariables", JSON.stringify(payload.templateVariables));
      formData.append("buttonVariables", JSON.stringify(payload.buttonVariables));
    } else if (selectedNormalTemplate?.mediaUrl) {
      formData.append("mediaUrl", selectedNormalTemplate.mediaUrl);
      formData.append("mediaType", selectedNormalTemplate.mediaType || "");
    }

    try {
      setUploading(true);
      const { data } = await api.post("api/campaigns/upload", formData, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success(
        data?.excludedCount
          ? `Campaign launched successfully. ${data.excludedCount} opted-out contact${data.excludedCount === 1 ? "" : "s"} excluded.`
          : "Campaign launched successfully",
      );
      setFile(null);
      setCampaignName("");
      setCampaignType("");
      setMessage("");
      setUseMetaTemplate(false);
      setSelectedMetaTemplateId("");
      setSelectedNormalTemplateId("");
      setTemplateVariableValues([]);
      setButtonVariableValues([]);
      if (fileInputRef.current) fileInputRef.current.value = null;
    } catch (err) {
      toast.error(err?.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleSendTest() {
    if (!testPhone.trim()) return toast.error("Enter a phone number to test-send to");
    if (!isMessageReady()) return toast.error("Finish your message/template before testing");

    try {
      setTestSending(true);
      localStorage.setItem("campaignTestPhone", testPhone.trim());
      await api.post("api/campaigns/test-send", { ...buildMessagePayload(), phone: testPhone.trim() });
      toast.success("Test message sent — check WhatsApp");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Test send failed");
    } finally {
      setTestSending(false);
    }
  }

  useEffect(() => {
    let active = true;
    (async () => {
      if (!file) { setCsvAnalysis(EMPTY_CSV_ANALYSIS); return; }
      try {
        const text = await file.text();
        if (!active) return;
        setCsvAnalysis(parseCsvAnalysis(text));
      } catch { if (!active) return; setCsvAnalysis(EMPTY_CSV_ANALYSIS); }
    })();
    return () => { active = false; };
  }, [file]);

  useEffect(() => {
    (async () => {
      await fetchCategories();
      await fetchTemplates();
      // Normally resets the message when campaignType changes (e.g. user
      // manually switches campaign type mid-form). On initial mount with a
      // "Broadcast Again" prefill, use that message instead of wiping it —
      // this effect also runs once on mount, which would otherwise erase a
      // message set via the initial useState value before the user ever
      // sees it.
      setMessage(location.state?.prefilledMessage || "");
    })();
  }, [campaignType]);

  useEffect(() => {
    loadSegments();
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (templateDropdownRef.current && !templateDropdownRef.current.contains(e.target))
        setShowTemplateDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);


  const selectedSegmentName = segments.find((s) => s._id === selectedSegmentId)?.name;

  return (
    <DashboardLayout title="Create Campaign">
      <div className="w-full">
        <form onSubmit={handleSubmit}>
          {/* Page header */}
          <div className="mb-6 sm:mb-8">
            <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-ink sm:text-[30px]">
              Create campaign
            </h1>
            <p className="mt-1.5 text-[15px] text-ink-muted">
              Write your message, choose who gets it, and send it on WhatsApp now or later.
            </p>
          </div>

          {/* Campaign limit reached banner */}
          {campaignLimitReached && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-warning/20 bg-warning-soft px-4 py-3 text-[14px] text-warning">
              <Lock className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                <strong className="font-semibold">Monthly campaign limit reached</strong> ({getUsage("campaigns")}/{getLimit("campaigns")} this month).
                {" "}Upgrade to <strong className="font-semibold">{plan?.slug === "free" ? "Pro" : "Enterprise"}</strong> to send more campaigns this month.
              </span>
            </div>
          )}

          {/* Two-column layout */}
          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_368px]">

            {/* ═══ LEFT: form sections ═══ */}
            <div className="space-y-5">

              {/* 1 · Campaign details */}
              <FormSection
                n="1"
                title="Campaign details"
                description="Give your campaign a name you'll recognise later and pick its type."
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input
                    label="Campaign name"
                    type="text"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder="e.g. Diwali Offer 2025"
                  />

                  <Select
                    label="Campaign type"
                    value={campaignType}
                    onChange={(e) => {
                      setCampaignType(e.target.value);
                      setTemplateSearch("");
                      setMessage("");
                      setSelectedNormalTemplateId("");
                      setShowTemplateDropdown(false);
                    }}
                    inputClassName="cursor-pointer"
                  >
                    <option value="">Select type…</option>
                    {mergedCategories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </Select>
                </div>
              </FormSection>

              {/* 2 · Message */}
              <FormSection
                n="2"
                title="Message"
                description="Pick a saved template or write your own message."
              >
                <div className="mb-5 flex items-center justify-between gap-4 rounded-xl border border-line bg-canvas px-4 py-3.5">
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium text-ink">Send using a Meta-approved template</p>
                    <p className="mt-0.5 text-[13px] text-ink-muted">
                      Required to reach contacts outside the 24-hour message window.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={useMetaTemplate}
                    aria-label="Send using a Meta-approved template"
                    onClick={() => setUseMetaTemplate((v) => !v)}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition ${useMetaTemplate ? "bg-brand-600" : "bg-line-strong"}`}
                  >
                    <span
                      className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${useMetaTemplate ? "translate-x-5" : "translate-x-0"}`}
                    />
                  </button>
                </div>

                {useMetaTemplate ? (
                  <div>
                    <Field label="Approved template" required htmlFor="meta-template-select">
                      <div className="relative">
                        <select
                          id="meta-template-select"
                          value={selectedMetaTemplateId}
                          onChange={(e) => {
                            setSelectedMetaTemplateId(e.target.value);
                            setTemplateVariableValues([]);
                            setButtonVariableValues([]);
                          }}
                          className={`${controlCls} cursor-pointer appearance-none pr-10`}
                        >
                          <option value="">Select an approved template…</option>
                          {metaApprovedTemplates.map((t) => (
                            <option key={t._id} value={t._id}>{t.name} ({t.metaTemplateName})</option>
                          ))}
                        </select>
                        <ChevronDown size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-subtle" />
                      </div>
                    </Field>

                    {metaApprovedTemplates.length === 0 && (
                      <div className="mt-3">
                        <Note tone="warning" icon={AlertTriangle}>
                          No Meta-approved templates yet. Create and submit one from the Templates page.
                        </Note>
                      </div>
                    )}

                    {selectedMetaTemplate && (
                      <div className="mt-4 rounded-xl border border-line bg-canvas p-4">
                        <p className="text-[13px] font-medium text-ink-muted">Template text</p>
                        <p className="mt-1.5 whitespace-pre-wrap text-[14px] leading-relaxed text-ink">
                          {selectedMetaTemplate.description}
                        </p>

                        {metaVariableCount > 0 && (
                          <div className="mt-4 border-t border-line pt-4">
                            <p className="text-[13px] font-medium text-ink">Fill in the blanks</p>
                            <p className="mt-0.5 text-[13px] text-ink-muted">
                              Each value replaces a {"{{number}}"} in the template text above.
                            </p>
                            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                              {Array.from({ length: metaVariableCount }, (_, i) => (
                                <div key={i}>
                                  <input
                                    type="text"
                                    value={templateVariableValues[i] || ""}
                                    onChange={(e) => {
                                      const next = [...templateVariableValues];
                                      next[i] = e.target.value;
                                      setTemplateVariableValues(next);
                                    }}
                                    placeholder={`Value for {{${i + 1}}}`}
                                    aria-label={`Value for {{${i + 1}}}`}
                                    className={controlCls}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const next = [...templateVariableValues];
                                      next[i] = "{{contact_name}}";
                                      setTemplateVariableValues(next);
                                    }}
                                    className="mt-1.5 text-[13px] font-medium text-brand-700 hover:underline"
                                  >
                                    Use contact name
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {dynamicButtonIndexes.length > 0 && (
                          <div className="mt-4 grid grid-cols-1 gap-3 border-t border-line pt-4 sm:grid-cols-2">
                            {dynamicButtonIndexes.map((i) => (
                              <div key={i}>
                                <label className="mb-1.5 block text-[13px] font-medium text-ink">
                                  Link value for "{selectedMetaTemplate.buttons[i].text}" button
                                </label>
                                <input
                                  type="text"
                                  value={buttonVariableValues[i] || ""}
                                  onChange={(e) => {
                                    const next = [...buttonVariableValues];
                                    next[i] = e.target.value;
                                    setButtonVariableValues(next);
                                  }}
                                  placeholder="e.g. 48213"
                                  className={controlCls}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : campaignType && (
                  <div className="mb-4">
                    <label className="mb-1.5 block text-[13px] font-medium text-ink">
                      Template
                    </label>
                    <div ref={templateDropdownRef} className="relative">
                      <button
                        type="button"
                        onClick={() => setShowTemplateDropdown((v) => !v)}
                        className="flex h-11 w-full items-center justify-between rounded-xl border border-line-strong bg-surface px-3.5 text-left text-[14px] transition-colors hover:border-ink-subtle focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/12"
                      >
                        <span className={templateSearch ? "text-ink" : "text-ink-subtle"}>
                          {templateSearch || "Select a template…"}
                        </span>
                        <div className="flex items-center gap-1">
                          {templateSearch && (
                            <span
                              role="button"
                              tabIndex={0}
                              aria-label="Clear template"
                              onClick={(e) => { e.stopPropagation(); setTemplateSearch(""); setMessage(""); setSelectedNormalTemplateId(""); }}
                              onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); setTemplateSearch(""); setMessage(""); setSelectedNormalTemplateId(""); } }}
                              className="rounded-md p-1 text-ink-muted hover:bg-canvas hover:text-ink"
                            >
                              <X className="h-4 w-4" />
                            </span>
                          )}
                          <ChevronDown className="h-4 w-4 text-ink-subtle" />
                        </div>
                      </button>

                      {showTemplateDropdown && (
                        <div className="absolute z-50 mt-1.5 max-h-64 w-full overflow-y-auto rounded-xl border border-line bg-surface py-1 shadow-[0_12px_32px_rgba(15,28,23,0.12)]">
                          {mergedTemplates.length > 0 ? (
                            mergedTemplates.map((t) => (
                              <button
                                key={t._id || t.id}
                                type="button"
                                onClick={() => {
                                  const name = t.name || t.title;
                                  setTemplateSearch(name);
                                  setMessage(t.description || t.content || "");
                                  setSelectedNormalTemplateId(t._id || t.id);
                                  setShowTemplateDropdown(false);
                                }}
                                className={cn(
                                  "flex w-full items-center justify-between px-3.5 py-2.5 text-left text-[14px] text-ink hover:bg-canvas",
                                  (t._id || t.id) === selectedNormalTemplateId && "bg-brand-50 font-medium text-brand-900",
                                )}
                              >
                                {t.name || t.title}
                              </button>
                            ))
                          ) : (
                            <div className="px-3.5 py-3 text-[14px] text-ink-muted">
                              No templates for this type
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => navigate("/templates/create")}
                            className="mt-1 flex w-full items-center gap-2 border-t border-line px-3.5 py-2.5 text-left text-[14px] font-medium text-brand-700 hover:bg-brand-50"
                          >
                            <Plus className="h-4 w-4" />
                            Create new template
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {!useMetaTemplate && (
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label htmlFor="campaign-message" className="text-[13px] font-medium text-ink">
                        Message
                      </label>
                      <span className="text-[13px] tabular-nums text-ink-muted">
                        {message.length} characters
                      </span>
                    </div>
                    <Textarea
                      id="campaign-message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Write your WhatsApp campaign message…"
                      rows={6}
                      inputClassName="resize-none text-[14px]"
                    />
                  </div>
                )}

                {/* Test send — catches typos/broken variables before broadcasting */}
                <div className="mt-5 rounded-xl border border-line bg-canvas p-4">
                  <p className="text-[14px] font-medium text-ink">
                    Send yourself a test message
                  </p>
                  <p className="mt-0.5 text-[13px] text-ink-muted">
                    Sends the message/template above to this one number only — doesn't count
                    toward any campaign.
                  </p>
                  <div className="mt-3 flex flex-col gap-2.5 sm:flex-row">
                    <input
                      type="text"
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                      placeholder="e.g. 919876543210"
                      aria-label="Phone number for test message"
                      className={`${controlCls} sm:max-w-[260px]`}
                    />
                    <Button
                      variant="secondary"
                      onClick={handleSendTest}
                      disabled={testSending || !isMessageReady()}
                      leftIcon={Send}
                      className="h-11"
                    >
                      {testSending ? "Sending…" : "Send test"}
                    </Button>
                  </div>
                </div>
              </FormSection>

              {/* 3 · Contacts */}
              <FormSection
                n="3"
                title="Contacts"
                description="Choose who will receive this campaign."
              >
                <div className="space-y-4">
                  {prefilledCount && file?.name === "contacts-selection.csv" && (
                    <Note icon={CheckCircle}>
                      Using {prefilledCount} contact{prefilledCount === 1 ? "" : "s"} selected from
                      Contacts.
                    </Note>
                  )}

                  {segmentAudienceCount !== null && selectedSegmentId && (
                    <Note icon={CheckCircle}>
                      Using {segmentAudienceCount} contact{segmentAudienceCount === 1 ? "" : "s"} from
                      the "{selectedSegmentName}" segment.
                    </Note>
                  )}

                  {segments.length > 0 && (
                    <Select
                      label="Send to a saved group"
                      help="Or leave this empty and upload a CSV file below."
                      value={selectedSegmentId}
                      onChange={(e) => handleSegmentSelect(e.target.value)}
                      inputClassName="cursor-pointer"
                    >
                      <option value="">Upload a CSV instead…</option>
                      {segments.map((s) => (
                        <option key={s._id} value={s._id}>
                          {s.name} ({s.contactCount})
                        </option>
                      ))}
                    </Select>
                  )}

                  {!file ? (
                    <div
                      role="button"
                      tabIndex={0}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          fileInputRef.current?.click();
                        }
                      }}
                      className={cn(
                        "group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-600/12",
                        dragActive
                          ? "border-brand-500 bg-brand-50"
                          : "border-line-strong bg-canvas hover:border-brand-400 hover:bg-brand-50/60",
                      )}
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-line bg-surface">
                        <UploadCloud
                          className={cn(
                            "h-5 w-5 transition-colors",
                            dragActive ? "text-brand-600" : "text-ink-muted group-hover:text-brand-600",
                          )}
                        />
                      </div>
                      <div>
                        <p className="text-[15px] font-semibold text-ink">
                          {dragActive ? "Drop your CSV here" : "Drag and drop your CSV file here"}
                        </p>
                        <p className="mt-1 text-[14px] text-ink-muted">
                          or <span className="font-medium text-brand-700 underline-offset-2 group-hover:underline">click to choose a file</span>
                        </p>
                      </div>
                      <p className="text-[13px] text-ink-muted">
                        Supports .csv with phone / name columns
                      </p>
                      <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-brand-100 bg-brand-50 px-4 py-3.5">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface">
                          <FileText className="h-5 w-5 text-brand-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-medium text-ink">{file.name}</p>
                          <p className="text-[13px] text-ink-muted">{(file.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <CheckCircle className="hidden h-5 w-5 text-brand-600 sm:block" />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          Change
                        </Button>
                        <button
                          type="button"
                          onClick={() => {
                            setFile(null);
                            setSelectedSegmentId("");
                            setSegmentAudienceCount(null);
                            if (fileInputRef.current) fileInputRef.current.value = "";
                          }}
                          aria-label="Remove file"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line-strong bg-surface text-ink-muted hover:bg-canvas hover:text-ink"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
                    </div>
                  )}
                </div>
              </FormSection>

              {/* 4 · When to send */}
              <FormSection
                n="4"
                title="When to send"
                description="Send it right away or pick a date and time."
              >
                <div className="inline-flex flex-wrap rounded-xl border border-line bg-canvas p-1">
                  <button
                    type="button"
                    onClick={() => setIsScheduled(false)}
                    aria-pressed={!isScheduled}
                    className={`flex h-9 items-center gap-1.5 rounded-lg px-4 text-[14px] font-medium transition-colors ${
                      !isScheduled
                        ? "bg-brand-900 text-white"
                        : "text-ink-muted hover:text-ink"
                    }`}
                  >
                    <Send className="h-4 w-4" />
                    Send now
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!canSchedule) {
                        toast.error("Campaign scheduling is available on Pro and Enterprise plans. Upgrade to unlock.", { icon: "🔒" });
                        return;
                      }
                      setIsScheduled(true);
                    }}
                    aria-pressed={isScheduled}
                    className={`flex h-9 items-center gap-1.5 rounded-lg px-4 text-[14px] font-medium transition-colors ${
                      isScheduled
                        ? "bg-brand-900 text-white"
                        : "text-ink-muted hover:text-ink"
                    }`}
                  >
                    {!canSchedule ? <Lock className="h-4 w-4" /> : <CalendarClock className="h-4 w-4" />}
                    Schedule for later
                  </button>
                </div>
                {!canSchedule && (
                  <p className="mt-2 text-[13px] text-ink-muted">
                    Scheduling is available on Pro and Enterprise plans.
                  </p>
                )}

                {isScheduled && (
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Input
                      label="Date"
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                    />
                    <Input
                      label="Time"
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                    />
                  </div>
                )}
              </FormSection>
            </div>

            {/* ═══ RIGHT: sticky preview + summary ═══ */}
            <div className="space-y-5 lg:sticky lg:top-6">

              {/* WhatsApp Preview */}
              <Card>
                <h2 className="text-[17px] font-semibold text-ink">Preview</h2>
                <p className="mt-1 text-[14px] text-ink-muted">How your message will look on WhatsApp.</p>
                <div className="mt-4 overflow-hidden rounded-xl border border-line">
                  <div className="flex items-center gap-2.5 bg-brand-900 px-3.5 py-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-[12px] font-semibold text-white">
                      WA
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium text-white">
                        {campaignName.trim() || "Your business"}
                      </p>
                      <p className="text-[12px] text-white/75">online</p>
                    </div>
                  </div>
                  <div className="min-h-[160px] bg-[#efeae2] p-3.5">
                    <div className="flex justify-end">
                      {hasMessage ? (
                        <div className="max-w-[92%] rounded-xl rounded-tr-sm bg-[#d9fdd3] px-3 py-2 shadow-[0_1px_1px_rgba(15,28,23,0.12)]">
                          {!useMetaTemplate && selectedNormalTemplate?.mediaUrl && (
                            <img
                              src={resolveMediaUrl(selectedNormalTemplate.mediaUrl)}
                              alt=""
                              className="mb-2 max-h-40 w-full rounded-lg object-cover"
                            />
                          )}
                          {useMetaTemplate && selectedMetaTemplate?.headerType === "IMAGE" && (() => {
                            const metaImg =
                              selectedMetaTemplate.headerMediaUrl ||
                              selectedMetaTemplate.mediaUrl ||
                              (/^https?:\/\//i.test(selectedMetaTemplate.headerHandle)
                                ? selectedMetaTemplate.headerHandle
                                : "");
                            return metaImg ? (
                              <img
                                src={resolveMediaUrl(metaImg)}
                                alt=""
                                className="mb-2 max-h-40 w-full rounded-lg object-cover"
                              />
                            ) : null;
                          })()}
                          <p className="whitespace-pre-wrap break-words text-[14px] leading-relaxed text-ink">
                            {message}
                          </p>
                          <div className="mt-0.5 flex justify-end">
                            <CheckCheck className="h-4 w-4 text-brand-600" aria-hidden="true" />
                          </div>
                        </div>
                      ) : (
                        <div className="max-w-[92%] rounded-xl rounded-tr-sm bg-surface/80 px-3 py-2">
                          <p className="text-[14px] text-ink-muted">
                            Your message preview will appear here.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Summary + launch */}
              <Card>
                <h2 className="text-[17px] font-semibold text-ink">Summary</h2>
                <div className="mt-3">
                  <SummaryRow label="Name" value={campaignName.trim() || "—"} />
                  <SummaryRow label="Type" value={campaignType || "—"} />
                  <SummaryRow
                    label="When"
                    value={isScheduled ? "Scheduled" : "Send now"}
                    valueClass={isScheduled ? "text-info" : "text-brand-700"}
                  />
                  <SummaryRow label="Characters" value={String(message.length)} />
                  {!useMetaTemplate && selectedNormalTemplate?.mediaUrl && (
                    <SummaryRow label="Attachment" value="Image included" valueClass="text-brand-700" />
                  )}
                </div>

                {/* Audience */}
                <div className="mt-5 border-t border-line pt-5">
                  <h3 className="text-[15px] font-semibold text-ink">Contacts</h3>

                  {!file ? (
                    <div className="mt-3 rounded-xl bg-canvas px-4 py-5 text-center">
                      <p className="text-[14px] text-ink-muted">
                        Upload a CSV to see audience stats
                      </p>
                    </div>
                  ) : (
                    <div className="mt-3 flex flex-col gap-3">
                      <div className="grid grid-cols-2 gap-2.5">
                        <StatTile label="Total" value={csvAnalysis.totalContacts} tone="default" />
                        <StatTile label="Valid" value={csvAnalysis.validContacts} tone="brand" />
                        <StatTile label="Invalid" value={csvAnalysis.invalidContacts} tone={csvAnalysis.invalidContacts > 0 ? "danger" : "default"} />
                        <StatTile label="Duplicates" value={csvAnalysis.duplicateContacts} tone={csvAnalysis.duplicateContacts > 0 ? "warning" : "default"} />
                      </div>

                      {csvAnalysis.duplicateContacts > 0 && (
                        <Note tone="warning" icon={AlertTriangle}>
                          {csvAnalysis.duplicateContacts} duplicate{csvAnalysis.duplicateContacts > 1 ? "s" : ""} found — please deduplicate before launching.
                        </Note>
                      )}

                      {csvAnalysis.columns.length > 0 && (
                        <div>
                          <p className="mb-1.5 text-[13px] text-ink-muted">Detected columns</p>
                          <div className="flex flex-wrap gap-1.5">
                            {csvAnalysis.columns.map((col) => (
                              <span
                                key={col}
                                className="rounded-full border border-line bg-canvas px-2.5 py-0.5 text-[13px] font-medium text-ink"
                              >
                                {col}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-5 border-t border-line pt-5">
                  <Button
                    type="submit"
                    size="lg"
                    loading={uploading}
                    disabled={uploading}
                    leftIcon={isScheduled ? CalendarClock : Send}
                    className="w-full"
                  >
                    {uploading ? "Launching…" : isScheduled ? "Schedule campaign" : "Send campaign"}
                  </Button>
                  <p className="mt-2.5 text-center text-[13px] text-ink-muted">
                    Check the preview and summary before sending.
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}

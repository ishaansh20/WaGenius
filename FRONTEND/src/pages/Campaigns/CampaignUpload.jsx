import { useEffect, useRef, useState } from "react";
import api from "../../services/api";
import { resolveMediaUrl } from "../../utils/media";
import { toast } from "react-hot-toast";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { CheckCircle, ChevronDown, FileText, Rocket, UploadCloud, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import StepBadge from "../../components/common/StepBadge";
import { extractVariableTokens, mergeCategories } from "../../constants/templates";
import { EMPTY_CSV_ANALYSIS, parseCsvAnalysis } from "../../utils/csvAnalysis";
import { fetchSegments, fetchTemplateCategories } from "../../services/api";
import { fetchSegmentAsCsvFile } from "../../utils/segmentToCsv";
import usePlan from "../../hooks/usePlan";
import { Lock } from "lucide-react";

/* ── shared input class ── */
const inputCls =
  "block h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-[13.5px] text-slate-800 placeholder-slate-400 outline-none transition focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-100";

/* ── Summary row ── */
function SummaryRow({ label, value, valueClass = "text-slate-800" }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-2 last:border-0 last:pb-0">
      <span className="text-[12px] text-slate-500">{label}</span>
      <span className={`max-w-[60%] truncate text-right text-[12px] font-semibold ${valueClass}`}>
        {value}
      </span>
    </div>
  );
}

/* ── Stat tile ── */
function StatTile({ label, value, color }) {
  const colors = {
    default: "border-slate-200 bg-slate-50 text-slate-500",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-600",
    red: "border-red-200 bg-red-50 text-red-600",
    amber: "border-amber-200 bg-amber-50 text-amber-600",
  };
  return (
    <div className={`rounded-lg border p-3 ${colors[color] || colors.default}`}>
      <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
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
  const [campaignName, setCampaignName] = useState("");
  const [campaignType, setCampaignType] = useState("");
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
    (async () => { await fetchCategories(); await fetchTemplates(); setMessage(""); })();
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

  return (
    <DashboardLayout title="Create Campaign">
      <div className="w-full">
        <form onSubmit={handleSubmit}>
          {/* Campaign limit reached banner */}
          {campaignLimitReached && (
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px]">
              <Lock className="h-4 w-4 shrink-0 text-amber-600" />
              <span className="text-amber-800">
                <strong>Monthly campaign limit reached</strong> ({getUsage("campaigns")}/{getLimit("campaigns")} this month).
                {" "}Upgrade to <strong>{plan?.slug === "free" ? "Pro" : "Enterprise"}</strong> to send more campaigns this month.
              </span>
            </div>
          )}

          {/* Page header */}
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Campaigns
              </p>
              <h1 className="text-[17px] font-semibold leading-tight text-slate-900">
                Create Campaign
              </h1>
              <p className="mt-0.5 text-[13px] text-slate-500">
                Upload contacts and launch a WhatsApp campaign
              </p>
            </div>
          </div>

          {/* Two-column layout */}
          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1fr_288px] xl:grid-cols-[1fr_304px]">

            {/* ═══ LEFT: form steps ═══ */}
            <div className="flex flex-col gap-4">

              {/* Step 1: Campaign Basics */}
              <section className="rounded-xl border border-slate-200 bg-white p-5">
                <StepBadge n="1" label="Campaign Basics" />

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-[12px] font-medium text-slate-700">
                      Campaign Name
                    </label>
                    <input
                      type="text"
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                      className={inputCls}
                      placeholder="e.g. Diwali Offer 2025"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[12px] font-medium text-slate-700">
                      Campaign Type
                    </label>
                    <select
                      value={campaignType}
                      onChange={(e) => {
                        setCampaignType(e.target.value);
                        setTemplateSearch("");
                        setMessage("");
                        setSelectedNormalTemplateId("");
                        setShowTemplateDropdown(false);
                      }}
                      className={`${inputCls} cursor-pointer`}
                    >
                      <option value="">Select type…</option>
                      {mergedCategories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Delivery mode */}
                <div className="mt-4">
                  <p className="mb-1.5 text-[12px] font-medium text-slate-700">
                    Delivery Mode
                  </p>
                  <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                    <button
                      type="button"
                      onClick={() => setIsScheduled(false)}
                      className={`rounded-md px-4 py-1.5 text-[12.5px] font-medium transition-all ${
                        !isScheduled
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Send Immediately
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
                      className={`rounded-md px-4 py-1.5 text-[12.5px] font-medium transition-all flex items-center gap-1.5 ${
                        isScheduled
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      {!canSchedule && <Lock className="h-3 w-3 text-slate-400" />}
                      Schedule for Later
                    </button>
                  </div>
                </div>

                {isScheduled && (
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-[12px] font-medium text-slate-700">
                        Date
                      </label>
                      <input
                        type="date"
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[12px] font-medium text-slate-700">
                        Time
                      </label>
                      <input
                        type="time"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        className={inputCls}
                      />
                    </div>
                  </div>
                )}
              </section>

              {/* Step 2: Message Builder */}
              <section className="rounded-xl border border-slate-200 bg-white p-5">
                <StepBadge n="2" label="Message Builder" />

                <div className="mb-4 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5">
                  <div>
                    <p className="text-[13px] font-medium text-slate-800">Send via Meta-Approved Template</p>
                    <p className="text-[11.5px] text-slate-500">
                      Required to reach contacts outside the 24-hour message window.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUseMetaTemplate((v) => !v)}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition ${useMetaTemplate ? "bg-emerald-600" : "bg-slate-300"}`}
                  >
                    <span
                      className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${useMetaTemplate ? "translate-x-5" : "translate-x-0"}`}
                    />
                  </button>
                </div>

                {useMetaTemplate ? (
                  <div>
                    <label className="mb-1.5 block text-[12px] font-medium text-slate-700">
                      Approved Template <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={selectedMetaTemplateId}
                      onChange={(e) => {
                        setSelectedMetaTemplateId(e.target.value);
                        setTemplateVariableValues([]);
                        setButtonVariableValues([]);
                      }}
                      className={`${inputCls} cursor-pointer`}
                    >
                      <option value="">Select an approved template…</option>
                      {metaApprovedTemplates.map((t) => (
                        <option key={t._id} value={t._id}>{t.name} ({t.metaTemplateName})</option>
                      ))}
                    </select>

                    {metaApprovedTemplates.length === 0 && (
                      <p className="mt-2 text-[12px] text-amber-600">
                        No Meta-approved templates yet. Create and submit one from the Templates page.
                      </p>
                    )}

                    {selectedMetaTemplate && (
                      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <p className="mb-2 whitespace-pre-wrap text-[13px] text-slate-700">
                          {selectedMetaTemplate.description}
                        </p>

                        {metaVariableCount > 0 && (
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
                                  className={inputCls}
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = [...templateVariableValues];
                                    next[i] = "{{contact_name}}";
                                    setTemplateVariableValues(next);
                                  }}
                                  className="mt-1 text-[11px] font-medium text-emerald-600 hover:underline"
                                >
                                  Use contact name
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {dynamicButtonIndexes.length > 0 && (
                          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {dynamicButtonIndexes.map((i) => (
                              <div key={i}>
                                <label className="mb-1 block text-[11px] text-slate-500">
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
                                  className={inputCls}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : campaignType && (
                  <div className="mb-3">
                    <label className="mb-1.5 block text-[12px] font-medium text-slate-700">
                      Template
                    </label>
                    <div ref={templateDropdownRef} className="relative">
                      <button
                        type="button"
                        onClick={() => setShowTemplateDropdown((v) => !v)}
                        className="flex h-9 w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 text-left text-[13.5px] transition hover:border-slate-300 hover:bg-white"
                      >
                        <span className={templateSearch ? "text-slate-800" : "text-slate-400"}>
                          {templateSearch || "Select a template…"}
                        </span>
                        <div className="flex items-center gap-1">
                          {templateSearch && (
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(e) => { e.stopPropagation(); setTemplateSearch(""); setMessage(""); setSelectedNormalTemplateId(""); }}
                              onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); setTemplateSearch(""); setMessage(""); setSelectedNormalTemplateId(""); } }}
                              className="rounded p-0.5 text-slate-400 hover:text-slate-700"
                            >
                              <X className="h-3.5 w-3.5" />
                            </span>
                          )}
                          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                        </div>
                      </button>

                      {showTemplateDropdown && (
                        <div className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
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
                                className="flex w-full items-center justify-between border-b border-slate-100 px-3 py-2.5 text-left text-[13px] text-slate-700 last:border-0 hover:bg-slate-50"
                              >
                                {t.name || t.title}
                              </button>
                            ))
                          ) : (
                            <div className="px-3 py-3 text-[13px] text-slate-400">
                              No templates for this type
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => navigate("/templates/create")}
                            className="w-full border-t border-slate-100 px-3 py-2.5 text-left text-[13px] font-medium text-emerald-600 hover:bg-emerald-50"
                          >
                            + Create New Template
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {!useMetaTemplate && (
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label className="text-[12px] font-medium text-slate-700">
                        Message
                      </label>
                      <span className="text-[11px] tabular-nums text-slate-400">
                        {message.length} chars
                      </span>
                    </div>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Write your WhatsApp campaign message…"
                      rows={6}
                      className="block w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13.5px] text-slate-800 placeholder-slate-400 outline-none transition focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-100"
                    />
                  </div>
                )}

                {/* Test send — catches typos/broken variables before broadcasting */}
                <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="mb-2 text-[12px] font-medium text-slate-700">
                    Send yourself a test message
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      type="text"
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                      placeholder="e.g. 919876543210"
                      className={`${inputCls} sm:max-w-[220px]`}
                    />
                    <button
                      type="button"
                      onClick={handleSendTest}
                      disabled={testSending || !isMessageReady()}
                      className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-[12.5px] font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {testSending ? "Sending…" : "Send Test"}
                    </button>
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate-400">
                    Sends the message/template above to this one number only — doesn't count
                    toward any campaign.
                  </p>
                </div>
              </section>

              {/* Step 3: CSV Upload */}
              <section className="rounded-xl border border-slate-200 bg-white p-5">
                <StepBadge n="3" label="Contact List" />

                {prefilledCount && file?.name === "contacts-selection.csv" && (
                  <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12.5px] text-emerald-700">
                    Using {prefilledCount} contact{prefilledCount === 1 ? "" : "s"} selected from
                    Contacts.
                  </div>
                )}

                {segmentAudienceCount !== null && selectedSegmentId && (
                  <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12.5px] text-emerald-700">
                    Using {segmentAudienceCount} contact{segmentAudienceCount === 1 ? "" : "s"} from
                    the "{segments.find((s) => s._id === selectedSegmentId)?.name}" segment.
                  </div>
                )}

                {segments.length > 0 && (
                  <div className="mb-3">
                    <label className="mb-1.5 block text-[12px] font-medium text-slate-700">
                      Or choose a saved segment
                    </label>
                    <select
                      value={selectedSegmentId}
                      onChange={(e) => handleSegmentSelect(e.target.value)}
                      className={`${inputCls} cursor-pointer`}
                    >
                      <option value="">Upload a CSV instead…</option>
                      {segments.map((s) => (
                        <option key={s._id} value={s._id}>
                          {s.name} ({s.contactCount})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {!file ? (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 py-10 text-center transition-all ${
                      dragActive
                        ? "border-emerald-400 bg-emerald-50"
                        : "border-dashed border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-50/80"
                    }`}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white">
                      <UploadCloud className={`h-5 w-5 ${dragActive ? "text-emerald-500" : "text-slate-400"}`} />
                    </div>
                    <div>
                      <p className="text-[13.5px] font-medium text-slate-700">
                        {dragActive ? "Drop your CSV here" : "Drag & drop a CSV file"}
                      </p>
                      <p className="mt-0.5 text-[12px] text-slate-400">
                        or{" "}
                        <span className="font-semibold text-emerald-600">browse to upload</span>
                      </p>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Supports .csv with phone / name columns
                    </p>
                    <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
                        <FileText className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-slate-800">{file.name}</p>
                        <p className="text-[11px] text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-[12px] font-medium text-slate-500 hover:text-slate-800"
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFile(null);
                          setSelectedSegmentId("");
                          setSegmentAudienceCount(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        aria-label="Remove file"
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
                  </div>
                )}
              </section>

              {/* Step 4: Launch */}
              <section className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-[13.5px] font-semibold text-slate-900">
                      Ready to launch?
                    </p>
                    <p className="mt-0.5 text-[12px] text-slate-400">
                      Review the summary on the right before sending.
                    </p>
                  </div>
                  <button
                    type="submit"
                    disabled={uploading}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-[13.5px] font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {uploading ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <Rocket className="h-4 w-4" />
                    )}
                    {uploading ? "Launching…" : "Launch Campaign"}
                  </button>
                </div>
              </section>
            </div>

            {/* ═══ RIGHT: sticky sidebar ═══ */}
            <div className="flex flex-col gap-4 lg:sticky lg:top-6">

              {/* Campaign Summary */}
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-widest text-slate-400">
                  Summary
                </h3>
                <SummaryRow label="Name" value={campaignName.trim() || "—"} />
                <SummaryRow label="Type" value={campaignType || "—"} />
                <SummaryRow
                  label="Mode"
                  value={isScheduled ? "Scheduled" : "Immediate"}
                  valueClass={isScheduled ? "text-amber-600" : "text-emerald-600"}
                />
                <SummaryRow label="Characters" value={String(message.length)} />
                {!useMetaTemplate && selectedNormalTemplate?.mediaUrl && (
                  <SummaryRow label="Attachment" value="Image included" valueClass="text-emerald-600" />
                )}
              </div>

              {/* WhatsApp Preview */}
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-widest text-slate-400">
                  Preview
                </h3>
                <div className="min-h-[120px] rounded-lg border border-slate-200 bg-[#ece5dc] p-3">
                  <div className="mb-2.5 flex items-center gap-2 border-b border-slate-200/60 pb-2.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[9px] font-bold text-white">
                      WA
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-semibold text-slate-800">Campaign Preview</p>
                      <span className="text-[10px] text-emerald-600">online</span>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    {hasMessage ? (
                      <div className="max-w-[90%] rounded-xl rounded-br-sm bg-[#d9fdd3] px-3 py-2 shadow-sm">
                        {!useMetaTemplate && selectedNormalTemplate?.mediaUrl && (
                          <img
                            src={resolveMediaUrl(selectedNormalTemplate.mediaUrl)}
                            alt=""
                            className="mb-2 max-h-40 w-full rounded-lg object-cover"
                          />
                        )}
                        <p className="whitespace-pre-wrap break-words text-[12.5px] leading-relaxed text-slate-800">
                          {message}
                        </p>
                        <p className="mt-0.5 text-right text-[10px] text-emerald-500">✓✓</p>
                      </div>
                    ) : (
                      <div className="max-w-[90%] rounded-xl rounded-br-sm bg-slate-100 px-3 py-2">
                        <p className="text-[12.5px] italic text-slate-400">
                          Message preview will appear here…
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Audience Summary */}
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-widest text-slate-400">
                  Audience
                </h3>

                {!file ? (
                  <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center">
                    <p className="text-[12px] text-slate-400">
                      Upload a CSV to see audience stats
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    <div className="grid grid-cols-2 gap-2">
                      <StatTile label="Total" value={csvAnalysis.totalContacts} color="default" />
                      <StatTile label="Valid" value={csvAnalysis.validContacts} color="emerald" />
                      <StatTile label="Invalid" value={csvAnalysis.invalidContacts} color="red" />
                      <StatTile label="Dupes" value={csvAnalysis.duplicateContacts} color="amber" />
                    </div>

                    {csvAnalysis.duplicateContacts > 0 && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-700">
                        ⚠ {csvAnalysis.duplicateContacts} duplicate{csvAnalysis.duplicateContacts > 1 ? "s" : ""} found — please deduplicate before launching.
                      </div>
                    )}

                    {csvAnalysis.columns.length > 0 && (
                      <div>
                        <p className="mb-1.5 text-[11px] font-medium text-slate-500">Detected columns</p>
                        <div className="flex flex-wrap gap-1">
                          {csvAnalysis.columns.map((col) => (
                            <span
                              key={col}
                              className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
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
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}

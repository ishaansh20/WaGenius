import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  FileText,
  Image as ImageIcon,
  Link2,
  Megaphone,
  MessageSquare,
  MessageSquareText,
  Phone,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  Type,
  UploadCloud,
  Video,
  X,
} from "lucide-react";
import api from "../../services/api";
import DashboardLayout from "../../components/layout/DashboardLayout";
import StepBadge from "../../components/common/StepBadge";
import WhatsAppPreview from "../../components/templates/WhatsAppPreview";
import { resolveMediaUrl } from "../../utils/media";
import {
  LANGUAGES,
  META_CATEGORIES,
  META_CATEGORY_LABELS,
  QUICK_VARS,
  extractVariableTokens,
} from "../../constants/templates";

const HEADER_TYPES = [
  { value: "NONE", label: "None", icon: X },
  { value: "TEXT", label: "Text", icon: Type },
  { value: "IMAGE", label: "Image", icon: UploadCloud },
  { value: "VIDEO", label: "Video", icon: Video },
  { value: "DOCUMENT", label: "Document", icon: FileText },
];

const HEADER_MEDIA_ACCEPT = {
  IMAGE: "image/jpeg,image/png,image/webp",
  VIDEO: "video/mp4,video/3gpp",
  DOCUMENT: "application/pdf",
};

const MAX_BUTTONS = 10;

const BUTTON_TYPES = [
  { value: "QUICK_REPLY", label: "Quick Reply", icon: MessageSquare },
  { value: "URL", label: "URL", icon: Link2 },
  { value: "PHONE_NUMBER", label: "Phone", icon: Phone },
  { value: "COPY_CODE", label: "Copy Code", icon: Copy },
];

const emptyButton = () => ({ type: "QUICK_REPLY", text: "", url: "", urlExample: "", phoneNumber: "" });

// Mirrors templateService.js's validateButtons on the backend — same
// rules, checked client-side first so the error shows up immediately
// instead of after a round trip.
function validateButtonsClient(buttons, metaCategory) {
  if (buttons.length > MAX_BUTTONS) {
    return `A template can have at most ${MAX_BUTTONS} buttons.`;
  }

  let seenNonQuickReply = false;
  for (const button of buttons) {
    if (button.type === "QUICK_REPLY" && seenNonQuickReply) {
      return "Order matters: add all your Quick Reply buttons first, then any Website/Call buttons after.";
    }
    if (button.type !== "QUICK_REPLY") seenNonQuickReply = true;

    if (!button.text.trim()) return "Every button needs a label.";
    const maxLen = button.type === "COPY_CODE" ? 20 : 25;
    if (button.text.length > maxLen) {
      return `Button text "${button.text}" exceeds Meta's ${maxLen}-character limit.`;
    }
    if (button.type === "URL") {
      if (!button.url.trim()) return "Every URL button needs a URL.";
      if (/\{\{1\}\}/.test(button.url) && !button.urlExample.trim()) {
        return "Provide an example URL for the dynamic {{1}} in your URL button.";
      }
    }
    if (button.type === "PHONE_NUMBER" && !button.phoneNumber.trim()) {
      return "Every Phone button needs a phone number.";
    }
    if (button.type === "COPY_CODE" && metaCategory !== "AUTHENTICATION") {
      return "Copy Code buttons are only meaningful on Authentication templates.";
    }
  }
  return null;
}

const CATEGORY_INFO = {
  MARKETING: {
    icon: Megaphone,
    description: "For sales, offers, and announcements you send proactively — like a festival discount or new product launch. Customers must be able to opt out.",
  },
  UTILITY: {
    icon: MessageSquareText,
    description: "For updates tied to something the customer already did — an order confirmation, appointment reminder, or delivery update.",
  },
  AUTHENTICATION: {
    icon: ShieldCheck,
    description: "For one-time login codes (OTPs). Meta requires a strict, fixed format for these — this page only lets you customize the basic text, so keep it to something like \"Your code is {{1}}\".",
  },
};

const inputCls =
  "block h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-[13.5px] text-slate-800 placeholder-slate-400 outline-none transition focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-100";

const WIZARD_STEPS = [
  "What's this for?",
  "Draft your message",
  "Anything else?",
  "Review & submit",
];

export default function CreateApprovedTemplatePage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const descRef = useRef(null);
  const headerFileInputRef = useRef(null);

  const [step, setStep] = useState(0);

  const [metaCategory, setMetaCategory] = useState("");
  const [name, setName] = useState("");
  const [language, setLanguage] = useState("en_US");
  const [description, setDescription] = useState("");
  const [bodyVariableExamples, setBodyVariableExamples] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [goal, setGoal] = useState("");
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftError, setDraftError] = useState("");

  const [headerType, setHeaderType] = useState("NONE");
  const [headerText, setHeaderText] = useState("");
  const [headerTextExample, setHeaderTextExample] = useState("");
  const [headerMedia, setHeaderMedia] = useState(null);
  const [existingHeaderMediaUrl, setExistingHeaderMediaUrl] = useState("");
  const [headerDragActive, setHeaderDragActive] = useState(false);
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);

  const [buttons, setButtons] = useState([]);

  useEffect(() => {
    if (!id) return;
    async function fetchTemplate() {
      try {
        const res = await api.get(`/api/templates/${id}`);
        const t = res.data.template;
        if (t) {
          setName(t.name || "");
          if (t.metaCategory) {
            setMetaCategory(t.metaCategory);
          } else if (t.category) {
            const catEntry = Object.entries(META_CATEGORY_LABELS).find(
              ([, label]) => label.toLowerCase() === t.category.toLowerCase()
            );
            if (catEntry) setMetaCategory(catEntry[0]);
          }
          setLanguage(t.language || "en_US");
          setDescription(t.description || "");
          setBodyVariableExamples(t.bodyVariableExamples || []);
          setHeaderType(t.headerType || "NONE");
          setHeaderText(t.headerText || "");
          setHeaderTextExample(t.headerTextExample || "");
          setButtons(t.buttons || []);
          setExistingHeaderMediaUrl(t.headerMediaUrl || t.mediaUrl || "");
        }
      } catch (err) {
        console.error("Failed to load template", err);
        setError("Could not load template details — try refreshing.");
      }
    }
    fetchTemplate();
  }, [id]);

  function addButton() {
    if (buttons.length >= MAX_BUTTONS) return;
    setButtons((prev) => [...prev, emptyButton()]);
  }

  function updateButton(index, patch) {
    setButtons((prev) => prev.map((b, i) => (i === index ? { ...b, ...patch } : b)));
  }

  function removeButton(index) {
    setButtons((prev) => prev.filter((_, i) => i !== index));
  }

  const variableTokens = extractVariableTokens(description);
  const variableCount = variableTokens.length;
  const isMediaHeader = ["IMAGE", "VIDEO", "DOCUMENT"].includes(headerType);
  const headerHasVariable = /\{\{1\}\}/.test(headerText);
  const hasAdvancedOptions = headerType !== "NONE" || buttons.length > 0;

  function handleHeaderFileChange(e) {
    const f = e.target.files?.[0];
    if (f) setHeaderMedia(f);
  }

  function handleHeaderDragOver(e) { e.preventDefault(); e.stopPropagation(); setHeaderDragActive(true); }
  function handleHeaderDragLeave(e) { e.preventDefault(); e.stopPropagation(); setHeaderDragActive(false); }
  function handleHeaderDrop(e) {
    e.preventDefault(); e.stopPropagation(); setHeaderDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f) setHeaderMedia(f);
  }

  function insertVariable(v) {
    const ta = descRef.current;
    if (!ta) {
      setDescription((prev) => prev + v);
      return;
    }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const newVal = description.slice(0, start) + v + description.slice(end);
    setDescription(newVal);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + v.length, start + v.length);
    }, 0);
  }

  function handleExampleChange(index, value) {
    setBodyVariableExamples((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  async function handleDraftWithAI() {
    setDraftError("");
    if (!metaCategory) return setDraftError("Choose a category first.");
    if (!goal.trim()) return setDraftError("Tell us what this message is for.");

    try {
      setDraftLoading(true);
      const res = await api.post("/api/templates/draft", { goal, category: metaCategory });
      setDescription(res.data.draft.body);
    } catch (err) {
      setDraftError(
        err?.response?.data?.message || "Couldn't generate a draft — try again or write it yourself.",
      );
    } finally {
      setDraftLoading(false);
    }
  }

  function goNext() {
    setError("");

    if (step === 0) {
      if (!metaCategory) return setError("Choose a category to continue.");
      if (!name.trim()) return setError("Template name is required.");
    }

    if (step === 1) {
      if (!description.trim()) return setError("Message body is required.");
      if (variableCount > 0 && bodyVariableExamples.slice(0, variableCount).some((v) => !v?.trim())) {
        return setError("Provide an example value for every {{n}} placeholder — Meta requires this to review the template.");
      }
    }

    if (step === 2) {
      if (headerType === "TEXT") {
        if (!headerText.trim()) return setError("Header text is required, or set Header back to None.");
        if (headerHasVariable && !headerTextExample.trim()) {
          return setError("Provide an example value for the header's {{1}} placeholder.");
        }
      }
      if (isMediaHeader && !headerMedia && !existingHeaderMediaUrl) {
        return setError(`Upload a ${headerType.toLowerCase()} for the header, or set Header back to None.`);
      }
      const buttonsError = validateButtonsClient(buttons, metaCategory);
      if (buttonsError) return setError(buttonsError);
    }

    setStep((s) => Math.min(s + 1, WIZARD_STEPS.length - 1));
  }

  function goBack() {
    setError("");
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleSubmit() {
    setError("");

    // Defensive re-check of every step's requirements — same rules as
    // goNext, just re-run in full since this is the actual point of no
    // return (identical validation to the original single-page form).
    if (!metaCategory) return setError("Choose a category to continue.");
    if (!name.trim()) return setError("Template name is required.");
    if (!description.trim()) return setError("Message body is required.");
    if (variableCount > 0 && bodyVariableExamples.slice(0, variableCount).some((v) => !v?.trim())) {
      return setError("Provide an example value for every {{n}} placeholder — Meta requires this to review the template.");
    }
    if (headerType === "TEXT") {
      if (!headerText.trim()) return setError("Header text is required, or set Header back to None.");
      if (headerHasVariable && !headerTextExample.trim()) {
        return setError("Provide an example value for the header's {{1}} placeholder.");
      }
    }
    if (isMediaHeader && !headerMedia && !existingHeaderMediaUrl) {
      return setError(`Upload a ${headerType.toLowerCase()} for the header, or set Header back to None.`);
    }
    const buttonsError = validateButtonsClient(buttons, metaCategory);
    if (buttonsError) return setError(buttonsError);

    try {
      setSubmitting(true);

      const createData = new FormData();
      createData.append("name", name);
      createData.append("category", META_CATEGORY_LABELS[metaCategory]);
      createData.append("description", description);
      createData.append("status", "pending");
      createData.append("headerType", headerType);
      if (headerType === "TEXT") {
        createData.append("headerText", headerText);
        createData.append("headerTextExample", headerTextExample);
      }
      if (isMediaHeader && headerMedia) {
        createData.append("headerMedia", headerMedia);
      }
      if (buttons.length > 0) {
        createData.append("buttons", JSON.stringify(buttons));
      }

      let templateId = id;
      if (id) {
        await api.put(`/api/templates/${id}`, createData);
      } else {
        const createRes = await api.post("/api/templates", createData);
        templateId = createRes.data.template._id;
      }

      // metaTemplateName is deliberately never collected from the user —
      // the backend auto-generates and de-conflicts it from `name` (see
      // templateController.js's generateUniqueMetaTemplateName).
      const submitRes = await api.post(`/api/templates/${templateId}/submit`, {
        metaCategory,
        language,
        bodyVariableExamples: bodyVariableExamples.slice(0, variableCount),
      });

      if (submitRes.data.template.metaStatus === "REJECTED") {
        navigate(`/templates/approved/edit/${templateId}`);
        return;
      }

      navigate("/templates/approved/approvals");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to submit template for approval");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DashboardLayout title={id ? "Edit Approved Template" : "Create Approved Template"}>
      <div className="w-full">
        <div className="mb-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Approved Templates
          </p>
          <h1 className="text-[17px] font-semibold leading-tight text-slate-900">
            {id ? "Edit Approved Template" : "Create Approved Template"}
          </h1>
          <p className="mt-0.5 text-[13px] text-slate-500">
            {id
              ? "Update this template and submit your changes to Meta for review"
              : "Build a Meta-reviewed WhatsApp template and submit it for approval"}
          </p>
        </div>

        {/* Wizard progress */}
        <div className="mb-5 flex items-center gap-2">
          {WIZARD_STEPS.map((label, index) => (
            <div key={label} className="flex flex-1 items-center gap-2">
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold transition ${
                  index === step
                    ? "bg-emerald-600 text-white"
                    : index < step
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-400"
                }`}
              >
                {index < step ? <CheckCircle className="h-4 w-4" /> : index + 1}
              </div>
              <span
                className={`hidden truncate text-[12.5px] font-medium sm:block ${
                  index === step ? "text-slate-900" : "text-slate-400"
                }`}
              >
                {label}
              </span>
              {index < WIZARD_STEPS.length - 1 && (
                <div className={`h-px flex-1 ${index < step ? "bg-emerald-200" : "bg-slate-200"}`} />
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-4">
          {/* Step 0: What's this for? */}
          {step === 0 && (
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {META_CATEGORIES.map((cat) => {
                  const Icon = CATEGORY_INFO[cat].icon;
                  const active = metaCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setMetaCategory(cat)}
                      className={`flex flex-col items-start gap-2 rounded-lg border p-3.5 text-left transition ${
                        active
                          ? "border-emerald-300 bg-emerald-50 ring-1 ring-emerald-200"
                          : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"
                      }`}
                    >
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                          active ? "bg-emerald-100 text-emerald-600" : "bg-white text-slate-500 border border-slate-200"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <p className="text-[13px] font-semibold text-slate-800">
                        {META_CATEGORY_LABELS[cat]}
                      </p>
                      <p className="text-[11.5px] leading-relaxed text-slate-500">
                        {CATEGORY_INFO[cat].description}
                      </p>
                    </button>
                  );
                })}
              </div>
              {metaCategory === "AUTHENTICATION" && (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                  <p className="text-[12px] leading-relaxed text-amber-700">
                    Login-code templates follow a strict format set by Meta (the code plus its
                    expiry). This page only handles the basic text — Meta may ask you to adjust
                    anything beyond a simple code message.
                  </p>
                </div>
              )}

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[12px] font-medium text-slate-700">
                    Template Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Order Shipped Notice"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[12px] font-medium text-slate-700">
                    Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className={`${inputCls} cursor-pointer`}
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code}>{lang.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </section>
          )}

          {/* Step 1: Draft your message */}
          {step === 1 && (
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                <div>
                  <label className="mb-1.5 block text-[12px] font-medium text-slate-700">
                    What do you want to tell your customers?
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={goal}
                      onChange={(e) => setGoal(e.target.value)}
                      placeholder="e.g. tell customers their order has shipped"
                      className={inputCls}
                    />
                    <button
                      type="button"
                      onClick={handleDraftWithAI}
                      disabled={draftLoading}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-[12.5px] font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {draftLoading ? (
                        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                      {draftLoading ? "Drafting…" : "Draft with AI"}
                    </button>
                  </div>
                  {draftError && (
                    <p className="mt-1.5 text-[11.5px] text-red-600">{draftError}</p>
                  )}
                  <p className="mt-1.5 text-[11px] text-slate-400">
                    Optional — or just write the message yourself below.
                  </p>

                  <div className="mb-2.5 mt-4 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-slate-400">Insert:</span>
                    {QUICK_VARS.map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => insertVariable(v)}
                        className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[11px] text-slate-600 transition hover:border-slate-300 hover:bg-white hover:text-slate-900"
                      >
                        {v}
                      </button>
                    ))}
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label className="text-[12px] font-medium text-slate-700">
                        Message <span className="text-red-400">*</span>
                      </label>
                      <span className="text-[11px] tabular-nums text-slate-400">
                        {description.length} / 1024 chars
                      </span>
                    </div>
                    <textarea
                      ref={descRef}
                      rows={7}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Write your message… use the Insert buttons above for variables"
                      className="block w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13.5px] text-slate-800 placeholder-slate-400 outline-none transition focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-100"
                    />
                  </div>

                  {variableCount > 0 && (
                    <div className="mt-3">
                      <p className="mb-1.5 text-[12px] font-medium text-slate-700">
                        Example values for {variableTokens.map((t) => `{{${t}}}`).join(", ")}
                      </p>
                      <p className="mb-2 text-[11px] text-slate-400">
                        Meta requires a sample value per placeholder to review the template.
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {variableTokens.map((token, i) => (
                          <input
                            key={token}
                            type="text"
                            value={bodyVariableExamples[i] || ""}
                            onChange={(e) => handleExampleChange(i, e.target.value)}
                            placeholder={`Example for {{${token}}}`}
                            className={inputCls}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                    Preview
                  </p>
                  <WhatsAppPreview name={name} body={description} size="large" />
                </div>
              </div>
            </section>
          )}

          {/* Step 2: Anything else? (header + buttons, collapsed by default) */}
          {step === 2 && (
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              {!moreOptionsOpen && !hasAdvancedOptions ? (
                <div className="flex flex-col items-start gap-3">
                  <p className="text-[13px] text-slate-600">
                    Most templates are just a message — you can skip this.
                  </p>
                  <button
                    type="button"
                    onClick={() => setMoreOptionsOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-[12.5px] font-medium text-slate-600 transition hover:border-slate-300 hover:bg-white"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                    Add a header or buttons (optional)
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  {!hasAdvancedOptions && (
                    <button
                      type="button"
                      onClick={() => setMoreOptionsOpen(false)}
                      className="text-[12px] font-medium text-slate-500 hover:text-slate-700"
                    >
                      ← Skip — I don't need this
                    </button>
                  )}

                  <div>
                    <StepBadge n="1" label="Header (Optional)" />
                    <div className="mb-3 flex flex-wrap gap-1.5">
                      {HEADER_TYPES.map(({ value, label, icon: Icon }) => {
                        const active = headerType === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => { setHeaderType(value); setHeaderMedia(null); }}
                            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12.5px] font-medium transition ${
                              active
                                ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                                : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white"
                            }`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            {label}
                          </button>
                        );
                      })}
                    </div>

                    {headerType === "TEXT" && (
                      <div className="space-y-3">
                        <div>
                          <div className="mb-1.5 flex items-center justify-between">
                            <label className="text-[12px] font-medium text-slate-700">
                              Header Text <span className="text-red-400">*</span>
                            </label>
                            <span className="text-[11px] tabular-nums text-slate-400">
                              {headerText.length} / 60 chars
                            </span>
                          </div>
                          <input
                            type="text"
                            value={headerText}
                            onChange={(e) => setHeaderText(e.target.value)}
                            placeholder="e.g. Your order {{1}} has shipped"
                            className={inputCls}
                          />
                          <p className="mt-1 text-[11px] text-slate-400">
                            You can add one fill-in-the-blank spot in your header — type{" "}
                            <code className="rounded bg-slate-100 px-1 py-0.5 font-mono">{"{{1}}"}</code>{" "}
                            where you want it (e.g. "Your order {"{{1}}"} has shipped").
                          </p>
                        </div>
                        {headerHasVariable && (
                          <div>
                            <label className="mb-1.5 block text-[12px] font-medium text-slate-700">
                              Sample value to show Meta reviewers
                            </label>
                            <input
                              type="text"
                              value={headerTextExample}
                              onChange={(e) => setHeaderTextExample(e.target.value)}
                              placeholder="e.g. #48213"
                              className={inputCls}
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {isMediaHeader && (
                      !headerMedia && !existingHeaderMediaUrl ? (
                        <div
                          onDragOver={handleHeaderDragOver}
                          onDragLeave={handleHeaderDragLeave}
                          onDrop={handleHeaderDrop}
                          onClick={() => headerFileInputRef.current?.click()}
                          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 py-8 text-center transition-all ${
                            headerDragActive
                              ? "border-emerald-400 bg-emerald-50"
                              : "border-dashed border-slate-200 bg-slate-50 hover:border-slate-300"
                          }`}
                        >
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white">
                            <UploadCloud className={`h-4 w-4 ${headerDragActive ? "text-emerald-500" : "text-slate-400"}`} />
                          </div>
                          <div>
                            <p className="text-[13px] font-medium text-slate-700">
                              {headerDragActive ? "Drop file here" : `Drag & drop a ${headerType.toLowerCase()}`}
                            </p>
                            <p className="text-[12px] text-slate-400">
                              or <span className="font-semibold text-emerald-600">browse</span> —{" "}
                              {headerType === "IMAGE" && "JPG, PNG, WEBP, up to 5MB"}
                              {headerType === "VIDEO" && "MP4, 3GP, up to 16MB"}
                              {headerType === "DOCUMENT" && "PDF, up to 100MB"}
                            </p>
                          </div>
                          <input
                            ref={headerFileInputRef}
                            type="file"
                            accept={HEADER_MEDIA_ACCEPT[headerType]}
                            onChange={handleHeaderFileChange}
                            className="hidden"
                          />
                        </div>
                      ) : headerMedia ? (
                        <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
                          <div className="flex min-w-0 items-center gap-3">
                            {headerType === "IMAGE" ? (
                              <img
                                src={URL.createObjectURL(headerMedia)}
                                alt="Header preview"
                                className="h-12 w-12 rounded-lg border border-emerald-300 object-cover"
                              />
                            ) : (
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
                                <FileText className="h-5 w-5 text-emerald-600" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="truncate text-[13px] font-medium text-slate-800">{headerMedia.name}</p>
                              <p className="text-[11px] text-slate-500">{(headerMedia.size / 1024).toFixed(1)} KB</p>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                            <button
                              type="button"
                              onClick={() => { setHeaderMedia(null); if (headerFileInputRef.current) headerFileInputRef.current.value = ""; }}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50/70 px-4 py-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-emerald-300 bg-white">
                              <img
                                src={resolveMediaUrl(existingHeaderMediaUrl)}
                                alt="Current header"
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                  if (e.currentTarget.nextElementSibling) {
                                    e.currentTarget.nextElementSibling.classList.remove("hidden");
                                  }
                                }}
                              />
                              <div className="hidden flex h-full w-full items-center justify-center bg-emerald-100 text-emerald-600">
                                <ImageIcon className="h-5 w-5" />
                              </div>
                            </div>
                            <div className="min-w-0">
                              <span className="inline-flex items-center rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                                Current Header Media
                              </span>
                              <p className="mt-0.5 truncate text-[12.5px] font-medium text-slate-800">
                                {existingHeaderMediaUrl.split("/").pop().split("\\").pop()}
                              </p>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              type="button"
                              onClick={() => headerFileInputRef.current?.click()}
                              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                            >
                              Replace
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setExistingHeaderMediaUrl("");
                                setHeaderMedia(null);
                                if (headerFileInputRef.current) headerFileInputRef.current.value = "";
                              }}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:bg-red-50 hover:text-red-600"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                          <input
                            ref={headerFileInputRef}
                            type="file"
                            accept={HEADER_MEDIA_ACCEPT[headerType]}
                            onChange={handleHeaderFileChange}
                            className="hidden"
                          />
                        </div>
                      )
                    )}

                    {headerType === "NONE" && (
                      <p className="text-[12.5px] text-slate-400">
                        No header — the template will only have body text.
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <StepBadge n="2" label="Buttons (Optional)" />
                      <span className="text-[11px] tabular-nums text-slate-400">
                        {buttons.length} / {MAX_BUTTONS}
                      </span>
                    </div>

                    {buttons.length === 0 ? (
                      <p className="mb-3 text-[12.5px] text-slate-400">
                        No buttons — quick replies, links, or a call button appear under the message.
                      </p>
                    ) : (
                      <div className="mb-3 space-y-3">
                        {buttons.map((button, index) => {
                          const hasUrlVariable = button.type === "URL" && /\{\{1\}\}/.test(button.url);
                          const maxLen = button.type === "COPY_CODE" ? 20 : 25;
                          return (
                            <div key={index} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                              <div className="mb-2.5 flex items-center justify-between gap-2">
                                <select
                                  value={button.type}
                                  onChange={(e) => updateButton(index, { type: e.target.value })}
                                  className={`${inputCls} h-8 w-auto cursor-pointer`}
                                >
                                  {BUTTON_TYPES.filter(
                                    (t) => t.value !== "COPY_CODE" || metaCategory === "AUTHENTICATION",
                                  ).map((t) => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={() => removeButton(index)}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                                  aria-label="Remove button"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>

                              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                <div>
                                  <div className="mb-1 flex items-center justify-between">
                                    <label className="text-[11.5px] font-medium text-slate-600">
                                      Label
                                    </label>
                                    <span className="text-[10.5px] tabular-nums text-slate-400">
                                      {button.text.length} / {maxLen}
                                    </span>
                                  </div>
                                  <input
                                    type="text"
                                    value={button.text}
                                    onChange={(e) => updateButton(index, { text: e.target.value })}
                                    placeholder="e.g. Track Order"
                                    className={inputCls}
                                  />
                                </div>

                                {button.type === "URL" && (
                                  <div>
                                    <label className="mb-1 block text-[11.5px] font-medium text-slate-600">
                                      URL
                                    </label>
                                    <input
                                      type="text"
                                      value={button.url}
                                      onChange={(e) => updateButton(index, { url: e.target.value })}
                                      placeholder="https://example.com/track/{{1}}"
                                      className={`${inputCls} font-mono`}
                                    />
                                  </div>
                                )}

                                {button.type === "PHONE_NUMBER" && (
                                  <div>
                                    <label className="mb-1 block text-[11.5px] font-medium text-slate-600">
                                      Phone Number
                                    </label>
                                    <input
                                      type="text"
                                      value={button.phoneNumber}
                                      onChange={(e) => updateButton(index, { phoneNumber: e.target.value })}
                                      placeholder="+15551234567"
                                      className={inputCls}
                                    />
                                  </div>
                                )}
                              </div>

                              {hasUrlVariable && (
                                <div className="mt-2">
                                  <label className="mb-1 block text-[11.5px] font-medium text-slate-600">
                                    Sample link to show Meta reviewers
                                  </label>
                                  <input
                                    type="text"
                                    value={button.urlExample}
                                    onChange={(e) => updateButton(index, { urlExample: e.target.value })}
                                    placeholder="https://example.com/track/48213"
                                    className={`${inputCls} font-mono`}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={addButton}
                      disabled={buttons.length >= MAX_BUTTONS}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[12.5px] font-medium text-slate-600 transition hover:border-slate-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Button
                    </button>

                    <p className="mt-2.5 text-[11px] leading-relaxed text-slate-400">
                      Order matters: add all your Quick Reply buttons first, then any Website/Call
                      buttons after.
                    </p>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Step 3: Review & submit */}
          {step === 3 && (
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
                <div className="flex flex-col items-center justify-center">
                  <WhatsAppPreview
                    name={name}
                    headerType={headerType}
                    headerText={headerText}
                    headerMediaFile={isMediaHeader ? headerMedia : null}
                    headerMediaUrl={isMediaHeader ? existingHeaderMediaUrl : ""}
                    body={description}
                    buttons={buttons}
                    size="large"
                  />
                </div>

                <div className="space-y-3">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                    Summary
                  </p>
                  <div className="flex flex-wrap gap-2 text-[12px]">
                    <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
                      {META_CATEGORY_LABELS[metaCategory] || "No category"}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
                      {LANGUAGES.find((l) => l.code === language)?.label || language}
                    </span>
                    {headerType !== "NONE" && (
                      <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
                        {headerType === "TEXT" ? "Text header" : `${headerType.toLowerCase()} header`}
                      </span>
                    )}
                    {buttons.length > 0 && (
                      <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
                        {buttons.length} button{buttons.length === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>
                  <p className="text-[12.5px] text-slate-500">
                    Ready to send this to WhatsApp for review? You can still make changes after
                    submitting if it isn't approved.
                  </p>
                </div>
              </div>
            </section>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
              {error}
            </div>
          )}

          <div className="flex items-center gap-3">
            {step > 0 && (
              <button
                type="button"
                onClick={goBack}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2.5 text-[13px] font-medium text-slate-600 transition hover:bg-slate-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
            )}

            {step < WIZARD_STEPS.length - 1 ? (
              <button
                type="button"
                onClick={goNext}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-[13.5px] font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:bg-emerald-800"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-[13.5px] font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                {submitting ? "Submitting…" : "Submit for Approval"}
              </button>
            )}

            <button
              type="button"
              onClick={() => navigate("/templates/approved")}
              className="rounded-lg border border-slate-200 px-4 py-2.5 text-[13px] font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

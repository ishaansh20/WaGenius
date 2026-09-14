import { useEffect, useRef, useState } from "react";
import api, { fetchTemplateCategories } from "../../services/api";
import { toast } from "react-hot-toast";
import { Link, useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import StepBadge from "../../components/common/StepBadge";
import { CheckCircle, FileText, Image as ImageIcon, Lock, Save, ShieldCheck, Sparkles, UploadCloud, X } from "lucide-react";
import usePlan from "../../hooks/usePlan";
import { resolveMediaUrl } from "../../utils/media";
import {
  LANGUAGES,
  META_CATEGORIES,
  META_STATUS_CONFIG,
  QUICK_VARS,
  extractVariableTokens,
  mergeCategories,
} from "../../constants/templates";

const inputCls =
  "block h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-[13.5px] text-slate-800 placeholder-slate-400 outline-none transition focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-100";

export default function CreateTemplatePage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const descRef = useRef(null);
  const { id } = useParams();

  const { hasReachedLimit, getLimit, getUsage, plan } = usePlan();

  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [formError, setFormError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    description: "",
    status: "draft",
  });
  const [media, setMedia] = useState(null);
  const [existingMediaUrl, setExistingMediaUrl] = useState("");
  const [removeMediaFlag, setRemoveMediaFlag] = useState(false);
  const [headerType, setHeaderType] = useState("NONE");
  const [headerText, setHeaderText] = useState("");
  const [buttons, setButtons] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [newCategory, setNewCategory] = useState("");

  const [metaForm, setMetaForm] = useState({
    metaTemplateName: "",
    metaCategory: "",
    language: "en_US",
    bodyVariableExamples: [],
  });
  const [metaStatus, setMetaStatus] = useState("not_submitted");
  const [rejectionReason, setRejectionReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const variableTokens = extractVariableTokens(formData.description);
  const variableCount = variableTokens.length;

  const mergedCategories = mergeCategories(categories);

  const previewMediaUrl = (() => {
    if (media && media.type?.startsWith("image/")) {
      return URL.createObjectURL(media);
    }
    if (existingMediaUrl && !removeMediaFlag) {
      return resolveMediaUrl(existingMediaUrl);
    }
    return null;
  })();

  async function fetchCategories() {
    try {
      setCategories(await fetchTemplateCategories());
    } catch (error) {
      console.log(error);
      toast.error("Couldn't load categories — try refreshing the page");
    }
  }

  async function fetchTemplateById() {
    if (!id) return;
    try {
      const res = await api.get(`/api/templates/${id}`);
      const template = res.data.template;
      setFormData({
        name: template.name || "",
        category: template.category || "",
        description: template.description || "",
        status: template.status || "draft",
      });
      setHeaderType(template.headerType || "NONE");
      setHeaderText(template.headerText || "");
      setButtons(template.buttons || []);
      setExistingMediaUrl(template.headerMediaUrl || template.mediaUrl || "");
      setRemoveMediaFlag(false);

      setMetaForm({
        metaTemplateName: template.metaTemplateName || "",
        metaCategory: template.metaCategory || "",
        language: template.language || "en_US",
        bodyVariableExamples: template.bodyVariableExamples || [],
      });
      setMetaStatus(template.metaStatus || "not_submitted");
      setRejectionReason(template.rejectionReason || "");
    } catch (error) {
      console.log(error);
      toast.error("Couldn't load this template — try refreshing the page");
    }
  }

  useEffect(() => {
    fetchCategories();
    fetchTemplateById();
  }, []);

  function handleChange(e) {
    setFormError("");
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  function insertVariable(v) {
    const ta = descRef.current;
    if (!ta) {
      setFormData((prev) => ({ ...prev, description: prev.description + v }));
      return;
    }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const newVal = formData.description.slice(0, start) + v + formData.description.slice(end);
    setFormData({ ...formData, description: newVal });
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + v.length, start + v.length);
    }, 0);
  }

  function handleFileChange(e) {
    const f = e.target.files?.[0];
    if (f) {
      setMedia(f);
      setRemoveMediaFlag(false);
    }
  }

  function handleDragOver(e) { e.preventDefault(); e.stopPropagation(); setDragActive(true); }
  function handleDragLeave(e) { e.preventDefault(); e.stopPropagation(); setDragActive(false); }
  function handleDrop(e) {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f) {
      setMedia(f);
      setRemoveMediaFlag(false);
    }
  }

  function handleExampleChange(index, value) {
    setMetaForm((prev) => {
      const next = [...prev.bodyVariableExamples];
      next[index] = value;
      return { ...prev, bodyVariableExamples: next };
    });
  }

  async function handleSubmitForApproval() {
    if (!id) {
      setSubmitError("Save the template first, then submit it for approval.");
      return;
    }
    if (!metaForm.metaTemplateName.trim() || !metaForm.metaCategory) {
      setSubmitError("Template name (Meta) and category are required.");
      return;
    }
    try {
      setSubmitting(true);
      setSubmitError("");
      const res = await api.post(`/api/templates/${id}/submit`, metaForm);
      setMetaStatus(res.data.template.metaStatus);
      setRejectionReason(res.data.template.rejectionReason || "");
    } catch (error) {
      setSubmitError(error?.response?.data?.message || "Failed to submit template");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateCategory() {
    if (!newCategory.trim()) return;
    try {
      const res = await api.post("/api/template-categories", { name: newCategory });
      const created = res.data.category;
      setCategories((prev) => [created, ...prev]);
      setFormData({ ...formData, category: created.name });
      setNewCategory("");
      setShowCategoryInput(false);
    } catch (error) { console.log(error); }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formData.category) {
      setFormError("Please select a category before saving.");
      return;
    }
    try {
      setLoading(true);
      const data = new FormData();
      data.append("name", formData.name);
      data.append("category", formData.category);
      data.append("description", formData.description);
      data.append("status", formData.status);
      if (media) {
        data.append("media", media);
        data.append("headerMedia", media);
      }
      if (removeMediaFlag) {
        data.append("removeMedia", "true");
        data.append("removeHeaderMedia", "true");
      }
      if (id) {
        await api.put(`/api/templates/${id}`, data);
      } else {
        await api.post("/api/templates", data);
      }
      navigate("/templates");
    } catch (error) {
      console.log(error);
      toast.error(error?.response?.data?.message || "Couldn't save the template — please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout title={id ? "Edit Template" : "Create Template"}>
      <div className="w-full">
        <form onSubmit={handleSubmit}>

          {/* Template limit reached banner — only show when creating a new template */}
          {!id && hasReachedLimit("templates") && (
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px]">
              <Lock className="h-4 w-4 shrink-0 text-amber-600" />
              <span className="text-amber-800">
                <strong>Template limit reached</strong> ({getUsage("templates")}/{getLimit("templates")} templates).
                {" "}Upgrade to <strong>{plan?.slug === "free" ? "Pro" : "Enterprise"}</strong> to create more templates.
              </span>
            </div>
          )}

          {/* Page header */}
          <div className="mb-6">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Templates</p>
            <h1 className="text-[17px] font-semibold leading-tight text-slate-900">
              {id ? "Edit Template" : "Create Template"}
            </h1>
            <p className="mt-0.5 text-[13px] text-slate-500">
              {id
                ? "Update an existing WhatsApp message template"
                : "Create a reusable WhatsApp message template"}
            </p>
          </div>

          {/* Two-column layout */}
          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1fr_288px] xl:grid-cols-[1fr_304px]">

            {/* ═══ LEFT: form ═══ */}
            <div className="flex flex-col gap-4">

              {/* Step 1: Basics */}
              <section className="rounded-xl border border-slate-200 bg-white p-5">
                <StepBadge n="1" label="Template Basics" />

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-[12px] font-medium text-slate-700">
                      Template Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="e.g. Payment Reminder"
                      className={inputCls}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[12px] font-medium text-slate-700">
                      Category <span className="text-red-400">*</span>
                    </label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === "__create__") {
                          setShowCategoryInput(true);
                          setFormData({ ...formData, category: "" });
                          return;
                        }
                        setShowCategoryInput(false);
                        setNewCategory("");
                        setFormData({ ...formData, category: value });
                      }}
                      className={`${inputCls} cursor-pointer`}
                    >
                      <option value="" disabled>Select category…</option>
                      {mergedCategories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                      <option value="__create__">+ Create New Category</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[12px] font-medium text-slate-700">
                      Status
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      className={`${inputCls} cursor-pointer`}
                    >
                      <option value="draft">Draft</option>
                      <option value="active">Active</option>
                      <option value="archived">Archived</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>
                </div>

                {/* Inline new category */}
                {showCategoryInput && (
                  <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <label className="mb-1.5 block text-[12px] font-medium text-slate-700">
                      New Category Name
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleCreateCategory(); } }}
                        placeholder="e.g. Festival Campaigns"
                        className={inputCls}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleCreateCategory}
                        className="shrink-0 rounded-lg bg-emerald-600 px-3 text-[13px] font-medium text-white transition hover:bg-emerald-700"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowCategoryInput(false); setNewCategory(""); }}
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-100"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </section>

              {/* Step 2: Message */}
              <section className="rounded-xl border border-slate-200 bg-white p-5">
                <StepBadge n="2" label="Message" />

                {/* Quick variable insert */}
                <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
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
                      Description / Message <span className="text-red-400">*</span>
                    </label>
                    <span className="text-[11px] tabular-nums text-slate-400">
                      {formData.description.length} chars
                    </span>
                  </div>
                  <textarea
                    ref={descRef}
                    rows={8}
                    required
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Write your WhatsApp template message…"
                    className="block w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13.5px] text-slate-800 placeholder-slate-400 outline-none transition focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-100"
                  />
                </div>
              </section>

              {/* Step 3: Attachment */}
              <section className="rounded-xl border border-slate-200 bg-white p-5">
                <StepBadge n="3" label="Attachment (Optional)" />

                {!media && !existingMediaUrl ? (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 py-8 text-center transition-all ${
                      dragActive
                        ? "border-emerald-400 bg-emerald-50"
                        : "border-dashed border-slate-200 bg-slate-50 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white">
                      <UploadCloud className={`h-4 w-4 ${dragActive ? "text-emerald-500" : "text-slate-400"}`} />
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-slate-700">
                        {dragActive ? "Drop file here" : "Drag & drop a file"}
                      </p>
                      <p className="text-[12px] text-slate-400">
                        or <span className="font-semibold text-emerald-600">browse</span> — JPG, PNG, PDF
                      </p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,.pdf,video/mp4"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                ) : media ? (
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      {media.type?.startsWith("image/") ? (
                        <img
                          src={URL.createObjectURL(media)}
                          alt="Attachment preview"
                          className="h-12 w-12 rounded-lg border border-emerald-300 object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
                          <FileText className="h-5 w-5 text-emerald-600" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-slate-800">{media.name}</p>
                        <p className="text-[11px] text-slate-500">{(media.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                      <button
                        type="button"
                        onClick={() => {
                          setMedia(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* existingMediaUrl */
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50/70 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-emerald-300 bg-white">
                        <img
                          src={resolveMediaUrl(existingMediaUrl)}
                          alt="Current media"
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
                        <span className="inline-flex items-center rounded-md bg-emerald-100 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-800">
                          Current Attachment
                        </span>
                        <p className="mt-0.5 truncate text-[12.5px] font-medium text-slate-800">
                          {existingMediaUrl.split("/").pop().split("\\").pop()}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRemoveMediaFlag(true);
                          setExistingMediaUrl("");
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:bg-red-50 hover:text-red-600"
                        title="Remove attachment"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,.pdf,video/mp4"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                )}
              </section>

              {/* Step 4: Meta Approval — only for a template with prior submission
                  history (this is where CreateApprovedTemplatePage sends a
                  REJECTED template back to for edit+resubmit). A brand-new
                  template is pointed at the dedicated wizard instead, since
                  that flow already has header/button support and auto-naming
                  this page's manual fields don't. */}
              {id && metaStatus !== "not_submitted" ? (
              <section className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="mb-4 flex items-center justify-between">
                  <StepBadge n="4" label="Submit for Meta Approval" />
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                      (META_STATUS_CONFIG[metaStatus] || META_STATUS_CONFIG.not_submitted).className
                    }`}
                  >
                    {(META_STATUS_CONFIG[metaStatus] || META_STATUS_CONFIG.not_submitted).label}
                  </span>
                </div>

                {metaStatus === "REJECTED" && rejectionReason && (
                  <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[12.5px] text-red-700">
                    <p className="font-medium">This template wasn't approved by WhatsApp.</p>
                    <p className="mt-0.5 text-red-600">Try adjusting the wording and resubmitting.</p>
                    <details className="mt-1.5">
                      <summary className="cursor-pointer text-[11.5px] text-red-500 hover:text-red-700">
                        Show technical details
                      </summary>
                      <p className="mt-1 text-[11.5px] text-red-600">{rejectionReason}</p>
                    </details>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-[12px] font-medium text-slate-700">
                      Meta Template Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={metaForm.metaTemplateName}
                      onChange={(e) =>
                        setMetaForm({
                          ...metaForm,
                          metaTemplateName: e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9_]/g, "_"),
                        })
                      }
                      placeholder="e.g. payment_reminder"
                      className={`${inputCls} font-mono`}
                    />
                    <p className="mt-1 text-[11px] text-slate-400">
                      This is a technical ID WhatsApp uses behind the scenes — pick something short
                      and unique (e.g. payment_reminder). Customers never see it.
                    </p>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[12px] font-medium text-slate-700">
                      Meta Category <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={metaForm.metaCategory}
                      onChange={(e) => setMetaForm({ ...metaForm, metaCategory: e.target.value })}
                      className={`${inputCls} cursor-pointer`}
                    >
                      <option value="" disabled>Select category…</option>
                      {META_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[12px] font-medium text-slate-700">
                      Language
                    </label>
                    <select
                      value={metaForm.language}
                      onChange={(e) => setMetaForm({ ...metaForm, language: e.target.value })}
                      className={`${inputCls} cursor-pointer`}
                    >
                      {LANGUAGES.map((lang) => (
                        <option key={lang.code} value={lang.code}>{lang.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {variableCount > 0 && (
                  <div className="mt-3">
                    <p className="mb-1.5 text-[12px] font-medium text-slate-700">
                      Example values for {variableTokens.map((t) => `{{${t}}}`).join(", ")}
                    </p>
                    <p className="mb-2 text-[11px] text-slate-400">
                      Meta requires a sample value per placeholder in the message above to review the template.
                    </p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {variableTokens.map((token, i) => (
                        <input
                          key={token}
                          type="text"
                          value={metaForm.bodyVariableExamples[i] || ""}
                          onChange={(e) => handleExampleChange(i, e.target.value)}
                          placeholder={`Example for {{${token}}}`}
                          className={inputCls}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {submitError && (
                  <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[12.5px] text-red-700">
                    <p className="font-medium">Couldn't submit this template.</p>
                    <details className="mt-1">
                      <summary className="cursor-pointer text-[11.5px] text-red-500 hover:text-red-700">
                        Show technical details
                      </summary>
                      <p className="mt-1 text-[11.5px] text-red-600">{submitError}</p>
                    </details>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSubmitForApproval}
                  disabled={!id || submitting}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-900 px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <ShieldCheck className="h-4 w-4" />
                  )}
                  {metaStatus === "REJECTED" ? "Resubmit for Approval" : "Submit for Approval"}
                </button>
              </section>
              ) : (
                <section className="rounded-xl border border-slate-200 bg-white p-5">
                  <StepBadge n="4" label="Meta Approval" />
                  <p className="mt-2 text-[12.5px] text-slate-500">
                    Want this approved by WhatsApp? Use{" "}
                    <Link
                      to="/templates/approved/create"
                      className="inline-flex items-center gap-1 font-medium text-emerald-600 hover:underline"
                    >
                      <Sparkles className="h-3 w-3" />
                      Create Approved Template
                    </Link>{" "}
                    for a guided setup with headers, buttons, and AI-assisted drafting.
                  </p>
                </section>
              )}

              {/* Error */}
              {formError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
                  {formError}
                </div>
              )}

              {/* Submit */}
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-[13.5px] font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {loading
                    ? id ? "Updating…" : "Creating…"
                    : id ? "Update Template" : "Create Template"}
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/templates")}
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-[13px] font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>

            {/* ═══ RIGHT: sidebar ═══ */}
            <div className="flex flex-col gap-4 lg:sticky lg:top-6">

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
                      <p className="truncate text-[12px] font-semibold text-slate-800">
                        {formData.name || "Template Preview"}
                      </p>
                      <p className="text-[10px] text-emerald-600">template</p>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    {formData.description.trim() || previewMediaUrl || headerType === "IMAGE" ? (
                      <div className="max-w-[90%] overflow-hidden rounded-xl rounded-br-sm bg-[#d9fdd3] shadow-sm">
                        {/* Media image preview */}
                        {(previewMediaUrl || headerType === "IMAGE") && (
                          <div className="relative flex h-32 w-full items-center justify-center bg-slate-200/70">
                            {previewMediaUrl ? (
                              <img
                                src={previewMediaUrl}
                                alt="Preview"
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                  if (e.currentTarget.nextElementSibling) {
                                    e.currentTarget.nextElementSibling.classList.remove("hidden");
                                  }
                                }}
                              />
                            ) : null}
                            <div className={`flex flex-col items-center gap-1 text-slate-400 ${previewMediaUrl ? "hidden" : ""}`}>
                              <ImageIcon className="h-6 w-6 text-emerald-600" />
                              <span className="text-[11px] font-medium text-slate-700">Header Image</span>
                              {!previewMediaUrl && (
                                <span className="text-[9.5px] text-slate-400">(Configured on Meta)</span>
                              )}
                            </div>
                          </div>
                        )}
                        {headerType === "TEXT" && headerText && (
                          <div className="px-3 pt-2">
                            <p className="text-[12.5px] font-bold text-slate-900">{headerText}</p>
                          </div>
                        )}
                        <div className="px-3 py-2">
                          <p className="whitespace-pre-wrap break-words text-[12.5px] leading-relaxed text-slate-800">
                            {formData.description || <span className="italic text-slate-400">Message preview will appear here…</span>}
                          </p>
                          <p className="mt-0.5 text-right text-[10px] text-emerald-500">✓✓</p>
                        </div>
                        {buttons?.length > 0 && (
                          <div className="divide-y divide-slate-200/70 border-t border-slate-200/70">
                            {buttons.map((b, idx) => (
                              <p key={idx} className="px-3 py-1.5 text-center text-[12px] font-medium text-sky-700">
                                {b.text || "Button"}
                              </p>
                            ))}
                          </div>
                        )}
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

              {/* Guidelines */}
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-widest text-slate-400">
                  Guidelines
                </h3>
                <div className="flex flex-col gap-2.5">
                  {[
                    "Keep messages short, clear and action-oriented.",
                    'Use variables like {{name}} for personalization.',
                    "Include a clear call-to-action whenever possible.",
                    "Avoid excessive promotional or spam-like wording.",
                    "Supported media: JPG, PNG and PDF.",
                  ].map((tip) => (
                    <div key={tip} className="flex items-start gap-2">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[9px] font-bold text-emerald-600">
                        ✓
                      </span>
                      <p className="text-[12.5px] leading-relaxed text-slate-500">{tip}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                    Best Practice
                  </p>
                  <p className="text-[12px] leading-relaxed text-slate-500">
                    Templates with personalization and a clear purpose generally receive better engagement.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}

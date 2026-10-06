import { useEffect, useRef, useState } from "react";
import api, { fetchTemplateCategories } from "../../services/api";
import { toast } from "react-hot-toast";
import { Link, useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { CheckCircle, ChevronLeft, FileText, Image as ImageIcon, Lock, Save, ShieldCheck, Sparkles, UploadCloud, X } from "lucide-react";
import usePlan from "../../hooks/usePlan";
import { Badge, Button, Card, Input, Select, Textarea } from "../../components/ui";
import { BubbleBody, BubbleButtons, ChatBubble, EmptyBubble, PhoneFrame } from "../../components/templates/WhatsAppPreview";
import { resolveMediaUrl } from "../../utils/media";
import {
  LANGUAGES,
  META_CATEGORIES,
  META_STATUS_CONFIG,
  QUICK_VARS,
  extractVariableTokens,
  mergeCategories,
} from "../../constants/templates";

const controlCls =
  "h-11 w-full rounded-xl border border-line-strong bg-surface px-3.5 text-sm text-ink placeholder:text-ink-subtle transition-colors hover:border-ink-subtle focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/12";

// Meta review status → Badge tone.
const META_STATUS_TONES = {
  not_submitted: "neutral",
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  PAUSED: "warning",
  DISABLED: "danger",
};

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
      const initialMediaUrl =
        template.headerMediaUrl ||
        template.mediaUrl ||
        (/^https?:\/\//i.test(template.headerHandle) ? template.headerHandle : "");
      setExistingMediaUrl(initialMediaUrl);
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

          {/* Page header */}
          <div className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <Link
                to="/templates"
                className="mb-3 inline-flex items-center gap-1 text-[14px] font-medium text-ink-muted hover:text-brand-700"
              >
                <ChevronLeft size={16} />
                Templates
              </Link>
              <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-ink sm:text-[30px]">
                {id ? "Edit template" : "Create template"}
              </h1>
              <p className="mt-1.5 text-[15px] text-ink-muted">
                {id
                  ? "Update an existing WhatsApp message template."
                  : "Create a reusable WhatsApp message template."}
              </p>
            </div>
          </div>

          {/* Template limit reached banner — only show when creating a new template */}
          {!id && hasReachedLimit("templates") && (
            <div className="mb-5 flex items-start gap-3 rounded-xl bg-warning-soft px-4 py-3 text-[14px] text-warning">
              <Lock className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                <strong className="font-semibold">Template limit reached</strong> ({getUsage("templates")}/{getLimit("templates")} templates).
                {" "}Upgrade to <strong className="font-semibold">{plan?.slug === "free" ? "Pro" : "Enterprise"}</strong> to create more templates.
              </span>
            </div>
          )}

          {/* Two-column layout */}
          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]">

            {/* ═══ LEFT: form ═══ */}
            <div className="space-y-5">

              {/* Basics */}
              <FormSection title="Basics" description="Give your template a name you'll recognise later.">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input
                    label="Template name"
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g. Payment reminder"
                    className="sm:col-span-2"
                  />

                  <Select
                    label="Category"
                    required
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
                    inputClassName="cursor-pointer"
                  >
                    <option value="" disabled>Select category…</option>
                    {mergedCategories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="__create__">+ Create new category</option>
                  </Select>

                  <Select
                    label="Status"
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    inputClassName="cursor-pointer"
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                    <option value="pending">Pending</option>
                  </Select>
                </div>

                {/* Inline new category */}
                {showCategoryInput && (
                  <div className="mt-4 rounded-xl bg-canvas p-4">
                    <label htmlFor="new-category-name" className="mb-1.5 block text-[13px] font-medium text-ink">
                      New category name
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="new-category-name"
                        type="text"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleCreateCategory(); } }}
                        placeholder="e.g. Festival campaigns"
                        className={controlCls}
                        autoFocus
                      />
                      <Button onClick={handleCreateCategory} className="h-11">
                        Save
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon"
                        onClick={() => { setShowCategoryInput(false); setNewCategory(""); }}
                        aria-label="Cancel new category"
                        className="h-11 w-11"
                      >
                        <X size={16} />
                      </Button>
                    </div>
                  </div>
                )}
              </FormSection>

              {/* Message body */}
              <FormSection
                title="Message"
                description="This is the text your customers will receive."
                aside={
                  <span className="shrink-0 text-[13px] tabular-nums text-ink-muted">
                    {formData.description.length} characters
                  </span>
                }
              >
                <VariableChips onInsert={insertVariable} />

                <Textarea
                  ref={descRef}
                  label="Message text"
                  rows={8}
                  required
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Write your WhatsApp template message…"
                  inputClassName="resize-none text-[15px]"
                  help="Variables like {{name}} are replaced with each contact's details when the message is sent."
                />
              </FormSection>

              {/* Attachment (header media) */}
              <FormSection title="Attachment" description="Optional. Add an image or PDF shown above your message.">
                {!media && !existingMediaUrl ? (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-9 text-center transition-colors ${
                      dragActive
                        ? "border-brand-600 bg-brand-50"
                        : "border-line-strong bg-canvas hover:border-ink-subtle"
                    }`}
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface shadow-[var(--shadow-card)]">
                      <UploadCloud className={`h-5 w-5 ${dragActive ? "text-brand-600" : "text-ink-muted"}`} />
                    </span>
                    <div>
                      <p className="text-[14px] font-medium text-ink">
                        {dragActive ? "Drop file here" : "Drag and drop a file"}
                      </p>
                      <p className="text-[13px] text-ink-muted">
                        or <span className="font-semibold text-brand-700">browse</span> — JPG, PNG, PDF
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
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-brand-100 bg-brand-50 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      {media.type?.startsWith("image/") ? (
                        <img
                          src={URL.createObjectURL(media)}
                          alt="Attachment preview"
                          className="h-12 w-12 rounded-lg border border-brand-100 object-cover"
                        />
                      ) : (
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-surface text-brand-700">
                          <FileText className="h-5 w-5" />
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-medium text-ink">{media.name}</p>
                        <p className="text-[13px] text-ink-muted">{(media.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-brand-600" />
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => {
                          setMedia(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        aria-label="Remove file"
                      >
                        <X size={16} />
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* existingMediaUrl */
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-canvas px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-line bg-surface">
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
                        <div className="hidden flex h-full w-full items-center justify-center bg-brand-50 text-brand-700">
                          <ImageIcon className="h-5 w-5" />
                        </div>
                      </div>
                      <div className="min-w-0">
                        <Badge tone="brand">Current attachment</Badge>
                        <p className="mt-1 truncate text-[14px] font-medium text-ink">
                          {existingMediaUrl.split("/").pop().split("\\").pop()}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
                        Change
                      </Button>
                      <Button
                        variant="danger-ghost"
                        size="icon-sm"
                        onClick={() => {
                          setRemoveMediaFlag(true);
                          setExistingMediaUrl("");
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        title="Remove attachment"
                        aria-label="Remove attachment"
                      >
                        <X size={16} />
                      </Button>
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
              </FormSection>

              {/* Meta Approval — only for a template with prior submission
                  history (this is where CreateApprovedTemplatePage sends a
                  REJECTED template back to for edit+resubmit). A brand-new
                  template is pointed at the dedicated wizard instead, since
                  that flow already has header/button support and auto-naming
                  this page's manual fields don't. */}
              {id && metaStatus !== "not_submitted" ? (
                <FormSection
                  title="WhatsApp approval"
                  description="Submit this template to WhatsApp (Meta) for review."
                  aside={
                    <Badge tone={META_STATUS_TONES[metaStatus] || "neutral"} dot>
                      {(META_STATUS_CONFIG[metaStatus] || META_STATUS_CONFIG.not_submitted).label}
                    </Badge>
                  }
                >
                  {metaStatus === "REJECTED" && rejectionReason && (
                    <div className="mb-4 rounded-xl bg-danger-soft px-4 py-3 text-[14px] text-danger">
                      <p className="font-medium">This template wasn't approved by WhatsApp.</p>
                      <p className="mt-0.5">Try adjusting the wording and resubmitting.</p>
                      <details className="mt-1.5">
                        <summary className="cursor-pointer text-[13px] font-medium">Show technical details</summary>
                        <p className="mt-1 text-[13px]">{rejectionReason}</p>
                      </details>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Input
                      label="Meta template name"
                      required
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
                      inputClassName="font-mono"
                      help="A technical ID WhatsApp uses behind the scenes. Pick something short and unique (e.g. payment_reminder). Customers never see it."
                      className="sm:col-span-2"
                    />

                    <Select
                      label="Meta category"
                      required
                      value={metaForm.metaCategory}
                      onChange={(e) => setMetaForm({ ...metaForm, metaCategory: e.target.value })}
                      inputClassName="cursor-pointer"
                    >
                      <option value="" disabled>Select category…</option>
                      {META_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </Select>

                    <Select
                      label="Language"
                      value={metaForm.language}
                      onChange={(e) => setMetaForm({ ...metaForm, language: e.target.value })}
                      inputClassName="cursor-pointer"
                    >
                      {LANGUAGES.map((lang) => (
                        <option key={lang.code} value={lang.code}>{lang.label}</option>
                      ))}
                    </Select>
                  </div>

                  {variableCount > 0 && (
                    <div className="mt-5 rounded-xl bg-canvas p-4">
                      <p className="text-[13px] font-medium text-ink">
                        Example values for {variableTokens.map((t) => `{{${t}}}`).join(", ")}
                      </p>
                      <p className="mt-0.5 text-[13px] text-ink-muted">
                        Meta requires a sample value per placeholder in the message above to review the template.
                      </p>
                      <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                        {variableTokens.map((token, i) => (
                          <input
                            key={token}
                            type="text"
                            value={metaForm.bodyVariableExamples[i] || ""}
                            onChange={(e) => handleExampleChange(i, e.target.value)}
                            placeholder={`Example for {{${token}}}`}
                            aria-label={`Example for {{${token}}}`}
                            className={controlCls}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {submitError && (
                    <div className="mt-4 rounded-xl bg-danger-soft px-4 py-3 text-[14px] text-danger">
                      <p className="font-medium">Couldn't submit this template.</p>
                      <details className="mt-1">
                        <summary className="cursor-pointer text-[13px] font-medium">Show technical details</summary>
                        <p className="mt-1 text-[13px]">{submitError}</p>
                      </details>
                    </div>
                  )}

                  <Button
                    onClick={handleSubmitForApproval}
                    disabled={!id || submitting}
                    loading={submitting}
                    leftIcon={ShieldCheck}
                    className="mt-5"
                  >
                    {metaStatus === "REJECTED" ? "Resubmit for approval" : "Submit for approval"}
                  </Button>
                </FormSection>
              ) : (
                <FormSection title="WhatsApp approval">
                  <p className="text-[14px] text-ink-muted">
                    Want this approved by WhatsApp? Use{" "}
                    <Link
                      to="/templates/approved/create"
                      className="inline-flex items-center gap-1 font-medium text-brand-700 hover:underline"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Create approved template
                    </Link>{" "}
                    for a guided setup with headers, buttons, and AI-assisted drafting.
                  </p>
                </FormSection>
              )}

              {/* Error */}
              {formError && (
                <div className="rounded-xl bg-danger-soft px-4 py-3 text-[14px] text-danger">
                  {formError}
                </div>
              )}

              {/* Submit */}
              <div className="flex flex-wrap items-center gap-2.5">
                <Button type="submit" size="lg" disabled={loading} loading={loading} leftIcon={Save}>
                  {loading
                    ? id ? "Updating…" : "Creating…"
                    : id ? "Update template" : "Create template"}
                </Button>
                <Button variant="secondary" size="lg" onClick={() => navigate("/templates")}>
                  Cancel
                </Button>
              </div>
            </div>

            {/* ═══ RIGHT: live preview ═══ */}
            <div className="space-y-5 lg:sticky lg:top-6">
              <Card>
                <h2 className="text-[17px] font-semibold text-ink">Preview</h2>
                <p className="mb-5 mt-1 text-[14px] text-ink-muted">How customers will see your message.</p>
                <PhoneFrame name={formData.name}>
                  {formData.description.trim() || previewMediaUrl || headerType === "IMAGE" ? (
                    <ChatBubble>
                      {/* Media image preview */}
                      {(previewMediaUrl || headerType === "IMAGE") && (
                        <div className="relative flex h-36 w-full items-center justify-center bg-black/5">
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
                          <div className={`flex flex-col items-center gap-1 text-ink-muted ${previewMediaUrl ? "hidden" : ""}`}>
                            <ImageIcon className="h-6 w-6 text-brand-600" />
                            <span className="text-[13px] font-medium text-ink">Header image</span>
                            {!previewMediaUrl && (
                              <span className="text-[12px] text-ink-muted">(Configured on Meta)</span>
                            )}
                          </div>
                        </div>
                      )}
                      {headerType === "TEXT" && headerText && (
                        <p className="px-3 pt-2 text-[14px] font-semibold text-ink">{headerText}</p>
                      )}
                      <BubbleBody>{formData.description}</BubbleBody>
                      <BubbleButtons buttons={buttons} />
                    </ChatBubble>
                  ) : (
                    <EmptyBubble />
                  )}
                </PhoneFrame>
              </Card>

              {/* Guidelines */}
              <Card>
                <h2 className="text-[17px] font-semibold text-ink">Tips for a good template</h2>
                <ul className="mt-4 space-y-2.5">
                  {[
                    "Keep messages short, clear and action-oriented.",
                    'Use variables like {{name}} for personalization.',
                    "Include a clear call-to-action whenever possible.",
                    "Avoid excessive promotional or spam-like wording.",
                    "Supported media: JPG, PNG and PDF.",
                  ].map((tip) => (
                    <li key={tip} className="flex items-start gap-2.5">
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                      <p className="text-[14px] leading-relaxed text-ink-muted">{tip}</p>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 rounded-xl bg-canvas p-4">
                  <p className="text-[14px] font-medium text-ink">Best practice</p>
                  <p className="mt-1 text-[14px] leading-relaxed text-ink-muted">
                    Templates with personalization and a clear purpose generally receive better engagement.
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

/* ── Small building blocks ─────────────────────────────────────────── */

function FormSection({ title, description, aside, children }) {
  return (
    <Card>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-[17px] font-semibold text-ink">{title}</h2>
          {description && <p className="mt-1 text-[14px] text-ink-muted">{description}</p>}
        </div>
        {aside}
      </div>
      {children}
    </Card>
  );
}

function VariableChips({ onInsert }) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-[13px] text-ink-muted">Insert a variable:</span>
      {QUICK_VARS.map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onInsert(v)}
          className="h-8 rounded-lg border border-line bg-canvas px-2.5 font-mono text-[13px] text-ink transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-800"
        >
          {v}
        </button>
      ))}
    </div>
  );
}

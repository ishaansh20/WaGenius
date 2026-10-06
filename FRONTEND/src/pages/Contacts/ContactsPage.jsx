import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronLeft, ChevronRight, Search, UploadCloud, UserPlus, Users, Lock, Sparkles } from "lucide-react";
import { toast } from "react-hot-toast";
import { fetchContacts, fetchSegments, updateContact } from "../../services/api";
import usePlan from "../../hooks/usePlan";
import DashboardLayout from "../../components/layout/DashboardLayout";
import ContactsTable from "../../components/contacts/ContactsTable";
import AddContactModal from "../../components/contacts/AddContactModal";
import ImportContactsModal from "../../components/contacts/ImportContactsModal";
import BulkActionsBar from "../../components/contacts/BulkActionsBar";
import SegmentsPanel from "../../components/contacts/SegmentsPanel";
import { Badge, Button, Card, Skeleton } from "../../components/ui";
import { contactsToCsvFile } from "../../utils/segmentToCsv";

const PAGE_SIZE = 25;

const TOOLBAR_CONTROL =
  "h-10 rounded-lg border border-line-strong bg-surface text-[14px] text-ink outline-none transition-colors placeholder:text-ink-subtle hover:border-ink-subtle focus:border-brand-600 focus:ring-4 focus:ring-brand-600/12";

export default function ContactsPage() {
  const navigate = useNavigate();

  const [contacts, setContacts] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [optedOutFilter, setOptedOutFilter] = useState("ALL");

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [segments, setSegments] = useState([]);

  useEffect(() => {
    loadContacts();
  }, [page, search, sourceFilter, optedOutFilter]);

  useEffect(() => {
    loadSegments();
  }, []);

  async function loadSegments() {
    try {
      const res = await fetchSegments();
      setSegments(res.segments || []);
    } catch (error) {
      console.error(error);
    }
  }

  async function loadContacts() {
    try {
      setLoading(true);
      const params = { page, limit: PAGE_SIZE };
      if (search.trim()) params.search = search.trim();
      if (sourceFilter !== "ALL") params.source = sourceFilter;
      if (optedOutFilter !== "ALL") params.optedOut = optedOutFilter === "OPTED_OUT" ? "true" : "false";

      const res = await fetchContacts(params);
      setContacts(res.contacts || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load contacts");
    } finally {
      setLoading(false);
    }
  }

  function handleRefresh() {
    setSelectedIds(new Set());
    loadContacts();
  }

  async function handleUpdateName(contactId, name) {
    try {
      await updateContact(contactId, { name });
      toast.success("Name updated");
      loadContacts();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update name");
      throw error;
    }
  }

  function toggleSelect(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => {
      const allSelected = contacts.length > 0 && contacts.every((c) => prev.has(c._id));
      if (allSelected) return new Set();
      return new Set(contacts.map((c) => c._id));
    });
  }

  const selectedContacts = contacts.filter((c) => selectedIds.has(c._id));

  function goToCampaignUpload(file, count) {
    navigate("/campaigns/upload", {
      state: { prefilledFile: file, prefilledCount: count },
    });
  }

  function handleBroadcast(selection) {
    const eligible = selection.filter((c) => !c.optedOut);
    const excludedCount = selection.length - eligible.length;

    if (eligible.length === 0) {
      toast.error("All selected contacts are opted out");
      return;
    }

    if (excludedCount > 0) {
      toast(`${excludedCount} opted-out contact${excludedCount === 1 ? "" : "s"} excluded`);
    }

    goToCampaignUpload(contactsToCsvFile(eligible), eligible.length);
  }

  function handleSendSegment({ file, count }) {
    goToCampaignUpload(file, count);
  }

  const { canUse, getLimit, plan } = usePlan();
  const contactLimit = getLimit("contacts");
  const isLimitReached = contactLimit > 0 && contactLimit !== -1 && total >= contactLimit;

  function handleImportClick() {
    if (!canUse("contactImport")) {
      toast.error("Bulk CSV import is available on Pro and Enterprise plans.", {
        icon: "🔒",
      });
      return;
    }
    setIsImportModalOpen(true);
  }

  function handleAddContactClick() {
    if (isLimitReached) {
      toast.error(`Contact limit reached (${total}/${contactLimit}). Upgrade to Pro to add more contacts.`, {
        icon: "🔒",
      });
      return;
    }
    setIsAddModalOpen(true);
  }

  const importLocked = !canUse("contactImport");
  const limitLabel = contactLimit === -1 ? "Unlimited" : contactLimit.toLocaleString();

  return (
    <DashboardLayout title="Contacts">
      <div className="w-full">
        {/* Page header */}
        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-ink sm:text-[30px]">Contacts</h1>
            <p className="mt-1.5 text-[15px] text-ink-muted">
              Everyone you can message on WhatsApp, in one address book.
            </p>
            <p className="mt-2 inline-flex items-center gap-2 text-[13px] text-ink-muted">
              <Users size={14} className="text-brand-600" />
              <span>
                {plan?.name || "Free"} plan ·{" "}
                <span className="font-medium tabular-nums text-ink">
                  {total.toLocaleString()} / {limitLabel}
                </span>{" "}
                contacts used
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="secondary"
              onClick={handleImportClick}
              className={importLocked ? "text-ink-muted" : undefined}
              title={importLocked ? "Bulk Import is available on Pro & Enterprise" : "Import Contacts"}
            >
              {importLocked ? (
                <Lock size={16} className="text-ink-muted" />
              ) : (
                <UploadCloud size={16} />
              )}
              <span className="hidden sm:inline">Import</span>
              {importLocked && <Badge tone="brand">Pro</Badge>}
            </Button>

            <Button
              onClick={handleAddContactClick}
              leftIcon={UserPlus}
              className={isLimitReached ? "cursor-not-allowed opacity-55 hover:bg-brand-900" : undefined}
            >
              <span className="hidden sm:inline">Add contact</span>
              <span className="sm:hidden">New</span>
            </Button>
          </div>
        </div>

        <div className="space-y-5">
          {/* Limit reached banner */}
          {isLimitReached && (
            <div className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-[#f3e0b5] bg-warning-soft px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface text-warning">
                  <Lock size={16} />
                </span>
                <p className="text-[14px] text-ink">
                  You have reached your limit of <strong className="font-semibold">{contactLimit} contacts</strong> on the{" "}
                  {plan?.name || "Free"} Plan. Existing contacts are safe, but upgrade to Pro to add or import more.
                </p>
              </div>
              <Button size="sm" leftIcon={Sparkles} onClick={() => navigate("/billing")}>
                Upgrade to Pro
              </Button>
            </div>
          )}

          {/* Toolbar */}
          <Card className="p-4 sm:p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-subtle"
                />
                <input
                  type="text"
                  placeholder="Search by name or phone…"
                  aria-label="Search contacts"
                  value={search}
                  onChange={(e) => { setPage(1); setSearch(e.target.value); }}
                  className={`${TOOLBAR_CONTROL} w-full pl-10 pr-3.5`}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative">
                  <select
                    value={sourceFilter}
                    aria-label="Filter by source"
                    onChange={(e) => { setPage(1); setSourceFilter(e.target.value); }}
                    className={`${TOOLBAR_CONTROL} appearance-none pl-3.5 pr-9`}
                  >
                    <option value="ALL">All sources</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="manual">Manual</option>
                    <option value="imported">Imported</option>
                    <option value="campaign">Campaign</option>
                  </select>
                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-subtle"
                  />
                </div>

                <div className="relative">
                  <select
                    value={optedOutFilter}
                    aria-label="Filter by consent"
                    onChange={(e) => { setPage(1); setOptedOutFilter(e.target.value); }}
                    className={`${TOOLBAR_CONTROL} appearance-none pl-3.5 pr-9`}
                  >
                    <option value="ALL">All consent</option>
                    <option value="OPTED_IN">Opted in</option>
                    <option value="OPTED_OUT">Opted out</option>
                  </select>
                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-subtle"
                  />
                </div>

                <span className="ml-auto shrink-0 pl-1 text-[14px] text-ink-muted lg:ml-2">
                  <span className="font-semibold tabular-nums text-ink">{total.toLocaleString()}</span> total
                </span>
              </div>
            </div>
          </Card>

          {/* Groups */}
          <SegmentsPanel
            segments={segments}
            onChanged={loadSegments}
            onSendSegment={handleSendSegment}
          />

          {/* Bulk actions */}
          <BulkActionsBar
            selectedContacts={selectedContacts}
            onClearSelection={() => setSelectedIds(new Set())}
            onChanged={handleRefresh}
            onBroadcast={handleBroadcast}
          />

          {/* Table */}
          {loading ? (
            <Card padded={false} className="overflow-hidden">
              <p className="sr-only">Loading contacts…</p>
              <div className="h-11 border-b border-line bg-[#f6f7f6]" />
              <div className="divide-y divide-line">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="flex items-center gap-4 px-4 py-3.5">
                    <Skeleton className="h-4 w-4 rounded" />
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="hidden h-4 w-32 sm:block" />
                    <Skeleton className="ml-auto h-5 w-20 rounded-full" />
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <ContactsTable
              contacts={contacts}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onToggleSelectAll={toggleSelectAll}
              onUpdateName={handleUpdateName}
            />
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-1">
              <span className="text-[14px] text-ink-muted">
                Page <span className="font-medium tabular-nums text-ink">{page}</span> of{" "}
                <span className="font-medium tabular-nums text-ink">{totalPages}</span>
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="icon-sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  aria-label="Previous page"
                  className="disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} />
                </Button>
                <Button
                  variant="secondary"
                  size="icon-sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  aria-label="Next page"
                  className="disabled:cursor-not-allowed"
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}
        </div>

        <AddContactModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onContactCreated={handleRefresh}
        />
        <ImportContactsModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onImported={handleRefresh}
        />
      </div>
    </DashboardLayout>
  );
}

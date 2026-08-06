import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Search, UploadCloud, UserPlus, Users } from "lucide-react";
import { toast } from "react-hot-toast";
import { fetchContacts, fetchSegments, updateContact } from "../../services/api";
import DashboardLayout from "../../components/layout/DashboardLayout";
import ContactsTable from "../../components/contacts/ContactsTable";
import AddContactModal from "../../components/contacts/AddContactModal";
import ImportContactsModal from "../../components/contacts/ImportContactsModal";
import BulkActionsBar from "../../components/contacts/BulkActionsBar";
import SegmentsPanel from "../../components/contacts/SegmentsPanel";
import { contactsToCsvFile } from "../../utils/segmentToCsv";

const PAGE_SIZE = 25;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  return (
    <DashboardLayout title="Contacts">
      <main className="flex-1 py-5 sm:py-6 lg:py-2">
        <div className="w-full max-w-none space-y-4">
          {/* Page header */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white">
                <Users className="h-4 w-4 text-slate-500" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  Address Book
                </p>
                <h1 className="text-[17px] font-semibold leading-tight text-slate-900">
                  Contacts
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <UploadCloud className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Import</span>
              </button>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-2 text-[13px] font-medium text-white transition hover:bg-emerald-700 active:bg-emerald-800"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Add Contact</span>
                <span className="sm:hidden">New</span>
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-2.5 rounded-lg border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:gap-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name or phone…"
                value={search}
                onChange={(e) => { setPage(1); setSearch(e.target.value); }}
                className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 text-[13px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-100"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={sourceFilter}
                onChange={(e) => { setPage(1); setSourceFilter(e.target.value); }}
                className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-[13px] text-slate-700 outline-none transition focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-100"
              >
                <option value="ALL">All Sources</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="manual">Manual</option>
                <option value="imported">Imported</option>
                <option value="campaign">Campaign</option>
              </select>

              <select
                value={optedOutFilter}
                onChange={(e) => { setPage(1); setOptedOutFilter(e.target.value); }}
                className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-[13px] text-slate-700 outline-none transition focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-100"
              >
                <option value="ALL">All Consent</option>
                <option value="OPTED_IN">Opted In</option>
                <option value="OPTED_OUT">Opted Out</option>
              </select>
            </div>

            <span className="shrink-0 text-[12px] tabular-nums text-slate-400">
              {total} total
            </span>
          </div>

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
            <div className="flex flex-col items-center justify-center gap-3 py-24">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-500" />
              <p className="text-[13px] text-slate-500">Loading contacts…</p>
            </div>
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
              <span className="text-[12px] text-slate-400">
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
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
      </main>
    </DashboardLayout>
  );
}

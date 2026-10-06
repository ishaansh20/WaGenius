import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { CheckCircle, ChevronLeft, Plus, Search, Trash2, UploadCloud, UserPlus, Users, X } from "lucide-react";
import {
  addContactsToSegment,
  createContact,
  createSegment,
  fetchContacts,
  fetchSegmentContacts,
  removeContactFromSegment,
} from "../../services/api";
import { Button } from "../ui";
import ImportContactsModal from "./ImportContactsModal";

const FIELD_CLASS =
  "h-11 w-full rounded-lg border border-line-strong bg-surface px-3.5 text-[14px] text-ink outline-none transition-colors placeholder:text-ink-subtle hover:border-ink-subtle focus:border-brand-600 focus:ring-4 focus:ring-brand-600/12";

const STEPS = ["Name", "Add people", "Review"];

function MethodCard({ icon: Icon, title, description, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-colors ${
        active ? "border-brand-600 bg-brand-50" : "border-line bg-surface hover:border-line-strong hover:bg-canvas"
      }`}
    >
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-full ${
          active ? "bg-brand-900 text-white" : "bg-brand-50 text-brand-700"
        }`}
      >
        <Icon size={16} />
      </span>
      <span className="text-[14px] font-semibold text-ink">{title}</span>
      <span className="text-[13px] leading-relaxed text-ink-muted">{description}</span>
    </button>
  );
}

// Handles both "create a new group" (no `segment` prop — starts on step 1,
// the name step) and "manage an existing group" (`segment` prop passed —
// jumps straight to step 3, the review step). Either way, membership only
// ever changes through the explicit actions here (Import / Add / remove
// member), never as a side effect of anything else in the app.
export default function CreateGroupModal({ isOpen, onClose, segment, onChanged }) {
  const [step, setStep] = useState(1);
  const [activeSegment, setActiveSegment] = useState(segment || null);
  const [groupName, setGroupName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerContacts, setPickerContacts] = useState([]);
  const [pickerSelected, setPickerSelected] = useState(new Set());
  const [pickerLoading, setPickerLoading] = useState(false);
  const [addingSelected, setAddingSelected] = useState(false);

  const [isNewContactOpen, setIsNewContactOpen] = useState(false);
  const [newContactName, setNewContactName] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");
  const [creatingContact, setCreatingContact] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setActiveSegment(segment || null);
    setStep(segment ? 3 : 1);
    setGroupName("");
    setCreateError("");
    setIsImportOpen(false);
    setIsPickerOpen(false);
    setPickerSearch("");
    setPickerSelected(new Set());
    setIsNewContactOpen(false);
    setNewContactName("");
    setNewContactPhone("");
  }, [isOpen, segment]);

  useEffect(() => {
    if (activeSegment) loadMembers();
  }, [activeSegment]);

  useEffect(() => {
    if (!isPickerOpen) return;
    loadPickerContacts();
  }, [isPickerOpen, pickerSearch]);

  if (!isOpen) return null;

  async function loadMembers() {
    try {
      setMembersLoading(true);
      const res = await fetchSegmentContacts(activeSegment._id);
      setMembers(res.contacts || []);
    } catch {
      toast.error("Failed to load group members");
    } finally {
      setMembersLoading(false);
    }
  }

  async function loadPickerContacts() {
    try {
      setPickerLoading(true);
      const params = { limit: 50 };
      if (pickerSearch.trim()) params.search = pickerSearch.trim();
      const res = await fetchContacts(params);
      setPickerContacts(res.contacts || []);
    } catch {
      toast.error("Failed to load contacts");
    } finally {
      setPickerLoading(false);
    }
  }

  async function handleCreate() {
    if (!groupName.trim()) return;
    try {
      setCreating(true);
      setCreateError("");
      const res = await createSegment({ name: groupName.trim(), type: "static" });
      setActiveSegment(res.segment);
      onChanged();
      setStep(2);
    } catch {
      setCreateError("Failed to create group");
    } finally {
      setCreating(false);
    }
  }

  function togglePick(id) {
    setPickerSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleAddSelected() {
    if (pickerSelected.size === 0) return;
    try {
      setAddingSelected(true);
      await addContactsToSegment(activeSegment._id, [...pickerSelected]);
      toast.success(`Added ${pickerSelected.size} contact${pickerSelected.size === 1 ? "" : "s"}`);
      setPickerSelected(new Set());
      setIsPickerOpen(false);
      loadMembers();
      onChanged();
    } catch {
      toast.error("Failed to add contacts");
    } finally {
      setAddingSelected(false);
    }
  }

  // Creates a brand-new contact and adds it to the group in one action. A
  // 409 (phone already in the address book) isn't treated as a failure —
  // the existing contact is added to the group instead, since that's what
  // the user actually wants here.
  async function handleCreateNewContact() {
    if (!newContactPhone.trim()) return;
    try {
      setCreatingContact(true);
      let contactId;
      let alreadyExisted = false;

      try {
        const res = await createContact({ name: newContactName.trim(), phone: newContactPhone.trim() });
        contactId = res.contact._id;
      } catch (err) {
        const existing = err?.response?.data?.contact;
        if (err?.response?.status === 409 && existing) {
          contactId = existing._id;
          alreadyExisted = true;
        } else {
          throw err;
        }
      }

      await addContactsToSegment(activeSegment._id, [contactId]);
      toast.success(
        alreadyExisted ? "Already in your address book — added to the group" : "Contact added to group",
      );
      setNewContactName("");
      setNewContactPhone("");
      setIsNewContactOpen(false);
      loadMembers();
      onChanged();
    } catch {
      toast.error("Failed to add contact");
    } finally {
      setCreatingContact(false);
    }
  }

  async function handleRemoveMember(contactId) {
    try {
      await removeContactFromSegment(activeSegment._id, contactId);
      setMembers((prev) => prev.filter((c) => c._id !== contactId));
      onChanged();
    } catch {
      toast.error("Failed to remove contact from group");
    }
  }

  function handleImported() {
    loadMembers();
    onChanged();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-brand-950/40 sm:items-center sm:px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-group-title"
        className="flex max-h-[92dvh] w-full max-w-2xl flex-col rounded-t-2xl bg-surface shadow-[var(--shadow-pop)] sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
          <div className="min-w-0">
            <h2 id="create-group-title" className="truncate text-[18px] font-semibold text-ink">
              {activeSegment ? activeSegment.name : "Create group"}
            </h2>
            <p className="mt-0.5 text-[14px] text-ink-muted">
              A named list of specific contacts — great for a one-off audience like a festival offer.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-2 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-muted transition hover:bg-canvas hover:text-ink"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Step progress */}
        <ol className="flex items-center gap-2 px-6 pt-5">
          {STEPS.map((label, index) => {
            const n = index + 1;
            return (
              <li key={label} className="flex flex-1 items-center gap-2" aria-current={n === step ? "step" : undefined}>
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold transition-colors ${
                    n === step
                      ? "bg-brand-900 text-white"
                      : n < step
                        ? "bg-brand-100 text-brand-700"
                        : "border border-line-strong bg-surface text-ink-muted"
                  }`}
                >
                  {n < step ? <CheckCircle size={15} /> : n}
                </span>
                <span
                  className={`hidden truncate text-[14px] font-medium sm:block ${
                    n === step ? "text-ink" : "text-ink-muted"
                  }`}
                >
                  {label}
                </span>
                {n < STEPS.length && (
                  <span className={`h-px flex-1 ${n < step ? "bg-brand-200" : "bg-line"}`} />
                )}
              </li>
            );
          })}
        </ol>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {step === 1 && (
            <>
              <label htmlFor="create-group-name" className="mb-1.5 block text-[13px] font-medium text-ink">
                Group name
              </label>
              <div className="flex gap-2">
                <input
                  id="create-group-name"
                  autoFocus
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
                  placeholder="e.g. Diwali Customers"
                  className={FIELD_CLASS}
                />
                <Button
                  onClick={handleCreate}
                  disabled={creating || !groupName.trim()}
                  className="h-11 disabled:cursor-not-allowed"
                >
                  {creating ? "Creating…" : "Create"}
                </Button>
              </div>
              {createError && (
                <p className="mt-2 text-[13px] text-danger">{createError}</p>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <div className="mb-4 flex items-start justify-between gap-3">
                <p className="text-[14px] text-ink-muted">
                  Add people to this group — use either method, as many times as you like.
                </p>
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-[13px] font-medium tabular-nums text-brand-800">
                  <Users size={14} />
                  {members.length}
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <MethodCard
                  icon={UploadCloud}
                  title="Import contacts"
                  description="Upload a CSV — new or existing contacts all join this group."
                  active={false}
                  onClick={() => setIsImportOpen(true)}
                />
                <MethodCard
                  icon={UserPlus}
                  title="Add contacts"
                  description="Search your address book and pick specific people."
                  active={isPickerOpen}
                  onClick={() => setIsPickerOpen((prev) => !prev)}
                />
                <MethodCard
                  icon={Plus}
                  title="New contact"
                  description="Add someone who isn't in your address book yet."
                  active={isNewContactOpen}
                  onClick={() => setIsNewContactOpen((prev) => !prev)}
                />
              </div>

              {isNewContactOpen && (
                <div className="mt-4 rounded-xl bg-canvas p-4">
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <input
                      type="text"
                      value={newContactName}
                      onChange={(e) => setNewContactName(e.target.value)}
                      placeholder="Name (optional)"
                      aria-label="New contact name"
                      className={FIELD_CLASS}
                    />
                    <input
                      type="text"
                      value={newContactPhone}
                      onChange={(e) => setNewContactPhone(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleCreateNewContact(); }}
                      placeholder="Phone number"
                      aria-label="New contact phone number"
                      className={FIELD_CLASS}
                    />
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Button
                      size="sm"
                      onClick={handleCreateNewContact}
                      disabled={!newContactPhone.trim() || creatingContact}
                      className="disabled:cursor-not-allowed"
                    >
                      {creatingContact ? "Adding…" : "Add to group"}
                    </Button>
                  </div>
                </div>
              )}

              {isPickerOpen && (
                <div className="mt-4 rounded-xl bg-canvas p-4">
                  <div className="relative mb-3">
                    <Search
                      size={16}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-subtle"
                    />
                    <input
                      type="text"
                      value={pickerSearch}
                      onChange={(e) => setPickerSearch(e.target.value)}
                      placeholder="Search contacts…"
                      aria-label="Search contacts"
                      className={`${FIELD_CLASS} h-10 pl-10`}
                    />
                  </div>
                  <div className="max-h-64 overflow-y-auto rounded-xl border border-line bg-surface">
                    {pickerLoading ? (
                      <p className="px-4 py-3 text-[14px] text-ink-muted">Loading…</p>
                    ) : pickerContacts.length === 0 ? (
                      <p className="px-4 py-3 text-[14px] text-ink-muted">No contacts found</p>
                    ) : (
                      pickerContacts.map((c) => (
                        <label
                          key={c._id}
                          className="flex cursor-pointer items-center gap-3 border-b border-line px-4 py-2.5 transition-colors last:border-b-0 hover:bg-canvas"
                        >
                          <input
                            type="checkbox"
                            checked={pickerSelected.has(c._id)}
                            onChange={() => togglePick(c._id)}
                            className="h-4 w-4 rounded border-line-strong accent-brand-700"
                          />
                          <span className="min-w-0 flex-1 truncate text-[14px] text-ink">
                            {c.name}
                          </span>
                          <span className="text-[13px] tabular-nums text-ink-muted">{c.phone}</span>
                        </label>
                      ))
                    )}
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Button
                      size="sm"
                      onClick={handleAddSelected}
                      disabled={pickerSelected.size === 0 || addingSelected}
                      className="disabled:cursor-not-allowed"
                    >
                      {addingSelected ? "Adding…" : `Add ${pickerSelected.size || ""} to group`}
                    </Button>
                  </div>
                </div>
              )}

              <div className="mt-5 flex items-center justify-between">
                <Button variant="ghost" size="sm" leftIcon={ChevronLeft} onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button onClick={() => setStep(3)}>Review group</Button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-[14px] font-medium text-ink">
                  <span className="tabular-nums">{members.length}</span> member{members.length === 1 ? "" : "s"}
                </p>
                <Button variant="ghost" size="sm" leftIcon={Plus} onClick={() => setStep(2)} className="text-brand-700">
                  Add more people
                </Button>
              </div>

              <div className="max-h-80 overflow-y-auto rounded-xl border border-line">
                {membersLoading ? (
                  <p className="px-4 py-3 text-[14px] text-ink-muted">Loading members…</p>
                ) : members.length === 0 ? (
                  <p className="px-4 py-3 text-[14px] text-ink-muted">
                    No members yet — add some via "Add more people" above.
                  </p>
                ) : (
                  members.map((c) => (
                    <div
                      key={c._id}
                      className="flex items-center gap-3 border-b border-line px-4 py-2.5 last:border-b-0"
                    >
                      <span className="min-w-0 flex-1 truncate text-[14px] text-ink">
                        {c.name}
                      </span>
                      <span className="text-[13px] tabular-nums text-ink-muted">{c.phone}</span>
                      <Button
                        size="icon-sm"
                        variant="danger-ghost"
                        onClick={() => handleRemoveMember(c._id)}
                        title="Remove from group"
                        aria-label={`Remove ${c.name || c.phone} from group`}
                      >
                        <Trash2 size={15} />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-line px-6 py-4">
          <Button variant="secondary" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>

      {activeSegment && (
        <ImportContactsModal
          isOpen={isImportOpen}
          onClose={() => setIsImportOpen(false)}
          onImported={handleImported}
          segmentId={activeSegment._id}
          title={`Import Contacts into ${activeSegment.name}`}
          description="Every contact in this CSV — new or already in your address book — joins this group."
        />
      )}
    </div>
  );
}

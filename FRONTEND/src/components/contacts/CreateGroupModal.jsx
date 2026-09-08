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
import ImportContactsModal from "./ImportContactsModal";

const FIELD_CLASS =
  "h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-[13.5px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-100";

const STEPS = ["Name", "Add People", "Review"];

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-slate-900">
              {activeSegment ? activeSegment.name : "Create Group"}
            </h2>
            <p className="mt-0.5 text-[12px] text-slate-400">
              A named list of specific contacts — great for a one-off audience like a festival offer.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step progress */}
        <div className="flex items-center gap-2 px-5 pt-4">
          {STEPS.map((label, index) => {
            const n = index + 1;
            return (
              <div key={label} className="flex flex-1 items-center gap-2">
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition ${
                    n === step
                      ? "bg-emerald-600 text-white"
                      : n < step
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {n < step ? <CheckCircle className="h-3.5 w-3.5" /> : n}
                </div>
                <span className={`hidden truncate text-[11.5px] font-medium sm:block ${n === step ? "text-slate-900" : "text-slate-400"}`}>
                  {label}
                </span>
                {n < STEPS.length && (
                  <div className={`h-px flex-1 ${n < step ? "bg-emerald-200" : "bg-slate-200"}`} />
                )}
              </div>
            );
          })}
        </div>

        <div className="px-5 py-5">
          {step === 1 && (
            <>
              <label className="mb-1.5 block text-[12px] font-medium text-slate-700">
                Group name
              </label>
              <div className="flex gap-2">
                <input
                  autoFocus
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
                  placeholder="e.g. Diwali Customers"
                  className={FIELD_CLASS}
                />
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={creating || !groupName.trim()}
                  className="shrink-0 rounded-lg bg-emerald-600 px-4 text-[13px] font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {creating ? "Creating…" : "Create"}
                </button>
              </div>
              {createError && (
                <p className="mt-2 text-[12.5px] text-red-600">{createError}</p>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[12.5px] text-slate-500">
                  Add people to this group — use either method, as many times as you like.
                </p>
                <span className="inline-flex shrink-0 items-center gap-1 text-[12px] text-slate-400">
                  <Users className="h-3.5 w-3.5" />
                  {members.length}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsImportOpen(true)}
                  className="flex flex-col items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-left transition hover:border-slate-300 hover:bg-white"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500">
                    <UploadCloud className="h-4 w-4" />
                  </div>
                  <p className="text-[13px] font-semibold text-slate-800">Import Contacts</p>
                  <p className="text-[11.5px] leading-relaxed text-slate-500">
                    Upload a CSV — new or existing contacts all join this group.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPickerOpen((prev) => !prev)}
                  className={`flex flex-col items-start gap-2 rounded-lg border p-3.5 text-left transition ${
                    isPickerOpen
                      ? "border-emerald-300 bg-emerald-50 ring-1 ring-emerald-200"
                      : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                      isPickerOpen ? "bg-emerald-100 text-emerald-600" : "border border-slate-200 bg-white text-slate-500"
                    }`}
                  >
                    <UserPlus className="h-4 w-4" />
                  </div>
                  <p className="text-[13px] font-semibold text-slate-800">Add Contacts</p>
                  <p className="text-[11.5px] leading-relaxed text-slate-500">
                    Search your address book and pick specific people.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setIsNewContactOpen((prev) => !prev)}
                  className={`flex flex-col items-start gap-2 rounded-lg border p-3.5 text-left transition ${
                    isNewContactOpen
                      ? "border-emerald-300 bg-emerald-50 ring-1 ring-emerald-200"
                      : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                      isNewContactOpen ? "bg-emerald-100 text-emerald-600" : "border border-slate-200 bg-white text-slate-500"
                    }`}
                  >
                    <Plus className="h-4 w-4" />
                  </div>
                  <p className="text-[13px] font-semibold text-slate-800">New Contact</p>
                  <p className="text-[11.5px] leading-relaxed text-slate-500">
                    Add someone who isn't in your address book yet.
                  </p>
                </button>
              </div>

              {isNewContactOpen && (
                <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={newContactName}
                      onChange={(e) => setNewContactName(e.target.value)}
                      placeholder="Name (optional)"
                      className={`${FIELD_CLASS} bg-white`}
                    />
                    <input
                      type="text"
                      value={newContactPhone}
                      onChange={(e) => setNewContactPhone(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleCreateNewContact(); }}
                      placeholder="Phone number"
                      className={`${FIELD_CLASS} bg-white`}
                    />
                  </div>
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={handleCreateNewContact}
                      disabled={!newContactPhone.trim() || creatingContact}
                      className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-[12.5px] font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {creatingContact ? "Adding…" : "Add to group"}
                    </button>
                  </div>
                </div>
              )}

              {isPickerOpen && (
                <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="relative mb-2">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={pickerSearch}
                      onChange={(e) => setPickerSearch(e.target.value)}
                      placeholder="Search contacts…"
                      className={`${FIELD_CLASS} bg-white pl-8`}
                    />
                  </div>
                  <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white">
                    {pickerLoading ? (
                      <p className="px-3 py-3 text-[12.5px] text-slate-400">Loading…</p>
                    ) : pickerContacts.length === 0 ? (
                      <p className="px-3 py-3 text-[12.5px] text-slate-400">No contacts found</p>
                    ) : (
                      pickerContacts.map((c) => (
                        <label
                          key={c._id}
                          className="flex cursor-pointer items-center gap-2.5 border-b border-slate-100 px-3 py-2 last:border-b-0 hover:bg-slate-50"
                        >
                          <input
                            type="checkbox"
                            checked={pickerSelected.has(c._id)}
                            onChange={() => togglePick(c._id)}
                            className="h-3.5 w-3.5 rounded border-slate-300"
                          />
                          <span className="min-w-0 flex-1 truncate text-[12.5px] text-slate-700">
                            {c.name}
                          </span>
                          <span className="text-[11.5px] text-slate-400">{c.phone}</span>
                        </label>
                      ))
                    )}
                  </div>
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={handleAddSelected}
                      disabled={pickerSelected.size === 0 || addingSelected}
                      className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-[12.5px] font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {addingSelected ? "Adding…" : `Add ${pickerSelected.size || ""} to group`}
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-1 text-[12.5px] font-medium text-slate-500 hover:text-slate-700"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-[13px] font-medium text-white transition hover:bg-emerald-700"
                >
                  Review Group
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[12px] font-medium text-slate-700">
                  {members.length} member{members.length === 1 ? "" : "s"}
                </p>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="text-[12px] font-medium text-emerald-600 hover:underline"
                >
                  + Add more people
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto rounded-lg border border-slate-200">
                {membersLoading ? (
                  <p className="px-3 py-3 text-[12.5px] text-slate-400">Loading members…</p>
                ) : members.length === 0 ? (
                  <p className="px-3 py-3 text-[12.5px] text-slate-400">
                    No members yet — add some via "Add more people" above.
                  </p>
                ) : (
                  members.map((c) => (
                    <div
                      key={c._id}
                      className="flex items-center gap-2.5 border-b border-slate-100 px-3 py-2 last:border-b-0"
                    >
                      <span className="min-w-0 flex-1 truncate text-[12.5px] text-slate-700">
                        {c.name}
                      </span>
                      <span className="text-[11.5px] text-slate-400">{c.phone}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(c._id)}
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-slate-400 hover:bg-red-100 hover:text-red-600"
                        title="Remove from group"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-[13px] font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Done
          </button>
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

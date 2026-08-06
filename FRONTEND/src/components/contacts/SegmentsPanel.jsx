import { useState } from "react";
import { toast } from "react-hot-toast";
import { Layers, Send, Trash2, Users } from "lucide-react";
import { deleteSegment } from "../../services/api";
import { fetchSegmentAsCsvFile } from "../../utils/segmentToCsv";
import CreateGroupModal from "./CreateGroupModal";

export default function SegmentsPanel({ segments, onChanged, onSendSegment }) {
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [managingSegment, setManagingSegment] = useState(null);

  function openCreateGroup() {
    setManagingSegment(null);
    setGroupModalOpen(true);
  }

  function openManageGroup(segment) {
    setManagingSegment(segment);
    setGroupModalOpen(true);
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this group? Its contacts are unaffected.")) return;

    try {
      await deleteSegment(id);
      toast.success("Group deleted");
      onChanged();
    } catch {
      toast.error("Failed to delete group");
    }
  }

  async function handleSend(segment) {
    try {
      const { file, count, excludedCount } = await fetchSegmentAsCsvFile(segment._id, segment.name);
      if (count === 0) {
        toast.error("This group has no eligible (non-opted-out) contacts");
        return;
      }
      if (excludedCount > 0) {
        toast(`${excludedCount} opted-out contact${excludedCount === 1 ? "" : "s"} excluded`);
      }
      onSendSegment({ file, count });
    } catch {
      toast.error("Failed to load group contacts");
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[12px] font-medium text-slate-700">
          <Layers className="h-3.5 w-3.5 text-slate-400" />
          Groups
        </div>
        <button
          type="button"
          onClick={openCreateGroup}
          className="text-[12px] font-medium text-emerald-600 hover:underline"
        >
          + Create Group
        </button>
      </div>

      {segments.length === 0 ? (
        <p className="text-[12px] text-slate-400">
          No groups yet — create one, then import or add contacts to build a reusable campaign audience.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {segments.map((segment) => (
            <div
              key={segment._id}
              className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 py-1 pl-3 pr-1.5"
            >
              <span className="text-[12px] font-medium text-slate-700">{segment.name}</span>
              <span className="text-[11px] text-slate-400">{segment.contactCount}</span>
              {segment.type === "static" && (
                <button
                  type="button"
                  onClick={() => openManageGroup(segment)}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                  title="Manage group members"
                >
                  <Users className="h-3 w-3" />
                </button>
              )}
              <button
                type="button"
                onClick={() => handleSend(segment)}
                className="inline-flex h-6 w-6 items-center justify-center rounded-full text-emerald-600 hover:bg-emerald-100"
                title="Send campaign to this group"
              >
                <Send className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(segment._id)}
                className="inline-flex h-6 w-6 items-center justify-center rounded-full text-slate-400 hover:bg-red-100 hover:text-red-600"
                title="Delete group"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <CreateGroupModal
        isOpen={groupModalOpen}
        onClose={() => setGroupModalOpen(false)}
        segment={managingSegment}
        onChanged={onChanged}
      />
    </div>
  );
}

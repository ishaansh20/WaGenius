import { useState } from "react";
import { toast } from "react-hot-toast";
import { Layers, Plus, Send, Trash2, UserCog, Users } from "lucide-react";
import { deleteSegment } from "../../services/api";
import { Button, Card } from "../ui";
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
    <Card>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[17px] font-semibold text-ink">Groups</h2>
          <p className="mt-1 text-[14px] text-ink-muted">
            Saved lists of contacts you can send a campaign to in one click.
          </p>
        </div>
        {segments.length > 0 && (
          <Button size="sm" variant="secondary" leftIcon={Plus} onClick={openCreateGroup}>
            Create group
          </Button>
        )}
      </div>

      {segments.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl bg-canvas px-6 py-8 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-ink-muted shadow-[var(--shadow-card)]">
            <Layers size={20} />
          </span>
          <p className="mt-4 text-[15px] font-semibold text-ink">No groups yet</p>
          <p className="mt-1 max-w-sm text-[14px] text-ink-muted">
            Create one, then import or add contacts to build a reusable campaign audience.
          </p>
          <div className="mt-4">
            <Button leftIcon={Plus} onClick={openCreateGroup}>
              Create group
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {segments.map((segment) => (
            <div
              key={segment._id}
              className="flex items-center gap-3 rounded-xl border border-line px-4 py-3 transition-colors hover:bg-canvas"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                <Users size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold text-ink">{segment.name}</p>
                <p className="text-[13px] tabular-nums text-ink-muted">
                  {segment.contactCount} contact{segment.contactCount === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                {segment.type === "static" && (
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => openManageGroup(segment)}
                    title="Manage group members"
                    aria-label={`Manage members of ${segment.name}`}
                  >
                    <UserCog size={16} />
                  </Button>
                )}
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => handleSend(segment)}
                  title="Send campaign to this group"
                  aria-label={`Send campaign to ${segment.name}`}
                  className="text-brand-700"
                >
                  <Send size={16} />
                </Button>
                <Button
                  size="icon-sm"
                  variant="danger-ghost"
                  onClick={() => handleDelete(segment._id)}
                  title="Delete group"
                  aria-label={`Delete ${segment.name}`}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
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
    </Card>
  );
}

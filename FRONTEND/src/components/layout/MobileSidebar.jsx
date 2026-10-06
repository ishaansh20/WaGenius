import { useEffect } from "react";
import { X } from "lucide-react";
import SidebarPanel from "./SidebarPanel";

export default function MobileSidebar({ open, onClose }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-40 bg-brand-950/45 backdrop-blur-[2px] lg:hidden" />
      <div className="fixed inset-y-0 left-0 z-50 w-[min(86vw,300px)] shadow-2xl lg:hidden">
        <SidebarPanel
          onNavigate={onClose}
          headerAction={
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted transition hover:bg-canvas hover:text-ink"
              aria-label="Close navigation"
            >
              <X size={18} />
            </button>
          }
        />
      </div>
    </>
  );
}

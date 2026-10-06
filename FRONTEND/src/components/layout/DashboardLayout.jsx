import { useState } from "react";
import { Menu } from "lucide-react";

import { MiniSidebar } from "./MiniSidebar";
import { useSidebarOffset } from "../../store/uiStore";
import MobileSidebar from "./MobileSidebar";
import { LogoMark } from "../ui/Logo";
import { cn } from "../../utils/cn";

export default function DashboardLayout({ title = "Wagenius", children }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const sidebarOffset = useSidebarOffset();

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <MiniSidebar />

      <MobileSidebar open={mobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)} />

      <main className={cn("min-h-screen transition-[padding] duration-200", sidebarOffset)}>
        <div className="sticky top-0 z-30 border-b border-line bg-surface/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-line text-ink transition hover:bg-canvas"
              aria-label="Open navigation"
            >
              <Menu size={20} />
            </button>
            <LogoMark className="h-8 w-8" />
            <span className="min-w-0 flex-1 truncate font-display text-[16px] font-semibold text-ink">{title}</span>
          </div>
        </div>

        <div className="mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 lg:px-10 lg:py-8">{children}</div>
      </main>
    </div>
  );
}

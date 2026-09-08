import { useState } from "react";
import { Menu } from "lucide-react";

import { MiniSidebar } from "./MiniSidebar";
import MobileSidebar from "./MobileSidebar";

export default function DashboardLayout({ title = "Wagenius", children }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-transparent text-slate-950">
      <MiniSidebar />

      <MobileSidebar
        open={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />

      <main className="min-h-screen lg:ml-[80px]">
        <div className="sticky top-0 z-30 lg:hidden">
          <div className="h-0.5 bg-emerald-500" />
          <div className="border-b border-slate-200/70 bg-white/95 px-4 py-3 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(true)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
                aria-label="Open navigation"
              >
                <Menu size={20} />
              </button>

              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-600">
                  Wagenius
                </p>
                <span className="block truncate text-sm font-bold text-slate-950">
                  {title}
                </span>
              </div>

              {/* <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50"
                aria-label="Search"
              >
                <Search size={18} />
              </button> */}
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-[1880px] px-4 py-4 sm:px-5 md:px-6 lg:px-8 lg:py-7 2xl:px-10">
          {children}
        </div>
      </main>
    </div>
  );
}

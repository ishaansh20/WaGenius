import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Download, Plus, RefreshCw } from "lucide-react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import api from "../../services/api";
import { Button } from "../../components/ui";
import { cn } from "../../utils/cn";

const TABS = [
  { label: "All", path: "/templates/approved" },
  { label: "Marketing", path: "/templates/approved/marketing" },
  { label: "Utility", path: "/templates/approved/utility" },
  { label: "Authentication", path: "/templates/approved/authentication" },
  { label: "Needs attention", path: "/templates/approved/approvals" },
];

export default function ApprovedTemplatesLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [importing, setImporting] = useState(false);

  async function handleImportFromMeta() {
    setImporting(true);
    try {
      const res = await api.post("/api/templates/import-meta");
      const count = res.data.imported?.length || 0;
      window.alert(
        count > 0
          ? `Imported ${count} template(s) from Meta. The page will now reload.`
          : "All Meta templates are already present — nothing new to import.",
      );
      if (count > 0) {
        // Force a full refetch so the list reflects the new records.
        window.location.reload();
      }
    } catch (error) {
      console.error(error);
      window.alert("Failed to import templates from Meta. Check your WhatsApp connection and try again.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <DashboardLayout title="Approved Templates">
      <div className="w-full">
        <div className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-ink sm:text-[30px]">
              Approved templates
            </h1>
            <p className="mt-1.5 text-[15px] text-ink-muted">
              Templates reviewed by WhatsApp, organised by category and review status.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Import templates that were created/approved directly in Meta Business Manager */}
            <Button
              variant="secondary"
              id="import-from-meta-btn"
              onClick={handleImportFromMeta}
              disabled={importing}
              title="Fetch templates approved in Meta Business Manager that aren't in Wagenius yet"
              leftIcon={importing ? undefined : Download}
            >
              {importing && <RefreshCw size={16} className="animate-spin" />}
              {importing ? "Importing…" : "Import from Meta"}
            </Button>
            <Button leftIcon={Plus} onClick={() => navigate("/templates/approved/create")}>
              Create approved template
            </Button>
          </div>
        </div>

        <div className="mb-5">
          <div
            role="tablist"
            aria-label="Template category"
            className="inline-flex max-w-full overflow-x-auto rounded-lg border border-line bg-surface p-1 scrollbar-hide"
          >
            {TABS.map((tab) => {
              const active = location.pathname === tab.path;
              return (
                <button
                  key={tab.path}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => navigate(tab.path)}
                  className={cn(
                    "h-8 whitespace-nowrap rounded-md px-3 text-[14px] font-medium transition-colors",
                    active ? "bg-brand-900 text-white" : "text-ink-muted hover:bg-canvas hover:text-ink",
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <Outlet />
      </div>
    </DashboardLayout>
  );
}

import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import DashboardLayout from "../../components/layout/DashboardLayout";

const TABS = [
  { label: "All", path: "/templates/approved" },
  { label: "Marketing", path: "/templates/approved/marketing" },
  { label: "Utility", path: "/templates/approved/utility" },
  { label: "Authentication", path: "/templates/approved/authentication" },
  { label: "Needs Attention", path: "/templates/approved/approvals" },
];

export default function ApprovedTemplatesLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <DashboardLayout title="Approved Templates">
      <div className="w-full">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Templates
            </p>
            <h1 className="text-[17px] font-semibold leading-tight text-slate-900">
              Approved Templates
            </h1>
            <p className="mt-0.5 text-[13px] text-slate-500">
              Meta-reviewed templates, organized by category and review status
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/templates/approved/create")}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-emerald-700"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Create Approved Template</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>

        <div className="mb-5 flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 bg-white p-1.5">
          {TABS.map((tab) => {
            const active = location.pathname === tab.path;
            return (
              <button
                key={tab.path}
                type="button"
                onClick={() => navigate(tab.path)}
                className={`rounded-md px-3 py-1.5 text-[12.5px] font-medium transition ${
                  active
                    ? "bg-slate-900 text-white"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <Outlet />
      </div>
    </DashboardLayout>
  );
}

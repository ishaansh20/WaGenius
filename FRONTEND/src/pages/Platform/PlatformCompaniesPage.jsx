import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { Building2, CheckCircle, LogOut, Pause, Play, X } from "lucide-react";
import {
  fetchCompanies,
  fetchCompanyDetail,
  updateCompanyStatus,
} from "../../services/platformApi";
import usePlatformAuthStore from "../../store/platformAuthStore";

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });
}

// Detail panel — a lightweight modal rather than a separate route, per the
// plan's v1 scope: list + suspend/reactivate + a basic usage snapshot. No
// impersonation, no billing — deliberate follow-ups, not built here.
function CompanyDetailModal({ companyId, onClose, onChanged }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  async function load() {
    try {
      setLoading(true);
      const res = await fetchCompanyDetail(companyId);
      setDetail(res);
    } catch {
      toast.error("Failed to load company detail");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleStatus() {
    const nextStatus = detail.company.status === "active" ? "suspended" : "active";
    if (
      nextStatus === "suspended" &&
      !window.confirm(`Suspend ${detail.company.name}? Their team will lose access immediately.`)
    ) {
      return;
    }

    try {
      setUpdating(true);
      await updateCompanyStatus(companyId, nextStatus);
      toast.success(nextStatus === "suspended" ? "Company suspended" : "Company reactivated");
      await load();
      onChanged();
    } catch {
      toast.error("Failed to update company status");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-[15px] font-semibold text-slate-900">
            {detail?.company?.name || "Company"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-5">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-500" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <span
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                    detail.company.status === "active"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-red-200 bg-red-50 text-red-700"
                  }`}
                >
                  {detail.company.status === "active" ? "Active" : "Suspended"}
                </span>
                <span
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                    detail.company.whatsapp?.connected
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-slate-50 text-slate-500"
                  }`}
                >
                  {detail.company.whatsapp?.connected ? "WhatsApp Connected" : "Not Connected"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Contacts</p>
                  <p className="mt-1 text-lg font-semibold text-slate-800">{detail.usage.contactCount}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Campaigns</p>
                  <p className="mt-1 text-lg font-semibold text-slate-800">{detail.usage.campaignCount}</p>
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                  Admins
                </p>
                {detail.admins.length === 0 ? (
                  <p className="text-[12.5px] text-slate-400">No admin users yet</p>
                ) : (
                  <div className="space-y-1.5">
                    {detail.admins.map((admin) => (
                      <div key={admin._id} className="flex items-center justify-between text-[12.5px]">
                        <span className="text-slate-700">{admin.name}</span>
                        <span className="text-slate-400">{admin.email}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleToggleStatus}
                disabled={updating}
                className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  detail.company.status === "active"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {detail.company.status === "active" ? (
                  <Pause className="h-3.5 w-3.5" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
                {updating
                  ? "Updating…"
                  : detail.company.status === "active"
                    ? "Suspend Company"
                    : "Reactivate Company"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PlatformCompaniesPage() {
  const navigate = useNavigate();
  const logout = usePlatformAuthStore((state) => state.logout);
  const platformUser = usePlatformAuthStore((state) => state.platformUser);

  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      const res = await fetchCompanies();
      setCompanies(res.companies || []);
    } catch {
      toast.error("Failed to load companies");
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    logout();
    navigate("/platform/login");
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600">
              <Building2 className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                Platform Console
              </p>
              <h1 className="text-[15px] font-semibold text-white">Companies</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[12.5px] text-slate-400">{platformUser?.name}</span>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-[12.5px] font-medium text-slate-300 transition hover:bg-slate-800"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-6">
        {loading ? (
          <div className="flex justify-center py-24">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-700 border-t-emerald-500" />
          </div>
        ) : companies.length === 0 ? (
          <p className="py-16 text-center text-[13px] text-slate-500">No companies yet.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="px-5 py-3 text-left text-[12px] font-semibold uppercase tracking-wide text-slate-500">
                    Company
                  </th>
                  <th className="px-5 py-3 text-left text-[12px] font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </th>
                  <th className="px-5 py-3 text-left text-[12px] font-semibold uppercase tracking-wide text-slate-500">
                    WhatsApp
                  </th>
                  <th className="px-5 py-3 text-left text-[12px] font-semibold uppercase tracking-wide text-slate-500">
                    Created
                  </th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {companies.map((company) => (
                  <tr key={company._id} className="transition-colors hover:bg-slate-800/50">
                    <td className="px-5 py-3.5 text-[13.5px] font-medium text-white">{company.name}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                          company.status === "active"
                            ? "border-emerald-800 bg-emerald-950 text-emerald-400"
                            : "border-red-800 bg-red-950 text-red-400"
                        }`}
                      >
                        {company.status === "active" ? "Active" : "Suspended"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {company.whatsapp?.connected ? (
                        <span className="inline-flex items-center gap-1 text-[12.5px] text-emerald-400">
                          <CheckCircle className="h-3.5 w-3.5" />
                          Connected
                        </span>
                      ) : (
                        <span className="text-[12.5px] text-slate-500">Not connected</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-[12.5px] text-slate-400">{formatDate(company.createdAt)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedCompanyId(company._id)}
                        className="text-[12.5px] font-medium text-emerald-400 hover:underline"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {selectedCompanyId && (
        <CompanyDetailModal
          companyId={selectedCompanyId}
          onClose={() => setSelectedCompanyId(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}

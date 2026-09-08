import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  Users,
  FileText,
  Megaphone,
  Contact,
  MessageSquare,
  ArrowUpRight,
  CreditCard,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { fetchPlatformDashboard } from "../../services/platformApi";
import PlatformLayout from "../../components/layout/PlatformLayout";

export default function PlatformDashboardPage() {
  const navigate = useNavigate();

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadDashboard() {
    try {
      setLoading(true);

      const response = await fetchPlatformDashboard();

      setDashboard(response.data);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to load platform dashboard",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const stats = dashboard || {};

  return (
    <PlatformLayout
      title="Platform Overview"
      description="Central infrastructure overview of all registered tenant companies, active workloads & subscriptions."
    >
      {loading ? (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#C5D1DE] border-t-[#2E5C8A]" />
        </div>
      ) : (
        <>
          {/* STAT CARDS */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <StatCard
              icon={Building2}
              label="Companies"
              value={stats.companies?.total ?? 0}
            />
            <StatCard
              icon={Users}
              label="Users"
              value={stats.users?.total ?? 0}
            />
            <StatCard
              icon={FileText}
              label="Templates"
              value={stats.templates?.total ?? 0}
            />
            <StatCard
              icon={Megaphone}
              label="Broadcasts"
              value={stats.campaigns?.total ?? 0}
            />
            <StatCard
              icon={Contact}
              label="Contacts"
              value={stats.contacts?.total ?? 0}
            />
            <StatCard
              icon={MessageSquare}
              label="WhatsApp WABA"
              value={stats.whatsapp?.connected ?? 0}
            />
          </div>

          {/* SUBSCRIPTIONS BREAKDOWN */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex items-center justify-between rounded-2xl border border-[#C5D1DE] bg-[#F5F8FB] p-5 shadow-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-800">Active Trials</p>
                <p className="mt-1.5 text-2xl font-bold tracking-tight text-[#1A3652]">{stats.subscriptions?.trial ?? 0}</p>
                <p className="text-[11px] text-[#6B8BA5] mt-0.5">Companies in 14-day evaluation</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#C5D1DE] bg-[#EFF3F8] text-[#2A4A68]">
                <CreditCard className="h-5 w-5" />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-[#C5D1DE] bg-[#F5F8FB] p-5 shadow-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#2A4A68]">Active Subscriptions</p>
                <p className="mt-1.5 text-2xl font-bold tracking-tight text-[#1A3652]">{stats.subscriptions?.active ?? 0}</p>
                <p className="text-[11px] text-[#6B8BA5] mt-0.5">Active tier companies</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#C5D1DE] bg-[#EFF3F8] text-[#2A4A68]">
                <CreditCard className="h-5 w-5" />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-[#C5D1DE] bg-[#F5F8FB] p-5 shadow-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#6B8BA5]">Pending Setup</p>
                <p className="mt-1.5 text-2xl font-bold tracking-tight text-[#1A3652]">{stats.subscriptions?.pending ?? 0}</p>
                <p className="text-[11px] text-[#6B8BA5] mt-0.5">Awaiting plan selection</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#C5D1DE] bg-[#EFF3F8] text-[#6B8BA5]">
                <CreditCard className="h-5 w-5" />
              </div>
            </div>
          </div>

          {/* QUICK LINKS SECTION */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-[#C5D1DE] bg-[#F5F8FB] p-6 shadow-sm">
              <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <h3 className="text-base font-bold text-[#1A3652]">
                    Tenant Companies
                  </h3>
                  <p className="mt-1 text-xs text-[#6B8BA5]">
                    View registered businesses, switch status, or inspect WhatsApp accounts.
                  </p>
                </div>

                <button
                  onClick={() => navigate("/platform/companies")}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#2E5C8A] px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#1E4A73]"
                >
                  <span>View Companies</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-[#C5D1DE] bg-[#F5F8FB] p-6 shadow-sm">
              <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <h3 className="text-base font-bold text-[#1A3652]">
                    Subscriptions & Plans
                  </h3>
                  <p className="mt-1 text-xs text-[#6B8BA5]">
                    Manage tier allocations, trial extensions and custom quotas.
                  </p>
                </div>

                <button
                  onClick={() => navigate("/platform/subscriptions")}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#C5D1DE] bg-[#EFF3F8] px-4 py-2.5 text-xs font-semibold text-[#2A4A68] shadow-sm transition hover:bg-[#D4DEE9]"
                >
                  <span>Manage Subscriptions</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </PlatformLayout>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-[#C5D1DE] bg-[#F5F8FB] p-4 shadow-sm transition hover:border-[#B5C5D5]">
      <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg border border-[#C5D1DE] bg-[#EFF3F8] text-[#2A4A68]">
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6B8BA5]">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-[#1A3652]">
        {Number(value).toLocaleString()}
      </p>
    </div>
  );
}

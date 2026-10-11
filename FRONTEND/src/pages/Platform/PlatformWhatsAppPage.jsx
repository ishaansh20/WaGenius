import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  Radio,
  Search,
  Building2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Sparkles,
} from "lucide-react";

import {
  fetchAllPlatformWhatsAppAccounts,
} from "../../services/platformApi";
import PlatformLayout from "../../components/layout/PlatformLayout";
import { Badge, Button, Card, StatCard, Tabs } from "../../components/ui";

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "connected", label: "Connected" },
  { value: "disconnected", label: "Not connected" },
];

const TOKEN_TABS = [
  { value: "", label: "Any setup" },
  { value: "embedded_signup", label: "Embedded signup" },
  { value: "manual", label: "Manual token" },
];

export default function PlatformWhatsAppPage() {
  const navigate = useNavigate();

  const [accounts, setAccounts] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    connected: 0,
    disconnected: 0,
    embeddedSignup: 0,
    manual: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [tokenType, setTokenType] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  async function loadAccounts() {
    try {
      setLoading(true);
      const res = await fetchAllPlatformWhatsAppAccounts({
        page,
        limit: 20,
        search: search.trim() || undefined,
        status: status || undefined,
        tokenType: tokenType || undefined,
      });

      setAccounts(res.data || []);
      setTotalPages(res.totalPages || 1);
      if (res.summary) {
        setSummary(res.summary);
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load WhatsApp accounts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAccounts();
  }, [search, status, tokenType, page]);

  return (
    <PlatformLayout
      title="WhatsApp accounts"
      description="Connection status, phone number IDs and WABA IDs for every company."
      actions={
        <Button variant="secondary" onClick={loadAccounts}>
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </Button>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total companies" value={summary.total} icon={Radio} />
          <StatCard label="Connected" value={summary.connected} icon={CheckCircle2} />
          <StatCard
            label="Not connected"
            value={<span className={summary.disconnected > 0 ? "text-danger" : ""}>{summary.disconnected}</span>}
            icon={XCircle}
          />
          <StatCard label="Embedded signups" value={summary.embeddedSignup} icon={Sparkles} />
        </div>

        {/* Toolbar */}
        <Card className="p-4 sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
              <input
                type="text"
                placeholder="Search company, phone number ID or WABA ID"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="h-10 w-full rounded-lg border border-line-strong bg-surface pl-10 pr-3 text-[14px] text-ink outline-none transition placeholder:text-ink-subtle focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
              />
            </div>
            <Tabs
              items={STATUS_TABS}
              value={status}
              onChange={(v) => {
                setStatus(v);
                setPage(1);
              }}
            />
            <Tabs
              items={TOKEN_TABS}
              value={tokenType}
              onChange={(v) => {
                setTokenType(v);
                setPage(1);
              }}
            />
          </div>
        </Card>

        {/* Table */}
        <Card padded={false} className="overflow-hidden">
          {loading ? (
            <div className="flex h-60 items-center justify-center">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-line border-t-brand-600" />
            </div>
          ) : accounts.length === 0 ? (
            <div className="m-5 rounded-xl bg-canvas px-6 py-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface text-brand-700 shadow-[var(--shadow-card)]">
                <Radio className="h-5 w-5" />
              </div>
              <p className="mt-3 text-[15px] font-semibold text-ink">No accounts found</p>
              <p className="mt-1 text-[14px] text-ink-muted">No WhatsApp accounts match your search or filters.</p>
            </div>
          ) : (
            <div className="relative overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left text-[14px]">
                <thead className="bg-[#f6f7f6] text-[13px] text-ink-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">Company</th>
                    <th className="px-4 py-3 font-medium">Connection</th>
                    <th className="px-4 py-3 font-medium">Phone number ID</th>
                    <th className="px-4 py-3 font-medium">WABA ID</th>
                    <th className="px-4 py-3 font-medium">Setup type</th>
                    <th className="px-4 py-3 font-medium">Traffic</th>
                    <th className="px-4 py-3 font-medium">Onboarding</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-ink">
                  {accounts.map((comp) => {
                    const wa = comp.whatsapp || {};
                    const isConnected = wa.connected === true;
                    return (
                      <tr
                        key={comp._id}
                        className={`transition-colors hover:bg-canvas ${isConnected ? "" : "bg-danger-soft/30"}`}
                      >
                        <td className="px-4 py-3.5">
                          <button
                            onClick={() => navigate(`/platform/companies/${comp._id}`)}
                            className="inline-flex items-center gap-1.5 font-medium text-ink transition hover:text-brand-700 hover:underline"
                          >
                            <Building2 className="h-3.5 w-3.5 text-ink-muted" />
                            {comp.name}
                          </button>
                          <p className="font-mono text-[12px] text-ink-muted">{comp.slug}</p>
                        </td>

                        <td className="px-4 py-3.5">
                          <Badge tone={isConnected ? "brand" : "danger"} dot>
                            {isConnected ? "Connected" : "Not connected"}
                          </Badge>
                        </td>

                        <td className="px-4 py-3.5 font-mono text-[13px] text-ink">
                          {wa.phoneNumberId || <span className="text-ink-muted">—</span>}
                        </td>

                        <td className="px-4 py-3.5 font-mono text-[13px] text-ink">
                          {wa.wabaId || <span className="text-ink-muted">—</span>}
                        </td>

                        <td className="px-4 py-3.5">
                          <Badge tone="neutral">
                            {(wa.tokenType || "manual") === "embedded_signup"
                              ? "Embedded signup"
                              : (wa.tokenType || "manual") === "manual"
                                ? "Manual token"
                                : wa.tokenType}
                          </Badge>
                        </td>

                        <td className="px-4 py-3.5">
                          <p className="font-medium tabular-nums">{comp.statistics?.messages ?? 0} messages</p>
                          <p className="text-[13px] text-ink-muted tabular-nums">
                            {comp.statistics?.conversations ?? 0} conversations
                          </p>
                        </td>

                        <td className="px-4 py-3.5">
                          {wa.onboardingCompletedAt ? (
                            <span className="inline-flex items-center gap-1.5 font-medium text-brand-700">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Completed
                            </span>
                          ) : isConnected ? (
                            <Badge tone="warning">Active, not finished</Badge>
                          ) : (
                            <span className="text-ink-muted">Pending</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-line px-4 py-3 text-[13px] text-ink-muted">
              <p>Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </PlatformLayout>
  );
}

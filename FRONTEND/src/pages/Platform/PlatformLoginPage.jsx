import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  Eye,
  EyeOff,
  ShieldCheck,
  Building2,
  Users,
  BarChart3,
  MessageSquare,
  ArrowRight,
  LockKeyhole,
} from "lucide-react";
import { platformLogin } from "../../services/platformApi";
import usePlatformAuthStore from "../../store/platformAuthStore";

export default function PlatformLoginPage() {
  const navigate = useNavigate();
  const login = usePlatformAuthStore((state) => state.login);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!email.trim() || !password) {
      toast.error("Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);

      const data = await platformLogin({ email: email.trim(), password });

      if (!data?.token || !data?.user) {
        throw new Error("Invalid platform login response.");
      }

      login({ token: data.token, user: data.user });

      toast.success("Welcome to Platform Console");
      navigate("/platform/dashboard", { replace: true });
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Platform login failed",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#EFF3F8] text-[#1A3652] font-sans antialiased">
      <div className="flex min-h-screen">
        {/* Left: identity panel */}
        <section className="hidden w-[50%] flex-col justify-between border-r border-[#C5D1DE] bg-[#E1E8F0]/80 p-10 lg:flex xl:p-14">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2E5C8A] text-[#D9E4EE] shadow-sm border border-[#1E4A73]">
                <ShieldCheck className="h-5 w-5 text-[#C5D8E8]" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#6B8BA5]">
                  Wagenius
                </p>
                <h1 className="text-base font-bold tracking-tight text-[#1A3652]">
                  Platform Console
                </h1>
              </div>
            </div>

            <div className="mt-16 max-w-lg">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#C5D1DE] bg-[#D9E4EE] px-3 py-1 text-xs font-semibold text-[#3D5F7E]">
                <span className="h-1.5 w-1.5 rounded-full bg-stone-900" />
                Root Infrastructure Console
              </div>

              <h2 className="text-3xl font-bold leading-tight tracking-tight text-[#1A3652] xl:text-4xl">
                Command center for all tenants, users & infrastructure.
              </h2>

              <p className="mt-4 text-sm leading-relaxed text-[#4A6580]">
                Manage registered companies, platform plans, subscriptions, WhatsApp API routing and operational audit logs from one centralized interface.
              </p>
            </div>

            <div className="mt-12 grid max-w-lg grid-cols-2 gap-3.5">
              <Feature
                icon={Building2}
                title="Company Management"
                text="View, inspect and manage tenant accounts."
              />
              <Feature
                icon={Users}
                title="User & Access Control"
                text="Platform permissions and active sessions."
              />
              <Feature
                icon={BarChart3}
                title="Platform Telemetry"
                text="Real-time delivery rates & MRR growth."
              />
              <Feature
                icon={MessageSquare}
                title="WhatsApp Infrastructure"
                text="WABA connections and template rates."
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-[#6B8BA5] border-t border-[#C5D1DE]/70 pt-4">
            <span>Wagenius Platform Core</span>
            <span>Internal Access Only</span>
          </div>
        </section>

        {/* Right: login form */}
        <section className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-[420px]">
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#2E5C8A] text-white">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#6B8BA5]">
                  Wagenius
                </p>
                <p className="font-bold text-[#1A3652] text-sm">Platform Console</p>
              </div>
            </div>

            <div className="rounded-2xl border border-[#C5D1DE] bg-[#F5F8FB] p-7 shadow-sm sm:p-9">
              <div className="mb-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-[#C5D1DE] bg-[#EFF3F8]">
                  <LockKeyhole className="h-5 w-5 text-[#2A4A68]" />
                </div>
                <h2 className="text-xl font-bold tracking-tight text-[#1A3652]">
                  Administrator Sign In
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-[#6B8BA5]">
                  Enter your credentials to access the platform management console.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#3D5F7E]">
                    Administrator Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="username"
                    required
                    className="h-10 w-full rounded-xl border border-[#C5D1DE] bg-[#EFF3F8] px-3 text-xs text-[#1A3652] outline-none transition placeholder:text-[#8DA3B8] focus:border-[#2E5C8A] focus:bg-[#F5F8FB] focus:ring-1 focus:ring-[#C5D1DE]"
                    placeholder="superadmin@company.com"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#3D5F7E]">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                      className="h-10 w-full rounded-xl border border-[#C5D1DE] bg-[#EFF3F8] px-3 pr-10 text-xs text-[#1A3652] outline-none transition placeholder:text-[#8DA3B8] focus:border-[#2E5C8A] focus:bg-[#F5F8FB] focus:ring-1 focus:ring-[#C5D1DE]"
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[#8DA3B8] transition hover:bg-[#D4DEE9] hover:text-[#3D5F7E]"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="group flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#2E5C8A] text-xs font-semibold text-white shadow-sm transition hover:bg-[#1E4A73] disabled:cursor-not-allowed disabled:opacity-60 mt-2"
                >
                  {loading ? (
                    <>
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      Authenticating...
                    </>
                  ) : (
                    <>
                      <span>Access Console</span>
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-[#C5D1DE] bg-[#EFF3F8] p-3 text-[#4A6580]">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#3D5F7E]" />
                <p className="text-[11px] leading-snug">
                  Strictly separated authentication for super administrators only.
                </p>
              </div>
            </div>

            <p className="mt-5 text-center text-xs text-[#6B8BA5]">
              © {new Date().getFullYear()} Wagenius Platform Administration
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

function Feature({ icon: Icon, title, text }) {
  return (
    <div className="rounded-xl border border-[#C5D1DE] bg-[#F5F8FB] p-3.5 shadow-sm">
      <div className="mb-2.5 flex h-8 w-8 items-center justify-center rounded-lg bg-[#EFF3F8] border border-[#C5D1DE]">
        <Icon className="h-4 w-4 text-[#2A4A68]" />
      </div>
      <p className="text-xs font-bold text-[#1A3652]">{title}</p>
      <p className="mt-0.5 text-[11px] leading-relaxed text-[#6B8BA5]">{text}</p>
    </div>
  );
}


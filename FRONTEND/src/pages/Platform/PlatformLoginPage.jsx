import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { CheckCircle2, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { platformLogin } from "../../services/platformApi";
import usePlatformAuthStore from "../../store/platformAuthStore";
import { Button, Field, Input, Logo } from "../../components/ui";

const PASSWORD_INPUT =
  "h-11 w-full rounded-xl border border-line-strong bg-surface pl-3.5 pr-11 text-[15px] text-ink placeholder:text-ink-subtle transition-colors hover:border-ink-subtle focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/12";

const BENEFITS = [
  "Manage every company account and its users",
  "Control plans, subscriptions and trials",
  "Watch campaigns, templates and WhatsApp connections",
  "Review revenue, message volume and audit logs",
];

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
    <div className="min-h-screen bg-surface lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <main className="flex min-h-screen flex-col px-4 py-6 sm:px-8 lg:px-12">
        <header className="flex items-center gap-3">
          <Logo />
          <span className="rounded-full border border-brand-100 bg-brand-50 px-2.5 py-0.5 text-[12px] font-medium text-brand-800">
            Admin console
          </span>
        </header>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[420px]">
            <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-ink sm:text-[30px]">
              Admin sign in
            </h1>
            <p className="mt-1.5 text-[15px] text-ink-muted">
              Sign in with your administrator email and password.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <Input
                id="platform-email"
                label="Email address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
                placeholder="admin@company.com"
                inputClassName="text-[15px]"
              />

              <Field label="Password" htmlFor="platform-password">
                <div className="relative">
                  <input
                    id="platform-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                    placeholder="Your password"
                    className={PASSWORD_INPUT}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-canvas hover:text-ink"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </Field>

              <Button type="submit" size="lg" loading={loading} disabled={loading} className="w-full">
                {loading ? "Signing in…" : "Sign in"}
              </Button>
            </form>

            <div className="mt-6 flex items-start gap-2.5 rounded-xl bg-canvas p-3.5 text-[14px] text-ink-muted">
              <ShieldCheck size={18} className="mt-0.5 shrink-0 text-brand-600" />
              <p>This sign-in is only for Wagenius administrators. Company users sign in on the main login page.</p>
            </div>
          </div>
        </div>

        <footer className="text-center text-[13px] text-ink-muted">
          © {new Date().getFullYear()} Wagenius platform administration
        </footer>
      </main>

      <aside className="hidden bg-brand-900 lg:order-first lg:flex lg:flex-col lg:justify-center lg:px-14 xl:px-20">
        <div className="max-w-[440px]">
          <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-[13px] font-medium text-white">
            Admin console
          </span>
          <h2 className="mt-5 text-[32px] font-semibold leading-[1.2] tracking-[-0.025em] text-white">
            Run the whole Wagenius platform from one place.
          </h2>
          <ul className="mt-8 space-y-4">
            {BENEFITS.map((text) => (
              <li key={text} className="flex items-start gap-3 text-[15px] leading-relaxed text-white/85">
                <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-brand-300" />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}

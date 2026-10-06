import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { CheckCircle2, Eye, EyeOff } from "lucide-react";

import useAuthStore from "../../store/authStore";
import { registerCompany } from "../../services/api";
import { Button, Field, Input, Logo } from "../../components/ui";

const BENEFITS = [
  "Free to start. Choose a plan when you are ready",
  "Connect your own WhatsApp Business number step by step",
  "Invite your team to answer customer chats together",
];

const PASSWORD_INPUT =
  "h-11 w-full rounded-xl border border-line-strong bg-surface pl-3.5 pr-11 text-[15px] text-ink placeholder:text-ink-subtle transition-colors hover:border-ink-subtle focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/12";

function BrandPanel() {
  return (
    <aside className="hidden bg-brand-900 lg:flex lg:flex-col lg:justify-center lg:px-14 xl:px-20">
      <div className="max-w-[440px]">
        <h2 className="text-[32px] font-semibold leading-[1.2] tracking-[-0.025em] text-white">
          Bring your own WhatsApp number and get started in minutes.
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
  );
}

export default function SignupPage() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const [formData, setFormData] = useState({
    companyName: "",
    name: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function handleChange(e) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setLoading(true);
      const data = await registerCompany(formData);
      login({
        token: data.token,
        user: data.user,
        setupStatus: data.setupStatus || "PLAN_SELECTION_REQUIRED",
      });
      toast.success(`Welcome, ${data.company.name}! Please select your plan.`);
      navigate("/pricing");
    } catch (error) {
      const errorCode = error.response?.data?.code;
      const errorMessage = error.response?.data?.message || "Signup failed";

      if (errorCode === "EMAIL_ALREADY_REGISTERED") {
        // Custom toast with a clickable "Sign in" action — this is the one
        // signup error that has a clear, immediate next step for the user.
        toast(
          (t) => (
            <span>
              {errorMessage}{" "}
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  navigate("/login");
                }}
                style={{
                  textDecoration: "underline",
                  fontWeight: 600,
                  marginLeft: 4,
                }}
              >
                Sign in
              </button>
            </span>
          ),
          { duration: 6000, icon: "⚠️" },
        );
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <main className="flex min-h-screen flex-col px-4 py-6 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between gap-4">
          <Link to="/" aria-label="Wagenius home">
            <Logo />
          </Link>
          <Link to="/" className="text-[14px] font-medium text-ink-muted hover:text-ink">
            Back to home
          </Link>
        </header>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[420px]">
            <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-ink sm:text-[30px]">
              Create your company account
            </h1>
            <p className="mt-1.5 text-[15px] text-ink-muted">
              Free to start. You can connect your own WhatsApp number afterwards.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <Input
                id="companyName"
                label="Company name"
                type="text"
                name="companyName"
                placeholder="Acme Retail"
                autoComplete="organization"
                value={formData.companyName}
                onChange={handleChange}
                required
                inputClassName="text-[15px]"
              />

              <Input
                id="name"
                label="Your name"
                type="text"
                name="name"
                placeholder="Jane Smith"
                autoComplete="name"
                value={formData.name}
                onChange={handleChange}
                required
                inputClassName="text-[15px]"
              />

              <Input
                id="email"
                label="Email address"
                type="email"
                name="email"
                placeholder="you@company.com"
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
                required
                inputClassName="text-[15px]"
              />

              <Field label="Password" htmlFor="password" help="Use at least 8 characters.">
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="Create a password"
                    autoComplete="new-password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    minLength={8}
                    className={PASSWORD_INPUT}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-canvas hover:text-ink"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </Field>

              <Button type="submit" size="lg" loading={loading} className="w-full">
                {loading ? "Creating account…" : "Create account"}
              </Button>
            </form>

            <p className="mt-6 text-center text-[14px] text-ink-muted">
              Already have an account?{" "}
              <Link to="/login" className="font-medium text-brand-700 hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[13px] text-ink-muted">
          <Link to="/privacy-policy" className="hover:text-ink hover:underline">
            Privacy policy
          </Link>
          <Link to="/data-deletion" className="hover:text-ink hover:underline">
            Data deletion
          </Link>
        </footer>
      </main>

      <BrandPanel />
    </div>
  );
}

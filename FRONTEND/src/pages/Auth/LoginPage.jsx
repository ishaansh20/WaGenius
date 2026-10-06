import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getCompanyHomePath } from "../../utils/sessionHome";
import axios from "axios";
import toast from "react-hot-toast";
import { CheckCircle2, Eye, EyeOff } from "lucide-react";

import useAuthStore from "../../store/authStore";
import { API_BASE_URL } from "../../services/api";
import { Button, Field, Input, Logo } from "../../components/ui";

const BENEFITS = [
  "Answer every customer chat from one shared inbox",
  "Send offers to your contact lists in a few clicks",
  "See who read your messages and who replied",
];

const PASSWORD_INPUT =
  "h-11 w-full rounded-xl border border-line-strong bg-surface pl-3.5 pr-11 text-[15px] text-ink placeholder:text-ink-subtle transition-colors hover:border-ink-subtle focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/12";

/* ── Defined OUTSIDE LoginPage so React never unmounts it on re-render ── */
function LoginForm({
  idSuffix,
  formData,
  loading,
  showPassword,
  onSubmit,
  onChange,
  onTogglePassword,
}) {
  return (
    <div>
      <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-ink sm:text-[30px]">
        Sign in to your account
      </h1>
      <p className="mt-1.5 text-[15px] text-ink-muted">
        Enter your email and password to continue.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        <Input
          id={`email${idSuffix}`}
          label="Email address"
          type="email"
          name="email"
          placeholder="you@company.com"
          autoComplete="email"
          value={formData.email}
          onChange={onChange}
          required
          inputClassName="text-[15px]"
        />

        <Field label="Password" htmlFor={`password${idSuffix}`}>
          <div className="relative">
            <input
              id={`password${idSuffix}`}
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Your password"
              autoComplete="current-password"
              value={formData.password}
              onChange={onChange}
              required
              className={PASSWORD_INPUT}
            />
            <button
              type="button"
              onClick={onTogglePassword}
              className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-canvas hover:text-ink"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </Field>

        <Button
          type="submit"
          size="lg"
          loading={loading}
          className="w-full"
        >
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-[14px] text-ink-muted">
        New to Wagenius?{" "}
        <Link to="/signup" className="font-medium text-brand-700 hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}

function BrandPanel() {
  return (
    <aside className="hidden bg-brand-900 lg:flex lg:flex-col lg:justify-center lg:px-14 xl:px-20">
      <div className="max-w-[440px]">
        <h2 className="text-[32px] font-semibold leading-[1.2] tracking-[-0.025em] text-white">
          Talk to every customer on WhatsApp, from one place.
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

function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const { data } = await axios.post(
        `${API_BASE_URL}/api/auth/login`,
        formData,
      );
      const status = data.setupStatus || data.company?.setupStatus;
      login({ token: data.token, user: data.user, setupStatus: status });

      toast.success("Login successful");

      navigate(getCompanyHomePath(data.user, status), { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const sharedFormProps = {
    formData,
    loading,
    showPassword,
    onSubmit: handleSubmit,
    onChange: handleChange,
    onTogglePassword: () => setShowPassword((prev) => !prev),
  };

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
            <LoginForm idSuffix="" {...sharedFormProps} />
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[13px] text-ink-muted">
          <Link to="/privacy-policy" className="hover:text-ink hover:underline">
            Privacy policy
          </Link>
          <Link to="/data-deletion" className="hover:text-ink hover:underline">
            Data deletion
          </Link>
          <span>© {new Date().getFullYear()} Wagenius. All rights reserved.</span>
        </footer>
      </main>

      <BrandPanel />
    </div>
  );
}

export default LoginPage;

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { platformLogin } from "../../services/platformApi";
import usePlatformAuthStore from "../../store/platformAuthStore";

const FIELD_CLASS =
  "h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-[13.5px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-100";

// Deliberately its own page, not a tab/branch on the regular /login screen —
// a platform (Super Admin) session must never share a login surface with
// any company account, per the strict-separation design.
export default function PlatformLoginPage() {
  const navigate = useNavigate();
  const login = usePlatformAuthStore((state) => state.login);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setLoading(true);
      const data = await platformLogin({ email, password });
      login({ token: data.token, user: data.user });
      navigate("/platform/companies");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
        <div className="mb-5 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600">
            <ShieldCheck className="h-4.5 w-4.5 text-white" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Wagenius</p>
            <h1 className="text-[15px] font-semibold text-white">Platform Console</h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-slate-300">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={FIELD_CLASS}
              placeholder="platform-admin@yourdomain.com"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-slate-300">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={`${FIELD_CLASS} pr-9`}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-emerald-600 py-2.5 text-[13px] font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p className="mt-5 text-center text-[11.5px] text-slate-500">
          This is the internal operator console, not a company login.
        </p>
      </div>
    </div>
  );
}

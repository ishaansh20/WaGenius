import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Eye, EyeOff, MessageSquare, Zap, Users, BarChart3 } from "lucide-react";

import useAuthStore from "../../store/authStore";
import { registerCompany } from "../../services/api";
import "./LoginPage.css";

const FEATURES = [
  {
    icon: MessageSquare,
    title: "Shared Inbox",
    desc: "Unified inbox for all WhatsApp conversations across your team.",
  },
  {
    icon: Zap,
    title: "Automation Workflows",
    desc: "Build powerful no-code flows to respond and route messages instantly.",
  },
  {
    icon: Users,
    title: "Campaign Management",
    desc: "Broadcast targeted campaigns to thousands of contacts at once.",
  },
  {
    icon: BarChart3,
    title: "Analytics & Insights",
    desc: "Real-time dashboards to track engagement and agent performance.",
  },
];

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
      toast.error(error.response?.data?.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-grid-desktop">
          <div className="product-showcase">
            <div className="brand-label">WhatsApp Automation Platform</div>
            <div className="brand-name">Wagenius</div>
            <h1 className="hero-title">
              Bring Your Own WhatsApp Number to{" "}
              <span className="hero-title-accent">Intelligent Automation</span>
            </h1>
            <p className="hero-description">
              Create your company account, connect your WhatsApp Business number, and start
              managing campaigns, shared inboxes, and customer engagement in minutes.
            </p>
            <div className="feature-grid">
              {FEATURES.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="feature-card">
                  <div className="feature-icon-wrap">
                    <Icon className="feature-icon" />
                  </div>
                  <div>
                    <div className="feature-title">{title}</div>
                    <div className="feature-desc">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="login-card-section">
            <div className="login-card">
              <div className="login-card-header">
                <div className="login-card-label">Wagenius</div>
                <h2 className="login-card-title">Create your company account</h2>
                <p className="login-card-subtitle">
                  Free to start — connect your own WhatsApp number afterward.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="login-card-body">
                <div className="form-group">
                  <label htmlFor="companyName" className="form-label">
                    Company Name
                  </label>
                  <input
                    id="companyName"
                    type="text"
                    name="companyName"
                    placeholder="Acme Retail"
                    value={formData.companyName}
                    onChange={handleChange}
                    required
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="name" className="form-label">
                    Your Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    name="name"
                    placeholder="Jane Smith"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email" className="form-label">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    placeholder="you@company.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="password" className="form-label">
                    Password
                  </label>
                  <div className="password-field">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      name="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      minLength={8}
                      className="form-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="password-toggle"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={loading} className="login-button">
                  {loading ? (
                    <>
                      <span className="login-button-spinner" />
                      Creating account…
                    </>
                  ) : (
                    "Create Account"
                  )}
                </button>
              </form>

              <div className="login-card-footer">
                <p className="login-card-footer-text">
                  Already have an account? <Link to="/login">Sign in</Link>
                </p>
                <p className="login-card-footer-text">
                  <Link to="/privacy-policy">Privacy Policy</Link> · <Link to="/data-deletion">Data Deletion</Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

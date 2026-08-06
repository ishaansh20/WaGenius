import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import {
  Eye,
  EyeOff,
  MessageSquare,
  Zap,
  Users,
  BarChart3,
} from "lucide-react";

import useAuthStore from "../../store/authStore";
import { API_BASE_URL } from "../../services/api";
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
    <div className="login-card">
      <div className="login-card-header">
        <div className="login-card-label">Wagenius</div>
        <h2 className="login-card-title">Sign in to your account</h2>
        <p className="login-card-subtitle">
          Enter your credentials to access the platform.
        </p>
      </div>

      <form onSubmit={onSubmit} className="login-card-body">
        <div className="form-group">
          <label htmlFor={`email${idSuffix}`} className="form-label">
            Email Address
          </label>
          <input
            id={`email${idSuffix}`}
            type="email"
            name="email"
            placeholder="you@company.com"
            value={formData.email}
            onChange={onChange}
            required
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor={`password${idSuffix}`} className="form-label">
            Password
          </label>
          <div className="password-field">
            <input
              id={`password${idSuffix}`}
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={onChange}
              required
              className="form-input"
            />
            <button
              type="button"
              onClick={onTogglePassword}
              className="password-toggle"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.015 }}
          whileTap={{ scale: 0.985 }}
          type="submit"
          disabled={loading}
          className="login-button"
        >
          {loading ? (
            <>
              <span className="login-button-spinner" />
              Signing in…
            </>
          ) : (
            "Sign In"
          )}
        </motion.button>
      </form>

      <div className="login-card-footer">
        <p className="login-card-footer-text">
          New company? <Link to="/signup">Create an account</Link>
        </p>
        <p className="login-card-footer-text">
          <Link to="/privacy-policy">Privacy Policy</Link> · <Link to="/data-deletion">Data Deletion</Link>
        </p>
        <p className="login-card-footer-text">
          © {new Date().getFullYear()} Wagenius. All rights reserved.
        </p>
      </div>
    </div>
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
      login({ token: data.token, user: data.user });
      toast.success("Login successful");
      navigate("/");
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
    <div className="login-page">
      <div className="login-container">
        {/* ── Desktop layout ── */}
        <div className="login-grid-desktop">
          {/* Left — brand + features */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.65, ease: "easeOut" }}
            className="product-showcase"
          >
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="brand-label"
            >
              WhatsApp Automation Platform
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.4 }}
              className="brand-name"
            >
              Wagenius
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="hero-title"
            >
              Scale Customer Conversations with{" "}
              <span className="hero-title-accent">Intelligent Automation</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.5 }}
              className="hero-description"
            >
              Manage campaigns, shared inboxes, automation workflows and
              customer engagement from one unified platform.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="feature-grid"
            >
              {FEATURES.map(({ icon: Icon, title, desc }, i) => (
                <motion.div
                  key={title}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 + i * 0.07, duration: 0.4 }}
                  className="feature-card"
                >
                  <div className="feature-icon-wrap">
                    <Icon className="feature-icon" />
                  </div>
                  <div>
                    <div className="feature-title">{title}</div>
                    <div className="feature-desc">{desc}</div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right — login card */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.65, ease: "easeOut" }}
            className="login-card-section"
          >
            <LoginForm idSuffix="-desktop" {...sharedFormProps} />
          </motion.div>
        </div>

        {/* ── Mobile layout ── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="login-mobile"
        >
          <div className="product-showcase">
            <div className="brand-label">WhatsApp Automation Platform</div>
            <div className="brand-name">Wagenius</div>
            <h1 className="hero-title">
              Scale Customer Conversations with{" "}
              <span className="hero-title-accent">Intelligent Automation</span>
            </h1>
            <p className="hero-description">
              Manage campaigns, shared inboxes, automation workflows and
              customer engagement from one unified platform.
            </p>
          </div>

          <div className="login-card-section">
            <LoginForm idSuffix="-mobile" {...sharedFormProps} />
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default LoginPage;

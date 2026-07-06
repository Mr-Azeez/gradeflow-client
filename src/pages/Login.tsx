import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import { motion } from "framer-motion";
import {
  LogIn,
  Mail,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  TrendingUp,
  CalendarDays,
  Calculator,
} from "lucide-react";
import AuthLayout from "../components/AuthLayout";

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/auth/login", formData);
      login(res.data.token, res.data.user);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      icon={LogIn}
      title="Welcome back"
      subtitle="Sign in to continue to your account."
      bottomPrompt="Don't have an account?"
      bottomActionLabel="Create one"
      bottomActionTo="/register"
      heroHeadline={
        <>
          Track your academic journey with{" "}
          <span className="auth-gradient-word">precision</span>
        </>
      }
      heroCopy="Monitor your GPA, manage courses across semesters, and plan your path to academic success - all in one place."
      features={[
        {
          icon: TrendingUp,
          title: "GPA Tracking",
          description: "Visualize your progress and stay on track.",
        },
        {
          icon: CalendarDays,
          title: "Semester Management",
          description: "Organize courses and credits with ease.",
        },
        {
          icon: Calculator,
          title: "What-If Calculator",
          description: "Plan your future and make smarter decisions.",
        },
      ]}
    >
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="auth-error"
        >
          {error}
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="auth-form space-y-4">
        <div className="space-y-2">
          <label htmlFor="login-email" className="auth-label">
            Email
          </label>
          <div className="auth-input-wrap">
            <Mail size={16} className="auth-input-icon" />
            <input
              id="login-email"
              type="email"
              className="auth-input pl-10"
              placeholder="you@university.edu"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="login-password" className="auth-label">
            Password
          </label>
          <div className="auth-input-wrap">
            <Lock size={16} className="auth-input-icon" />
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              className="auth-input pl-10 pr-12"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              required
            />
            <button
              type="button"
              className="auth-password-toggle"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="auth-options-row">
          <label className="auth-checkbox">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <span>Remember me</span>
          </label>

          <button type="button" className="auth-inline-link">
            Forgot password?
          </button>
        </div>

        <button
          id="login-submit"
          type="submit"
          disabled={loading}
          className="auth-primary-button"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="auth-spinner" />
              Signing in...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              Sign In
              <ArrowRight size={16} />
            </span>
          )}
        </button>
      </form>

    </AuthLayout>
  );
};

export default Login;

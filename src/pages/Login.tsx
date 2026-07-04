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

      <div className="auth-divider">
        <span>or continue with</span>
      </div>

      <button type="button" className="auth-social-button" aria-label="Continue with Google">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none">
          <path
            d="M21.6 12.23c0-.67-.06-1.31-.17-1.92H12v3.63h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.23c1.89-1.74 2.99-4.3 2.99-7.24Z"
            fill="#4285F4"
          />
          <path
            d="M12 22c2.7 0 4.96-.9 6.61-2.45l-3.23-2.51c-.89.6-2.03.96-3.38.96-2.6 0-4.8-1.75-5.6-4.11H2.05v2.58A9.99 9.99 0 0 0 12 22Z"
            fill="#34A853"
          />
          <path
            d="M6.4 13.89a5.98 5.98 0 0 1 0-3.78V7.54H2.05a10 10 0 0 0 0 8.93l4.35-2.58Z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.07c1.47 0 2.79.51 3.83 1.5l2.87-2.87A9.65 9.65 0 0 0 12 2a9.99 9.99 0 0 0-9.95 5.54L6.4 10.1C7.2 7.74 9.4 5.07 12 5.07Z"
            fill="#EA4335"
          />
        </svg>
        Google Sign In
      </button>
    </AuthLayout>
  );
};

export default Login;

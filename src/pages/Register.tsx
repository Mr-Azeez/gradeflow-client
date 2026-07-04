import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import { motion } from "framer-motion";
import {
  UserPlus,
  User,
  Mail,
  Lock,
  Hash,
  Building2,
  GraduationCap,
  ArrowRight,
  Eye,
  EyeOff,
  TrendingUp,
  CalendarDays,
  Calculator,
} from "lucide-react";
import AuthLayout from "../components/AuthLayout";

const Register = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    matric_number: "",
    level: "",
    department: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/auth/register", formData);
      login(res.data.token, res.data.user);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <AuthLayout
      icon={UserPlus}
      title="Create your account"
      subtitle="Start tracking your academic journey today."
      bottomPrompt="Already have an account?"
      bottomActionLabel="Sign In"
      bottomActionTo="/login"
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
          <label htmlFor="register-name" className="auth-label">
            Full Name
          </label>
          <div className="auth-input-wrap">
            <User size={16} className="auth-input-icon" />
            <input
              id="register-name"
              name="name"
              type="text"
              required
              className="auth-input pl-10"
              placeholder="John Doe"
              value={formData.name}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="register-email" className="auth-label">
            Email
          </label>
          <div className="auth-input-wrap">
            <Mail size={16} className="auth-input-icon" />
            <input
              id="register-email"
              name="email"
              type="email"
              required
              className="auth-input pl-10"
              placeholder="you@university.edu"
              value={formData.email}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="register-password" className="auth-label">
            Password
          </label>
          <div className="auth-input-wrap">
            <Lock size={16} className="auth-input-icon" />
            <input
              id="register-password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              className="auth-input pl-10 pr-12"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
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

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="register-matric" className="auth-label">
              Matric No.
            </label>
            <div className="auth-input-wrap">
              <Hash size={16} className="auth-input-icon" />
              <input
                id="register-matric"
                name="matric_number"
                type="text"
                className="auth-input pl-10"
                placeholder="CSC/2020/001"
                value={formData.matric_number}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="register-level" className="auth-label">
              Level
            </label>
            <div className="auth-input-wrap">
              <GraduationCap
                size={16}
                className="auth-input-icon pointer-events-none"
              />
              <select
                id="register-level"
                name="level"
                className="auth-input pl-10 pr-10 appearance-none cursor-pointer"
                value={formData.level}
                onChange={handleChange}
              >
                <option value="">Select</option>
                <option value="100">100</option>
                <option value="200">200</option>
                <option value="300">300</option>
                <option value="400">400</option>
                <option value="500">500</option>
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="register-department" className="auth-label">
            Department
          </label>
          <div className="auth-input-wrap">
            <Building2 size={16} className="auth-input-icon" />
            <input
              id="register-department"
              name="department"
              type="text"
              className="auth-input pl-10"
              placeholder="Computer Science"
              value={formData.department}
              onChange={handleChange}
            />
          </div>
        </div>

        <button
          id="register-submit"
          type="submit"
          disabled={loading}
          className="auth-primary-button"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="auth-spinner" />
              Creating account...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              Create Account
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

export default Register;

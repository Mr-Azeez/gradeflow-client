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
              placeholder={"\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"}
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

    </AuthLayout>
  );
};

export default Register;

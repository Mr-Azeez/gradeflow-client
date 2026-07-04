import { useCallback, useEffect, useState } from "react";
import api from "../api/axios";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Plus,
  Edit3,
  Trash2,
  BookOpen,
  Calendar,
  CheckCircle2,
  Circle,
  ChevronRight,
  ChevronDown,
  GraduationCap,
  ArrowRight,
} from "lucide-react";
import Modal from "../components/Modal";
import LoadingScreen from "../components/LoadingScreen";
import EmptyState from "../components/EmptyState";
import { Link } from "react-router-dom";

interface Semester {
  id: string;
  name: string;
  academic_year: string;
  level: number;
  semester_number: number;
  is_current: boolean;
  created_at: string;
}

const Semesters = () => {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Semester | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    academic_year: "",
    level: "",
    semester_number: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const currentSemester = semesters.find((semester) => semester.is_current) ?? null;

  const fetchSemesters = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get("/semesters");
      setSemesters(res.data);
    } catch (err) {
      console.error(err);
      setError("Couldn't load your semesters. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSemesters();
  }, [fetchSemesters]);

  const openCreate = () => {
    setEditing(null);
    setActionError(null);
    setFormData({
      name: "",
      academic_year: "",
      level: "",
      semester_number: "",
    });
    setModalOpen(true);
  };

  const openEdit = (sem: Semester) => {
    setEditing(sem);
    setActionError(null);
    setFormData({
      name: sem.name,
      academic_year: sem.academic_year,
      level: String(sem.level),
      semester_number: String(sem.semester_number),
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setSubmitting(true);
    try {
      if (editing) {
        await api.put(`/semesters/${editing.id}`, formData);
      } else {
        await api.post("/semesters", formData);
      }
      setModalOpen(false);
      void fetchSemesters();
    } catch (err) {
      console.error(err);
      setActionError("Could not save this semester. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this semester and all its courses?")) return;
    setActionError(null);
    try {
      await api.delete(`/semesters/${id}`);
      void fetchSemesters();
    } catch (err) {
      console.error(err);
      setActionError("Could not delete this semester. Please try again.");
    }
  };

  if (loading) return <LoadingScreen />;
  if (error) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <EmptyState
          icon={AlertTriangle}
          title="Couldn't load your semesters"
          description={error}
          action={
            <button type="button" onClick={() => void fetchSemesters()} className="btn btn-primary">
              Retry
            </button>
          }
        />
      </div>
    );
  }

  const sortedSemesters = [...semesters].sort((a, b) => {
    const dir = sortOrder === "asc" ? 1 : -1;
    if (a.level !== b.level) return dir * (a.level - b.level);
    return dir * (a.semester_number - b.semester_number);
  });

  return (
    <div>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: "easeOut" }}
        className="group relative mb-8 overflow-hidden rounded-3xl border border-white/10 bg-[#0a0d16] px-6 py-6 shadow-[0_24px_80px_rgba(2,6,23,0.55)] backdrop-blur-xl transition-all duration-300 hover:border-white/15 hover:shadow-[0_28px_90px_rgba(124,58,237,0.18)] sm:px-8 sm:py-7 lg:px-10 lg:py-8"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,92,255,0.18),transparent_30%),radial-gradient(circle_at_top_right,rgba(99,102,241,0.10),transparent_28%),linear-gradient(135deg,rgba(8,10,18,0.98)_0%,rgba(12,15,26,0.96)_54%,rgba(8,10,18,0.98)_100%)]" />
        <div className="absolute -left-16 top-6 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(124,92,255,0.20),transparent_70%)] blur-3xl" />
        <div className="absolute -right-20 top-0 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(168,85,247,0.12),transparent_68%)] blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <svg
          className="absolute inset-0 h-full w-full opacity-[0.09]"
          viewBox="0 0 1200 260"
          fill="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="semester-line" x1="140" y1="170" x2="1090" y2="130" gradientUnits="userSpaceOnUse">
              <stop stopColor="#8b5cf6" stopOpacity="0.9" />
              <stop offset="0.55" stopColor="#7c3aed" stopOpacity="0.55" />
              <stop offset="1" stopColor="#c4b5fd" stopOpacity="0.15" />
            </linearGradient>
          </defs>
          <path
            d="M110 186C206 186 222 122 320 122C417 122 427 186 520 186C612 186 634 146 726 146C819 146 843 100 944 100C1027 100 1059 136 1110 136"
            stroke="url(#semester-line)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx="110" cy="186" r="7" fill="#a78bfa" />
          <circle cx="320" cy="122" r="8" fill="#c4b5fd" />
          <circle cx="520" cy="186" r="7" fill="#8b5cf6" />
          <circle cx="726" cy="146" r="8" fill="#ddd6fe" />
          <circle cx="944" cy="100" r="7" fill="#a78bfa" />
          <circle cx="1110" cy="136" r="6" fill="#c4b5fd" />
          <circle cx="230" cy="170" r="2.5" fill="#ffffff" opacity="0.7" />
          <circle cx="420" cy="148" r="2" fill="#ffffff" opacity="0.55" />
          <circle cx="612" cy="160" r="2.5" fill="#ffffff" opacity="0.62" />
          <circle cx="830" cy="118" r="2" fill="#ffffff" opacity="0.45" />
        </svg>

        <div className="relative z-10 flex min-h-[220px] flex-col justify-between gap-8 lg:min-h-[240px] lg:flex-row lg:items-center lg:gap-10">
          <div className="flex max-w-3xl items-start gap-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl border border-white/10 bg-gradient-to-br from-[#a78bfa] via-[#7c3aed] to-[#4c1d95] text-white shadow-[0_20px_50px_rgba(124,58,237,0.35)]">
              <GraduationCap size={30} strokeWidth={1.9} />
            </div>

            <div className="space-y-3 pt-1">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] shadow-[0_0_12px_rgba(124,58,237,0.9)]" />
                Academic timeline
              </div>
              <div className="space-y-2">
                <h1 className="text-[2.05rem] font-semibold tracking-[-0.05em] text-white sm:text-[2.5rem] lg:text-[3.15rem]">
                  Your Academic Timeline
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-slate-300/80 sm:text-base">
                  Every semester you've completed, with its GPA contribution.
                </p>
              </div>
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:w-auto lg:flex-nowrap lg:justify-end">
            <div className="relative w-full sm:min-w-[220px] sm:flex-1 lg:w-[220px] lg:flex-none">
              <select
                id="semester-sort-order"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
                className="h-12 w-full appearance-none rounded-xl border border-white/10 bg-white/5 px-4 pr-11 text-sm font-medium text-slate-100 outline-none transition duration-150 placeholder:text-slate-500 hover:border-white/20 hover:bg-white/10 focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
              >
                <option value="asc">Oldest First</option>
                <option value="desc">Newest First</option>
              </select>
              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>

            <button
              id="add-semester-btn"
              onClick={openCreate}
              className="group btn btn-primary h-12 w-full rounded-xl px-5 text-sm font-semibold shadow-[0_16px_38px_rgba(108,99,255,0.28)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_48px_rgba(108,99,255,0.38)] sm:w-auto"
            >
              <span className="flex items-center gap-2">
                <Plus size={18} className="transition-transform duration-200 group-hover:rotate-90" />
                Add Semester
              </span>
              <ArrowRight
                size={16}
                className="hidden opacity-80 transition-transform duration-200 group-hover:translate-x-0.5 sm:block"
              />
            </button>
          </div>
        </div>
      </motion.div>

      {actionError && !modalOpen && (
        <p className="mb-4 text-sm text-[var(--danger)]" role="alert">
          {actionError}
        </p>
      )}

      {semesters.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={48} />}
          title="No semesters yet"
          description="Create your first semester to start tracking your courses and grades."
          action={
            <button onClick={openCreate} className="btn btn-primary">
              <Plus size={18} />
              Create Semester
            </button>
          }
        />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger"
        >
          {sortedSemesters.map((sem) => {
            const isCurrentSemester = currentSemester?.id === sem.id;

            return (
              <div
                key={sem.id}
                className={`glass-card-light p-5 stat-card animate-fade-in-up ${
                  isCurrentSemester
                    ? "border border-primary-500/30 glow-primary"
                    : ""
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {isCurrentSemester ? (
                      <CheckCircle2
                        size={16}
                        className="text-primary-400 shrink-0"
                      />
                    ) : (
                      <Circle size={16} className="text-surface-600 shrink-0" />
                    )}
                    {isCurrentSemester && (
                      <span className="badge bg-primary-500/15 text-primary-400 text-[10px]">
                        CURRENT
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(sem)}
                      className="p-1.5 rounded-lg hover:bg-surface-700/50 text-surface-500 hover:text-surface-300 transition-colors"
                      title="Edit"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(sem.id)}
                      className="p-1.5 rounded-lg hover:bg-danger-500/10 text-surface-500 hover:text-danger-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-surface-100 mb-1">
                  {sem.name}
                </h3>
                <div className="flex items-center gap-1.5 text-surface-500 text-xs mb-4">
                  <Calendar size={12} />
                  <span>{sem.academic_year}</span>
                </div>

                <Link
                  to={`/courses?semester=${sem.id}`}
                  className="flex items-center gap-1 text-primary-400 text-sm font-medium hover:text-primary-300 transition-colors"
                >
                  View Courses
                  <ChevronRight size={14} />
                </Link>
              </div>
            );
          })}
        </motion.div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setActionError(null);
          setModalOpen(false);
        }}
        title={editing ? "Edit Semester" : "New Semester"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-400 mb-1.5">
              Semester Name
            </label>
            <input
              id="semester-name"
              type="text"
              className="input-field"
              placeholder="e.g. First Semester"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-400 mb-1.5">
              Academic Year
            </label>
            <input
              id="semester-year"
              type="text"
              className="input-field"
              placeholder="e.g. 2024/2025"
              value={formData.academic_year}
              onChange={(e) =>
                setFormData({ ...formData, academic_year: e.target.value })
              }
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-surface-400 mb-1.5">
                Level
              </label>
              <select
                id="semester-level"
                className="input-field"
                value={formData.level}
                onChange={(e) =>
                  setFormData({ ...formData, level: e.target.value })
                }
                required
              >
                <option value="" disabled>
                  Select level
                </option>
                {[100, 200, 300, 400, 500, 600].map((value) => (
                  <option key={value} value={value}>
                    {value}L
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-400 mb-1.5">
                Semester
              </label>
              <select
                id="semester-number"
                className="input-field"
                value={formData.semester_number}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    semester_number: e.target.value,
                  })
                }
                required
              >
                <option value="" disabled>
                  Select semester
                </option>
                <option value={1}>First Semester</option>
                <option value={2}>Second Semester</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setActionError(null);
                setModalOpen(false);
              }}
              className="btn btn-ghost flex-1"
            >
              Cancel
            </button>
            <button
              id="semester-submit"
              type="submit"
              disabled={submitting}
              className="btn btn-primary flex-1"
            >
              {submitting ? "Saving…" : editing ? "Update" : "Create"}
            </button>
          </div>
          {actionError && (
            <p className="text-sm text-[var(--danger)]" role="alert">
              {actionError}
            </p>
          )}
        </form>
      </Modal>
    </div>
  );
};

export default Semesters;

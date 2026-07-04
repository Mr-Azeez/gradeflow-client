import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  GraduationCap,
  Target,
  AlertTriangle,
  X,
  Info
} from "lucide-react";
import LoadingScreen from "../components/LoadingScreen";
import EmptyState from "../components/EmptyState";
import StatCard from "../components/StatCard";
import { getGradeBadgeStyle } from "../utils/gradeColors";

interface FinalSemesterCourse {
  id: string;
  course_code: string;
  course_title: string;
  credit_units: number;
  requiredGradePoint: number | null;
}

interface GraduationTargetResult {
  targetCGPA: number;
  currentCGPA: number;
  totalCreditUnits: number;
  finalSemesterCreditUnits: number;
  rawRequired: number | null;
  requiredAverageGP: number | null;
  maxAchievableCGPA: number;
  minAchievableCGPA: number;
  status: "ACHIEVABLE" | "ALREADY_SECURED" | "ALREADY_SECURED_HIGHER" | "NOT_ACHIEVABLE";
  guaranteedClassification?: string;
  currentSemesterId?: string | null;
  finalSemesterCourses: FinalSemesterCourse[];
}

interface SemesterTargetState {
  currentSemesterId: string | null;
  currentTargetGpa: number | null;
  loading: boolean;
  saving: boolean;
  error: string;
  editMode: boolean;
  draftValue: string;
  savedValue: number | null;
}

const targetOptions = [
  { label: "First Class", value: 4.5 },
  { label: "Second Class Upper", value: 3.5 },
  { label: "Second Class Lower", value: 2.4 },
  { label: "Third Class", value: 1.5 },
];

const gradeScale = [
  { letter: "A", point: 5, range: "70+" },
  { letter: "B", point: 4, range: "6069" },
  { letter: "C", point: 3, range: "5059" },
  { letter: "D", point: 2, range: "4549" },
  { letter: "E", point: 1, range: "4044" },
];

const getGradeInfo = (gradePoint: number | null) => {
  if (gradePoint == null) return null;
  if (gradePoint <= 1) return gradeScale[4];
  if (gradePoint <= 2) return gradeScale[3];
  if (gradePoint <= 3) return gradeScale[2];
  if (gradePoint <= 4) return gradeScale[1];
  return gradeScale[0];
};

const getClassificationLabel = (cgpa: number): string => {
  if (cgpa >= 4.5) return "First Class";
  if (cgpa >= 3.5) return "Second Class Upper";
  if (cgpa >= 2.4) return "Second Class Lower";
  if (cgpa >= 1.5) return "Third Class";
  return "a passing classification";
};

const roundToTwoDecimals = (value: number) => Math.round(value * 100) / 100;

const GraduationTarget = () => {
  const navigate = useNavigate();
  const [targetCGPA, setTargetCGPA] = useState(targetOptions[0].value);
  const [result, setResult] = useState<GraduationTargetResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showCalculationInfo, setShowCalculationInfo] = useState(false);
  const loadedSemesterTargetRef = useRef(false);
  const [semesterTarget, setSemesterTarget] = useState<SemesterTargetState>({
    currentSemesterId: null,
    currentTargetGpa: null,
    loading: true,
    saving: false,
    error: "",
    editMode: true,
    draftValue: "",
    savedValue: null,
  });

  useEffect(() => {
    let active = true;

    const fetchTargetData = async () => {
      setLoading(true);
      setError("");
      if (!loadedSemesterTargetRef.current) {
        setSemesterTarget((current) => ({ ...current, loading: true, error: "" }));
      }

      try {
        const targetRequest = api.get("/analytics/graduation-target", {
          params: { targetCGPA },
        });
        const analyticsRequest = loadedSemesterTargetRef.current
          ? Promise.resolve(null)
          : api.get("/analytics");

        const [targetResult, analyticsResult] = await Promise.allSettled([
          targetRequest,
          analyticsRequest,
        ]);

        if (!active) return;

        if (targetResult.status === "fulfilled") {
          setResult(targetResult.value.data);
        } else {
          console.error(targetResult.reason);
          setResult(null);
          setError("Could not load graduation target data.");
        }

        if (!loadedSemesterTargetRef.current) {
          if (
            analyticsResult.status === "fulfilled" &&
            analyticsResult.value
          ) {
            const currentSemester =
              analyticsResult.value.data?.current_semester ?? null;
            const rawTargetGpa = currentSemester?.target_gpa;
            const targetGpa =
              rawTargetGpa != null ? Number(rawTargetGpa) : null;

            setSemesterTarget({
              currentSemesterId: currentSemester?.id ?? null,
              currentTargetGpa: targetGpa,
              loading: false,
              saving: false,
              error: "",
              editMode: targetGpa == null,
              draftValue: targetGpa != null ? targetGpa.toFixed(2) : "",
              savedValue: targetGpa,
            });
            loadedSemesterTargetRef.current = true;
          } else {
            console.error(
              analyticsResult.status === "rejected"
                ? analyticsResult.reason
                : new Error("Unexpected analytics response"),
            );
            setSemesterTarget((current) => ({
              ...current,
              loading: false,
              error: "Could not load your target settings.",
            }));
          }
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void fetchTargetData();

    return () => {
      active = false;
    };
  }, [targetCGPA]);

  const currentSemesterId = result?.currentSemesterId ?? semesterTarget.currentSemesterId ?? null;

  const handleSaveTarget = async () => {
    if (!currentSemesterId) {
      setSemesterTarget((current) => ({
        ...current,
        error: "No active semester. Start a semester to set a target.",
      }));
      return;
    }

    const parsed = Number(semesterTarget.draftValue);
    if (Number.isNaN(parsed) || parsed < 1 || parsed > 5) {
      setSemesterTarget((current) => ({
        ...current,
        error: "Could not save your target. Please try again.",
      }));
      return;
    }

    try {
      setSemesterTarget((current) => ({
        ...current,
        saving: true,
        error: "",
      }));
      const res = await api.patch(`/semesters/${currentSemesterId}`, {
        target_gpa: parsed,
      });
      const savedTarget = Number(res.data?.target_gpa ?? parsed);
      setSemesterTarget((current) => ({
        ...current,
        currentTargetGpa: savedTarget,
        savedValue: savedTarget,
        draftValue: savedTarget.toFixed(2),
        saving: false,
        editMode: false,
        error: "",
      }));
    } catch (err) {
      console.error(err);
      setSemesterTarget((current) => ({
        ...current,
        saving: false,
        error: "Could not save your target. Please try again.",
      }));
    }
  };

  if (loading) return <LoadingScreen />;

  return (
    <div className="w-full min-h-screen pb-32 md:pb-8 overflow-y-auto overflow-x-hidden">
      {/* Premium Goal Tracking Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 mb-8 flex flex-col shadow-2xl"
      >
        {/* Background Effects */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          {/* Soft purple lighting */}
          <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px] translate-y-1/3" />

          {/* Dark gradient base */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/95 via-[#0B1120]/95 to-slate-900/90" />

          {/* Decorative target rings */}
          <div className="absolute right-[-10%] top-[-20%] w-[600px] h-[600px] border-[1px] border-purple-500/10 rounded-full" />
          <div className="absolute right-[0%] top-[-10%] w-[400px] h-[400px] border-[1px] border-purple-500/15 rounded-full" />
          <div className="absolute right-[10%] top-[0%] w-[200px] h-[200px] border-[1px] border-purple-500/20 rounded-full" />

          {/* Small floating particles (subtle radial glow dots) */}
          <div className="absolute right-[20%] top-[30%] w-2 h-2 bg-purple-400/50 rounded-full blur-[1px]" />
          <div className="absolute right-[15%] top-[10%] w-1.5 h-1.5 bg-indigo-400/50 rounded-full blur-[1px]" />
        </div>

        {/* Top Section: Header & Target Graphic/Button */}
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between p-6 md:p-10 min-h-[260px]">
          {/* Left Side */}
          <div className="flex items-start gap-6 max-w-2xl">
            {/* Target Icon */}
            <div className="hidden sm:flex w-16 h-16 shrink-0 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 p-[1px] shadow-lg shadow-purple-500/20 mt-1">
              <div className="w-full h-full rounded-2xl bg-slate-900/80 backdrop-blur-md flex items-center justify-center">
                <Target className="text-purple-300" size={32} />
              </div>
            </div>
            <div className="flex flex-col">
              <div className="sm:hidden w-12 h-12 shrink-0 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 p-[1px] shadow-lg shadow-purple-500/20 mb-4">
                <div className="w-full h-full rounded-xl bg-slate-900/80 backdrop-blur-md flex items-center justify-center">
                  <Target className="text-purple-300" size={24} />
                </div>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-3">
                Final Semester Target
              </h1>
              <p className="text-slate-400 text-sm md:text-lg font-medium max-w-xl leading-relaxed">
                Plan your grades and see exactly what you need to achieve.
              </p>
            </div>
          </div>

          {/* Right Side */}
          <div className="mt-8 md:mt-0 flex flex-col items-start md:items-end w-full md:w-auto relative">
            {/* Large Decorative Target Illustration */}
            <div className="hidden md:flex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-20">
              <Target
                size={180}
                className="text-purple-400"
                strokeWidth={0.5}
              />
            </div>

            {/* Premium Set Target Button */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="relative z-20 group flex items-center justify-center w-full md:w-auto gap-2 px-6 py-3 rounded-xl border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 font-semibold transition-all duration-300 shadow-[0_0_20px_rgba(168,85,247,0.1)] hover:shadow-[0_0_30px_rgba(168,85,247,0.3)]"
            >
              <Target
                size={18}
                className="group-hover:scale-110 transition-transform duration-300"
              />
              {semesterTarget.savedValue != null ? "Edit Target" : "Set Target"}
            </button>
          </div>
        </div>

        {/* Bottom Summary Panel */}
        <div className="relative z-10 w-full bg-slate-900/40 md:bg-slate-950/50 backdrop-blur-xl border-t-0 md:border-t border-slate-800/80 p-4 md:p-0">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-0 md:divide-x divide-slate-800/80">
            {/* Column 1: Target CGPA */}
            <div className="col-span-1 md:col-span-3 p-5 md:p-6 flex flex-col justify-center items-start bg-slate-800/40 md:bg-transparent rounded-2xl md:rounded-none border border-slate-700/50 md:border-none">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Target CGPA
              </span>
              <div className="flex items-end gap-3 mb-2">
                <span className="text-4xl md:text-5xl font-bold font-mono text-white leading-none">
                  {targetCGPA.toFixed(2)}
                </span>
              </div>
              <span className="px-3 py-1 text-xs font-medium rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 mt-1">
                {getClassificationLabel(targetCGPA)}
              </span>
            </div>

            {/* Column 2: Degree Classification List */}
            <div className="col-span-1 md:col-span-6 p-5 md:p-6 bg-slate-800/40 md:bg-transparent rounded-2xl md:rounded-none border border-slate-700/50 md:border-none">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 block">
                Classifications
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {targetOptions.map((option) => {
                  const active = option.value === targetCGPA;
                  return (
                    <button
                      key={option.value}
                      onClick={() => setTargetCGPA(option.value)}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-colors text-left ${
                        active
                          ? "border-purple-500/50 bg-purple-500/10"
                          : "border-transparent hover:border-slate-700/50 bg-slate-800/30 md:bg-slate-800/30 hover:bg-slate-800/50 opacity-70 hover:opacity-100"
                      }`}
                    >
                      <span
                        className={`text-sm ${active ? "font-bold text-purple-300" : "font-medium text-slate-400"}`}
                      >
                        {option.label}
                      </span>
                      <span
                        className={`text-sm font-mono ${active ? "text-purple-300" : "text-slate-500"}`}
                      >
                        {option.value.toFixed(2)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Column 3: Current Goal Status */}
            <div className="col-span-1 md:col-span-3 p-5 md:p-6 flex flex-col justify-center items-start bg-slate-800/40 md:bg-transparent rounded-2xl md:rounded-none border border-slate-700/50 md:border-none">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 block">
                Current Goal Status
              </span>
              {semesterTarget.savedValue != null ? (
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-sm font-medium">
                    <CheckCircle2 size={16} />
                    Target Set: {semesterTarget.savedValue.toFixed(2)}
                  </div>
                  {semesterTarget.currentSemesterId && (
                    <button
                      onClick={() =>
                        navigate(
                          `/whatif?mode=b&target=${semesterTarget.savedValue}`,
                        )
                      }
                      className="text-xs text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1 group"
                    >
                      Plan grades{" "}
                      <Target
                        size={12}
                        className="group-hover:translate-x-1 transition-transform"
                      />
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-600 bg-slate-800/80 text-slate-300 text-sm font-medium">
                    <Info size={16} className="text-slate-400" />
                    Ready for Planning
                  </div>
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="text-xs text-slate-400 hover:text-white transition-colors"
                  >
                    Click 'Set Target' to begin
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {error ? (
        <EmptyState
          icon={<AlertTriangle size={48} />}
          title="Couldn't load your data."
          description="Make sure you have completed semesters and at least one active final semester with ungraded courses."
        />
      ) : !result ? (
        <EmptyState
          icon={<GraduationCap size={48} />}
          title="No courses found yet."
          description="Add your completed courses and mark your final semester courses as ungraded to use this tool."
        />
      ) : (
        <>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6"
          >
            <StatCard
              icon={<GraduationCap size={20} />}
              label="Current CGPA"
              value={result.currentCGPA.toFixed(2)}
              subtitle={`${result.totalCreditUnits} completed units`}
            />
            <StatCard
              icon={<CheckCircle2 size={20} />}
              label="Max achievable CGPA"
              value={result.maxAchievableCGPA.toFixed(2)}
              subtitle="All A grades"
            />
            <StatCard
              icon={<Target size={20} />}
              label="Required avg GP"
              value={
                result.status === "NOT_ACHIEVABLE" ||
                result.requiredAverageGP == null
                  ? ""
                  : result.requiredAverageGP.toFixed(2)
              }
              subtitle={
                result.status === "NOT_ACHIEVABLE"
                  ? "Not achievable"
                  : "Across final courses"
              }
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-6 mb-8 overflow-hidden"
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-[var(--text-primary)]">
                Final CGPA range
              </span>
              <span className="text-xs font-mono text-[var(--text-secondary)]">
                {result.minAchievableCGPA.toFixed(2)}&nbsp;–&nbsp;
                {result.maxAchievableCGPA.toFixed(2)}
              </span>
            </div>

            {/* Status-aware plain-English description */}
            <div className="mt-3 mb-0">
              {result.status === "ALREADY_SECURED" ||
              result.status === "ALREADY_SECURED_HIGHER" ? (
                <p
                  className="text-xs leading-relaxed"
                  style={{ color: "var(--success)" }}
                >
                  Your minimum possible CGPA (
                  {result.minAchievableCGPA.toFixed(2)}) already meets your
                  target — you'll graduate with at least a{" "}
                  {getClassificationLabel(result.minAchievableCGPA)} no matter
                  your final grades.
                </p>
              ) : result.status === "NOT_ACHIEVABLE" ? (
                <p
                  className="text-xs leading-relaxed"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Even with all A grades you can only reach{" "}
                  {result.maxAchievableCGPA.toFixed(2)} (
                  {getClassificationLabel(result.maxAchievableCGPA)}) — your{" "}
                  {targetCGPA.toFixed(2)} target cannot be achieved this
                  semester.
                </p>
              ) : (
                <p
                  className="text-xs leading-relaxed"
                  style={{ color: "var(--text-muted)" }}
                >
                  Your final CGPA will land between{" "}
                  <span
                    className="font-mono font-semibold"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {result.minAchievableCGPA.toFixed(2)}
                  </span>{" "}
                  ({getClassificationLabel(result.minAchievableCGPA)}) and{" "}
                  <span
                    className="font-mono font-semibold"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {result.maxAchievableCGPA.toFixed(2)}
                  </span>{" "}
                  ({getClassificationLabel(result.maxAchievableCGPA)}).
                  {result.requiredAverageGP != null && (
                    <>
                      {" "}
                      Averaging below{" "}
                      <span
                        className="font-mono font-semibold"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {result.requiredAverageGP.toFixed(2)}
                      </span>{" "}
                      GP across your final courses will miss the target.
                    </>
                  )}
                </p>
              )}
            </div>

            {(() => {
              const toPercent = (v: number) =>
                Math.max(0, Math.min(100, ((v - 1.0) / 4.0) * 100));
              const clamp = (v: number, lo: number, hi: number) =>
                Math.max(lo, Math.min(hi, v));

              const currentPct = toPercent(result.currentCGPA);
              const targetPct = toPercent(targetCGPA);
              const minPct = toPercent(result.minAchievableCGPA);
              const maxPct = toPercent(result.maxAchievableCGPA);

              const zones = [
                { value: 1.5, label: "3rd" },
                { value: 2.4, label: "2:2" },
                { value: 3.5, label: "2:1" },
                { value: 4.5, label: "1st" },
              ];

              return (
                <div>
                  {/* Floating labels above the track */}
                  <div className="relative h-10 mt-6">
                    {/* Current CGPA label */}
                    <div
                      className="absolute bottom-0 flex flex-col items-center"
                      style={{
                        left: `${clamp(currentPct, 3, 93)}%`,
                        transform: "translateX(-50%)",
                      }}
                    >
                      <span
                        className="text-[10px] font-mono font-semibold leading-none"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {result.currentCGPA.toFixed(2)}
                      </span>
                      <span
                        className="text-[9px] leading-none mt-0.5"
                        style={{ color: "var(--text-muted)" }}
                      >
                        now
                      </span>
                      <div
                        className="w-px h-2 mt-1"
                        style={{
                          background: "var(--text-secondary)",
                          opacity: 0.4,
                        }}
                      />
                    </div>

                    {/* Target CGPA label */}
                    <div
                      className="absolute bottom-0 flex flex-col items-center"
                      style={{
                        left: `${clamp(targetPct, 3, 97)}%`,
                        transform: "translateX(-50%)",
                      }}
                    >
                      <span
                        className="text-[10px] font-mono font-bold leading-none"
                        style={{ color: "var(--accent)" }}
                      >
                        {targetCGPA.toFixed(2)}
                      </span>
                      <span
                        className="text-[9px] leading-none mt-0.5"
                        style={{ color: "var(--accent)", opacity: 0.7 }}
                      >
                        target
                      </span>
                      <div
                        className="w-px h-2 mt-1"
                        style={{ background: "var(--accent)" }}
                      />
                    </div>
                  </div>

                  {/* Track bar */}
                  <div
                    className="relative h-3 rounded-full"
                    style={{ background: "var(--border)" }}
                  >
                    {/* Classification zone threshold hairlines */}
                    {zones.map(({ value }) => (
                      <div
                        key={value}
                        className="absolute top-0 bottom-0 w-px"
                        style={{
                          left: `${toPercent(value)}%`,
                          background: "var(--text-muted)",
                          opacity: 0.3,
                        }}
                      />
                    ))}

                    {/* Achievable range fill – gradient */}
                    <div
                      className="absolute top-0 h-full rounded-full transition-all duration-500"
                      style={{
                        left: `${minPct}%`,
                        width: `${Math.max(0, maxPct - minPct)}%`,
                        background:
                          "linear-gradient(90deg, rgba(108,99,255,0.45) 0%, rgba(108,99,255,0.88) 100%)",
                      }}
                    />

                    {/* Current CGPA – hollow circle marker */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 z-10"
                      style={{
                        left: `${clamp(currentPct, 2, 98)}%`,
                        width: 18,
                        height: 18,
                        borderColor: "var(--text-secondary)",
                        background: "var(--bg-card)",
                      }}
                    />

                    {/* Target CGPA – solid glowing accent marker */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full z-20"
                      style={{
                        left: `${clamp(targetPct, 2, 98)}%`,
                        width: 18,
                        height: 18,
                        background: "var(--accent)",
                        boxShadow:
                          "0 0 0 3px rgba(108,99,255,0.25), 0 0 12px rgba(108,99,255,0.3)",
                      }}
                    />
                  </div>

                  {/* Below-track: scale values + zone names */}
                  <div className="relative mt-2" style={{ height: "2.75rem" }}>
                    {/* 1.0 at the left edge */}
                    <span
                      className="absolute text-[10px] font-mono"
                      style={{
                        left: "0%",
                        top: 0,
                        color: "var(--text-muted)",
                        opacity: 0.55,
                      }}
                    >
                      1.0
                    </span>
                    {/* 5.0 at the right edge */}
                    <span
                      className="absolute text-[10px] font-mono"
                      style={{
                        right: "0%",
                        top: 0,
                        color: "var(--text-muted)",
                        opacity: 0.55,
                      }}
                    >
                      5.0
                    </span>
                    {/* Zone threshold value + name */}
                    {zones.map(({ value, label }) => (
                      <div
                        key={value}
                        className="absolute flex flex-col items-center"
                        style={{
                          left: `${toPercent(value)}%`,
                          top: 0,
                          transform: "translateX(-50%)",
                        }}
                      >
                        <span
                          className="text-[10px] font-mono leading-none"
                          style={{ color: "var(--text-muted)", opacity: 0.65 }}
                        >
                          {value.toFixed(1)}
                        </span>
                        <span
                          className="text-[9px] font-medium leading-none mt-0.5"
                          style={{ color: "var(--text-muted)", opacity: 0.45 }}
                        >
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-5 mt-1 pt-4 border-t border-[var(--border)]">
              <div className="flex items-center gap-2">
                <div
                  className="w-3.5 h-3.5 rounded-full border-2 flex-shrink-0"
                  style={{
                    borderColor: "var(--text-secondary)",
                    background: "var(--bg-card)",
                  }}
                />
                <span
                  className="text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  Current CGPA ({result.currentCGPA.toFixed(2)})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                  style={{
                    background: "var(--accent)",
                    boxShadow: "0 0 0 2px rgba(108,99,255,0.25)",
                  }}
                />
                <span
                  className="text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  Target ({targetCGPA.toFixed(2)})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-2 rounded-full flex-shrink-0"
                  style={{
                    background:
                      "linear-gradient(90deg, rgba(108,99,255,0.45), rgba(108,99,255,0.88))",
                  }}
                />
                <span
                  className="text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  Achievable range
                </span>
              </div>
            </div>
          </motion.div>

          <hr className="border-[var(--border)] my-8" />

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                Final semester breakdown
              </h3>
              <button
                onClick={() => setShowCalculationInfo(!showCalculationInfo)}
                className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors px-3 py-1.5 rounded-lg hover:bg-[var(--surface-1)]"
              >
                How it's calculated
              </button>
            </div>

            <AnimatePresence>
              {showCalculationInfo && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mb-6"
                >
                  <div
                    className="mt-2"
                    style={{
                      background: "var(--surface-1)",
                      border: "0.5px solid var(--border)",
                      borderRadius: "12px",
                      padding: "1rem 1.25rem",
                      fontSize: "13px",
                      color: "var(--text-secondary)",
                      lineHeight: "1.6",
                    }}
                  >
                    <p className="font-semibold text-[var(--text-primary)] mb-2">
                      How the required GP is calculated
                    </p>
                    <p className="mb-4">
                      Each remaining course is treated equally. The total grade
                      points needed to reach your target CGPA are spread across
                      all courses weighted by their credit units.
                    </p>
                    <div className="mb-4 space-y-2 text-xs sm:text-[13px] break-words">
                      <p className="font-mono text-[var(--text-primary)] whitespace-normal">
                        Required total GP = (Target CGPA x Total units) -
                        (Current GP sum)
                      </p>
                      <p className="font-mono text-[var(--text-primary)] whitespace-normal">
                        Required avg GP per course = Required total GP /
                        Remaining credit units
                      </p>
                    </div>
                    <p className="mb-4">
                      If the required average exceeds 5.0 (the maximum), the
                      target is marked Not achievable. If your minimum possible
                      CGPA already meets the target, it's marked Already
                      secured.
                    </p>
                    <p className="text-[var(--text-muted)] italic">
                      Note: This assumes you pass all courses. Zero-unit courses
                      are excluded from the calculation.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <p className="text-sm text-[var(--text-secondary)] mb-6">
              Minimum grade point per course using equal distribution across all
              remaining courses.
            </p>

            <div className="glass-card overflow-hidden">
              {result.finalSemesterCourses.length === 0 ? (
                <div className="p-8">
                  <EmptyState
                    icon={<GraduationCap size={48} />}
                    title="No ungraded final semester courses"
                    description="Add ungraded courses to your most recent semester to see a per-course breakdown."
                  />
                </div>
              ) : (
                <>
                  <div className="sm:hidden p-4 space-y-3">
                    {result.finalSemesterCourses.map((course, index) => {
                      const gradeInfo = getGradeInfo(course.requiredGradePoint);

                      let gpCell: React.ReactNode;
                      let gradeCell: React.ReactNode;

                      if (course.credit_units === 0) {
                        gpCell = (
                          <span className="text-[var(--text-muted)]">—</span>
                        );
                        gradeCell = (
                          <span className="text-[var(--text-muted)]">—</span>
                        );
                      } else if (result.status === "NOT_ACHIEVABLE") {
                        gpCell = (
                          <span className="text-[var(--text-muted)]">—</span>
                        );
                        gradeCell = (
                          <span className="text-[var(--text-muted)]">—</span>
                        );
                      } else if (
                        result.status === "ALREADY_SECURED" ||
                        result.status === "ALREADY_SECURED_HIGHER"
                      ) {
                        gpCell = (
                          <span className="text-[var(--text-muted)]">—</span>
                        );
                        gradeCell = (
                          <span
                            className="badge border inline-block"
                            style={getGradeBadgeStyle("E")}
                          >
                            E (min)
                          </span>
                        );
                      } else {
                        gpCell =
                          course.requiredGradePoint == null ? (
                            <span className="text-[var(--text-muted)]">—</span>
                          ) : (
                            <span className="font-mono text-[var(--text-primary)] font-bold">
                              {course.requiredGradePoint.toFixed(2)}
                            </span>
                          );

                        gradeCell = gradeInfo ? (
                          <span
                            className="badge border inline-block"
                            style={getGradeBadgeStyle(gradeInfo.letter)}
                          >
                            {gradeInfo.letter} ({gradeInfo.range})
                          </span>
                        ) : (
                          <span className="text-[var(--text-muted)]">—</span>
                        );
                      }

                      return (
                        <motion.article
                          key={course.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.04 }}
                          className="rounded-2xl border border-[var(--border)] bg-[var(--bg-base)]/60 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-mono text-sm font-bold text-[var(--text-primary)]">
                                {course.course_code}
                              </p>
                              <p className="mt-1 text-sm text-[var(--text-secondary)] break-words">
                                {course.course_title}
                              </p>
                            </div>
                            <span className="badge bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/20 shrink-0">
                              {course.credit_units} units
                            </span>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                                Min. GP
                              </p>
                              <div className="font-mono text-[var(--text-primary)]">
                                {gpCell}
                              </div>
                            </div>
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                                Grade
                              </p>
                              <div>{gradeCell}</div>
                            </div>
                          </div>
                        </motion.article>
                      );
                    })}
                  </div>

                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full table-fixed">
                      <thead>
                        <tr className="border-b border-[var(--border)]">
                          {[
                            "Code",
                            "Course title",
                            "Units",
                            "Min. needed GP",
                            "Grade needed",
                          ].map((heading) => (
                            <th
                              key={heading}
                              className={`${heading === "Code" || heading === "Course title" ? "text-left" : "text-center"} px-3 py-3 sm:px-6 sm:py-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider`}
                            >
                              {heading}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {result.finalSemesterCourses.map((course, index) => {
                          const gradeInfo = getGradeInfo(
                            course.requiredGradePoint,
                          );

                          let gpCell: React.ReactNode;
                          let gradeCell: React.ReactNode;

                          if (course.credit_units === 0) {
                            gpCell = (
                              <span className="text-[var(--text-muted)]"></span>
                            );
                            gradeCell = (
                              <span className="text-[var(--text-muted)]"></span>
                            );
                          } else if (result.status === "NOT_ACHIEVABLE") {
                            gpCell = (
                              <span className="text-[var(--text-muted)]"></span>
                            );
                            gradeCell = (
                              <span className="text-[var(--text-muted)]"></span>
                            );
                          } else if (
                            result.status === "ALREADY_SECURED" ||
                            result.status === "ALREADY_SECURED_HIGHER"
                          ) {
                            gpCell = (
                              <span className="text-[var(--text-muted)]"></span>
                            );
                            gradeCell = (
                              <span
                                className="badge border inline-block"
                                style={getGradeBadgeStyle("E")}
                              >
                                E (min)
                              </span>
                            );
                          } else {
                            gpCell =
                              course.requiredGradePoint == null ? (
                                <span className="text-[var(--text-muted)]"></span>
                              ) : (
                                <span className="font-mono text-[var(--text-primary)] font-bold">
                                  {course.requiredGradePoint.toFixed(2)}
                                </span>
                              );

                            if (gradeInfo) {
                              gradeCell = (
                                <span
                                  className="badge border inline-block"
                                  style={getGradeBadgeStyle(gradeInfo.letter)}
                                >
                                  {gradeInfo.letter} ({gradeInfo.range})
                                </span>
                              );
                            } else {
                              gradeCell = (
                                <span className="text-[var(--text-muted)]"></span>
                              );
                            }
                          }

                          return (
                            <tr
                              key={course.id}
                              className="border-b border-[var(--border)] hover:bg-[var(--surface-1)]/50 transition-colors animate-fade-in-up"
                              style={{ animationDelay: `${index * 50}ms` }}
                            >
                              <td className="px-3 py-3 sm:px-6 sm:py-4 text-sm font-semibold text-[var(--text-primary)] uppercase">
                                <span className="block truncate">
                                  {course.course_code}
                                </span>
                              </td>
                              <td className="px-3 py-3 sm:px-6 sm:py-4 text-sm text-[var(--text-secondary)]">
                                <span className="block truncate">
                                  {course.course_title}
                                </span>
                              </td>
                              <td className="px-3 py-3 sm:px-6 sm:py-4 text-center text-sm font-mono text-[var(--text-secondary)]">
                                {course.credit_units}
                              </td>
                              <td className="px-3 py-3 sm:px-6 sm:py-4 text-center text-sm">
                                {gpCell}
                              </td>
                              <td className="px-3 py-3 sm:px-6 sm:py-4 text-center">
                                {gradeCell}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-6 py-4 border-t border-[var(--border)] bg-[var(--surface-1)]/30 flex items-center gap-2">
                    <Info size={16} className="text-[var(--text-muted)]" />
                    <span className="text-xs text-[var(--text-muted)]">
                      Assumes equal weight distribution across all remaining
                      courses.
                    </span>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl bg-[var(--bg-card)] p-6 border border-[var(--border)] shadow-xl relative"
            >
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X size={20} />
              </button>
              <h2 className="text-[var(--text-xl)] font-semibold tracking-[-0.02em] text-[var(--text-primary)] mb-6">
                Semester Target
              </h2>

              {semesterTarget.loading ? (
                <p className="text-sm text-[var(--text-secondary)]">
                  Loading target...
                </p>
              ) : !currentSemesterId ? (
                <p className="text-sm text-[var(--text-secondary)]">
                  No active semester. Start a semester to set a target.
                </p>
              ) : (
                <div className="space-y-4">
                  {semesterTarget.editMode ? (
                    <div className="flex flex-col gap-4">
                      <div>
                        <label
                          htmlFor="semester-target-gpa"
                          className="mb-2 block text-sm font-medium text-[var(--text-secondary)]"
                        >
                          What GP do you want to hit this semester?
                        </label>
                        <input
                          id="semester-target-gpa"
                          type="number"
                          min="1"
                          max="5"
                          step="0.01"
                          inputMode="decimal"
                          value={semesterTarget.draftValue}
                          onChange={(e) =>
                            setSemesterTarget((current) => ({
                              ...current,
                              draftValue: e.target.value,
                            }))
                          }
                          onBlur={() => {
                            const raw = semesterTarget.draftValue.trim();
                            if (raw === "") return;
                            const parsed = Number(raw);
                            if (!Number.isFinite(parsed)) return;
                            const rounded =
                              roundToTwoDecimals(parsed).toFixed(2);
                            if (rounded !== raw) {
                              setSemesterTarget((current) => ({
                                ...current,
                                draftValue: rounded,
                              }));
                            }
                          }}
                          className="w-full rounded-[16px] border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 font-mono text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]/40"
                          placeholder="4.50"
                        />
                        {semesterTarget.savedValue != null && (
                          <p className="mt-2 text-xs text-[var(--text-muted)]">
                            Last saved: {semesterTarget.savedValue.toFixed(2)}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={handleSaveTarget}
                        disabled={semesterTarget.saving}
                        className="btn btn-primary w-full"
                      >
                        {semesterTarget.saving ? "Saving..." : "Save Target"}
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-wrap items-center justify-between rounded-[20px] border border-[var(--border)] bg-[var(--bg-base)]/50 px-4 py-4">
                        <p className="text-sm text-[var(--text-secondary)]">
                          Target set:{" "}
                          <span className="font-mono text-[var(--text-primary)] font-bold text-lg ml-2">
                            {semesterTarget.currentTargetGpa?.toFixed(2)}
                          </span>
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            setSemesterTarget((current) => ({
                              ...current,
                              editMode: true,
                              draftValue:
                                current.currentTargetGpa?.toFixed(2) ?? "",
                            }))
                          }
                          className="text-sm font-medium text-[var(--accent)] hover:underline"
                        >
                          Edit
                        </button>
                      </div>
                      <button
                        onClick={() => setIsModalOpen(false)}
                        className="btn w-full border border-[var(--border)] bg-transparent hover:bg-[var(--surface-1)]"
                      >
                        Close
                      </button>
                    </div>
                  )}

                  {semesterTarget.error && (
                    <p className="text-sm text-[var(--danger)]">
                      {semesterTarget.error}
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GraduationTarget;



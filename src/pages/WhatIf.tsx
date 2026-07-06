import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import api from "../api/axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calculator,
  ChevronDown,
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  BookOpen,
} from "lucide-react";
import { getGradeBadgeStyle } from "../utils/gradeColors";

//  Types 

interface Semester {
  id: string;
  label: string;
  level: number;
  semester_number: number;
  academic_year: string;
  is_current: boolean;
}

interface SemesterCourse {
  id: string;
  course_code: string;
  course_title: string;
  credit_units: number;
  grade: string;
  grade_point: number;
}

interface CurrentSemesterCourse {
  id: string;
  course_code: string;
  course_title: string;
  credit_units: number;
  grade: string | null;
  grade_point: number | null;
}

interface SimulatePastResult {
  originalCGPA: number;
  simulatedCGPA: number;
  difference: number;
  originalGP: number;
  originalGrade: string;
  courseUnits: number;
  classification: string;
}

interface CurrentSemesterData {
  currentSemester: {
    id: string;
    name: string;
    level: number;
    semester_number: number;
    label: string;
  } | null;
  courses: CurrentSemesterCourse[];
  previousTotalPoints: number;
  completedUnits: number;
  currentCGPA: number;
}

//  Constants 

const GRADE_OPTIONS = [
  { label: "A (5.0)", value: 5.0 },
  { label: "B (4.0)", value: 4.0 },
  { label: "C (3.0)", value: 3.0 },
  { label: "D (2.0)", value: 2.0 },
  { label: "E (1.0)", value: 1.0 },
  { label: "F (0.0)", value: 0.0 },
];

const getClassificationLabel = (cgpa: number): string => {
  if (cgpa >= 4.5) return "First Class";
  if (cgpa >= 3.5) return "Second Class Upper";
  if (cgpa >= 2.4) return "Second Class Lower";
  if (cgpa >= 1.5) return "Third Class";
  return "Pass";
};

const roundToTwoDecimals = (value: number) => Math.round(value * 100) / 100;

const getGradeLetterFromGP = (gradePoint: number): string => {
  if (gradePoint > 4) return "A";
  if (gradePoint > 3) return "B";
  if (gradePoint > 2) return "C";
  if (gradePoint > 1) return "D";
  return "E";
};

/**
 * Computes the optimal grade distribution across courses to meet a semester GPA goal.
 *
 * Strategy:
 *   1. Set every course to the base grade = floor(goalGPA), minimum E (GP=1).
 *   2. Calculate the quality-point deficit vs the target.
 *   3. Upgrade courses from highest credit_units to lowest, one grade level at a time,
 *      until the deficit is closed.
 *   4. Never exceeds A (GP=5). Never goes below E (GP=1).
 *
 * This produces a realistic, spread distribution rather than uniform grades.
 *
 * Returns a map of course id -> assigned GP.
 * Zero-unit courses are excluded and kept at GP=0 (not counted).
 */
const computeOptimalDistribution = (
  courses: CurrentSemesterCourse[],
  goalGPA: number,
): Map<string, number> => {
  const creditBearing = courses.filter((c) => c.credit_units > 0);
  const totalUnits = creditBearing.reduce((s, c) => s + c.credit_units, 0);
  const targetQP = goalGPA * totalUnits;

  const baseGP = Math.max(1, Math.min(4, Math.floor(goalGPA)));

  const assignments = new Map<string, number>(
    creditBearing.map((c) => [c.id, baseGP]),
  );

  let currentQP = totalUnits * baseGP;
  let deficit = targetQP - currentQP;

  if (deficit > 0) {
    const sorted = [...creditBearing].sort(
      (a, b) => b.credit_units - a.credit_units,
    );

    for (const course of sorted) {
      if (deficit <= 0.001) break;

      const currentGP = assignments.get(course.id) ?? baseGP;
      const maxGainFromCourse = (5 - currentGP) * course.credit_units;

      if (deficit >= maxGainFromCourse) {
        assignments.set(course.id, 5);
        deficit -= maxGainFromCourse;
      } else {
        const levelsNeeded = Math.ceil(deficit / course.credit_units);
        const newGP = Math.min(5, currentGP + levelsNeeded);
        deficit -= (newGP - currentGP) * course.credit_units;
        assignments.set(course.id, newGP);
      }
    }
  }

  return assignments;
};

//  Shared UI pieces 

const SelectField = ({
  value,
  onChange,
  disabled,
  placeholder,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
  children: React.ReactNode;
}) => (
  <div className="relative">
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="input-field w-full appearance-none cursor-pointer pr-10 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {children}
    </select>
    <ChevronDown
      size={15}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
    />
  </div>
);

const DiffBadge = ({ difference }: { difference: number }) => {
  const positive = difference >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold font-mono ${
        positive
          ? "bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/20"
          : "bg-[var(--danger)]/10 text-[var(--danger)] border border-[var(--danger)]/20"
      }`}
    >
      {positive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
      {positive ? "+" : ""}
      {difference.toFixed(2)}
    </span>
  );
};

//  Mode A  Past Semester Replay 

const PastSemesterMode = () => {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState("");
  const [courses, setCourses] = useState<SemesterCourse[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [hypotheticalGP, setHypotheticalGP] = useState<number>(4.0);
  const [result, setResult] = useState<SimulatePastResult | null>(null);
  const [loadingSemesters, setLoadingSemesters] = useState(true);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState("");

  // Load semesters on mount
  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get("/analytics/whatif/semesters");
        // Only completed (non-current) semesters
        setSemesters(res.data.semesters.filter((s: Semester) => !s.is_current));
      } catch {
        setError("Could not load semesters.");
      } finally {
        setLoadingSemesters(false);
      }
    };
    load();
  }, []);

  // Load courses when semester changes
  useEffect(() => {
    if (!selectedSemesterId) {
      setCourses([]);
      setSelectedCourseId("");
      setResult(null);
      return;
    }
    const load = async () => {
      setLoadingCourses(true);
      setSelectedCourseId("");
      setResult(null);
      try {
        const res = await api.get(
          `/analytics/whatif/semester-courses/${selectedSemesterId}`,
        );
        setCourses(res.data.courses);
      } catch {
        setCourses([]);
      } finally {
        setLoadingCourses(false);
      }
    };
    load();
  }, [selectedSemesterId]);

  // When course selection changes, default hypothetical GP to original
  const selectedCourse = courses.find((c) => c.id === selectedCourseId) ?? null;
  useEffect(() => {
    if (selectedCourse) {
      setHypotheticalGP(selectedCourse.grade_point);
      setResult(null);
    }
  }, [selectedCourseId]);

  const handleCalculate = async () => {
    if (!selectedCourseId) return;
    setCalculating(true);
    setError("");
    try {
      const res = await api.get("/analytics/whatif/simulate-past", {
        params: { courseId: selectedCourseId, hypotheticalGP },
      });
      setResult(res.data);
    } catch {
      setError("Calculation failed. Please try again.");
    } finally {
      setCalculating(false);
    }
  };

  if (loadingSemesters) {
    return (
      <div className="flex items-center justify-center h-48 text-[var(--text-muted)]">
        <span className="text-sm">Loading semesters</span>
      </div>
    );
  }

  if (semesters.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-center gap-3">
        <BookOpen size={40} className="text-[var(--text-muted)]" />
        <p className="text-sm text-[var(--text-secondary)]">
          No completed semesters found. Complete a semester first to use this
          mode.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/*  Controls  */}
      <div className="lg:col-span-3 space-y-5">
        {/* Semester selector */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] mb-2">
            Semester
          </label>
          <SelectField
            value={selectedSemesterId}
            onChange={setSelectedSemesterId}
            placeholder="Select a completed semester"
          >
            {semesters.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </SelectField>
        </div>

        {/* Course selector */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] mb-2">
            Course
          </label>
          {loadingCourses ? (
            <div className="input-field text-[var(--text-muted)] text-sm">
              Loading courses
            </div>
          ) : (
            <SelectField
              value={selectedCourseId}
              onChange={setSelectedCourseId}
              disabled={!selectedSemesterId || courses.length === 0}
              placeholder={
                courses.length === 0 && selectedSemesterId
                  ? "No graded courses in this semester"
                  : "Select a course"
              }
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.course_code}  {c.course_title}
                </option>
              ))}
            </SelectField>
          )}
        </div>

        {/* Original grade pill + hypothetical grade selector */}
        {selectedCourse && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] mb-2">
                Current Grade
              </label>
              <div className="input-field flex items-center gap-2 cursor-not-allowed opacity-70 select-none">
                <span className="badge border text-xs" style={getGradeBadgeStyle(selectedCourse.grade)}>
                  {selectedCourse.grade}
                </span>
                <span className="font-mono text-sm text-[var(--text-secondary)]">
                  {selectedCourse.grade_point.toFixed(1)}
                </span>
                <span className="text-xs text-[var(--text-muted)] ml-auto">
                  {selectedCourse.credit_units} units
                </span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] mb-2">
                Hypothetical Grade
              </label>
              <SelectField
                value={String(hypotheticalGP)}
                onChange={(v) => {
                  setHypotheticalGP(parseFloat(v));
                  setResult(null);
                }}
              >
                {GRADE_OPTIONS.map((g) => (
                  <option key={g.value} value={String(g.value)}>
                    {g.label}
                  </option>
                ))}
              </SelectField>
            </div>
          </motion.div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-[var(--danger)] text-sm">
            <AlertCircle size={15} />
            {error}
          </div>
        )}

        <button
          onClick={handleCalculate}
          disabled={!selectedCourseId || calculating}
          className="btn btn-primary btn-sm"
        >
          {calculating ? (
            "Calculating"
          ) : (
            <>
              <Sparkles size={15} />
              Calculate
            </>
          )}
        </button>
      </div>

      {/*  Result Panel  */}
      <div className="lg:col-span-2">
        <div className="glass-card p-6 h-full overflow-hidden">
          <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] mb-5">
            Simulation Result
          </h3>

          <AnimatePresence mode="wait">
            {result ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-[var(--bg-base)] rounded-xl p-4 border border-[var(--border)]">
                    <p className="text-[var(--text-xs)] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1">
                      Original CGPA
                    </p>
                    <p className="text-2xl font-bold font-mono text-[var(--text-primary)]">
                      {result.originalCGPA.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-[var(--bg-base)] rounded-xl p-4 border border-[var(--border)]">
                    <p className="text-[var(--text-xs)] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1">
                      Simulated CGPA
                    </p>
                    <p className="text-2xl font-bold font-mono text-[var(--accent)]">
                      {result.simulatedCGPA.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between px-1">
                  <span className="text-xs text-[var(--text-muted)]">
                    Difference
                  </span>
                  <DiffBadge difference={result.difference} />
                </div>

                <div className="bg-[var(--accent-soft)] border border-[var(--accent)]/20 rounded-xl p-4">
                  <p className="text-[var(--text-xs)] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1">
                    Projected Classification
                  </p>
                  <p className="text-base font-semibold text-[var(--accent)]">
                    {result.classification}
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center h-48 text-center gap-3"
              >
                <Calculator size={36} className="text-[var(--text-muted)]" />
                <p className="text-sm text-[var(--text-secondary)] max-w-[200px] leading-relaxed">
                  Select a semester, pick a course, choose a hypothetical grade,
                  then hit Calculate.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

//  Mode B  Current Semester Projection 

interface ProjectionRow extends CurrentSemesterCourse {
  selectedGP: number;
}

const CurrentSemesterMode = ({
  semesterIdOverride,
}: {
  semesterIdOverride?: string;
}) => {
  const [data, setData] = useState<CurrentSemesterData | null>(null);
  const [rows, setRows] = useState<ProjectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get("/analytics/whatif/current-semester");
        const d: CurrentSemesterData = res.data;
        setData(d);

        // If a semesterIdOverride was passed via URL params, we trust the
        // current-semester endpoint (it always returns the most recent semester).
        // The override is mainly used to ensure we're on this tab.
        setRows(
          d.courses.map((c) => ({
            ...c,
            // Default to B (4.0) unless the course already has a grade
            selectedGP: 4.0,
          })),
        );
      } catch {
        setError("Could not load current semester data.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [semesterIdOverride]);

  const updateGP = (id: string, gp: number) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, selectedGP: gp } : r)),
    );
  };

  // Live calculations
  const semesterPoints = rows.reduce(
    (sum, r) => sum + r.selectedGP * r.credit_units,
    0,
  );
  const semesterUnits = rows.reduce((sum, r) => sum + r.credit_units, 0);
  const projectedSemesterGPA =
    semesterUnits === 0 ? 0 : semesterPoints / semesterUnits;

  const previousTotalPoints = data?.previousTotalPoints ?? 0;
  const completedUnits = data?.completedUnits ?? 0;
  const currentCGPA = data?.currentCGPA ?? 0;

  const projectedTotalPoints = previousTotalPoints + semesterPoints;
  const projectedTotalUnits = completedUnits + semesterUnits;
  const projectedCGPA =
    projectedTotalUnits === 0 ? 0 : projectedTotalPoints / projectedTotalUnits;
  const cgpaChange = projectedCGPA - currentCGPA;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-[var(--text-muted)]">
        <span className="text-sm">Loading current semester</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-[var(--danger)] text-sm p-4">
        <AlertCircle size={15} />
        {error}
      </div>
    );
  }

  if (!data?.currentSemester || rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-center gap-3">
        <BookOpen size={40} className="text-[var(--text-muted)]" />
        <p className="text-sm text-[var(--text-secondary)] max-w-xs leading-relaxed">
          No courses found in your current semester. Add courses first.
        </p>
        <Link
          to="/semesters"
          className="text-sm font-semibold text-[var(--accent)] hover:underline"
        >
          Go to Semesters 
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Semester label */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
          Projecting for
        </span>
        <span className="badge bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/20 text-xs font-semibold">
          {data.currentSemester.label}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/*  Course table  */}
        <div className="lg:col-span-2 min-w-0">
          <div className="glass-card overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--border)]">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Course Grade Targets
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Adjust grade targets  projection updates instantly
              </p>
            </div>
            <div className="md:hidden p-4 space-y-3">
              {rows.map((row, idx) => (
                <motion.article
                  key={row.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--bg-base)]/60 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-bold text-[var(--text-primary)]">
                        {row.course_code}
                      </p>
                      <p className="mt-1 text-sm text-[var(--text-secondary)] break-words">
                        {row.course_title}
                      </p>
                    </div>
                    <span className="badge bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/20 shrink-0">
                      {row.credit_units} units
                    </span>
                  </div>

                  <div className="mt-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                      Target Grade
                    </p>
                    <div className="relative">
                      <select
                        value={String(row.selectedGP)}
                        onChange={(e) =>
                          updateGP(row.id, parseFloat(e.target.value))
                        }
                        className="input-field text-sm appearance-none cursor-pointer pr-8 py-2"
                      >
                        {GRADE_OPTIONS.map((g) => (
                          <option key={g.value} value={String(g.value)}>
                            {g.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        size={13}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
                      />
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full table-fixed">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    {["Code", "Title", "Units", "Target Grade"].map((h) => (
                      <th
                        key={h}
                        className={`${h === "Code" || h === "Title" ? "text-left" : "text-center"} px-5 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <motion.tr
                      key={row.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      className="border-b border-[var(--border)]/40 hover:bg-[var(--bg-card-hover)] transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <span className="font-bold font-mono text-sm text-[var(--text-primary)] block truncate">
                          {row.course_code}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-[var(--text-secondary)]">
                        <span className="block truncate">{row.course_title}</span>
                      </td>
                      <td className="px-5 py-3.5 text-center font-mono text-sm text-[var(--text-secondary)]">
                        {row.credit_units}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <div className="relative inline-block min-w-[130px]">
                          <select
                            value={String(row.selectedGP)}
                            onChange={(e) =>
                              updateGP(row.id, parseFloat(e.target.value))
                            }
                            className="input-field text-sm appearance-none cursor-pointer pr-8 py-2"
                          >
                            {GRADE_OPTIONS.map((g) => (
                              <option key={g.value} value={String(g.value)}>
                                {g.label}
                              </option>
                            ))}
                          </select>
                          <ChevronDown
                            size={13}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
                          />
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/*  Live output panel  */}
        <div className="lg:col-span-1 min-w-0">
          <div className="glass-card p-5 sticky top-6 space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
              Live Projection
            </h3>

            {/* Projected Semester GPA */}
            <div className="bg-[var(--bg-base)] rounded-xl p-4 border border-[var(--border)]">
              <p className="text-[var(--text-xs)] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1">
                Projected Semester GPA
              </p>
              <p className="text-2xl font-bold font-mono text-[var(--text-primary)]">
                {projectedSemesterGPA.toFixed(2)}
              </p>
            </div>

            {/* Projected CGPA */}
            <div className="bg-[var(--bg-base)] rounded-xl p-4 border border-[var(--border)]">
              <p className="text-[var(--text-xs)] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1">
                Projected CGPA
              </p>
              <p className="text-2xl font-bold font-mono text-[var(--accent)]">
                {projectedCGPA.toFixed(2)}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Current:{" "}
                <span className="font-mono">{currentCGPA.toFixed(2)}</span>
              </p>
            </div>

            {/* CGPA Change */}
            <div className="flex items-center justify-between px-1">
              <span className="text-xs text-[var(--text-muted)]">
                CGPA Change
              </span>
              <DiffBadge difference={cgpaChange} />
            </div>

            {/* Classification */}
            <div className="bg-[var(--accent-soft)] border border-[var(--accent)]/20 rounded-xl p-4">
              <p className="text-[var(--text-xs)] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1">
                Projected Classification
              </p>
              <p className="text-sm font-semibold text-[var(--accent)]">
                {getClassificationLabel(projectedCGPA)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

//  Main WhatIf Page 

interface PlannerRow {
  id: string;
  course_code: string;
  course_title: string;
  credit_units: number;
  selectedGP: number;
}

const GoalPlannerMode = ({
  redirectedTarget,
}: {
  redirectedTarget?: number | null;
}) => {
  const [data, setData] = useState<CurrentSemesterData | null>(null);
  const [rows, setRows] = useState<PlannerRow[]>([]);
  const [goalInput, setGoalInput] = useState("");
  const [submittedGoal, setSubmittedGoal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [validationError, setValidationError] = useState("");
  const [showRedirectBanner, setShowRedirectBanner] = useState(
    redirectedTarget != null,
  );

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get("/analytics/whatif/current-semester");
        const d: CurrentSemesterData = res.data;
        setData(d);

        setRows(
          d.courses.map((c) => ({
            id: c.id,
            course_code: c.course_code,
            course_title: c.course_title,
            credit_units: c.credit_units,
            selectedGP: 4.0,
          })),
        );

        if (redirectedTarget != null && Number.isFinite(redirectedTarget)) {
          const clamped = Math.min(5, Math.max(1, redirectedTarget));
          setGoalInput(clamped.toFixed(2));
          setSubmittedGoal(clamped);
          const distribution = computeOptimalDistribution(d.courses, clamped);
          setRows(
            d.courses.map((c) => ({
              id: c.id,
              course_code: c.course_code,
              course_title: c.course_title,
              credit_units: c.credit_units,
              selectedGP: c.credit_units === 0 ? 0 : (distribution.get(c.id) ?? 1),
            })),
          );
        }
      } catch {
        setError("Could not load current semester data.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [redirectedTarget]);

  const handleCalculate = () => {
    const parsed = roundToTwoDecimals(Number(goalInput));
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 5) {
      setValidationError("Enter a goal between 1.00 and 5.00.");
      return;
    }

    setValidationError("");
    setSubmittedGoal(parsed);
    setShowRedirectBanner(false);

    if (data) {
      const distribution = computeOptimalDistribution(data.courses, parsed);
      setRows((prev) =>
        prev.map((r) => ({
          ...r,
          selectedGP: r.credit_units === 0 ? 0 : (distribution.get(r.id) ?? 1),
        })),
      );
    }
  };

  const handleInputChange = (value: string) => {
    setGoalInput(value);
    setValidationError("");
    setShowRedirectBanner(false);
  };

  const updateGP = (id: string, gp: number) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, selectedGP: gp } : r)),
    );
  };

  const creditBearingRows = rows.filter((r) => r.credit_units > 0);
  const semesterPoints = creditBearingRows.reduce(
    (sum, r) => sum + r.selectedGP * r.credit_units,
    0,
  );
  const semesterUnits = creditBearingRows.reduce(
    (sum, r) => sum + r.credit_units,
    0,
  );
  const projectedSemesterGPA =
    semesterUnits === 0 ? 0 : semesterPoints / semesterUnits;

  const previousTotalPoints = data?.previousTotalPoints ?? 0;
  const completedUnits = data?.completedUnits ?? 0;
  const currentCGPA = data?.currentCGPA ?? 0;
  const projectedTotalPoints = previousTotalPoints + semesterPoints;
  const projectedTotalUnits = completedUnits + semesterUnits;
  const projectedCGPA =
    projectedTotalUnits === 0 ? 0 : projectedTotalPoints / projectedTotalUnits;
  const cgpaChange = projectedCGPA - currentCGPA;

  const goalMet =
    submittedGoal != null && projectedSemesterGPA >= submittedGoal - 0.001;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-[var(--text-muted)]">
        <span className="text-sm">Loading goal planner</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-[var(--danger)] text-sm p-4">
        <AlertCircle size={15} />
        {error}
      </div>
    );
  }

  if (!data?.currentSemester || rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-center gap-3">
        <BookOpen size={40} className="text-[var(--text-muted)]" />
        <p className="text-sm text-[var(--text-secondary)] max-w-sm leading-relaxed">
          No active semester found. Add a current semester with courses to use
          this tool.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
          Planning for
        </span>
        <span className="badge bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/20 text-xs font-semibold">
          {data.currentSemester.label}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
          Semester GP Goal
        </label>
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1 min-w-0">
            <input
              type="number"
              min="1"
              max="5"
              step="0.01"
              inputMode="decimal"
              value={goalInput}
              onChange={(e) => handleInputChange(e.target.value)}
              onBlur={() => {
                const raw = goalInput.trim();
                if (raw === "") return;
                const parsed = Number(raw);
                if (!Number.isFinite(parsed)) return;
                const rounded = roundToTwoDecimals(parsed).toFixed(2);
                if (rounded !== raw) {
                  setGoalInput(rounded);
                }
              }}
              className="input-field w-full font-mono"
              placeholder="e.g. 4.50"
            />
            {validationError && (
              <p className="mt-2 text-xs text-[var(--danger)]">
                {validationError}
              </p>
            )}
          </div>
          <button onClick={handleCalculate} className="btn btn-primary btn-sm">
            <Sparkles size={15} />
            Calculate
          </button>
        </div>

        {submittedGoal != null && (
          <p className="text-xs text-[var(--text-muted)]">
            Optimal plan to reach{" "}
            <span className="font-mono text-[var(--text-primary)]">
              {submittedGoal.toFixed(2)}
            </span>
            {" "}- prioritises high-credit courses. Adjust any course to explore.
          </p>
        )}
      </div>

      {showRedirectBanner && redirectedTarget != null && (
        <div className="rounded-xl border border-[var(--accent)]/20 bg-[var(--accent-soft)] px-4 py-3 text-xs text-[var(--text-secondary)]">
          Showing projection based on your graduation target of{" "}
          <span className="font-mono text-[var(--text-primary)]">
            {redirectedTarget.toFixed(2)}
          </span>{" "}
          CGPA
        </div>
      )}

      {submittedGoal != null && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 min-w-0">
            <div className="glass-card overflow-hidden">
              <div className="px-5 py-4 border-b border-[var(--border)]">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  Course Grade Targets
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  High-credit courses upgraded first. Adjust any row to explore scenarios.
                </p>
              </div>
              <div className="md:hidden p-4 space-y-3">
                {rows.map((row, idx) => {
                  const zeroUnit = row.credit_units === 0;
                  const gradeLetter = zeroUnit
                    ? null
                    : getGradeLetterFromGP(row.selectedGP);

                  return (
                    <motion.article
                      key={row.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      className="rounded-2xl border border-[var(--border)] bg-[var(--bg-base)]/60 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-mono text-sm font-bold text-[var(--text-primary)]">
                            {row.course_code}
                          </p>
                          <p className="mt-1 text-sm text-[var(--text-secondary)] break-words">
                            {row.course_title}
                          </p>
                        </div>
                        <span className="badge bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/20 shrink-0">
                          {row.credit_units} units
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                            Target Grade
                          </p>
                          {zeroUnit ? (
                            <span className="text-xs text-[var(--text-muted)] italic">
                              not counted
                            </span>
                          ) : (
                            <div className="relative">
                              <select
                                value={String(row.selectedGP)}
                                onChange={(e) =>
                                  updateGP(row.id, parseFloat(e.target.value))
                                }
                                className="input-field text-sm appearance-none cursor-pointer pr-8 py-2"
                              >
                                {GRADE_OPTIONS.map((g) => (
                                  <option key={g.value} value={String(g.value)}>
                                    {g.label}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown
                                size={13}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
                              />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                            GP
                          </p>
                          {zeroUnit ? (
                            <span className="text-xs text-[var(--text-muted)]">—</span>
                          ) : (
                            <span
                              className="badge border inline-block"
                              style={gradeLetter ? getGradeBadgeStyle(gradeLetter) : {}}
                            >
                              {gradeLetter}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.article>
                  );
                })}
              </div>

              <div className="hidden md:block overflow-x-auto">
                <table className="w-full table-fixed">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      {["Code", "Course Title", "Units", "Target Grade", "GP"].map(
                        (h) => (
                          <th
                            key={h}
                            className={`${h === "Code" || h === "Course Title" ? "text-left" : "text-center"} px-5 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider`}
                          >
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, idx) => {
                      const zeroUnit = row.credit_units === 0;
                      const gradeLetter = zeroUnit
                        ? null
                        : getGradeLetterFromGP(row.selectedGP);

                      return (
                        <motion.tr
                          key={row.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.04 }}
                          className="border-b border-[var(--border)]/40 hover:bg-[var(--bg-card-hover)] transition-colors"
                        >
                      <td className="px-5 py-3.5">
                        <span className="font-bold font-mono text-sm text-[var(--text-primary)] block truncate">
                          {row.course_code}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-[var(--text-secondary)]">
                        <span className="block truncate">{row.course_title}</span>
                      </td>
                          <td className="px-5 py-3.5 text-center font-mono text-sm text-[var(--text-secondary)]">
                            {row.credit_units}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            {zeroUnit ? (
                              <span className="text-xs text-[var(--text-muted)] italic">
                                not counted
                              </span>
                            ) : (
                              <div className="relative inline-block min-w-[130px]">
                                <select
                                  value={String(row.selectedGP)}
                                  onChange={(e) =>
                                    updateGP(row.id, parseFloat(e.target.value))
                                  }
                                  className="input-field text-sm appearance-none cursor-pointer pr-8 py-2"
                                >
                                  {GRADE_OPTIONS.map((g) => (
                                    <option
                                      key={g.value}
                                      value={String(g.value)}
                                    >
                                      {g.label}
                                    </option>
                                  ))}
                                </select>
                                <ChevronDown
                                  size={13}
                                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
                                />
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-center font-mono text-sm">
                            {zeroUnit ? (
                              <span className="text-[var(--text-muted)]">
                                {"\u2014"}
                              </span>
                            ) : (
                              <span
                                className="badge border inline-block"
                                style={
                                  gradeLetter
                                    ? getGradeBadgeStyle(gradeLetter)
                                    : {}
                                }
                              >
                                {gradeLetter}
                              </span>
                            )}
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1 min-w-0">
            <div className="glass-card p-5 sticky top-6 space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                Live Projection
              </h3>

              <div
                className={`rounded-xl px-4 py-3 border flex items-center justify-between ${
                  goalMet
                    ? "bg-[var(--success)]/10 border-[var(--success)]/20"
                    : "bg-[var(--danger)]/10 border-[var(--danger)]/20"
                }`}
              >
                <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em]">
                  Goal {submittedGoal.toFixed(2)}
                </span>
                <span
                  className={`text-xs font-bold flex items-center gap-1 ${
                    goalMet
                      ? "text-[var(--success)]"
                      : "text-[var(--danger)]"
                  }`}
                >
                  {goalMet ? (
                    <>
                      <TrendingUp size={13} /> On track
                    </>
                  ) : (
                    <>
                      <TrendingDown size={13} /> Below goal
                    </>
                  )}
                </span>
              </div>

              <div className="bg-[var(--bg-base)] rounded-xl p-4 border border-[var(--border)]">
                <p className="text-[var(--text-xs)] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1">
                  Projected Semester GPA
                </p>
                <p className="text-2xl font-bold font-mono text-[var(--text-primary)]">
                  {projectedSemesterGPA.toFixed(2)}
                </p>
              </div>

              <div className="bg-[var(--bg-base)] rounded-xl p-4 border border-[var(--border)]">
                <p className="text-[var(--text-xs)] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1">
                  Projected CGPA
                </p>
                <p className="text-2xl font-bold font-mono text-[var(--accent)]">
                  {projectedCGPA.toFixed(2)}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Current:{" "}
                  <span className="font-mono">{currentCGPA.toFixed(2)}</span>
                </p>
              </div>

              <div className="flex items-center justify-between px-1">
                <span className="text-xs text-[var(--text-muted)]">
                  CGPA Change
                </span>
                <DiffBadge difference={cgpaChange} />
              </div>

              <div className="bg-[var(--accent-soft)] border border-[var(--accent)]/20 rounded-xl p-4">
                <p className="text-[var(--text-xs)] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1">
                  Projected Classification
                </p>
                <p className="text-sm font-semibold text-[var(--accent)]">
                  {getClassificationLabel(projectedCGPA)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

type TabId = "current" | "past" | "goal";

const WhatIf = () => {
  const [searchParams] = useSearchParams();

  // URL param: ?mode=current switches to Current Semester tab
  const modeParam = searchParams.get("mode");
  const semesterParam = searchParams.get("semester") ?? undefined;
  const redirectTargetParam = searchParams.get("target");
  const redirectTarget =
    redirectTargetParam != null && redirectTargetParam !== ""
      ? Number(redirectTargetParam)
      : null;
  const isRedirectedFromGraduationTarget =
    modeParam === "b" && redirectTarget != null && Number.isFinite(redirectTarget);

  const [activeTab, setActiveTab] = useState<TabId>("current");

  useEffect(() => {
    if (isRedirectedFromGraduationTarget) {
      setActiveTab("goal");
    } else if (modeParam === "past") {
      setActiveTab("past");
    } else if (modeParam === "goal") {
      setActiveTab("goal");
    } else {
      setActiveTab("current");
    }
  }, [modeParam, isRedirectedFromGraduationTarget]);

  const tabs: { id: TabId; label: string }[] = [
    { id: "current", label: "Current Semester" },
    { id: "past", label: "Past Semester" },
    { id: "goal", label: "Semester Planner" },
  ];

  return (
    <div className="w-full min-h-screen pb-32 md:pb-8 overflow-y-auto overflow-x-hidden">
      {/* Premium Dashboard Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 mb-8 flex flex-col md:flex-row shadow-2xl"
      >
        {/* Background Effects */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          {/* Soft purple lighting */}
          <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[80px] translate-x-1/3 translate-y-1/3" />

          {/* Dark navy gradient base */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-[#0B1120]/95 to-slate-900/90" />

          {/* Graph lines (subtle grid) */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTAgMGg0MHY0MEgweiIgZmlsbD0ibm9uZSIvPjxwYXRoIGQ9Ik0wIC41aDQwTS41IDB2NDAiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIvPjwvc3ZnPg==')] [mask-image:linear-gradient(to_bottom,white_20%,transparent_100%)] opacity-50" />
        </div>

        {/* Left Side */}
        <div className="relative z-10 flex-1 p-6 md:p-10 flex flex-col justify-center">
          <div className="flex flex-col md:flex-row md:items-center gap-5 mb-8">
            {/* Purple gradient square with Calculator icon */}
            <div className="w-16 h-16 shrink-0 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 p-[1px] shadow-lg shadow-purple-500/20">
              <div className="w-full h-full rounded-2xl bg-slate-900/80 backdrop-blur-md flex items-center justify-center">
                <Calculator className="text-purple-300" size={32} />
              </div>
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-2">
                What-If Grade Simulator
              </h1>
              <p className="text-slate-400 text-sm md:text-base">
                Explore grade scenarios and see exactly where your CGPA lands.
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="inline-flex p-1.5 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl max-w-full overflow-x-auto no-scrollbar self-start">
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="relative px-6 py-2.5 text-sm font-semibold rounded-xl transition-colors shrink-0"
                >
                  {active && (
                    <motion.div
                      layoutId="activeTabHero"
                      className="absolute inset-0 bg-slate-700/80 rounded-xl border border-slate-600/50 shadow-sm"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <span
                    className={`relative z-10 ${
                      active ? "text-white" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right / Bottom Side - Decorative Analytics */}
        <div className="relative z-10 md:w-[380px] md:border-l border-t md:border-t-0 border-slate-800/50 bg-slate-800/10 p-6 md:p-8 flex flex-col justify-end overflow-hidden">
          {/* Subtle background artwork (Hidden on mobile) */}
          <div className="hidden md:flex absolute inset-0 pointer-events-none opacity-30 items-center justify-center">
            {/* Graph/Projection lines */}
            <svg
              className="absolute w-full h-full left-0 top-0"
              preserveAspectRatio="none"
              viewBox="0 0 100 100"
            >
              <path
                d="M-10,80 Q25,70 50,40 T110,10"
                fill="none"
                stroke="url(#purpleGrad)"
                strokeWidth="1.5"
              />
              <path
                d="M-10,90 Q30,85 60,60 T110,30"
                fill="none"
                stroke="url(#blueGrad)"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <defs>
                <linearGradient id="purpleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#A855F7" stopOpacity="0" />
                  <stop offset="50%" stopColor="#A855F7" />
                  <stop offset="100%" stopColor="#A855F7" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="blueGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0" />
                  <stop offset="100%" stopColor="#3B82F6" />
                </linearGradient>
              </defs>
            </svg>

            {/* Projection Card */}
            <div className="absolute top-8 right-16 w-32 h-24 rounded-xl border border-white/10 bg-white/[0.02] backdrop-blur-md transform rotate-12 shadow-2xl flex flex-col justify-center p-3 gap-2">
              <div className="flex items-center justify-between">
                <div className="w-8 h-2 bg-white/20 rounded-full" />
                <div className="w-4 h-4 rounded-full bg-purple-500/20" />
              </div>
              <div className="w-full h-12 bg-white/5 rounded flex items-end p-1 gap-1">
                <div className="w-full h-[40%] bg-purple-500/20 rounded-sm" />
                <div className="w-full h-[70%] bg-purple-500/40 rounded-sm" />
                <div className="w-full h-[100%] bg-purple-500/60 rounded-sm" />
              </div>
            </div>

            {/* Calculator Icon floating */}
            <div className="absolute bottom-24 right-4 w-12 h-12 rounded-full border border-purple-500/20 bg-purple-500/5 backdrop-blur-sm flex items-center justify-center transform -rotate-12">
              <Calculator className="text-purple-400/30" size={20} />
            </div>
          </div>
          
        </div>
      </motion.div>

      {/*  Tab content  */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-4 sm:p-6 overflow-hidden"
      >
        <AnimatePresence mode="wait">
          {activeTab === "goal" ? (
            <motion.div
              key="goal"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.18 }}
            >
              <GoalPlannerMode redirectedTarget={redirectTarget} />
            </motion.div>
          ) : activeTab === "current" ? (
            <motion.div
              key="current"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.18 }}
            >
              <CurrentSemesterMode semesterIdOverride={semesterParam} />
            </motion.div>
          ) : (
            <motion.div
              key="past"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.18 }}
            >
              <PastSemesterMode />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default WhatIf;

import { type ReactNode, useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import { motion } from "framer-motion";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Award,
  BookOpen,
  Calculator,
  CalendarDays,
  AlertTriangle,
  ChevronRight,
  GraduationCap,
  Layers3,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
} from "lucide-react";
import LoadingScreen from "../components/LoadingScreen";
import SemesterTargetModal from "../components/SemesterTargetModal";
import {
  PROGRAM_TOTAL_COURSES,
  PROGRAM_TOTAL_SEMESTERS,
} from "../config/program";

interface SemesterGPA {
  semester_id: string;
  semester_name: string;
  academic_year: string;
  level: number;
  semester_number: number;
  gpa: number;
  total_units: number;
  courses_count: number;
  graded_courses_count?: number;
}

interface CurrentSemester {
  id: string;
  name: string;
  level: number;
  semester_number: number;
  academic_year: string;
  target_gpa?: number | null;
  gpa: number;
  courses_count: number;
  graded_courses_count?: number;
  total_units: number;
}

interface Analytics {
  cgpa: number;
  total_units_earned: number;
  total_courses: number;
  completed_semesters_count?: number;
  semester_gpas: SemesterGPA[];
  current_semester: CurrentSemester | null;
  best_semester: SemesterGPA | null;
  worst_semester: SemesterGPA | null;
}



const getCGPAClass = (cgpa: number) => {
  if (cgpa >= 4.5) return "First Class";
  if (cgpa >= 3.5) return "Second Class Upper";
  if (cgpa >= 2.5) return "Second Class Lower";
  if (cgpa >= 1.5) return "Third Class";
  return "Pass";
};

const getClassificationTone = (cgpa: number) => {
  if (cgpa >= 4.5) {
    return {
      label: "text-[var(--success)]",
      chip: "badge-success",
    };
  }

  if (cgpa >= 3.5) {
    return {
      label: "text-[var(--accent)]",
      chip: "badge-accent",
    };
  }

  if (cgpa >= 2.5) {
    return {
      label: "text-[var(--warning)]",
      chip: "badge-warning",
    };
  }

  return {
    label: "text-[#94a3b8]",
    chip: "badge-pass",
  };
};

const formatSemesterNumber = (semesterNumber: number) => {
  if (semesterNumber === 1) return "1st Semester";
  if (semesterNumber === 2) return "2nd Semester";
  return `${semesterNumber}th Semester`;
};

const formatSemesterLevelLabel = (
  level: number,
  semesterNumber: number,
) => `${level}L \u00B7 ${formatSemesterNumber(semesterNumber)}`;

const formatTrendLabel = (level: number, semesterNumber: number) =>
  `${level}L ${semesterNumber === 1 ? "1st" : semesterNumber === 2 ? "2nd" : `${semesterNumber}th`} Sem`;

const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-US").format(value);

type SemesterCardState = "NO_SEMESTER" | "NO_GRADES" | "HAS_GRADES";

const coerceFiniteNumber = (value: unknown): number | null => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const getAspirationMessage = (
  prevGPA: number,
  targetGPA?: number | null,
): string => {
  const normalizedTarget = coerceFiniteNumber(targetGPA);
  if (normalizedTarget != null) {
    return `Your target this semester is ${normalizedTarget.toFixed(2)} \u2014 make it count.`;
  }
  if (prevGPA >= 4.5) {
    return "Great form. Push for a perfect 5.00 this semester.";
  }
  if (prevGPA >= 3.5) {
    return "First Class is within reach \u2014 aim for 4.50 or above.";
  }
  if (prevGPA >= 2.4) {
    return "Solid base. Move into Second Class Upper this semester.";
  }
  return "Every semester is a fresh start \u2014 let's make this one count.";
};

const getTargetFeedback = (actualGPA: number, targetGPA: number): string => {
  const diff = actualGPA - targetGPA;
  if (diff >= 0) {
    return `You hit your target of ${targetGPA.toFixed(2)} \u2014 well done.`;
  }
  if (diff >= -0.3) {
    return `So close \u2014 you missed your ${targetGPA.toFixed(2)} target by ${Math.abs(diff).toFixed(2)}.`;
  }
  return `Didn't reach ${targetGPA.toFixed(2)} this time. Set a new target and go again.`;
};



const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: SemesterGPA; value?: number }>;
}) => {
  if (!active || !payload?.length || !payload[0]?.payload) return null;

  const item = payload[0].payload;

  return (
    <div className="glass-card p-4 text-sm min-w-[180px]">
      <p className="text-[var(--text-primary)] font-semibold">
        {item.semester_name}
      </p>
      <p className="text-[var(--text-secondary)] text-xs mt-0.5">
        {item.academic_year}
      </p>
      <p className="text-[var(--accent)] font-bold font-mono text-lg mt-3">
        {item.gpa.toFixed(2)}
      </p>
      <p className="text-[var(--text-muted)] text-xs mt-1">
        {item.courses_count} courses {"\u00B7"} {item.total_units} units
      </p>
    </div>
  );
};

const TrendDot = ({
  cx,
  cy,
  payload,
  currentSemesterId,
}: {
  cx?: number;
  cy?: number;
  payload?: SemesterGPA;
  currentSemesterId?: string | null;
}) => {
  if (cx == null || cy == null) return null;

  const isCurrentSemester = payload?.semester_id === currentSemesterId;

  return (
    <g>
      {isCurrentSemester && (
        <circle
          cx={cx}
          cy={cy}
          r={12}
          fill="var(--accent-soft)"
          opacity="0.85"
        />
      )}
      <circle
        cx={cx}
        cy={cy}
        r={isCurrentSemester ? 6.5 : 4.5}
        fill={isCurrentSemester ? "var(--accent)" : "var(--text-muted)"}
        stroke="var(--bg-card)"
        strokeWidth={2}
      />
    </g>
  );
};

const getLowestSemesterStandingContext = (gpa: number) => {
  const standing = getCGPAClass(gpa);
  if (gpa >= 3.5) {
    return `Still maintained ${standing} standing.`;
  }
  if (gpa >= 2.5) {
    return `Maintained ${standing} standing.`;
  }
  return `An analytical baseline for upward growth.`;
};

const MiniSparkline = ({ direction }: { direction: "up" | "down" | "steady" }) => {
  const points =
    direction === "down"
      ? "8 12 18 14 28 10 40 20 52 18"
      : direction === "steady"
        ? "8 18 18 16 28 17 40 16 52 15"
        : "8 20 18 18 28 14 40 10 52 12";

  return (
    <svg
      viewBox="0 0 60 28"
      className="h-8 w-16"
      aria-hidden="true"
      fill="none"
    >
      <path
        d="M2 24h56"
        stroke="var(--border)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <polyline
        points={points}
        stroke="var(--accent)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="52" cy={direction === "up" ? 12 : direction === "down" ? 18 : 15} r="3.5" fill="var(--accent)" />
    </svg>
  );
};

const EmptyPanel = ({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) => {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-[24px] border border-dashed border-[var(--border)] bg-[var(--bg-base)]/55 px-6 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
        {icon}
      </div>
      <h4 className="text-[var(--text-primary)] font-semibold">{title}</h4>
      <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--text-secondary)]">
        {description}
      </p>
      {action}
    </div>
  );
};

function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < breakpoint : false,
  );
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [breakpoint]);
  return isMobile;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [targetModalOpen, setTargetModalOpen] = useState(false);
  const isMobile = useIsMobile();

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await api.get("/analytics");
      setAnalytics({
        ...res.data,
        current_semester: res.data?.current_semester
          ? {
              ...res.data.current_semester,
              target_gpa: coerceFiniteNumber(
                res.data.current_semester.target_gpa,
              ),
            }
          : null,
      });
    } catch (err) {
      console.error(err);
      setError("Couldn't load your dashboard. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) return <LoadingScreen />;
  if (error) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <EmptyPanel
          icon={<AlertTriangle size={20} />}
          title="Couldn't load your dashboard"
          description={error}
          action={
            <button type="button" onClick={() => void fetchAnalytics()} className="btn btn-primary">
              Retry
            </button>
          }
        />
      </div>
    );
  }

  const semesterGpas = analytics?.semester_gpas ?? [];
  const filteredSemesterGpas = semesterGpas.filter(
    (semester) => semester.graded_courses_count != null && semester.graded_courses_count > 0
  );
  const trendChartData = filteredSemesterGpas.map((semester) => ({
    ...semester,
    semester_label: formatTrendLabel(
      semester.level,
      semester.semester_number,
    ),
  }));

  const hasCourseData = (analytics?.total_courses ?? 0) > 0;
  const currentSemester = analytics?.current_semester ?? null;
  const currentSemesterCourseCount = currentSemester?.graded_courses_count ?? 0;
  const currentSemesterState: SemesterCardState = !currentSemester
    ? "NO_SEMESTER"
    : currentSemesterCourseCount === 0
      ? "NO_GRADES"
      : "HAS_GRADES";
  const cgpa = analytics?.cgpa ?? 0;
  const classification = getCGPAClass(cgpa);
  const classificationTone = getClassificationTone(cgpa);

  const semesterCount =
    analytics?.completed_semesters_count ?? semesterGpas.length;
  const completedSemesterGpas = semesterGpas
    .filter((semester) => semester.semester_id !== currentSemester?.id)
    .filter((semester) => (semester.graded_courses_count ?? 0) > 0)
    .slice()
    .sort((a, b) => {
      if (a.level !== b.level) return a.level - b.level;
      return a.semester_number - b.semester_number;
    });
  const previousSemesterGpa =
    completedSemesterGpas[completedSemesterGpas.length - 1]?.gpa ?? 0;
  const currentSemesterTargetGpa = coerceFiniteNumber(currentSemester?.target_gpa);

  const orderedTrend = semesterGpas
    .filter((semester) => semester.courses_count > 0)
    .slice()
    .sort((a, b) => {
      if (a.level !== b.level) return a.level - b.level;
      return a.semester_number - b.semester_number;
    });

  let trendDirection: "up" | "down" | "steady" = "steady";
  if (orderedTrend.length >= 2) {
    const last = orderedTrend[orderedTrend.length - 1];
    const previous = orderedTrend[orderedTrend.length - 2];
    const delta = last.gpa - previous.gpa;
    if (delta > 0.05) trendDirection = "up";
    else if (delta < -0.05) trendDirection = "down";
  } else if (currentSemesterState === "HAS_GRADES" && analytics?.best_semester) {
    const delta = currentSemester!.gpa - analytics.best_semester.gpa;
    if (delta > 0.05) trendDirection = "up";
    else if (delta < -0.05) trendDirection = "down";
  }

  const encouragementContent = {
    up: {
      title: "Recent improvement detected",
      description:
        "Your GPA has shown a positive upward trend in recent semesters. Continuing with your current study habits and course load will help sustain this momentum.",
      icon: <TrendingUp size={18} />,
    },
    down: {
      title: "CGPA remains on track",
      description:
        "While your recent semester GPA had a minor adjustment, your cumulative GPA remains on a solid foundation. Strategic course selection can help raise the curve.",
      icon: <Target size={18} />,
    },
    steady: {
      title: "Strong consistency detected",
      description:
        "Your academic performance remains stable across semesters. This reliable baseline provides a strong foundation for your remaining program requirements.",
      icon: <Sparkles size={18} />,
    },
  }[trendDirection];

  const greetingHour = new Date().getHours();
  const greeting =
    greetingHour < 12
      ? "Good morning"
      : greetingHour < 17
        ? "Good afternoon"
        : "Good evening";
  const firstName = user?.name?.split(" ")[0] || "there";

  return (
    <div className="space-y-8">
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[var(--text-2xl)] font-bold tracking-[-0.03em] text-[var(--text-primary)] sm:text-[var(--text-3xl)]">
              {greeting}, {firstName}
            </h1>
            {currentSemester && (
              <span className="badge border border-[var(--accent)]/20 bg-[var(--accent-soft)] px-3 py-1 text-[var(--accent)]">
                {formatSemesterLevelLabel(
                  currentSemester.level,
                  currentSemester.semester_number,
                )}
              </span>
            )}
          </div>
          <p className="max-w-2xl text-[var(--text-base)] text-[var(--text-secondary)]">
            Stay consistent today, excel tomorrow.
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2 shadow-[var(--shadow-card)]">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--accent)]/20 bg-[var(--accent-soft)] text-[var(--accent)]">
            <Award size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">
              Academic standing
            </p>
            <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
              {classification}
            </p>
          </div>
        </div>
      </motion.section>

      {/* Quick Access Section */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        className="hidden lg:block rounded-[28px] border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)]"
      >
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
            Command Center
          </p>
          <h2 className="mt-1 text-[var(--text-lg)] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
            Quick Actions
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <QuickActionCard
            to="/whatif"
            icon={<Calculator size={20} />}
            title="Calculate GPA"
            description="GPA tools & analysis"
          />
          <QuickActionCard
            to="/whatif"
            icon={<Sparkles size={20} />}
            title="What-If Simulator"
            description="Model grade scenarios"
          />
          <QuickActionCard
            to="/graduation-target"
            icon={<Target size={20} />}
            title="Target"
            description="Track target CGPA"
          />
          <QuickActionCard
            to="/semesters"
            icon={<CalendarDays size={20} />}
            title="Plan Next Semester"
            description="Organize courses"
          />
          <QuickActionCard
            to="/courses"
            icon={<BookOpen size={20} />}
            title="Course Manager"
            description="Manage your courses"
          />
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08 }}
        className="grid gap-4 xl:grid-cols-5"
      >
        <article className="relative overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-card)] xl:col-span-1">
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-soft)]/80 via-transparent to-transparent opacity-70" />
          <div className="relative flex h-full flex-col justify-between gap-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                  Overall GPA
                </p>
                <p className="mt-3 font-mono text-4xl font-semibold tracking-tight text-[var(--text-primary)]">
                  {cgpa.toFixed(2)}
                </p>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--accent)]/20 bg-[var(--accent-soft)] text-[var(--accent)]">
                <GraduationCap size={28} />
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className={`badge ${classificationTone.chip}`}>
                {classification}
              </span>
              <span className="text-sm text-[var(--text-muted)]">out of 5.00</span>
            </div>
          </div>
        </article>

        <article className="rounded-[24px] border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-card)] xl:col-span-1">
          <div className="flex h-full flex-col justify-between gap-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                  {currentSemesterState === "NO_SEMESTER"
                    ? "CURRENT SEMESTER"
                    : currentSemesterState === "NO_GRADES"
                      ? "LAST SEMESTER GPA"
                      : "Current Semester GPA"}
                </p>
                {currentSemesterState === "NO_SEMESTER" ? (
                  <>
                    <p className="mt-3 text-[var(--text-2xl)] font-semibold tracking-tight text-[var(--text-primary)]">
                      No active semester
                    </p>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">
                      Set up your semester to start tracking
                    </p>
                    <Link
                      to="/semesters"
                      className="mt-4 inline-flex w-fit items-center gap-2 rounded-full border border-[var(--accent)]/20 bg-[var(--accent-soft)] px-4 py-2 text-sm font-semibold text-[var(--accent)] transition-colors hover:border-[var(--accent)]/35 hover:bg-[var(--accent)]/10"
                    >
                      Start Semester <span aria-hidden="true">{"\u2192"}</span>
                    </Link>
                  </>
                ) : currentSemesterState === "NO_GRADES" ? (
                  <>
                    <p className="mt-3 font-mono text-4xl font-semibold tracking-tight text-[var(--text-primary)]">
                      {previousSemesterGpa.toFixed(2)}
                    </p>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">
                      {getAspirationMessage(
                        previousSemesterGpa,
                        currentSemesterTargetGpa,
                      )}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      {currentSemesterTargetGpa != null ? (
                        <span className="badge border border-[var(--accent)]/20 bg-[var(--accent-soft)] text-[var(--accent)]">
                          Target: {currentSemesterTargetGpa.toFixed(2)}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setTargetModalOpen(true)}
                          className="inline-flex items-center gap-1 rounded-full border border-dashed border-[var(--border)] bg-[var(--bg-base)]/60 px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] transition-colors hover:border-[var(--accent)]/25 hover:text-[var(--text-primary)]"
                        >
                          Set a target <span aria-hidden="true">{"\u2192"}</span>
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <p className="mt-3 font-mono text-4xl font-semibold tracking-tight text-[var(--text-primary)]">
                      {currentSemester?.gpa.toFixed(2)}
                    </p>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  {getCGPAClass(currentSemester!.gpa)} {"\u00B7"}{" "}
                      {currentSemesterCourseCount} courses
                    </p>
                  </>
                )}
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
                <TrendingUp size={22} />
              </div>
            </div>
            {currentSemesterState === "HAS_GRADES" && (
              <span
                className={`badge w-fit ${getClassificationTone(currentSemester!.gpa).chip}`}
              >
                {getCGPAClass(currentSemester!.gpa)}
              </span>
            )}
            {currentSemesterState === "HAS_GRADES" &&
              currentSemesterTargetGpa != null && (
                <p className="text-sm text-[var(--text-secondary)]">
                  {getTargetFeedback(
                    currentSemester!.gpa,
                    currentSemesterTargetGpa,
                  )}
                </p>
              )}
          </div>
        </article>

        <article className="rounded-[24px] border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-card)]">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
            Credit Units Earned
          </p>
          <p className="mt-3 font-mono text-4xl font-semibold tracking-tight text-[var(--text-primary)]">
            {formatNumber(analytics?.total_units_earned ?? 0)}
          </p>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Total earned
          </p>
        </article>

        <article className="rounded-[24px] border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-card)]">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
            Courses
          </p>
          <p className="mt-3 font-mono text-4xl font-semibold tracking-tight text-[var(--text-primary)]">
            {formatNumber(analytics?.total_courses ?? 0)}
          </p>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Across all semesters
          </p>
        </article>

        <article className="rounded-[24px] border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-card)]">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
            Semesters
          </p>
          <p className="mt-3 font-mono text-4xl font-semibold tracking-tight text-[var(--text-primary)]">
            {formatNumber(semesterCount)}
          </p>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">Completed</p>
        </article>
      </motion.section>

      <div className="grid gap-6 xl:grid-cols-[1.55fr_0.95fr]">
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="rounded-[28px] border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)]"
        >
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                Performance
              </p>
              <h2 className="mt-2 text-[var(--text-xl)] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
                GPA Trend
              </h2>
            </div>


          </div>

          {hasCourseData && filteredSemesterGpas.length > 0 ? (
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={trendChartData}
                  margin={{ top: 8, right: 8, left: 0, bottom: isMobile ? 44 : 8 }}
                >
                  <defs>
                    <linearGradient id="trendLine" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.45" />
                      <stop offset="100%" stopColor="var(--accent)" stopOpacity="1" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="semester_label"
                    tickLine={false}
                    axisLine={{ stroke: "var(--border)" }}
                    tick={{ fill: "var(--text-muted)", fontSize: isMobile ? 10 : 12 }}
                    interval={isMobile ? "preserveStartEnd" : 0}
                    angle={isMobile ? -35 : 0}
                    textAnchor={isMobile ? "end" : "middle"}
                    height={isMobile ? 50 : 30}
                  />
                  <YAxis
                    domain={[0, 5]}
                    ticks={[0, 1, 2, 3, 4, 5]}
                    tickLine={false}
                    axisLine={{ stroke: "var(--border)" }}
                    tick={{ fill: "var(--text-muted)", fontSize: 12 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="gpa"
                    stroke="url(#trendLine)"
                    strokeWidth={3}
                    dot={(props: any) => (
                      <TrendDot
                        {...props}
                        currentSemesterId={currentSemester?.id}
                      />
                    )}
                    activeDot={{
                      r: 8,
                      fill: "var(--accent)",
                      stroke: "var(--bg-card)",
                      strokeWidth: 2,
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyPanel
              icon={<Sparkles size={20} />}
              title="No GPA trend yet"
              description="Add courses to your semesters and the trend chart will populate here automatically."
            />
          )}
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.14 }}
          className="rounded-[28px] border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)]"
        >
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
              Snapshot
            </p>
            <h2 className="mt-2 text-[var(--text-xl)] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
              At a Glance
            </h2>
          </div>

          <div className="space-y-3">
            <InsightRow
              icon={<Award size={18} />}
              label="Academic Standing"
              value={classification}
              tone={classificationTone.chip}
            />
            <InsightRow
              icon={<Target size={18} />}
              label="Total Credit Units"
              value={formatNumber(analytics?.total_units_earned ?? 0)}
            />
            <InsightRow
              icon={<GraduationCap size={18} />}
              label="Overall GPA"
              value={`${cgpa.toFixed(2)} / 5.00`}
            />
            <InsightRow
              icon={<BookOpen size={18} />}
              label="Courses Completed"
              value={`${formatNumber(analytics?.total_courses ?? 0)} / ${PROGRAM_TOTAL_COURSES}`}
            />
            <InsightRow
              icon={<Layers3 size={18} />}
              label="Semesters Completed"
              value={`${formatNumber(semesterCount)} / ${PROGRAM_TOTAL_SEMESTERS}`}
            />
          </div>
        </motion.section>
      </div>

      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.18 }}
        className="rounded-[28px] border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)]"
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
              Momentum
            </p>
            <h2 className="mt-2 text-[var(--text-xl)] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
              Semester Highlights
            </h2>
          </div>
          <div className="hidden sm:block">
            <MiniSparkline direction={trendDirection} />
          </div>
        </div>

        {analytics?.best_semester || analytics?.worst_semester ? (
          <div className="grid gap-4 lg:grid-cols-3">
            <article className="rounded-[24px] border border-[var(--border)] bg-[var(--bg-base)]/70 p-5 flex flex-col justify-between min-h-[200px]">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                      Encouragement
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
                      {encouragementContent.title}
                    </h3>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
                    {encouragementContent.icon}
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">
                  {encouragementContent.description}
                </p>
              </div>
              <div className="mt-4 pt-2 border-t border-[var(--border)] flex items-center justify-between">
                <span className="text-xs text-[var(--text-muted)]">Performance Trend</span>
                <MiniSparkline direction={trendDirection} />
              </div>
            </article>

            <article className="rounded-[24px] border border-[var(--success)]/20 bg-[var(--success)]/8 p-5 flex flex-col justify-between min-h-[200px]">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--success)]">
                      Best Semester
                    </p>
                    <h3 className="mt-2 text-[var(--text-primary)] font-semibold">
                      {analytics.best_semester?.semester_name ?? "No data yet"}
                    </h3>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--success)]/10 text-[var(--success)]">
                    <Trophy size={20} />
                  </div>
                </div>
                {analytics.best_semester ? (
                  <>
                    <p className="mt-5 font-mono text-3xl font-semibold text-[var(--success)]">
                      {analytics.best_semester.gpa.toFixed(2)}
                    </p>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">
                      {analytics.best_semester.courses_count} courses {"\u00B7"}{" "}
                      {analytics.best_semester.total_units} units
                    </p>
                  </>
                ) : (
                  <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">
                    Add graded courses and the strongest semester will appear here.
                  </p>
                )}
              </div>
              <div className="mt-4 pt-2 border-t border-[var(--success)]/10 flex items-center justify-between text-xs text-[var(--success)]/80">
                <span>Top Academic Mark</span>
                <span>Excellent Standing</span>
              </div>
            </article>

            <article className="rounded-[24px] border border-[var(--border)] bg-[var(--bg-base)]/70 p-5 flex flex-col justify-between min-h-[200px]">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                      Lowest Semester Performance
                    </p>
                    <h3 className="mt-2 text-[var(--text-primary)] font-semibold">
                      {analytics.worst_semester?.semester_name ?? "No data yet"}
                    </h3>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--border)] bg-[var(--bg-card)] text-[var(--text-secondary)]">
                    <TrendingDown size={18} />
                  </div>
                </div>
                {analytics.worst_semester ? (
                  <>
                    <p className="mt-5 font-mono text-3xl font-semibold text-[var(--text-primary)]">
                      {analytics.worst_semester.gpa.toFixed(2)}
                    </p>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">
                      {analytics.worst_semester.courses_count} courses {"\u00B7"}{" "}
                      {analytics.worst_semester.total_units} units
                    </p>
                  </>
                ) : (
                  <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">
                    Once you add graded semesters, the lowest point will show up here.
                  </p>
                )}
              </div>
              {analytics.worst_semester && (
                <div className="mt-4 pt-2 border-t border-[var(--border)] text-xs text-[var(--text-muted)] italic">
                  {getLowestSemesterStandingContext(analytics.worst_semester.gpa)}
                </div>
              )}
            </article>
          </div>
        ) : (
          <EmptyPanel
            icon={<Sparkles size={20} />}
            title="No semester highlights yet"
            description="Once you record graded courses, your best, lowest, and momentum cards will appear here."
          />
        )}
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.22 }}
        className="rounded-[28px] border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)]"
      >
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
            Next steps
          </p>
          <h2 className="mt-2 text-[var(--text-xl)] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
            What&apos;s Next?
          </h2>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <NextLinkCard
            to="/semesters"
            icon={<CalendarDays size={22} />}
            title="Plan Your Next Semester"
            description="Organize your upcoming semester and keep your academic rhythm steady."
          />
          <NextLinkCard
            to="/whatif"
            icon={<TrendingUp size={22} />}
            title="Improve Your GPA"
            description="Test realistic scenarios and see what it takes to raise your CGPA."
          />
          <NextLinkCard
            to="/whatif"
            icon={<Sparkles size={22} />}
            title="Run What-If Scenarios"
            description="Model different grade combinations and compare their CGPA impact."
          />
        </div>
      </motion.section>

      {currentSemester && (
        <SemesterTargetModal
          isOpen={targetModalOpen}
          onClose={() => setTargetModalOpen(false)}
          semesterId={currentSemester.id}
          initialTargetGpa={currentSemesterTargetGpa}
          onSaved={(targetGpa) => {
            setAnalytics((current) =>
              current
                ? {
                    ...current,
                    current_semester: current.current_semester
                      ? {
                          ...current.current_semester,
                          target_gpa: targetGpa,
                        }
                      : current.current_semester,
                  }
                : current,
            );
          }}
        />
      )}
    </div>
  );
};

const InsightRow = ({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone?: string;
}) => {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[22px] border border-[var(--border)] bg-[var(--bg-base)]/60 px-4 py-3">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--accent-soft)] ${tone ?? "text-[var(--accent)]"}`}
        >
          {icon}
        </div>
        <span className="text-sm font-medium text-[var(--text-primary)]">
          {label}
        </span>
      </div>
      <span className="text-right text-sm font-semibold text-[var(--text-secondary)]">
        {value}
      </span>
    </div>
  );
};



const NextLinkCard = ({
  to,
  icon,
  title,
  description,
}: {
  to: string;
  icon: ReactNode;
  title: string;
  description: string;
}) => {
  return (
    <Link
      to={to}
      className="group flex items-center justify-between gap-4 rounded-[24px] border border-[var(--border)] bg-[var(--bg-base)]/60 p-5 transition-all hover:-translate-y-0.5 hover:border-[var(--accent)]/20 hover:bg-[var(--bg-card-hover)]"
    >
      <div className="flex min-w-0 items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
          {icon}
        </div>
        <div className="min-w-0">
          <h3 className="text-[var(--text-primary)] font-semibold">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
            {description}
          </p>
        </div>
      </div>
      <ChevronRight
        size={20}
        className="shrink-0 text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--accent)]"
      />
    </Link>
  );
};

const QuickActionCard = ({
  to,
  icon,
  title,
  description,
}: {
  to: string;
  icon: ReactNode;
  title: string;
  description: string;
}) => {
  return (
    <Link
      to={to}
      className="group flex items-center gap-4 rounded-[20px] border border-[var(--border)] bg-[var(--bg-base)]/55 p-4 transition-all duration-150 hover:-translate-y-0.5 hover:border-[var(--accent)]/30 hover:bg-[var(--bg-card-hover)] hover:shadow-md"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)] group-hover:bg-[var(--accent)] group-hover:text-white transition-all duration-150">
        {icon}
      </div>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors truncate">
          {title}
        </h3>
        <p className="mt-0.5 text-xs text-[var(--text-muted)] truncate">
          {description}
        </p>
      </div>
    </Link>
  );
};

export default Dashboard;

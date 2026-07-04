import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../api/axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Plus,
  Edit3,
  Trash2,
  GraduationCap,
  Filter,
  Upload,
  TrendingUp,
  BookOpen,
  ArrowUpDown,
} from "lucide-react";
import Modal from "../components/Modal";
import LoadingScreen from "../components/LoadingScreen";
import EmptyState from "../components/EmptyState";
import { getGradeBadgeStyle } from "../utils/gradeColors";
import { titleCase } from "../utils/titleCase";

interface Semester {
  id: string;
  name: string;
  academic_year: string;
  level: number;
  semester_number: number;
  is_current: boolean;
}

interface Course {
  id: string;
  semester_id: string;
  course_code: string;
  course_title: string;
  credit_units: number;
  score: number | null;
  grade: string | null;
  grade_point: number | null;
}

interface ImportCourse {
  course_code: string;
  course_title: string;
  credit_units: number;
  score: number | null;
}

const scoreToGrade = (score: number) => {
  if (score >= 70) return "A";
  if (score >= 60) return "B";
  if (score >= 50) return "C";
  if (score >= 45) return "D";
  if (score >= 40) return "E";
  return "F";
};

const toUpper = (str: string) => (str || "").toUpperCase().replace(/\s+/g, "");

type SortField =
  | "course_code"
  | "course_title"
  | "credit_units"
  | "score"
  | "grade"
  | "grade_point";

const parseCsvLine = (line: string) => {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
};

const parseCsvCourses = (text: string): ImportCourse[] => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0 || !lines[0].includes(",")) return [];

  const rows = lines.map(parseCsvLine);
  const headers = rows[0].map((header) =>
    header.toLowerCase().replace(/[^a-z0-9]/g, ""),
  );
  const codeIndex = headers.findIndex((h) =>
    ["coursecode", "code"].includes(h),
  );
  const titleIndex = headers.findIndex((h) =>
    ["coursetitle", "coursename", "title", "name"].includes(h),
  );
  const unitIndex = headers.findIndex((h) =>
    ["creditunits", "units", "unit"].includes(h),
  );
  const scoreIndex = headers.findIndex((h) => h === "score");

  if (codeIndex === -1 || titleIndex === -1 || unitIndex === -1) return [];

  return rows
    .slice(1)
    .map((row) => ({
      course_code: toUpper(row[codeIndex]),
      course_title: titleCase(row[titleIndex]),
      credit_units: parseInt(row[unitIndex], 10),
      score:
        scoreIndex === -1 || row[scoreIndex] === ""
          ? null
          : parseFloat(row[scoreIndex]),
    }))
    .filter(
      (course) =>
        course.course_code &&
        course.course_title &&
        Number.isFinite(course.credit_units),
    );
};

const parseCalebCourseForm = (text: string): ImportCourse[] =>
  text
    .replace(/\u00a0/g, " ")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .map((line): ImportCourse | null => {
      const row = line.match(/^(\d+)\s+(.+?)\s+(\d+)\s+[A-Z]\s*$/);
      if (!row) return null;

      const [, , body, units] = row;
      const codeMatch = body.match(/^((?:[A-Z]\s*){2,4}(?:\d\s*){3})/);
      if (!codeMatch) return null;

      const codeRaw = codeMatch[1];
      const titleRaw = body.slice(codeRaw.length).trim();
      const title = titleRaw.replace(/\s+/g, " ");

      return {
        course_code: codeRaw.replace(/\s+/g, ""),
        course_title: titleCase(title),
        credit_units: parseInt(units, 10),
        score: null,
      };
    })
    .filter((course): course is ImportCourse => Boolean(course));

const parseImportCourses = (text: string): ImportCourse[] => {
  const csvCourses = parseCsvCourses(text);
  if (csvCourses.length > 0) return csvCourses;
  return parseCalebCourseForm(text);
};

const isLaterSemester = (a: Semester, b: Semester | null) => {
  if (!b) return true;
  if (a.level !== b.level) return a.level > b.level;
  return a.semester_number > b.semester_number;
};

const Courses = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedSemester, setSelectedSemester] = useState("");
  const [loading, setLoading] = useState(true);
  const [semesterError, setSemesterError] = useState<string | null>(null);
  const [courseError, setCourseError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalView, setModalView] = useState<"single" | "import">("single");
  const [editing, setEditing] = useState<Course | null>(null);
  const [formData, setFormData] = useState({
    course_code: "",
    course_title: "",
    credit_units: "",
    score: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [creditUnitsError, setCreditUnitsError] = useState("");
  const [scoreError, setScoreError] = useState("");
  const [importText, setImportText] = useState("");
  const [importCourses, setImportCourses] = useState<ImportCourse[]>([]);
  const [importError, setImportError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [sortField, setSortField] = useState<SortField>(() => {
    return (localStorage.getItem("gradeflow_sort_field") as SortField) || "course_code";
  });
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(() => {
    return (localStorage.getItem("gradeflow_sort_order") as "asc" | "desc") || "asc";
  });
  const [tempField, setTempField] = useState<SortField>("course_code");
  const [tempOrder, setTempOrder] = useState<"asc" | "desc">("asc");
  const [sortOpen, setSortOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSortOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const getSortLabel = (field: SortField, order: "asc" | "desc") => {
    const labelMap: Record<SortField, string> = {
      course_code: "Code",
      course_title: "Title",
      credit_units: "Units",
      score: "Score",
      grade: "Grade",
      grade_point: "Points",
    };
    const orderMap: Record<SortField, { asc: string; desc: string }> = {
      course_code: { asc: "A → Z", desc: "Z → A" },
      course_title: { asc: "A → Z", desc: "Z → A" },
      credit_units: { asc: "Low → High", desc: "High → Low" },
      score: { asc: "Lowest First", desc: "Highest First" },
      grade: { asc: "Best → Worst", desc: "Worst → Best" },
      grade_point: { asc: "Low → High", desc: "High → Low" },
    };
    return `${labelMap[field]} • ${orderMap[field][order]}`;
  };

  const fetchSemesters = useCallback(async () => {
    try {
      setSemesterError(null);
      const res = await api.get("/semesters");
      setSemesters(res.data);
      const param = searchParams.get("semester");
      if (param) setSelectedSemester(param);
      else if (res.data.length > 0) {
        const currentSemester = res.data.reduce(
          (latest: Semester | null, sem: Semester) =>
            isLaterSemester(sem, latest) ? sem : latest,
          null,
        );
        setSelectedSemester(currentSemester?.id || res.data[0].id);
      }
    } catch (err) {
      console.error(err);
      setSemesterError("Couldn't load semesters. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  const fetchCourses = useCallback(async (semesterId: string) => {
    if (!semesterId) return;

    try {
      setCourseError(null);
      const res = await api.get(`/courses/${semesterId}`);
      setCourses(res.data);
    } catch (err) {
      console.error(err);
      setCourseError("Couldn't load courses for this semester. Check your connection and try again.");
    }
  }, []);

  useEffect(() => {
    void fetchSemesters();
  }, [fetchSemesters]);

  useEffect(() => {
    void fetchCourses(selectedSemester);
  }, [fetchCourses, selectedSemester]);

  const handleSemesterChange = (id: string) => {
    setCourseError(null);
    setActionError(null);
    setSelectedSemester(id);
    setSearchParams({ semester: id });
  };

  const openCreate = () => {
    setEditing(null);
    setActionError(null);
    setCreditUnitsError("");
    setScoreError("");
    setFormData({
      course_code: "",
      course_title: "",
      credit_units: "",
      score: "",
    });
    setModalView("single");
    setModalOpen(true);
  };

  const openImport = () => {
    setActionError(null);
    setImportText("");
    setImportCourses([]);
    setImportError("");
    setModalView("import");
    setModalOpen(true);
  };

  const openEdit = (course: Course) => {
    setEditing(course);
    setActionError(null);
    setCreditUnitsError("");
    setScoreError("");
    setFormData({
      course_code: toUpper(course.course_code),
      course_title: titleCase(course.course_title),
      credit_units: String(course.credit_units),
      score: course.score == null ? "" : String(course.score),
    });
    setModalView("single");
    setModalOpen(true);
  };

  const refreshCourses = async () => {
    if (!selectedSemester) return;
    await fetchCourses(selectedSemester);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setCreditUnitsError("");
    setScoreError("");

    const creditUnitsRaw = formData.credit_units.trim();
    const parsedCreditUnits = Number(creditUnitsRaw);
    if (
      !creditUnitsRaw ||
      !Number.isInteger(parsedCreditUnits) ||
      parsedCreditUnits < 1 ||
      parsedCreditUnits > 12
    ) {
      setCreditUnitsError("Credit units must be between 1 and 12.");
      return;
    }

    const scoreRaw = formData.score.trim();
    const parsedScore = scoreRaw === "" ? null : Number(scoreRaw);
    if (
      parsedScore !== null &&
      (!Number.isFinite(parsedScore) || parsedScore < 0 || parsedScore > 100)
    ) {
      setScoreError("Score must be between 0 and 100.");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        ...formData,
        credit_units: parsedCreditUnits,
        score: parsedScore,
        semester_id: selectedSemester,
      };

      if (editing) await api.put(`/courses/${editing.id}`, payload);
      else await api.post("/courses", payload);

      setModalOpen(false);
      void refreshCourses();
    } catch (err) {
      console.error(err);
      setActionError("Could not save this course. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this course?")) return;
    setActionError(null);
    try {
      await api.delete(`/courses/${id}`);
      void refreshCourses();
    } catch (err) {
      console.error(err);
      setActionError("Could not delete this course. Please try again.");
    }
  };

  const handleImportTextChange = (value: string) => {
    setImportText(value);
    const parsed = parseImportCourses(value);
    setImportCourses(parsed);
    setImportError(
      value.trim() && parsed.length === 0
        ? "No courses found. Paste Caleb course-form rows or CSV with course_code, course_title, credit_units."
        : "",
    );
  };

  const handleImportFile = async (file: File | null) => {
    if (!file) return;

    setUploadingFile(true);
    setImportError("");

    try {
      if (
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf")
      ) {
        // Try to extract text from PDF
        await extractPdfText(file);
        return;
      }

      const text = await file.text();
      handleImportTextChange(text);
    } catch (err) {
      console.error("Error processing file:", err);
      setImportError(
        "Could not process file. Please try a different format or copy and paste the content directly.",
      );
    } finally {
      setUploadingFile(false);
    }
  };

  const extractPdfText = async (file: File) => {
    try {
      const pdfjsLib = await import("pdfjs-dist");

      // Use the bundled worker from pdfjs-dist
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.mjs",
        import.meta.url,
      ).toString();

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      const pageTexts: string[] = [];

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const content = await page.getTextContent();

        // Group text items by their Y position to reconstruct lines
        const lines = new Map<number, { x: number; str: string }[]>();

        for (const item of content.items) {
          if (!("str" in item)) continue;
          // Round Y to group items on the same line (PDF coords can vary slightly)
          const y = Math.round(item.transform[5]);
          if (!lines.has(y)) lines.set(y, []);
          lines.get(y)!.push({ x: item.transform[4], str: item.str });
        }

        // Sort lines by Y descending (PDF coords go bottom-up), items by X ascending
        const sortedLines = [...lines.entries()]
          .sort((a, b) => b[0] - a[0])
          .map(([, items]) =>
            items
              .sort((a, b) => a.x - b.x)
              .map((item) => item.str)
              .join(" "),
          );

        pageTexts.push(sortedLines.join("\n"));
      }

      const textContent = pageTexts.join("\n");

      if (textContent.trim().length > 10) {
        handleImportTextChange(textContent);
      } else {
        setImportError(
          "Could not extract text from PDF. The PDF may contain scanned images instead of text. Please copy the courses table text and paste it below, or upload a CSV/TXT file instead.",
        );
      }
    } catch (err) {
      console.error("PDF extraction error:", err);
      setImportError(
        "Could not read PDF file. Please copy the courses table text from the PDF and paste it below, or upload a CSV/TXT file instead.",
      );
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleImportFile(files[0]);
    }
  };

  const handleBulkImport = async () => {
    if (importCourses.length === 0) return;

    setImporting(true);

    try {
      await api.post("/courses/bulk", {
        semester_id: selectedSemester,
        courses: importCourses,
      });
      setModalOpen(false);
      await refreshCourses();
    } catch (err) {
      console.error(err);
      setImportError(
        "Could not import courses. Please check the rows and try again.",
      );
    } finally {
      setImporting(false);
    }
  };

  const gradedCourses = courses.filter((c) => c.grade_point != null);
  const semesterGPA =
    gradedCourses.length > 0
      ? (
          gradedCourses.reduce(
            (sum, c) => sum + (Number(c.grade_point) || 0) * c.credit_units,
            0,
          ) / gradedCourses.reduce((sum, c) => sum + c.credit_units, 0) || 0
        ).toFixed(2)
      : "0.00";
  const totalUnits = courses.reduce((sum, c) => sum + c.credit_units, 0);
  const currentSemName = semesters.find((s) => s.id === selectedSemester)?.name;

  const sortedCourses = [...courses].sort((a, b) => {
    const dir = sortOrder === "asc" ? 1 : -1;
    switch (sortField) {
      case "course_code":
        return dir * toUpper(a.course_code).localeCompare(toUpper(b.course_code));
      case "course_title":
        return dir * titleCase(a.course_title).localeCompare(titleCase(b.course_title));
      case "credit_units":
        return dir * (a.credit_units - b.credit_units);
      case "score":
        return dir * ((a.score ?? -1) - (b.score ?? -1));
      case "grade":
        return dir * ((a.grade ?? "").localeCompare(b.grade ?? ""));
      case "grade_point":
        return dir * ((Number(a.grade_point) || 0) - (Number(b.grade_point) || 0));
      default:
        return 0;
    }
  });

  if (loading) return <LoadingScreen />;

  return (
    <div className="w-full min-h-screen pb-32 md:pb-8 overflow-y-auto overflow-x-hidden">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4 mb-8 w-full min-w-0"
      >
        {/* Header Title */}
        <div className="flex items-start gap-4 min-w-0 max-w-3xl">
          <div className="p-3 bg-primary-500/10 text-primary-400 rounded-2xl shrink-0 mt-1">
            <GraduationCap size={32} />
          </div>
          <div className="min-w-0">
            <h1 className="text-3xl md:text-4xl lg:text-[40px] font-bold text-[var(--text-primary)] tracking-[-0.03em] leading-tight whitespace-normal">
              All Your Courses
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-[380px] md:max-w-[520px]">
              Browse and manage every course across your semesters.
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col 2xl:flex-row 2xl:items-center gap-3 w-full min-w-0">
          {/* Semester Selector */}
          <div className="relative w-full 2xl:flex-1 2xl:flex-none 2xl:w-[320px] min-w-0">
            <Filter
              size={14}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-500 pointer-events-none"
            />
            <select
              id="semester-filter"
              value={selectedSemester}
              onChange={(e) => handleSemesterChange(e.target.value)}
              className="input-field pl-10 pr-4 h-[52px] text-sm appearance-none cursor-pointer w-full"
            >
              {semesters.map((sem) => (
                <option key={sem.id} value={sem.id}>
                  {sem.name} ({sem.academic_year})
                </option>
              ))}
            </select>
          </div>

          {/* Custom Sort Selector */}
          <div className="relative w-full 2xl:flex-1 2xl:flex-none 2xl:w-[260px] min-w-0">
            <button
              type="button"
              onClick={() => {
                setTempField(sortField);
                setTempOrder(sortOrder);
                setSortOpen(!sortOpen);
              }}
              className="input-field h-[52px] text-sm appearance-none cursor-pointer flex items-center justify-between px-4 bg-transparent border border-surface-700/60 hover:border-surface-600 rounded-xl w-full"
            >
              <div className="flex items-center gap-2 overflow-hidden text-left">
                <ArrowUpDown size={15} className="text-surface-400 shrink-0" />
                <div className="truncate">
                  <span className="text-[10px] text-[var(--text-muted)] block uppercase font-bold tracking-wider leading-none">Sort</span>
                  <span className="text-sm font-semibold text-[var(--text-primary)] leading-none mt-1 block">
                    {getSortLabel(sortField, sortOrder)}
                  </span>
                </div>
              </div>
              <span className="text-surface-400 text-xs ml-1">▼</span>
            </button>

            <AnimatePresence>
              {sortOpen && (
                <>
                  {/* Backdrop for click outside */}
                  <div
                    className="fixed inset-0 z-40 bg-black/60 lg:bg-transparent"
                    onClick={() => setSortOpen(false)}
                  />

                  {/* Dropdown Popover (Desktop) / Bottom Sheet (Mobile) */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    transition={{ duration: 0.15 }}
                    className="fixed bottom-0 left-0 right-0 rounded-t-3xl bg-[var(--bg-surface)] border-t border-surface-800 p-6 z-50 lg:absolute lg:bottom-auto lg:top-[56px] lg:left-0 lg:right-auto lg:w-[280px] lg:rounded-2xl lg:border lg:border-surface-700/60 lg:shadow-2xl lg:p-5"
                  >
                    {/* Header */}
                    <div className="flex justify-between items-center mb-4 pb-2 border-b border-surface-800/40">
                      <span className="text-sm font-bold text-[var(--text-primary)]">Sort Courses</span>
                      <button
                        type="button"
                        onClick={() => setSortOpen(false)}
                        className="text-xs text-primary-400 hover:text-primary-300 font-semibold"
                      >
                        Close
                      </button>
                    </div>

                    {/* Sort By Fields */}
                    <div className="mb-4">
                      <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Sort by</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(["course_code", "course_title", "credit_units", "score", "grade", "grade_point"] as SortField[]).map((field) => {
                          const labelMap: Record<SortField, string> = {
                            course_code: "Code",
                            course_title: "Title",
                            credit_units: "Units",
                            score: "Score",
                            grade: "Grade",
                            grade_point: "Points",
                          };
                          const isSelected = tempField === field;
                          return (
                            <button
                              key={field}
                              type="button"
                              onClick={() => {
                                setTempField(field);
                                if (field === "score" || field === "grade_point") {
                                  setTempOrder("desc");
                                } else {
                                  setTempOrder("asc");
                                }
                              }}
                              className={`px-3 py-2 text-xs font-semibold rounded-lg text-left transition-all ${
                                isSelected
                                  ? "bg-primary-500/10 text-primary-400 border border-primary-500/30"
                                  : "bg-surface-800/30 hover:bg-surface-800/60 text-surface-300 border border-transparent"
                              }`}
                            >
                              {labelMap[field]}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Order Selection */}
                    <div className="mb-5">
                      <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Order</p>
                      <div className="flex gap-2">
                        {[
                          {
                            value: "asc" as const,
                            label: tempField === "score"
                              ? "Lowest First"
                              : tempField === "grade"
                                ? "Best → Worst"
                                : "Ascending"
                          },
                          {
                            value: "desc" as const,
                            label: tempField === "score"
                              ? "Highest First"
                              : tempField === "grade"
                                ? "Worst → Best"
                                : "Descending"
                          }
                        ].map((opt) => {
                          const isSelected = tempOrder === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setTempOrder(opt.value)}
                              className={`flex-1 py-2 text-xs font-semibold rounded-lg text-center transition-all ${
                                isSelected
                                  ? "bg-primary-500/10 text-primary-400 border border-primary-500/30"
                                  : "bg-surface-800/30 hover:bg-surface-800/60 text-surface-300 border border-transparent"
                              }`}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Apply Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setSortField(tempField);
                        setSortOrder(tempOrder);
                        localStorage.setItem("gradeflow_sort_field", tempField);
                        localStorage.setItem("gradeflow_sort_order", tempOrder);
                        setSortOpen(false);
                      }}
                      className="btn btn-primary w-full py-2.5 text-xs font-bold shadow-lg shadow-primary-500/10"
                    >
                      Apply Sort
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 w-full 2xl:w-auto shrink-0 min-w-0">
            <button
              onClick={openImport}
              className="btn btn-ghost border border-surface-700 hover:border-surface-600 h-[52px] w-full sm:flex-1 2xl:flex-none 2xl:w-[130px] px-4"
              disabled={!selectedSemester}
            >
              <Upload size={18} /> Import
            </button>

            <button
              id="add-course-btn"
              onClick={openCreate}
              className="btn btn-primary h-[52px] w-full sm:flex-1 2xl:flex-none 2xl:w-[165px] px-4"
              disabled={!selectedSemester}
            >
              <Plus size={18} /> Add Course
            </button>
          </div>
        </div>
      </motion.div>

      {actionError && !modalOpen && (
        <p className="mb-4 text-sm text-[var(--danger)]" role="alert">
          {actionError}
        </p>
      )}

      {courseError ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <EmptyState
            icon={AlertTriangle}
            title="Couldn't load courses"
            description={courseError}
            action={
              <button type="button" onClick={() => void fetchCourses(selectedSemester)} className="btn btn-primary">
                Retry
              </button>
            }
          />
        </div>
      ) : semesters.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No semesters yet"
          description="Create a semester first."
          action={
            <a href="/semesters" className="btn btn-primary">
              Go to Semesters
            </a>
          }
        />
      ) : courses.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No courses yet"
          description={`Add courses to ${currentSemName || "this semester"}.`}
          action={
            <button onClick={openCreate} className="btn btn-primary">
              <Plus size={18} /> Add Course
            </button>
          }
        />
      ) : (
        <>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card-light p-6 mb-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 divide-y sm:divide-y-0 sm:divide-x divide-white/5"
          >
            {/* Semester GPA */}
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary-500/10 text-primary-400 rounded-xl">
                <TrendingUp size={24} />
              </div>
              <div>
                <p className="text-[var(--text-xs)] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-0.5">
                  Semester GPA
                </p>
                <p className="text-2xl font-bold font-mono text-[var(--accent)]">
                  {gradedCourses.length === 0 ? "Ungraded" : semesterGPA}
                </p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  {gradedCourses.length === 0 ? "Awaiting grades" : "Current semester GPA"}
                </p>
              </div>
            </div>

            {/* Courses */}
            <div className="flex items-center gap-4 sm:pl-6 pt-4 sm:pt-0">
              <div className="p-3 bg-primary-500/10 text-primary-400 rounded-xl">
                <BookOpen size={24} />
              </div>
              <div>
                <p className="text-[var(--text-xs)] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-0.5">
                  Courses
                </p>
                <p className="text-2xl font-bold font-mono text-[var(--text-primary)]">
                  {courses.length}
                </p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Registered courses
                </p>
              </div>
            </div>

            {/* Total Units */}
            <div className="flex items-center gap-4 sm:pl-6 pt-4 sm:pt-0">
              <div className="p-3 bg-primary-500/10 text-primary-400 rounded-xl">
                <GraduationCap size={24} />
              </div>
              <div>
                <p className="text-[var(--text-xs)] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-0.5">
                  Total Units
                </p>
                <p className="text-2xl font-bold font-mono text-[var(--text-primary)]">
                  {totalUnits}
                </p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Credit units
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card overflow-hidden"
          >
            <div className="md:hidden p-4 space-y-3">
              {sortedCourses.map((course, index) => (
                <motion.article
                  key={course.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--bg-base)]/60 p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-bold text-[var(--text-primary)] break-words">
                        {toUpper(course.course_code)}
                      </p>
                      <p className="mt-1 text-sm text-[var(--text-secondary)] break-words">
                        {titleCase(course.course_title)}
                      </p>
                    </div>
                    {course.grade ? (
                      <span className="badge border shrink-0" style={getGradeBadgeStyle(course.grade)}>
                        {course.grade}
                      </span>
                    ) : (
                      <span className="badge bg-surface-700/40 text-[var(--text-muted)] shrink-0">
                        Ungraded
                      </span>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                        Units
                      </p>
                      <p className="mt-1 font-mono text-[var(--text-primary)]">
                        {course.credit_units}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                        Score
                      </p>
                      <p className="mt-1 font-mono text-[var(--text-primary)]">
                        {course.score !== null ? course.score : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                        Points
                      </p>
                      <p className="mt-1 font-mono font-bold text-[var(--text-primary)]">
                        {course.grade_point == null
                          ? "—"
                          : (Number(course.grade_point) || 0).toFixed(1)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-end gap-1 border-t border-[var(--border)] pt-3">
                    <button
                      onClick={() => openEdit(course)}
                      className="p-2 rounded-lg hover:bg-surface-700/50 text-surface-500 hover:text-surface-300 transition-colors"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(course.id)}
                      className="p-2 rounded-lg hover:bg-danger-500/10 text-surface-500 hover:text-danger-400 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </motion.article>
              ))}
            </div>

            <div className="hidden md:block overflow-x-auto pb-4">
              <table className="w-full table-fixed">
                <thead>
                  <tr className="border-b border-white/5">
                    {([
                      { label: "Code", align: "left", width: "w-[14%]" },
                      { label: "Title", align: "left", width: "w-[32%]" },
                      { label: "Units", align: "center", width: "w-[10%]" },
                      { label: "Score", align: "center", width: "w-[10%]" },
                      { label: "Grade", align: "center", width: "w-[12%]" },
                      { label: "Points", align: "center", width: "w-[10%]" },
                      { label: "Actions", align: "right", width: "w-[12%]" },
                    ] as { label: string; align: string; width: string }[]).map(({ label, align, width }) => (
                      <th
                        key={label}
                        className={`text-${align} ${width} px-6 py-4.5 text-xs font-semibold text-surface-500 uppercase tracking-wider`}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedCourses.map((course, index) => (
                    <tr
                      key={course.id}
                      className="border-b border-white/5 hover:bg-surface-800/10 transition-colors animate-fade-in-up"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <td className="px-6 py-5 text-sm font-semibold text-surface-200">
                        <span className="block truncate">{toUpper(course.course_code)}</span>
                      </td>
                      <td className="px-6 py-5 text-sm text-surface-400">
                        <span className="block truncate">{titleCase(course.course_title)}</span>
                      </td>
                      <td className="px-6 py-5 text-center text-sm font-mono text-[var(--text-secondary)]">
                        {course.credit_units}
                      </td>
                      <td className="px-6 py-5 text-center text-sm font-mono text-[var(--text-secondary)]">
                        {course.score !== null ? course.score : "—"}
                      </td>
                      <td className="px-6 py-5 text-center">
                        {course.grade ? (
                          <span className="badge border" style={getGradeBadgeStyle(course.grade)}>
                            {course.grade}
                          </span>
                        ) : (
                          <span className="badge bg-surface-700/40 text-[var(--text-muted)]">
                            Ungraded
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-5 text-center text-sm font-bold font-mono text-[var(--text-primary)]">
                        {course.grade_point == null
                          ? "—"
                          : (Number(course.grade_point) || 0).toFixed(1)}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(course)}
                            className="p-1.5 rounded-lg hover:bg-surface-700/50 text-surface-500 hover:text-surface-300 transition-colors"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(course.id)}
                            className="p-1.5 rounded-lg hover:bg-danger-500/10 text-surface-500 hover:text-danger-400 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setActionError(null);
          setCreditUnitsError("");
          setScoreError("");
          setModalOpen(false);
        }}
        title={
          editing
            ? "Edit Course"
            : modalView === "import"
              ? "Import Courses"
              : "Add Course"
        }
      >
        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setModalView("single")}
              className={`btn flex-1 ${modalView === "single" ? "btn-primary" : "btn-ghost"}`}
            >
              Add Single
            </button>
            <button
              type="button"
              onClick={() => setModalView("import")}
              className={`btn flex-1 ${modalView === "import" ? "btn-primary" : "btn-ghost"}`}
            >
              Import
            </button>
          </div>

          {modalView === "single" && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-surface-400 mb-1.5">
                    Course Code
                  </label>
                  <input
                    id="course-code"
                    type="text"
                    className="input-field"
                    placeholder="CSC 201"
                    value={formData.course_code}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        course_code: toUpper(e.target.value),
                      })
                    }
                    style={{ textTransform: "uppercase" }}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-400 mb-1.5">
                    Credit Units
                  </label>
                  <input
                    id="course-units"
                    type="number"
                    min="1"
                    max="12"
                    className="input-field"
                    placeholder="3"
                    value={formData.credit_units}
                    onChange={(e) =>
                      {
                        setFormData({
                          ...formData,
                          credit_units: e.target.value,
                        });
                        if (creditUnitsError) setCreditUnitsError("");
                      }
                    }
                    required
                  />
                  {creditUnitsError && (
                    <p className="mt-1 text-xs text-[var(--danger)]" role="alert">
                      {creditUnitsError}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-400 mb-1.5">
                  Course Title
                </label>
                <input
                  id="course-title"
                  type="text"
                  className="input-field"
                  placeholder="Intro to Computer Science"
                  value={formData.course_title}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      course_title: titleCase(e.target.value),
                    })
                  }
                  style={{ textTransform: "capitalize" }}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-400 mb-1.5">
                  Score (0-100)
                </label>
                <input
                  id="course-score"
                  type="number"
                  min="0"
                  max="100"
                  className="input-field"
                  placeholder="75"
                  value={formData.score}
                  onChange={(e) => {
                    setFormData({ ...formData, score: e.target.value });
                    if (scoreError) setScoreError("");
                  }}
                />
                <p className="text-xs text-surface-500 mt-1">
                  Leave blank for ungraded final semester courses.
                </p>
                {scoreError && (
                  <p className="mt-1 text-xs text-[var(--danger)]" role="alert">
                    {scoreError}
                  </p>
                )}
                {formData.score && (
                  <p className="text-xs text-surface-500 mt-1">
                    Grade:{" "}
                    <span className="font-semibold text-surface-300">
                      {scoreToGrade(Number(formData.score))}
                    </span>
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setActionError(null);
                    setCreditUnitsError("");
                    setScoreError("");
                    setModalOpen(false);
                  }}
                  className="btn btn-ghost flex-1"
                >
                  Cancel
                </button>
                <button
                  id="course-submit"
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary flex-1"
                >
                  {submitting ? "Saving…" : editing ? "Update" : "Add Course"}
                </button>
              </div>
              {actionError && (
                <p className="text-sm text-[var(--danger)]" role="alert">
                  {actionError}
                </p>
              )}
            </form>
          )}

          {modalView === "import" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-400 mb-1.5">
                  Upload or Drag & Drop Files
                </label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                    isDragging
                      ? "border-primary-400 bg-primary-500/10"
                      : "border-surface-700 hover:border-surface-600"
                  }`}
                >
                  <input
                    type="file"
                    accept=".csv,.txt,.pdf"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={(e) =>
                      handleImportFile(e.target.files?.[0] || null)
                    }
                    disabled={uploadingFile}
                  />
                  <div className="flex flex-col items-center gap-2">
                    {uploadingFile ? (
                      <>
                        <div className="w-8 h-8 border-2 border-primary-400/30 border-t-primary-400 rounded-full animate-spin" />
                        <p className="text-sm text-surface-300">
                          Processing file...
                        </p>
                      </>
                    ) : (
                      <>
                        <Upload
                          size={32}
                          className={`${
                            isDragging ? "text-primary-400" : "text-surface-500"
                          }`}
                        />
                        <p className="text-sm font-medium text-surface-300">
                          {isDragging
                            ? "Drop your file here"
                            : "Drag & drop CSV, TXT, or PDF"}
                        </p>
                        <p className="text-xs text-surface-500">
                          or click to select a file
                        </p>
                      </>
                    )}
                  </div>
                </div>
                <p className="text-xs text-surface-500 mt-2">
                  Supports CSV, TXT, and PDF files. PDFs are automatically
                  extracted.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-400 mb-1.5">
                  Paste course form or spreadsheet text
                </label>
                <textarea
                  className="input-field min-h-40 resize-y"
                  placeholder="1 C S C 4 0 8 O p e r a t i o n s  R e s e a r c h 3 C\nor CSV: course_code,course_title,credit_units,score"
                  value={importText}
                  onChange={(e) => handleImportTextChange(e.target.value)}
                />
              </div>

              {importError && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
                  {importError}
                </div>
              )}

              {importCourses.length > 0 && (
                <div className="rounded-xl border border-surface-800 overflow-hidden">
                  <div className="px-4 py-3 border-b border-surface-800 text-sm font-semibold text-surface-200">
                    Preview ({importCourses.length} courses)
                  </div>
                  <div className="max-h-56 overflow-auto">
                    <table className="w-full min-w-[520px]">
                      <thead>
                        <tr className="border-b border-surface-800/50">
                          {["Code", "Title", "Units", "Score"].map(
                            (heading) => (
                              <th
                                key={heading}
                                className={`${heading === "Code" || heading === "Title" ? "text-left" : "text-center"} px-4 py-2.5 text-xs font-semibold text-surface-500 uppercase tracking-wider`}
                              >
                                {heading}
                              </th>
                            ),
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {importCourses.map((course, index) => (
                          <tr
                            key={`${course.course_code}-${index}`}
                            className="border-b border-surface-800/30"
                          >
                            <td className="px-4 py-2 text-sm font-semibold text-surface-200">
                              {course.course_code}
                            </td>
                            <td className="px-4 py-2 text-sm text-surface-400">
                              {course.course_title}
                            </td>
                            <td className="px-4 py-2 text-center text-sm text-surface-300">
                              {course.credit_units}
                            </td>
                            <td className="px-4 py-2 text-center text-sm text-surface-300">
                              {course.score ?? "Ungraded"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn btn-ghost flex-1"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBulkImport}
                  disabled={importing || importCourses.length === 0}
                  className="btn btn-primary flex-1"
                >
                  {importing ? "Importing..." : "Import Courses"}
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default Courses;

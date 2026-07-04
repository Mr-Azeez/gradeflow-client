import { useEffect, useRef, useState } from "react";
import type { ComponentType } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import LoadingScreen from "../components/LoadingScreen";
import { motion } from "framer-motion";
import {
  User,
  BookOpen,
  Calculator,
  Target,
  Camera,
  ChevronDown,
  ChevronUp,
  Pencil,
  Check,
  X,
  Layers,
} from "lucide-react";

interface Semester {
  id: string;
  name: string;
  level: number;
  semester_number: number;
  academic_year: string;
  is_current: boolean;
  target_gpa: number | null;
  actual_gpa: number | null;
}

interface UserProfile {
  id: string;
  name: string;
  matric_number: string | null;
  department: string | null;
  level: string | null;
  avatar_url?: string | null;
}

interface ToolItem {
  id: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  name: string;
  description: string;
  howItWorks: string;
  cta: string;
  route: string;
}

const tools: ToolItem[] = [
  {
    id: "whatif",
    icon: Calculator,
    name: "What-If Grade Simulator",
    description:
      "Explore how different grades would change your CGPA — for current, past, or future semesters.",
    howItWorks:
      "Use Current Semester to project your CGPA before results come out. Switch to Past Semester to replay a completed semester with a hypothetical grade. Or use Semester Planner to enter a GP goal and see what grades you need to hit it.",
    cta: "Open Simulator",
    route: "/whatif",
  },
  {
    id: "target",
    icon: Target,
    name: "Final Semester Target",
    description:
      "Find out if your desired CGPA classification is still achievable — and exactly what you need to get there.",
    howItWorks:
      "Select a classification (e.g. First Class or Second Class Upper). The tool calculates the maximum CGPA you can still reach, the minimum average GP you need per remaining course, and the classification you've already guaranteed regardless of results.",
    cta: "Open Target",
    route: "/graduation-target",
  },
  {
    id: "courses",
    icon: BookOpen,
    name: "Course Manager",
    description:
      "Add, edit, and view all your courses across every semester.",
    howItWorks:
      "Filter by semester to see that semester's GPA, total units, and full course list. Use the Import button to add courses in bulk. Grades entered here flow automatically into your CGPA and Dashboard trend chart.",
    cta: "Open Courses",
    route: "/courses",
  },
  {
    id: "semesters",
    icon: Layers,
    name: "Semesters",
    description:
      "View every semester you've recorded and jump into any semester's course list.",
    howItWorks:
      "Each card shows a semester and its academic year. Click 'View Courses' to drill into that semester's full course list. Add new semesters as you progress through your programme.",
    cta: "Open Semesters",
    route: "/semesters",
  },
];

const UNIVERSITY_NAME = "Caleb University, Lagos";

const getClassification = (cgpa: number): string => {
  if (cgpa >= 4.5) return "First Class";
  if (cgpa >= 3.5) return "Second Class Upper";
  if (cgpa >= 2.4) return "Second Class Lower";
  if (cgpa >= 1.5) return "Third Class";
  if (cgpa >= 1.0) return "Pass";
  return "—";
};

const getClassificationColor = (cls: string): string => {
  switch (cls) {
    case "First Class":
      return "text-yellow-400 border-yellow-400/30 bg-yellow-400/10";
    case "Second Class Upper":
      return "text-primary-400 border-primary-400/30 bg-primary-400/10";
    case "Second Class Lower":
      return "text-teal-400 border-teal-400/30 bg-teal-400/10";
    case "Third Class":
      return "text-surface-400 border-surface-400/30 bg-surface-400/10";
    default:
      return "text-surface-500 border-surface-700 bg-surface-800";
  }
};

const formatGpa = (value: number | string | null): string => {
  if (value === null || value === undefined) return "—";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "—";
  return num.toFixed(2);
};

const formatLevel = (level: string | null) => {
  if (!level) return "—";
  return level.endsWith("L") ? level : `${level}L`;
};

const getInitials = (name: string) => {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return "U";
  return parts
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
};

const loadImageElement = (file: File) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = (event) => {
      URL.revokeObjectURL(objectUrl);
      reject(event);
    };

    image.src = objectUrl;
  });

const resizeAvatarForUpload = async (file: File): Promise<File | null> => {
  try {
    const image = await loadImageElement(file);
    const naturalWidth = image.naturalWidth || image.width;
    const naturalHeight = image.naturalHeight || image.height;
    const longestEdge = Math.max(naturalWidth, naturalHeight);

    if (!longestEdge) return null;

    const scale = Math.min(1, 512 / longestEdge);
    const width = Math.max(1, Math.round(naturalWidth * scale));
    const height = Math.max(1, Math.round(naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) return null;

    context.drawImage(image, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((result) => resolve(result), "image/jpeg", 0.85);
    });

    if (!blob) return null;

    const baseName = file.name.replace(/\.[^.]+$/, "") || "avatar";
    return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
  } catch {
    return null;
  }
};

const Profile = () => {
  const navigate = useNavigate();
  const { user: authUser, updateUser } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cgpa, setCgpa] = useState<number | null>(null);

  const [programCredits, setProgramCredits] = useState<number>(() => {
    const parsed = Number.parseInt(
      localStorage.getItem("programTotalCredits") ?? "120",
      10,
    );
    return Number.isFinite(parsed) ? parsed : 120;
  });
  const [programSemesters, setProgramSemesters] = useState<number>(() => {
    const parsed = Number.parseInt(
      localStorage.getItem("programTotalSemesters") ?? "8",
      10,
    );
    return Number.isFinite(parsed) ? parsed : 8;
  });
  const [editingConfig, setEditingConfig] = useState(false);
  const [configDraft, setConfigDraft] = useState({ credits: 120, semesters: 8 });
  const [configError, setConfigError] = useState<string | null>(null);

  const [editingProfile, setEditingProfile] = useState(false);
  const [profileDraft, setProfileDraft] = useState({
    name: "",
    matric_number: "",
    department: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [openTool, setOpenTool] = useState<string | null>("whatif");

  useEffect(() => {
    let active = true;

    const fetchProfile = async () => {
      try {
        const [profileResult, analyticsResult] = await Promise.allSettled([
          api.get("/users/me"),
          api.get("/analytics"),
        ]);

        if (!active) return;

        if (profileResult.status === "fulfilled") {
          const user = profileResult.value.data.user as UserProfile;
          const semesterData = profileResult.value.data.semesters as Semester[];
          setProfile(user);
          setSemesters(semesterData);
          setProfileDraft({
            name: user.name ?? "",
            matric_number: user.matric_number ?? "",
            department: user.department ?? "",
          });
        } else {
          setError("Failed to load profile.");
        }

        if (analyticsResult.status === "fulfilled") {
          const value = Number(analyticsResult.value.data?.cgpa);
          setCgpa(Number.isFinite(value) ? value : null);
        } else {
          setCgpa(null);
        }
      } catch {
        if (active) {
          setError("Failed to load profile.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchProfile();

    return () => {
      active = false;
    };
  }, []);

  const currentSemester = semesters.find((semester) => semester.is_current) ?? null;
  const displayName = profile?.name ?? authUser?.name ?? "User";
  const displayDepartment = profile?.department?.trim() || "—";
  const displayMatricNumber = profile?.matric_number?.trim() || "—";
  const displayLevel = currentSemester
    ? `${currentSemester.level}L \u00B7 ${currentSemester.semester_number === 1 ? "1st" : "2nd"} Semester`
    : formatLevel(profile?.level ?? null);
  const avatarUrl = profile?.avatar_url ?? authUser?.avatar_url ?? null;
  const academicStanding = cgpa != null ? getClassification(cgpa) : null;

  const getTargetStatus = (semester: Semester) => {
    if (semester.is_current) return "in_progress";
    if (semester.target_gpa === null) return "no_target";
    if (semester.actual_gpa === null) return "no_target";
    return semester.actual_gpa >= semester.target_gpa ? "met" : "missed";
  };

  const openConfigEditor = () => {
    setConfigDraft({
      credits: programCredits,
      semesters: programSemesters,
    });
    setConfigError(null);
    setEditingConfig(true);
  };

  const handleConfigSave = () => {
    if (
      !Number.isFinite(configDraft.credits) ||
      !Number.isFinite(configDraft.semesters) ||
      configDraft.credits < 60 ||
      configDraft.credits > 300 ||
      configDraft.semesters < 2 ||
      configDraft.semesters > 16
    ) {
      setConfigError("Please keep credits between 60 and 300, and semesters between 2 and 16.");
      return;
    }

    localStorage.setItem("programTotalCredits", String(configDraft.credits));
    localStorage.setItem("programTotalSemesters", String(configDraft.semesters));
    setProgramCredits(configDraft.credits);
    setProgramSemesters(configDraft.semesters);
    setEditingConfig(false);
    setConfigError(null);
  };

  const handleProfileSave = async () => {
    if (profileDraft.name.trim() === "") {
      setProfileError("Full name is required.");
      return;
    }

    setSavingProfile(true);
    setProfileError(null);

    try {
      const response = await api.patch("/users/me", {
        name: profileDraft.name.trim(),
        matric_number: profileDraft.matric_number.trim() || null,
        department: profileDraft.department.trim() || null,
      });

      setProfile((current) =>
        current
          ? {
              ...current,
              ...response.data.user,
            }
          : current,
      );
      updateUser({ name: response.data.user.name });
      setEditingProfile(false);
    } catch {
      setProfileError("Failed to save changes. Please try again.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      setAvatarError("Image must be under 3MB");
      e.target.value = "";
      return;
    }

    setUploadingAvatar(true);
    setAvatarError(null);

    const formData = new FormData();
    const uploadFile = (await resizeAvatarForUpload(file)) ?? file;
    formData.append("avatar", uploadFile);

    try {
      const res = await api.post("/users/me/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setProfile((current) =>
        current ? { ...current, avatar_url: res.data.avatar_url } : current,
      );
      updateUser({ avatar_url: res.data.avatar_url });
      e.target.value = "";
    } catch {
      setAvatarError("Upload failed. Try a different image.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setAvatarError(null);

    try {
      await api.delete("/users/me/avatar");
      setProfile((current) =>
        current ? { ...current, avatar_url: null } : current,
      );
      updateUser({ avatar_url: null });
    } catch {
      setAvatarError("Failed to remove photo.");
    }
  };

  if (loading) return <LoadingScreen />;

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-surface-400 text-center">
          Failed to load profile. Please refresh.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen pb-32 md:pb-8 overflow-y-auto p-6 max-w-4xl mx-auto space-y-6">
      <section className="glass-card p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="flex min-w-0 gap-4">
            <div className="relative group h-20 w-20 shrink-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="h-20 w-20 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-linear-to-br from-primary-500 to-primary-700 text-xl font-bold text-white font-mono">
                  {getInitials(displayName)}
                </div>
              )}
              <button
                type="button"
                onClick={handleAvatarClick}
                disabled={uploadingAvatar}
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none"
                title="Change photo"
              >
                {uploadingAvatar ? (
                  <span className="text-xs font-medium text-white">
                    Uploading...
                  </span>
                ) : (
                  <span className="flex flex-col items-center gap-1 text-white">
                    <Camera size={18} />
                    <span className="text-[11px] font-medium">Change photo</span>
                  </span>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>

            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <User size={18} className="text-primary-400 shrink-0" />
                <h1 className="text-2xl font-bold text-surface-100 break-words">
                  {displayName}
                </h1>
              </div>
              <p className="text-surface-300">{UNIVERSITY_NAME}</p>
              <div className="grid gap-1 text-sm text-surface-400">
                <p>{displayDepartment}</p>
                <p className="font-mono">{displayMatricNumber}</p>
                <p>{displayLevel}</p>
              </div>
            </div>
          </div>

          {academicStanding && (
            <div
              className={`border rounded-lg px-3 py-1.5 text-sm font-semibold w-fit ${getClassificationColor(academicStanding)}`}
            >
              {academicStanding}
            </div>
          )}
        </div>
      </section>

      {avatarError && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 py-3 rounded-lg bg-danger-500/10 border border-danger-500/20 text-danger-400 text-sm"
        >
          {avatarError}
        </motion.div>
      )}

      <section className="glass-card p-6">
        <div className="mb-4">
          <p className="text-xs font-semibold tracking-widest text-primary-400 uppercase mb-1">
            SEMESTER TARGETS
          </p>
          <h2 className="text-xl font-bold text-surface-100">Your Goal History</h2>
        </div>

        {semesters.length === 0 ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary-500/10 text-primary-400">
              <Target size={20} />
            </div>
            <p className="text-surface-100 font-semibold">
              You haven't set any semester targets yet.
            </p>
            <p className="mt-2 max-w-md text-sm leading-6 text-surface-400">
              Set one from your Dashboard to start tracking your goals.
            </p>
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="btn btn-primary mt-5"
            >
              → Go to Dashboard
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr className="border-b border-surface-800">
                  <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-widest text-surface-500">
                    Semester
                  </th>
                  <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-widest text-surface-500">
                    Target GPA
                  </th>
                  <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-widest text-surface-500">
                    Actual GPA
                  </th>
                  <th className="py-3 text-left text-xs font-semibold uppercase tracking-widest text-surface-500">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {semesters.map((semester) => {
                  const status = getTargetStatus(semester);

                  return (
                    <tr
                      key={semester.id}
                      className={`border-b border-surface-800/60 ${semester.is_current ? "bg-primary-500/5" : ""}`}
                    >
                      <td className="py-4 pr-4 text-sm font-medium text-surface-100">
                        {semester.level}L {semester.semester_number === 1 ? "1st" : "2nd"} Sem
                      </td>
                      <td className="py-4 pr-4 font-mono text-sm text-surface-200">
                        {formatGpa(semester.target_gpa)}
                      </td>
                      <td className="py-4 pr-4 font-mono text-sm text-surface-200">
                        {formatGpa(semester.actual_gpa)}
                      </td>
                      <td className="py-4 text-sm">
                        {status === "met" ? (
                          <span className="inline-flex items-center gap-2 text-success-500">
                            <Check size={16} />
                            Met
                          </span>
                        ) : status === "missed" ? (
                          <span className="inline-flex items-center gap-2 text-warning-500">
                            <X size={16} />
                            Missed
                          </span>
                        ) : status === "in_progress" ? (
                        <span className="inline-flex items-center gap-2 text-primary-400">
                            <span className="h-2.5 w-2.5 rounded-full bg-primary-400" />
                            In progress
                            <span className="bg-primary-500/20 text-primary-400 text-xs px-2 py-0.5 rounded-full">
                              CURRENT
                            </span>
                          </span>
                        ) : (
                          <span className="text-surface-500">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="glass-card p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-widest text-primary-400 uppercase mb-1">
              PROGRAMME SETTINGS
            </p>
            <h2 className="text-xl font-bold text-surface-100">Graduation Requirements</h2>
          </div>
          {!editingConfig && (
            <button
              type="button"
              onClick={openConfigEditor}
              className="btn btn-ghost"
            >
              <Pencil size={16} />
              Edit
            </button>
          )}
        </div>

        {!editingConfig ? (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="glass-card-light p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-surface-500">
                  TOTAL PROGRAMME CREDITS
                </p>
                <p className="mt-3 font-mono text-3xl font-bold text-surface-100">
                  {programCredits}
                </p>
                <p className="mt-2 text-sm text-surface-400">credits to graduate</p>
              </div>
              <div className="glass-card-light p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-surface-500">
                  TOTAL PROGRAMME SEMESTERS
                </p>
                <p className="mt-3 font-mono text-3xl font-bold text-surface-100">
                  {programSemesters}
                </p>
                <p className="mt-2 text-sm text-surface-400">semesters total</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-surface-400">
              These values power your credit progress bar and semester completion ratio on the Dashboard.
            </p>
          </>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-surface-400">
                  Total Programme Credits
                </label>
                <input
                  type="number"
                  min={60}
                  max={300}
                  inputMode="numeric"
                  className="input-field"
                  value={configDraft.credits}
                  onChange={(e) =>
                    setConfigDraft({
                      ...configDraft,
                      credits: Number.parseInt(e.target.value || "0", 10),
                    })
                  }
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-surface-400">
                  Total Programme Semesters
                </label>
                <input
                  type="number"
                  min={2}
                  max={16}
                  inputMode="numeric"
                  className="input-field"
                  value={configDraft.semesters}
                  onChange={(e) =>
                    setConfigDraft({
                      ...configDraft,
                      semesters: Number.parseInt(e.target.value || "0", 10),
                    })
                  }
                />
              </div>
            </div>
            {configError && <p className="text-sm text-danger-400">{configError}</p>}
            <div className="flex flex-wrap gap-3 pt-1">
              <button
                type="button"
                onClick={handleConfigSave}
                className="btn btn-primary"
              >
                Save Changes
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingConfig(false);
                  setConfigError(null);
                }}
                className="btn btn-ghost"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="glass-card p-6">
        <div className="mb-4">
          <p className="text-xs font-semibold tracking-widest text-primary-400 uppercase mb-1">
            YOUR GRADEFLOW TOOLKIT
          </p>
          <h2 className="text-xl font-bold text-surface-100">Quick Access</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {tools.map((tool) => {
            const Icon = tool.icon;
            const isOpen = openTool === tool.id;

            return (
              <div
                key={tool.id}
                role="button"
                tabIndex={0}
                onClick={() => setOpenTool(isOpen ? null : tool.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setOpenTool(isOpen ? null : tool.id);
                  }
                }}
                className="glass-card-light p-4 cursor-pointer outline-none"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <Icon size={24} className="shrink-0 text-primary-400" />
                    <div className="min-w-0">
                      <h3 className="font-semibold text-surface-100">
                        {tool.name}
                      </h3>
                      <p className="mt-1 text-sm text-surface-400">
                        {tool.description}
                      </p>
                    </div>
                  </div>
                  {isOpen ? (
                    <ChevronUp size={18} className="shrink-0 text-surface-400" />
                  ) : (
                    <ChevronDown size={18} className="shrink-0 text-surface-400" />
                  )}
                </div>

                {isOpen && (
                  <div className="mt-3 border-t border-surface-700/50 pt-3 text-sm leading-relaxed text-surface-300">
                    <p>{tool.howItWorks}</p>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate(tool.route);
                      }}
                      className="mt-3 text-primary-400 transition-colors hover:text-primary-300"
                    >
                      {tool.cta} →
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="glass-card p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-widest text-primary-400 uppercase mb-1">
              ACCOUNT
            </p>
            <h2 className="text-xl font-bold text-surface-100">Profile Settings</h2>
          </div>
          {!editingProfile && (
            <button
              type="button"
              onClick={() => {
                setProfileError(null);
                setProfileDraft({
                  name: profile?.name ?? authUser?.name ?? "",
                  matric_number: profile?.matric_number ?? "",
                  department: profile?.department ?? "",
                });
                setEditingProfile(true);
              }}
              className="btn btn-ghost"
            >
              <Pencil size={16} />
              Edit Profile
            </button>
          )}
        </div>

        {!editingProfile ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-[180px_1fr]">
              <p className="text-sm text-surface-500">Profile Photo</p>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleAvatarClick}
                  className="text-sm font-medium text-primary-400 transition-colors hover:text-primary-300"
                  disabled={uploadingAvatar}
                >
                  Change photo
                </button>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="block text-xs text-surface-500 transition-colors hover:text-danger-400"
                    disabled={uploadingAvatar}
                  >
                    Remove photo
                  </button>
                )}
                {avatarError && (
                  <p className="text-xs text-danger-400">{avatarError}</p>
                )}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-[180px_1fr]">
              <p className="text-sm text-surface-500">Full Name</p>
              <p className="text-surface-200 break-words">{displayName}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-[180px_1fr]">
              <p className="text-sm text-surface-500">Matric Number</p>
              <p className="text-surface-200 font-mono">{displayMatricNumber}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-[180px_1fr]">
              <p className="text-sm text-surface-500">University</p>
              <p className="text-surface-200">{UNIVERSITY_NAME}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-[180px_1fr]">
              <p className="text-sm text-surface-500">Department / Programme</p>
              <p className="text-surface-200 break-words">{displayDepartment}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-surface-400">
                Full Name
              </label>
              <input
                type="text"
                className="input-field"
                value={profileDraft.name}
                onChange={(e) =>
                  setProfileDraft({ ...profileDraft, name: e.target.value })
                }
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-surface-400">
                Matric Number
              </label>
              <input
                type="text"
                className="input-field font-mono"
                value={profileDraft.matric_number}
                onChange={(e) =>
                  setProfileDraft({
                    ...profileDraft,
                    matric_number: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <p className="mb-1.5 text-sm font-medium text-surface-400">
                University
              </p>
              <p className="text-surface-200">{UNIVERSITY_NAME}</p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-surface-400">
                Department / Programme
              </label>
              <input
                type="text"
                className="input-field"
                value={profileDraft.department}
                onChange={(e) =>
                  setProfileDraft({
                    ...profileDraft,
                    department: e.target.value,
                  })
                }
              />
            </div>
            <div className="flex flex-wrap gap-3 pt-1">
              <button
                type="button"
                onClick={handleProfileSave}
                className="btn btn-primary"
                disabled={savingProfile}
              >
                {savingProfile && (
                  <span className="mr-2 inline-block h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                )}
                Save Changes
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingProfile(false);
                  setProfileError(null);
                }}
                className="btn btn-ghost"
                disabled={savingProfile}
              >
                Cancel
              </button>
            </div>
            {profileError && (
              <div className="px-4 py-3 rounded-lg bg-danger-500/10 border border-danger-500/20 text-danger-400 text-sm mt-4">
                {profileError}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
};

export default Profile;

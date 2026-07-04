import type { CSSProperties } from "react";

export const gradeColors = {
  A: {
    text: "#22c55e",
    background: "rgba(34, 197, 94, 0.12)",
    border: "rgba(34, 197, 94, 0.25)",
  },
  B: {
    text: "#818cf8",
    background: "rgba(129, 140, 248, 0.12)",
    border: "rgba(129, 140, 248, 0.25)",
  },
  C: {
    text: "#f59e0b",
    background: "rgba(245, 158, 11, 0.12)",
    border: "rgba(245, 158, 11, 0.25)",
  },
  D: {
    text: "#f97316",
    background: "rgba(249, 115, 22, 0.12)",
    border: "rgba(249, 115, 22, 0.25)",
  },
  E: {
    text: "#94a3b8",
    background: "rgba(148, 163, 184, 0.12)",
    border: "rgba(148, 163, 184, 0.25)",
  },
  F: {
    text: "#ef4444",
    background: "rgba(239, 68, 68, 0.12)",
    border: "rgba(239, 68, 68, 0.25)",
  },
} as const;

type GradeKey = keyof typeof gradeColors;

const normalizeGrade = (grade: string | null | undefined): GradeKey => {
  const normalized = grade?.trim().toUpperCase();
  if (normalized === "PASS") return "E";
  if (normalized && normalized in gradeColors) return normalized as GradeKey;
  return "F";
};

export const getGradeTone = (grade: string | null | undefined) =>
  gradeColors[normalizeGrade(grade)];

export const getGradeBadgeStyle = (
  grade: string | null | undefined,
): CSSProperties => {
  const tone = getGradeTone(grade);
  return {
    color: tone.text,
    backgroundColor: tone.background,
    borderColor: tone.border,
  };
};

import { useEffect, useState, type FormEvent } from "react";
import api from "../api/axios";
import Modal from "./Modal";

interface SemesterTargetModalProps {
  isOpen: boolean;
  onClose: () => void;
  semesterId: string | null;
  initialTargetGpa?: number | null;
  onSaved?: (targetGpa: number) => void;
}

const clampToTwoDecimals = (value: number) => Math.round(value * 100) / 100;

const SemesterTargetModal = ({
  isOpen,
  onClose,
  semesterId,
  initialTargetGpa,
  onSaved,
}: SemesterTargetModalProps) => {
  const [targetGpa, setTargetGpa] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setTargetGpa(initialTargetGpa != null ? initialTargetGpa.toFixed(2) : "");
    setError("");
    setSaving(false);
  }, [initialTargetGpa, isOpen]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!semesterId) {
      setError("No active semester found.");
      return;
    }

    const parsedTarget = Number(targetGpa);
    if (
      Number.isNaN(parsedTarget) ||
      parsedTarget < 1 ||
      parsedTarget > 5
    ) {
      setError("Enter a target between 1.00 and 5.00.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      const response = await api.patch(`/semesters/${semesterId}`, {
        target_gpa: clampToTwoDecimals(parsedTarget),
      });
      const savedTarget = Number(response.data?.target_gpa ?? parsedTarget);
      onSaved?.(savedTarget);
      onClose();
    } catch (err) {
      console.error(err);
      setError("Could not save your target. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Set a Target">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="target-gpa"
            className="mb-2 block text-sm font-medium text-[var(--text-secondary)]"
          >
            What GP do you want to hit this semester?
          </label>
          <input
            id="target-gpa"
            type="number"
            min="1"
            max="5"
            step="0.01"
            inputMode="decimal"
            value={targetGpa}
            onChange={(event) => setTargetGpa(event.target.value)}
            placeholder="4.50"
            className="w-full rounded-[16px] border border-[var(--border)] bg-[var(--bg-base)] px-4 py-3 font-mono text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]/50"
            required
          />
        </div>

        {error && (
          <p className="text-sm text-[var(--danger)]" role="alert">
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost flex-1"
            disabled={saving}
          >
            Maybe later
          </button>
          <button
            type="submit"
            className="btn btn-primary flex-1"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Target"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default SemesterTargetModal;

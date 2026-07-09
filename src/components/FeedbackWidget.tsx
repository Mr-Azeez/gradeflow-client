import { useState } from "react";
import { useLocation } from "react-router-dom";
import { MessageSquarePlus, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../api/axios";

const FeedbackWidget = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleClose = () => {
    setIsOpen(false);
    setMessage("");
    setSubmitted(false);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim()) return;

    setSubmitting(true);
    setError("");

    try {
      await api.post("/feedback", {
        message: message.trim(),
        page_context: location.pathname,
      });
      setSubmitted(true);
      setMessage("");
    } catch (err: any) {
      setError(err.response?.data?.message || "Couldn't send feedback. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Send feedback"
        className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/30 transition-transform hover:scale-105 md:bottom-8 md:right-8"
      >
        <MessageSquarePlus size={20} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
            onClick={handleClose}
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card w-full max-w-md p-6"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  Send Feedback
                </h2>
                <button
                  onClick={handleClose}
                  aria-label="Close"
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <X size={20} />
                </button>
              </div>

              {submitted ? (
                <div className="py-6 text-center">
                  <p className="font-medium text-[var(--text-primary)]">
                    Thanks for the feedback!
                  </p>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    It genuinely helps improve GradeFlow.
                  </p>
                  <button onClick={handleClose} className="btn btn-primary mt-4">
                    Close
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3">
                  <p className="text-sm text-[var(--text-muted)]">
                    Found a bug, or something confusing? Let me know.
                  </p>
                  <textarea
                    className="input-field min-h-[120px] resize-none"
                    placeholder="What's on your mind?"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    maxLength={2000}
                  />
                  {error && (
                    <p className="text-sm text-[var(--danger,#f87171)]">{error}</p>
                  )}
                  <button
                    type="submit"
                    disabled={submitting || !message.trim()}
                    className="btn btn-primary w-full"
                  >
                    {submitting ? "Sending..." : "Send Feedback"}
                  </button>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default FeedbackWidget;

import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import { Menu, X, Sun, Moon } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import FeedbackWidget from "./FeedbackWidget";

const AppLayout = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  return (
    <div className="flex min-h-screen bg-[var(--bg-base)] text-[var(--text-secondary)]">
      {/* Mobile Top Navbar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[var(--bg-surface)]/80 backdrop-blur-xl border-b border-[var(--border)] z-30 flex items-center justify-between px-5">
        <span className="text-lg font-bold text-[var(--accent)] tracking-tight">
          GradeFlow
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="theme-toggle-btn"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-soft)] transition-colors"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      <Sidebar
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        desktopCollapsed={desktopCollapsed}
        setDesktopCollapsed={setDesktopCollapsed}
      />

      {/* Main content area - accounts for sidebar width on desktop */}
      <main
        className={`min-w-0 flex-1 transition-all duration-300 pt-16 md:pt-0 ${
          desktopCollapsed ? "md:ml-[72px]" : "md:ml-[260px]"
        }`}
      >
        {/* Desktop Header */}
        <div className="hidden md:flex justify-end items-center px-8 pt-6 pb-2">
          <button
            onClick={toggleTheme}
            className="theme-toggle-btn"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
          <Outlet />
        </div>
      </main>

      {/* Background ambient glow */}
      <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-[var(--accent)]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 left-1/2 w-[400px] h-[400px] bg-[var(--accent)]/3 rounded-full blur-3xl pointer-events-none" />

      <FeedbackWidget />
    </div>
  );
};

export default AppLayout;

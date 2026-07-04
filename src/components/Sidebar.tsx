import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard,
  BookOpen,
  Target,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Folder,
  Clock,
} from "lucide-react";
interface SidebarProps {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  desktopCollapsed: boolean;
  setDesktopCollapsed: (collapsed: boolean) => void;
}

const Sidebar = ({
  mobileMenuOpen,
  setMobileMenuOpen,
  desktopCollapsed,
  setDesktopCollapsed,
}: SidebarProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Get user initials for avatar
  const initials =
    user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";
  const avatarUrl = user?.avatar_url ?? null;

  return (
    <>
      {/* Mobile Overlay Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-surface-950/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 h-screen flex flex-col border-r border-[var(--border)] bg-[var(--bg-surface)] z-50 transition-all duration-300 
        ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        ${desktopCollapsed ? "md:w-[72px]" : "w-[260px]"}`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-[var(--border)]">
          <span
            className={`text-[var(--text-lg)] font-bold text-[var(--accent)] tracking-tight ${desktopCollapsed ? "md:hidden" : ""}`}
          >
            GradeFlow
          </span>
          <button
            onClick={() => setDesktopCollapsed(!desktopCollapsed)}
            className="hidden md:block p-1.5 rounded-lg hover:bg-[var(--accent-soft)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors shrink-0"
            aria-label={
              desktopCollapsed ? "Expand sidebar" : "Collapse sidebar"
            }
          >
            {desktopCollapsed ? (
              <ChevronRight size={18} />
            ) : (
              <ChevronLeft size={18} />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-2 overflow-y-auto">
          {/* Overview Section */}
          <h3 className={`mt-4 mb-2 px-2 text-sm font-semibold text-[var(--text-muted)] transition-all ${desktopCollapsed ? "md:hidden" : ""}`}>Overview</h3>
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "active" : ""} ${desktopCollapsed ? "md:justify-center md:px-0" : ""}`
            }
            title={desktopCollapsed ? "Dashboard" : undefined}
          >
            <LayoutDashboard size={18} className="shrink-0" />
            <span className={`${desktopCollapsed ? "md:hidden" : ""}`}>Dashboard</span>
          </NavLink>

          {/* Academic Section */}
          <h3 className={`mt-4 mb-2 px-2 text-sm font-semibold text-[var(--text-muted)] transition-all ${desktopCollapsed ? "md:hidden" : ""}`}>Academic</h3>
          <NavLink
            to="/semesters"
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "active" : ""} ${desktopCollapsed ? "md:justify-center md:px-0" : ""}`
            }
            title={desktopCollapsed ? "Semesters" : undefined}
          >
            <Folder size={18} className="shrink-0" />
            <span className={`${desktopCollapsed ? "md:hidden" : ""}`}>Semesters</span>
          </NavLink>
          <NavLink
            to="/courses"
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "active" : ""} ${desktopCollapsed ? "md:justify-center md:px-0" : ""}`
            }
            title={desktopCollapsed ? "Courses" : undefined}
          >
            <BookOpen size={18} className="shrink-0" />
            <span className={`${desktopCollapsed ? "md:hidden" : ""}`}>Courses</span>
          </NavLink>

          {/* Tools Section */}
          <h3 className={`mt-4 mb-2 px-2 text-sm font-semibold text-[var(--text-muted)] transition-all ${desktopCollapsed ? "md:hidden" : ""}`}>Tools</h3>
          <NavLink
            to="/whatif"
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "active" : ""} ${desktopCollapsed ? "md:justify-center md:px-0" : ""}`
            }
            title={desktopCollapsed ? "What-If" : undefined}
          >
            <Clock size={18} className="shrink-0" />
            <span className={`${desktopCollapsed ? "md:hidden" : ""}`}>What-If</span>
          </NavLink>
          <NavLink
            to="/graduation-target"
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "active" : ""} ${desktopCollapsed ? "md:justify-center md:px-0" : ""}`
            }
            title={desktopCollapsed ? "Target" : undefined}
          >
            <Target size={18} className="shrink-0" />
            <span className={`${desktopCollapsed ? "md:hidden" : ""}`}>Target</span>
          </NavLink>
        </nav>

        {/* User section */}
        <div className="p-3 border-t border-[var(--border)]">
          <div
            className={`flex items-center gap-3 ${
              desktopCollapsed ? "md:justify-center" : ""
            }`}
          >
            <button
              type="button"
              onClick={() => navigate("/profile")}
              className={`group flex items-center gap-3 min-w-0 rounded-lg px-2 py-1.5 text-left transition-all duration-150 hover:bg-[var(--accent-soft)] hover:shadow-sm active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-surface)] ${desktopCollapsed ? "md:justify-center md:flex-none" : "flex-1"}`}
              title="View profile"
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={user?.name ?? "Profile avatar"}
                  className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-[var(--border)] transition-transform duration-150 group-hover:scale-[1.03]"
                />
              ) : (
                <div className="h-9 w-9 shrink-0 rounded-full bg-linear-to-br from-[var(--accent)] to-[var(--accent-hover)] flex items-center justify-center text-white text-xs font-bold transition-transform duration-150 group-hover:scale-[1.03]">
                  {initials}
                </div>
              )}
              <div className={`min-w-0 ${desktopCollapsed ? "md:hidden" : ""}`}>
                <p className="truncate text-[var(--text-sm)] font-medium text-[var(--text-primary)]">
                  {user?.name}
                </p>
                <p className="truncate text-[var(--text-xs)] text-[var(--text-muted)]">
                  {user?.email}
                </p>
              </div>
            </button>
            <button
              onClick={handleLogout}
              className={`p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--accent-soft)] transition-all duration-150 shrink-0 ${desktopCollapsed ? "md:hidden" : ""}`}
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

    </>
  );
};

export default Sidebar;

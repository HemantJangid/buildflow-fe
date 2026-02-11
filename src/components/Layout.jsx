import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Sun, Moon, Download, Share, MoreVertical } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PERMISSIONS } from "@/lib/constants";

const Layout = ({ children }) => {
  const { user, logout, hasPermission, getRoleName, permissions } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showBanner, canInstall, promptInstall, dismissBanner } =
    usePWAInstall();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showRefreshBanner, setShowRefreshBanner] = useState(true);
  const [showInstallInstructionsModal, setShowInstallInstructionsModal] =
    useState(false);

  // Detect if user has a role but no permissions (needs re-login)
  const needsRelogin = user?.role && (!permissions || permissions.length === 0);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleRefreshSession = () => {
    logout();
    navigate("/login");
  };

  // Navigation items grouped by category
  const navGroups = [
    {
      name: "Overview",
      items: [
        {
          path: "/dashboard",
          label: "Dashboard",
          icon: "home",
          permission: null,
        },
      ],
    },
    {
      name: "Attendance",
      items: [
        {
          path: "/attendance/clock-in",
          label: "Clock In/Out",
          icon: "clock",
          permission: PERMISSIONS.ATTENDANCE_CLOCK_IN,
        },
        {
          path: "/attendance/daily-sheet",
          label: "Daily Sheet",
          icon: "calendar",
          permission: PERMISSIONS.ATTENDANCE_READ_ALL,
        },
        {
          path: "/project-members",
          label: "My project members",
          icon: "users",
          permission: PERMISSIONS.PROJECT_MEMBERS_READ,
        },
        {
          path: "/attendance/report",
          label: "Attendance Report",
          icon: "table",
          permission: PERMISSIONS.ATTENDANCE_READ_ALL,
        },
      ],
    },
    {
      name: "Management",
      items: [
        {
          path: "/users",
          label: "Users",
          icon: "user-group",
          permission: PERMISSIONS.USERS_READ,
        },
        {
          path: "/projects",
          label: "Projects",
          icon: "building",
          permission: PERMISSIONS.PROJECTS_READ,
        },
        {
          path: "/change-requests",
          label: "Change Requests",
          icon: "clipboard",
          permission: PERMISSIONS.ATTENDANCE_UPDATE,
        },
      ],
    },
    {
      name: "Analytics",
      items: [
        {
          path: "/expenses",
          label: "Expenses",
          icon: "dollar-sign",
          anyPermission: [
            PERMISSIONS.EXPENSES_CREATE,
            PERMISSIONS.EXPENSES_READ_OWN,
            PERMISSIONS.EXPENSES_READ_ALL,
          ],
        },
        {
          path: "/reports",
          label: "Reports",
          icon: "chart",
          permission: PERMISSIONS.REPORTS_READ,
        },
      ],
    },
    {
      name: "Settings",
      items: [
        {
          path: "/organization/settings",
          label: "Organization Settings",
          icon: "settings",
          permission: PERMISSIONS.SYSTEM_SETTINGS,
        },
        {
          path: "/roles",
          label: "Roles & Permissions",
          icon: "shield",
          permission: PERMISSIONS.ROLES_READ,
        },
      ],
    },
  ];

  // Filter groups and items based on permissions (and optional role restriction)
  const filteredGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (
          item.anyPermission?.length &&
          !item.anyPermission.some((p) => hasPermission(p))
        )
          return false;
        if (item.permission && !hasPermission(item.permission)) return false;
        if (
          item.allowedRoles?.length &&
          !item.allowedRoles.includes(user?.role?.name)
        )
          return false;
        return true;
      }),
    }))
    .filter((group) => group.items.length > 0);

  const getIcon = (iconName) => {
    const icons = {
      home: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      ),
      clock: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      calendar: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      ),
      users: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ),
      "user-group": (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      ),
      building: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
      ),
      clipboard: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          />
        </svg>
      ),
      chart: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
      "dollar-sign": (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      shield: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
      ),
      settings: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      ),
      table: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
      ),
      team: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      ),
    };
    return icons[iconName] || icons.home;
  };

  return (
    <div className="h-screen min-h-0 flex flex-col overflow-hidden bg-background">
      {/* Install app banner - full width above header */}
      {showBanner && (
        <div className="w-full shrink-0 flex items-center justify-between gap-3 px-4 py-2.5 bg-primary text-primary-foreground text-sm">
          <div className="flex items-center gap-2 min-w-0">
            <Download className="w-5 h-5 shrink-0" aria-hidden />
            <span className="truncate">
              Install BuildFlow for quick access and offline use.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="inverse"
              size="sm"
              onClick={async () => {
                if (canInstall) {
                  await promptInstall();
                } else {
                  setShowInstallInstructionsModal(true);
                }
              }}
            >
              Install app
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={dismissBanner}
              title="Dismiss"
              aria-label="Dismiss"
              className="text-primary-foreground hover:bg-primary-foreground/20"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </Button>
          </div>
        </div>
      )}

      {/* How to install modal (when native prompt not available) */}
      <Modal
        open={showInstallInstructionsModal}
        onClose={() => setShowInstallInstructionsModal(false)}
        title="How to install BuildFlow"
        size="lg"
        footer={
          <Button onClick={() => setShowInstallInstructionsModal(false)}>
            Got it
          </Button>
        }
      >
        <div className="space-y-5 text-foreground">
          <p className="text-sm text-muted-foreground">
            Add BuildFlow to your device for quick access and a better
            experience. Follow the steps for your browser:
          </p>

          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
            <h3 className="font-semibold text-base flex items-center gap-2">
              <MoreVertical className="w-5 h-5 text-primary" />
              Chrome or Edge (desktop / Android)
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>
                Click the <strong>three dots</strong> (⋮) in the top-right of
                the browser.
              </li>
              <li>
                Select <strong>“Install BuildFlow app”</strong> or{" "}
                <strong>“Install app”</strong>.
              </li>
              <li>Confirm in the dialog that appears.</li>
            </ol>
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
            <h3 className="font-semibold text-base flex items-center gap-2">
              <Share className="w-5 h-5 text-primary" />
              iPhone or iPad (Safari)
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>
                Tap the <strong>Share</strong> button (square with an arrow
                pointing up) at the bottom of Safari.
              </li>
              <li>
                Scroll and tap <strong>“Add to Home Screen”</strong>.
              </li>
              <li>
                Tap <strong>“Add”</strong> in the top-right.
              </li>
            </ol>
          </div>
        </div>
      </Modal>

      <div className="flex flex-1 min-h-0">
        {/* Mobile sidebar backdrop - frosted so main app is visible */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-20 lg:hidden bg-black/15 backdrop-blur-md"
            onClick={() => setSidebarOpen(false)}
            aria-hidden
          />
        )}

        {/* Sidebar */}
        <aside
          className={cn(
            "fixed lg:static inset-y-0 left-0 z-30 w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-200 ease-in-out",
            sidebarOpen
              ? "translate-x-0"
              : "-translate-x-full lg:translate-x-0",
          )}
        >
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="flex items-center gap-3 px-6 h-16 border-b border-sidebar-border">
              <div className="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center">
                <span className="text-sidebar-primary-foreground font-bold text-lg">
                  B
                </span>
              </div>
              <span className="font-semibold text-xl text-sidebar-foreground">
                BuildFlow
              </span>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-4 px-3">
              {filteredGroups.map((group) => (
                <div key={group.name} className="mb-6">
                  <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {group.name}
                  </p>
                  <div className="space-y-1">
                    {group.items.map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setSidebarOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                          location.pathname === item.path
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                        )}
                      >
                        <span
                          className={
                            location.pathname === item.path
                              ? "text-sidebar-primary"
                              : "text-muted-foreground"
                          }
                        >
                          {getIcon(item.icon)}
                        </span>
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </nav>

            {/* User section at bottom */}
            <div className="border-t border-sidebar-border p-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-sidebar-accent rounded-full flex items-center justify-center shrink-0">
                  <span className="text-sidebar-accent-foreground font-medium text-sm">
                    {user?.name?.charAt(0) || "U"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">
                    {user?.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {getRoleName()}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={toggleTheme}
                  title={
                    theme === "dark"
                      ? "Switch to light mode"
                      : "Switch to dark mode"
                  }
                  aria-label={
                    theme === "dark"
                      ? "Switch to light mode"
                      : "Switch to dark mode"
                  }
                  className="text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-lg"
                >
                  {theme === "dark" ? (
                    <Sun className="w-5 h-5" />
                  ) : (
                    <Moon className="w-5 h-5" />
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleLogout}
                  title="Logout"
                  aria-label="Logout"
                  className="text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-lg"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                </Button>
              </div>
            </div>
          </div>
        </aside>

        {/* Main content area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top header (mobile) */}
          <header className="lg:hidden flex items-center justify-between h-16 px-4 bg-background border-b border-border">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setSidebarOpen(true)}
              className="text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold">B</span>
              </div>
              <span className="font-semibold text-foreground">BuildFlow</span>
            </div>
            <div className="w-10" /> {/* Spacer for centering */}
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
              {/* Session refresh banner */}
              {needsRelogin && showRefreshBanner && (
                <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <svg
                      className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-yellow-800">
                        Session Update Required
                      </h3>
                      <p className="text-sm text-yellow-700 mt-1">
                        Your permissions have been updated. Please log out and
                        log back in to see all your available features.
                      </p>
                      <div className="mt-3 flex gap-3">
                        <Button
                          variant="warning"
                          size="sm"
                          onClick={handleRefreshSession}
                        >
                          Log Out & Refresh
                        </Button>
                        <Button
                          variant="warningSecondary"
                          size="sm"
                          onClick={() => setShowRefreshBanner(false)}
                        >
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Layout;

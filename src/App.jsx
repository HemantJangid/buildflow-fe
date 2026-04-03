import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { OrganizationSettingsProvider } from "./context/OrganizationSettingsContext";
import { ThemeProvider } from "./context/ThemeContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { Toaster } from "./components/ui/sonner";
import { PageLoadingSpinner } from "./components/ui/loading-spinner";
import { PERMISSIONS } from "./lib/constants";

// Login and Signup load eagerly for fast first paint
import Login from "./pages/Login";
import Signup from "./pages/Signup";

// Protected routes lazy-loaded for smaller initial bundle
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ClockIn = lazy(() => import("./pages/ClockIn"));
const Users = lazy(() => import("./pages/Users"));
const Projects = lazy(() => import("./pages/Projects"));
const Reports = lazy(() => import("./pages/Reports"));
const Roles = lazy(() => import("./pages/Roles"));
const ProjectMembers = lazy(() => import("./pages/ProjectMembers"));
const ProjectMembersPage = lazy(() => import("./pages/ProjectMembersPage"));
const AttendanceReport = lazy(() => import("./pages/AttendanceReport"));
const DailyAttendanceSheet = lazy(() => import("./pages/DailyAttendanceSheet"));
const ChangeRequests = lazy(() => import("./pages/ChangeRequests"));
const Expenses = lazy(() => import("./pages/Expenses"));
const Revenue = lazy(() => import("./pages/Revenue"));
const OrganizationSettings = lazy(() => import("./pages/OrganizationSettings"));

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <OrganizationSettingsProvider>
        <BrowserRouter>
          <Toaster />
          <Suspense
            fallback={
              <div className="min-h-screen flex items-center justify-center">
                <PageLoadingSpinner />
              </div>
            }
          >
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />

              {/* Protected Routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/attendance/clock-in"
                element={
                  <ProtectedRoute
                    requiredPermission={PERMISSIONS.ATTENDANCE_CLOCK_IN}
                  >
                    <ClockIn />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/users"
                element={
                  <ProtectedRoute requiredPermission={PERMISSIONS.USERS_READ}>
                    <Users />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/projects"
                element={
                  <ProtectedRoute
                    requiredPermission={PERMISSIONS.PROJECTS_READ}
                  >
                    <Projects />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/projects/:projectId/members"
                element={
                  <ProtectedRoute
                    requiredPermission={PERMISSIONS.PROJECTS_READ}
                  >
                    <ProjectMembersPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/expenses"
                element={
                  <ProtectedRoute
                    requiredAnyPermission={[
                      PERMISSIONS.EXPENSES_CREATE,
                      PERMISSIONS.EXPENSES_READ_OWN,
                      PERMISSIONS.EXPENSES_READ_ALL,
                    ]}
                  >
                    <Expenses />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/revenue"
                element={
                  <ProtectedRoute requiredPermission={PERMISSIONS.REVENUE_READ}>
                    <Revenue />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/reports"
                element={
                  <ProtectedRoute requiredPermission={PERMISSIONS.REPORTS_READ}>
                    <Reports />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/organization/settings"
                element={
                  <ProtectedRoute
                    requiredPermission={PERMISSIONS.SYSTEM_SETTINGS}
                  >
                    <OrganizationSettings />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/roles"
                element={
                  <ProtectedRoute requiredPermission={PERMISSIONS.ROLES_READ}>
                    <Roles />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/project-members"
                element={
                  <ProtectedRoute
                    requiredPermission={PERMISSIONS.PROJECT_MEMBERS_READ}
                  >
                    <ProjectMembers />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/change-requests"
                element={
                  <ProtectedRoute
                    requiredAnyPermission={[
                      PERMISSIONS.PROJECT_MEMBERS_READ,
                      PERMISSIONS.ATTENDANCE_UPDATE,
                    ]}
                  >
                    <ChangeRequests />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/attendance/report"
                element={
                  <ProtectedRoute
                    requiredPermission={PERMISSIONS.ATTENDANCE_READ_ALL}
                  >
                    <AttendanceReport />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/attendance/daily-sheet"
                element={
                  <ProtectedRoute
                    requiredPermission={PERMISSIONS.ATTENDANCE_READ_ALL}
                  >
                    <DailyAttendanceSheet />
                  </ProtectedRoute>
                }
              />

              {/* Redirect root to dashboard */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />

              {/* Catch all - redirect to dashboard */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        </OrganizationSettingsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

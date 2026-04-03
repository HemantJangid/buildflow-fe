import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, ClipboardList, Users, Building2, Calendar, FileText, TrendingUp } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { attendanceAPI, authAPI, projectAPI, supervisorAPI, expenseAPI, revenueAPI } from '@/services/api';
import PageWrapper from '@/components/PageWrapper';
import { Card, CardContent } from '@/components/ui/card';
import DataTable from '@/components/ui/data-table';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { FormSelectCompact } from '@/components/ui/form-select';
import logger from '@/lib/logger';
import { PERMISSIONS, ROLES, RECORD_STATUS, CHANGE_REQUEST_STATUS, DATE_PRESETS } from '@/lib/constants';

const StatCard = ({ icon: Icon, label, value, valueClassName }) => (
  <div className="rounded-lg border border-border bg-card p-3 flex items-center gap-3">
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
      <Icon className="h-5 w-5" />
    </div>
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-xl font-bold tabular-nums ${valueClassName || 'text-foreground'}`}>{value}</p>
    </div>
  </div>
);

const ShortcutLink = ({ to, icon: Icon, label }) => (
  <Link
    to={to}
    className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
  >
    <Icon className="h-4 w-4 shrink-0 text-primary" />
    {label}
  </Link>
);

const Dashboard = () => {
  const { user, hasPermission, getRoleName, permissions } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProjects: 0,
    activeClockIns: 0,
    pendingChangeRequests: 0,
  });
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [projectMemberStats, setProjectMemberStats] = useState({
    memberCount: 0,
    activeClockIns: 0,
    pendingChangeRequests: 0,
  });
  const [recentAttendance, setRecentAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [financialStats, setFinancialStats] = useState(null);

  const canViewAdminStats =
    hasPermission(PERMISSIONS.USERS_READ) && hasPermission(PERMISSIONS.ATTENDANCE_READ_ALL);
  const canViewProjectMembers = hasPermission(PERMISSIONS.PROJECT_MEMBERS_READ);
  const canClockIn = hasPermission(PERMISSIONS.ATTENDANCE_CLOCK_IN);
  const canReviewChangeRequests = hasPermission(PERMISSIONS.ATTENDANCE_UPDATE);
  const canViewDailySheet = hasPermission(PERMISSIONS.ATTENDANCE_READ_ALL);
  const canViewRevenue = hasPermission(PERMISSIONS.REVENUE_READ);
  const hasAnyPermissions = permissions && permissions.length > 0;

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (canViewAdminStats) {
          const thisMonth = DATE_PRESETS.thisMonth();
          const [usersRes, projectsRes, attendanceRes, pendingRes, revSummary, expSummary] = await Promise.all([
            authAPI.getAllUsers(),
            projectAPI.getAll(),
            attendanceAPI.getAllAttendance({ status: RECORD_STATUS.CLOCKED_IN }),
            canReviewChangeRequests
              ? supervisorAPI.getChangeRequests({ status: CHANGE_REQUEST_STATUS.PENDING, page: 1, limit: 1 })
              : Promise.resolve({ data: { pagination: { total: 0 } } }),
            canViewRevenue
              ? revenueAPI.getSummary({ startDate: thisMonth.startDate, endDate: thisMonth.endDate })
              : Promise.resolve(null),
            expenseAPI.getSummary({ startDate: thisMonth.startDate, endDate: thisMonth.endDate }),
          ]);

          const allUsers = usersRes.data?.data ?? [];
          const projectsData = projectsRes.data?.data ?? [];
          const attendanceData = attendanceRes.data?.data ?? [];
          const pendingTotal = pendingRes?.data?.pagination?.total ?? 0;

          setStats({
            totalUsers: allUsers.filter((u) =>
              [ROLES.SUPERVISOR, ROLES.WORKER].includes(u.role?.name),
            ).length,
            totalProjects: (projectsData).filter((p) => p.isActive).length,
            activeClockIns: attendanceData.length,
            pendingChangeRequests: pendingTotal,
          });
          setRecentAttendance(attendanceData.slice(0, 5));
          const monthRevenue = revSummary?.data?.data?.totalAmount ?? 0;
          const monthExpenses = expSummary?.data?.data?.totalAmount ?? 0;
          setFinancialStats({
            revenue: monthRevenue,
            expenses: monthExpenses,
            netProfit: monthRevenue - monthExpenses,
          });
        } else if (canViewProjectMembers) {
          let projectsList = projects;
          if (projects.length === 0) {
            const projectsRes = await projectAPI.getOptions({ isActive: true });
            projectsList = projectsRes.data?.data ?? [];
            setProjects(projectsList);
          }
          const projectId = selectedProjectId || projectsList[0]?._id;
          if (!selectedProjectId && projectsList[0]?._id) setSelectedProjectId(projectsList[0]._id);
          if (projectId) {
            const [membersRes, attendanceRes, pendingRes] = await Promise.all([
              supervisorAPI.getMyProjectMembers(projectId, { page: 1, limit: 1 }),
              supervisorAPI.getProjectMembersAttendance({ projectId }),
              canReviewChangeRequests
                ? supervisorAPI.getChangeRequests({ status: CHANGE_REQUEST_STATUS.PENDING, projectId, page: 1, limit: 1 })
                : Promise.resolve({ data: { pagination: { total: 0 } } }),
            ]);
            const p = membersRes.data?.pagination ?? {};
            const attendanceData = attendanceRes.data?.data ?? [];
            const pendingTotal = pendingRes?.data?.pagination?.total ?? 0;
            setProjectMemberStats({
              memberCount: p.total ?? 0,
              activeClockIns: attendanceData.filter((a) => a.status === RECORD_STATUS.CLOCKED_IN).length,
              pendingChangeRequests: pendingTotal,
            });
            setRecentAttendance(attendanceData.slice(0, 5));
          } else {
            setProjectMemberStats({ memberCount: 0, activeClockIns: 0, pendingChangeRequests: 0 });
            setRecentAttendance([]);
          }
        } else if (hasPermission(PERMISSIONS.ATTENDANCE_READ_OWN)) {
          const attendanceRes = await attendanceAPI.getMyAttendance();
          setRecentAttendance((attendanceRes.data?.data ?? []).slice(0, 5));
        }
      } catch (error) {
        logger.error("Dashboard fetch error", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [canViewAdminStats, canViewProjectMembers, canReviewChangeRequests, canViewRevenue, selectedProjectId]);

  // No permissions state - custom content
  if (!loading && !hasAnyPermissions) {
    return (
      <PageWrapper showHeader={false}>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Welcome, {user?.name}
            </h1>
            <p className="text-muted-foreground mt-1">
              Role: {getRoleName() || "Not assigned"}
            </p>
          </div>

          <Alert className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
            <AlertTitle>No permissions assigned</AlertTitle>
            <AlertDescription>
              You don't have any permissions assigned to your role. Please
              contact your administrator to get the necessary permissions.
            </AlertDescription>
          </Alert>

          <Card>
            <CardContent className="pt-6 text-center pb-12">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ClipboardList className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No Permissions Available
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Your account doesn't have any permissions yet. This might happen
                if:
              </p>
              <ul className="text-sm text-muted-foreground mt-3 space-y-1">
                <li>• Your role hasn't been configured with permissions</li>
                <li>
                  • The system was recently updated - try logging out and back
                  in
                </li>
                <li>• Your administrator needs to assign you a role</li>
              </ul>
              <Button onClick={() => window.location.reload()} className="mt-6">
                Refresh Page
              </Button>
            </CardContent>
          </Card>
        </div>
      </PageWrapper>
    );
  }

  const isAdmin = canViewAdminStats;
  const isSupervisor = !canViewAdminStats && canViewProjectMembers;

  return (
    <PageWrapper
      title={`Welcome back, ${user?.name}`}
      subtitle={
        isAdmin
          ? "Organization overview"
          : isSupervisor
            ? "Your team at a glance"
            : "Your activity summary"
      }
    >
      {/* Admin: stats + shortcuts */}
      {isAdmin && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard icon={Users} label="Total users" value={stats.totalUsers} />
            <StatCard icon={Building2} label="Active projects" value={stats.totalProjects} />
            <StatCard icon={Clock} label="Active clock-ins" value={stats.activeClockIns} />
            <StatCard icon={ClipboardList} label="Pending change requests" value={stats.pendingChangeRequests} />
          </div>
          {financialStats && (
            <div className="mt-4 space-y-2">
              <h2 className="text-sm font-semibold text-foreground">Financial (this month)</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {canViewRevenue && (
                  <StatCard
                    icon={TrendingUp}
                    label="Revenue (this month)"
                    value={`${Number(financialStats.revenue).toFixed(2)}`}
                  />
                )}
                <StatCard
                  icon={FileText}
                  label="Expenses (this month)"
                  value={`${Number(financialStats.expenses).toFixed(2)}`}
                />
                {canViewRevenue && (
                  <StatCard
                    icon={TrendingUp}
                    label="Net Profit (this month)"
                    value={`${Number(financialStats.netProfit).toFixed(2)}`}
                    valueClassName={
                      financialStats.netProfit >= 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-destructive"
                    }
                  />
                )}
              </div>
            </div>
          )}
          <div className="space-y-2 mt-4">
            <h2 className="text-sm font-semibold text-foreground">Shortcuts</h2>
            <div className="flex flex-wrap gap-2">
              {hasPermission(PERMISSIONS.USERS_READ) && <ShortcutLink to="/users" icon={Users} label="Users" />}
              {hasPermission(PERMISSIONS.PROJECTS_READ) && <ShortcutLink to="/projects" icon={Building2} label="Projects" />}
              {canReviewChangeRequests && <ShortcutLink to="/change-requests" icon={ClipboardList} label="Change requests" />}
              {canViewDailySheet && <ShortcutLink to="/attendance/daily-sheet" icon={Calendar} label="Daily sheet" />}
              {canViewDailySheet && <ShortcutLink to="/attendance/report" icon={FileText} label="Attendance report" />}
            </div>
          </div>
        </>
      )}

      {/* Supervisor: project selector + stats + shortcuts */}
      {isSupervisor && (
        <>
          {projects.length > 0 && (
            <div className="mb-4 max-w-sm">
              <FormSelectCompact
                name="projectId"
                label="Project"
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target?.value ?? '')}
                options={projects}
                placeholder="Select project"
                includeAll={false}
                contentClassName="max-h-60 overflow-y-auto"
              />
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard icon={Users} label="Project members" value={projectMemberStats.memberCount} />
            <StatCard icon={Clock} label="Active clock-ins" value={projectMemberStats.activeClockIns} />
            <StatCard icon={ClipboardList} label="Pending change requests" value={projectMemberStats.pendingChangeRequests} />
          </div>
          <div className="space-y-2 mt-4">
            <h2 className="text-sm font-semibold text-foreground">Shortcuts</h2>
            <div className="flex flex-wrap gap-2">
              {canClockIn && <ShortcutLink to="/attendance/clock-in" icon={Clock} label="Clock in / out" />}
              <ShortcutLink to="/project-members" icon={Users} label="Project members" />
              {canViewDailySheet && <ShortcutLink to="/attendance/daily-sheet" icon={Calendar} label="Daily sheet" />}
              {canReviewChangeRequests && <ShortcutLink to="/change-requests" icon={ClipboardList} label="Change requests" />}
            </div>
          </div>
        </>
      )}

      {/* Worker: prominent CTA + recent attendance */}
      {!isAdmin && !isSupervisor && canClockIn && (
        <div className="space-y-2 mb-4">
          <h2 className="text-sm font-semibold text-foreground">Quick action</h2>
          <Link
            to="/attendance/clock-in"
            className="inline-flex items-center gap-2 rounded-lg border-2 border-primary bg-primary/10 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Clock className="h-5 w-5 shrink-0 text-primary" />
            Clock in / out
          </Link>
        </div>
      )}

      <div className="space-y-2 mt-6">
        <h2 className="text-base font-semibold text-foreground">
          {isAdmin
            ? "Active clock-ins"
            : isSupervisor
              ? "Recent attendance (this project)"
              : "My recent attendance"}
        </h2>
        <DataTable
          loading={loading}
          columns={[
            {
              key: "name",
              label: "Name",
              className: "font-medium",
              render: (record) => record.userId?.name || user?.name,
            },
            {
              key: "project",
              label: "Project",
              hideOn: "sm",
              className: "text-muted-foreground",
              render: (record) => record.projectId?.name || "—",
            },
            {
              key: "status",
              label: "Status",
              headerClassName: "w-24",
              render: (record) => (
                <StatusBadge
                  variant="status"
                  value={record.status}
                  label={record.status === RECORD_STATUS.CLOCKED_IN ? "Active" : "Done"}
                />
              ),
            },
            {
              key: "clockIn",
              label: "Clock-in",
              className: "text-right text-muted-foreground text-xs",
              render: (record) => new Date(record.clockIn).toLocaleString(),
            },
          ]}
          data={recentAttendance}
          emptyMessage="No attendance records found."
        />
      </div>
    </PageWrapper>
  );
};

export default Dashboard;

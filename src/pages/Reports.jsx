import { useState, useEffect, useMemo } from "react";
import { reportAPI, authAPI, projectAPI } from "@/services/api";
import PageWrapper from "@/components/PageWrapper";
import FormActions from "@/components/FormActions";
import DateRangeSelect from "@/components/DateRangeSelect";
import { FormSelectCompact } from "@/components/ui/form-select";
import DataTable from "@/components/ui/data-table";
import {
  Card,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useMessage } from "@/hooks/useMessage";
import { useOrganizationSettings } from "@/context/OrganizationSettingsContext";
import logger from "@/lib/logger";
import { ROLES, REPORT_TYPE, REPORT_TYPE_OPTIONS, PERMISSIONS } from "@/lib/constants";
import { useAuth } from "@/context/AuthContext";

const Reports = () => {
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [plProjectFilter, setPlProjectFilter] = useState("");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [datePreset, setDatePreset] = useState("custom");
  const [report, setReport] = useState(null);
  const [reportType, setReportType] = useState(REPORT_TYPE.USER);
  const [loading, setLoading] = useState(false);
  const { showError, clearMessage } = useMessage();
  const { currency: orgCurrency } = useOrganizationSettings();
  const { hasPermission } = useAuth();
  const canViewPL = hasPermission(PERMISSIONS.REVENUE_READ);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, projectsRes] = await Promise.all([
        authAPI.getUserOptions(),
        projectAPI.getOptions(),
      ]);
      setUsers(
        (usersRes.data.data ?? []).filter(
          (u) => u.role?.name === ROLES.SUPERVISOR,
        ),
      );
      setProjects(projectsRes.data.data ?? []);
    } catch (error) {
      logger.error("Error fetching data", error);
    }
  };

  const generateReport = async () => {
    if (reportType === REPORT_TYPE.USER && !selectedUser) {
      showError("Please select a user");
      return;
    }
    if (reportType === REPORT_TYPE.PROJECT && !selectedProject) {
      showError("Please select a project");
      return;
    }

    setLoading(true);
    clearMessage();
    setReport(null);

    try {
      const params = {};
      if (dateRange.startDate) params.startDate = dateRange.startDate;
      if (dateRange.endDate) params.endDate = dateRange.endDate;

      let response;
      if (reportType === REPORT_TYPE.USER) {
        response = await reportAPI.getUserCost(selectedUser, params);
      } else if (reportType === REPORT_TYPE.PROJECT) {
        response = await reportAPI.getProjectReport(selectedProject, params);
      } else {
        if (plProjectFilter) params.projectId = plProjectFilter;
        response = await reportAPI.getProfitLoss(params);
      }

      setReport(response.data.data);
    } catch (error) {
      showError(error.response?.data?.message || "Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    generateReport();
  };

  const projectReportColumns = useMemo(() => {
    const base = [
      {
        key: "user",
        label: "User",
        render: (s) => (
          <>
            <div className="font-medium text-foreground">{s.user?.name}</div>
            <div className="text-xs text-muted-foreground">{s.user?.email}</div>
          </>
        ),
      },
      {
        key: "days",
        label: "Days",
        className: "text-muted-foreground",
        render: (s) => s.daysWorked,
      },
      {
        key: "hours",
        label: "Hours",
        className: "text-muted-foreground",
        render: (s) => `${s.totalHours}h`,
      },
      {
        key: "workUnits",
        label: "Work units",
        className: "text-muted-foreground",
        render: (s) => s.totalWorkUnits,
      },
      {
        key: "expenses",
        label: "Expenses",
        className: "font-medium",
        render: (s) =>
          `${orgCurrency} ${Number(s.totalExpenses ?? 0).toFixed(2)}`,
      },
    ];
    const hasCost = report?.userSummary?.[0]?.labourCost != null;
    if (hasCost) {
      base.push({
        key: "cost",
        label: "Cost",
        className: "font-medium",
        render: (s) =>
          `${orgCurrency} ${Number(s.labourCost ?? 0).toFixed(2)}`,
      });
    }
    return base;
  }, [report?.userSummary, orgCurrency]);

  return (
    <PageWrapper
      title="Reports"
      subtitle="Generate cost and attendance reports"
    >
      <Card>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <p className="font-semibold text-base">Report settings</p>
            {/* Report type selector — compact tab strip */}
            <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-muted/40 p-1 w-fit">
              {REPORT_TYPE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => { setReportType(option.value); setReport(null); }}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    reportType === option.value
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-end gap-3">
              {reportType !== REPORT_TYPE.PROFIT_LOSS && (
                <div className="w-[200px]">
                  {reportType === REPORT_TYPE.USER ? (
                    <FormSelectCompact
                      name="user"
                      label="User"
                      value={selectedUser}
                      onChange={(e) => setSelectedUser(e.target.value)}
                      options={users}
                      placeholder="Choose user"
                      includeAll={false}
                    />
                  ) : (
                    <FormSelectCompact
                      name="project"
                      label="Project"
                      value={selectedProject}
                      onChange={(e) => setSelectedProject(e.target.value)}
                      options={projects}
                      placeholder="Choose project"
                      includeAll={false}
                    />
                  )}
                </div>
              )}
              {reportType === REPORT_TYPE.PROFIT_LOSS && (
                <div className="w-[200px]">
                  <FormSelectCompact
                    name="plProject"
                    label="Project (optional)"
                    value={plProjectFilter}
                    onChange={(e) => setPlProjectFilter(e.target.value)}
                    options={projects}
                    placeholder="All projects"
                    includeAll
                  />
                </div>
              )}
              <DateRangeSelect
                startDate={dateRange.startDate}
                endDate={dateRange.endDate}
                onStartDateChange={(v) =>
                  setDateRange((prev) => ({ ...prev, startDate: v || "" }))
                }
                onEndDateChange={(v) =>
                  setDateRange((prev) => ({ ...prev, endDate: v || "" }))
                }
                selectedPreset={datePreset}
                onPresetChange={setDatePreset}
              />
            </div>
          </CardContent>
          <CardFooter className="border-t border-border mt-4">
            <FormActions
              showCancel={false}
              submitLabel={loading ? "Generating…" : "Generate report"}
              loading={loading}
              size="sm"
            />
          </CardFooter>
        </form>
      </Card>

      {/* User cost report */}
      {report && reportType === REPORT_TYPE.USER && (
        <div className="space-y-4">
          <div className="rounded-lg border border-border p-4">
            <h2 className="text-base font-semibold text-foreground mb-3">
              {report.user?.name}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Days worked</p>
                <p className="text-xl font-bold text-foreground tabular-nums">
                  {report.summary?.daysWorked}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total hours</p>
                <p className="text-xl font-bold text-foreground tabular-nums">
                  {report.summary?.totalHoursWorked}h
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Work units</p>
                <p className="text-xl font-bold text-foreground tabular-nums">
                  {report.summary?.totalWorkUnits}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Records</p>
                <p className="text-xl font-bold text-foreground tabular-nums">
                  {report.summary?.attendanceCount}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-border p-4">
            <h2 className="text-base font-semibold text-foreground mb-3">
              Cost breakdown
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-1.5 border-b border-border">
                <span className="text-muted-foreground">
                  Base ({report.summary?.daysWorked} days × {orgCurrency}{" "}
                  {Number(report.breakdown?.dailyRate ?? 0).toFixed(2)})
                </span>
                <span className="font-medium">
                  {orgCurrency}{" "}
                  {Number(report.costs?.baseCost ?? 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border">
                <span className="text-muted-foreground">Transport</span>
                <span className="font-medium">
                  {orgCurrency}{" "}
                  {Number(report.costs?.transportCost ?? 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border">
                <span className="text-muted-foreground">Visa</span>
                <span className="font-medium">
                  {orgCurrency}{" "}
                  {Number(report.costs?.visaCost ?? 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border">
                <span className="text-muted-foreground">Fixed extras</span>
                <span className="font-medium">
                  {orgCurrency}{" "}
                  {Number(report.costs?.fixedExtras ?? 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border">
                <span className="text-muted-foreground">
                  Extra site expenses
                </span>
                <span className="font-medium">
                  {orgCurrency}{" "}
                  {Number(report.costs?.extraSiteExpenses ?? 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between py-3 mt-2 rounded-md bg-muted/50 px-3">
                <span className="font-semibold text-foreground">
                  Total cost
                </span>
                <span className="text-xl font-bold text-primary">
                  {orgCurrency}{" "}
                  {Number(report.costs?.totalCost ?? 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profit & Loss Report */}
      {report && reportType === REPORT_TYPE.PROFIT_LOSS && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-foreground">
            Profit &amp; Loss
          </h2>
          {report.totals && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-lg border border-border bg-card p-3">
                <p className="text-xs text-muted-foreground">Total Revenue</p>
                <p className="text-xl font-bold text-foreground tabular-nums">
                  {orgCurrency} {Number(report.totals.totalRevenue ?? 0).toFixed(2)}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card p-3">
                <p className="text-xs text-muted-foreground">Total Expenses</p>
                <p className="text-xl font-bold text-foreground tabular-nums">
                  {orgCurrency} {Number(report.totals.totalExpenses ?? 0).toFixed(2)}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card p-3">
                <p className="text-xs text-muted-foreground">Net Profit</p>
                <p
                  className={cn(
                    "text-xl font-bold tabular-nums",
                    report.totals.netProfit >= 0
                      ? "text-green-600 dark:text-green-400"
                      : "text-destructive",
                  )}
                >
                  {orgCurrency} {Number(report.totals.netProfit ?? 0).toFixed(2)}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card p-3">
                <p className="text-xs text-muted-foreground">Avg Margin</p>
                <p
                  className={cn(
                    "text-xl font-bold tabular-nums",
                    report.totals.avgMargin >= 0
                      ? "text-green-600 dark:text-green-400"
                      : "text-destructive",
                  )}
                >
                  {Number(report.totals.avgMargin ?? 0).toFixed(1)}%
                </p>
              </div>
            </div>
          )}
          <DataTable
            columns={[
              {
                key: "project",
                label: "Project",
                render: (r) => r.projectName || r.projectId,
              },
              {
                key: "revenue",
                label: "Revenue",
                className: "font-medium",
                render: (r) =>
                  `${orgCurrency} ${Number(r.revenue ?? 0).toFixed(2)}`,
              },
              {
                key: "expenses",
                label: "Expenses",
                className: "text-muted-foreground",
                render: (r) =>
                  `${orgCurrency} ${Number(r.expenses ?? 0).toFixed(2)}`,
              },
              {
                key: "netProfit",
                label: "Net Profit",
                render: (r) => (
                  <span
                    className={cn(
                      "font-semibold",
                      r.netProfit >= 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-destructive",
                    )}
                  >
                    {orgCurrency} {Number(r.netProfit ?? 0).toFixed(2)}
                  </span>
                ),
              },
              {
                key: "margin",
                label: "Margin %",
                render: (r) => (
                  <span
                    className={cn(
                      r.margin >= 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-destructive",
                    )}
                  >
                    {Number(r.margin ?? 0).toFixed(1)}%
                  </span>
                ),
              },
            ]}
            data={report.breakdown || []}
            emptyMessage="No data found for the selected period."
            rowKey={(r) => r.projectId}
          />
        </div>
      )}

      {/* Project Report */}
      {report && reportType === REPORT_TYPE.PROJECT && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-foreground">
            Project report
          </h2>
          {report.projectSummary && (
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="mb-3">
                <div className="font-medium text-foreground">
                  {report.projectSummary.projectName}
                </div>
                {(report.projectSummary.startDate ||
                  report.projectSummary.endDate) && (
                  <div className="text-sm text-muted-foreground">
                    {report.projectSummary.startDate &&
                    report.projectSummary.endDate
                      ? `${report.projectSummary.startDate} – ${report.projectSummary.endDate}`
                      : report.projectSummary.startDate ||
                        report.projectSummary.endDate}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Workers</p>
                  <p className="text-lg font-semibold tabular-nums">
                    {report.projectSummary.totalWorkers}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Person-days</p>
                  <p className="text-lg font-semibold tabular-nums">
                    {report.projectSummary.totalPersonDays}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Hours</p>
                  <p className="text-lg font-semibold tabular-nums">
                    {report.projectSummary.totalHours}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Work units</p>
                  <p className="text-lg font-semibold tabular-nums">
                    {report.projectSummary.totalWorkUnits}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Labour cost</p>
                  <p className="text-lg font-semibold tabular-nums">
                    {orgCurrency}{" "}
                    {Number(report.projectSummary.totalLabourCost ?? 0).toFixed(
                      2,
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Expenses</p>
                  <p className="text-lg font-semibold tabular-nums">
                    {orgCurrency}{" "}
                    {Number(
                      report.projectSummary.totalExtraExpenses ?? 0,
                    ).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          )}
          <DataTable
            columns={projectReportColumns}
            data={report.userSummary || []}
            emptyMessage="No attendance records found for this project."
            rowKey={(s, idx) => idx}
          />
          {report.projectSummary && (report.userSummary?.length ?? 0) > 0 && (
            <div className="rounded-md bg-muted/50 px-4 py-2 flex flex-wrap items-center gap-4 text-sm font-medium">
              <span className="text-muted-foreground">Totals:</span>
              <span>{report.projectSummary.totalPersonDays} days</span>
              <span>{report.projectSummary.totalHours} h</span>
              <span>{report.projectSummary.totalWorkUnits} work units</span>
              <span>
                {orgCurrency}{" "}
                {Number(report.projectSummary.totalExtraExpenses ?? 0).toFixed(
                  2,
                )}{" "}
                expenses
              </span>
              {report.userSummary?.[0]?.labourCost != null && (
                <span>
                  {orgCurrency}{" "}
                  {Number(report.projectSummary.totalLabourCost ?? 0).toFixed(
                    2,
                  )}{" "}
                  cost
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </PageWrapper>
  );
};

export default Reports;

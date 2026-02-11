import { useState, useEffect, useMemo } from "react";
import { reportAPI, authAPI, projectAPI } from "@/services/api";
import PageWrapper from "@/components/PageWrapper";
import FormActions from "@/components/FormActions";
import DateRangeSelect from "@/components/DateRangeSelect";
import { FormSelect } from "@/components/ui/form-select";
import DataTable from "@/components/ui/data-table";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useMessage } from "@/hooks/useMessage";
import { useOrganizationSettings } from "@/context/OrganizationSettingsContext";
import logger from "@/lib/logger";
import { ROLES, REPORT_TYPE, REPORT_TYPE_OPTIONS } from "@/lib/constants";
import { Button } from "@/components/ui/button";

const Reports = () => {
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [datePreset, setDatePreset] = useState("custom");
  const [report, setReport] = useState(null);
  const [reportType, setReportType] = useState(REPORT_TYPE.USER);
  const [loading, setLoading] = useState(false);
  const { showError, clearMessage } = useMessage();
  const { currency: orgCurrency } = useOrganizationSettings();

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

      const response =
        reportType === REPORT_TYPE.USER
          ? await reportAPI.getUserCost(selectedUser, params)
          : await reportAPI.getProjectReport(selectedProject, params);

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
        <CardHeader className="pb-1">
          <CardTitle className="text-base">Report settings</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {/* Report type selector - stack on mobile, equal width on desktop */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Report type
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {REPORT_TYPE_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant="outline"
                    className={cn(
                      "h-auto py-3 px-4 rounded-lg text-left flex flex-col items-start",
                      reportType === option.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/50",
                    )}
                    onClick={() => setReportType(option.value)}
                  >
                    <span className="font-medium">{option.label}</span>
                    <p className="text-sm mt-0.5 opacity-85">
                      {option.description}
                    </p>
                  </Button>
                ))}
              </div>
            </div>

            {/* Filters - stack on mobile, row on desktop; items-end so all inputs share one baseline */}
            <div className="flex flex-col sm:gap-2 md:gap-3 sm:flex-row sm:items-end">
              <div className="w-full sm:w-[200px]">
                {reportType === REPORT_TYPE.USER ? (
                  <FormSelect
                    name="user"
                    label="User"
                    value={selectedUser}
                    onValueChange={setSelectedUser}
                    options={users}
                    placeholder="Choose user"
                    labelClassName="text-sm font-medium"
                  />
                ) : (
                  <FormSelect
                    name="project"
                    label="Project"
                    value={selectedProject}
                    onValueChange={setSelectedProject}
                    options={projects}
                    placeholder="Choose project"
                    labelClassName="text-sm font-medium"
                  />
                )}
              </div>
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

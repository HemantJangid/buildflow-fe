import { useState, useEffect, useMemo, useCallback } from "react";
import { attendanceReportAPI, projectAPI, authAPI } from "@/services/api";
import PageWrapper from "@/components/PageWrapper";
import StatCard from "@/components/StatCard";
import FilterCard from "@/components/FilterCard";
import DateRangeSelect from "@/components/DateRangeSelect";
import DataTable from "@/components/ui/data-table";
import { FormSelectCompact } from "@/components/ui/form-select";
import { StatusBadge } from "@/components/ui/status-badge";
import { useMessage } from "@/hooks/useMessage";
import { useFilters } from "@/hooks/useFilters";
import { formatDate, formatTime, getDefaultDateRange } from "@/lib/formatters";
import {
  ATTENDANCE_STATUSES,
  CHANGE_REQUEST_STATUS,
  PAGINATION,
} from "@/lib/constants";
import logger from "@/lib/logger";

const AttendanceReport = () => {
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [datePreset, setDatePreset] = useState("last30Days");
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: PAGINATION.DEFAULT_PAGE_SIZE,
    totalPages: 1,
  });
  const { showApiError, clearMessage } = useMessage();

  const defaultDates = getDefaultDateRange();
  const {
    filters,
    handleFilterChange,
    resetFilters,
    updateFilters,
    buildParams,
  } = useFilters(
    {
      projectId: "",
      userId: "",
      attendanceStatus: "",
      startDate: defaultDates.startDate,
      endDate: defaultDates.endDate,
    },
    {
      onReset: () => setDatePreset("last30Days"),
    },
  );

  // Memoized columns - only recreated when necessary
  const columns = useMemo(
    () => [
      {
        key: "date",
        label: "Date",
        render: (r) => formatDate(r.clockIn),
        className: "text-sm text-foreground",
      },
      {
        key: "worker",
        label: "User",
        render: (r) => (
          <>
            <div className="font-medium text-foreground">
              {r.userId?.name || "Unknown"}
            </div>
            <div className="text-xs text-muted-foreground">
              {r.userId?.email}
            </div>
          </>
        ),
      },
      {
        key: "project",
        label: "Project",
        hideOn: "sm",
        className: "text-muted-foreground",
        render: (r) => r.projectId?.name || "—",
      },
      {
        key: "clockIn",
        label: "Clock in",
        className: "text-sm",
        render: (r) => formatTime(r.clockIn),
      },
      {
        key: "clockOut",
        label: "Clock out",
        className: "text-sm",
        render: (r) => (r.clockOut ? formatTime(r.clockOut) : "—"),
      },
      {
        key: "hours",
        label: "Hours",
        className: "text-sm",
        render: (r) => `${r.hoursWorked?.toFixed(2) ?? "—"}h`,
      },
      {
        key: "required",
        label: "Required",
        hideOn: "lg",
        className: "text-muted-foreground text-sm",
        render: (r) => `${r.minHoursRequired ?? "—"}h`,
      },
      {
        key: "status",
        label: "Status",
        render: (r) => (
          <StatusBadge
            variant="attendance"
            value={r.attendanceStatus || CHANGE_REQUEST_STATUS.PENDING}
          />
        ),
      },
    ],
    [],
  );

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [projectsRes, usersRes] = await Promise.all([
          projectAPI.getOptions({ isActive: true }),
          authAPI.getUserOptions(),
        ]);
        setProjects(projectsRes.data.data ?? []);
        const userList = usersRes.data.data ?? [];
        setUsers(userList.filter((u) => u.isActive !== false));

        if (initialLoad) {
          await fetchReport(1, PAGINATION.DEFAULT_PAGE_SIZE);
          setInitialLoad(false);
        }
      } catch (error) {
        logger.error("Error fetching initial data", error);
      }
    };
    fetchInitialData();
  }, []);

  const fetchReport = useCallback(
    async (page = 1, limit = PAGINATION.DEFAULT_PAGE_SIZE) => {
      setLoading(true);
      clearMessage();

      try {
        const res = await attendanceReportAPI.getReport({
          ...buildParams(),
          page,
          limit,
        });
        // Handle response structure: res.data = { success: true, data: { records, summary, pagination } }
        const responseData = res.data?.data ?? {};
        setRecords(responseData.records ?? []);
        setSummary(responseData.summary ?? null);
        const p = responseData.pagination ?? {};
        // Use pagination.total if available, otherwise fall back to summary.totalRecords
        // Both should be the same, but summary.totalRecords is the source of truth from aggregation
        const totalFromPagination = p.total != null ? Number(p.total) : null;
        const totalFromSummary =
          responseData.summary?.totalRecords != null
            ? Number(responseData.summary.totalRecords)
            : null;
        const totalNum = totalFromPagination ?? totalFromSummary ?? 0;
        const pageNum = p.page != null ? Number(p.page) : page;
        const limitNum = p.limit != null ? Number(p.limit) : limit;
        const totalPagesNum =
          p.totalPages != null
            ? Number(p.totalPages)
            : Math.max(1, Math.ceil(totalNum / limitNum));
        setPagination({
          total: totalNum,
          page: pageNum,
          limit: limitNum,
          totalPages: totalPagesNum,
        });
      } catch (error) {
        logger.error("Error fetching report", error);
        showApiError(error, "Failed to fetch report");
      } finally {
        setLoading(false);
      }
    },
    [buildParams, clearMessage, showApiError],
  );

  const handleApplyFilters = (e) => {
    e.preventDefault();
    fetchReport(1, PAGINATION.DEFAULT_PAGE_SIZE);
  };

  return (
    <PageWrapper
      title="Attendance report"
      subtitle="View and analyze attendance records with filters"
    >
      {/* Filters */}
      <FilterCard
        onSubmit={handleApplyFilters}
        onReset={resetFilters}
        loading={loading}
      >
        <div className="flex flex-wrap items-end gap-3">
          {/* Date Range with Presets */}
          <DateRangeSelect
            startDate={filters.startDate}
            endDate={filters.endDate}
            onStartDateChange={(v) => updateFilters({ startDate: v })}
            onEndDateChange={(v) => updateFilters({ endDate: v })}
            selectedPreset={datePreset}
            onPresetChange={setDatePreset}
          />

          {/* Other Filters */}
          <FormSelectCompact
            name="projectId"
            label="Project"
            value={filters.projectId}
            onChange={handleFilterChange}
            options={projects}
            className="w-[140px]"
          />
          <FormSelectCompact
            name="userId"
            label="User"
            value={filters.userId}
            onChange={handleFilterChange}
            options={users}
            className="w-[140px]"
          />
          <FormSelectCompact
            name="attendanceStatus"
            label="Status"
            value={filters.attendanceStatus}
            onChange={handleFilterChange}
            options={ATTENDANCE_STATUSES}
            className="w-[140px]"
          />
        </div>
      </FilterCard>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          <StatCard label="Records" value={summary.totalRecords} />
          <StatCard label="Hours" value={`${summary.totalHours.toFixed(1)}h`} />
          <StatCard
            label="Present"
            value={summary.presentCount}
            variant="success"
          />
          <StatCard
            label="Partial"
            value={summary.partialCount}
            variant="warning"
          />
          <StatCard
            label="Absent"
            value={summary.absentCount}
            variant="danger"
          />
        </div>
      )}

      {/* Records Table */}
      <div className="space-y-1.5">
        <h2 className="text-base font-semibold text-foreground">
          Attendance records
          {pagination.total > 0 ? ` (${pagination.total})` : ""}
        </h2>
        <DataTable
          columns={columns}
          data={records}
          loading={loading}
          emptyMessage="No records found. Try adjusting your filters."
          pagination={pagination}
          onPageChange={(page) => fetchReport(page, pagination.limit)}
        />
      </div>
    </PageWrapper>
  );
};

export default AttendanceReport;

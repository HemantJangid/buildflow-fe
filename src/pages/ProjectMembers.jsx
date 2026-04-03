import { useState, useEffect } from "react";
import { projectAPI, supervisorAPI } from "@/services/api";
import PageWrapper from "@/components/PageWrapper";
import FormActions from "@/components/FormActions";
import { FormField, DateRangeFields } from "@/components/ui/form-field";
import { FormSelectCompact } from "@/components/ui/form-select";
import DataTable from "@/components/ui/data-table";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { useMessage } from "@/hooks/useMessage";
import { useAuth } from "@/context/AuthContext";
import { formatDuration, formatDate } from "@/lib/formatters";
import logger from "@/lib/logger";
import { ROLES, CHANGE_REQUEST_STATUS, PERMISSIONS, PAGINATION } from "@/lib/constants";

const ProjectMembers = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [projectMembers, setProjectMembers] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("members");
  const { showSuccess, showApiError, showWarning, clearMessage } = useMessage();
  const { hasPermission } = useAuth();
  const [editingAttendance, setEditingAttendance] = useState(null);
  const [changeRequestModal, setChangeRequestModal] = useState(null);
  const [dateFilter, setDateFilter] = useState({ startDate: "", endDate: "" });
  const [membersPagination, setMembersPagination] = useState({ total: 0, page: 1, limit: PAGINATION.DEFAULT_PAGE_SIZE, totalPages: 1 });
  const [attendancePagination, setAttendancePagination] = useState({ total: 0, page: 1, limit: PAGINATION.DEFAULT_PAGE_SIZE, totalPages: 1 });

  useEffect(() => {
    const load = async () => {
      try {
        const res = await projectAPI.getOptions({ isActive: true });
        const list = res.data?.data ?? [];
        setProjects(list);
        if (list.length === 1) setSelectedProjectId(list[0]._id);
      } catch (e) {
        logger.error("Error fetching projects", e);
        showApiError(e, "Failed to load projects");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [showApiError]);

  useEffect(() => {
    if (!selectedProjectId) {
      setProjectMembers([]);
      setAttendance([]);
      setMembersPagination({ total: 0, page: 1, limit: PAGINATION.DEFAULT_PAGE_SIZE, totalPages: 1 });
      setAttendancePagination({ total: 0, page: 1, limit: PAGINATION.DEFAULT_PAGE_SIZE, totalPages: 1 });
      return;
    }
    fetchProjectMembers(1, PAGINATION.DEFAULT_PAGE_SIZE);
    fetchProjectMembersAttendance(1, PAGINATION.DEFAULT_PAGE_SIZE);
  }, [selectedProjectId]);

  const fetchProjectMembers = async (page = 1, limit = PAGINATION.DEFAULT_PAGE_SIZE) => {
    if (!selectedProjectId) return;
    try {
      setLoading(true);
      const response = await supervisorAPI.getMyProjectMembers(selectedProjectId, { page, limit });
      setProjectMembers(response.data.data ?? []);
      const p = response.data.pagination ?? {};
      setMembersPagination({
        total: p.total ?? 0,
        page: p.page ?? 1,
        limit: p.limit ?? limit,
        totalPages: p.totalPages ?? 1,
      });
    } catch (error) {
      logger.error("Error fetching project members", error);
      showApiError(error, "Failed to load project members");
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectMembersAttendance = async (page = 1, limit = PAGINATION.DEFAULT_PAGE_SIZE) => {
    if (!selectedProjectId) return;
    try {
      const params = { projectId: selectedProjectId, page, limit };
      if (dateFilter.startDate) params.startDate = dateFilter.startDate;
      if (dateFilter.endDate) params.endDate = dateFilter.endDate;
      const response = await supervisorAPI.getProjectMembersAttendance(params);
      setAttendance(response.data.data ?? []);
      const p = response.data.pagination ?? {};
      setAttendancePagination({
        total: p.total ?? 0,
        page: p.page ?? 1,
        limit: p.limit ?? limit,
        totalPages: p.totalPages ?? 1,
      });
    } catch (error) {
      logger.error("Error fetching attendance", error);
    }
  };


  const handleUpdateAttendance = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await supervisorAPI.updateProjectMemberAttendance(editingAttendance._id, {
        metadata: {
          workUnits: parseFloat(editingAttendance.workUnits) || 0,
          workType: editingAttendance.workType,
          extraSiteExpenses:
            parseFloat(editingAttendance.extraSiteExpenses) || 0,
        },
      });
      showSuccess("Attendance updated successfully!");
      setEditingAttendance(null);
      fetchProjectMembersAttendance(attendancePagination.page, attendancePagination.limit);
    } catch (error) {
      if (error.response?.data?.requiresChangeRequest) {
        showWarning(
          "This record has already been edited. Please submit a change request.",
        );
        setChangeRequestModal({
          attendanceId: editingAttendance._id,
          attendance: editingAttendance,
        });
      } else {
        showApiError(error, "Failed to update attendance");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitChangeRequest = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await supervisorAPI.submitChangeRequest({
        attendanceId: changeRequestModal.attendanceId,
        proposedChanges: {
          metadata: {
            workUnits: parseFloat(changeRequestModal.workUnits) || 0,
            workType: changeRequestModal.workType,
            extraSiteExpenses:
              parseFloat(changeRequestModal.extraSiteExpenses) || 0,
          },
        },
        reason: changeRequestModal.reason,
      });
      showSuccess("Change request submitted!");
      setChangeRequestModal(null);
      setEditingAttendance(null);
    } catch (error) {
      showApiError(error, "Failed to submit change request");
    } finally {
      setLoading(false);
    }
  };


  const tabs = [
    { id: "members", label: "Project members" },
    { id: "attendance", label: "Attendance" },
  ];

  const projectMemberColumns = [
    {
      key: "member",
      label: "Member",
      render: (m) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium">
            {m.name.charAt(0)}
          </div>
          <span className="font-medium text-foreground">{m.name}</span>
        </div>
      ),
    },
    {
      key: "email",
      label: "Email",
      hideOn: "sm",
      className: "text-muted-foreground",
      render: (m) => m.email,
    },
    {
      key: "role",
      label: "Role",
      headerClassName: "w-28",
      render: (m) => (
        <span className="inline-flex rounded-md px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary">
          {m.role?.name || ROLES.WORKER}
        </span>
      ),
    },
    {
      key: "category",
      label: "Category",
      className: "text-muted-foreground",
      render: (m) => m.category || "—",
    },
  ];

  const attendanceColumns = [
    {
      key: "employee",
      label: "User",
      render: (r) => (
        <>
          <p className="font-medium text-foreground">{r.userId?.name}</p>
          <p className="text-xs text-muted-foreground">{r.projectId?.name}</p>
        </>
      ),
    },
    {
      key: "date",
      label: "Date",
      className: "text-sm text-muted-foreground",
      render: (r) => formatDate(r.clockIn),
    },
    {
      key: "duration",
      label: "Duration",
      className: "text-sm",
      render: (r) => formatDuration(r.clockIn, r.clockOut),
    },
    {
      key: "units",
      label: "Units",
      headerClassName: "w-20",
      className: "text-sm",
      render: (r) => r.metadata?.workUnits ?? 0,
    },
    {
      key: "edited",
      label: "Edited",
      headerClassName: "w-24",
      render: (r) =>
        r.editCount > 0 ? (
          <span className="inline-flex rounded-md px-2 py-0.5 text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400">
            Edited ({r.editCount}x)
          </span>
        ) : (
          <span className="inline-flex rounded-md px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
            No edits
          </span>
        ),
    },
    {
      key: "actions",
      label: "Actions",
      headerClassName: "text-right",
      className: "text-right",
      render: (r) => (
        <Button
          variant="secondary"
          size="sm"
          onClick={() =>
            setEditingAttendance({
              ...r,
              workUnits: r.metadata?.workUnits?.toString() || "",
              workType: r.metadata?.workType || "",
              extraSiteExpenses:
                r.metadata?.extraSiteExpenses?.toString() || "",
            })
          }
        >
          Edit
        </Button>
      ),
    },
  ];


  const membersLoading = selectedProjectId && loading;

  return (
    <PageWrapper
      title="My project members"
      subtitle="People in your projects and their attendance"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <FormSelectCompact
            name="projectId"
            label="Project"
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target?.value ?? "")}
            options={projects.map((p) => ({ _id: p._id, name: p.name }))}
            placeholder="Select project"
            required
            includeAll={false}
          />
        </div>

        {!selectedProjectId ? (
          <div className="rounded-lg border border-border py-12 text-center text-muted-foreground">
            Select a project to view members and attendance.
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="border-b border-border">
              <nav className="flex gap-4">
                {tabs.map((tab) => (
                  <Button
                    key={tab.id}
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "rounded-none border-b-2 -mb-px",
                      activeTab === tab.id
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {tab.label}
                  </Button>
                ))}
              </nav>
            </div>

            {/* Project Members Tab */}
            {activeTab === "members" && (
              <div className="space-y-2">
                <h2 className="text-base font-semibold text-foreground">
                  Project members{membersPagination.total > 0 ? ` (${membersPagination.total})` : ""}
                </h2>
                <DataTable
                  loading={membersLoading}
                  columns={projectMemberColumns}
                  data={projectMembers}
                  emptyMessage="No project members in your projects yet."
                  pagination={membersPagination}
                  onPageChange={(page) => fetchProjectMembers(page, membersPagination.limit)}
                />
              </div>
            )}

            {/* Attendance Tab */}
            {activeTab === "attendance" && (
              <div className="space-y-4">
                <div className="rounded-lg border border-border p-4 flex flex-wrap gap-3 items-end">
                  <DateRangeFields
                    startDate={dateFilter.startDate}
                    endDate={dateFilter.endDate}
                    onStartDateChange={(v) =>
                      setDateFilter({ ...dateFilter, startDate: v })
                    }
                    onEndDateChange={(v) =>
                      setDateFilter({ ...dateFilter, endDate: v })
                    }
                  />
                  <Button size="sm" onClick={() => fetchProjectMembersAttendance(1, attendancePagination.limit)}>
                    Filter
                  </Button>
                </div>

                <div className="space-y-2">
                  <h2 className="text-base font-semibold text-foreground">
                    Attendance{attendancePagination.total > 0 ? ` (${attendancePagination.total})` : ""}
                  </h2>
                  <DataTable
                    loading={loading}
                    columns={attendanceColumns}
                    data={attendance}
                    emptyMessage="No attendance records found."
                    pagination={attendancePagination}
                    onPageChange={(page) => fetchProjectMembersAttendance(page, attendancePagination.limit)}
                  />
                </div>
              </div>
            )}

          </>
        )}
      </div>

      {/* Edit Attendance Modal */}
      {editingAttendance && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Edit attendance</CardTitle>
            </CardHeader>
            <form onSubmit={handleUpdateAttendance}>
              <CardContent className="space-y-4">
                <div className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
                  <p>
                    <strong className="text-foreground">User:</strong>{" "}
                    {editingAttendance.userId?.name}
                  </p>
                  <p>
                    <strong className="text-foreground">Date:</strong>{" "}
                    {formatDate(editingAttendance.clockIn)}
                  </p>
                </div>

                {editingAttendance.editCount > 0 && (
                  <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
                    <AlertTitle>Warning</AlertTitle>
                    <AlertDescription>
                      This record has been edited before. Submitting will create
                      a change request for admin approval.
                    </AlertDescription>
                  </Alert>
                )}

                <FormField
                  label="Work Units"
                  type="number"
                  value={editingAttendance.workUnits}
                  onChange={(e) =>
                    setEditingAttendance({
                      ...editingAttendance,
                      workUnits: e.target.value,
                    })
                  }
                />
                <FormField
                  label="Work Type"
                  value={editingAttendance.workType}
                  onChange={(e) =>
                    setEditingAttendance({
                      ...editingAttendance,
                      workType: e.target.value,
                    })
                  }
                />
                <FormField
                  label="Extra Site Expenses"
                  type="number"
                  value={editingAttendance.extraSiteExpenses}
                  onChange={(e) =>
                    setEditingAttendance({
                      ...editingAttendance,
                      extraSiteExpenses: e.target.value,
                    })
                  }
                />
              </CardContent>
              <CardFooter className="border-t border-border mt-4">
                <FormActions
                  onCancel={() => setEditingAttendance(null)}
                  submitLabel="Update"
                  loading={loading}
                  loadingLabel="Saving..."
                />
              </CardFooter>
            </form>
          </Card>
        </div>
      )}

      {/* Change Request Modal */}
      {changeRequestModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Submit change request</CardTitle>
            </CardHeader>
            <form onSubmit={handleSubmitChangeRequest}>
              <CardContent className="space-y-4">
                <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30">
                  <AlertTitle>Info</AlertTitle>
                  <AlertDescription>
                    This change will be reviewed by an admin before being
                    applied.
                  </AlertDescription>
                </Alert>

                <FormField
                  label="Work Units"
                  type="number"
                  value={changeRequestModal.workUnits || ""}
                  onChange={(e) =>
                    setChangeRequestModal({
                      ...changeRequestModal,
                      workUnits: e.target.value,
                    })
                  }
                />
                <FormField
                  label="Work Type"
                  value={changeRequestModal.workType || ""}
                  onChange={(e) =>
                    setChangeRequestModal({
                      ...changeRequestModal,
                      workType: e.target.value,
                    })
                  }
                />
                <FormField
                  label="Extra Site Expenses"
                  type="number"
                  value={changeRequestModal.extraSiteExpenses || ""}
                  onChange={(e) =>
                    setChangeRequestModal({
                      ...changeRequestModal,
                      extraSiteExpenses: e.target.value,
                    })
                  }
                />
                <FormField
                  label="Reason for Change"
                  value={changeRequestModal.reason || ""}
                  onChange={(e) =>
                    setChangeRequestModal({
                      ...changeRequestModal,
                      reason: e.target.value,
                    })
                  }
                  placeholder="Explain why this change is needed"
                  required
                />
              </CardContent>
              <CardFooter>
                <FormActions
                  onCancel={() => setChangeRequestModal(null)}
                  submitLabel="Submit Request"
                  loading={loading}
                  loadingLabel="Submitting..."
                />
              </CardFooter>
            </form>
          </Card>
        </div>
      )}
    </PageWrapper>
  );
};

export default ProjectMembers;

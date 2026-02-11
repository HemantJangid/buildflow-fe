import { useState, useEffect, useCallback } from "react";
import { supervisorAPI, projectAPI } from "@/services/api";
import { PAGINATION, PERMISSIONS } from "@/lib/constants";
import PageWrapper from "@/components/PageWrapper";
import FormActions from "@/components/FormActions";
import { FormField } from "@/components/ui/form-field";
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
import { formatDateTime } from "@/lib/formatters";
import logger from "@/lib/logger";
import {
  CHANGE_REQUEST_STATUS,
  CHANGE_REQUEST_STATUS_OPTIONS,
} from "@/lib/constants";

const ChangeRequests = () => {
  const [requests, setRequests] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(CHANGE_REQUEST_STATUS.PENDING);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: PAGINATION.DEFAULT_PAGE_SIZE,
    totalPages: 1,
  });
  const { showSuccess, showApiError, clearMessage } = useMessage();
  const { hasPermission } = useAuth();
  const [reviewModal, setReviewModal] = useState(null);
  const canReviewRequests = hasPermission(PERMISSIONS.ATTENDANCE_UPDATE);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const res = await projectAPI.getOptions({ isActive: true });
        setProjects(res.data?.data ?? []);
      } catch (e) {
        logger.error("Error fetching projects", e);
      }
    };
    loadProjects();
  }, []);

  const fetchRequests = useCallback(
    async (page = 1, limit = PAGINATION.DEFAULT_PAGE_SIZE) => {
      setLoading(true);
      try {
        const params = {
          status: filter || undefined,
          page,
          limit,
        };
        if (selectedProjectId) params.projectId = selectedProjectId;
        const response = await supervisorAPI.getChangeRequests(params);
        setRequests(response.data.data ?? []);
        const p = response.data.pagination ?? {};
        setPagination({
          total: p.total ?? 0,
          page: p.page ?? 1,
          limit: p.limit ?? limit,
          totalPages: p.totalPages ?? 1,
        });
      } catch (error) {
        logger.error("Error fetching requests", error);
      } finally {
        setLoading(false);
      }
    },
    [filter, selectedProjectId]
  );

  useEffect(() => {
    fetchRequests(1, PAGINATION.DEFAULT_PAGE_SIZE);
  }, [fetchRequests]);

  const handleReview = async (e) => {
    e.preventDefault();
    setLoading(true);
    clearMessage();

    try {
      await supervisorAPI.reviewChangeRequest(reviewModal._id, {
        status: reviewModal.status,
        reviewNotes: reviewModal.reviewNotes,
      });
      showSuccess(`Request ${reviewModal.status.toLowerCase()} successfully!`);
      setReviewModal(null);
      fetchRequests(pagination.page, pagination.limit);
    } catch (error) {
      showApiError(error, "Failed to review request");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case CHANGE_REQUEST_STATUS.PENDING:
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
      case CHANGE_REQUEST_STATUS.APPROVED:
        return "bg-green-500/10 text-green-600 dark:text-green-400";
      case CHANGE_REQUEST_STATUS.REJECTED:
        return "bg-destructive/10 text-destructive";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const columns = [
    {
      key: "status",
      label: "Status",
      render: (r) => (
        <span
          className={cn(
            "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
            getStatusBadgeClass(r.status),
          )}
        >
          {r.status}
        </span>
      ),
    },
    {
      key: "employee",
      label: "User",
      className: "font-medium",
      render: (r) => r.attendanceId?.userId?.name || "Unknown",
    },
    {
      key: "project",
      label: "Project",
      hideOn: "sm",
      className: "text-muted-foreground",
      render: (r) => r.attendanceId?.projectId?.name || "—",
    },
    {
      key: "requestedBy",
      label: "Requested by",
      hideOn: "md",
      className: "text-muted-foreground",
      render: (r) => r.requestedBy?.name || "—",
    },
    {
      key: "date",
      label: "Date",
      className: "text-muted-foreground text-xs",
      render: (r) => formatDateTime(r.createdAt),
    },
    ...(canReviewRequests
      ? [
          {
            key: "actions",
            label: "Actions",
            headerClassName: "text-right",
            className: "text-right",
            render: (r) =>
              r.status === CHANGE_REQUEST_STATUS.PENDING ? (
                <div className="flex justify-end gap-1.5">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() =>
                      setReviewModal({
                        ...r,
                        status: CHANGE_REQUEST_STATUS.APPROVED,
                        reviewNotes: "",
                      })
                    }
                  >
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() =>
                      setReviewModal({
                        ...r,
                        status: CHANGE_REQUEST_STATUS.REJECTED,
                        reviewNotes: "",
                      })
                    }
                  >
                    Reject
                  </Button>
                </div>
              ) : null,
          },
        ]
      : []),
  ];

  return (
    <PageWrapper
      title="Change requests"
      subtitle={canReviewRequests ? "Review and approve attendance change requests" : "View your change requests"}
    >
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px]">
            <FormSelectCompact
              name="projectId"
              label="Project"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target?.value ?? "")}
              options={projects.map((p) => ({ _id: p._id, name: p.name }))}
              placeholder="All projects"
              includeAll={true}
            />
          </div>
        </div>

        {/* Status Tabs */}
        <div className="border-b border-border">
          <nav className="flex gap-0" aria-label="Filter by status">
            {CHANGE_REQUEST_STATUS_OPTIONS.map(({ value, label }) => (
              <Button
                key={value || "all"}
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setFilter(value)}
                aria-selected={filter === value}
                role="tab"
                className={cn(
                  "rounded-none border-b-2 -mb-px",
                  filter === value
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30",
                )}
              >
                {label}
              </Button>
            ))}
          </nav>
        </div>

        {/* Requests Table */}
        <DataTable
          columns={columns}
          data={requests}
          loading={loading}
          emptyMessage="No change requests found."
          pagination={pagination}
          onPageChange={(page) => fetchRequests(page, pagination.limit)}
        />
      </div>

      {/* Review Modal */}
      {reviewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {reviewModal.status === CHANGE_REQUEST_STATUS.APPROVED
                  ? "Approve"
                  : "Reject"}{" "}
                request
              </CardTitle>
            </CardHeader>
            <form onSubmit={handleReview}>
              <CardContent className="space-y-4">
                <Alert
                  variant="default"
                  className={
                    reviewModal.status === CHANGE_REQUEST_STATUS.APPROVED
                      ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30"
                      : "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30"
                  }
                >
                  <AlertTitle>
                    {reviewModal.status === CHANGE_REQUEST_STATUS.APPROVED
                      ? "Approve"
                      : "Reject"}
                  </AlertTitle>
                  <AlertDescription>
                    {reviewModal.status === CHANGE_REQUEST_STATUS.APPROVED
                      ? "The proposed changes will be applied to the attendance record."
                      : "The request will be rejected and no changes will be made."}
                  </AlertDescription>
                </Alert>

                <FormField
                  name="reviewNotes"
                  label="Review Notes (Optional)"
                  value={reviewModal.reviewNotes}
                  onChange={(e) =>
                    setReviewModal({
                      ...reviewModal,
                      reviewNotes: e.target.value,
                    })
                  }
                  placeholder="Add any notes for the requester"
                />
              </CardContent>
              <CardFooter className="border-t border-border mt-4">
                <FormActions
                  onCancel={() => setReviewModal(null)}
                  submitLabel={
                    reviewModal.status === CHANGE_REQUEST_STATUS.APPROVED
                      ? "Approve"
                      : "Reject"
                  }
                  loading={loading}
                  loadingLabel="Saving..."
                />
              </CardFooter>
            </form>
          </Card>
        </div>
      )}
    </PageWrapper>
  );
};

export default ChangeRequests;

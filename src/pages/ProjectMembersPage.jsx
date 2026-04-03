import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { projectAPI, authAPI } from "@/services/api";
import PageWrapper from "@/components/PageWrapper";
import DataTable from "@/components/ui/data-table";
import { AsyncSearchCombobox } from "@/components/ui/async-search-combobox";
import { Button } from "@/components/ui/button";
import Modal from "@/components/Modal";
import FormActions from "@/components/FormActions";
import { useMessage } from "@/hooks/useMessage";
import logger from "@/lib/logger";
import { PAGINATION } from "@/lib/constants";

export default function ProjectMembersPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(true);
  const [addMemberSelected, setAddMemberSelected] = useState([]);
  const [addMemberSubmitting, setAddMemberSubmitting] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: PAGINATION.DEFAULT_PAGE_SIZE,
    totalPages: 1,
  });
  const { showSuccess, showApiError } = useMessage();

  const fetchProject = useCallback(async () => {
    if (!projectId) return;
    try {
      const res = await projectAPI.getById(projectId);
      setProject(res.data.data);
    } catch (e) {
      logger.error("Error fetching project", e);
      showApiError(e, "Failed to load project");
    }
  }, [projectId, showApiError]);

  const fetchMembers = useCallback(
    async (page = 1, limit = PAGINATION.DEFAULT_PAGE_SIZE) => {
      if (!projectId) return;
      setMembersLoading(true);
      try {
        const res = await projectAPI.getMembers(projectId, { page, limit });
        setMembers(res.data.data ?? []);
        const p = res.data.pagination ?? {};
        setPagination({
          total: p.total ?? 0,
          page: p.page ?? 1,
          limit: p.limit ?? limit,
          totalPages: p.totalPages ?? 1,
        });
      } catch (e) {
        showApiError(e, "Failed to load members");
      } finally {
        setMembersLoading(false);
      }
    },
    [projectId, showApiError]
  );

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  useEffect(() => {
    if (projectId) fetchMembers(1, PAGINATION.DEFAULT_PAGE_SIZE);
  }, [projectId]);

  const handlePageChange = (page) => {
    fetchMembers(page, pagination.limit);
  };

  const fetchUserOptions = useCallback(
    async (query) => {
      try {
        const res = await authAPI.getAllUsers({
          search: query,
          searchBy: "name",
          limit: 50,
          page: 1,
          status: "active",
        });
        const data = res.data?.data ?? [];
        const pagination = res.data?.pagination ?? {};
        const memberIds = new Set(
          members.map((m) => (m.userId?._id || m.userId)?.toString())
        );
        const options = data
          .filter((u) => {
            const id = (u.id ?? u._id)?.toString();
            return id && !memberIds.has(id);
          })
          .map((u) => ({
            id: u.id ?? u._id,
            name: u.name ?? "—",
            email: u.email ?? "",
          }));
        return {
          options,
          total: pagination.total ?? options.length,
        };
      } catch (e) {
        logger.error("Error fetching users for add member", e);
        return { options: [], total: 0 };
      }
    },
    [members]
  );

  const handleBulkAddMembers = async () => {
    if (!projectId || addMemberSelected.length === 0) return;
    setAddMemberSubmitting(true);
    try {
      const userIds = addMemberSelected.map((u) => u.id ?? u._id);
      const res = await projectAPI.addMembersBulk(projectId, { userIds });
      const data = res.data?.data ?? {};
      const added = data.added ?? 0;
      const skipped = data.skipped ?? 0;
      if (added > 0) {
        showSuccess(
          skipped > 0
            ? `${added} member(s) added. ${skipped} skipped (already member or invalid).`
            : `${added} member(s) added.`
        );
      } else if (skipped > 0) {
        showSuccess("No new members added (all already members or invalid).");
      }
      setAddMemberSelected([]);
      setShowAddMemberModal(false);
      fetchMembers(pagination.page, pagination.limit);
    } catch (e) {
      showApiError(e, "Failed to add members");
    } finally {
      setAddMemberSubmitting(false);
    }
  };

  const handleCloseAddMemberModal = () => {
    setShowAddMemberModal(false);
    setAddMemberSelected([]);
  };

  const handleRemoveMember = async (userId) => {
    if (!projectId) return;
    setMembersLoading(true);
    try {
      await projectAPI.removeMember(projectId, userId);
      showSuccess("Member removed");
      fetchMembers(pagination.page, pagination.limit);
    } catch (e) {
      showApiError(e, "Failed to remove member");
    } finally {
      setMembersLoading(false);
    }
  };

  const columns = [
    {
      key: "name",
      label: "Name",
      className: "font-medium",
      render: (m) => {
        const u = m.userId;
        return typeof u === "object" ? u?.name ?? "—" : u;
      },
    },
    {
      key: "email",
      label: "Email",
      className: "text-muted-foreground",
      render: (m) => {
        const u = m.userId;
        return typeof u === "object" ? u?.email ?? "—" : "—";
      },
    },
    {
      key: "category",
      label: "Category",
      className: "text-muted-foreground",
      render: (m) => {
        const u = m.userId;
        return typeof u === "object" ? u?.category ?? "—" : "—";
      },
    },
    {
      key: "minWorkHours",
      label: "Min hours",
      headerClassName: "w-24",
      render: (m) => (m.minWorkHours != null ? m.minWorkHours : "—"),
    },
    {
      key: "actions",
      label: "Actions",
      headerClassName: "text-right",
      className: "text-right",
      render: (m) => {
        const id = typeof m.userId === "object" ? m.userId?._id : m.userId;
        return (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleRemoveMember(id)}
            disabled={membersLoading}
          >
            Remove
          </Button>
        );
      },
    },
  ];

  if (!projectId) {
    return (
      <PageWrapper title="Project members">
        <p className="text-muted-foreground">No project selected.</p>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title={project ? `Members: ${project.name}` : "Project members"}
      subtitle={project ? "Add or remove project members" : ""}
      backButton={
        <Button variant="ghost" size="sm" onClick={() => navigate("/projects")}>
          ← Back
        </Button>
      }
    >
      <Modal
        open={showAddMemberModal}
        onClose={handleCloseAddMemberModal}
        title="Add members to project"
        size="md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleBulkAddMembers();
          }}
        >
          <div className="space-y-4">
            <AsyncSearchCombobox
              fetchOptions={fetchUserOptions}
              value={addMemberSelected}
              onChange={setAddMemberSelected}
              getOptionValue={(opt) => (opt?.id ?? opt?._id)?.toString() ?? ""}
              getOptionLabel={(opt) =>
                opt?.email ? `${opt.name ?? "—"} (${opt.email})` : (opt?.name ?? "—")
              }
              placeholder="Search by name (min 3 characters)..."
              minSearchLength={3}
              debounceMs={300}
              limit={50}
              emptyMessage="No users found."
              minLengthMessage="Type at least 3 characters to search."
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-4">
            <FormActions
              onCancel={handleCloseAddMemberModal}
              submitLabel={addMemberSelected.length > 0 ? `Add ${addMemberSelected.length} members` : "Add members"}
              loading={addMemberSubmitting}
              loadingLabel="Adding…"
              disabled={addMemberSelected.length === 0}
            />
          </div>
        </form>
      </Modal>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">
            Members{pagination.total > 0 ? ` (${pagination.total})` : ""}
          </h2>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowAddMemberModal(true)}
          >
            Add member
          </Button>
        </div>
        <DataTable
          columns={columns}
          data={members}
          loading={loading || membersLoading}
          emptyMessage="No members yet. Click 'Add member' to get started."
          rowKey={(m) => m._id}
          pagination={pagination}
          onPageChange={handlePageChange}
        />
      </div>
    </PageWrapper>
  );
}

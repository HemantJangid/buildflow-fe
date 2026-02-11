import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { projectAPI } from "@/services/api";
import PageWrapper from "@/components/PageWrapper";
import DataTable from "@/components/ui/data-table";
import { FormSelect } from "@/components/ui/form-select";
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
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(true);
  const [addMemberUserId, setAddMemberUserId] = useState("");
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

  useEffect(() => {
    if (!projectId) {
      setUsers([]);
      return;
    }
    const loadUsers = async () => {
      try {
        const res = await projectAPI.getAvailableUsers(projectId);
        setUsers(res.data.data || []);
      } catch (e) {
        logger.error("Error fetching available users", e);
        setUsers([]);
      }
    };
    loadUsers();
  }, [projectId]);

  const handlePageChange = (page) => {
    fetchMembers(page, pagination.limit);
  };

  const handleAddMember = async (e) => {
    e?.preventDefault();
    if (!addMemberUserId || !projectId) return;
    setMembersLoading(true);
    try {
      await projectAPI.addMember(projectId, { userId: addMemberUserId });
      showSuccess("Member added");
      setAddMemberUserId("");
      setShowAddMemberModal(false);
      fetchMembers(pagination.page, pagination.limit);
    } catch (e) {
      showApiError(e, "Failed to add member");
    } finally {
      setMembersLoading(false);
    }
  };

  const handleCloseAddMemberModal = () => {
    setShowAddMemberModal(false);
    setAddMemberUserId("");
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

  const currentMemberIds = members.map(
    (m) => (m.userId?._id || m.userId)?.toString()
  );
  const userOptions = users
    .filter((u) => !currentMemberIds.includes(u._id?.toString()))
    .map((u) => ({
      _id: u._id,
      name: `${u.name || "—"} (${u.email || ""})`,
    }));

  return (
    <PageWrapper
      title={project ? `Members: ${project.name}` : "Project members"}
      subtitle={project ? "Add or remove project members" : ""}
      loading={loading && !project}
      backButton={
        <Button variant="ghost" size="sm" onClick={() => navigate("/projects")}>
          ← Back
        </Button>
      }
    >
      <Modal
        open={showAddMemberModal}
        onClose={handleCloseAddMemberModal}
        title="Add member to project"
        size="md"
      >
        <form onSubmit={handleAddMember}>
          <div className="space-y-4">
            <FormSelect
              name="addMember"
              label="Select user"
              value={addMemberUserId}
              onValueChange={setAddMemberUserId}
              options={userOptions}
              placeholder="Select user to add"
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-4">
            <FormActions
              onCancel={handleCloseAddMemberModal}
              submitLabel="Add member"
              loading={membersLoading}
              loadingLabel="Adding…"
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
          loading={membersLoading}
          emptyMessage="No members yet. Click 'Add member' to get started."
          rowKey={(m) => m._id}
          pagination={pagination}
          onPageChange={handlePageChange}
        />
      </div>
    </PageWrapper>
  );
}

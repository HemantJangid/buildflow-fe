import { useState, useEffect, useCallback } from "react";
import { roleAPI } from "@/services/api";
import { PAGINATION } from "@/lib/constants";
import PageWrapper from "@/components/PageWrapper";
import Modal from "@/components/Modal";
import FormActions from "@/components/FormActions";
import { FormField } from "@/components/ui/form-field";
import DataTable from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import { useMessage } from "@/hooks/useMessage";
import { validateForm, rules } from "@/lib/validation";
import logger from "@/lib/logger";

const Roles = () => {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [groupedPermissions, setGroupedPermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const { showSuccess, showApiError } = useMessage();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    permissions: [],
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: PAGINATION.DEFAULT_PAGE_SIZE,
    totalPages: 1,
  });

  const roleValidationSchema = {
    name: [rules.required, rules.minLength(2)],
  };

  const fetchRoles = useCallback(
    async (page = 1, limit = PAGINATION.DEFAULT_PAGE_SIZE) => {
      try {
        setLoading(true);
        const [rolesRes, permissionsRes] = await Promise.all([
          roleAPI.getAll({ includeInactive: true, page, limit }),
          roleAPI.getPermissions(),
        ]);
        setRoles(rolesRes.data.data ?? []);
        setPermissions(permissionsRes.data.data ?? []);
        setGroupedPermissions(permissionsRes.data.grouped || {});
        const p = rolesRes.data.pagination ?? {};
        setPagination({
          total: p.total ?? 0,
          page: p.page ?? 1,
          limit: p.limit ?? limit,
          totalPages: p.totalPages ?? 1,
        });
      } catch (error) {
        logger.error("Error fetching data", error);
        showApiError(error, "Failed to load roles and permissions");
      } finally {
        setLoading(false);
      }
    },
    [showApiError]
  );

  useEffect(() => {
    fetchRoles(1, PAGINATION.DEFAULT_PAGE_SIZE);
  }, []);

  const fetchData = () => fetchRoles(pagination.page, pagination.limit);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePermissionToggle = (permissionId) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter((id) => id !== permissionId)
        : [...prev.permissions, permissionId],
    }));
  };

  const handleSelectAllInCategory = (category) => {
    const categoryPermIds =
      groupedPermissions[category]?.map((p) => p._id) || [];
    const allSelected = categoryPermIds.every((id) =>
      formData.permissions.includes(id),
    );

    if (allSelected) {
      setFormData((prev) => ({
        ...prev,
        permissions: prev.permissions.filter(
          (id) => !categoryPermIds.includes(id),
        ),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        permissions: [...new Set([...prev.permissions, ...categoryPermIds])],
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});

    const { isValid, errors } = validateForm(formData, roleValidationSchema);
    if (!isValid) {
      setFieldErrors(errors);
      const firstError = Object.values(errors)[0];
      showApiError(null, firstError);
      return;
    }

    setLoading(true);
    try {
      if (editingRole) {
        await roleAPI.update(editingRole._id, formData);
        showSuccess("Role updated successfully!");
      } else {
        await roleAPI.create(formData);
        showSuccess("Role created successfully!");
      }

      fetchData();
      resetForm();
    } catch (error) {
      showApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: "", description: "", permissions: [] });
    setFieldErrors({});
    setEditingRole(null);
    setShowForm(false);
  };

  const handleEdit = (role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description || "",
      permissions: role.permissions?.map((p) => p._id) || [],
    });
    setShowForm(true);
  };

  const handleDelete = async (role) => {
    if (
      !confirm(`Are you sure you want to deactivate the role "${role.name}"?`)
    )
      return;

    try {
      await roleAPI.delete(role._id);
      showSuccess("Role deactivated successfully!");
      fetchData();
    } catch (error) {
      showApiError(error, "Failed to deactivate role");
    }
  };

  const columns = [
    {
      key: "name",
      label: "Name",
      className: "font-medium",
      render: (r) => (
        <div className="flex items-center gap-2">
          {r.name}
          {r.isSystem && (
            <span className="inline-flex rounded-md px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary">
              System
            </span>
          )}
        </div>
      ),
    },
    {
      key: "description",
      label: "Description",
      hideOn: "md",
      className: "text-muted-foreground max-w-[200px] truncate",
      render: (r) => r.description || "—",
    },
    {
      key: "permissions",
      label: "Permissions",
      headerClassName: "w-24",
      className: "text-muted-foreground",
      render: (r) => r.permissions?.length ?? 0,
    },
    {
      key: "status",
      label: "Status",
      headerClassName: "w-24",
      render: (r) => <StatusBadge variant="active" value={r.isActive} />,
    },
    {
      key: "actions",
      label: "Actions",
      headerClassName: "text-right",
      className: "text-right",
      render: (r) => (
        <div className="flex justify-end gap-1.5">
          <Button variant="secondary" size="sm" onClick={() => handleEdit(r)}>
            Edit
          </Button>
          {!r.isSystem && r.isActive && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleDelete(r)}
            >
              Deactivate
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <PageWrapper
      title="Roles & permissions"
      subtitle="Manage user roles and their permissions"
      loading={loading && roles.length === 0}
      headerAction={
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "Create role"}
        </Button>
      }
    >
      <Modal
        open={showForm}
        onClose={resetForm}
        title={editingRole ? "Edit role" : "Create new role"}
        size="2xl"
      >
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  name="name"
                  label="Role name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Project Lead"
                  required
                  disabled={editingRole?.isSystem}
                  error={fieldErrors.name}
                />
                <FormField
                  name="description"
                  label="Description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Brief description"
                />
              </div>
              <div>
                <h3 className="font-medium text-foreground mb-3 text-sm">
                  Permissions
                </h3>
                <div className="space-y-4">
                  {Object.entries(groupedPermissions).map(
                    ([category, perms]) => (
                      <div
                        key={category}
                        className="rounded-lg border border-border p-3"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-foreground capitalize text-sm">
                            {category}
                          </h4>
                          <Button
                            type="button"
                            variant="link"
                            size="xs"
                            onClick={() => handleSelectAllInCategory(category)}
                            className="text-xs h-auto p-0"
                          >
                            {perms.every((p) =>
                              formData.permissions.includes(p._id),
                            )
                              ? "Deselect all"
                              : "Select all"}
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {perms.map((permission) => (
                            <label
                              key={permission._id}
                              className="flex items-start gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer text-sm"
                            >
                              <input
                                type="checkbox"
                                checked={formData.permissions.includes(
                                  permission._id,
                                )}
                                onChange={() =>
                                  handlePermissionToggle(permission._id)
                                }
                                className="mt-0.5 h-4 w-4 rounded border-input text-primary focus:ring-ring"
                              />
                              <div className="min-w-0">
                                <p className="font-medium text-foreground">
                                  {permission.name}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {permission.description}
                                </p>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    ),
                  )}
                </div>
          </div>
          </div>
          <div className={cn("flex justify-between items-center pt-4 border-t border-border")}>
            <p className="text-xs text-muted-foreground">
              {formData.permissions.length} selected
            </p>
            <FormActions
              onCancel={resetForm}
              submitLabel={editingRole ? "Update" : "Create"}
              loading={loading}
              loadingLabel="Saving…"
              size="sm"
            />
          </div>
        </form>
      </Modal>

      <div className="space-y-2">
        <h2 className="text-base font-semibold text-foreground">
          All roles{pagination.total > 0 ? ` (${pagination.total})` : ""}
        </h2>
        <DataTable
          columns={columns}
          data={roles}
          loading={loading}
          emptyMessage="No roles found. Create your first role to get started."
          pagination={pagination}
          onPageChange={(page) => fetchRoles(page, pagination.limit)}
        />
      </div>
    </PageWrapper>
  );
};

export default Roles;

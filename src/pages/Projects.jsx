import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { projectAPI } from "@/services/api";
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
import { PAGINATION } from "@/lib/constants";

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: PAGINATION.DEFAULT_PAGE_SIZE, totalPages: 1 });
  const navigate = useNavigate();
  const { showSuccess, showApiError, clearMessage } = useMessage();
  const [formData, setFormData] = useState({
    name: "",
    lat: "",
    lng: "",
    radius: "100",
    description: "",
  });
  const [fieldErrors, setFieldErrors] = useState({});

  const fetchProjects = useCallback(async (page = 1, limit = PAGINATION.DEFAULT_PAGE_SIZE) => {
    try {
      setLoading(true);
      const response = await projectAPI.getAll({ page, limit });
      setProjects(response.data.data ?? []);
      const p = response.data.pagination ?? {};
      setPagination({
        total: p.total ?? 0,
        page: p.page ?? 1,
        limit: p.limit ?? limit,
        totalPages: p.totalPages ?? 1,
      });
    } catch (error) {
      logger.error("Error fetching projects", error);
      showApiError(error, "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, [showApiError]);

  useEffect(() => {
    fetchProjects(1, PAGINATION.DEFAULT_PAGE_SIZE);
  }, []);

  const handlePageChange = (page) => {
    fetchProjects(page, pagination.limit);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearMessage();
    setFieldErrors({});

    const schema = {
      name: [rules.required],
      lat: [
        rules.required,
        (v) =>
          v !== "" &&
          (Number.isNaN(Number(v)) || Number(v) < -90 || Number(v) > 90)
            ? "Latitude must be between -90 and 90"
            : null,
      ],
      lng: [
        rules.required,
        (v) =>
          v !== "" &&
          (Number.isNaN(Number(v)) || Number(v) < -180 || Number(v) > 180)
            ? "Longitude must be between -180 and 180"
            : null,
      ],
      radius: [
        (v) =>
          v !== "" && (Number.isNaN(Number(v)) || Number(v) < 0)
            ? "Radius must be 0 or more"
            : null,
      ],
    };
    const { isValid, errors } = validateForm(formData, schema);
    if (!isValid) {
      setFieldErrors(errors);
      const firstError = Object.values(errors)[0];
      showApiError({ response: { data: { message: firstError } } }, firstError);
      return;
    }

    setLoading(true);
    const projectData = {
      name: formData.name.trim(),
      location: {
        lat: parseFloat(formData.lat),
        lng: parseFloat(formData.lng),
      },
      radius: parseFloat(formData.radius) || 100,
      description: formData.description?.trim() || "",
    };

    try {
      if (editingProject) {
        await projectAPI.update(editingProject._id, projectData);
        showSuccess("Project updated successfully!");
      } else {
        await projectAPI.create(projectData);
        showSuccess("Project created successfully!");
      }

      fetchProjects();
      resetForm();
    } catch (error) {
      showApiError(error);
      setFieldErrors({});
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: "", lat: "", lng: "", radius: "100", description: "" });
    setFieldErrors({});
    setEditingProject(null);
    setShowForm(false);
  };

  const handleEdit = (project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      lat: project.location?.lat?.toString() || "",
      lng: project.location?.lng?.toString() || "",
      radius: project.radius?.toString() || "100",
      description: project.description || "",
    });
    setShowForm(true);
  };

  const handleToggleActive = async (project) => {
    try {
      await projectAPI.update(project._id, { isActive: !project.isActive });
      fetchProjects();
      showSuccess(
        `Project ${project.isActive ? "deactivated" : "activated"} successfully!`,
      );
    } catch (error) {
      showApiError(error, "Failed to update project status");
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData({
            ...formData,
            lat: position.coords.latitude.toString(),
            lng: position.coords.longitude.toString(),
          });
        },
        () => {
          showApiError({ message: "Unable to get current location" });
        },
      );
    }
  };

  const columns = [
    {
      key: "name",
      label: "Name",
      className: "font-medium",
      render: (p) => p.name,
    },
    {
      key: "description",
      label: "Description",
      hideOn: "md",
      className: "text-muted-foreground max-w-[200px] truncate",
      render: (p) => p.description || "—",
    },
    {
      key: "location",
      label: "Location",
      className: "text-muted-foreground text-sm font-mono",
      render: (p) =>
        p.location?.lat != null
          ? `${Number(p.location.lat).toFixed(4)}, ${Number(p.location.lng).toFixed(4)}`
          : "—",
    },
    {
      key: "radius",
      label: "Radius",
      headerClassName: "w-20",
      className: "text-muted-foreground",
      render: (p) => `${p.radius ?? 100}m`,
    },
    {
      key: "status",
      label: "Status",
      headerClassName: "w-24",
      render: (p) => <StatusBadge variant="active" value={p.isActive} />,
    },
    {
      key: "actions",
      label: "Actions",
      headerClassName: "text-right",
      className: "text-right",
      render: (p) => (
        <div className="flex justify-end gap-1.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate(`/projects/${p._id}/members`)}
          >
            Members
          </Button>
          <Button variant="secondary" size="sm" onClick={() => handleEdit(p)}>
            Edit
          </Button>
          <Button
            variant={p.isActive ? "destructive" : "default"}
            size="sm"
            onClick={() => handleToggleActive(p)}
          >
            {p.isActive ? "Deactivate" : "Activate"}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <PageWrapper
      title="Projects"
      subtitle="Manage project sites and geofences"
      loading={loading && projects.length === 0}
      headerAction={
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "Add Project"}
        </Button>
      }
    >
      <Modal
        open={showForm}
        onClose={resetForm}
        title={editingProject ? "Edit project" : "Create new project"}
        size="lg"
      >
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <FormField
              name="name"
              label="Project name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter project name"
              required
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                name="lat"
                label="Latitude"
                type="number"
                step="any"
                value={formData.lat}
                onChange={handleChange}
                placeholder="-90 to 90"
                required
              />
              <FormField
                name="lng"
                label="Longitude"
                type="number"
                step="any"
                value={formData.lng}
                onChange={handleChange}
                placeholder="-180 to 180"
                required
              />
              <FormField
                name="radius"
                label="Geofence radius (m)"
                type="number"
                value={formData.radius}
                onChange={handleChange}
                placeholder="100"
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={getCurrentLocation}
            >
              Use current location
            </Button>
            <FormField
              name="description"
              label="Description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Optional"
            />
          </div>
          <div
            className={cn("flex justify-end gap-3 pt-4 border-t border-border")}
          >
            <FormActions
              onCancel={resetForm}
              submitLabel={editingProject ? "Update" : "Create"}
              loading={loading}
              loadingLabel="Saving…"
            />
          </div>
        </form>
      </Modal>

      <div className="space-y-2">
        <h2 className="text-base font-semibold text-foreground">
          All projects{pagination.total > 0 ? ` (${pagination.total})` : ""}
        </h2>
        <DataTable
          columns={columns}
          data={projects}
          loading={loading}
          emptyMessage="No projects found. Create your first project to get started."
          rowKey={(p) => p._id}
          pagination={pagination}
          onPageChange={handlePageChange}
        />
      </div>
    </PageWrapper>
  );
};

export default Projects;

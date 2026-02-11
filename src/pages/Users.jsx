import { useState, useEffect, useCallback, useRef } from "react";
import { authAPI, roleAPI } from "@/services/api";
import PageWrapper from "@/components/PageWrapper";
import Modal from "@/components/Modal";
import FormActions from "@/components/FormActions";
import FormSection from "@/components/FormSection";
import { FormField } from "@/components/ui/form-field";
import { FormSelect } from "@/components/ui/form-select";
import { FormSearchByInput } from "@/components/ui/form-search-by-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DataTable from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useMessage } from "@/hooks/useMessage";
import { useAuth } from "@/context/AuthContext";
import { useOrganizationSettings } from "@/context/OrganizationSettingsContext";
import { formatDate } from "@/lib/formatters";
import logger from "@/lib/logger";
import { validateForm, rules } from "@/lib/validation";
import { ROLES, USER_CATEGORIES, PAGINATION } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X } from "lucide-react";

const SEARCH_BY_OPTIONS = [
  { _id: "name", name: "Name" },
  { _id: "email", name: "Email" },
];

const STATUS_OPTIONS = [
  { _id: "all", name: "All" },
  { _id: "active", name: "Active" },
  { _id: "inactive", name: "Inactive" },
];

const ALL_VALUE = "all";

const Users = () => {
  const { user: currentUser } = useAuth();
  const { currency: orgCurrency } = useOrganizationSettings();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchBy, setSearchBy] = useState("name");
  const [filterRoleId, setFilterRoleId] = useState(ALL_VALUE);
  const [filterCategory, setFilterCategory] = useState(ALL_VALUE);
  const [filterStatus, setFilterStatus] = useState(ALL_VALUE);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: PAGINATION.DEFAULT_PAGE_SIZE,
    totalPages: 1,
  });
  const { showSuccess, showApiError } = useMessage();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    roleId: "",
    category: "",
    minWorkHours: "8",
    dailyRate: "",
    visaCost: "",
    visaExpiry: "",
    transportCost: "",
    fixedExtras: "",
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [rolePopoverOpen, setRolePopoverOpen] = useState(false);
  const rolePopoverCloseRef = useRef(null);

  const fetchUsers = useCallback(
    async (page = 1, limit = PAGINATION.DEFAULT_PAGE_SIZE, opts = {}) => {
      try {
        setLoading(true);
        const params = { page, limit };
        if (opts.search != null && opts.search !== "")
          params.search = opts.search;
        if (opts.searchBy) params.searchBy = opts.searchBy;
        if (opts.roleId) params.roleId = opts.roleId;
        if (opts.category) params.category = opts.category;
        if (opts.status) params.status = opts.status;
        const usersRes = await authAPI.getAllUsers(params);
        const data = usersRes?.data?.data;
        const pag = usersRes?.data?.pagination;
        setUsers(Array.isArray(data) ? data : []);
        const p = pag ?? {};
        setPagination({
          total: p.total ?? 0,
          page: p.page ?? 1,
          limit: p.limit ?? limit,
          totalPages: p.totalPages ?? 1,
        });
      } catch (error) {
        logger.error("Error fetching users", error);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const getFilterParams = useCallback(
    () => ({
      search: searchTerm.trim() || undefined,
      searchBy,
      roleId:
        filterRoleId && filterRoleId !== ALL_VALUE ? filterRoleId : undefined,
      category:
        filterCategory && filterCategory !== ALL_VALUE
          ? filterCategory
          : undefined,
      status:
        filterStatus && filterStatus !== ALL_VALUE ? filterStatus : undefined,
    }),
    [searchTerm, searchBy, filterRoleId, filterCategory, filterStatus],
  );

  // Apply filters: debounce 200ms when any filter/search changes
  useEffect(() => {
    const params = {
      search: searchTerm.trim() || undefined,
      searchBy,
      roleId:
        filterRoleId && filterRoleId !== ALL_VALUE ? filterRoleId : undefined,
      category:
        filterCategory && filterCategory !== ALL_VALUE
          ? filterCategory
          : undefined,
      status:
        filterStatus && filterStatus !== ALL_VALUE ? filterStatus : undefined,
    };
    const hasFilters =
      params.search || params.roleId || params.category || params.status;
    const t = setTimeout(
      () => fetchUsers(1, pagination.limit, params),
      hasFilters ? 200 : 0,
    );
    return () => clearTimeout(t);
  }, [searchTerm, searchBy, filterRoleId, filterCategory, filterStatus]);

  const clearFilters = useCallback(() => {
    setSearchTerm("");
    setSearchBy("name");
    setFilterRoleId(ALL_VALUE);
    setFilterCategory(ALL_VALUE);
    setFilterStatus(ALL_VALUE);
    fetchUsers(1, pagination.limit, {});
  }, [fetchUsers, pagination.limit]);

  useEffect(() => {
    const loadRoles = async () => {
      try {
        const rolesRes = await roleAPI.getOptions();
        setRoles(rolesRes.data.data ?? []);
      } catch (e) {
        logger.error("Error fetching roles", e);
      }
    };
    loadRoles();
  }, []);

  const fetchData = () => fetchUsers(pagination.page, pagination.limit);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});

    const schema = {
      name: [rules.required],
      roleId: [rules.required],
      ...(editingUser
        ? {}
        : {
            email: [rules.required, rules.email],
            password: [rules.required, rules.minLength(6)],
          }),
    };
    const { isValid, errors } = validateForm(formData, schema);
    if (!isValid) {
      setFieldErrors(errors);
      const firstError = Object.values(errors)[0];
      showApiError({ response: { data: { message: firstError } } }, firstError);
      return;
    }

    setLoading(true);
    try {
      if (editingUser) {
        const isOrgOwner = editingUser.isOrgOwner;
        await authAPI.updateUser(editingUser._id, {
          name: formData.name,
          roleId: isOrgOwner ? undefined : formData.roleId || undefined,
          category: formData.category || undefined,
          minWorkHours: parseFloat(formData.minWorkHours) || 8,
          metadata: {
            dailyRate: parseFloat(formData.dailyRate) || 0,
            visaCost: parseFloat(formData.visaCost) || 0,
            visaExpiry: formData.visaExpiry || null,
            transportCost: parseFloat(formData.transportCost) || 0,
            fixedExtras: parseFloat(formData.fixedExtras) || 0,
          },
        });
        showSuccess("User updated successfully!");
      } else {
        await authAPI.register({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          roleId: formData.roleId,
          category: formData.category || undefined,
          minWorkHours: parseFloat(formData.minWorkHours) || 8,
          metadata: {
            dailyRate: parseFloat(formData.dailyRate) || 0,
            visaCost: parseFloat(formData.visaCost) || 0,
            visaExpiry: formData.visaExpiry || null,
            transportCost: parseFloat(formData.transportCost) || 0,
            fixedExtras: parseFloat(formData.fixedExtras) || 0,
          },
        });
        showSuccess("User created successfully!");
      }

      fetchData();
      resetForm();
    } catch (error) {
      showApiError(error);
      setFieldErrors({});
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      password: "",
      roleId: "",
      category: "",
      minWorkHours: "8",
      dailyRate: "",
      visaCost: "",
      visaExpiry: "",
      transportCost: "",
      fixedExtras: "",
    });
    setFieldErrors({});
    setEditingUser(null);
    setShowForm(false);
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: "",
      roleId: user.role?._id || "",
      category: user.category || "",
      minWorkHours: user.minWorkHours?.toString() || "8",
      dailyRate: user.metadata?.dailyRate?.toString() || "",
      visaCost: user.metadata?.visaCost?.toString() || "",
      visaExpiry: user.metadata?.visaExpiry?.split("T")[0] || "",
      transportCost: user.metadata?.transportCost?.toString() || "",
      fixedExtras: user.metadata?.fixedExtras?.toString() || "",
    });
    setShowForm(true);
  };

  const getRoleBadgeClass = (roleName) => {
    switch (roleName) {
      case ROLES.ADMIN:
        return "bg-red-500/10 text-red-600 dark:text-red-400";
      case ROLES.SUPERVISOR:
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400";
      case ROLES.WORKER:
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
      case ROLES.MANAGER:
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400"; // custom role
      default:
        return "bg-primary/10 text-primary";
    }
  };

  const isCurrentUser = (row) =>
    currentUser && String(row.id ?? row._id) === String(currentUser._id);

  const columns = [
    {
      key: "user",
      label: "User",
      className: "font-medium",
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium">
            {row.name?.charAt(0) ?? "?"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-foreground">{row.name}</span>
              {isCurrentUser(row) && (
                <span className="rounded bg-primary/15 px-1.5 py-0.5 text-xs font-medium text-primary">
                  You
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground">{row.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      label: "Role",
      render: (row) => (
        <span
          className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${getRoleBadgeClass(row.role?.name)}`}
        >
          {row.role?.name || "Unknown"}
        </span>
      ),
    },
    {
      key: "category",
      label: "Category",
      className: "text-muted-foreground",
      render: (row) => row.category || "—",
    },
    {
      key: "minHours",
      label: "Min Hours",
      headerClassName: "w-24",
      className: "text-muted-foreground",
      render: (row) => `${row.minWorkHours || 8}h`,
    },
    {
      key: "dailyRate",
      label: "Daily Rate",
      render: (row) =>
        `${orgCurrency} ${Number(row.metadata?.dailyRate ?? 0).toFixed(2)}`,
    },
    {
      key: "visaExpiry",
      label: "Visa Expiry",
      className: "text-muted-foreground",
      render: (row) =>
        row.metadata?.visaExpiry ? formatDate(row.metadata.visaExpiry) : "—",
    },
    {
      key: "actions",
      label: "Actions",
      headerClassName: "text-right",
      className: "text-right",
      render: (row) => (
        <Button variant="secondary" size="sm" onClick={() => handleEdit(row)}>
          Edit
        </Button>
      ),
    },
  ];

  return (
    <PageWrapper
      title="User management"
      subtitle="Create and manage users, assign roles (Worker, Supervisor, Admin)"
      loading={loading && users.length === 0}
      headerAction={
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "Add user"}
        </Button>
      }
    >
      <Modal
        open={showForm}
        onClose={resetForm}
        title={editingUser ? "Edit user" : "Create new user"}
        size="xl"
      >
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                name="name"
                label="Name"
                value={formData.name}
                onChange={handleChange}
                required
                error={fieldErrors.name}
              />
              <FormField
                name="email"
                label="Email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                disabled={!!editingUser}
                required={!editingUser}
                error={fieldErrors.email}
              />
              {!editingUser && (
                <FormField
                  name="password"
                  label="Password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  error={fieldErrors.password}
                />
              )}
              <Popover open={rolePopoverOpen} onOpenChange={setRolePopoverOpen}>
                <PopoverAnchor asChild>
                  <div
                    className="space-y-2"
                    onMouseEnter={
                      editingUser?.isOrgOwner
                        ? () => {
                            if (rolePopoverCloseRef.current) {
                              clearTimeout(rolePopoverCloseRef.current);
                              rolePopoverCloseRef.current = null;
                            }
                            setRolePopoverOpen(true);
                          }
                        : undefined
                    }
                    onMouseLeave={
                      editingUser?.isOrgOwner
                        ? () => {
                            rolePopoverCloseRef.current = setTimeout(
                              () => setRolePopoverOpen(false),
                              150,
                            );
                          }
                        : undefined
                    }
                  >
                    <FormSelect
                      name="roleId"
                      label="Role"
                      value={formData.roleId}
                      onValueChange={(v) =>
                        setFormData({ ...formData, roleId: v })
                      }
                      options={roles}
                      placeholder="Select a role"
                      required
                      disabled={!!editingUser?.isOrgOwner}
                      error={fieldErrors.roleId}
                    />
                  </div>
                </PopoverAnchor>
                {editingUser?.isOrgOwner && (
                  <PopoverContent
                    className="text-sm text-muted-foreground"
                    onMouseEnter={() => {
                      if (rolePopoverCloseRef.current) {
                        clearTimeout(rolePopoverCloseRef.current);
                        rolePopoverCloseRef.current = null;
                      }
                    }}
                    onMouseLeave={() => {
                      rolePopoverCloseRef.current = setTimeout(
                        () => setRolePopoverOpen(false),
                        150,
                      );
                    }}
                  >
                    Role for this user cannot be changed (organization owner).
                  </PopoverContent>
                )}
              </Popover>
              <FormSelect
                name="category"
                label="Category"
                value={formData.category}
                onValueChange={(v) => setFormData({ ...formData, category: v })}
                options={USER_CATEGORIES.map((c) => ({ _id: c, name: c }))}
                placeholder="Select category (optional)"
                error={fieldErrors.category}
              />
              <FormField
                name="minWorkHours"
                label="Min Work Hours (per day)"
                type="number"
                value={formData.minWorkHours}
                onChange={handleChange}
                min="0"
                max="24"
                step="0.5"
                placeholder="8"
              />
            </div>

            <FormSection title="Payroll & metadata (optional)" showBorder>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField
                  name="dailyRate"
                  label="Daily Rate"
                  type="number"
                  value={formData.dailyRate}
                  onChange={handleChange}
                  placeholder="0.00"
                />
                <FormField
                  name="visaCost"
                  label="Visa Cost"
                  type="number"
                  value={formData.visaCost}
                  onChange={handleChange}
                  placeholder="0.00"
                />
                <FormField
                  name="visaExpiry"
                  label="Visa Expiry"
                  type="date"
                  value={formData.visaExpiry}
                  onChange={handleChange}
                />
                <FormField
                  name="transportCost"
                  label="Transport Cost (per day)"
                  type="number"
                  value={formData.transportCost}
                  onChange={handleChange}
                  placeholder="0.00"
                />
                <FormField
                  name="fixedExtras"
                  label="Fixed Extras"
                  type="number"
                  value={formData.fixedExtras}
                  onChange={handleChange}
                  placeholder="0.00"
                />
              </div>
            </FormSection>
          </div>
          <div
            className={cn("flex justify-end gap-3 pt-4 border-t border-border")}
          >
            <FormActions
              onCancel={resetForm}
              submitLabel={editingUser ? "Update user" : "Create user"}
              loading={loading}
              loadingLabel="Saving..."
            />
          </div>
        </form>
      </Modal>

      <div className="space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">Filters</CardTitle>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 min-w-26 text-muted-foreground shrink-0",
                !(
                  searchTerm ||
                  (filterRoleId && filterRoleId !== ALL_VALUE) ||
                  (filterCategory && filterCategory !== ALL_VALUE) ||
                  (filterStatus && filterStatus !== ALL_VALUE)
                ) && "invisible pointer-events-none",
              )}
              onClick={clearFilters}
            >
              Clear filters
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div className="sm:col-span-2 lg:col-span-2">
                <FormSearchByInput
                  label="Search"
                  selectValue={searchBy}
                  onSelectValueChange={setSearchBy}
                  selectOptions={SEARCH_BY_OPTIONS}
                  selectPlaceholder="Name"
                  inputName="search"
                  inputValue={searchTerm}
                  onInputChange={(e) => setSearchTerm(e.target.value)}
                  inputPlaceholder={
                    searchBy === "email"
                      ? "Search by email..."
                      : "Search by name..."
                  }
                  inputSuffixIcon={
                    searchTerm.trim() || searchBy !== "name" ? (
                      <X className="size-4" />
                    ) : undefined
                  }
                  onInputSuffixClick={
                    searchTerm.trim() || searchBy !== "name"
                      ? () => {
                          setSearchTerm("");
                          setSearchBy("name");
                        }
                      : undefined
                  }
                />
              </div>
              <FormSelect
                label="Role"
                value={filterRoleId}
                onValueChange={setFilterRoleId}
                options={[{ _id: ALL_VALUE, name: "All roles" }, ...roles]}
                placeholder="All roles"
                className="w-full"
              />
              <FormSelect
                label="Category"
                value={filterCategory}
                onValueChange={setFilterCategory}
                options={[
                  { _id: ALL_VALUE, name: "All" },
                  ...USER_CATEGORIES.map((c) => ({ _id: c, name: c })),
                ]}
                placeholder="All"
                className="w-full"
              />
              <FormSelect
                label="Status"
                value={filterStatus}
                onValueChange={setFilterStatus}
                options={STATUS_OPTIONS}
                placeholder="All"
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>

        <h2 className="text-base font-semibold text-foreground">
          All users{pagination.total > 0 ? ` (${pagination.total})` : ""}
        </h2>

        <DataTable
          columns={columns}
          data={users}
          loading={loading}
          emptyMessage="No users yet. Create your first user to get started."
          pagination={pagination}
          onPageChange={(page) =>
            fetchUsers(page, pagination.limit, getFilterParams())
          }
        />
      </div>
    </PageWrapper>
  );
};

export default Users;

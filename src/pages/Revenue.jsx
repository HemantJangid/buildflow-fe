import { useState, useEffect, useCallback } from "react";
import { revenueAPI, projectAPI } from "@/services/api";
import { PAGINATION, PERMISSIONS, REVENUE_CATEGORIES, REVENUE_STATUS } from "@/lib/constants";
import PageWrapper from "@/components/PageWrapper";
import Modal from "@/components/Modal";
import FormActions from "@/components/FormActions";
import FilterCard from "@/components/FilterCard";
import DateRangeSelect from "@/components/DateRangeSelect";
import { FormFieldCompact } from "@/components/ui/form-field";
import { FormSelectCompact } from "@/components/ui/form-select";
import DataTable from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { useMessage } from "@/hooks/useMessage";
import { useAuth } from "@/context/AuthContext";
import { useOrganizationSettings } from "@/context/OrganizationSettingsContext";
import logger from "@/lib/logger";
import { formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";

const REVENUE_STATUS_OPTIONS = REVENUE_STATUS.map((s) => ({ _id: s, name: s }));
const REVENUE_CATEGORY_OPTIONS = REVENUE_CATEGORIES.map((c) => ({ _id: c, name: c }));

const Revenue = () => {
  const [revenues, setRevenues] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: PAGINATION.DEFAULT_PAGE_SIZE,
    totalPages: 1,
  });
  const [filters, setFilters] = useState({
    projectId: "",
    startDate: "",
    endDate: "",
    category: "",
    status: "",
  });
  const [datePreset, setDatePreset] = useState("custom");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editRevenue, setEditRevenue] = useState(null);
  const [summaryGroupBy, setSummaryGroupBy] = useState("project");
  const [summaryData, setSummaryData] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const { showApiError, showSuccess } = useMessage();
  const { hasPermission } = useAuth();
  const { currency: orgCurrency } = useOrganizationSettings();
  const canCreate = hasPermission(PERMISSIONS.REVENUE_CREATE);
  const canUpdate = hasPermission(PERMISSIONS.REVENUE_UPDATE);
  const canDelete = hasPermission(PERMISSIONS.REVENUE_DELETE);
  const canRead = hasPermission(PERMISSIONS.REVENUE_READ);

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

  const fetchRevenues = useCallback(
    async (page = 1, limit = PAGINATION.DEFAULT_PAGE_SIZE) => {
      setLoading(true);
      try {
        const params = { page, limit };
        if (filters.projectId) params.projectId = filters.projectId;
        if (filters.startDate) params.startDate = filters.startDate;
        if (filters.endDate) params.endDate = filters.endDate;
        if (filters.category) params.category = filters.category;
        if (filters.status) params.status = filters.status;
        const response = await revenueAPI.getAll(params);
        setRevenues(response.data.data ?? []);
        const p = response.data.pagination ?? {};
        setPagination({
          total: p.total ?? 0,
          page: p.page ?? 1,
          limit: p.limit ?? limit,
          totalPages: p.totalPages ?? 1,
        });
      } catch (error) {
        logger.error("Error fetching revenues", error);
        showApiError(error, "Failed to load revenue");
      } finally {
        setLoading(false);
      }
    },
    [filters, showApiError],
  );

  useEffect(() => {
    fetchRevenues(1, PAGINATION.DEFAULT_PAGE_SIZE);
  }, [fetchRevenues]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target || {};
    setFilters((prev) => ({ ...prev, [name]: value ?? "" }));
  };

  const handleApplyFilters = (e) => {
    e?.preventDefault();
    fetchRevenues(1, PAGINATION.DEFAULT_PAGE_SIZE);
  };

  const resetFilters = () => {
    setFilters({
      projectId: "",
      startDate: "",
      endDate: "",
      category: "",
      status: "",
    });
    setDatePreset("custom");
    fetchRevenues(1, PAGINATION.DEFAULT_PAGE_SIZE);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this revenue record?")) return;
    try {
      await revenueAPI.delete(id);
      showSuccess("Revenue deleted");
      fetchRevenues(pagination.page, pagination.limit);
    } catch (err) {
      showApiError(err, "Failed to delete revenue");
    }
  };

  const loadSummary = useCallback(async () => {
    if (!canRead) return;
    setSummaryLoading(true);
    try {
      const params = { groupBy: summaryGroupBy };
      if (filters.projectId) params.projectId = filters.projectId;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      const res = await revenueAPI.getSummary(params);
      setSummaryData(res.data?.data ?? null);
    } catch (err) {
      logger.error("Error fetching revenue summary", err);
      showApiError(err, "Failed to load summary");
    } finally {
      setSummaryLoading(false);
    }
  }, [
    canRead,
    summaryGroupBy,
    filters.projectId,
    filters.startDate,
    filters.endDate,
    showApiError,
  ]);

  useEffect(() => {
    if (canRead) loadSummary();
  }, [canRead, loadSummary]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = {};
      if (filters.projectId) params.projectId = filters.projectId;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.category) params.category = filters.category;
      if (filters.status) params.status = filters.status;
      const response = await revenueAPI.export(params);
      const blob = response.data;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "revenue.csv";
      a.click();
      URL.revokeObjectURL(url);
      showSuccess("Export downloaded");
    } catch (err) {
      showApiError(err, "Failed to export");
    } finally {
      setExporting(false);
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case "Received":
        return "bg-green-500/10 text-green-600 dark:text-green-400";
      case "Invoiced":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
      case "Void":
        return "bg-destructive/10 text-destructive";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const columns = [
    {
      key: "date",
      label: "Date",
      className: "text-muted-foreground",
      render: (r) => formatDate(r.date) || "—",
    },
    {
      key: "project",
      label: "Project",
      render: (r) => r.projectId?.name ?? r.projectId ?? "—",
    },
    {
      key: "category",
      label: "Category",
      className: "text-muted-foreground",
      render: (r) => r.category ?? "—",
    },
    {
      key: "amount",
      label: "Amount",
      className: "font-medium",
      render: (r) =>
        `${r.currency || orgCurrency} ${Number(r.amount ?? 0).toFixed(2)}`,
    },
    {
      key: "status",
      label: "Status",
      render: (r) => (
        <span
          className={cn(
            "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
            getStatusClass(r.status),
          )}
        >
          {r.status ?? "—"}
        </span>
      ),
    },
    {
      key: "clientName",
      label: "Client",
      hideOn: "sm",
      className: "text-muted-foreground",
      render: (r) => r.clientName || "—",
    },
    ...(canUpdate || canDelete
      ? [
          {
            key: "actions",
            label: "Actions",
            headerClassName: "text-right",
            className: "text-right",
            render: (r) => (
              <div className="flex justify-end gap-1.5">
                {canUpdate && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditRevenue(r)}
                  >
                    Edit
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(r._id)}
                  >
                    Delete
                  </Button>
                )}
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <PageWrapper
      title="Revenue"
      subtitle="Project revenue and client payments"
      headerAction={
        canRead || canCreate ? (
          <div className="flex gap-2">
            {canRead && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={exporting}
              >
                {exporting ? "Exporting…" : "Export CSV"}
              </Button>
            )}
            {canCreate && (
              <Button onClick={() => setShowAddModal(true)} size="sm">
                Add revenue
              </Button>
            )}
          </div>
        ) : null
      }
    >
      <div className="space-y-4">
        <FilterCard
          onSubmit={handleApplyFilters}
          onReset={resetFilters}
          loading={loading}
          className="p-4"
        >
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[160px]">
              <FormSelectCompact
                name="projectId"
                label="Project"
                value={filters.projectId}
                onChange={handleFilterChange}
                options={projects}
                placeholder="All projects"
                includeAll
              />
            </div>
            <DateRangeSelect
              startDate={filters.startDate}
              endDate={filters.endDate}
              onStartDateChange={(v) =>
                setFilters((prev) => ({ ...prev, startDate: v || "" }))
              }
              onEndDateChange={(v) =>
                setFilters((prev) => ({ ...prev, endDate: v || "" }))
              }
              selectedPreset={datePreset}
              onPresetChange={setDatePreset}
            />
            <div className="min-w-[120px]">
              <FormSelectCompact
                name="category"
                label="Category"
                value={filters.category}
                onChange={handleFilterChange}
                options={REVENUE_CATEGORY_OPTIONS}
                placeholder="All"
                includeAll
              />
            </div>
            <div className="min-w-[120px]">
              <FormSelectCompact
                name="status"
                label="Status"
                value={filters.status}
                onChange={handleFilterChange}
                options={REVENUE_STATUS_OPTIONS}
                placeholder="All"
                includeAll
              />
            </div>
          </div>
        </FilterCard>

        {canRead && (
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-semibold mb-3">Summary</h3>
            <div className="flex flex-wrap items-end gap-4 mb-2">
              <div className="min-w-[120px]">
                <FormSelectCompact
                  name="summaryGroupBy"
                  label="Group by"
                  value={summaryGroupBy}
                  onChange={(e) =>
                    setSummaryGroupBy(e.target?.value ?? "project")
                  }
                  options={[
                    { _id: "project", name: "Project" },
                    { _id: "category", name: "Category" },
                    { _id: "period", name: "Period" },
                  ]}
                  placeholder="Project"
                  includeAll={false}
                />
              </div>
              <Button
                variant="secondary"
                onClick={loadSummary}
                disabled={summaryLoading}
                className="shrink-0 h-9"
              >
                {summaryLoading ? "Loading…" : "Refresh"}
              </Button>
              {summaryData && (
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <span className="text-muted-foreground">
                    Total:{" "}
                    <strong className="text-foreground">
                      {summaryData.count}
                    </strong>{" "}
                    records
                  </span>
                  <span className="text-muted-foreground">
                    Amount:{" "}
                    <strong className="text-foreground">
                      {orgCurrency}{" "}
                      {Number(summaryData.totalAmount ?? 0).toFixed(2)}
                    </strong>
                  </span>
                </div>
              )}
            </div>
            {summaryData && (summaryData.groups ?? []).length > 0 && (
              <div className="overflow-x-auto rounded-md border border-border mt-3">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left py-2.5 px-3 font-medium">
                        Group
                      </th>
                      <th className="text-right py-2.5 px-3 font-medium">
                        Count
                      </th>
                      <th className="text-right py-2.5 px-3 font-medium">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(summaryData.groups ?? []).map((g) => (
                      <tr
                        key={g.id || g.label}
                        className="border-b border-border/50 last:border-0"
                      >
                        <td className="py-2 px-3">{g.label ?? g.id ?? "—"}</td>
                        <td className="text-right py-2 px-3">{g.count ?? 0}</td>
                        <td className="text-right py-2 px-3">
                          {orgCurrency} {Number(g.amount ?? 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <DataTable
          columns={columns}
          data={revenues}
          loading={loading}
          emptyMessage="No revenue records found. Add a revenue entry or adjust filters."
          rowKey={(r) => r._id}
          pagination={{ ...pagination }}
          onPageChange={(page) => fetchRevenues(page, pagination.limit)}
        />
      </div>

      {showAddModal && (
        <RevenueFormModal
          projects={projects}
          defaultCurrency={orgCurrency}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            showSuccess("Revenue added");
            fetchRevenues(pagination.page, pagination.limit);
          }}
          onError={showApiError}
        />
      )}
      {editRevenue && (
        <RevenueFormModal
          revenueId={editRevenue._id}
          initialData={editRevenue}
          projects={projects}
          defaultCurrency={orgCurrency}
          onClose={() => setEditRevenue(null)}
          onSuccess={() => {
            setEditRevenue(null);
            showSuccess("Revenue updated");
            fetchRevenues(pagination.page, pagination.limit);
          }}
          onError={showApiError}
        />
      )}
    </PageWrapper>
  );
};

function RevenueFormModal({
  revenueId,
  initialData,
  projects,
  defaultCurrency = "USD",
  onClose,
  onSuccess,
  onError,
}) {
  const isEdit = Boolean(revenueId);
  const projectIdFromData =
    initialData?.projectId?._id ?? initialData?.projectId;
  const [formData, setFormData] = useState({
    projectId: projectIdFromData ?? "",
    amount: initialData?.amount ?? "",
    currency: initialData?.currency ?? defaultCurrency,
    category: initialData?.category ?? "Other",
    description: initialData?.description ?? "",
    date: initialData?.date
      ? String(initialData.date).slice(0, 10)
      : new Date().toISOString().slice(0, 10),
    status: initialData?.status ?? "Draft",
    clientName: initialData?.clientName ?? "",
    invoiceNumber: initialData?.invoiceNumber ?? "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.projectId || !formData.amount) {
      onError(
        { response: { data: { message: "Project and amount are required" } } },
        "Validation",
      );
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        projectId: formData.projectId,
        amount: Number(formData.amount),
        currency: formData.currency,
        category: formData.category,
        description: formData.description || undefined,
        date: formData.date,
        status: formData.status,
        clientName: formData.clientName || undefined,
        invoiceNumber: formData.invoiceNumber || undefined,
      };
      if (isEdit) {
        await revenueAPI.update(revenueId, payload);
      } else {
        await revenueAPI.create(payload);
      }
      onSuccess();
    } catch (err) {
      onError(
        err,
        isEdit ? "Failed to update revenue" : "Failed to add revenue",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target || {};
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={isEdit ? "Edit revenue" : "Add revenue"}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-2.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <FormSelectCompact
            name="projectId"
            label="Project"
            value={formData.projectId}
            onChange={handleChange}
            options={projects}
            placeholder="Select project"
            includeAll={false}
            required
            className="sm:col-span-2"
          />
          <FormFieldCompact
            name="amount"
            label="Amount"
            type="number"
            value={formData.amount}
            onChange={handleChange}
            min="0"
            step="0.01"
            required
            placeholder="0.00"
          />
          <FormFieldCompact
            name="currency"
            label="Currency"
            value={formData.currency}
            onChange={handleChange}
            placeholder="USD"
          />
          <FormFieldCompact
            name="date"
            label="Date"
            type="date"
            value={formData.date}
            onChange={handleChange}
            required
          />
          <FormSelectCompact
            name="category"
            label="Category"
            value={formData.category}
            onChange={handleChange}
            options={REVENUE_CATEGORY_OPTIONS}
            placeholder="Select category"
            includeAll={false}
          />
          <FormSelectCompact
            name="status"
            label="Status"
            value={formData.status}
            onChange={handleChange}
            options={REVENUE_STATUS_OPTIONS}
            placeholder="Select status"
            includeAll={false}
          />
          <FormFieldCompact
            name="clientName"
            label="Client Name"
            value={formData.clientName}
            onChange={handleChange}
            placeholder="Client or company name"
          />
          <FormFieldCompact
            name="invoiceNumber"
            label="Invoice Number"
            value={formData.invoiceNumber}
            onChange={handleChange}
            placeholder="e.g. INV-001"
          />
          <div className="sm:col-span-2 space-y-1.5">
            <label className="text-xs text-muted-foreground">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={2}
              placeholder="Optional notes"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        </div>
        <FormActions
          onCancel={onClose}
          submitLabel={isEdit ? "Update revenue" : "Save revenue"}
          loading={submitting}
          loadingLabel="Saving…"
        />
      </form>
    </Modal>
  );
}

export default Revenue;

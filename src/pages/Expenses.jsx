import { useState, useEffect, useCallback } from "react";
import { expenseAPI, projectAPI } from "@/services/api";
import { PAGINATION, PERMISSIONS } from "@/lib/constants";
import PageWrapper from "@/components/PageWrapper";
import FilterCard from "@/components/FilterCard";
import DateRangeSelect from "@/components/DateRangeSelect";
import { FormSelectCompact } from "@/components/ui/form-select";
import DataTable from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { useMessage } from "@/hooks/useMessage";
import { useAuth } from "@/context/AuthContext";
import { useOrganizationSettings } from "@/context/OrganizationSettingsContext";
import logger from "@/lib/logger";
import { formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";

const EXPENSE_STATUS_OPTIONS = [
  { _id: "Draft", name: "Draft" },
  { _id: "Submitted", name: "Submitted" },
  { _id: "Approved", name: "Approved" },
  { _id: "Rejected", name: "Rejected" },
  { _id: "Void", name: "Void" },
];

const EXPENSE_CATEGORY_OPTIONS = [
  { _id: "Materials", name: "Materials" },
  { _id: "Equipment", name: "Equipment" },
  { _id: "Transport", name: "Transport" },
  { _id: "Subsistence", name: "Subsistence" },
  { _id: "Other", name: "Other" },
];

const Expenses = () => {
  const [expenses, setExpenses] = useState([]);
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
  const [editExpense, setEditExpense] = useState(null);
  const [summaryGroupBy, setSummaryGroupBy] = useState("project");
  const [summaryData, setSummaryData] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const { showApiError, showSuccess } = useMessage();
  const { hasPermission } = useAuth();
  const { currency: orgCurrency } = useOrganizationSettings();
  const canCreate = hasPermission(PERMISSIONS.EXPENSES_CREATE);
  const canUpdate = hasPermission(PERMISSIONS.EXPENSES_UPDATE);
  const canDelete = hasPermission(PERMISSIONS.EXPENSES_DELETE);
  const canReadAll = hasPermission(PERMISSIONS.EXPENSES_READ_ALL);

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

  const fetchExpenses = useCallback(
    async (page = 1, limit = PAGINATION.DEFAULT_PAGE_SIZE) => {
      setLoading(true);
      try {
        const params = { page, limit };
        if (filters.projectId) params.projectId = filters.projectId;
        if (filters.startDate) params.startDate = filters.startDate;
        if (filters.endDate) params.endDate = filters.endDate;
        if (filters.category) params.category = filters.category;
        if (filters.status) params.status = filters.status;
        const response = await expenseAPI.getAll(params);
        setExpenses(response.data.data ?? []);
        const p = response.data.pagination ?? {};
        setPagination({
          total: p.total ?? 0,
          page: p.page ?? 1,
          limit: p.limit ?? limit,
          totalPages: p.totalPages ?? 1,
        });
      } catch (error) {
        logger.error("Error fetching expenses", error);
        showApiError(error, "Failed to load expenses");
      } finally {
        setLoading(false);
      }
    },
    [filters, showApiError],
  );

  useEffect(() => {
    fetchExpenses(1, PAGINATION.DEFAULT_PAGE_SIZE);
  }, [fetchExpenses]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target || {};
    setFilters((prev) => ({ ...prev, [name]: value ?? "" }));
  };

  const handleApplyFilters = (e) => {
    e?.preventDefault();
    fetchExpenses(1, PAGINATION.DEFAULT_PAGE_SIZE);
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
    fetchExpenses(1, PAGINATION.DEFAULT_PAGE_SIZE);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this expense?")) return;
    try {
      await expenseAPI.delete(id);
      showSuccess("Expense deleted");
      fetchExpenses(pagination.page, pagination.limit);
    } catch (err) {
      showApiError(err, "Failed to delete expense");
    }
  };

  const loadSummary = useCallback(async () => {
    if (!canReadAll) return;
    setSummaryLoading(true);
    try {
      const params = { groupBy: summaryGroupBy };
      if (filters.projectId) params.projectId = filters.projectId;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      const res = await expenseAPI.getSummary(params);
      setSummaryData(res.data?.data ?? null);
    } catch (err) {
      logger.error("Error fetching expense summary", err);
      showApiError(err, "Failed to load summary");
    } finally {
      setSummaryLoading(false);
    }
  }, [
    canReadAll,
    summaryGroupBy,
    filters.projectId,
    filters.startDate,
    filters.endDate,
    showApiError,
  ]);

  useEffect(() => {
    if (canReadAll) loadSummary();
  }, [canReadAll, loadSummary]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = {};
      if (filters.projectId) params.projectId = filters.projectId;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.category) params.category = filters.category;
      if (filters.status) params.status = filters.status;
      const response = await expenseAPI.export(params);
      const blob = response.data;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "expenses.csv";
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
      case "Approved":
        return "bg-green-500/10 text-green-600 dark:text-green-400";
      case "Rejected":
      case "Void":
        return "bg-destructive/10 text-destructive";
      case "Submitted":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
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
      key: "submittedBy",
      label: "Submitted by",
      hideOn: "sm",
      className: "text-muted-foreground",
      render: (r) => r.submittedBy?.name ?? r.submittedBy?.email ?? "—",
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
                    onClick={() => setEditExpense(r)}
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
      title="Expenses"
      subtitle="Project expenses and purchases"
      action={
        canReadAll || canCreate ? (
          <div className="flex gap-2">
            {canReadAll && (
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
                Add expense
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
          <div className="flex flex-wrap items-end gap-4">
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
              className="gap-4"
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
                options={EXPENSE_CATEGORY_OPTIONS}
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
                options={EXPENSE_STATUS_OPTIONS}
                placeholder="All"
                includeAll
              />
            </div>
          </div>
        </FilterCard>

        {canReadAll && (
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
                    { _id: "user", name: "User" },
                  ]}
                  placeholder="Project"
                  includeAll={false}
                />
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={loadSummary}
                disabled={summaryLoading}
                className="shrink-0"
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
                    expenses
                  </span>
                  <span className="text-muted-foreground">
                    Amount:{" "}
                    <strong className="text-foreground">
                      {orgCurrency} {Number(summaryData.totalAmount ?? 0).toFixed(2)}
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
                          {orgCurrency} {Number(g.totalAmount ?? 0).toFixed(2)}
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
          data={expenses}
          loading={loading}
          emptyMessage="No expenses found. Add an expense or adjust filters."
          rowKey={(r) => r._id}
          pagination={{ ...pagination }}
          onPageChange={(page) => fetchExpenses(page, pagination.limit)}
        />
      </div>

      {showAddModal && (
        <ExpenseFormModal
          projects={projects}
          defaultCurrency={orgCurrency}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            showSuccess("Expense added");
            fetchExpenses(pagination.page, pagination.limit);
          }}
          onError={showApiError}
        />
      )}
      {editExpense && (
        <ExpenseFormModal
          expenseId={editExpense._id}
          initialData={editExpense}
          projects={projects}
          defaultCurrency={orgCurrency}
          onClose={() => setEditExpense(null)}
          onSuccess={() => {
            setEditExpense(null);
            showSuccess("Expense updated");
            fetchExpenses(pagination.page, pagination.limit);
          }}
          onError={showApiError}
        />
      )}
    </PageWrapper>
  );
};

function ExpenseFormModal({
  expenseId,
  initialData,
  projects,
  defaultCurrency = "USD",
  onClose,
  onSuccess,
  onError,
}) {
  const isEdit = Boolean(expenseId);
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
    vendor: initialData?.vendor ?? "",
    receiptNumber: initialData?.receiptNumber ?? "",
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
        vendor: formData.vendor || undefined,
        receiptNumber: formData.receiptNumber || undefined,
      };
      if (isEdit) {
        await expenseAPI.update(expenseId, payload);
      } else {
        await expenseAPI.create(payload);
      }
      onSuccess();
    } catch (err) {
      onError(
        err,
        isEdit ? "Failed to update expense" : "Failed to add expense",
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-background rounded-lg shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h2 className="text-lg font-semibold">
            {isEdit ? "Edit expense" : "Add expense"}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">
              Project *
            </label>
            <select
              name="projectId"
              value={formData.projectId}
              onChange={handleChange}
              required
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            >
              <option value="">Select project</option>
              {projects.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Amount *
              </label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                min="0"
                step="0.01"
                required
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Currency
              </label>
              <input
                type="text"
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Date *</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">
              Category *
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            >
              {EXPENSE_CATEGORY_OPTIONS.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={2}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={submitting}>
              {submitting
                ? "Saving…"
                : isEdit
                  ? "Update expense"
                  : "Save expense"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Expenses;

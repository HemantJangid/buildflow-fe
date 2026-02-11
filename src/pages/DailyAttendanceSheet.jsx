import { useState, useEffect, useCallback } from "react";
import { attendanceAPI, projectAPI } from "@/services/api";
import PageWrapper from "@/components/PageWrapper";
import { FormSelectCompact } from "@/components/ui/form-select";
import { Button } from "@/components/ui/button";
import Modal from "@/components/Modal";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { MonthPicker } from "@/components/ui/date-picker";
import { useMessage } from "@/hooks/useMessage";
import { useAuth } from "@/context/AuthContext";
import {
  ATTENDANCE_STATUS,
  ATTENDANCE_STATUS_OPTIONS_SHEET,
  PERMISSIONS,
} from "@/lib/constants";

const statusLabel = (status) => {
  if (!status) return "—";
  if (status === ATTENDANCE_STATUS.PRESENT) return "P";
  if (status === ATTENDANCE_STATUS.ABSENT) return "A";
  if (status === ATTENDANCE_STATUS.PARTIAL) return "½";
  return status;
};

const statusCellClass = (status) => {
  if (!status) return "bg-muted/30 text-muted-foreground";
  if (status === ATTENDANCE_STATUS.PRESENT) return "bg-green-500/15 text-green-700 dark:text-green-400";
  if (status === ATTENDANCE_STATUS.ABSENT) return "bg-red-500/15 text-red-700 dark:text-red-400";
  if (status === ATTENDANCE_STATUS.PARTIAL) return "bg-amber-500/15 text-amber-700 dark:text-amber-400";
  return "";
};

const getCurrentMonth = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
};

const DailyAttendanceSheet = () => {
  const { hasPermission } = useAuth();
  const { showApiError, showSuccess, clearMessage } = useMessage();
  const [projects, setProjects] = useState([]);
  const [month, setMonth] = useState(getCurrentMonth());
  const [projectId, setProjectId] = useState("");
  const [sheet, setSheet] = useState(null);
  const [loading, setLoading] = useState(false);
  const [markModal, setMarkModal] = useState(null);
  const [markForm, setMarkForm] = useState({ status: ATTENDANCE_STATUS.PRESENT, hoursWorked: "" });
  const [savingMark, setSavingMark] = useState(false);
  const [bulkModalDay, setBulkModalDay] = useState(null);
  const [bulkForm, setBulkForm] = useState({ status: ATTENDANCE_STATUS.PRESENT, hoursWorked: "" });
  const [savingBulk, setSavingBulk] = useState(false);

  const canEdit = hasPermission(PERMISSIONS.ATTENDANCE_UPDATE);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await projectAPI.getOptions({ isActive: true });
      setProjects(res.data.data || []);
    } catch (e) {
      showApiError(e, "Failed to load projects");
    }
  }, [showApiError]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const fetchSheet = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    clearMessage();
    try {
      const res = await attendanceAPI.getSheet({ month, projectId });
      setSheet(res.data.data);
    } catch (e) {
      showApiError(e, "Failed to load attendance sheet");
      setSheet(null);
    } finally {
      setLoading(false);
    }
  }, [month, projectId, clearMessage, showApiError]);

  const handleLoad = (e) => {
    e?.preventDefault();
    fetchSheet();
  };

  const openMarkModal = (worker, day) => {
    const existing = sheet?.data?.[worker._id]?.[day];
    setMarkModal({ worker, day });
    setMarkForm({
      status: existing?.status || ATTENDANCE_STATUS.PRESENT,
      hoursWorked: existing?.hoursWorked != null ? String(existing.hoursWorked) : "",
    });
  };

  const closeMarkModal = () => setMarkModal(null);

  const handleSaveMark = async () => {
    if (!markModal || !sheet) return;
    setSavingMark(true);
    try {
      await attendanceAPI.setMark({
        userId: markModal.worker._id,
        date: `${month}-${String(markModal.day).padStart(2, "0")}`,
        projectId: sheet.projectId,
        status: markForm.status,
        hoursWorked: markForm.hoursWorked ? parseFloat(markForm.hoursWorked) : undefined,
      });
      showSuccess("Attendance updated");
      closeMarkModal();
      fetchSheet();
    } catch (e) {
      showApiError(e, "Failed to update attendance");
    } finally {
      setSavingMark(false);
    }
  };

  const openBulkModal = (day) => {
    setBulkModalDay(day);
    setBulkForm({ status: ATTENDANCE_STATUS.PRESENT, hoursWorked: "" });
  };

  const closeBulkModal = () => setBulkModalDay(null);

  const handleBulkSubmit = async () => {
    if (bulkModalDay == null || !sheet) return;
    const workers = sheet.workers || [];
    if (workers.length === 0) return;
    setSavingBulk(true);
    try {
      const date = `${month}-${String(bulkModalDay).padStart(2, "0")}`;
      const entries = workers.map((w) => ({
        userId: w._id,
        status: bulkForm.status,
        hoursWorked: bulkForm.hoursWorked ? parseFloat(bulkForm.hoursWorked) : undefined,
      }));
      await attendanceAPI.setMarksBulk({
        projectId: sheet.projectId,
        date,
        entries,
      });
      const count = entries.length;
      showSuccess(`Attendance set for ${count} worker${count !== 1 ? "s" : ""}`);
      closeBulkModal();
      fetchSheet();
    } catch (e) {
      showApiError(e, "Failed to update attendance");
    } finally {
      setSavingBulk(false);
    }
  };

  const workers = sheet?.workers || [];
  const daysInMonth = sheet?.daysInMonth || 31;
  const data = sheet?.data || {};

  const dayTotals = [];
  for (let d = 1; d <= daysInMonth; d++) {
    let count = 0;
    workers.forEach((w) => {
      const cell = data[w._id]?.[d];
      if (cell?.status === ATTENDANCE_STATUS.PRESENT || cell?.status === ATTENDANCE_STATUS.PARTIAL) count++;
    });
    dayTotals.push(count);
  }

  return (
    <PageWrapper
      title="Daily Attendance Sheet"
      subtitle={sheet ? `${sheet.project?.name ?? ""} · ${month}` : "View and edit P/A by month and project"}
    >
      <form onSubmit={handleLoad} className="flex flex-wrap items-end gap-4 mb-4">
        <div className="space-y-2 shrink-0">
          <Label htmlFor="month">Month</Label>
          <MonthPicker
            id="month"
            value={month}
            onChange={setMonth}
            placeholder="Pick a month"
          />
        </div>
        <FormSelectCompact
          name="projectId"
          label="Project"
          value={projectId}
          onChange={(e) => setProjectId(e.target?.value ?? "")}
          options={projects}
          placeholder="Select project"
          required
          includeAll={false}
          contentClassName="max-h-60 overflow-y-auto"
        />
        <Button type="submit" disabled={!projectId || loading}>
          {loading ? "Loading…" : sheet ? "Reload" : "Load sheet"}
        </Button>
      </form>

      {sheet && (
        <>
          {canEdit && (
            <div className="flex items-center justify-between gap-4 py-2 mt-2 border-b border-border">
              <p className="text-xs text-muted-foreground">
                Tip: Click a day number in the header to bulk set status for that day.
              </p>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => openBulkModal(1)}
                title="Set attendance status for all workers on a chosen day"
              >
                Bulk set day
              </Button>
            </div>
          )}
          <div className="rounded-lg border border-border overflow-hidden mt-2">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm border-border">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="sticky left-0 z-10 min-w-[180px] bg-muted/50 px-3 py-2 text-left font-medium border-r border-border">
                      User
                    </th>
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                      <th
                        key={d}
                        className={`w-9 border-r border-border px-1 py-2 text-center font-medium text-muted-foreground last:border-r-0 ${
                          canEdit ? "cursor-pointer hover:bg-muted/70" : ""
                        }`}
                        onClick={() => canEdit && openBulkModal(d)}
                        title={canEdit ? `Bulk set day ${d}` : undefined}
                      >
                        {d}
                      </th>
                    ))}
                    <th className="w-16 px-2 py-2 text-center font-medium text-muted-foreground">
                      Total
                    </th>
                  </tr>
                </thead>
              <tbody>
                {workers.map((worker) => {
                  let presentCount = 0;
                  return (
                    <tr key={worker._id} className="border-b border-border hover:bg-muted/30">
                      <td className="sticky left-0 z-10 bg-background px-3 py-2 border-r border-border">
                        <div className="font-medium">{worker.name}</div>
                        <div className="text-xs text-muted-foreground">{worker.email}</div>
                      </td>
                      {Array.from({ length: daysInMonth }, (_, i) => {
                        const day = i + 1;
                        const cell = data[worker._id]?.[day];
                        const status = cell?.status;
                        if (status === ATTENDANCE_STATUS.PRESENT || status === ATTENDANCE_STATUS.PARTIAL) presentCount++;
                        return (
                          <td
                            key={day}
                            className={`w-9 border-r border-border px-1 py-1 text-center align-middle last:border-r-0 ${
                              canEdit ? "cursor-pointer hover:bg-muted/50" : ""
                            }`}
                            onClick={() => canEdit && openMarkModal(worker, day)}
                          >
                            <span className={statusCellClass(status)}>
                              {statusLabel(status)}
                            </span>
                            {cell?.hoursWorked != null && (
                              <span className="block text-xs text-muted-foreground">
                                {Number(cell.hoursWorked).toFixed(1)}h
                              </span>
                            )}
                          </td>
                        );
                      })}
                      <td className="border-border px-2 py-2 text-center font-medium">
                        {presentCount}
                      </td>
                    </tr>
                  );
                })}
                <tr className="border-b border-border bg-muted/30 font-medium">
                  <td className="sticky left-0 z-10 bg-muted/30 px-3 py-2 border-r border-border">
                    Total present
                  </td>
                  {dayTotals.map((count, i) => (
                    <td key={i} className="border-r border-border px-1 py-2 text-center last:border-r-0">
                      {count}
                    </td>
                  ))}
                  <td className="px-2 py-2 text-center border-border">
                    {dayTotals.reduce((a, b) => a + b, 0)}
                  </td>
                </tr>
              </tbody>
            </table>
            </div>
          </div>
        </>
      )}

      {markModal && (
        <Modal
          open
          onClose={closeMarkModal}
          title={`${markModal.worker.name} – Day ${markModal.day}`}
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={closeMarkModal}>
                Cancel
              </Button>
              <Button onClick={handleSaveMark} disabled={savingMark}>
                {savingMark ? "Saving…" : "Save"}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <FormSelectCompact
              name="status"
              label="Status"
              value={markForm.status}
              onChange={(e) =>
                setMarkForm((f) => ({ ...f, status: e.target?.value ?? f.status }))
              }
              options={ATTENDANCE_STATUS_OPTIONS_SHEET}
            />
            <div className="space-y-2">
              <Label htmlFor="hoursWorked">Hours worked (optional)</Label>
              <Input
                id="hoursWorked"
                type="number"
                min={0}
                step={0.5}
                placeholder="e.g. 8"
                value={markForm.hoursWorked}
                onChange={(e) =>
                  setMarkForm((f) => ({ ...f, hoursWorked: e.target.value }))
                }
              />
            </div>
          </div>
        </Modal>
      )}

      {bulkModalDay != null && (
        <Modal
          open
          onClose={closeBulkModal}
          title="Bulk set day"
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={closeBulkModal}>
                Cancel
              </Button>
              <Button onClick={handleBulkSubmit} disabled={savingBulk}>
                {savingBulk ? "Saving…" : `Set for ${workers.length} workers`}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Set attendance for {sheet.project?.name ?? "project"}, {month}.
            </p>
            <div className="space-y-2">
              <Label htmlFor="bulkDay">Day</Label>
              <select
                id="bulkDay"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                value={bulkModalDay}
                onChange={(e) => setBulkModalDay(Number(e.target.value))}
              >
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    Day {d}
                  </option>
                ))}
              </select>
            </div>
            <FormSelectCompact
              name="bulkStatus"
              label="Status"
              value={bulkForm.status}
              onChange={(e) =>
                setBulkForm((f) => ({ ...f, status: e.target?.value ?? f.status }))
              }
              options={ATTENDANCE_STATUS_OPTIONS_SHEET}
            />
            <div className="space-y-2">
              <Label htmlFor="bulkHoursWorked">Hours worked (optional)</Label>
              <Input
                id="bulkHoursWorked"
                type="number"
                min={0}
                step={0.5}
                placeholder="e.g. 8"
                value={bulkForm.hoursWorked}
                onChange={(e) =>
                  setBulkForm((f) => ({ ...f, hoursWorked: e.target.value }))
                }
              />
            </div>
          </div>
        </Modal>
      )}
    </PageWrapper>
  );
};

export default DailyAttendanceSheet;

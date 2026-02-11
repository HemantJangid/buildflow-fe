/**
 * Shared constants used across the application.
 * Permission and role values must match backend constants for auth/nav.
 */

// Role names (must match backend / API)
export const ROLES = {
  ADMIN: "Admin",
  SUPERVISOR: "Supervisor",
  WORKER: "Worker",
  MANAGER: "Manager", // custom role
};

// Organization settings – currency options (match backend CURRENCIES)
export const CURRENCIES = ["USD", "EUR", "GBP", "INR", "AED", "SAR", "QAR"];

// User categories (must match backend User model enum)
export const USER_CATEGORIES = [
  "Carpenter",
  "Electrician",
  "Finance",
  "Admin",
  "Other",
];

// Permission names (must match backend / API)
export const PERMISSIONS = {
  USERS_CREATE: "users:create",
  USERS_READ: "users:read",
  USERS_UPDATE: "users:update",
  USERS_DELETE: "users:delete",
  PROJECTS_CREATE: "projects:create",
  PROJECTS_READ: "projects:read",
  PROJECTS_UPDATE: "projects:update",
  PROJECTS_DELETE: "projects:delete",
  ATTENDANCE_CLOCK_IN: "attendance:clockIn",
  ATTENDANCE_CLOCK_OUT: "attendance:clockOut",
  ATTENDANCE_READ_OWN: "attendance:readOwn",
  ATTENDANCE_READ_ALL: "attendance:readAll",
  ATTENDANCE_UPDATE: "attendance:update",
  PROJECT_MEMBERS_READ: "projectMembers:read",
  PROJECT_MEMBERS_UPDATE: "projectMembers:update",
  REPORTS_READ: "reports:read",
  REPORTS_EXPORT: "reports:export",
  EXPENSES_CREATE: "expenses:create",
  EXPENSES_READ_OWN: "expenses:readOwn",
  EXPENSES_READ_ALL: "expenses:readAll",
  EXPENSES_UPDATE: "expenses:update",
  EXPENSES_DELETE: "expenses:delete",
  EXPENSES_APPROVE: "expenses:approve",
  ROLES_CREATE: "roles:create",
  ROLES_READ: "roles:read",
  ROLES_UPDATE: "roles:update",
  ROLES_DELETE: "roles:delete",
  SYSTEM_SETTINGS: "system:settings",
};

// Attendance mark statuses (daily sheet: Present / Absent / Partial)
export const ATTENDANCE_STATUS = {
  PRESENT: "PRESENT",
  ABSENT: "ABSENT",
  PARTIAL: "PARTIAL",
};

export const ATTENDANCE_STATUSES = [
  { _id: ATTENDANCE_STATUS.PRESENT, name: "Present" },
  { _id: ATTENDANCE_STATUS.PARTIAL, name: "Partial" },
  { _id: ATTENDANCE_STATUS.ABSENT, name: "Absent" },
];

// Options for daily sheet dropdown (with short labels)
export const ATTENDANCE_STATUS_OPTIONS_SHEET = [
  { _id: ATTENDANCE_STATUS.PRESENT, name: "Present (P)" },
  { _id: ATTENDANCE_STATUS.ABSENT, name: "Absent (A)" },
  { _id: ATTENDANCE_STATUS.PARTIAL, name: "Partial" },
];

// Attendance record status (clock in/out: Active vs Done)
export const RECORD_STATUS = {
  CLOCKED_IN: "CLOCKED_IN",
  CLOCKED_OUT: "CLOCKED_OUT",
};

// Change request status (pending / approved / rejected)
export const CHANGE_REQUEST_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
};

export const CHANGE_REQUEST_STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: CHANGE_REQUEST_STATUS.PENDING, label: "Pending" },
  { value: CHANGE_REQUEST_STATUS.APPROVED, label: "Approved" },
  { value: CHANGE_REQUEST_STATUS.REJECTED, label: "Rejected" },
];

// Report type (Reports page: user cost vs project report)
export const REPORT_TYPE = {
  USER: "user",
  PROJECT: "project",
};

export const REPORT_TYPE_OPTIONS = [
  {
    value: REPORT_TYPE.USER,
    label: "User cost report",
    description: "Cost for a specific user",
  },
  {
    value: REPORT_TYPE.PROJECT,
    label: "Project Report",
    description: "Attendance summary by project",
  },
];

// Date range presets
export const DATE_PRESETS = {
  today: () => {
    const today = new Date().toISOString().split("T")[0];
    return { startDate: today, endDate: today, label: "Today" };
  },
  yesterday: () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const date = yesterday.toISOString().split("T")[0];
    return { startDate: date, endDate: date, label: "Yesterday" };
  },
  last7Days: () => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 6);
    return {
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
      label: "Last 7 days",
    };
  },
  last30Days: () => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 29);
    return {
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
      label: "Last 30 days",
    };
  },
  thisMonth: () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      startDate: start.toISOString().split("T")[0],
      endDate: now.toISOString().split("T")[0],
      label: "This month",
    };
  },
  lastMonth: () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return {
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
      label: "Last month",
    };
  },
};

// Get date preset options as array for select dropdown
export const getDatePresetOptions = () => [
  { id: "today", ...DATE_PRESETS.today() },
  { id: "yesterday", ...DATE_PRESETS.yesterday() },
  { id: "last7Days", ...DATE_PRESETS.last7Days() },
  { id: "last30Days", ...DATE_PRESETS.last30Days() },
  { id: "thisMonth", ...DATE_PRESETS.thisMonth() },
  { id: "lastMonth", ...DATE_PRESETS.lastMonth() },
];

// Pagination: must match backend (backend max page size is 20). Always send page + limit for table APIs.
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [10, 20],
};

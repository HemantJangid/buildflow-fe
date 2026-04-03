import axios from "axios";

const API_BASE_URL = "/api";

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor to handle errors (e.g. expired token)
// Do NOT redirect on 401 for login request itself – let Login page show the error toast
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthRequest =
      (error.config?.url?.includes("/auth/login") ||
        error.config?.url?.includes("/auth/signup")) &&
      error.config?.method === "post";
    if (error.response?.status === 401 && !isAuthRequest) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post("/auth/login", credentials),
  signup: (data) => api.post("/auth/signup", data),
  register: (userData) => api.post("/auth/register", userData),
  getMe: () => api.get("/auth/me"),
  getAllUsers: (params) => api.get("/auth/users", { params }),
  getUserOptions: (params) => api.get("/auth/users/options", { params }),
  updateUser: (userId, data) => api.put(`/auth/users/${userId}`, data),
};

// Attendance API
export const attendanceAPI = {
  clockIn: (data) => api.post("/attendance/clock-in", data),
  clockOut: (data) => api.post("/attendance/clock-out", data),
  getMyAttendance: (params) => api.get("/attendance/my-attendance", { params }),
  getAllAttendance: (params) => api.get("/attendance", { params }),
  updateMetadata: (id, metadata) =>
    api.put(`/attendance/${id}/metadata`, { metadata }),
  getSheet: (params) => api.get("/attendance/sheet", { params }),
  setMark: (data) => api.post("/attendance/sheet/mark", data),
  setMarksBulk: (data) => api.post("/attendance/sheet/marks", data),
};

// Project API (list and members are paginated: response.data.pagination = { total, page, limit, totalPages })
export const projectAPI = {
  create: (data) => api.post("/projects", data),
  getAll: (params) => api.get("/projects", { params }),
  getOptions: (params) => api.get("/projects/options", { params }),
  getById: (id) => api.get(`/projects/${id}`),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
  getAvailableUsers: (projectId) =>
    api.get(`/projects/${projectId}/available-users`),
  getMembers: (projectId, params) =>
    api.get(`/projects/${projectId}/members`, { params }),
  addMember: (projectId, data) =>
    api.post(`/projects/${projectId}/members`, data),
  addMembersBulk: (projectId, data) =>
    api.post(`/projects/${projectId}/members/bulk`, data),
  removeMember: (projectId, userId) =>
    api.delete(`/projects/${projectId}/members/${userId}`),
};

// Reports API
export const reportAPI = {
  getUserCost: (userId, params) =>
    api.get(`/reports/user-cost/${userId}`, { params }),
  getProjectReport: (projectId, params) =>
    api.get(`/reports/project/${projectId}`, { params }),
  getProfitLoss: (params) => api.get("/reports/profit-loss", { params }),
};

// Roles API
export const roleAPI = {
  getAll: (params) => api.get("/roles", { params }),
  getOptions: (params) => api.get("/roles/options", { params }),
  getById: (id) => api.get(`/roles/${id}`),
  create: (data) => api.post("/roles", data),
  update: (id, data) => api.put(`/roles/${id}`, data),
  delete: (id) => api.delete(`/roles/${id}`),
  getPermissions: () => api.get("/roles/permissions"),
  assignToUser: (userId, roleId) =>
    api.put(`/roles/assign/${userId}`, { roleId }),
};

// Supervisor API (project members, attendance, change requests)
export const supervisorAPI = {
  getMyProjectMembers: (projectId, params) =>
    api.get("/supervisor/my-project-members", {
      params: { projectId, ...params },
    }),
  getProjectMembersAttendance: (params) =>
    api.get("/supervisor/attendance", { params }),
  updateProjectMemberAttendance: (id, data) =>
    api.put(`/supervisor/attendance/${id}`, data),
  submitChangeRequest: (data) => api.post("/supervisor/change-request", data),
  getChangeRequests: (params) =>
    api.get("/supervisor/change-requests", { params }),
  reviewChangeRequest: (id, data) =>
    api.put(`/supervisor/change-request/${id}/review`, data),
};

// Attendance API - add report endpoint
export const attendanceReportAPI = {
  getReport: (params) => api.get("/attendance/report", { params }),
};

// Expenses API (list is paginated: response.data.pagination = { total, page, limit, totalPages })
export const expenseAPI = {
  getAll: (params) => api.get("/expenses", { params }),
  getById: (id) => api.get(`/expenses/${id}`),
  create: (data) => api.post("/expenses", data),
  update: (id, data) => api.put(`/expenses/${id}`, data),
  delete: (id) => api.delete(`/expenses/${id}`),
  getSummary: (params) => api.get("/expenses/summary", { params }),
  export: (params) =>
    api.get("/expenses/export", { params, responseType: "blob" }),
};

// Revenue API (list is paginated: response.data.pagination = { total, page, limit, totalPages })
export const revenueAPI = {
  getAll: (params) => api.get("/revenue", { params }),
  getById: (id) => api.get(`/revenue/${id}`),
  create: (data) => api.post("/revenue", data),
  update: (id, data) => api.put(`/revenue/${id}`, data),
  delete: (id) => api.delete(`/revenue/${id}`),
  getSummary: (params) => api.get("/revenue/summary", { params }),
  export: (params) =>
    api.get("/revenue/export", { params, responseType: "blob" }),
};

// Organization settings API (org admin only)
export const organizationAPI = {
  getSettings: () => api.get("/organization/settings"),
  updateSettings: (data) => api.put("/organization/settings", data),
};

export default api;

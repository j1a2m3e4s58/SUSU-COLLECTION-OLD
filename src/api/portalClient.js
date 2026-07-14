const API_ROOT = (import.meta.env.VITE_MAIL_API_URL || "/mail-api/api").replace(/\/$/, "");

/**
 * @param {string} path
 * @param {{ method?: string, body?: unknown }} options
 */
async function apiRequest(path, { method = "GET", body } = {}) {
  const response = await fetch(`${API_ROOT}${path}`, {
    method,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && /session|unauthorized/i.test(data.error || "")) {
      localStorage.removeItem("susu_auth_user");
      sessionStorage.removeItem("susu_auth_user");
      if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }
    throw new Error(data.error || "Request failed");
  }
  return data;
}

export async function getSystemHealth() {
  const data = await apiRequest("/health");
  return Boolean(data.ok);
}

export function normalizeUser(user) {
  if (!user) return null;
  return {
    ...user,
    full_name: user.full_name || user.fullname || "User",
    fullname: user.fullname || user.full_name || "User",
    branch_name: user.branch_name || user.branch || "",
    branch: user.branch || user.branch_name || "",
    department: user.department || "",
    role: user.role || "GeneralStaff",
    managedBranches: user.managedBranches || [],
    managedDepartmentsByBranch: user.managedDepartmentsByBranch || {},
    permissions: user.permissions || {},
  };
}

export function resolveAssetUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  const value = String(path).replace(/^\/+/, "");
  if (value.startsWith("LOCAL:")) {
    const filename = value.replace(/^LOCAL:/, "").trim();
    return filename ? `${API_ROOT.replace(/\/api$/, "")}/uploads/${filename}` : "";
  }
  if (value.startsWith("profile_pics/") || value.startsWith("assets/")) {
    return `/${value}`;
  }
  return `${API_ROOT.replace(/\/api$/, "")}/uploads/${value}`;
}

export function staffInManagerScope(manager, staffMember) {
  if (!manager || !staffMember) return false;
  if (manager.role === "OwnerAdmin") return true;
  if (manager.role !== "Supervisor") return manager.id === staffMember.id;
  const branch = staffMember.branch || staffMember.branch_name || "";
  const managedBranches = manager.managedBranches || [];
  return managedBranches.includes("ALL") || managedBranches.includes(branch);
}

export async function getPortalSettings() {
  const data = await apiRequest("/portal-settings");
  return data.settings;
}

export async function updatePortalSettings(settings) {
  const data = await apiRequest("/portal-settings", {
    method: "POST",
    body: settings,
  });
  return data.settings;
}

export async function getActiveStaff() {
  const data = await apiRequest("/staff/active");
  return (data.users || []).map(normalizeUser);
}

export async function getArchivedStaff() {
  const data = await apiRequest("/staff/archived");
  return (data.users || []).map(normalizeUser);
}

export async function getStaffStats() {
  const data = await apiRequest("/staff/stats");
  return data.stats || data;
}

export async function getUserProfile(userId) {
  const data = await apiRequest(`/users/${userId}`);
  return normalizeUser(data.user);
}

export async function updateUserProfile(userId, payload) {
  const data = await apiRequest(`/users/${userId}/profile`, {
    method: "POST",
    body: payload,
  });
  return normalizeUser(data.user || data.ok);
}

export async function updateStaff(userId, payload) {
  const data = await apiRequest(`/staff/${userId}/update`, {
    method: "POST",
    body: payload,
  });
  return normalizeUser(data.user || data.ok);
}

export async function createAgentAccount(payload) {
  const data = await apiRequest("/agents/create", {
    method: "POST",
    body: payload,
  });
  return { ...normalizeUser(data.user), setupCode: data.setupCode };
}

export async function createStaffUser(payload) {
  const data = await apiRequest("/users/create", {
    method: "POST",
    body: payload,
  });
  return normalizeUser(data.user);
}

export async function resetAgentPassword(userId, temporaryPassword, temporaryUsername = "") {
  const data = await apiRequest(`/agents/${userId}/reset-password`, {
    method: "POST",
    body: { temporaryPassword, temporaryUsername },
  });
  return { ...normalizeUser(data.user), setupCode: data.setupCode };
}

export async function deleteStaff(userId) {
  return apiRequest(`/staff/${userId}/delete`, {
    method: "POST",
    body: {},
  });
}

export async function archiveStaff(userId) {
  return apiRequest(`/staff/${userId}/archive`, {
    method: "POST",
    body: {},
  });
}

export async function restoreStaff(userId) {
  return apiRequest(`/staff/${userId}/restore`, {
    method: "POST",
    body: {},
  });
}

export async function getCustomers() {
  const data = await apiRequest("/customers");
  return data.customers || [];
}

export async function createCustomer(payload) {
  const data = await apiRequest("/customers", {
    method: "POST",
    body: payload,
  });
  return data.customer;
}

export async function importCustomers(payload) {
  return apiRequest("/customers/import", {
    method: "POST",
    body: payload,
  });
}

export async function updateCustomer(customerId, payload) {
  const data = await apiRequest(`/customers/${customerId}`, {
    method: "POST",
    body: payload,
  });
  return data.customer;
}

export async function getCollections() {
  const data = await apiRequest("/collections");
  return data.collections || [];
}

export async function createCollection(payload) {
  const data = await apiRequest("/collections", {
    method: "POST",
    body: payload,
  });
  return data.collection;
}

export async function updateCollectionReview(collectionId, payload) {
  const data = await apiRequest(`/collections/${collectionId}/review`, {
    method: "POST",
    body: payload,
  });
  return data.collection;
}

export async function getAuditLogs() {
  const data = await apiRequest("/audit-logs");
  return data.logs || [];
}

export async function exportBackup() {
  const response = await fetch(`${API_ROOT}/backup/export`, {
    credentials: "include",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Backup export failed");
  }
  return {
    data,
    filename: response.headers.get("X-Backup-Filename") || "bawjiase-portal-backup.json",
  };
}

export async function importBackup(payload) {
  return apiRequest("/backup/import", {
    method: "POST",
    body: payload,
  });
}

export async function clearTestData() {
  return apiRequest("/maintenance/clear-test-data", {
    method: "POST",
    body: { backupConfirmed: true },
  });
}

export async function seedTestCustomers() {
  return apiRequest("/maintenance/seed-test-customers", {
    method: "POST",
    body: {},
  });
}

export async function removeTestCustomers() {
  return apiRequest("/maintenance/remove-test-customers", {
    method: "POST",
    body: {},
  });
}

export async function getDailyCloseStatus(date, agentId) {
  const params = new URLSearchParams();
  if (date) params.set("date", date);
  if (agentId) params.set("agentId", agentId);
  const data = await apiRequest(`/daily-close?${params.toString()}`);
  return data;
}

export async function closeDailyCollections(date) {
  const data = await apiRequest("/daily-close", {
    method: "POST",
    body: { date },
  });
  return data.close;
}

export async function reopenDailyCollections(date, agentId) {
  return apiRequest("/daily-close/reopen", {
    method: "POST",
    body: { date, agentId },
  });
}

export async function getNotifications() {
  const data = await apiRequest("/notifications");
  return data.notifications || [];
}

export async function getUnreadNotificationCount() {
  const data = await apiRequest("/notifications/unread-count");
  return Number(data.count || 0);
}

export async function markNotificationRead(itemId) {
  return apiRequest(`/notifications/${itemId}/read`, {
    method: "POST",
    body: {},
  });
}

export async function markAllNotificationsRead() {
  return apiRequest("/notifications/read-all", {
    method: "POST",
    body: {},
  });
}

export async function deleteNotification(itemId) {
  return apiRequest(`/notifications/${itemId}/delete`, {
    method: "POST",
    body: {},
  });
}

export async function pingPresence(userId) {
  if (!userId) return null;
  return apiRequest("/presence/ping", {
    method: "POST",
    body: { userId },
  });
}

export async function logoutPresence(userId) {
  if (!userId) return null;
  return apiRequest("/presence/logout", {
    method: "POST",
    body: { userId },
  });
}

export async function uploadProfilePhoto(file) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(`${API_ROOT}/uploads/profile-photo`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Upload failed");
  }
  return data;
}

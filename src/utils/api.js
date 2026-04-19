const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

const getToken = () => localStorage.getItem("auth-token");

const apiFetch = async (endpoint, options = {}) => {
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = { error: `HTTP ${response.status}` };
    }
    throw new Error(errorData.error || "API request failed");
  }

  return response.json();
};

// Auth endpoints
export const auth = {
  signup: (email, password, firstName, lastName, role, website) =>
    apiFetch("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password, firstName, lastName, role, website }),
    }),
  login: (email, password) =>
    apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  logout: () =>
    apiFetch("/api/auth/logout", {
      method: "POST",
    }),
  getCurrentUser: () => apiFetch("/api/auth/me"),
};

// Student profile endpoints
export const studentProfile = {
  get: () => apiFetch("/api/profile/student"),
  update: (data) =>
    apiFetch("/api/profile/student", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  addSkill: (skillName, proficiencyLevel) =>
    apiFetch("/api/profile/student/skills", {
      method: "POST",
      body: JSON.stringify({ skillName, proficiencyLevel }),
    }),
  removeSkill: (skillName) =>
    apiFetch(`/api/profile/student/skills/${skillName}`, {
      method: "DELETE",
    }),
  addInterest: (interestType, interestValue) =>
    apiFetch("/api/profile/student/interests", {
      method: "POST",
      body: JSON.stringify({ interestType, interestValue }),
    }),
  removeInterest: (interestId) =>
    apiFetch(`/api/profile/student/interests/${interestId}`, {
      method: "DELETE",
    }),
};

// Company profile endpoints
export const companyProfile = {
  get: () => apiFetch("/api/profile/company"),
  getById: (companyId) => apiFetch(`/api/profile/company/${companyId}`),
  update: (data) =>
    apiFetch("/api/profile/company", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  addQualification: (qualificationType, value) =>
    apiFetch("/api/profile/company/qualifications", {
      method: "POST",
      body: JSON.stringify({ qualificationType, value }),
    }),
  removeQualification: (qualificationId) =>
    apiFetch(`/api/profile/company/qualifications/${qualificationId}`, {
      method: "DELETE",
    }),
};

// Cases endpoints
export const cases = {
  // Drafts
  listDrafts: () => apiFetch("/api/cases/drafts"),
  createDraft: (data) =>
    apiFetch("/api/cases/drafts", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getDraft: (draftId) => apiFetch(`/api/cases/drafts/${draftId}`),
  updateDraft: (draftId, data) =>
    apiFetch(`/api/cases/drafts/${draftId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteDraft: (draftId) =>
    apiFetch(`/api/cases/drafts/${draftId}`, {
      method: "DELETE",
    }),
  publishDraft: (draftId) =>
    apiFetch(`/api/cases/drafts/${draftId}/publish`, {
      method: "POST",
    }),
  // Published
  listPublished: () => apiFetch("/api/cases/published"),
  getPublished: (caseId) => apiFetch(`/api/cases/published/${caseId}`),
  updatePublished: (caseId, data) =>
    apiFetch(`/api/cases/published/${caseId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deletePublished: (caseId) =>
    apiFetch(`/api/cases/published/${caseId}`, {
      method: "DELETE",
    }),
  contactSupport: (message) =>
    apiFetch('/api/cases/support/contact', {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),
};

// Token management
export const token = {
  set: (authToken) => localStorage.setItem("auth-token", authToken),
  get: () => getToken(),
  remove: () => localStorage.removeItem("auth-token"),
};

// Notification endpoints (student only)
export const notifications = {
  list: () => apiFetch("/api/notifications"),
  markRead: (id) => apiFetch(`/api/notifications/${id}/read`, { method: "PUT" }),
  markAllRead: () => apiFetch("/api/notifications/read-all", { method: "PUT" }),
};

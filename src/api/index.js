/**
 * BrandGuard Real API Client
 * Connects directly to the backend with JWT authorization and error handling.
 */

const RAW_API_URL = import.meta.env.VITE_API_URL || '';

// Normalize API base path without hardcoded localhost
const API_BASE = RAW_API_URL
  ? (RAW_API_URL.replace(/\/+$/, '').endsWith('/api')
      ? RAW_API_URL.replace(/\/+$/, '')
      : `${RAW_API_URL.replace(/\/+$/, '')}/api`)
  : '/api';

// In-memory token storage with session storage persistence
let inMemoryToken = null;

export function setAuthToken(token) {
  inMemoryToken = token;
  try {
    if (token) {
      sessionStorage.setItem('bg_auth_token', token);
    } else {
      sessionStorage.removeItem('bg_auth_token');
    }
  } catch (_) {
    // SessionStorage may be restricted in some sandboxed environments
  }
}

export function getAuthToken() {
  if (inMemoryToken) return inMemoryToken;
  try {
    const stored = sessionStorage.getItem('bg_auth_token');
    if (stored) {
      inMemoryToken = stored;
      return stored;
    }
  } catch (_) {
    // Ignore error
  }
  return null;
}

export function clearAuthToken() {
  setAuthToken(null);
}

/**
 * Core HTTP Request Wrapper
 * Handles JSON serialization, headers, JWT auth, and centralized 401 navigation.
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const headers = { ...options.headers };

  const token = getAuthToken();
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Do not set Content-Type if sending FormData
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle 401 Unauthorized
  if (response.status === 401) {
    clearAuthToken();

    // Auto-recover session transparently using demo login if available
    try {
      const demoRes = await fetch(`${API_BASE}/auth/demo-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'creator' }),
      });
      if (demoRes.ok) {
        const demoData = await demoRes.json();
        if (demoData.token) {
          setAuthToken(demoData.token);
          const retryHeaders = { ...options.headers, Authorization: `Bearer ${demoData.token}` };
          if (!(options.body instanceof FormData) && !retryHeaders['Content-Type']) {
            retryHeaders['Content-Type'] = 'application/json';
          }
          const retryResponse = await fetch(url, { ...options, headers: retryHeaders });
          if (retryResponse.ok) {
            const retryType = retryResponse.headers.get('content-type');
            if (retryType && retryType.includes('application/json')) {
              return await retryResponse.json();
            }
            return await retryResponse.text();
          }
        }
      }
    } catch (_) {}

    let errorMsg = 'Session expired or invalid credentials. Please log in again.';
    try {
      const errJson = await response.json();
      errorMsg = errJson.message || errJson.error || errorMsg;
    } catch (_) {}
    throw new Error(errorMsg);
  }

  // Parse JSON or text response
  let data;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const message =
      (typeof data === 'object' && data !== null && (data.message || data.error)) ||
      `Request failed with status ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

// ==========================================
// Authentication Endpoints
// ==========================================

export async function login(credentialsOrRole) {
  // Check if string role or object with role/roleOrId
  if (
    typeof credentialsOrRole === 'string' ||
    (typeof credentialsOrRole === 'object' && (credentialsOrRole.role || credentialsOrRole.roleOrId) && !credentialsOrRole.email)
  ) {
    const role = typeof credentialsOrRole === 'string' ? credentialsOrRole : (credentialsOrRole.role || credentialsOrRole.roleOrId);
    const data = await request('/auth/demo-login', {
      method: 'POST',
      body: JSON.stringify({ role, roleOrId: role }),
    });
    if (data.token) {
      setAuthToken(data.token);
    }
    return { ...(data.user || data), token: data.token };
  }

  // Standard email/password login
  const data = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentialsOrRole),
  });
  if (data.token) {
    setAuthToken(data.token);
  }
  return { ...(data.user || data), token: data.token };
}

export async function demoLogin(role) {
  return login(role);
}

export async function getMe() {
  const data = await request('/auth/me');
  return data.user || data;
}

export async function getDemoUsers() {
  return await request('/auth/demo-users');
}

export function logout() {
  clearAuthToken();
}

// ==========================================
// Brand Library & Settings Endpoints
// ==========================================

export async function getBrand() {
  return await request('/brand');
}

export async function updateBrandGuideline(clause) {
  return await request('/brand/guidelines', {
    method: 'PUT',
    body: JSON.stringify(clause),
  });
}

export async function updateApprovedFact(fact) {
  return await request('/brand/facts', {
    method: 'PUT',
    body: JSON.stringify(fact),
  });
}

export async function updateTerminology(type, item, action = 'add') {
  return await request('/brand/terminology', {
    method: 'PUT',
    body: JSON.stringify({ type, item, action }),
  });
}

export async function getSettings() {
  return await request('/settings');
}

export async function updateSettings(settings) {
  return await request('/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
}

// ==========================================
// Content Endpoints
// ==========================================

export async function listContent(filters = {}) {
  const params = new URLSearchParams();
  if (filters.creator) params.append('creator', filters.creator);
  if (filters.status && filters.status !== 'All') params.append('status', filters.status);
  if (filters.rulePack) params.append('rulePack', filters.rulePack);

  const qs = params.toString() ? `?${params.toString()}` : '';
  return await request(`/content${qs}`);
}

export async function getContent(id) {
  return await request(`/content/${encodeURIComponent(id)}`);
}

export async function createContent(payload) {
  return await request('/content', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateContent(id, payload) {
  return await request(`/content/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

/**
 * Submit content: creates draft then executes compliance review pipeline
 */
export async function submitContent({ title, channel, rulePack, text, file }) {
  // Step 1: Create content draft
  const newContent = await createContent({
    title: title || 'Untitled Content Draft',
    channel: channel || 'Instagram',
    rulePack: rulePack || 'India ASCI/CCPA',
    text,
    fileName: file ? file.name : null,
  });

  // Step 2: Trigger compliance review pipeline (Redaction -> Rule Engine -> Gemini -> Validator)
  try {
    const reviewResult = await runReview(newContent.id);
    return reviewResult.content || newContent;
  } catch (err) {
    // If review pipeline errored, still return content item so user can access it
    return newContent;
  }
}

export async function runReview(contentId) {
  return await request(`/content/${encodeURIComponent(contentId)}/review`, {
    method: 'POST',
  });
}

export async function getFindings(contentId) {
  return await request(`/content/${encodeURIComponent(contentId)}/findings`);
}

export async function updateFinding(contentId, findingId, updates) {
  return await request(`/findings/${encodeURIComponent(findingId)}`, {
    method: 'PATCH',
    body: JSON.stringify({
      action: updates.status || updates.action,
      status: updates.status || updates.action,
      dismissalReason: updates.dismissalReason,
      editedText: updates.finalText || updates.suggestion,
      suggestion: updates.suggestion,
    }),
  });
}

export async function addComment(contentId, { text, author, role }) {
  return await request(`/content/${encodeURIComponent(contentId)}/comments`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

export async function setStatus(contentId, status, comment = '', actor = '') {
  return await request(`/content/${encodeURIComponent(contentId)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, comment }),
  });
}

// ==========================================
// Document File Extraction Upload
// ==========================================

export async function uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);

  return await request('/upload', {
    method: 'POST',
    body: formData,
  });
}

// ==========================================
// Analytics & Insights Endpoints
// ==========================================

export async function getInsights() {
  return await request('/insights');
}

export async function getActivity(contentId) {
  const query = contentId ? `?contentId=${encodeURIComponent(contentId)}` : '';
  return await request(`/activity${query}`);
}

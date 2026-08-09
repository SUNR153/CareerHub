import { pricingPlans, companyPricingPlans } from '../data/mockData';

const ACCESS_TOKEN_KEY = 'careerhub_access_token';
const REFRESH_TOKEN_KEY = 'careerhub_refresh_token';
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api/auth').replace(/\/$/, '');
const MEDIA_URL = (import.meta.env.VITE_MEDIA_URL || new URL(API_URL).origin).replace(/\/$/, '');

function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

function setAccessToken(token) {
  if (token) {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }
}

function setRefreshToken(token) {
  if (token) {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

async function request(path, options = {}) {
  const token = getAccessToken();
  const { skipAuth = false, responseType, ...fetchOptions } = options;
  const headers = {
    ...(options.headers || {}),
  };

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (token && !skipAuth) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...fetchOptions,
    headers,
    body: options.body instanceof FormData ? options.body : (options.body ? JSON.stringify(options.body) : undefined),
  });

  if (!response.ok) {
    let errorMsg = 'Ошибка запроса';
    try {
      const errorData = await response.json();
      if (errorData.detail || errorData.error) {
        errorMsg = errorData.detail || errorData.error;
      } else {
        const fieldErrors = Object.entries(errorData)
          .flatMap(([field, messages]) => (Array.isArray(messages) ? messages : [messages]).map(message => `${field}: ${message}`));
        errorMsg = fieldErrors.join(' ') || errorMsg;
      }
    } catch {
      // Keep the generic message when the response body is not JSON.
    }
    throw new Error(errorMsg);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return null;
  }

  if (responseType === 'blob') {
    return response.blob();
  }

  return response.json();
}

export const api = {
  mediaUrl(path) {
    if (!path || path.startsWith('http')) return path;
    return `${MEDIA_URL}${path.startsWith('/') ? path : `/${path}`}`;
  },
  getAccessToken,
  setAccessToken,
  async login(payload) {
    const data = await request('/login/', { method: 'POST', body: payload, skipAuth: true });
    setAccessToken(data.access);
    setRefreshToken(data.refresh);
    return data;
  },
  async register(payload) {
    const data = await request('/register/', { method: 'POST', body: payload, skipAuth: true });
    setAccessToken(data.access);
    setRefreshToken(data.refresh);
    return data;
  },
  logout() {
    setAccessToken(null);
    setRefreshToken(null);
    return Promise.resolve(null);
  },
  me() {
    return request('/me/');
  },
  updateProfile(data) {
    return request('/me/', { method: 'PATCH', body: data });
  },
  deleteProfile() {
    return request('/me/', { method: 'DELETE' });
  },
  companies() {
    return request('/companies/');
  },
  candidates(skills = []) {
    const params = new URLSearchParams();
    skills.forEach(skill => params.append('skill', skill));
    const suffix = params.toString() ? `?${params}` : '';
    return request(`/candidates/${suffix}`);
  },
  candidateProfile(id) {
    return request(`/candidates/${id}/`);
  },
  downloadResume() {
    return request('/me/resume/', { responseType: 'blob' });
  },
  deleteUploadedResume() {
    return request('/me/resume/', { method: 'DELETE' });
  },
  generateResumeSummary(targetRole, language = 'ru') {
    return request('/me/generate-summary/', { method: 'POST', body: { targetRole, language } });
  },
  candidateContacts(id) {
    return request(`/candidates/${id}/contacts/`);
  },
  pricing(audience) {
    // Keep mock for pricing
    if (audience === 'company') return Promise.resolve(companyPricingPlans);
    return Promise.resolve(pricingPlans);
  },
  pythonTest() {
    return request('/tests/python/');
  },
  submitPythonTest(answers) {
    return request('/tests/python/', { method: 'POST', body: { answers } });
  },
  inviteCandidate(candidateId) {
    return request(`/candidates/${candidateId}/invite/`, { method: 'POST' });
  },
  myVacancies() {
    return request('/my-vacancies/');
  },
  createVacancy(payload) {
    return request('/my-vacancies/', { method: 'POST', body: payload });
  },
  updateVacancy(id, payload) {
    return request(`/my-vacancies/${id}/`, { method: 'PATCH', body: payload });
  },
  allVacancies() {
    return request('/vacancies/');
  },
  vacancy(id) {
    return request(`/vacancies/${id}/`);
  },
  applyToVacancy(id) {
    return request(`/vacancies/${id}/apply/`, { method: 'POST' });
  },
  myApplications() {
    return request('/my-applications/');
  },
  notifications() {
    return request('/notifications/');
  },
  markNotificationsRead(notificationId = null) {
    return request('/notifications/read/', { method: 'PATCH', body: notificationId ? { notification_id: notificationId } : {} });
  },
  vacancyApplications(id) {
    return request(`/my-vacancies/${id}/applications/`);
  },
  updateApplicationStatus(vacancyId, applicationId, status) {
    return request(`/my-vacancies/${vacancyId}/applications/`, { method: 'PATCH', body: { application_id: applicationId, status } });
  },
  companyHiringStats() {
    return request('/company-hiring-stats/');
  },
  platformAnalytics(months = 12) {
    return request(`/analytics/?months=${months}`, { skipAuth: true });
  },
  companyProfile(id) {
    return request(`/companies/${id}/`);
  },
};

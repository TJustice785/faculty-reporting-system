import axios from 'axios';
import toast from 'react-hot-toast';

// Create axios instance
const isDev = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV;
const api = axios.create({
  // In development, always go through Vite proxy via relative '/api'
  baseURL: isDev
    ? '/api'
    : ((typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL)
        || (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL)
        || '/api'),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const { response } = error;
    const url = response?.config?.url || error?.config?.url || '';
    const isDashboard = typeof url === 'string' && url.startsWith('/dashboard');
    const method = (response?.config?.method || error?.config?.method || 'get').toLowerCase();
    const isGet = method === 'get';

    // Handle different error status codes
    if (response) {
      switch (response.status) {
        case 401:
          // Unauthorized - redirect to login
          localStorage.removeItem('token');
          delete api.defaults.headers.common['Authorization'];
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
          break;
          
        case 403:
          toast.error('Access denied. You do not have permission for this action.');
          break;
          
        case 404:
          if (!isGet) toast.error('Resource not found.');
          break;
          
        case 429:
          if (!isGet) toast.error('Too many requests. Please try again later.');
          break;
          
        case 500:
          if (!isDashboard && !isGet) toast.error('Server error. Please try again later.');
          break;
          
        default:
          if (!isDashboard && !isGet) {
            if (response.data?.error) {
              toast.error(response.data.error);
            } else {
              toast.error('An unexpected error occurred.');
            }
          }
      }
    } else if (!isGet) {
      if (error.code === 'NETWORK_ERROR') {
        toast.error('Network error. Please check your connection.');
      } else if (error.code === 'TIMEOUT') {
        toast.error('Request timeout. Please try again.');
      } else {
        toast.error('An unexpected error occurred.');
      }
    }

    return Promise.reject(error);
  }
);

// API service methods
export const apiService = {
  // Auth endpoints
  auth: {
    login: (credentials) => api.post('/auth/login', credentials),
    register: (userData) => api.post('/auth/register', userData),
    getMe: () => api.get('/auth/me'),
    changePassword: (passwordData) => api.post('/auth/change-password', passwordData),
    logout: () => api.post('/auth/logout'),
    verifyToken: () => api.get('/auth/verify-token'),
  },

  // Dashboard endpoints
  dashboard: {
    getPublic: () => api.get('/dashboard/public'),
    getPersonal: () => api.get('/dashboard/personal'),
    getAnalytics: (days = 30) => api.get('/dashboard/analytics', { params: { days } }),
    getNotifications: (params) => api.get('/dashboard/notifications', { params }),
    getPending: (params) => api.get('/dashboard/pending', { params }),
    getPendingCount: () => api.get('/dashboard/pending/count'),
    getNotificationsCount: () => api.get('/dashboard/notifications/count'),
    markNotificationRead: (type, id) => api.post('/dashboard/notifications/mark-read', { type, id }),
    markAllNotificationsRead: () => api.post('/dashboard/notifications/mark-all-read'),
  },

  // Reports endpoints
  reports: {
    getAll: (params) => api.get('/reports', { params }),
    getById: (id) => api.get(`/reports/${id}`),
    create: (reportData) => api.post('/reports', reportData),
    update: (id, reportData) => api.put(`/reports/${id}`, reportData),
    moderate: (id, data) => api.put(`/reports/${id}/moderate`, data),
    submit: (id) => api.post(`/reports/${id}/submit`),
    delete: (id) => api.delete(`/reports/${id}`),
    uploadAttachments: (id, formData) => api.post(`/reports/${id}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
    listAttachments: (id) => api.get(`/reports/${id}/attachments`),
    addFeedback: (id, feedbackData) => api.post(`/reports/${id}/feedback`, feedbackData),
    getStats: () => api.get('/reports/stats/summary'),
  },

  // Users endpoints
  users: {
    getMe: () => api.get('/users/me'),
    updateMe: (profileData) => api.put('/users/me', profileData),
    uploadAvatar: (file) => {
      const form = new FormData();
      form.append('avatar', file);
      return api.post('/users/me/avatar', form, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    getAll: (params) => api.get('/users', { params }),
    getById: (id) => api.get(`/users/${id}`),
    create: (userData) => api.post('/users', userData),
    update: (id, userData) => api.put(`/users/${id}`, userData),
    delete: (id) => api.delete(`/users/${id}`),
    deactivate: (id) => api.post(`/users/${id}/deactivate`),
    reactivate: (id) => api.post(`/users/${id}/reactivate`),
    resetPassword: (id) => api.post(`/users/${id}/reset-password`),
    enroll: (id, enrollmentData) => api.post(`/users/${id}/enroll`, enrollmentData),
    assignCourse: (id, courseData) => api.post(`/users/${id}/assign-course`, courseData),
    getAvailableCourses: (params) => api.get('/users/courses/available', { params }),
    getStreams: () => api.get('/users/streams/list'),
    getPublicStreams: () => api.get('/users/public/streams'),
    getPublicCourses: (params) => api.get('/users/public/courses', { params }),
    getLecturersByCourse: (courseId) => api.get('/users/lecturers/by-course', { params: { courseId } }),
    getRatingContext: (params) => api.get('/users/rating/context', { params }),
    validateRateClass: (courseId, lecturerId) => api.get('/users/rate-class/validate', { params: { courseId, lecturerId } }),
    rateClass: (ratingData) => api.post('/users/rate-class', ratingData),
  },

  // Export endpoints
  export: {
    reportsExcel: (params) => api.get('/export/reports/excel', { 
      params, 
      responseType: 'blob' 
    }),
    reportsPdf: (params) => api.get('/export/reports/pdf', { 
      params, 
    }),
    analyticsExcel: (params) => api.get('/export/analytics/excel', { 
      params, 
      responseType: 'blob' 
    }),
    usersExcel: (params) => api.get('/export/users/excel', { 
      params, 
      responseType: 'blob' 
    }),
  },

  // Admin endpoints
  admin: {
    getOverview: (days) => days ? api.get('/admin/overview', { params: { days } }) : api.get('/admin/overview'),
    bulkUsers: (payload) => api.post('/admin/users/bulk', payload),
    getAudit: (params) => api.get('/admin/audit', { params }),
  },
};

// File download helper
export const downloadFile = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export default api;
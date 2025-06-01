import axios from 'axios';
import Cookies from 'js-cookie';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = Cookies.get('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid, clear it
      Cookies.remove('auth_token');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  projects: string[];
  preferences: any;
  lastLogin: string;
  createdAt: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

// Auth API calls
export const authAPI = {
  login: async (data: LoginData): Promise<AuthResponse> => {
    const response = await api.post('/api/auth/login', data);
    return response.data;
  },

  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await api.post('/api/auth/register', data);
    return response.data;
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get('/api/auth/me');
    return response.data;
  },

  updatePreferences: async (preferences: any): Promise<any> => {
    const response = await api.patch('/api/auth/preferences', preferences);
    return response.data;
  },
};

// Project API calls
export const projectAPI = {
  getAll: async () => {
    const response = await api.get('/api/projects');
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/api/projects/${id}`);
    return response.data;
  },

  create: async (data: any) => {
    const response = await api.post('/api/projects', data);
    return response.data;
  },

  update: async (id: string, data: any) => {
    const response = await api.put(`/api/projects/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/api/projects/${id}`);
    return response.data;
  },

  getStats: async (id: string) => {
    const response = await api.get(`/api/projects/${id}/stats`);
    return response.data;
  },
};

// Analysis API calls
export const analysisAPI = {
  start: async (data: any) => {
    const response = await api.post('/api/analysis/start', data);
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/api/analysis/${id}`);
    return response.data;
  },

  getByProject: async (projectId: string, limit = 10) => {
    const response = await api.get(`/api/analysis/project/${projectId}?limit=${limit}`);
    return response.data;
  },
};

// Webhook API calls
export const webhookAPI = {
  getStatus: async (projectId: string) => {
    const response = await api.get(`/api/webhooks/status/${projectId}`);
    return response.data;
  },

  regenerateSecret: async (projectId: string) => {
    const response = await api.post(`/api/webhooks/regenerate-secret/${projectId}`);
    return response.data;
  },
};

export default api;

import axios from 'axios';
import Cookies from 'js-cookie';

// Configure base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get('auth_token');
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
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      Cookies.remove('auth_token');
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Types
export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

export interface GitLabSettings {
  apiToken: string;
  baseUrl: string;
}

export interface ProjectData {
  name: string;
  gitlabProjectId: string;
  repositoryUrl: string;
  branch: string;
  scanFrequency: 'ON_PUSH' | 'DAILY' | 'WEEKLY';
  notificationEmail: string;
  scanTypes: string[];
  webhookSecret: string;
  notificationSettings?: {
    email: boolean;
    emailAddresses: string[];
    slack: boolean;
    webhook: boolean;
    minSeverity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  };
}

export interface AnalysisStartData {
  projectId: string;
  commitHash?: string;
  triggeredBy?: 'manual' | 'webhook' | 'scheduled';
}

// Authentication API
export const authAPI = {
  login: async (data: LoginData) => {
    const response = await api.post('/api/auth/login', data);
    return response.data;
  },

  register: async (data: RegisterData) => {
    const response = await api.post('/api/auth/register', data);
    return response.data;
  },

  googleSignIn: async (credential: string) => {
    const response = await api.post('/api/auth/google', { credential });
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get('/api/auth/me');
    return response.data;
  },

  updatePreferences: async (preferences: any) => {
    const response = await api.patch('/api/auth/preferences', preferences);
    return response.data;
  },

  updateGitLabSettings: async (settings: GitLabSettings) => {
    const response = await api.patch('/api/auth/gitlab-settings', settings);
    return response.data;
  },

  testGitLabConnection: async (settings: GitLabSettings) => {
    const response = await api.post('/api/auth/gitlab-test', settings);
    return response.data;
  },
};

// Project API
export const projectAPI = {
  getAll: async () => {
    const response = await api.get('/api/projects');
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/api/projects/${id}`);
    return response.data;
  },

  create: async (data: ProjectData) => {
    const response = await api.post('/api/projects', data);
    return response.data;
  },

  update: async (id: string, data: Partial<ProjectData>) => {
    const response = await api.put(`/api/projects/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/api/projects/${id}`);
    return response.data;
  },

  getFiles: async (projectId: string, branch?: string) => {
    const response = await api.get(`/api/projects/${projectId}/files`, {
      params: { branch }
    });
    return response.data;
  },

  getFileContent: async (projectId: string, filePath: string, branch?: string) => {
    const response = await api.get(`/api/projects/${projectId}/files/content`, {
      params: { filePath, branch }
    });
    return response.data;
  },
};

// Analysis API
export const analysisAPI = {
  start: async (data: AnalysisStartData) => {
    const response = await api.post('/api/analysis/start', data);
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/api/analysis/${id}`);
    return response.data;
  },

  getByProject: async (projectId: string, limit: number = 10) => {
    const response = await api.get(`/api/analysis/project/${projectId}`, {
      params: { limit }
    });
    return response.data;
  },

  getProgress: async (analysisId: string) => {
    const response = await api.get(`/api/analysis/${analysisId}/progress`);
    return response.data;
  },

  cancel: async (analysisId: string) => {
    const response = await api.post(`/api/analysis/${analysisId}/cancel`);
    return response.data;
  },
};

// System API
export const systemAPI = {
  getHealth: async () => {
    const response = await api.get('/api/system/health');
    return response.data;
  },

  validateCredentials: async () => {
    const response = await api.get('/api/system/validate');
    return response.data;
  },

  getMetrics: async () => {
    const response = await api.get('/api/system/metrics');
    return response.data;
  },
};

// Webhook API
export const webhookAPI = {
  testWebhook: async (projectId: string, webhookData: any) => {
    const response = await api.post(`/api/webhooks/test/${projectId}`, webhookData);
    return response.data;
  },

  getWebhookHistory: async (projectId: string, limit: number = 20) => {
    const response = await api.get(`/api/webhooks/history/${projectId}`, {
      params: { limit }
    });
    return response.data;
  },
};

// Utility functions
export const handleApiError = (error: any): string => {
  if (error.response?.data?.error) {
    return error.response.data.error;
  }
  if (error.response?.data?.errors?.[0]?.msg) {
    return error.response.data.errors[0].msg;
  }
  if (error.message) {
    return error.message;
  }
  return 'An unexpected error occurred';
};

export const isTokenValid = (): boolean => {
  const token = Cookies.get('auth_token');
  if (!token) return false;

  try {
    // Basic token validation - check if it's not expired
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
};

export const clearAuth = (): void => {
  Cookies.remove('auth_token');
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
};

// Real-time connection helpers
export const createEventSource = (url: string): EventSource | null => {
  if (typeof window === 'undefined') return null;
  
  const token = Cookies.get('auth_token');
  const eventSource = new EventSource(`${API_BASE_URL}${url}?token=${token}`);
  
  eventSource.onerror = (error) => {
    console.error('EventSource failed:', error);
  };
  
  return eventSource;
};

export default api;
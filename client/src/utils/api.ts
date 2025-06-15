import axios from 'axios';
import Cookies from 'js-cookie';

// Configure base URL with proper fallbacks for different environments
const getAPIBaseURL = () => {
  // If explicit API URL is set, use it
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  // In browser environment
  if (typeof window !== 'undefined') {
    const { protocol, hostname, port } = window.location;
    
    // Production deployment on Vercel or similar
    if (hostname.includes('vercel.app') || 
        hostname.includes('netlify.app') || 
        !hostname.includes('localhost')) {
      return process.env.NEXT_PUBLIC_API_URL || `${protocol}//${hostname}`;
    }
    
    // Local development - use API port
    return `${protocol}//${hostname}:3001`;
  }
  
  // Server-side fallback
  return process.env.API_BASE_URL || 'http://localhost:3001';
};

const API_BASE_URL = getAPIBaseURL();

// Create axios instance with enhanced configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // Reduced timeout for better UX
  headers: {
    'Content-Type': 'application/json',
  },
  // Add retry configuration
  validateStatus: (status) => {
    return status < 500; // Don't throw for 4xx errors, handle them gracefully
  }
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

// Response interceptor for error handling with retry logic
let retryCount = 0;
const MAX_RETRIES = 3;

api.interceptors.response.use(
  (response) => {
    retryCount = 0; // Reset on successful response
    return response;
  },
  async (error) => {
    const { config, response } = error;
    
    // Handle 401 for authenticated routes
    if (response?.status === 401 && 
        !config?.url?.includes('/api/auth/') &&
        typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      if (!currentPath.includes('/login') && !currentPath.includes('/sign-up')) {
        Cookies.remove('auth_token');
        window.location.href = '/login';
      }
    }
    
    // Retry logic for network errors and 5xx server errors
    if (shouldRetry(error) && retryCount < MAX_RETRIES) {
      retryCount++;
      
      // Exponential backoff
      const delay = Math.pow(2, retryCount) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      
      console.log(`Retrying request (attempt ${retryCount}/${MAX_RETRIES})...`);
      return api.request(config);
    }
    
    retryCount = 0;
    return Promise.reject(error);
  }
);

// Helper function to determine if request should be retried
const shouldRetry = (error: any): boolean => {
  // Network errors
  if (!error.response) return true;
  
  // Server errors (5xx)
  if (error.response.status >= 500) return true;
  
  // Specific error codes that might be transient
  if ([408, 429, 502, 503, 504].includes(error.response.status)) return true;
  
  return false;
};

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
    try {
      const response = await api.post('/api/analysis/start', data);
      return response.data || {};
    } catch (error: any) {
      console.error('Failed to start analysis:', error?.message);
      throw error;
    }
  },

  getById: async (id: string) => {
    try {
      const response = await api.get(`/api/analysis/${id}`);
      return response.data || null;
    } catch (error: any) {
      console.warn('Failed to get analysis:', error?.message);
      return null;
    }
  },

  getByProject: async (projectId: string, limit: number = 10) => {
    try {
      const response = await api.get(`/api/analysis/project/${projectId}`, {
        params: { limit }
      });
      // Ensure we return an array
      const data = response.data;
      if (Array.isArray(data)) {
        return data;
      } else if (data && Array.isArray(data.analyses)) {
        return data.analyses;
      }
      return [];
    } catch (error: any) {
      console.warn('Failed to get project analyses:', error?.message);
      return [];
    }
  },

  getProgress: async (analysisId: string) => {
    try {
      const response = await api.get(`/api/analysis/${analysisId}/progress`);
      return response.data || { progress: 0, stage: 'UNKNOWN' };
    } catch (error: any) {
      console.warn('Failed to get analysis progress:', error?.message);
      return { progress: 0, stage: 'UNKNOWN' };
    }
  },

  cancel: async (analysisId: string) => {
    try {
      const response = await api.post(`/api/analysis/${analysisId}/cancel`);
      return response.data || {};
    } catch (error: any) {
      console.error('Failed to cancel analysis:', error?.message);
      throw error;
    }
  },
};

// System API with enhanced error handling
export const systemAPI = {
  getHealth: async () => {
    try {
      const response = await api.get('/api/system/health');
      return response.data;
    } catch (error: any) {
      console.warn('Health check failed:', error);
      // Return a degraded status instead of throwing
      return {
        status: 'degraded',
        error: handleApiError(error),
        timestamp: new Date().toISOString()
      };
    }
  },

  validateCredentials: async () => {
    try {
      const response = await api.get('/api/system/validate');
      return response.data;
    } catch (error: any) {
      console.warn('System validation failed:', error);
      
      // If it's a network error, return a specific error state
      if (!error.response) {
        return {
          status: 'error',
          details: {
            errors: ['Unable to connect to server. Please check your internet connection.'],
            environment: {
              mongodbUri: false,
              geminiApiKey: false,
              jwtSecret: false
            },
            services: {
              mongodb: false,
              ai: false
            }
          }
        };
      }
      
      // Return error details for UI to handle gracefully
      return {
        status: 'error',
        details: {
          errors: [handleApiError(error)],
          environment: {
            mongodbUri: false,
            geminiApiKey: false,
            jwtSecret: false
          },
          services: {
            mongodb: false,
            ai: false
          }
        }
      };
    }
  },

  getMetrics: async () => {
    try {
      const response = await api.get('/api/system/metrics');
      return response.data;
    } catch (error: any) {
      console.warn('Failed to get metrics:', error);
      throw error;
    }
  },
};

// Notification API
export const notificationAPI = {
  getAll: async (params: {
    page?: number;
    limit?: number;
    unread?: boolean;
    projectId?: string;
  } = {}) => {
    try {
      const response = await api.get('/api/notifications', { params });
      // Ensure response has expected structure
      if (!response.data || typeof response.data !== 'object') {
        return { notifications: [], unreadCount: 0 };
      }
      return {
        notifications: Array.isArray(response.data.notifications) ? response.data.notifications : [],
        unreadCount: typeof response.data.unreadCount === 'number' ? response.data.unreadCount : 0,
        ...response.data
      };
    } catch (error: any) {
      // Return safe fallback for any error
      return { notifications: [], unreadCount: 0 };
    }
  },

  markAsRead: async (data: {
    notificationIds?: string[];
    markAll?: boolean;
  }) => {
    try {
      const response = await api.patch('/api/notifications/read', data);
      return response.data || {};
    } catch (error: any) {
      console.warn('Failed to mark notifications as read:', error?.message);
      return {};
    }
  },

  getStats: async () => {
    try {
      const response = await api.get('/api/notifications/stats');
      return response.data || {};
    } catch (error: any) {
      console.warn('Failed to get notification stats:', error?.message);
      return {};
    }
  },
};

// Analysis History API
export const analysisHistoryAPI = {
  getProjectHistory: async (projectId: string, days: number = 30) => {
    const response = await api.get(`/api/analysis/project/${projectId}/history`, {
      params: { days }
    });
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
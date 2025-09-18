import axios from 'axios';
import { useAuthStore } from './store';

// API Configuration
// Support new env names with fallbacks for backward compatibility.
// Prefer localhost in development if not provided via env.
const isDev = process.env.NODE_ENV !== 'production';
const DEFAULT_HTTP = isDev ? 'http://localhost:3000' : 'https://realtime-notes-backend.vercel.app';
const DEFAULT_WS = isDev ? 'ws://localhost:3000' : 'wss://realtime-notes-backend.vercel.app';

const API_BASE_HTTP = process.env.NEXT_PUBLIC_API_BASE_HTTP || process.env.NEXT_PUBLIC_API_URL || DEFAULT_HTTP;
const API_BASE_WS = process.env.NEXT_PUBLIC_API_BASE_WS || process.env.NEXT_PUBLIC_WS_URL || DEFAULT_WS;

if (typeof window !== 'undefined') {
  // Helpful runtime log so misconfigured envs are obvious
  // eslint-disable-next-line no-console
  console.log('[collab] Using API_BASE_HTTP=', API_BASE_HTTP, 'API_BASE_WS=', API_BASE_WS);
}

// Create axios instance with default config
export const api = axios.create({
  baseURL: API_BASE_HTTP,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false, // Disable credentials for CORS
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // Don't add auth token to auth endpoints
    if (!config.url?.includes('/auth/') && typeof window !== 'undefined') {
      // Get token directly from Zustand store
      const token = useAuthStore.getState().token;
      console.log('API Request to:', config.url, 'Token available:', !!token);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('Added auth token to request');
      } else {
        console.log('No auth token found in store');
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth data on unauthorized using Zustand store
      if (typeof window !== 'undefined') {
        useAuthStore.getState().clearAuth();
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API functions
export const authAPI = {
  async login(email: string, password: string) {
    try {
      console.log('Attempting login to:', `${API_BASE_HTTP}/auth/login`);
      const response = await api.post('/auth/login', { email, password });
      console.log('Login response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  async register(email: string, password: string, name?: string) {
    try {
      console.log('Attempting register to:', `${API_BASE_HTTP}/auth/register`);
      const response = await api.post('/auth/register', { email, password, name });
      console.log('Register response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  },

  async verifyToken(token: string) {
    try {
      console.log('Attempting token verification to:', `${API_BASE_HTTP}/auth/verify`);
      const response = await api.get('/auth/verify', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Token verification response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Token verification error:', error);
      throw error;
    }
  }
};

// Notes API functions
export const notesAPI = {
  async getNotes() {
    const response = await api.get('/notes');
    return response.data;
  },

  async getNote(id: number) {
    const response = await api.get(`/notes/${id}`);
    return response.data;
  },

  async createNote(data: { title: string; content: string; folderId?: number }) {
    const response = await api.post('/notes', data);
    return response.data;
  },

  async updateNote(id: number, data: { title?: string; content?: string; folderId?: number }) {
    const response = await api.put(`/notes/${id}`, data);
    return response.data;
  },

  async deleteNote(id: number) {
    const response = await api.delete(`/notes/${id}`);
    return response.data;
  },

  async searchNotes(query: string) {
    const response = await api.get(`/notes/search?q=${encodeURIComponent(query)}`);
    return response.data;
  }
};

// Folders API functions
export const foldersAPI = {
  async getFolders() {
    const response = await api.get('/folders');
    return response.data;
  },

  async createFolder(name: string, parentId?: number) {
    const response = await api.post('/folders', { name, parentId });
    return response.data;
  },

  async updateFolder(id: number, data: { name?: string; parentId?: number }) {
    const response = await api.put(`/folders/${id}`, data);
    return response.data;
  },

  async deleteFolder(id: number) {
    const response = await api.delete(`/folders/${id}`);
    return response.data;
  }
};

// WebSocket helper
export const createWebSocket = (token: string) => {
  return new WebSocket(`${API_BASE_WS}/ws?token=${encodeURIComponent(token)}`);
};

// Collaboration REST endpoints
export const collabAPI = {
  async listOnlineUsers() {
    const response = await api.get('/collab/users/online');
    return response.data as { users: { id: number; email: string; name?: string }[] };
  },
  async shareNote(noteId: number, toUserId: number) {
    const response = await api.post('/collab/share', { noteId, toUserId });
    return response.data as { success: boolean };
  },
};

// Export base URLs for environment variables
export { API_BASE_HTTP, API_BASE_WS };

import axios, { AxiosInstance, AxiosError } from 'axios';

export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? '').replace(/\/$/, '');

export function apiUrl(path = '') {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

const adminApiClient: AxiosInstance = axios.create({
  baseURL: apiUrl('/api'),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
adminApiClient.interceptors.request.use(
  (config) => {
    const token = typeof window !== 'undefined'
      ? localStorage.getItem('accessToken')
      : null;

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
adminApiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired - redirect to login
      typeof window !== 'undefined' && (window.location.href = '/login');
    }
    return Promise.reject(error);
  }
);

export default adminApiClient;

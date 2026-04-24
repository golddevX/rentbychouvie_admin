import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/auth.store';

export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? '').replace(/\/$/, '');

export function apiUrl(path = '') {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

const REFRESH_ENDPOINT = '/auth/refresh';

const adminApiClient: AxiosInstance = axios.create({
  baseURL: apiUrl('/api'),
  headers: {
    'Content-Type': 'application/json',
  },
});

let refreshPromise: Promise<string | null> | null = null;

function clearAuthAndRedirect() {
  useAuthStore.getState().logout();
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.replace('/login');
  }
}

async function refreshAccessToken() {
  const refreshToken =
    typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;

  if (!refreshToken) {
    clearAuthAndRedirect();
    return null;
  }

  if (!refreshPromise) {
    refreshPromise = axios
      .post<{ accessToken: string }>(apiUrl(`/api${REFRESH_ENDPOINT}`), { refreshToken }, {
        headers: { 'Content-Type': 'application/json' },
      })
      .then((response) => {
        const nextAccessToken = response.data.accessToken;
        useAuthStore.getState().setAccessToken(nextAccessToken);
        return nextAccessToken;
      })
      .catch(() => {
        clearAuthAndRedirect();
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

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
  (error) => Promise.reject(error),
);

adminApiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const originalRequest = error.config as RetryableRequestConfig | undefined;
    const requestPath = originalRequest?.url ?? '';
    const isRefreshRequest = requestPath.includes(REFRESH_ENDPOINT);

    if (status !== 401 || !originalRequest || originalRequest._retry || isRefreshRequest) {
      if (status === 401 && isRefreshRequest) {
        clearAuthAndRedirect();
      }
      return Promise.reject(error);
    }

    originalRequest._retry = true;
    const nextAccessToken = await refreshAccessToken();

    if (!nextAccessToken) {
      return Promise.reject(error);
    }

    originalRequest.headers = originalRequest.headers ?? {};
    originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`;
    return adminApiClient(originalRequest);
  },
);

export default adminApiClient;

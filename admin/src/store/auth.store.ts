import { create } from 'zustand';

interface Auth {
  accessToken: string | null;
  refreshToken: string | null;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
  } | null;
}

interface AuthStore extends Auth {
  hydrated: boolean;
  hydrateFromStorage: () => void;
  login: (accessToken: string, refreshToken: string, user: Auth['user']) => void;
  logout: () => void;
  setAccessToken: (accessToken: string | null) => void;
  setUser: (user: Auth['user']) => void;
}

function readStoredUser(): Auth['user'] {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem('user');
  if (!stored) return null;
  try {
    return JSON.parse(stored) as Auth['user'];
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthStore>((set) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  hydrated: false,

  hydrateFromStorage: () => {
    if (typeof window === 'undefined') return;
    set({
      accessToken: localStorage.getItem('accessToken'),
      refreshToken: localStorage.getItem('refreshToken'),
      user: readStoredUser(),
      hydrated: true,
    });
  },

  login: (accessToken, refreshToken, user) => {
    set({ accessToken, refreshToken, user, hydrated: true });
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
    }
  },

  logout: () => {
    set({ accessToken: null, refreshToken: null, user: null, hydrated: true });
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  },

  setAccessToken: (accessToken) => {
    set({ accessToken, hydrated: true });
    if (typeof window !== 'undefined') {
      if (accessToken) {
        localStorage.setItem('accessToken', accessToken);
      } else {
        localStorage.removeItem('accessToken');
      }
    }
  },

  setUser: (user) => {
    set({ user, hydrated: true });
    if (typeof window !== 'undefined') {
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
      } else {
        localStorage.removeItem('user');
      }
    }
  },
}));

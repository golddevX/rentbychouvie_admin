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
  login: (accessToken: string, refreshToken: string, user: Auth['user']) => void;
  logout: () => void;
  setAccessToken: (accessToken: string | null) => void;
  setUser: (user: Auth['user']) => void;
}

const initialAccessToken =
  typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

const initialRefreshToken =
  typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;

const initialUser =
  typeof window !== 'undefined'
    ? (() => {
        const stored = localStorage.getItem('user');
        if (!stored) return null;
        try {
          return JSON.parse(stored) as Auth['user'];
        } catch {
          return null;
        }
      })()
    : null;

export const useAuthStore = create<AuthStore>((set) => ({
  accessToken: initialAccessToken,
  refreshToken: initialRefreshToken,
  user: initialUser,

  login: (accessToken, refreshToken, user) => {
    set({ accessToken, refreshToken, user });
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
    }
  },

  logout: () => {
    set({ accessToken: null, refreshToken: null, user: null });
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  },

  setAccessToken: (accessToken) => {
    set({ accessToken });
    if (typeof window !== 'undefined') {
      if (accessToken) {
        localStorage.setItem('accessToken', accessToken);
      } else {
        localStorage.removeItem('accessToken');
      }
    }
  },

  setUser: (user) => set({ user }),
}));

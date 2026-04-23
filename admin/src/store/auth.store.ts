import { create } from 'zustand';

interface Auth {
  accessToken: string | null;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
  } | null;
}

interface AuthStore extends Auth {
  login: (accessToken: string, user: Auth['user']) => void;
  logout: () => void;
  setUser: (user: Auth['user']) => void;
}

const initialAccessToken =
  typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

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
  user: initialUser,

  login: (accessToken, user) => {
    set({ accessToken, user });
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('user', JSON.stringify(user));
    }
  },

  logout: () => {
    set({ accessToken: null, user: null });
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
    }
  },

  setUser: (user) => set({ user }),
}));

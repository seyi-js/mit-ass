import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';
import { api } from './api';
import { User } from './types';

const AuthContext = createContext<{
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
} | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    api<User>('/auth/me', { signal: controller.signal })
      .then(setUser)
      .catch(() => {})
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    const expired = () => setUser(null);
    window.addEventListener('session-expired', expired);
    return () => {
      controller.abort();
      window.removeEventListener('session-expired', expired);
    };
  }, []);
  const logout = async () => {
    await api('/auth/logout', { method: 'POST', body: '{}' });
    setUser(null);
  };
  return (
    <AuthContext.Provider value={{ user, loading, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('AuthProvider is required');
  return context;
}

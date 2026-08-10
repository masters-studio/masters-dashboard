import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getToken, clearToken, onUnauthorized } from '../api/client';
import { login as apiLogin } from '../api/auth';
import { isTokenExpired } from './jwt';

interface AuthState {
  isAuthenticated: boolean;
  username: string | null;
  role: string | null;
}

interface AuthContextValue extends AuthState {
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readInitialState(): AuthState {
  const token = getToken();
  if (!token || isTokenExpired(token)) {
    if (token) clearToken(); // stale token left over from a prior session
    return { isAuthenticated: false, username: null, role: null };
  }
  // The token proves auth on reload; username/role only get (re)populated
  // precisely on a fresh login. Nothing currently reads them outside that
  // flow, so this is fine — revisit if a page needs the display name back
  // without forcing a re-login.
  return { isAuthenticated: true, username: null, role: null };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(readInitialState);

  useEffect(() => {
    // Any 401 from any future API call — expired token, deactivated user,
    // whatever — routes through here and drops back to the login screen.
    onUnauthorized(() => {
      clearToken();
      setState({ isAuthenticated: false, username: null, role: null });
    });
  }, []);

  async function login(username: string, password: string) {
    const response = await apiLogin(username, password);
    setState({ isAuthenticated: true, username: response.username, role: response.role });
  }

  function logout() {
    clearToken();
    setState({ isAuthenticated: false, username: null, role: null });
  }

  return <AuthContext.Provider value={{ ...state, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

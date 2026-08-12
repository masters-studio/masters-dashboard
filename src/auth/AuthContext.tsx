import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getToken, clearToken, onUnauthorized } from '../api/client';
import { login as apiLogin } from '../api/auth';
import { decodeToken, isTokenExpired } from './jwt';

interface AuthState {
  isAuthenticated: boolean;
  username: string | null;
  /** Cosmetic name for the UI; falls back to username when unset. */
  displayName: string | null;
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
    return { isAuthenticated: false, username: null, displayName: null, role: null };
  }
  // Read username/role straight from the token's own claims — no need to
  // wait for a fresh login just to know who's logged in after a reload.
  const decoded = decodeToken(token);
  return {
    isAuthenticated: true,
    username: decoded?.sub ?? null,
    displayName: decoded?.displayName ?? decoded?.sub ?? null,
    role: decoded?.role ?? null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(readInitialState);

  useEffect(() => {
    // Any 401 from any future API call — expired token, deactivated user,
    // whatever — routes through here and drops back to the login screen.
    onUnauthorized(() => {
      clearToken();
      setState({ isAuthenticated: false, username: null, displayName: null, role: null });
    });
  }, []);

  async function login(username: string, password: string) {
    const response = await apiLogin(username, password);
    setState({
      isAuthenticated: true,
      username: response.username,
      displayName: response.displayName ?? response.username,
      role: response.role,
    });
  }

  function logout() {
    clearToken();
    setState({ isAuthenticated: false, username: null, displayName: null, role: null });
  }

  return <AuthContext.Provider value={{ ...state, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

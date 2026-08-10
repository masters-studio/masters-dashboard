const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const TOKEN_KEY = 'masters_dashboard_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * Mirrors GlobalExceptionHandler's response body exactly (masters-api,
 * exception/GlobalExceptionHandler.java) — timestamp/status/error/message
 * always present, fieldErrors only on bean-validation failures.
 */
export interface ApiErrorBody {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  fieldErrors?: Record<string, string>;
}

export class ApiError extends Error {
  status: number;
  fieldErrors?: Record<string, string>;

  constructor(body: ApiErrorBody) {
    super(body.message);
    this.name = 'ApiError';
    this.status = body.status;
    this.fieldErrors = body.fieldErrors;
  }
}

/**
 * Fires on any 401. Lets the auth layer react (clear the stored token,
 * redirect to /login) without this module needing to import React Router —
 * keeps the client a plain fetch wrapper, not entangled with app routing.
 */
type UnauthorizedListener = () => void;
let unauthorizedListener: UnauthorizedListener | null = null;
export function onUnauthorized(listener: UnauthorizedListener): void {
  unauthorizedListener = listener;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  /** Only /auth/login skips this — every other route requires a token. */
  skipAuth?: boolean;
}

/**
 * The one place base URL, auth headers, JSON (de)serialization, and error
 * shape are handled. Every domain module (employees.ts, suppliers.ts, ...) is
 * a thin typed layer calling this, not its own fetch logic.
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, skipAuth = false } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (!skipAuth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      // Non-JSON body — e.g. a raw error page from an intermediary proxy.
      // Fall through with data=null; the generic error below covers it.
    }
  }

  if (!response.ok) {
    if (response.status === 401 && !skipAuth) {
      unauthorizedListener?.();
    }
    if (data && typeof data === 'object' && 'message' in data) {
      throw new ApiError(data as ApiErrorBody);
    }
    throw new ApiError({
      timestamp: new Date().toISOString(),
      status: response.status,
      error: response.statusText,
      message: `Request failed with status ${response.status}`,
    });
  }

  return data as T;
}

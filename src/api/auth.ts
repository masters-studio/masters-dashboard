import { apiFetch, setToken } from './client';

export interface LoginRequest {
  username: string;
  password: string;
}

/** Mirrors LoginResponse.java (masters-api, dto/auth/LoginResponse.java) exactly. */
export interface LoginResponse {
  token: string;
  tokenType: string;
  expiresAt: number;
  username: string;
  displayName: string | null;
  role: string;
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const response = await apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: { username, password } satisfies LoginRequest,
    skipAuth: true,
  });
  setToken(response.token);
  return response;
}

interface DecodedToken {
  sub: string;
  role: string;
  exp: number; // seconds since epoch — matches JwtUtil.java's .expiration(...)
  iat: number;
}

/**
 * Decodes the JWT payload WITHOUT verifying the signature — that check is the
 * server's job on every request, and can't be meaningfully done client-side
 * without the signing secret anyway. This only answers "is there an obviously
 * stale token in storage" before the first real API call would prove it either
 * way — avoids a flash of authenticated UI that immediately 401s and bounces
 * back to /login on every page reload.
 */
function decodeToken(token: string): DecodedToken | null {
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as DecodedToken;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token);
  if (!decoded) return true;
  return decoded.exp < Date.now() / 1000;
}

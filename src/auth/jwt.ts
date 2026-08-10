export interface DecodedToken {
  sub: string; // username — matches JwtUtil.java's .subject(username)
  role: string;
  exp: number; // seconds since epoch — matches JwtUtil.java's .expiration(...)
  iat: number;
}

/**
 * Decodes the JWT payload WITHOUT verifying the signature — that check is the
 * server's job on every request, and can't be meaningfully done client-side
 * without the signing secret anyway. Used two ways: to read `exp` (a
 * proactive "is this obviously stale" check that avoids a flash of
 * authenticated UI which would immediately 401 on reload), and to read
 * `sub`/`role` so the UI (e.g. the nav sidebar's username display) has
 * something to show immediately after a reload, without waiting on another
 * API call or forcing a fresh login just to know who's logged in.
 */
export function decodeToken(token: string): DecodedToken | null {
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

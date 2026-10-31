import { useAuthStore } from './auth-store';
import { createSessionCoordinator, withSessionLock } from './session-sync';

// Keep browser session and CSRF cookies on the admin's origin. Next forwards these
// paths using API_BACKEND_URL; legacy public API URLs can point at a different site.
export const API_BASE = '/api/v1';
export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string) { super(message); }
}
type Session = { token: string; data: { user: NonNullable<ReturnType<typeof useAuthStore.getState>['user']> } };
let refreshPromise: Promise<Session> | null = null;
type User = Session['data']['user'];
const sessions = createSessionCoordinator<User>({
  current: () => {
    const { accessToken, user } = useAuthStore.getState();
    return accessToken && user ? { token: accessToken, user } : null;
  },
  accept: ({ token, user }) => useAuthStore.getState().setAuth(token, user),
  validUser: (user): user is User => !!user && typeof user === 'object' && 'id' in user && typeof user.id === 'string' && 'role' in user && user.role === 'admin',
  clear: () => useAuthStore.getState().clearAuth(),
});
function acceptSession(session: Session) {
  if (!session.token || !sessionsUser(session.data?.user)) {
    useAuthStore.getState().clearAuth();
    throw new ApiError('Access denied: Admin role required', 403);
  }
  useAuthStore.getState().setAuth(session.token, session.data.user);
  sessions.announce({ token: session.token, user: session.data.user });
  return session;
}
function sessionsUser(user: User | undefined): user is User { return !!user && user.role === 'admin'; }
export const endSession = (endedAtMs?: number) => sessions.endSession(endedAtMs);

async function send(url: string, options: RequestInit, auth: boolean): Promise<Response> {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  const state = useAuthStore.getState();
  if (auth && state.accessToken) headers.set('Authorization', `Bearer ${state.accessToken}`);
  if (auth && state.twoFactorToken) headers.set('X-2FA-Token', state.twoFactorToken);
  if (!['GET', 'HEAD', 'OPTIONS'].includes(options.method || 'GET')) {
    const csrf = await fetch(`${API_BASE}/auth/csrf-token`, { credentials: 'include', cache: 'no-store', signal: options.signal || AbortSignal.timeout(30_000) });
    if (!csrf.ok) throw new ApiError('Unable to secure this request. Please retry.', csrf.status);
    const payload = await csrf.json();
    headers.set('X-CSRF-Token', payload.data.csrfToken);
  }
  return fetch(url, { ...options, headers, credentials: 'include', cache: 'no-store', signal: options.signal || AbortSignal.timeout(30_000) });
}

export async function request(url: string, options: RequestInit = {}, auth = true, internal: { skipLock?: boolean; skipRefresh?: boolean } = {}): Promise<Response> {
  const changesSession = options.method !== 'GET' && /\/auth\/(?:login|logout|verify-email\/[^/]+|reset-password\/[^/]+|update-password)$/.test(url);
  const logout = url.endsWith('/auth/logout');
  if (changesSession && !internal.skipLock) {
    try {
      return await withSessionLock(async () => {
        const response = await request(url, options, auth, { skipLock: true, skipRefresh: true });
        // Read and apply the session before another cookie-changing request
        // can enter the lock. Callers consume their own response copy.
        const payload = await response.clone().json().catch(() => null);
        if (logout) sessions.endSession(payload?.endedAtMs);
        else if (payload?.token && payload?.data?.user) acceptSession(payload);
        return response;
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401 && error.code !== '2FA_REQUIRED' && auth && !logout && !internal.skipRefresh) {
        await refreshSession();
        return request(url, options, auth, { skipRefresh: true });
      }
      throw error;
    }
  }
  try {
    let sentToken = useAuthStore.getState().accessToken;
    let response = await send(url, options, auth);
    let body = response.ok ? null : await response.clone().json().catch(() => null);
    if (response.status === 403 && body?.code === 'CSRF_INVALID') {
      sentToken = useAuthStore.getState().accessToken;
      response = await send(url, options, auth);
      body = response.ok ? null : await response.clone().json().catch(() => null);
    }
    const twoFactor = /2fa|two.factor/i.test(body?.message || '');
    if (response.status === 401 && auth && !twoFactor && !internal.skipRefresh) {
      await refreshSession();
      sentToken = useAuthStore.getState().accessToken;
      response = await send(url, options, auth);
      body = response.ok ? null : await response.clone().json().catch(() => null);
    }
    if (!response.ok) {
      if (auth && response.status === 401 && useAuthStore.getState().accessToken === sentToken && !/2fa|two.factor/i.test(body?.message || '')) useAuthStore.getState().clearAuth();
      const fallback: Record<number, string> = { 401: 'Please sign in again.', 403: 'You do not have permission for this action.', 404: 'This record no longer exists.', 409: 'The record changed. Refresh and try again.', 422: 'Check the entered information.', 429: 'Too many requests. Wait before retrying.' };
      throw new ApiError(response.status >= 500 ? 'The service is unavailable. Please retry shortly.' : body?.message || fallback[response.status] || 'Request failed.', response.status, twoFactor ? '2FA_REQUIRED' : body?.code);
    }
    // DELETE handlers legitimately return 204; consumers may still call json().
    if (response.status === 204) return Response.json(null);
    return response;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('Cannot reach the server. Check your connection and retry.', 0);
  }
}

export function refreshSession(): Promise<Session> {
  if (!refreshPromise) {
    const startingToken = useAuthStore.getState().accessToken;
    const refresh = async () => {
      const response = await request(`${API_BASE}/auth/refresh`, { method: 'POST', signal: AbortSignal.timeout(30_000) }, false);
      const session: Session = await response.json();
      if (!session.token || !session.data?.user) throw new ApiError('Please sign in again.', 401);
      if (session.data.user.role !== 'admin') throw new ApiError('Access denied: Admin role required', 403);
      return { token: session.token, user: session.data.user };
    };
    refreshPromise = sessions.refresh(refresh).then(({ token, user }) => ({ token, data: { user } }))
      .catch(error => { if (useAuthStore.getState().accessToken === startingToken) useAuthStore.getState().clearAuth(); throw error; })
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise!;
}

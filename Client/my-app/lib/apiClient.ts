import type { User } from "./types";
import { getAccessToken, useAuthStore } from "./auth-store";
import { createSessionCoordinator, withSessionLock } from "./session-sync";

export type ApiError = {
  message: string;
  status: number;
  details?: unknown;
  is2FARequired?: boolean;
};

export type ApiResponse<T> = {
  data: T | null;
  error: ApiError | null;
  status: number;
  pagination?: { page: number; limit: number; total: number };
};

type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

type RequestOptions = {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  params?: Record<string, string | number | boolean | undefined | null>;
  contentType?: "json" | "form";
  skipAuth?: boolean; // Skip adding Authorization header
  skipRefresh?: boolean; // Skip automatic token refresh on 401
  skipCsrfRetry?: boolean; // Internal one-retry bound for a rejected CSRF check
  skipSessionLock?: boolean; // Internal: already inside the cookie mutation lock
};

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// ============================================
// URL BUILDER
// ============================================

function buildUrl(path: string, params?: RequestOptions["params"]) {
  const prefixedPath = path.startsWith("/api/")
    ? path
    : `/api/v1${path.startsWith("/") ? path : `/${path}`}`;
  // Browser API traffic must share the storefront origin so Strict session/CSRF
  // cookies survive hostname changes. Next forwards /api/v1 to the backend.
  // Ignore the legacy public API base, including values baked into older builds.
  const url =
    typeof window !== "undefined"
      ? new URL(prefixedPath, window.location.origin)
      : new URL(
          `${(process.env.API_BACKEND_URL || "http://localhost:5000")
            .replace(/\/+$/, "")
            .replace(/\/api\/v1$/, "")}${prefixedPath}`,
        );
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== "")
        url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

// ============================================
// RESPONSE PARSER
// ============================================

async function parseJsonSafe(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text || null;
  }
}
// ============================================
// TOKEN REFRESH
// ============================================

let refreshPromise: Promise<string | null> | null = null;
const sessions = createSessionCoordinator<User>({
  current: () => {
    const { accessToken, user } = useAuthStore.getState();
    return accessToken && user ? { token: accessToken, user } : null;
  },
  accept: ({ token, user }) => useAuthStore.getState().setAuth(token, user),
  validUser: (user): user is User => !!user && typeof user === 'object' && 'id' in user && typeof user.id === 'string',
  clear: () => useAuthStore.getState().clearAuth(),
});
export const endSession = (endedAtMs?: number) => sessions.endSession(endedAtMs);

export function restoreSession(): Promise<string | null> {
  if (!refreshPromise) {
    const startingToken = useAuthStore.getState().accessToken;
    refreshPromise = sessions.refresh(refreshAccessToken).then(session => session.token).catch(() => {
      if (useAuthStore.getState().accessToken === startingToken) useAuthStore.getState().clearAuth();
      return null;
    }).finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise!;
}

async function refreshAccessToken(): Promise<{ token: string; user: User }> {
  const refreshBudget = AbortSignal.timeout(30_000);
  const csrfToken = await getCsrfToken(refreshBudget);
  // Call refresh endpoint - browser automatically sends HttpOnly cookie
  const res = await fetch(buildUrl("/auth/refresh"), {
    method: "POST",
    signal: refreshBudget,
    cache: "no-store",
    credentials: "include", // CRITICAL: Send HttpOnly cookie
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
    },
  });

  if (!res.ok) {
    // Refresh token expired or invalid - clear auth but DON'T redirect
    // Let the calling code decide whether to redirect
    throw new Error('Please sign in again.');
  }

  const data = await parseJsonSafe(res);
  const newToken =
    data?.data?.accessToken ||
    data?.data?.token ||
    data?.accessToken ||
    data?.token;

  if (newToken) {
    // Update Zustand store with new access token
    const currentUser = data?.data?.user ?? useAuthStore.getState().user;
    if (currentUser) {
      return { token: newToken, user: currentUser };
    }
  }

  throw new Error('The refresh response did not contain a session.');
}

// Session cookies rotate after login, verification and refresh (including other tabs).
// Always obtain a token for the current cookie binding; never cache it indefinitely.
async function getCsrfToken(signal?: AbortSignal): Promise<string | null> {
  try {
    const res = await fetch(buildUrl("/auth/csrf-token"), {
      cache: "no-store",
      method: "GET",
      signal: signal || AbortSignal.timeout(30_000),
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });
    if (!res.ok) return null;
    const data = await parseJsonSafe(res);
    return data?.data?.csrfToken || data?.csrfToken || null;
  } catch {
    return null;
  }
}

// ============================================
// MAIN API FETCH
// ============================================

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  const changesSession = options.method !== 'GET' && /\/auth\/(?:login|logout|verify-email\/[^/]+|reset-password\/[^/]+|update-password)$/.test(path);
  const logout = path.endsWith('/auth/logout');
  if (changesSession && !options.skipSessionLock) {
    const response = await withSessionLock(async () => {
      const result = await apiFetch<T>(path, { ...options, skipSessionLock: true, skipRefresh: true });
      if (logout && !result.error) sessions.endSession((result.data as { endedAtMs?: number } | null)?.endedAtMs);
      return result;
    });
    // Refresh outside the mutation lock, then reacquire it for one bounded retry.
    if (response.status === 401 && !logout && !options.skipAuth && !options.skipRefresh && !response.error?.is2FARequired) {
      if (await restoreSession()) return apiFetch<T>(path, { ...options, skipRefresh: true });
    }
    return response;
  }
  const {
    method = "GET",
    body,
    headers = {},
    signal,
    params,
    contentType = "json",
    skipAuth = false,
  } = options;

  const url = buildUrl(path, params);
  const isForm =
    contentType === "form" ||
    (typeof FormData !== "undefined" && body instanceof FormData);

  const finalHeaders: Record<string, string> = {
    Accept: "application/json",
    ...(isForm ? {} : { "Content-Type": "application/json" }),
    ...headers,
  };

  // Add Authorization header if token exists and not skipped
  if (!skipAuth) {
    const token = getAccessToken();
    if (token) {
      finalHeaders["Authorization"] = `Bearer ${token}`;
    }
  }

  if (!SAFE_METHODS.has(method)) {
    const csrfToken = await getCsrfToken();
    if (csrfToken) {
      finalHeaders["X-CSRF-Token"] = csrfToken;
    }
  }

  try {
    const res = await fetch(url, {
      method,
      credentials: "include", // Always include cookies for refresh token
      headers: finalHeaders,
      body:
        method === "GET"
          ? undefined
          : isForm
            ? (body as FormData)
            : JSON.stringify(body ?? {}),
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(30_000)])
        : AbortSignal.timeout(30_000),
      cache: "no-store",
    });

    const payload = await parseJsonSafe(res);

    // CSRF failures occur before business handlers; retry only that rejection once.
    if (
      res.status === 403 &&
      payload?.code === "CSRF_INVALID" &&
      !SAFE_METHODS.has(method) &&
      !options.skipCsrfRetry
    ) {
      return apiFetch<T>(path, { ...options, skipCsrfRetry: true });
    }

    // All callers settle on refresh failure. Never recursively refresh a refresh.
    if (
      res.status === 401 &&
      !skipAuth &&
      !options.skipRefresh &&
      !/2fa|two.factor/i.test(payload?.message || "") &&
      !new URL(url).pathname.endsWith("/auth/refresh")
    ) {
      const newToken = await restoreSession();
      if (newToken) return apiFetch<T>(path, { ...options, skipRefresh: true });
    }

    // Handle 403 Forbidden - check if it's email verification issue
    if (res.status === 403) {
      const errorMessage = payload?.message || payload?.error || "";
      if (
        errorMessage.toLowerCase().includes("email") &&
        errorMessage.toLowerCase().includes("verif")
      ) {
        // Redirect to email verification page
        if (
          typeof window !== "undefined" &&
          !window.location.pathname.includes("/verify-email")
        ) {
          window.location.href = "/verify-email";
        }
      }
    }

    if (!res.ok && res.status !== 304) {
      const error: ApiError = {
        message:
          (res.status >= 500
            ? "The service is unavailable. Please try again shortly."
            : null) ||
          (payload && (payload.message || payload.error)) ||
          `Request failed with ${res.status}`,
        status: res.status,
        details: payload,
        is2FARequired:
          res.status === 401 &&
          (res.headers.get("x-2fa-required") === "true" ||
            /2fa|two.factor/i.test(payload?.message || "")),
      };
      return { data: null, error, status: res.status };
    }

    // Unwrap backend response format: { success: true, data: {...} }
    // Backend returns data in payload.data, so we extract it
    let responseData = payload?.data !== undefined ? payload.data : payload;

    // CRITICAL FIX: If the backend returns token at the top level but user data inside data object,
    // we need to preserve the token by merging it into responseData
    if (
      payload &&
      typeof payload === "object" &&
      typeof responseData === "object" &&
      responseData !== null
    ) {
      if (payload.token && !responseData.token) {
        responseData = { ...responseData, token: payload.token };
      }
      if (payload.accessToken && !responseData.accessToken) {
        responseData = { ...responseData, accessToken: payload.accessToken };
      }
    }

    if (responseData?.token && responseData?.user) {
      useAuthStore.getState().setAuth(responseData.token, responseData.user);
      sessions.announce({ token: responseData.token, user: responseData.user });
    }
    return {
      data: responseData as T,
      error: null,
      status: res.status,
      ...(typeof payload?.total === "number" ||
      typeof payload?.count === "number"
        ? {
            pagination: {
              page: payload.page ?? 1,
              limit: payload.limit ?? 20,
              total: payload.total ?? payload.count,
            },
          }
        : {}),
    };
  } catch (e: unknown) {
    const error: ApiError = {
      message:
        e !== null &&
        (typeof e === "object" || typeof e === "function") &&
        "name" in e &&
        e.name === "TimeoutError"
          ? "The request timed out. Please retry."
          : "Unable to connect to the server. Please check your connection and retry.",
      status: 0,
      details: e,
    };
    return { data: null, error, status: 0 };
  }
}

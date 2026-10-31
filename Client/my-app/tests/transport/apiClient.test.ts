import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  token: "access-old" as string | null,
  get accessToken() { return this.token; },
  clearAuth: vi.fn(),
  setAuth: vi.fn(),
  user: { id: "user-1" },
}));
vi.mock("@/lib/auth-store", () => ({
  getAccessToken: () => state.token,
  useAuthStore: { getState: () => state },
}));
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });
let apiFetch: typeof import("@/lib/apiClient").apiFetch;
beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();
  state.token = "access-old";
  state.user = { id: "user-1" };
  state.setAuth.mockImplementation((token: string, user: { id: string }) => {
    state.token = token;
    state.user = user;
  });
  state.clearAuth.mockImplementation(() => { state.token = null; });
  ({ apiFetch } = await import("@/lib/apiClient"));
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("same-origin storefront transport", () => {
  it.each(["http://127.0.0.1:3001", "http://localhost:3001"])(
    "keeps CSRF bootstrap, sign-in and session restoration on %s despite a legacy direct API base",
    async (origin) => {
      vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://localhost:5000/api/v1/");
      vi.stubEnv("API_BACKEND_URL", "http://backend.internal:5000");
      vi.stubGlobal("window", { location: { origin, pathname: "/login" } });
      const calls: Array<{ url: string; init: RequestInit }> = [];
      let binding = "anonymous-current";
      vi.stubGlobal(
        "fetch",
        vi.fn(async (url: string, init: RequestInit = {}) => {
          calls.push({ url, init });
          if (url.endsWith("/csrf-token"))
            return json({ data: { csrfToken: binding } });
          const token = (init.headers as Record<string, string>)[
            "X-CSRF-Token"
          ];
          if (token !== binding)
            return json(
              { code: "CSRF_INVALID", message: "Invalid CSRF token" },
              403,
            );
          if (url.endsWith("/login")) {
            binding = "logged-in-current";
            return json({ token: "login-access", data: { user: state.user } });
          }
          if (url.endsWith("/refresh"))
            return json({
              token: "restored-access",
              data: { user: state.user },
            });
          throw new Error("Unexpected request");
        }),
      );
      const { AuthService } = await import("@/services/auth-service");
      expect(
        (
          await AuthService.login({
            email: "player@example.test",
            password: "fixture-password",
          })
        ).status,
      ).toBe(200);
      const { restoreSession } = await import("@/lib/apiClient");
      expect(await restoreSession()).toBe("restored-access");
      expect(calls.map((call) => call.url)).toEqual([
        `${origin}/api/v1/auth/csrf-token`,
        `${origin}/api/v1/auth/login`,
        `${origin}/api/v1/auth/csrf-token`,
        `${origin}/api/v1/auth/refresh`,
      ]);
      expect(calls.every((call) => call.init.credentials === "include")).toBe(
        true,
      );
      expect(calls[1].init.headers).toMatchObject({
        "X-CSRF-Token": "anonymous-current",
      });
      expect(calls[3].init.headers).toMatchObject({
        "X-CSRF-Token": "logged-in-current",
      });
      expect(calls[1].init.headers).not.toHaveProperty("Authorization");
      expect(calls[3].init.headers).not.toHaveProperty("Authorization");
      expect(state.setAuth).toHaveBeenLastCalledWith(
        "restored-access",
        state.user,
      );
      expect(state.clearAuth).not.toHaveBeenCalled();
    },
  );

  it("uses the deployed HTTPS storefront origin and preserves encoded query parameters", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_API_BASE_URL",
      "https://legacy-api.example.test/api/v1",
    );
    vi.stubEnv("API_BACKEND_URL", "http://backend.internal:5000");
    vi.stubGlobal("window", {
      location: { origin: "https://store.example.test", pathname: "/products" },
    });
    const fetcher = vi.fn(async (_url: string, _init: RequestInit = {}) =>
      json({ data: [] }),
    );
    vi.stubGlobal("fetch", fetcher);
    await apiFetch("/products/search", {
      skipAuth: true,
      params: {
        q: "GPU & cooling",
        page: 2,
        inStock: false,
        ignored: undefined,
        empty: "",
      },
    });
    expect(fetcher).toHaveBeenCalledOnce();
    const [url, options] = fetcher.mock.calls[0];
    const parsed = new URL(url);
    expect(parsed.origin).toBe("https://store.example.test");
    expect(parsed.pathname).toBe("/api/v1/products/search");
    expect(Object.fromEntries(parsed.searchParams)).toEqual({
      q: "GPU & cooling",
      page: "2",
      inStock: "false",
    });
    expect(options).toMatchObject({ credentials: "include" });
    expect(options?.headers).not.toHaveProperty("Authorization");
  });

  it("uses the normalized server-only backend for server-side calls with an already-prefixed API path", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_API_BASE_URL",
      "https://ignored-public.example.test",
    );
    vi.stubEnv("API_BACKEND_URL", "https://backend.example.test/api/v1///");
    const fetcher = vi.fn(async (_url: string, _init: RequestInit = {}) =>
      json({ data: [] }),
    );
    vi.stubGlobal("fetch", fetcher);
    await apiFetch("/api/v1/products", {
      skipAuth: true,
      params: { category: "Cases / Cooling", limit: 0 },
    });
    const [url] = fetcher.mock.calls[0];
    const parsed = new URL(url);
    expect(parsed.origin).toBe("https://backend.example.test");
    expect(parsed.pathname).toBe("/api/v1/products");
    expect(Object.fromEntries(parsed.searchParams)).toEqual({
      category: "Cases / Cooling",
      limit: "0",
    });
  });

  it("defaults server-side API reads to the Express backend instead of the Next page origin", async () => {
    vi.stubEnv("API_BACKEND_URL", "");
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://wrong-host.example.test");
    const fetcher = vi.fn(async (_url: string, _init: RequestInit = {}) =>
      json({ status: "ok" }),
    );
    vi.stubGlobal("fetch", fetcher);
    await apiFetch("health", { skipAuth: true });
    expect(fetcher.mock.calls[0][0]).toBe(
      "http://localhost:5000/api/v1/health",
    );
  });
});

describe("session rotation and CSRF", () => {
  it.each([409,503])('preserves the session when logout fails with %s',async status=>{
    vi.stubGlobal('fetch',vi.fn(async(url:string)=>url.endsWith('/csrf-token')?json({data:{csrfToken:'current'}}):json({message:'Logout not completed'},status)));
    const result=await apiFetch('/auth/logout',{method:'POST'});
    expect(result.status).toBe(status);
    expect(state.token).toBe('access-old');
    expect(state.clearAuth).not.toHaveBeenCalled();
  });
  it('keeps a newer login when an older refresh rejects after logout',async()=>{
    vi.stubGlobal('navigator',{});
    let started!:()=>void, finish!:(response:Response)=>void;
    const pending=new Promise<void>(resolve=>{started=resolve;});
    vi.stubGlobal('fetch',vi.fn(async(url:string)=>{
      if(url.endsWith('/csrf-token'))return json({data:{csrfToken:'current'}});
      if(url.endsWith('/refresh')){started();return new Promise<Response>(resolve=>{finish=resolve;});}
      return json({token:'newer-login',data:{user:{id:'new-user'}}});
    }));
    const {restoreSession,endSession}=await import('@/lib/apiClient');
    const restoring=restoreSession();
    await pending;
    endSession();
    await apiFetch('/auth/login',{method:'POST',skipAuth:true,skipRefresh:true});
    state.clearAuth.mockClear();
    finish(json({message:'Session ended'},401));
    expect(await restoring).toBeNull();
    expect(state.token).toBe('newer-login');
    expect(state.clearAuth).not.toHaveBeenCalled();
  });
  it("uses fresh CSRF after silent refresh and email verification, including login with skipAuth", async () => {
    let binding = "session-1";
    let csrfGets = 0;
    const headers: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: RequestInit = {}) => {
        if (url.endsWith("/csrf-token")) {
          csrfGets++;
          return json({ data: { csrfToken: binding } });
        }
        if (url.includes("/verify-email/")) {
          binding = "verified-session";
          return json({ data: {} });
        }
        const token = (init.headers as Record<string, string>)["X-CSRF-Token"];
        headers.push(token);
        if (token !== binding) return json({ code: "CSRF_INVALID" }, 403);
        if (url.endsWith("/refresh")) binding = "session-2";
        return json({ token: "access-new", data: { user: state.user } });
      }),
    );
    expect(
      (
        await apiFetch("/auth/refresh", {
          method: "POST",
          skipAuth: true,
          skipRefresh: true,
        })
      ).status,
    ).toBe(200);
    expect(
      (await apiFetch("/auth/login", { method: "POST", skipAuth: true }))
        .status,
    ).toBe(200);
    await apiFetch("/auth/verify-email/fixture");
    expect(
      (await apiFetch("/auth/login", { method: "POST", skipAuth: true }))
        .status,
    ).toBe(200);
    expect(headers).toEqual(["session-1", "session-2", "verified-session"]);
    expect(csrfGets).toBe(3);
  });

  it("retries a CSRF rejection once to handle another tab rotating cookies", async () => {
    let mutationCalls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.endsWith("/csrf-token"))
          return json({ data: { csrfToken: "current" } });
        mutationCalls++;
        return mutationCalls === 1
          ? json({ code: "CSRF_INVALID", message: "Invalid CSRF token" }, 403)
          : json({ data: "ok" });
      }),
    );
    expect(
      (await apiFetch("/auth/login", { method: "POST", skipAuth: true })).data,
    ).toBe("ok");
    expect(mutationCalls).toBe(2);
  });

  it("bounds CSRF retry and never retries unrelated 403 responses", async () => {
    let calls = 0;
    let code = "CSRF_INVALID";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.endsWith("/csrf-token"))
          return json({ data: { csrfToken: "current" } });
        calls++;
        return json({ code, message: "Forbidden" }, 403);
      }),
    );
    expect((await apiFetch("/cart", { method: "POST" })).status).toBe(403);
    expect(calls).toBe(2);
    code = "OTHER";
    calls = 0;
    expect((await apiFetch("/cart", { method: "POST" })).status).toBe(403);
    expect(calls).toBe(1);
  });

  it("settles simultaneous callers when refresh fails", async () => {
    let refreshCalls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.endsWith("/csrf-token"))
          return json({ data: { csrfToken: "current" } });
        if (url.endsWith("/refresh")) {
          refreshCalls++;
          await new Promise((resolve) => setTimeout(resolve, 20));
        }
        return json({ message: "Unauthorized" }, 401);
      }),
    );
    const results = await Promise.all([
      apiFetch("/users/me"),
      apiFetch("/cart"),
    ]);
    expect(results.map((result) => result.status)).toEqual([401, 401]);
    expect(refreshCalls).toBe(1);
  });

  it("refreshes once, uses the new token and CSRF, and stops if retry is still unauthorized", async () => {
    let refreshCalls = 0;
    let csrf = "before";
    const seen: unknown[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: RequestInit = {}) => {
        if (url.endsWith("/csrf-token"))
          return json({ data: { csrfToken: csrf } });
        if (url.endsWith("/refresh")) {
          refreshCalls++;
          csrf = "after";
          return json({ token: "access-new" });
        }
        seen.push(init.headers);
        return json({ message: "Unauthorized" }, 401);
      }),
    );
    expect((await apiFetch("/cart", { method: "POST" })).status).toBe(401);
    expect(refreshCalls).toBe(1);
    expect(seen[1]).toMatchObject({
      Authorization: "Bearer access-new",
      "X-CSRF-Token": "after",
    });
  });

  it("honors skipRefresh and does not refresh the refresh endpoint recursively", async () => {
    const fetcher = vi.fn(async (url: string) =>
      url.endsWith("/csrf-token")
        ? json({ data: { csrfToken: "current" } })
        : json({ message: "Unauthorized" }, 401),
    );
    vi.stubGlobal("fetch", fetcher);
    expect((await apiFetch("/users/me", { skipRefresh: true })).status).toBe(
      401,
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect((await apiFetch("/auth/refresh", { method: "POST" })).status).toBe(
      401,
    );
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
});

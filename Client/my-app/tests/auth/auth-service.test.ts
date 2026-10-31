import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({token:'stale-token',user:null,setAuth:vi.fn(),clearAuth:vi.fn()}));
vi.mock('@/lib/auth-store',()=>({getAccessToken:()=>state.token,useAuthStore:{getState:()=>state}}));
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body),{status});
beforeEach(()=>{vi.resetModules();vi.clearAllMocks();});
afterEach(()=>vi.unstubAllGlobals());

describe('signed-out verification transport',()=>{
  it('preserves the session when server logout revocation fails',async()=>{
    vi.stubGlobal('fetch',vi.fn(async(url:string)=>url.endsWith('/csrf-token')?json({data:{csrfToken:'csrf'}}):json({message:'Unavailable'},503)));
    const {AuthService}=await import('@/services/auth-service');
    expect((await AuthService.logout()).error?.status).toBe(503);
    expect(state.clearAuth).not.toHaveBeenCalled();
  });
  it('sends password proof and CSRF without a bearer token or auth refresh retry',async()=>{
    const calls: Array<{url:string;init:RequestInit}> = [];
    vi.stubGlobal('fetch',vi.fn(async(url:string,init:RequestInit={})=>{
      calls.push({url,init});
      return url.endsWith('/csrf-token') ? json({data:{csrfToken:'csrf-bound'}}) : json({message:'Incorrect email or password'},401);
    }));
    const {AuthService}=await import('@/services/auth-service');
    const result=await AuthService.resendVerification({email:'user@example.test',password:'TestPassword123!'});
    expect(result.error?.status).toBe(401);
    expect(calls).toHaveLength(2);
    const request=calls[1];
    expect(request.url).toMatch(/\/auth\/resend-verification$/);
    expect(request.init.headers).toMatchObject({'X-CSRF-Token':'csrf-bound'});
    expect(request.init.headers).not.toHaveProperty('Authorization');
    expect(JSON.parse(request.init.body as string)).toEqual({email:'user@example.test',password:'TestPassword123!'});
    expect(state.setAuth).not.toHaveBeenCalled();
  });
  it('normalizes a verified session with its user instead of storing an orphan token',async()=>{
    const user={id:'verified-user',isEmailVerified:true};
    const fetch=vi.fn(async(url: string, _init?: RequestInit)=>url.endsWith('/csrf-token') ? json({data:{csrfToken:'confirmation-csrf'}}) : json({token:'verified-access',data:{user}}));
    vi.stubGlobal('fetch',fetch);
    const {AuthService}=await import('@/services/auth-service');
    const result=await AuthService.verifyEmail('one-use-token');
    expect(result.data).toMatchObject({token:'verified-access',user});
    expect(state.setAuth).toHaveBeenCalledWith('verified-access',user);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[1][1]).toMatchObject({method:'POST',headers:{'X-CSRF-Token':'confirmation-csrf'}});
  });
});

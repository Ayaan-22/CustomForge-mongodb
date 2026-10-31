import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSessionCoordinator } from '@/lib/session-sync';

type User = { id: string };
type Session = { token: string; user: User };
class Channel {
  static open: Channel[] = [];
  onmessage: ((event: { data: unknown }) => void) | null = null;
  constructor(readonly name: string) { Channel.open.push(this); }
  postMessage(data: unknown) {
    for (const peer of Channel.open) if (peer !== this && peer.name === this.name) queueMicrotask(() => peer.onmessage?.({ data }));
  }
}
function tab() {
  let session: Session | null = null;
  const clear = vi.fn(() => { session = null; });
  const coordinator = createSessionCoordinator<User>({
    current: () => session,
    accept: value => { session = value; },
    clear,
    validUser: (value): value is User => !!value && typeof value === 'object' && 'id' in value,
  });
  return { coordinator, clear, current: () => session };
}
const freshSession = (userId='customer',issuedAtMs=Date.now()): Session => ({token:`header.${btoa(JSON.stringify({exp:Math.floor(Date.now()/1000)+900,userId,issuedAtMs,tokenUse:'access'}))}.signature`,user:{id:userId}});

beforeEach(() => {
  Channel.open = [];
  vi.stubGlobal('window', {});
  vi.stubGlobal('BroadcastChannel', Channel);
  let tail: Promise<unknown> = Promise.resolve();
  vi.stubGlobal('navigator', { locks: { request: (_name: string, work: () => Promise<Session>) => {
    const request = tail.then(work);
    tail = request.catch(() => {});
    return request;
  } } });
});
afterEach(() => vi.unstubAllGlobals());

describe('same-origin session coordination', () => {
  it('rotates once for two separate tabs queued on a browser lock', async () => {
    const first = tab(), second = tab();
    const refresh = vi.fn(async () => freshSession());
    const results = await Promise.all([first.coordinator.refresh(refresh),second.coordinator.refresh(refresh)]);
    expect(refresh).toHaveBeenCalledOnce();
    expect(results[0]).toEqual(results[1]);
    expect(second.current()).toEqual(first.current());
  });
  it('restores a newly opened tab from a peer without rotating again', async () => {
    const first = tab(), second = tab();
    const refresh = vi.fn(async () => freshSession());
    await first.coordinator.refresh(refresh);
    await second.coordinator.refresh(refresh);
    expect(refresh).toHaveBeenCalledOnce();
    expect(second.current()).toEqual(first.current());
  });
  it('recovers a server rotation race using the winning tab when Web Locks are unavailable', async () => {
    vi.stubGlobal('navigator', {});
    const first = tab(), second = tab();
    const winner = async () => { await new Promise(resolve => setTimeout(resolve, 200)); return freshSession(); };
    const loser = async () => { throw new Error('Refresh cookie already rotated'); };
    const results = await Promise.all([first.coordinator.refresh(winner),second.coordinator.refresh(loser)]);
    expect(results[0]).toEqual(results[1]);
    expect(second.clear).not.toHaveBeenCalled();
  });
  it('does not restore an in-flight session after another tab logs out', async () => {
    const current = tab();
    let started!: () => void, finish!: (session: Session) => void;
    const refreshing = new Promise<void>(resolve => { started = resolve; });
    const request = current.coordinator.refresh(() => { started(); return new Promise(resolve => { finish = resolve; }); });
    await refreshing;
    new Channel('customforge-session').postMessage({type:'logout',endedAtMs:Date.now()});
    await Promise.resolve();
    finish(freshSession());
    await expect(request).rejects.toThrow('Session ended');
    expect(current.current()).toBeNull();
  });
  it('falls back when Web Locks are blocked and when browser coordination is absent', async () => {
    vi.stubGlobal('navigator', {locks:{request:async () => {throw new DOMException('Blocked','SecurityError');}}});
    vi.stubGlobal('BroadcastChannel', undefined);
    const current = tab();
    const refresh = vi.fn(async () => freshSession());
    await current.coordinator.refresh(refresh);
    expect(refresh).toHaveBeenCalledOnce();
    expect(current.current()).toEqual(await refresh.mock.results[0].value);
  });
  it('ignores a delayed session broadcast after the tab has logged out', async () => {
    const current=tab();
    await current.coordinator.refresh(async()=>freshSession());
    const peer=new Channel('customforge-session');
    peer.postMessage({type:'logout',endedAtMs:Date.now(),endedToken:current.current()?.token});
    await Promise.resolve();
    peer.postMessage({type:'session-result',session:freshSession()});
    await Promise.resolve();
    expect(current.current()).toBeNull();
  });
  it('keeps a successful refresh usable when BroadcastChannel fails to send',async()=>{
    vi.stubGlobal('BroadcastChannel',class extends Channel {postMessage(){throw new DOMException('Blocked','SecurityError');}});
    const current=tab(), session=freshSession();
    await expect(current.coordinator.refresh(async()=>session)).resolves.toEqual(session);
    expect(current.current()).toEqual(session);
  });
  it('does not replace a newer login with an older account broadcast',async()=>{
    const current=tab(), newer=freshSession('new-account',Date.now()+10);
    await current.coordinator.refresh(async()=>newer);
    new Channel('customforge-session').postMessage({type:'session-result',session:freshSession('old-account',Date.now()-1000)});
    await Promise.resolve();
    expect(current.current()).toEqual(newer);
  });
  it('clears other tabs only for an explicit successful logout',async()=>{
    const first=tab(),second=tab();
    await first.coordinator.refresh(async()=>freshSession());
    await second.coordinator.refresh(async()=>freshSession());
    first.clear(); // A local transport failure never emits a logout event.
    await Promise.resolve();
    expect(second.current()).not.toBeNull();
    first.coordinator.endSession();
    await Promise.resolve();
    expect(second.current()).toBeNull();
  });
  it('ignores a delayed logout that completed before a newer login',async()=>{
    const current=tab(), issuedAt=Date.now(), newer=freshSession('new-account',issuedAt+1000);
    await current.coordinator.refresh(async()=>newer);
    new Channel('customforge-session').postMessage({type:'logout',endedAtMs:issuedAt+1,endedToken:freshSession('old-account',issuedAt-1000).token});
    await Promise.resolve();
    expect(current.current()).toEqual(newer);
    expect(current.clear).not.toHaveBeenCalled();
  });
  it('rejects the ended token even when its issue time matches the logout cutoff',async()=>{
    vi.stubGlobal('navigator',{});
    const current=tab(), issuedAt=Date.now(), ended=freshSession('customer',issuedAt);
    await current.coordinator.refresh(async()=>ended);
    current.coordinator.endSession(issuedAt);
    let started!:()=>void,finish!:(session:Session)=>void;
    const pending=new Promise<void>(resolve=>{started=resolve;});
    const request=current.coordinator.refresh(()=>{started();return new Promise(resolve=>{finish=resolve;});});
    await pending;
    new Channel('customforge-session').postMessage({type:'session-result',session:ended});
    await Promise.resolve();
    expect(current.current()).toBeNull();
    const newer=freshSession('customer',issuedAt+1);
    finish(newer);
    await expect(request).resolves.toEqual(newer);
  });
  it('keeps the latest logout cutoff when an older logout arrives later',async()=>{
    vi.stubGlobal('navigator',{});
    const current=tab(), issuedAt=Date.now();
    await current.coordinator.refresh(async()=>freshSession('customer',issuedAt));
    current.coordinator.endSession(issuedAt+100);
    current.coordinator.endSession(issuedAt+1);
    let started!:()=>void,finish!:(session:Session)=>void;
    const pending=new Promise<void>(resolve=>{started=resolve;});
    const request=current.coordinator.refresh(()=>{started();return new Promise(resolve=>{finish=resolve;});});
    await pending;
    new Channel('customforge-session').postMessage({type:'session-result',session:freshSession('customer',issuedAt+50)});
    await Promise.resolve();
    expect(current.current()).toBeNull();
    const newer=freshSession('customer',issuedAt+101);
    finish(newer);
    await expect(request).resolves.toEqual(newer);
  });
});

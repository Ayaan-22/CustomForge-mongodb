/** Coordinates cookie rotation across same-origin tabs without persisting tokens. */
export async function withSessionLock<T>(work: () => Promise<T>): Promise<T> {
  if (typeof navigator === 'undefined' || !navigator.locks) return work();
  let entered = false;
  try { return await navigator.locks.request('customforge-refresh', () => { entered = true; return work(); }); }
  catch (error) {
    if (!entered && error instanceof DOMException && (error.name === 'SecurityError' || error.name === 'NotSupportedError')) return work();
    throw error;
  }
}

export function createSessionCoordinator<User extends { id: string }>(options: {
  current: () => { token: string; user: User } | null;
  accept: (session: { token: string; user: User }) => void;
  validUser: (user: unknown) => user is User;
  clear: () => void;
}) {
  type Session = { token: string; user: User };
  let channel: BroadcastChannel | null = null;
  let version = 0;
  let logoutVersion = 0;
  let endedAtMs = -Infinity;
  const endedTokens = new Set<string>();
  const waiting = new Map<string, (session: Session | null) => void>();
  const peerRefreshes = new Map<string, number>();
  const activeRefreshes = new Map<symbol, number>();

  const claims = (session: Session | null) => {
    try { return JSON.parse(atob(session!.token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); }
    catch { return null; }
  };
  const fresh = (session: Session | null): session is Session => {
    if (!session || !options.validUser(session.user)) return false;
    const identity = claims(session);
    return identity?.tokenUse === 'access' && identity.userId === session.user.id && Number.isFinite(identity.issuedAtMs) &&
      identity.issuedAtMs >= endedAtMs && !endedTokens.has(session.token) &&
      typeof identity.exp === 'number' && identity.exp * 1000 > Date.now() + 10_000;
  };
  const connect = () => {
    if (channel || typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return channel;
    try {
      channel = new BroadcastChannel('customforge-session');
      // Node's browser test implementation should not keep the test process alive.
      (channel as BroadcastChannel & { unref?: () => void }).unref?.();
      channel.onmessage = ({ data }) => {
        if (data?.type === 'logout' && Number.isFinite(data.endedAtMs)) {
          const current = options.current();
          endedAtMs = Math.max(endedAtMs, data.endedAtMs);
          if (typeof data.endedToken === 'string') endedTokens.add(data.endedToken);
          // Broadcast delivery can lag behind a later login. Keep the session
          // issued after the server completed this logout.
          if (current && current.token !== data.endedToken &&
              (claims(current)?.issuedAtMs > data.endedAtMs ||
               (typeof data.endedToken === 'string' && claims(current)?.issuedAtMs === data.endedAtMs))) return;
          logoutVersion++;
          options.clear();
          for (const resolve of waiting.values()) resolve(null);
          return;
        }
        if (data?.type === 'refresh-start' && typeof data.refreshId === 'string' && typeof data.expires === 'number') {
          peerRefreshes.set(data.refreshId, Math.min(data.expires, Date.now() + 31_000));
        } else if (data?.type === 'refresh-end') {
          peerRefreshes.delete(data.refreshId);
          if (!peerRefreshes.size) for (const resolve of waiting.values()) resolve(null);
        } else if (data?.type === 'session-request') {
          const session = options.current();
          if (fresh(session) && session.token !== data.rejectedToken) {
            send({ type: 'session-result', requestId: data.requestId, session });
          }
        } else if (data?.type === 'session-result' && fresh(data.session)) {
          if (claims(data.session).issuedAtMs < endedAtMs) return;
          // A targeted reply belongs only to its requester; refresh broadcasts reach all tabs.
          if (data.requestId && !waiting.has(data.requestId)) return;
          if (!data.requestId && !options.current() && !Array.from(activeRefreshes.values()).includes(logoutVersion)) return;
          const current = options.current();
          if (current && current.token !== data.session.token &&
              claims(current)?.issuedAtMs >= claims(data.session).issuedAtMs) return;
          options.accept(data.session);
          version++;
          if (data.requestId) waiting.get(data.requestId)?.(data.session);
          else for (const resolve of waiting.values()) resolve(data.session);
        }
      };
    } catch { channel = null; }
    return channel;
  };
  const send = (message: unknown) => {
    try { connect()?.postMessage(message); }
    catch {
      try { channel?.close(); } catch { /* Coordination is optional. */ }
      channel = null;
    }
  };
  const askPeers = (rejectedToken: string | null, waitForRotation = false): Promise<Session | null> => {
    if (!connect()) return Promise.resolve(null);
    const requestId = crypto.randomUUID();
    return new Promise(resolve => {
      const remaining = Math.max(100, ...Array.from(peerRefreshes.values(), expires => expires - Date.now()));
      const timeout = setTimeout(() => finish(null), waitForRotation ? remaining : 100);
      const finish = (session: Session | null) => {
        clearTimeout(timeout);
        waiting.delete(requestId);
        resolve(session);
      };
      waiting.set(requestId, finish);
      send({ type: 'session-request', requestId, rejectedToken });
    });
  };
  const announce = (session: Session) => {
    version++;
    send({ type: 'session-result', session });
  };

  return {
    announce,
    endSession(serverEndedAtMs?: number) {
      const current = options.current();
      endedAtMs = Math.max(endedAtMs, Number.isFinite(serverEndedAtMs) ? serverEndedAtMs! : Math.max(Date.now(), claims(current)?.issuedAtMs ?? 0));
      if (current) endedTokens.add(current.token);
      logoutVersion++;
      options.clear();
      for (const resolve of waiting.values()) resolve(null);
      send({ type: 'logout', endedAtMs, endedToken: current?.token });
    },
    async refresh(fetchSession: () => Promise<Session>): Promise<Session> {
      connect();
      const rejectedToken = options.current()?.token ?? null;
      const startingVersion = version;
      const startingLogout = logoutVersion;
      const activeRefresh = Symbol();
      activeRefreshes.set(activeRefresh, startingLogout);
      const changed = () => {
        const session = options.current();
        return version !== startingVersion && fresh(session) ? session : null;
      };
      const refresh = async () => {
        if (logoutVersion !== startingLogout) throw new Error('Session ended in another tab.');
        const shared = changed() || await askPeers(rejectedToken);
        if (logoutVersion !== startingLogout) throw new Error('Session ended in another tab.');
        if (shared) return shared;
        const refreshId = crypto.randomUUID();
        send({ type: 'refresh-start', refreshId, expires: Date.now() + 31_000 });
        let session: Session;
        try { session = await fetchSession(); }
        catch (error) {
          send({ type: 'refresh-end', refreshId });
          // With no Web Locks, another tab may win the server's rotation race.
          const recovered = changed() || await askPeers(rejectedToken, true);
          if (recovered && logoutVersion === startingLogout) return recovered;
          throw error;
        }
        if (logoutVersion !== startingLogout) {
          send({ type: 'refresh-end', refreshId });
          throw new Error('Session ended in another tab.');
        }
        const current = options.current();
        if (version !== startingVersion && current &&
            (current.user.id !== session.user.id || claims(current)?.issuedAtMs > claims(session)?.issuedAtMs)) {
          send({ type: 'refresh-end', refreshId });
          return current;
        }
        options.accept(session);
        announce(session);
        send({ type: 'refresh-end', refreshId });
        return session;
      };
      try { return await withSessionLock(refresh); }
      finally { activeRefreshes.delete(activeRefresh); }
    },
  };
}

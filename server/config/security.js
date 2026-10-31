// Validate configuration before serving traffic. Never include secret values in errors.
export const validateSecurityConfiguration = (env = process.env) => {
  if (env.NODE_TLS_REJECT_UNAUTHORIZED === "0") {
    throw new Error("TLS certificate verification must be enabled. Remove NODE_TLS_REJECT_UNAUTHORIZED=0 from the server environment.");
  }
  if (env.NODE_ENV === "production") {
    if (!env.JWT_SECRET || env.JWT_SECRET.length < 32) throw new Error("JWT_SECRET must contain at least 32 characters in production");
    if (!env.CSRF_SECRET?.trim()) throw new Error("CSRF_SECRET must be set in production");
    if (env.CSRF_SECRET.length < 32) throw new Error("CSRF_SECRET must contain at least 32 characters in production");
    if (env.CSRF_SECRET === env.JWT_SECRET) throw new Error("CSRF_SECRET must be distinct from JWT_SECRET in production");
    for (const field of ["CLIENT_URL", "ADMIN_URL"]) {
      let url;
      try { url = new URL(env[field]); } catch { throw new Error(`${field} must specify an HTTPS origin in production`); }
      if (url.protocol !== "https:" || url.origin !== env[field] || url.username || url.password) throw new Error(`${field} must specify an exact HTTPS origin in production`);
    }
  }
};

export const getTrustProxy = (value = process.env.TRUST_PROXY) => {
  if (value === undefined || value === "") return 1;
  if (value === "false") return false;
  if (/^\d+$/.test(value)) return Number(value);
  // Express validates the address/subnet list when app.set is called.
  if (value === "true") throw new Error("TRUST_PROXY must specify trusted hops or addresses, not trust every proxy");
  return value.split(",").map(entry => entry.trim()).filter(Boolean);
};

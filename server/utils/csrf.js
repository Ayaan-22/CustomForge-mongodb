import crypto from "crypto";

const getCsrfSecret = () => {
  const secret = process.env.CSRF_SECRET;
  if (process.env.NODE_ENV === "production" && (!secret?.trim() || secret === process.env.JWT_SECRET)) {
    throw new Error("A distinct CSRF_SECRET is required in production");
  }
  return secret || process.env.JWT_SECRET || "csrf-dev-secret";
};

export const buildCsrfToken = (binding) =>
  crypto.createHmac("sha256", getCsrfSecret()).update(String(binding)).digest("hex");

export const getCsrfBindingFromRequest = (req) => {
  if (req.cookies?.refresh_token) return `refresh:${req.cookies.refresh_token}`;
  if (req.cookies?.anon_session) return `anon:${req.cookies.anon_session}`;
  return null;
};


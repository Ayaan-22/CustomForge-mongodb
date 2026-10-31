import AppError from "../utils/appError.js";
import { buildCsrfToken, getCsrfBindingFromRequest } from "../utils/csrf.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export const csrfProtection = (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();

  const cookieToken = req.cookies?.csrf_token;
  const headerToken = req.headers["x-csrf-token"];
  const binding = getCsrfBindingFromRequest(req);
  const expectedToken = binding ? buildCsrfToken(binding) : null;

  if (
    !cookieToken ||
    !headerToken ||
    !expectedToken ||
    cookieToken !== headerToken ||
    cookieToken !== expectedToken
  ) {
    return next(new AppError("Invalid CSRF token", 403, null, true, "CSRF_INVALID"));
  }

  return next();
};


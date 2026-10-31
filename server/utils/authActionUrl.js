// Mail links target the frontend forms that call /api/v1/auth. Never trust Host.
export const authActionUrl = (action, token) => {
  const clientUrl = process.env.CLIENT_URL ||
    (["development", "test"].includes(process.env.NODE_ENV) ? "http://localhost:3000" : null);
  if (!clientUrl) throw new Error("CLIENT_URL is required for authentication email links");
  return new URL(`/${action}/${encodeURIComponent(token)}`, clientUrl).toString();
};

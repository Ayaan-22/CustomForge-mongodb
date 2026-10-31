# CustomForge customer storefront

The storefront uses the Express API documented in ../docs/api/route-security-map.md. Browser requests always use the storefront's own origin and `/api/v1`; Next.js forwards them to `API_BACKEND_URL` (default `http://localhost:5000`). Server-side service calls use that same server-only backend setting directly. Configure it when deploying. A trailing `/api/v1` suffix is normalized, so either the backend origin or its API base is accepted. There is no local API or production mock fallback.

The legacy `NEXT_PUBLIC_API_BASE_URL` is ignored by the shared transport. Calling `localhost` directly from a storefront opened at `127.0.0.1` creates a different browser site and withholds `SameSite=Strict` session/CSRF cookies, even with credentials enabled. Keep the Next API rewrite available on the deployed storefront and preserve the existing cookie and CSRF protections; do not switch cookies to a weaker policy to accommodate direct cross-site API calls. API origin allowlists still apply on the Express side.

Public product, category, brand, game, prebuilt and approved-review reads do not require login. Customer mutations use the in-memory bearer token, HttpOnly rotating refresh cookie and a fresh CSRF token. Guest cart and wishlist identifiers are the only persisted customer state. No access or refresh tokens are stored in browser storage.

Services define API contracts; hooks use TanStack Query. Zustand holds session and guest state. Express and the database remain authoritative for prices, inventory, coupons and payment state.

Run npm test, npm run lint, npm run typecheck and npm run build. Run the backend separately for integration testing. See the [root README](../README.md) for setup, payment limitations and maintained checks.

Automated storefront tests are grouped by feature in `tests/`, separate from application routes and modules. The [test guide](tests/README.md) documents the layout, mock boundaries and commands. To run one suite from the repository root, use `npm --prefix client test -- tests/transport/apiClient.test.ts`.

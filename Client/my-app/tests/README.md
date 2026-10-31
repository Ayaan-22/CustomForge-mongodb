# Storefront tests

Maintained automated regression tests live here, grouped by feature. Application code remains in `app/`, `components/`, `lib/` and `services/`; tests import it through the existing `@/` alias rooted at `client/`.

| Folder | Coverage |
| --- | --- |
| `account/` | Profile drafts and user-service contracts. |
| `addresses/` | Address forms and required shipping fields. |
| `auth/` | Sign-in/registration entry, recovery pages, verification, redirects, TOTP setup/dialog and auth-service behavior. |
| `builder/` | Component compatibility and PC-builder guidance. |
| `cart/` | Cart stock and availability presentation. |
| `catalog/` | Catalog filters, product details and specification highlights. |
| `checkout/` | Retry keys, cart synchronization, totals/summary and checkout properties. |
| `compare/` | Product comparison data and page states. |
| `orders/` | Order details/history and payment navigation. |
| `payments/` | Saved-order payment page and payment-state presentation. |
| `reviews/` | Review-service contracts. |
| `transport/` | Same-origin requests, session refresh and CSRF handling. |

From the repository root:

```powershell
npm --prefix client test
npm --prefix client run test:watch
npm --prefix client test -- tests/transport/apiClient.test.ts
npm --prefix client test -- tests/auth
npm --prefix client run typecheck
npm --prefix client run lint
```

[vitest.config.ts](../vitest.config.ts) discovers `tests/**/*.{test,spec}.{ts,tsx}`. The default environment is Node. Page/component tests currently use React server rendering and controlled Query state; transport/service tests mock requests. They are not browser automation or evidence of live provider/database behavior. Tests that need a shared fixture or environment helper should add it here when needed, rather than creating empty folders in advance.

Keep import and mock module paths aligned with application modules. Page tests use descriptive names such as `compare-page.test.tsx` and `order-payment-page.test.tsx`; avoid generic `page.test` files in application routes. Put new tests alongside the relevant feature here, and preserve their assertions when reorganizing.

Use fictional data and mocked services. Keep real account credentials, customer records, one-off live probes, screenshots and dated QA reports out of this suite. No running backend is required for these automated tests. See the [storefront README](../README.md), [root setup guide](../../README.md) and [backend test guide](../../server/tests/README.md) for their separate responsibilities.

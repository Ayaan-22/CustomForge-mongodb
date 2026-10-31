# Admin tests

Maintained automated regression tests live here, grouped by feature. Application code remains in `app/`, `components/`, `hooks/` and `lib/`; tests import it through the existing `@/` alias rooted at `admin/`.

| Folder | Coverage |
| --- | --- |
| `commerce/` | Fulfillment transitions, cash-payment eligibility, returns and stock policy. |
| `coupons/` | Coupon date conversion and mocked API mutation/error handling. |
| `logs/` | Log API response and filter contracts. |
| `products/` | Product-row transformations and form data. |
| `transport/` | Same-origin requests, CSRF, authentication refresh and TOTP handling. |

From the repository root:

```powershell
npm --prefix admin test
npm --prefix admin run test:watch
npm --prefix admin run test:ui
npm --prefix admin test -- tests/transport/transport.test.ts
npm --prefix admin test -- tests/coupons
npm --prefix admin run typecheck
npm --prefix admin run lint
```

[vitest.config.ts](../vitest.config.ts) discovers `tests/**/*.{test,spec}.{ts,tsx}`. The default environment is Node. Transport and API tests mock requests; coupon mutation tests use controlled API responses and generated inputs. They are not browser automation, live provider checks or proof of the complete rendered page workflow. No running backend or real admin account is required.

Keep import and mock paths aligned with application modules. Put new tests in their feature folder here; avoid placing `page.test` files under application routes. Shared helpers/fixtures should be introduced only when tests actually need them, rather than creating empty folders in advance. Reorganization must preserve assertions and fixtures.

Use fictional data and mocked services. Keep real account credentials, customer records, one-off live probes, screenshots and dated QA reports out of this suite. See the [root setup guide](../../README.md), [admin design guide](../../design-system/ADMIN.md), [storefront test guide](../../client/tests/README.md) and [backend test guide](../../server/tests/README.md) for their separate responsibilities.

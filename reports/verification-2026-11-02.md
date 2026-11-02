# Local verification — 2026-11-02

## Scope and isolation

All source changes and retained verification artifacts were confined to `CustomForge-mongodb`. The integration test library also used temporary system storage for its disposable database. The Supabase checkout was read only; no dependency installation, build, formatter, or script ran there. Its current storefront/admin app and component sources were compared directly: 302 files matched, no files were missing, and five existing differences were reviewed (local fonts, MongoDB ObjectIds, and payment capabilities). The return presentation fix described below intentionally adds a further difference.

The API integration suite used its own temporary `MongoMemoryReplSet`. Browser and HTTP checks used a separate fresh replica set created by `npm run dev:verify`, with files in `.local/verification-wXnMbh/`. This uses a dynamically assigned MongoDB port and a new database directory; the database name `customforge_local` is on that fresh instance. It does not reuse `.local/mongodb` or connect to the configured application database. New fictional credentials, session secrets, logs and preview emails belong to that verification directory. Existing records and secret files were preserved.

The initial sandboxed MongoDB run failed with localhost `EACCES` before its 28 integration cases ran. The authorized rerun with localhost access passed. Initial sandboxed production output creation hit `EPERM`; the build rerun with workspace write access passed. These failed attempts are not counted as passing checks.

## Changes

- Added `npm run dev:verify`: every invocation starts a fresh local MongoDB instance and independent demo credentials/session secrets/mailbox, with storefront port 3300, admin port 3301 and API port 5200. Normal local and configured launch modes retain their existing behavior.
- Fixed the customer order page offering another return after a request/decision was already recorded. The page now displays requested/approved/rejected/completed return progress and hides the duplicate action. It does not promise a financial refund.
- Added six storefront return-presentation assertions and an integration scenario for return ownership, eligibility, duplicate requests, approval, completion and explicitly unavailable refunds.

## Checks and observed results

| Surface | Result | Evidence / scope |
| --- | --- | --- |
| API/backend tests | PASS | Original 76 tests passed. After the change, all 29 commerce integration tests passed; the other 48 backend tests were unchanged. Final backend total: 77. |
| Storefront tests | PASS | All 35 files, 288 tests passed after the return fix. |
| Admin tests | PASS | All 9 files, 58 tests passed. |
| TypeScript | PASS | Both frontend packages passed again after the return fix. |
| Production builds | PASS | Both Next applications built successfully; the storefront was rebuilt after the return fix. |
| Actual HTTP transport | PASS | MongoDB readiness from Express and both Next `/api/v1/health` proxies. |
| Authentication | PASS | Browser customer/admin sign-in; API tests for registration, verification, refresh rotation/concurrency, reset links, CSRF and role boundaries. |
| Storefront catalog | PASS | Homepage art/layout, 40 demo listings, stock/price presentation and disabled out-of-stock controls rendered. |
| Wishlist | PASS | Browser add succeeded; native API confirmed the saved item persisted after checkout. After fresh customer sign-in the wishlist rendered one saved contender at the updated $27 price. |
| Comparison | PASS | Two networking products loaded live prices/specifications; differences-only view showed six differing rows. A later admin price change appeared as $27.00 in the storefront comparison. |
| Saved address | PASS | Browser created a fictional address, persisted it as default, returned to checkout and selected it. Ownership/default handling also passed native integration tests. |
| Cart and COD checkout | PASS | Browser bought one fictional Ethernet adapter. $26.10 merchandise + $10 shipping + $2.61 tax = $38.71; server created one order, cleared the cart and reduced stock from 18 to 17. |
| Customer order details | PASS | Confirmed order, line items, original address snapshot, totals, payment status and fulfillment tracking rendered. |
| Admin orders | PASS | New order appeared; full 24-character ObjectId search returned it; pending → processing → shipped → delivered completed. Delivery required recorded COD payment. |
| Return review | PASS | Customer requested return, admin approved, and the corrected customer page showed approval with zero request-return buttons. Native integration also verified completion and 503 for unsupported refund processing. |
| Admin inventory | PASS | 40 products, 3 out of stock; browser changed adapter original price from $29 to $30. API/public storefront recomputed its 10%-discounted price to $27. Existing order retained its original $26.10 line price and $38.71 total. |
| Admin coupons | PASS | Actual HTTP create, update, toggle and soft deactivation. Coupon usage limits and concurrent checkout limits passed native integration tests. |
| Other native commerce coverage | PASS | Idempotent and concurrent checkout, final-unit oversell protection, coupon rollback, cancellation restoring inventory/usage once, order ownership, admin access and last-admin protection, reviews/moderation, six analytics contracts and durable email retries. |
| Stripe contracts | PASS, mocked | Session creation and matching signed webhook settlement tested with mocks; unconfigured card option disabled in browser. |

Final automated test total across packages: **423 passing tests**. The additional actual HTTP checks passed seven groups, saved in `.local/verification-wXnMbh/http-checks.json`.

Screenshots from the browser checks are saved in the ignored verification directory: `customer-delivered.png`, `admin-delivered.png`, `customer-return-approved.png`, and `wishlist.png`. These contain fictional local data only. The isolated verification processes were stopped after checking; their generated files remain available. Restart with `npm run dev:verify` to create another fresh run.

## Remaining limits

No blocker remains for the local COD flow exercised above. This is local verification, not a production-readiness or deployment claim.

- Real Stripe merchant checkout, provider delivery/recovery and settlement were not exercised; payment credentials were deliberately empty.
- Real SMTP delivery and Cloudinary uploads were not exercised. Local preview emails and mocked transport tests do not verify those services.
- PayPal, saved-card enrollment and financial refunds remain unavailable by design. Return approval is not a refund.
- Browser checks covered the surfaces listed above, not every possible admin screen, device, accessibility scenario or PC-builder combination. Builder/catalog/auth behavior also has automated tests, which should not be confused with exhaustive browser acceptance.
- Next emitted its existing ESLint-plugin advisory; Vitest emitted its existing future native-config-loader advisory. Neither caused a check failure.

Reproduce with `npm test`, `npm run typecheck`, `npm run build`, and `npm run dev:verify`. Localhost access is required for native MongoDB/HTTP checks. Verification credentials are printed only as a local file location, never embedded in this report.

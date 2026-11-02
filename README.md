# CustomForge · MongoDB

Gaming ecommerce storefront, administrator dashboard, and Express API with native MongoDB/Mongoose persistence. The storefront and dashboard use the latest CustomForge reference experience.

`CustomForge-supabase` is strictly read-only reference material. All source changes, dependencies, builds, local databases, and verification for this application belong in this checkout.

## Run locally

Requires Node.js 22.13 or newer on the 22 release line, or Node.js 24 or newer. From this repository:

```powershell
npm run setup
npm run dev
```

The local launcher starts a dedicated MongoDB replica set, adds 40 fictional catalog listings without overwriting existing listings, and starts all three applications:

| Application | URL |
| --- | --- |
| Storefront | http://localhost:3200 |
| Admin dashboard | http://127.0.0.1:3201 |
| API health | http://localhost:5100/api/v1/health |

Generated local customer and administrator credentials are in `.local/demo-access.json`. Development verification/reset emails are saved as HTML in `.local/mailbox/`; open the newest message and follow its link. These local secrets, emails, logs, and database files are ignored by Git.

Use the listed hostnames: the storefront and admin use different local hosts to keep their browser session cookies independent.

The launcher uses an installed MongoDB server when found on Windows. Otherwise, `mongodb-memory-server` downloads its supported binary. Set `MONGOMS_SYSTEM_BINARY` to an existing `mongod` executable to control this choice. Local data persists in `.local/mongodb/` across normal stops and restarts. Stop the launcher with Ctrl+C. The launcher never uses `server/.env`'s Atlas database or payment/mail credentials in local mode.

Local checkout supports cash on delivery. The card option is disabled when Stripe keys and a webhook signing secret are unavailable. Local purchases are fictional test records, not real sales.

## Use a configured MongoDB database

Create `server/.env.local` using [server/.env.example](server/.env.example). It takes precedence over `server/.env`. Existing environment variables take precedence over both files. Do not commit either secret file.

MongoDB must be a replica set or sharded cluster: standalone servers cannot provide atomic multi-document checkout. Atlas already provides replica-set transactions. The API connects and prepares indexes before listening. It does not reset collections or seed the configured database.

```powershell
npm run dev:configured
```

Configured development uses storefront port 3000, admin port 3001, and API port 5000 by default. Set `CLIENT_URL`, `ADMIN_URL`, and frontend `API_BACKEND_URL` consistently when using other origins. Both Next applications proxy `/api/v1` to Express; browser access tokens stay in memory, while refresh sessions use HTTP-only cookies.

For production, build each frontend, run its `npm start` command, and run `npm start` in `server`. Set `NODE_ENV=production`, distinct strong `JWT_SECRET` and `CSRF_SECRET`, exact HTTPS frontend origins, an appropriate `TRUST_PROXY`, and verified external integration credentials. Use a shared Redis rate-limit store before running multiple API replicas.

## Checks

```powershell
npm run typecheck
npm test
npm run build
```

The backend integration suite creates an isolated temporary local MongoDB replica set and overrides database, email, payment, and upload credentials. It never uses `MONGO_URI` or `MONGO_TEST_URI` from developer configuration. The suite can download a MongoDB binary unless `MONGOMS_SYSTEM_BINARY` is provided. Windows test runners must allow localhost connections.

For browser verification, run `npm run dev:verify`. Each run creates a fresh local replica set, demo users, session secrets, mailbox, and logs under a new ignored `.local/verification-*` directory. It leaves `.local/mongodb`, existing local credentials, and configured databases untouched. Use storefront `http://localhost:3300`, admin `http://127.0.0.1:3301`, and API `http://localhost:5200/api/v1/health`. Credentials are in the printed run directory's `demo-access.json`. Stop with Ctrl+C.

The native integration tests cover authentication/verification, CSRF, private account data, saved addresses, catalog contracts, wishlist, monetary totals, checkout retries, concurrent stock and coupon limits, cancellation, customer ownership, administrator access, fulfillment, reviews, and mocked Stripe sessions/signed webhooks. Frontend suites cover the retained storefront and admin behavior. Passing mocked Stripe tests does not verify a real merchant account or live settlement.

## Commerce behavior

- The API calculates product prices and all totals; clients cannot set order totals or payment status.
- Checkout snapshots products and shipping addresses, reserves stock, consumes a coupon, creates the order and email job, and clears the cart in one MongoDB transaction.
- Checkout keys are scoped to the customer and bound to the submitted address/payment request. Retrying an identical request returns the same order.
- Shipping is $10 below $100 of discounted merchandise and free at $100 or above; tax is 10% of discounted merchandise. Amounts are calculated in integer USD cents. Replace this policy before selling where different shipping/tax rules apply.
- Cancelling an unpaid pending COD order releases stock and coupon usage once. Card reservations require provider-confirmed expiration before stock can be released.
- COD fulfillment progresses through pending/paid → processing → shipped → delivered. Cash must be recorded before delivery. Stripe payment state comes from verified matching provider events.
- The API runs an email outbox and payment-reservation recovery worker every 15 seconds. Email delivery is retried after failures and has at-least-once semantics; a process failure after SMTP acceptance may cause a duplicate confirmation.
- Existing MongoDB ObjectIds, product records, password hashes, and embedded addresses remain supported. Older addresses without IDs receive stable compatibility IDs and persist them on a later address edit. Old JWTs require a fresh sign-in.

## Integrations and limitations

Stripe Checkout requires `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`, including a webhook endpoint at `/api/v1/payment/webhook`. The raw request body is verified before processing. Redirects do not settle orders. Before real use, validate checkout, webhook delivery, expiration/recovery, and settlement with the intended Stripe test account.

SMTP sends real verification, reset, and order messages when configured. `EMAIL_MODE=preview` is restricted to development. Cloudinary handles production image uploads; development can save verified JPEG/PNG/WebP images under the ignored local upload directory. Public uploads are served through `/api/v1/media/`.

PayPal, saved-card enrollment, and refunds are unavailable and return explicit errors; they are not simulated successes. Returns can be requested and reviewed, but financial refunds require reconciliation outside this release. Catalog listings, real stock, merchant configuration, fulfillment operations, tax policy, hosting, and domain setup must be supplied for a real store. This repository is locally runnable; it has not been publicly deployed.

## Source layout

| Directory | Purpose |
| --- | --- |
| `Client/my-app/` | Next.js customer storefront and tests |
| `Admin/customforge-admin/` | Next.js administrator dashboard and tests |
| `server/` | Express routes, controllers, native Mongoose models, workers, tests |
| `scripts/` | Root setup, local launcher, and check commands |
| `.local/` | Ignored local database, credentials, emails, logs, and reference verification |

The original nested frontend paths are retained so existing workspace references continue to resolve.

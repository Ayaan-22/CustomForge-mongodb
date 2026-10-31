# CustomForge storefront redesign

## Architecture and implementation

The existing client is Next.js 15 / React 19 with Tailwind 4, Framer Motion, Radix UI, TanStack Query and Zustand. It already had a real Express / Supabase commerce backend, rather than just a static catalog. Existing capabilities include:

- Product search, categories, brand / price / rating / stock / exact-feature filters, sorting and pagination; featured, top-rated and related product endpoints.
- Product specifications, game and prebuilt details, reviews and review editing, guest / account wishlists.
- Guest cart persistence and authenticated carts, coupons, server-calculated totals, shipping addresses, checkout recovery and idempotent order submission.
- Stripe hosted payment and cash on delivery; server-authoritative payment status, order history, tracking, cancellation and return requests.
- Registration, login, email verification, password recovery, account settings, address and payment method management, and two-factor security.

Those services and security contracts remain in use. No mock checkout or fabricated stock, rating, review or order status was introduced. The catalog currently mixes demo products and older listings; unusually large prices are preserved from the API. Currency remains the existing USD convention and should be reviewed against the catalog before launch.

## Visual rationale and design system

Electric cyan `#62F0DD` is the primary action and selection color. Violet `#A696FF` is the secondary RGB accent. Ink navy `#090D14`, lifted dark surfaces, bright product photography and generous editorial headings keep the store energetic and readable. The hero uses existing cyan / violet PC imagery, an angular CF mark, a large editorial headline, restrained grid details and prominent shopping actions.

Geist Sans handles the custom wordmark, shopping copy, display headlines and redesigned authentication forms; system monospace adds the HUD character to steps and specs without another font download. Existing Orbitron styling remains on legacy surfaces and loads on demand. Motion is quick, decorative and subordinate to shopping. Small screens use static RGB lighting and fewer backdrop effects to reduce rendering work.

The full style guide is `../design-system/FORGE.md`. Runtime tokens, component styling, responsive rules, reduced-motion rules and invoice print styling live in `app/forge.css`, imported after the existing global stylesheet. Shared navigation styling is in `app/forge-navigation.css`. Shopping styles load with the relevant components: `forge-cards.css` from `components/product-card.tsx`, `forge-catalog.css` from `components/forge/catalog.tsx`, `forge-detail.css` from `components/forge/product-sections.tsx`, `forge-product-depth.css` from `app/products/[id]/page.tsx`, and `forge-builder-guidance.css` from `app/pc-builder/page.tsx`. These imports keep new product and builder styling out of the homepage's initial CSS. Color changes can be made in the `:root, .dark` tokens at the top of `forge.css`.

## Discovery upgrade / Forge 02

- Desktop category mega menus and mobile accordion groups read the actual catalog categories on first use. Category aliases remain exact; no console inventory is fabricated. Category links avoid background route prefetches.
- Search suggestions and their media/query code load only after focus. Debounced bounded requests show current products, stock and server prices; arrow keys, Enter and Escape work. Search history is optional, device-only, and clearable. Loading, empty and error states still allow normal search submission.
- Product cards and detail highlights prioritize category-specific published specifications through `lib/product-highlights.ts`. Contain-fit image stages preserve the whole photograph, quick view is touch-visible, and alternate photos load only on image hover/focus. Explicit demo records are labeled.
- Catalog filtering uses validated minimum/maximum USD inputs without a $5,000 limit, removable applied-filter chips, and a mobile drawer with persistent actions. Clearing filters preserves search and sort. Raw exact-specification entry is removed; existing exact-feature links remain effective and removable.
- Product detail adds a sticky section navigator and a dedicated build-compatibility section. It measures the actual header height so section headings stay visible below navigation. The purchase panel links to the check instead of containing a long checker.
- The homepage's animation runtime is now native CSS, IntersectionObserver and passive scroll scheduling. Initial content remains at full opacity and its final position; above-the-fold reveals never delay paint. Hero parallax and the builder progress line run only on desktop while visible. Mobile navigation uses a solid surface to avoid backdrop work.

This discovery package preserves all current commerce data and security contracts. The following phase adds normalized specification facets and multiple-brand filtering; catalog currency corrections, authentic SKU photography, cloud-saved builds and shipping estimates remain dependent on the relevant product data or services.

## Product depth, guided building and facets / Phase 2

- Product pages now include category-specific editorial sections, published specification decision panels, listed features, setup guidance and an explicit warranty/order-information panel. `lib/product-depth.ts` supplies the guidance; it never derives technical claims or benchmarks from product names. Missing descriptions, warranty terms and delivery information are stated openly.
- The gallery preserves whole product photographs and adds image position, previous/next controls, keyboard arrows, touch swipe, scrollable thumbnails and an enlarged view with a Fit reset. Video and 360° controls remain available only for configured real SKU assets. Gallery state resets when the product changes.
- Complementary products are distinct from same-category alternatives. `components/forge/product-complements.tsx` starts bounded live queries near the viewport: two actual catalog categories, up to four candidates in each, and up to two displayed per category. Suggestions require an in-stock listing with no explicit zero inventory; known socket, memory or GPU/case conflicts are excluded. A match describes the specific published field; missing metadata and untested connections remain “Verify your setup.”
- The PC builder now guides visitors through eight component slots with step-specific buying advice, progress, selected-part editing and a next-missing-part action. Expandable compatibility results separate known matches, conflicts and missing data, explain each result and link back to the relevant slot. Existing live price/stock revalidation, conflict blocking and explicit manual-fit acknowledgment remain in place before cart additions.
- An optional parts budget is validated as a positive USD amount with up to two decimal places. The meter shows selected parts against that amount, including remaining funds or overage. It excludes missing parts, shipping and tax. The preference is device-only under `customforge-build-budget-usd-v1`; blocked browser storage does not prevent planning.
- Canonical build slots remain independent of exact catalog labels. Power Supply / PSU and Cooler / Cooling can be selected from the live category choices and assigned to the correct slot without rewriting the source product category. Navigation and catalog requests continue using exact real labels.
- Catalog filters now offer multiple brands and category-specific specification checkboxes from `GET /api/v1/products/facets`. The server normalizes published specification key aliases and values, ignores unknown/empty fields, and counts each product once per option. Selected brands use OR; values within one specification use OR; different specifications and other filter groups use AND. Filtering happens before exact counting and pagination.
- Facet counts describe the selected category and applied search, price, stock, rating, deals and other base filters **before brand or specification selections**. They are not predictions for combining the currently checked brands/specs. Pending counts are hidden while options update. Applied chips remain individually removable, and clearing filters preserves search, sort and the deals route.
- Normalized specification scans are capped at **1,000 candidate products**. Above that bound, the facets endpoint returns unavailable options with a narrowing explanation; applying specification filters returns a narrowing error instead of truncated results or invented counts. Ordinary catalog queries without specification filters retain database pagination. A larger catalog needs a database-backed normalized facet index/RPC before expanding this limit; no schema migration was introduced here.
- The desktop purchase panel spans the gallery and detail rows so it remains available deeper in the page. A panel taller than the viewport scrolls internally; the mobile purchase bar remains separate.

## Commerce, account and collections / Phase 3

- The full cart and slide-out mini cart now use stock-aware quantity controls, visible inventory warnings and clearer updating/error states. Unavailable items and quantities above known inventory require review; increasing quantity respects published stock. Guest prices remain a device snapshot subtotal, with shipping, tax and final totals explicitly deferred. Signed-in summaries display confirmed server totals and their warnings rather than relabeling a local estimate as the order total.
- Checkout adds selected address and payment cards, semantic section headings, whole-product thumbnails, server line totals, inline coupon/order feedback and branded loading/recovery views. Editing a coupon clears stale mutation feedback; the current server-applied coupon takes precedence over an acceptance message. Address selection stays explicit, including when a saved address is marked default.
- Desktop and mobile place-order actions share the same preflight disabled conditions. The mobile total bar links to the order summary so pending/error guidance is reachable, and route-scoped footer spacing prevents it from covering the final footer content. Fresh-total comparison, validated shipping fields, session recovery, idempotency, original retry payloads, authentication and payment routing remain in the existing flow. No client price calculation replaces the server's checkout total.
- A shared account shell connects profile, order history, addresses, payment methods and security, with current-route state and accurate email/2FA labels. Profile drafts hydrate restored session data without erasing fields already edited locally; a different account resets the draft owner. Explicit reset returns to the latest server baseline. Existing 2FA challenges, profile/password mutations and account-deletion safeguards remain in use.
- Order history gains search, status and date controls with a visible **current API page** scope. Search matches the supplied page's order references and listed item names; it does not imply account-wide search. Existing pagination, payment navigation and order-detail actions remain available.
- Wishlist curation adds live category selection, saved/name/price sorting and per-item refresh, unavailable-listing and removal states. Guest and account saving retain their existing persistence rules. An unsuccessful product refresh does not erase the saved selection or block the rest of the collection.
- Comparison refreshes each of up to four products independently. Failed columns expose their own retry/remove controls without borrowing persisted snapshot prices or specifications. “Differences only” requires at least two loaded products. Conservative category-specific aliases and value normalization expose conflicting aliases, keep missing data unverified and avoid equating unrelated attributes across product categories. The bounded, keyboard-focusable table scrolls in both directions with sticky product headers and row labels.
- Presentation additions remain route/component scoped: `app/forge-commerce.css` is imported by `app/cart/page.tsx`, `app/forge-checkout.css` by `app/checkout/page.tsx`, `app/forge-account.css` by `components/forge/account-shell.tsx`, and `app/forge-collections.css` by the wishlist/compare routes. Checkout waiting/recovery components live in `components/forge/checkout-views.tsx`; draft, order-page, comparison and cart presentation rules have reusable helpers under `lib/`.

## Implemented pages and components

| Area | Implementation |
| --- | --- |
| Home `/` | Animated RGB PC hero, category lanes, real featured / sale / arrival tabs, keyboard tab navigation, brand strip, popular-product section with honest new-arrival fallback, scroll-linked builder showcase, real community reviews, local newsletter interest form. |
| Catalog `/products`, `/deals` | Sticky desktop filters, mobile drawer, URL-synchronized filtering and sorting, multiple brands, category-specific server facets and counts, removable chips, grid / list modes, real server-filtered discounts, pagination and skeleton / empty / error states. |
| Product `/products/[id]` | Gallery with thumbnails, image position, swipe, zoom / Fit and keyboard navigation; optional video / 360° frames; category-specific editorial sections, factual decision panels, specs table and listed warranty; desktop sticky purchase panel and mobile buy bar; real stock / quantity / cart actions, wishlist, comparison, saved-build compatibility, reviews with a page-specific rating breakdown, complementary suggestions, separate same-category alternatives and an honest FAQ. |
| Cart and checkout | Stock-aware full/mini cart controls and warnings, honest guest subtotal/server total distinctions, selected address/payment cards, image-aware server-priced summary, inline coupon/order feedback, branded loading/recovery, matched desktop/mobile place-order conditions and accessible mobile summary link; existing checkout/payment logic retained. |
| Orders `/orders/[id]` | Server-confirmed “Order Unlocked” or pending-payment celebration, status timeline, existing order actions, printable branded invoice and downloadable standalone HTML invoice. Browser print supports Save as PDF. |
| PC Builder `/pc-builder` | Eight guided live component slots, exact category alias choices, persistent selections, optional device-only USD parts budget, estimated total, expandable compatibility explanations and slot-review actions, live price / stock revalidation before cart additions, conflict blocking, explicit manual-fit acknowledgment and retry handling for partial additions. |
| Comparison `/compare` | Up to four saved products, independent live refresh/error columns, conservative category-specific spec aliases, differences-only mode, remove / clear actions, bounded two-axis scrolling and sticky product/row headers. |
| Wishlist `/wishlist` | Guest/account saving, live category curation and ordering, per-item refresh / missing-listing / removal states, product cards and comparison entry point. |
| Existing account pages | Shared account navigation and accurate email/2FA states, session-aware profile drafts and reset, clearer forms/feedback, current-page-scoped order search/status/date filters and existing auth/account/order actions. |
| Shared experience | First-visit session boot indicator, route entrances, scroll reveals, hero parallax, short desktop sticky showcase with scrubbed accent, card lift / glow / alternate image, quick view, accessible Radix dialogs, processing animations, friendly 404 / error / empty states and branded skeletons. |

Reusable presentation components are in `components/forge/`. Shopping snapshots are in `lib/forge-store.ts`; compatibility rules are in `lib/compatibility.ts`; guided builder choices and explanations are in `lib/builder-guidance.ts`. Existing commerce hooks and services continue to own transactional state. Backend catalog extensions include `discounted=true`, whitelisted `discount_percentage` sorting, multiple-brand selection and bounded normalized specification filtering/facets. They use the existing safe public storefront views and preserve exact counting before pagination. `server/utils/catalogFacets.js` owns normalization and filter validation; `server/controllers/productController.js` owns the public list and facets queries.

## Motion and performance

The shared storefront uses native CSS transitions and observers; no additional runtime dependency was needed. Framer Motion remains installed for legacy components, but is no longer imported by the home hero or shared experience. Native smooth scrolling preserves browser behavior. Media-query checks and CSS rules suppress route movement, decorative RGB drift, parallax, smooth scrolling and autoplay hero video when reduced motion is requested. Product video is user initiated. The boot indicator is dismissible, non-blocking, session scoped and lasts at most 1.1 seconds; its bar uses `scaleX` rather than changing layout width.

The navigation reads its search URL after mounting, and loading boundaries cover individual page content rather than the entire shell. This preserves the homepage's server-rendered hero and navigation. Its static content is a Server Component; live product shelves and their query code load just before entering view to avoid building every shopping card during hero startup. Deferred placeholders stay static until their shelves approach the viewport, avoiding 48 off-screen shimmer animations. Reveals leave every initial section untouched: the first observer entry never changes styles or synchronously reads layout. Only a later viewport entry adds one full-opacity transform animation. Explicit section-link targets skip that movement so the anchored heading stays settled. The homepage's initial JavaScript fell from 229 kB originally to 142 kB in Forge 01 and 128 kB in the discovery upgrade; the Phase 2 production build reports 129 kB.

Homepage and header links to other routes use `prefetch={false}`, deferring route downloads until navigation. Only pending, noninteractive collection/recommendation placeholders use `content-visibility: auto`, with breakpoint-aware intrinsic heights. Containment is removed when the shelf activates; loaded shopping controls and the sticky builder showcase remain in normal layout. Browser verification confirmed scrolling activates the product cards and ArrowRight selects the collection tabs.

Product images use Next image optimization with responsive sizes, lazy loading and a local fallback for broken catalog URLs. The hero is prioritized. Remote hosts are restricted in `next.config.mjs` to the current Unsplash catalog, Cloudinary, and public Supabase storage. Add a precise host / path pattern there before switching to a different CDN.

Reference documentation: [Next image component](https://nextjs.org/docs/app/api-reference/components/image) and [Motion accessibility](https://motion.dev/docs/react-accessibility).

## Exact asset replacement points

| Asset | Where to replace it |
| --- | --- |
| Hero poster / animated CSS scene | Replace `public/custom-gaming-pc-hero-image.jpg`; the hero and optional video poster use it in `components/forge/hero-scene.tsx`. Use a high-quality wide crop of an actual CustomForge PC. |
| Optional looping hero video | Put an optimized muted MP4 in `public/media/forge-hero.mp4`. Add `NEXT_PUBLIC_HERO_VIDEO=/media/forge-hero.mp4` to the client's environment, then rebuild. It uses autoplay / muted / loop / playsInline, pauses off screen, and falls back to the image on error or reduced motion. No video file is bundled. |
| PC-builder showcase image | Replace `public/custom-gaming-pc-with-rgb-lighting.jpg`; used by `app/page.tsx`. |
| Category illustrations | Image paths are in the `categories` array near the top of `app/page.tsx`; replace those files under `public/` or update the paths there. |
| Product photos | Edit the catalog's real `images` array through the existing product admin. The first image is the primary card/gallery view; subsequent images become gallery thumbnails. The card loads its first distinct alternate only after hover/focus. `components/forge/product-story.tsx` uses the second image for its detail stage, falling back to the first. Broken or empty sources fall back to `public/gaming-component.jpg` through `components/forge/product-image.tsx`. The fallback is illustrative, rather than a verified photo of the item. |
| Product video / real 360° photography | Add files to `public/media/products/<sku>/`. Register the exact real SKU in `lib/product-media.ts`, e.g. `{ video: "/media/products/YOUR-SKU/demo.mp4", spinFrames: ["/media/products/YOUR-SKU/01.webp", "/media/products/YOUR-SKU/02.webp"] }`. Supply an ordered full rotation of consistent-angle frames. The controls appear only when assets are configured. |
| Logo | Edit `components/forge/brand.tsx`; the angular CF mark is an inline SVG, so it scales without a raster download. |
| Authentication circuit illustration | Edit the inline SVG in `components/forge/auth-shell.tsx`; motion and responsive layout live in `app/forge-auth.css`. No bitmap or video download is needed. |
| Campaign countdown | Set `NEXT_PUBLIC_DEAL_ENDS_AT` to a real ISO timestamp including its timezone, then rebuild. It is hidden when absent, invalid or expired. Discounts come from the API regardless of the countdown. |

## Assumptions and limits

- Audience: gamers, budget builders and enthusiasts. Branding: CustomForge. Existing product data, categories, payment methods, URLs and USD formatting were retained.
- The catalog does not currently have qualifying top-rated products. The home section uses real recent arrivals until that endpoint has results; review panels accurately show missing reviews.
- Newsletter interest is saved only on the visitor's device. There is no existing email subscription endpoint; the UI explicitly says no email is sent. Connect an actual opt-in provider / endpoint before advertising subscriptions.
- The FAQ is a store guide. A persisted community question / answer service is not present; community Q&A is identified as unavailable rather than simulated.
- Optional hero / product video and 360° media need the actual assets above. Existing PC and category photos are illustrative.
- Product stories, setup guidance and complementary categories explain shopping decisions; they do not establish real-world performance or certify compatibility. Listed warranty text comes from `product.warranty` or a published prebuilt `warranty_period`; no return window, coverage exclusions or delivery estimate is invented.
- The builder checks documented CPU / motherboard sockets, DDR generation, cooler socket support, available CPU / GPU / PSU power metadata, and GPU / case clearance metadata. Missing values remain unknown. BIOS support, motherboard / case fit, radiator clearance, storage slots and power connectors need manufacturer confirmation. This beta cannot certify a complete build.
- Builds and the optional USD budget are stored on this device, not in a cloud account. The catalog's prices and currency convention remain unchanged; the budget is a planning preference, not a checkout total.
- Normalized specification facets support candidate sets up to 1,000 products. Larger selections must be narrowed or moved to a database facet index/RPC; the UI does not present sampled counts as complete.
- The backend has no packing event or timestamp. The order timeline says packing updates are unavailable; it never invents that stage. Shipping and delivery states come from the order record.
- Invoices use server order totals and show paid / pending / due-on-delivery accurately. Download is HTML; PDF is available through the browser's print dialog. This is an order invoice, not a separate receipt or jurisdiction-specific tax document.
- Custom pointer takeover, sound effects, loyalty ranks and achievement rewards were optional ideas and were not added. They need deliberate product / reward rules and real assets before introducing them.
- Protected account and payment logic is retained and covered by the existing tests. No real order was submitted or payment charged during UI verification. A signed-in end-to-end checkout should be exercised with Stripe sandbox credentials before deployment.

## Maintained development checks

Run these commands in the client directory:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run build
```

Run the focused server catalog checks from `server`:

```powershell
npm.cmd test -- tests/security/publicCatalog.security.test.js tests/catalog/catalogFacets.test.js
```

For local browsing, the server runs on port 5000 and Next runs on port 3000. The existing Next rewrite proxies `/api/v1` to the server. Existing environment configuration remains required; no secret values are included in this guide.

To verify production alongside a running development server, use the opt-in isolated build directory instead of overwriting `.next`:

```powershell
$env:FORGE_PREVIEW='1'
npm.cmd run build
npm.cmd run start -- --hostname 127.0.0.1 --port 3001
```

This uses ignored `client/.forge-preview/`; the default development and deployment commands continue to use `.next`. Next regenerates its type references for the selected directory. See the [Next distDir documentation](https://nextjs.org/docs/app/api-reference/config/next-config-js/distDir).

## Phase 4 account and payment upgrades

Addresses now preserve the entire stored street address when editing, with responsive default cards, inline validation, shipping autocomplete, draft reset and a recoverable removal dialog. Security has guided password → manual authenticator key → code verification stages; only a refreshed server user confirms the changed two-factor status. Accepted-but-unconfirmed requests offer status-only recovery with credentials cleared.

Order details include retry, recorded totals and branded cancellation/return confirmations with pending/error/focus recovery. A failed action requires status refresh before retry. Incomplete pricing remains explicitly missing and prevents an inaccurate invoice export. Payment shows the saved order and a secure Stripe handoff with duplicate-submit protection and retries; no new order is created by opening checkout. Payment-method cards retain the actual saved-card integration limits.

Route styles are app/forge-addresses.css, app/forge-security.css, app/forge-order-detail.css and app/forge-payment.css. No extra libraries or assets are required.

## Authentication and recovery / Phase 5

Sign-in, registration, forgot/reset password and verification now use the shared AuthShell, solid readable forms, password visibility controls and the inline circuit scene. The scene uses native CSS transform motion, is hidden on mobile and stops with reduced-motion preferences. No external auth artwork or animation library is required.

Inline validation and request feedback have associated descriptions and deliberate focus. Ref guards prevent duplicate requests before rerender; finally paths release pending state. Login keeps exact credentials through its authenticator challenge and preserves safe local redirects. Recovery distinguishes accepted requests, retryable failures and invalid links; one-use verification requests are deduplicated across effect replay. The protected-operation dialog keeps typed codes through parent updates and restores its initiating control/form on close. Existing APIs, session policy and protected mutations remain in place.

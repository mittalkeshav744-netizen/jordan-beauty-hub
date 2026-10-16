# Architecture and data model

## Request flow

```
Development (hot reload):
Browser ──► Vite (5173) ──/api, /admin, /media──► Django (8000) ──► SQLite
              serves React                  proxy           DRF views → services → ORM

After `npm run build` (one server):
Browser ──► Django (8000) ──► SQLite
              /api, /admin, /media + frontend/dist/ (config.spa)
```

In production a reverse proxy can still sit in front and serve `frontend/dist/` itself;
Django serving the build is enough for a single-machine setup. The browser always talks to
one origin so session + CSRF cookies work without cross-site configuration.

## Backend layering

| Layer | Location | Responsibility |
| --- | --- | --- |
| URLs / views | `apps/*/urls.py`, `views.py` | HTTP only: parse input, call a service, return a response |
| Serializers | `apps/*/serializers.py` | Input validation and output shape |
| Services | `apps/*/services.py` | Business rules: stock changes, cart rules, pricing, checkout, status transitions |
| Models | `apps/*/models.py` | Data, constraints, indexes |
| Admin | `apps/*/admin.py` | Internal operations; stock and status edits go through services |

Errors are normalised by `config/exceptions.py` into `{"detail", "errors"}`.

## Data model

```
User 1─* Address
User 1─1 Cart 1─* CartItem *─1 ProductVariant
Category 1─* Product *─1 Brand
Product 1─* ProductVariant 1─* StockMovement
Product 1─* ProductImage
Product 1─* Review *─1 User              (unique per product+user, rating 1–5)
User 1─* Order 1─* OrderItem *─0..1 ProductVariant   (SET_NULL; snapshot fields kept)
Order 1─* OrderStatusHistory
Order 1─1 Payment                        (method, status, amount — separate from Order.status)
Coupon 1─* CouponRedemption 1─1 Order
User 1─* WishlistItem *─1 Product        (unique per user+product)
Product *─* SkinType                     (none = suits every skin type)
Product *─* Concern                      (shop by concern, skin quiz ranking)
Look 1─* LookStep *─1 Product, *─0..1 ProductVariant   (variant must belong to the product)
NewsletterSubscriber                     (unique email)
```

Key rules enforced in the database:

- `ProductVariant.sku` unique; `price >= 0`; `compare_at_price` is null or greater than `price`.
- One default address per user (conditional unique constraint).
- One cart line per variant per cart; quantity ≥ 1.
- `Order(user, idempotency_key)` unique → a retried checkout returns the same order.
- Percentage coupons cannot exceed 100.
- Money is `DecimalField` everywhere; totals are computed with `Decimal` and rounded half-up
  to paise.

## Checkout (`apps/orders/services.py::place_order`)

Runs in one database transaction:

1. Return the existing order if this idempotency key was already used.
2. The transaction starts with SQLite `BEGIN IMMEDIATE`, so it holds the write lock and
   concurrent checkouts wait their turn.
3. Re-check availability and stock for every cart line.
4. Compute subtotal from current server prices; lock and validate the coupon; compute
   discount, shipping and grand total.
5. Create the order, snapshot each line (name, variant, SKU, unit price, quantity, total).
6. Decrease stock through `change_stock()` (logs a `StockMovement`).
7. Record coupon redemption, create a pending Cash-on-Delivery `Payment`, add status history,
   empty the cart.

Cancelling (customer or admin) restores stock, releases the coupon use and cancels the
pending payment. Delivering a COD order marks its payment as paid.

## Order status transitions

```
pending → confirmed → processing → shipped → delivered
   └──────────┴────────────┴──→ cancelled
```

Customers can cancel while `pending` or `confirmed`.

## Adding an online payment gateway later

1. Add a `Payment.Method` value and gateway credentials as environment variables.
2. Create the gateway order on the server when the customer places an order; keep the
   order `pending` and the payment `pending`.
3. Verify the gateway signature / webhook on the server. Store processed webhook event IDs
   with a unique constraint so a repeated notification is ignored.
4. Only that verification marks the payment `paid`. Never trust a frontend success callback.

## Frontend structure

- `services/apiClient.js` — one Axios instance: base URL from `VITE_API_BASE_URL`, cookies,
  automatic CSRF header.
- `context/` — Auth (session user), Cart (server cart copy), Toast providers.
- `hooks/useApi.js` — loading / error / reload for any request; ignores stale responses.
- `hooks/useForm.js` — controlled forms, client validation, server errors mapped to fields.
- `styles/index.css` — all design tokens; components use them via Tailwind utilities
  (`bg-accent`, `text-ink`, `rounded-card`, `shadow-card`, `max-w-page`, …).

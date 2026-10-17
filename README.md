# Jordan Beauty Hub — Beauty & Cosmetics E-commerce

A production-oriented online store for makeup, skincare, haircare, body care and beauty
accessories, built with a **React (Vite, JSX)** storefront and a **Django REST Framework**
API backed by **SQLite**.

> Status: MVP. Catalogue, accounts, addresses, cart, checkout with Cash on Delivery,
> coupons, verified reviews, order tracking/cancellation and Django Admin management are
> implemented. Online payments and courier integration are planned — see
> [Current limitations](#23-current-limitations-and-unfinished-features).

---

## Table of contents

1. [Project overview](#1-project-overview)
2. [Main features](#2-main-features)
3. [Technology stack](#3-technology-stack)
4. [Folder structure](#4-folder-structure)
5. [Prerequisites](#5-prerequisites)
6. [Install frontend dependencies](#6-install-frontend-dependencies)
7. [Create a Python virtual environment](#7-create-and-activate-a-python-virtual-environment)
8. [Install backend dependencies](#8-install-backend-dependencies)
9. [Database (SQLite)](#9-database-sqlite)
10. [Back up the database](#10-back-up-the-database)
11. [Environment variables](#11-configure-environment-variables)
12. [Run migrations](#12-run-django-migrations)
13. [Create a superuser](#13-create-a-django-superuser)
14. [Start the frontend](#14-start-the-frontend-development-server)
15. [Start the backend](#15-start-the-django-backend)
16. [API overview](#16-api-endpoint-overview)
17. [Run tests](#17-run-tests)
18. [Build and run on one server](#18-build-the-frontend-and-run-on-one-server)
19. [Git and GitHub](#19-configure-git-and-github)
20. [Push without node_modules or secrets](#20-push-code-without-uploading-node_modules-or-secrets)
21. [Troubleshooting](#21-troubleshooting)
22. [Production deployment](#22-production-deployment-overview)
23. [Current limitations](#23-current-limitations-and-unfinished-features)

---

## 1. Project overview

Jordan Beauty Hub is an Indian (INR) beauty store. Customers browse and filter products, pick a
shade or size, add items to their bag, check out with a saved address and pay cash on
delivery. Staff manage products, stock, orders, coupons, reviews and customers in Django
Admin.

The code is organised so it can grow: business rules live in backend service modules,
the React UI is built from shared components and a central design-token theme, and every
environment-specific value comes from environment variables.

## 2. Main features

**Storefront**
- Animated home page: hero with floating bestseller photos (or a banner video), scrolling
  strip, categories, skin-quiz promo, bestsellers, shop by concern, "Get the look", shop by
  budget and new arrivals. Animations switch off for visitors who ask for reduced motion.
- **Skin quiz** (`/skin-quiz`): skin type, concern and budget → a morning and night routine
  picked from the catalogue, with a server-calculated total and "add whole routine to bag"
- **Get the look** (`/looks`): complete makeup looks with step-by-step products, shades,
  instructions, an optional video and "add the full look to bag"
- Shop page with category, brand, price and stock filters, sorting, search and pagination
  (all stored in the URL, so results can be shared/bookmarked). The home page "Shop by
  concern" tiles open concern pages (`/shop?concern=acne`) with their own title and banner.
- Product detail page: image gallery, shade swatches / size buttons, live price per
  variant, low-stock and sold-out states, ingredients / how-to-use sections
- Verified-purchase reviews (only after an order containing the product is delivered)
- Responsive header with search, mobile slide-out menu, bag badge, toast notifications
- **Beauty assistant** (floating “Ask us” chat): full AI answers via Google Gemini about
  products, COD, delivery and returns. Needs `GOOGLE_GEMINI_API_KEY` in `backend/.env`

**Accounts and checkout**
- Email + password registration and sign-in (Django sessions, CSRF protected)
- Profile editing and saved addresses (one default address)
- Server-side bag with stock and quantity validation
- Checkout: address selection, coupon preview, order note, Cash on Delivery
- Duplicate-submit protection (idempotency key) — a double click creates one order
- Order history, order detail with status timeline, customer cancellation (before shipping)

**Back office (Django Admin at `/admin/`)**
- Products with inline variants (SKU, price, sale price, stock, shade colour) and images
- Every stock change is logged as a stock movement (restock, order, cancellation, manual)
- Orders: status changes through validated transitions; cancelling restores stock and
  coupon usage; bulk "mark as …" actions; date drill-down
- Coupons (percentage / fixed, minimum order, cap, validity dates, total and per-user limits)
- Payments (separate from fulfilment status), reviews moderation, customers and addresses

## 3. Technology stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19 (JSX), Vite 8, React Router 8, Tailwind CSS 4, Axios |
| Frontend tests | Vitest 5, Testing Library, jsdom |
| Linting | oxlint (included with the Vite template) |
| Backend | Python 3.12+ (developed on 3.14), Django 6.1, Django REST Framework 3.18 |
| Database | SQLite (bundled with Python; WAL mode, immediate transactions) |
| Other backend libs | django-cors-headers, Pillow (images), python-dotenv (`.env` loading) |

## 4. Folder structure

```
jordan beauty/
├── backend/
│   ├── apps/
│   │   ├── accounts/          # custom User (email login), Address, auth endpoints
│   │   ├── catalog/           # Category, Brand, Product, ProductVariant, ProductImage,
│   │   │   │                  # StockMovement, Review + stock service + seed command
│   │   │   └── management/commands/seed_catalog.py
│   │   ├── cart/              # Cart, CartItem + cart service
│   │   ├── orders/            # Coupon, Order, OrderItem, OrderStatusHistory,
│   │   │                      # CouponRedemption + checkout/order services
│   │   ├── payments/          # Payment (separate from order status)
│   │   └── test_factories.py  # helpers used by the test suites
│   ├── config/                # settings, urls, pagination, API error format
│   ├── manage.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── public/                # favicon
│   ├── src/
│   │   ├── components/
│   │   │   ├── cart/          # CartItem, OrderSummary
│   │   │   ├── common/        # Button, Modal, ConfirmDialog, Pagination, PriceDisplay, …
│   │   │   ├── forms/         # FormField, AddressForm
│   │   │   ├── layout/        # Header, MainNav, MobileNav, SearchBar, Footer, AuthCard
│   │   │   └── products/      # ProductCard, ProductGrid, FilterPanel, VariantSelector, …
│   │   ├── constants/         # navigation, sort options, price ranges, Indian states
│   │   ├── context/           # Auth, Cart and Toast providers
│   │   ├── hooks/             # useApi, useForm, useAuth, useCart, useAddToCart, …
│   │   ├── layouts/           # MainLayout, AccountLayout
│   │   ├── pages/             # Home, Shop, ProductDetail, Cart, Checkout, Login, …
│   │   │   └── account/       # AccountPage, OrdersPage, OrderDetailPage
│   │   ├── routes/            # AppRoutes (lazy-loaded pages), ProtectedRoute
│   │   ├── services/          # apiClient (Axios + CSRF) and one service per API area
│   │   ├── styles/index.css   # design tokens (colours, fonts, radii, shadows)
│   │   ├── test/              # test setup and render helper
│   │   ├── utils/             # formatting, validation, error helpers
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js         # dev proxy to Django + Vitest config
│   ├── .oxlintrc.json         # lint rules
│   ├── package.json
│   ├── package-lock.json
│   └── .env.example
├── docs/architecture.md       # data model and key design decisions
├── .gitignore
├── AGENTS.md                  # conventions for contributors and AI assistants
└── README.md
```

## 5. Prerequisites

| Tool | Version | Check |
| --- | --- | --- |
| Node.js | 20.19+ or 22.12+ (tested with 24.14) | `node --version` |
| npm | 10+ (tested with 11.9) | `npm --version` |
| Python | 3.12+ (tested with 3.14.3) | `python --version` (Linux/macOS: `python3 --version`) |
| Git | any recent version | `git --version` |

## 6. Install frontend dependencies

```bash
cd frontend
npm ci          # exact versions from package-lock.json (use `npm install` only to add/upgrade packages)
```

## 7. Create and activate a Python virtual environment

Windows PowerShell:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

If PowerShell blocks the activation script, run once:
`Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`

Linux / macOS:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
```

Your prompt now starts with `(.venv)`. Activate it in every new terminal before running
`python manage.py …`.

## 8. Install backend dependencies

```bash
pip install -r requirements.txt
```

## 9. Database (SQLite)

The project uses **SQLite** — there is no database server to install. Python includes
SQLite, and Django creates the database file `backend/db.sqlite3` the first time you run
`python manage.py migrate` (section 12). The file name can be changed with `SQLITE_PATH`
in `backend/.env`.

The database is configured for safe concurrent use:

- `transaction_mode: IMMEDIATE` — every transaction takes SQLite's write lock at the start,
  so two customers checking out the last item at the same moment are processed one after
  the other and stock can never go negative.
- WAL journal mode — pages can still be read while an order is being written.
- A 20-second lock timeout before a busy database reports an error.

`db.sqlite3` is ignored by Git — it contains customer data and must never be committed.

## 10. Back up the database

SQLite stores everything in one file, so a backup is a copy of that file. Use SQLite's
online backup (safe while the server is running) via Django's database shell or Python:

Windows PowerShell:

```powershell
cd backend
.\.venv\Scripts\python.exe -c "import sqlite3; s=sqlite3.connect('db.sqlite3'); d=sqlite3.connect('backup.sqlite3'); s.backup(d); d.close(); s.close()"
```

Linux / macOS:

```bash
cd backend
.venv/bin/python -c "import sqlite3; s=sqlite3.connect('db.sqlite3'); d=sqlite3.connect('backup.sqlite3'); s.backup(d); d.close(); s.close()"
```

Store backups outside the project folder (they are ignored by Git via `*.sqlite3`). To
start over in development only, stop the server, delete `db.sqlite3` and run
`python manage.py migrate` again. Never delete the production database to fix a
migration problem.

## 11. Configure environment variables

### Backend — `backend/.env`

Windows PowerShell: `Copy-Item backend\.env.example backend\.env`
Linux / macOS: `cp backend/.env.example backend/.env`

Generate a secret key and paste it into `DJANGO_SECRET_KEY`:

```bash
python -c "from django.core.management.utils import get_random_secret_key as k; print(k())"
```

| Variable | Purpose | Example |
| --- | --- | --- |
| `DJANGO_SECRET_KEY` | **Required.** Cryptographic signing key | long random string |
| `DJANGO_DEBUG` | `True` for local development only | `True` |
| `DJANGO_ALLOWED_HOSTS` | Comma-separated host names | `localhost,127.0.0.1` |
| `DJANGO_TIME_ZONE` | Store time zone | `Asia/Kolkata` |
| `SQLITE_PATH` | SQLite database file (relative to `backend/`) | `db.sqlite3` |
| `CORS_ALLOWED_ORIGINS` | Frontend origins allowed to call the API with cookies | `http://localhost:5173` |
| `CSRF_TRUSTED_ORIGINS` | Origins allowed to send unsafe requests | `http://localhost:5173` |
| `SHIPPING_FLAT_FEE` | Shipping charge in ₹ (0 = free) | `49.00` |
| `FREE_SHIPPING_THRESHOLD` | Order value for free shipping (0 = disabled) | `999.00` |
| `MAX_CART_ITEM_QUANTITY` | Max units of one item per order | `10` |
| `STORE_WHATSAPP_NUMBER` | WhatsApp number with country code, digits only. Empty hides the WhatsApp links | `91XXXXXXXXXX` |
| `GOOGLE_GEMINI_API_KEY` | Google AI Studio key for the beauty chat. Empty hides the “Ask us” button | (from aistudio.google.com/apikey) |
| `GEMINI_MODEL` | Gemini model id | `gemini-flash-latest` |
| `CHAT_THROTTLE_RATE` | Max chat requests per client | `20/min` |
| `FRONTEND_URL` | Storefront address used in password-reset email links | `http://localhost:5173` |
| `EMAIL_BACKEND` | Console backend prints emails in the Django terminal; use the SMTP backend in production | `django.core.mail.backends.console.EmailBackend` |
| `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `EMAIL_USE_TLS`, `DEFAULT_FROM_EMAIL` | SMTP details from your mail provider (keep them only in `backend/.env`) | — |

The app stops at start-up with a clear message if a required variable is missing.

### Frontend — `frontend/.env.local` (optional)

The defaults work for local development. Copy `frontend/.env.example` to
`frontend/.env.local` only to change them.

| Variable | Purpose | Default |
| --- | --- | --- |
| `VITE_API_BASE_URL` | API base URL used by the browser | `/api` |
| `VITE_DEV_BACKEND_URL` | Where the dev server proxies `/api` and `/media` | `http://127.0.0.1:8000` |

Everything prefixed `VITE_` is public (bundled into the JavaScript). Never put secrets there.

## 12. Run Django migrations

```bash
cd backend            # with the virtual environment activated
python manage.py migrate
python manage.py seed_catalog          # optional: sample categories, products and coupon WELCOME10
python manage.py attach_sample_images  # optional: 3 placeholder photos per sample product
```

`seed_catalog` only runs when `DJANGO_DEBUG=True`. It also adds skincare routine steps,
seven concerns (acne, oily skin, dull skin, pigmentation, dryness, tanning, frizzy hair),
three sample looks and 2–3 sample reviews per product. The reviews come from six
`*.sample@example.com` customers that have no usable password. They are demo data for local
development only: never run `seed_catalog` against the live shop, where only customers with a
delivered order can review. Running it again only adds what is missing.

`attach_sample_images` (also `DJANGO_DEBUG=True` only) tops every sample product up to three
photos: free CC0 photos downloaded from the web, then AI-generated photos stored in
`backend/apps/catalog/sample_images/` (files ending in `-ai.jpg`). Replace them with real
product photos in Django Admin (Catalog → Products → product → Images).

### Adding videos

The home page uses six AI-generated portrait clips (720×1280, about 1.5 MB each) from
`frontend/public/videos/`. They are all set in `frontend/src/constants/media.js`:

- **Banner video** (`HERO_VIDEO`, currently `brand-intro.mp4`): fills the banner behind the
  text on phones and floats in a tall card beside the text on larger screens. Set `src` to
  `null` to show animated colours and bestseller photos instead.
- **"Watch & shop" strip** (`VIDEO_REELS`): `serum`, `blush`, `eyeshadow`, `cream`, `palette`
  and `collection`. Each has a title and a shop link. To add one, copy the MP4 into the folder
  and add an entry.
- `start` / `loopEnd` choose which seconds repeat. The clips open on a black frame or end
  on a logo card, so they loop between those parts.
- Videos play muted, only while visible, and stay still for visitors who turn on
  "reduce motion".
- **Look videos:** upload an MP4 or WebM in Django Admin → Looks.
- Keep videos short and compressed (under about 5 MB) so phones load them quickly.

## 13. Create a Django superuser

```bash
python manage.py createsuperuser
```

You are asked for email, first name, last name and password. Sign in at
<http://127.0.0.1:8000/admin/>, or at <http://localhost:5173/admin/> while the frontend
development server is running (it forwards `/admin` and `/static` to Django).

## 14. Start the frontend development server

```bash
cd frontend
npm run dev
```

Open <http://localhost:5173>. The dev server forwards `/api/*`, `/admin/*`, `/static/*` and
`/media/*` to Django, so start the backend too. For a single-server run without Vite, see
[section 18](#18-build-the-frontend-and-run-on-one-server).

### Open it on a phone (same Wi-Fi)

1. Find this computer's Wi-Fi address (Windows: `ipconfig`, look for "IPv4 Address", e.g. `192.168.1.20`).
2. Add it to `DJANGO_ALLOWED_HOSTS` in `backend/.env`, e.g. `localhost,127.0.0.1,192.168.1.20`,
   and restart Django. Django can keep listening on `127.0.0.1`; the phone only talks to Vite,
   which forwards the phone's host so image URLs and CSRF checks use that address.
3. Start the frontend with `npm run dev:phone` instead of `npm run dev`. Vite prints a
   "Network" address such as `http://192.168.1.20:5173`.
4. Open that address in the phone's browser. If it does not load, allow Node.js through the
   Windows firewall for **private** networks.

Only do this on a trusted home/office network: the development server is not hardened for the internet.

## 15. Start the Django backend

```bash
cd backend            # with the virtual environment activated
python manage.py runserver 127.0.0.1:8000
```

Health check: <http://127.0.0.1:8000/api/health/> → `{"status": "ok"}`.

## 16. API endpoint overview

All endpoints are under `/api/`. Authentication uses the Django session cookie; unsafe
requests (POST/PATCH/DELETE) must send the `X-CSRFToken` header (the frontend does this
automatically). Errors always look like `{"detail": "...", "errors": {"field": ["..."]}}`.

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| GET | `/api/health/` | — | Health check |
| GET | `/api/auth/csrf/` | — | Sets the `csrftoken` cookie |
| POST | `/api/auth/register/` | — | Create account and sign in |
| POST | `/api/auth/login/` | — | Sign in (`email`, `password`) |
| POST | `/api/auth/logout/` | user | Sign out |
| POST | `/api/auth/password-reset/` | — | Email a reset link `{email}` (same reply whether or not the account exists) |
| POST | `/api/auth/password-reset/confirm/` | — | Set a new password `{uid, token, new_password}` |
| GET | `/api/auth/session/` | — | Signed-in user, or `{"user": null}` |
| GET / PATCH | `/api/auth/me/` | user | Current user profile |
| GET / POST | `/api/auth/addresses/` | user | List / create addresses |
| GET / PATCH / DELETE | `/api/auth/addresses/{id}/` | user | Manage one address |
| GET | `/api/catalog/categories/` | — | Active categories |
| GET | `/api/catalog/brands/` | — | Active brands |
| GET | `/api/catalog/concerns/` | — | Active skin/hair concerns (shop by concern) |
| GET | `/api/catalog/skin-types/` | — | Skin types for the skin quiz |
| GET | `/api/catalog/routine/` | — | Skin quiz result. Query: `skin_type`, `concern` (slugs), `max_price`. Returns morning/night steps, `bag_variant_ids` and `total_price` |
| GET | `/api/catalog/products/` | — | Paginated products. Query: `search`, `category`, `brand`, `concern` (comma-separated slugs), `min_price`, `max_price`, `in_stock=true`, `featured=true`, `ids` (comma-separated product ids, max 24), `ordering` (`newest`, `price_asc`, `price_desc`, `rating`, `name`), `page`, `page_size` (max 48) |
| GET | `/api/catalog/products/{slug}/` | — | Product detail with variants, images, net quantity and rating breakdown |
| GET | `/api/catalog/products/{slug}/related/` | — | Up to four products from the same category |
| GET / POST | `/api/catalog/products/{slug}/reviews/` | POST: user with delivered order | Reviews |
| GET / DELETE | `/api/cart/` | user | View / empty the bag |
| POST | `/api/cart/items/` | user | Add `{variant_id, quantity}` |
| PATCH / DELETE | `/api/cart/items/{id}/` | user | Change quantity / remove |
| GET / POST | `/api/wishlist/` | user | Saved products / save `{product_id}` |
| DELETE | `/api/wishlist/{product_id}/` | user | Remove a saved product |
| POST | `/api/orders/quote/` | user | Price the bag with optional `coupon_code` |
| GET / POST | `/api/orders/` | user | Order history / place order `{address_id, idempotency_key, coupon_code?, customer_note?}` |
| GET | `/api/orders/{number}/` | user | Order detail |
| POST | `/api/orders/{number}/cancel/` | user | Cancel a pending/confirmed order |
| GET | `/api/store/settings/` | — | Public shop settings: shipping fee, free-shipping threshold, WhatsApp number, `chat_enabled` |
| POST | `/api/store/newsletter/` | — | Newsletter signup `{email}` (subscribers are listed in Django Admin) |
| POST | `/api/store/chat/` | — | Beauty assistant `{message, history?}`. Needs `GOOGLE_GEMINI_API_KEY`. Returns `{reply}` |
| GET | `/api/looks/` | — | Active looks (cards) |
| GET | `/api/looks/{slug}/` | — | One look with its steps, `bag_variant_ids` and `total_price` |

## 17. Run tests

Backend (uses a temporary in-memory test database; your `db.sqlite3` is not touched):

```bash
cd backend
python manage.py test apps
```

Frontend:

```bash
cd frontend
npm test            # single run
npm run test:watch  # re-run on file changes
npm run lint
```

## 18. Build the frontend and run on one server

While you are coding, use **two** terminals (Vite on `:5173` + Django on `:8000`) so the
UI reloads when you save a file. When you want a single process — like a normal deploy —
build the frontend once, then only run Django:

```bash
cd frontend
npm run build       # writes frontend/dist/ (ignored by Git)

cd ../backend
# with the virtual environment activated
python manage.py runserver 127.0.0.1:8000
```

Open <http://127.0.0.1:8000/>. Django serves the shop UI from `frontend/dist/`, plus `/api`,
`/admin` and `/media`. You do **not** need the Vite terminal.

If `frontend/dist/` is missing, the home page returns a short message telling you to run
`npm run build`. Rebuild after frontend changes; Django does not watch React files.

Optional checks and email links when using the built shop:

```bash
npm run preview     # from frontend/: serve dist alone (no API) to inspect the build
```

Set `FRONTEND_URL=http://127.0.0.1:8000` in `backend/.env` so password-reset emails point at
the Django address. Keep `http://localhost:5173` while you develop with Vite.

## 19. Configure Git and GitHub

```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"

# create an empty repository on GitHub (no README / .gitignore), then:
git remote add origin https://github.com/<your-account>/<repository>.git
git push -u origin main
```

## 20. Push code without uploading node_modules or secrets

The root `.gitignore` already excludes `node_modules/`, `dist/`, `.venv/`, `__pycache__/`,
`.env` files (but keeps `.env.example`), `*.sqlite3`, `backend/media/` and editor files.
Before every commit:

```bash
git status                 # node_modules, .venv, .env and db.sqlite3 must NOT be listed
git add .
git diff --cached --stat   # review exactly what will be committed
git commit -m "Describe the change"
git push
```

Check that a file is ignored: `git check-ignore -v backend/.env`.

If something was committed by mistake, stop tracking it without deleting your local copy:

```bash
git rm -r --cached frontend/node_modules
git rm --cached backend/.env
git commit -m "Stop tracking generated/secret files"
```

If a secret (password, key) was ever pushed, treat it as leaked: change it immediately.
Removing it from history requires rewriting history — coordinate with your team before
force-pushing.

## 21. Troubleshooting

| Problem | Fix |
| --- | --- |
| `ImproperlyConfigured: Missing required environment variable` | Create `backend/.env` from `.env.example` and fill in the value named in the message. |
| `no such table: …` | Run `python manage.py migrate`. |
| `database is locked` | Another process held a write lock for over 20 seconds. Close tools that have `db.sqlite3` open (e.g. a DB browser with uncommitted changes) and retry. |
| `unable to open database file` | The `backend` folder (or the folder in `SQLITE_PATH`) must be writable by the user running Django. |
| Frontend shows "Cannot reach the server" | Start Django on `127.0.0.1:8000`, or set `VITE_DEV_BACKEND_URL`. |
| Home page says "Frontend is not built yet" | Run `npm run build` in `frontend/`, then open `http://127.0.0.1:8000/` again (or use Vite on `:5173`). |
| `403 CSRF Failed` / `CSRF cookie not set` | Use one origin only: either Vite (`localhost:5173`) or Django serving the build (`127.0.0.1:8000`). If the frontend is on another origin, add it to both `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS`. |
| CORS error in the browser console | Add the exact frontend origin (scheme + host + port) to `CORS_ALLOWED_ORIGINS`. |
| `No migrations to apply` but tables are missing | Check `SQLITE_PATH` points at the expected file. |
| Migration conflict after pulling | `python manage.py makemigrations --merge`, review, then `migrate`. Never drop a production database to fix migrations. |
| `Activate.ps1 cannot be loaded` | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
| Vitest "Timeout waiting for worker" | Already mitigated with `maxWorkers: 1`; close other heavy programs and retry. |

## 22. Production deployment overview

1. **Database:** SQLite on the server's local disk (not a network drive). Keep
   `db.sqlite3` outside the web root, make it writable only by the app user, and schedule
   regular backups with the method in section 10. Run a single server machine — SQLite
   cannot be shared by several servers.
2. **Backend:** `DJANGO_DEBUG=False`, strong `DJANGO_SECRET_KEY`, real
   `DJANGO_ALLOWED_HOSTS`. Run behind a WSGI server such as Gunicorn (add it to
   `requirements.txt` on the server) and a reverse proxy (Nginx/Caddy) with HTTPS. When
   `DEBUG` is off the settings enable HTTPS redirect, secure cookies and HSTS.
   Run `python manage.py migrate` and `python manage.py collectstatic` on each deploy.
3. **Media:** product images are uploaded to `backend/media/` by default. In production
   serve them from the reverse proxy or object storage (e.g. S3-compatible) — Django only
   serves media when `DEBUG=True`.
4. **Frontend:** `npm ci && npm run build`. Django can serve `frontend/dist/` itself
   (`config.spa`) on a single machine. For a larger deploy, let the reverse proxy serve
   `dist/` and forward `/api`, `/admin`, `/static` and `/media` to Django (no CORS needed).
   If the frontend is on a different origin, list it in `CORS_ALLOWED_ORIGINS` and
   `CSRF_TRUSTED_ORIGINS`.
5. **SPA routing:** Django already returns `index.html` for unknown paths when it serves
   the build. If the proxy serves `dist/` instead, configure it the same way.
6. **Operations:** log aggregation, error monitoring (e.g. Sentry), uptime checks, and
   regular restore tests of database backups.

## 23. Current limitations and unfinished features

- **Online payments are not implemented.** Only Cash on Delivery. The `payments` app keeps
  payment state separate from order status; a gateway (e.g. Razorpay) must verify payments
  on the server (signature/webhook with duplicate-event protection) before marking them paid.
- **Shipping** is a configurable flat fee + free-shipping threshold. No courier/tracking
  integration yet.
- **Guest checkout is not supported** — customers sign in to use the bag (by design for the MVP).
- Password reset emails print in the Django terminal until an SMTP provider is configured
  (`EMAIL_*` settings). There are no order notification emails yet, and newsletter signups
  are only collected (no emails are sent from the app).
- Policy pages (`frontend/src/constants/policies.js`) are drafts; the owner should review them
  and add business contact details before going live.
- No product variants beyond a single option (shade *or* size), or tax invoices.
- Reports are limited to Django Admin lists, filters and date drill-downs.
- Brand logo and product photography are pending. The header and footer show a square
  "JBH" placeholder mark next to the wordmark. To add the real logo, save it as
  `frontend/public/logo.svg` (or `.png`) and set `STORE_LOGO_SRC = '/logo.svg'` in
  `frontend/src/constants/navigation.js`; also replace `frontend/public/favicon.svg`.
  Products without photos show neutral image placeholders.
- The skin quiz picks products by their routine step, skin types and concerns. Those must be
  set on each skincare product in Django Admin; steps with no matching product show
  "No match yet". The quiz gives product suggestions, not medical advice.
- SQLite allows one write at a time. That is fine for a small-to-medium store on one
  server; very high order volume or multiple app servers would need a database server.

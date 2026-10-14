# AGENTS.md — conventions for this repository

Guidance for developers and AI coding assistants working on Jordan Beauty Hub.
Read `README.md` for setup and `docs/architecture.md` for the data model.

## Stack rules

- Frontend: React + **JavaScript/JSX only** (`.jsx` components, `.js` utilities). No TypeScript, no Next.js.
- Styling: Tailwind CSS 4 using the tokens in `frontend/src/styles/index.css`. Do not hard-code
  hex colours, radii or shadows in components — add or change a token instead.
- Backend: Django + Django REST Framework with **SQLite** as the only database (configured in
  `backend/config/settings.py` with immediate transactions and WAL mode). Do not add another
  database engine without the owner's approval.
- Package managers: npm (keep `package-lock.json` committed) and pip with `requirements.txt`.
  Avoid adding dependencies when a few lines of clear code will do.

## Backend conventions

- Keep views thin. Business rules belong in `apps/<app>/services.py`.
- Change stock **only** through `apps.catalog.services.change_stock()`.
- Change order status **only** through `apps.orders.services.change_order_status()`.
- Money: `DecimalField` / `Decimal`, never float. Compute every total on the server.
- Every schema change needs a migration (`python manage.py makemigrations`), committed with the code.
- New endpoints need explicit permissions and tests (`apps/<app>/tests.py`, helpers in
  `apps/test_factories.py`).
- Never expose secrets, password hashes or other customers' data. Never disable CSRF/CORS
  protections to make a request work.

## Frontend conventions

- Reuse components in `src/components/common`, `forms`, `layout`, `products`, `cart` before
  writing new JSX for the same purpose.
- All HTTP calls go through `src/services/*` (which use `apiClient.js`). No hard-coded backend URLs.
- Data loading: `useApi`. Forms: `useForm` + `FormField`. Notifications: `useToast`.
- Every data view handles loading, empty, error and success states.
- Accessibility: semantic elements, labels for every control, visible focus, keyboard support.
- Repeated navigation/category data lives in `src/constants/`.

## Commands (must pass before committing)

```bash
# backend (virtual environment active)
cd backend && python manage.py test apps && python manage.py makemigrations --check --dry-run

# frontend
cd frontend && npm run lint && npm test && npm run build
```

## Git

- Never commit `node_modules/`, `.venv/`, `.env`, `*.sqlite3`, `dist/` or `backend/media/`.
- Review `git diff --cached` before committing. Do not push or force-push without the owner's approval.

# Firebase Phone Auth (OTP) Integration Guide (real100agro)

Use this document to port phone OTP login into another copy of this codebase.

Related: [Razorpay-Delhivery-Integration.md](./Razorpay-Delhivery-Integration.md)

---

## 1. Live credentials (current project)

Put these in `.env`. Do **not** commit secrets to git if you rotate them; the web API key is a browser key (still restrict it in GCP).

```env
# --- Firebase Phone Auth (OTP) ---
FIREBASE_PROJECT_ID=kushnath-19401
FIREBASE_WEB_API_KEY=AIzaSyAvRobkSXCsNFOdogIFwKuN95nLOQIkXoI
# Production: ALLOW_DEMO_AUTH=0
# Local only: ALLOW_DEMO_AUTH=1 enables OTP 1234 without SMS
ALLOW_DEMO_AUTH=0
DEMO_OTP=1234
# Optional (not used by current verifier — JWT public keys are enough):
# FIREBASE_CREDENTIALS_PATH=
```

| Field | Value |
| --- | --- |
| Firebase project ID | `kushnath-19401` |
| Web API key (Identity Toolkit) | `AIzaSyAvRobkSXCsNFOdogIFwKuN95nLOQIkXoI` |
| Demo OTP (local only) | `1234` when `ALLOW_DEMO_AUTH=1` |

**Python deps** (already in `requirements.txt`):

```text
PyJWT[crypto]>=2.8,<2.11
```

No `firebase-admin` is required for the current login path (token is verified with Google JWKs).

---

## 2. Architecture (important)

This project does **not** use Firebase Auth JS `RecaptchaVerifier` / `signInWithPhoneNumber` from the Firebase SDK.

It uses **Identity Toolkit REST + Google reCAPTCHA (invisible)** in the browser, then posts the Firebase **ID token** to Django, which verifies it with Google’s public keys and issues a **DRF Token**.

```
Browser                          Google                         Django API
───────                          ──────                         ─────────
GET /api/auth/config/
  ← firebase_web_api_key, demo_auth

GET  .../v1/recaptchaParams?key=WEB_KEY
  ← recaptchaSiteKey
grecaptcha.execute(invisible)
POST .../v1/accounts:sendVerificationCode
  { phoneNumber: "+91XXXXXXXXXX", recaptchaToken }
  ← sessionInfo
        SMS arrives to phone

POST .../v1/accounts:signInWithPhoneNumber
  { sessionInfo, code }
  ← idToken

POST /api/auth/firebase-login/
  { id_token: idToken }
  ← { token: DRF_TOKEN, user }
Store DRF token → Authorization: Token …
```

Why REST: Firebase JS `RecaptchaVerifier` was returning `auth/invalid-api-key` on the storefront domain even when the browser key was valid. REST + grecaptcha works with the same web API key.

---

## 3. Settings wiring

**File:** `config/settings.py`

```python
FIREBASE_PROJECT_ID = env("FIREBASE_PROJECT_ID", "kushnath-19401")
FIREBASE_CREDENTIALS_PATH = env("FIREBASE_CREDENTIALS_PATH")
FIREBASE_WEB_API_KEY = env(
    "FIREBASE_WEB_API_KEY",
    "AIzaSyAvRobkSXCsNFOdogIFwKuN95nLOQIkXoI",
)
ALLOW_DEMO_AUTH = env_bool("ALLOW_DEMO_AUTH", False)
DEMO_OTP = env("DEMO_OTP", "1234")
```

---

## 4. Backend files

| File | Role |
| --- | --- |
| `apps/accounts/firebase_auth.py` | Verify Firebase ID token (or `demo:+91…`) → phone |
| `apps/accounts/views.py` | `AuthConfigView`, `FirebaseLoginView` |
| `apps/accounts/urls.py` | `/auth/config/`, `/auth/firebase-login/` |
| `apps/accounts/models.py` | `User` keyed by phone |

### Auth config

`GET /api/auth/config/` →

```json
{
  "demo_auth": false,
  "demo_otp": "",
  "firebase": true,
  "firebase_project_id": "kushnath-19401",
  "firebase_web_api_key": "AIzaSyAvRobkSXCsNFOdogIFwKuN95nLOQIkXoI",
  "razorpay": true,
  "razorpay_key_id": "rzp_live_…"
}
```

### Firebase login

`POST /api/auth/firebase-login/`

```json
{ "id_token": "<Firebase ID token or demo:+9198…>" }
```

Response:

```json
{ "token": "<DRF token>", "user": { "phone": "+91…", "name": "", "email": "" } }
```

### Token verification (`firebase_auth.py`)

```python
# Demo bypass (ALLOW_DEMO_AUTH only):
#   id_token == "demo:+91XXXXXXXXXX" → return that phone

# Live:
#   PyJWKClient → https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com
#   jwt.decode(..., aud=FIREBASE_PROJECT_ID,
#              iss=f"https://securetoken.google.com/{FIREBASE_PROJECT_ID}")
#   return decoded["phone_number"]
```

Then:

```python
user, _ = User.objects.get_or_create(phone=phone, defaults={"username": phone})
token, _ = Token.objects.get_or_create(user=user)
```

---

## 5. Frontend files

| File | Role |
| --- | --- |
| `frontend/assets/js/api.js` | `sendOtp`, `verifyOtp`, reCAPTCHA, Identity Toolkit calls |
| `frontend/assets/js/store.js` | `requestOtp` → `verifyOtp` → `firebase-login` → save DRF token |
| `frontend/assets/js/commerce.js` | Login modal UI (phone + OTP) |

### Default web key in JS (fallback)

```js
var DEFAULT_FIREBASE_API_KEY = "AIzaSyAvRobkSXCsNFOdogIFwKuN95nLOQIkXoI";
```

Prefer key from `/auth/config/` (`firebase_web_api_key`).

### Identity Toolkit endpoints used

| Step | URL |
| --- | --- |
| reCAPTCHA params | `GET https://identitytoolkit.googleapis.com/v1/recaptchaParams?key=WEB_KEY` |
| Send OTP | `POST https://identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key=WEB_KEY` |
| Verify OTP | `POST https://identitytoolkit.googleapis.com/v1/accounts:signInWithPhoneNumber?key=WEB_KEY` |

Send body:

```json
{ "phoneNumber": "+91XXXXXXXXXX", "recaptchaToken": "…" }
```

Verify body:

```json
{ "sessionInfo": "…", "code": "123456" }
```

reCAPTCHA script:

```text
https://www.google.com/recaptcha/api.js?onload=__real100agroRecaptchaReady&render=explicit
```

Invisible widget site key comes from `recaptchaParams` (not hard-coded).

### Demo OTP behaviour

When `ALLOW_DEMO_AUTH=1` **and** host is localhost / 127.0.0.1:

- `sendOtp` skips SMS and uses demo OTP from config (`1234`)
- `verifyOtp` returns string `demo:+91XXXXXXXXXX`
- Backend accepts that only if `ALLOW_DEMO_AUTH` is true

Overrides:

- `window.REAL100AGRO_USE_DEMO_AUTH = true` → force demo
- `window.REAL100AGRO_FORCE_FIREBASE = true` → force real Firebase even on localhost

**Production must use `ALLOW_DEMO_AUTH=0`.**

---

## 6. Google Cloud / Firebase console checklist

1. Firebase project **`kushnath-19401`** (or your new project).
2. Authentication → Sign-in method → **Phone** enabled.
3. SMS region policy allows **India** (+91).
4. Authorized domains include:
   - `localhost`
   - `real100agro.com`
   - `real100agro.in`
   - any other storefront host
5. Google Cloud → Credentials → Browser API key:
   - Application restrictions: HTTP referrers for your domains (and `localhost`)
   - API restrictions: include **Identity Toolkit API** (or “Don’t restrict key” while debugging)
6. Billing / SMS quota enabled for Phone Auth.

Common errors and meaning (also mapped in `api.js`):

| Error | Fix |
| --- | --- |
| `API_KEY` / invalid-api-key | Key restrictions / Identity Toolkit not allowed |
| `OPERATION_NOT_ALLOWED` | Enable Phone sign-in / region |
| `CAPTCHA` / reCAPTCHA | Refresh; check authorized domains |
| `TOO_MANY_ATTEMPTS` | Wait / quota |

---

## 7. Porting checklist (another code version)

1. Copy env keys from §1 into the other project’s `.env`.
2. Copy/adapt:
   - `apps/accounts/firebase_auth.py`
   - `AuthConfigView` + `FirebaseLoginView`
   - URL routes `auth/config/`, `auth/firebase-login/`
   - Frontend `sendOtp` / `verifyOtp` block in `api.js`
   - Login UI wiring in store/commerce
3. Ensure user model can key accounts by phone (`+91…`).
4. Install `PyJWT[crypto]`.
5. Set `ALLOW_DEMO_AUTH=0` on production.
6. Add domains + API key restrictions in GCP for the new front-end origin.
7. Smoke test:
   - Local demo: `ALLOW_DEMO_AUTH=1` → OTP `1234`
   - Real SMS: `ALLOW_DEMO_AUTH=0` → receive SMS → login → DRF token stored

---

## 8. Quick smoke tests

```bash
# Config exposes web key (public) + demo flag
curl http://127.0.0.1:8000/api/auth/config/

# After frontend verifyOtp returns idToken:
curl -X POST http://127.0.0.1:8000/api/auth/firebase-login/ \
  -H "Content-Type: application/json" \
  -d '{"id_token":"<FIREBASE_ID_TOKEN>"}'

# Demo (only if ALLOW_DEMO_AUTH=1):
curl -X POST http://127.0.0.1:8000/api/auth/firebase-login/ \
  -H "Content-Type: application/json" \
  -d '{"id_token":"demo:+918181818181"}'
```

---

## 9. File map

```
real100/
  .env / .env.example
  config/settings.py
  apps/accounts/firebase_auth.py
  apps/accounts/views.py          # AuthConfigView, FirebaseLoginView
  apps/accounts/urls.py
  apps/accounts/models.py         # User.phone
  frontend/assets/js/api.js       # Identity Toolkit + grecaptcha
  frontend/assets/js/store.js     # requestOtp / verifyOtp → DRF token
  frontend/assets/js/commerce.js  # login modal
```

---

*Generated for porting real100agro Firebase phone OTP into another version of the same stack.*

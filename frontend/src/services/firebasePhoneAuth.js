/**
 * Firebase phone OTP via Identity Toolkit REST + invisible Google reCAPTCHA.
 * Avoids the Firebase JS RecaptchaVerifier path (see Firebase-Phone-Auth-Integration.md).
 */

const DEFAULT_FIREBASE_API_KEY = 'AIzaSyAvRobkSXCsNFOdogIFwKuN95nLOQIkXoI'
const IDENTITY_TOOLKIT = 'https://identitytoolkit.googleapis.com/v1'
const RECAPTCHA_SCRIPT =
  'https://www.google.com/recaptcha/api.js?onload=__jbhRecaptchaReady&render=explicit'

let authConfigPromise = null
let recaptchaReadyPromise = null
let recaptchaWidgetId = null
let sessionInfo = null
let pendingPhone = null

function isLocalHost() {
  if (typeof window === 'undefined') return false
  const host = window.location.hostname
  return host === 'localhost' || host === '127.0.0.1'
}

function mapFirebaseError(message = '') {
  const text = String(message)
  if (/API_KEY|invalid-api-key|API key not valid/i.test(text)) {
    return 'Phone sign-in is misconfigured (API key). Please try again later.'
  }
  if (/OPERATION_NOT_ALLOWED/i.test(text)) {
    return 'Phone sign-in is not enabled yet. Please use email or try later.'
  }
  if (/CAPTCHA|RECAPTCHA/i.test(text)) {
    return 'Security check failed. Refresh the page and try again.'
  }
  if (/TOO_MANY_ATTEMPTS|QUOTA/i.test(text)) {
    return 'Too many attempts. Please wait a bit and try again.'
  }
  if (/SESSION_EXPIRED|INVALID_SESSION/i.test(text)) {
    return 'That code expired. Request a new one.'
  }
  if (/INVALID_CODE|INVALID_OTP/i.test(text)) {
    return 'That code is incorrect. Please try again.'
  }
  return text || 'Could not complete phone sign-in. Please try again.'
}

export function normalizeIndianPhone(input) {
  const raw = String(input || '')
    .trim()
    .replace(/[\s-]/g, '')
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 10) return `+91${digits}`
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`
  if (raw.startsWith('+') && digits.length >= 10 && digits.length <= 15) return `+${digits}`
  throw new Error('Enter a valid 10-digit Indian mobile number.')
}

async function loadAuthConfig(fetcher) {
  if (!authConfigPromise) {
    authConfigPromise = fetcher().catch((error) => {
      authConfigPromise = null
      throw error
    })
  }
  return authConfigPromise
}

function shouldUseDemoAuth(config) {
  if (typeof window !== 'undefined') {
    if (window.JBH_FORCE_FIREBASE === true) return false
    if (window.JBH_USE_DEMO_AUTH === true) return true
  }
  return Boolean(config?.demo_auth) && isLocalHost()
}

function ensureRecaptchaScript() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('reCAPTCHA needs a browser.'))
  }
  if (window.grecaptcha?.render) {
    return Promise.resolve(window.grecaptcha)
  }
  if (recaptchaReadyPromise) return recaptchaReadyPromise

  recaptchaReadyPromise = new Promise((resolve, reject) => {
    const previous = window.__jbhRecaptchaReady
    window.__jbhRecaptchaReady = () => {
      if (typeof previous === 'function') previous()
      resolve(window.grecaptcha)
    }
    const existing = document.querySelector('script[data-jbh-recaptcha]')
    if (existing) return
    const script = document.createElement('script')
    script.src = RECAPTCHA_SCRIPT
    script.async = true
    script.defer = true
    script.dataset.jbhRecaptcha = '1'
    script.onerror = () => {
      recaptchaReadyPromise = null
      reject(new Error('Could not load the security check. Check your connection.'))
    }
    document.head.appendChild(script)
  })
  return recaptchaReadyPromise
}

function ensureRecaptchaHost() {
  let host = document.getElementById('jbh-recaptcha-host')
  if (!host) {
    host = document.createElement('div')
    host.id = 'jbh-recaptcha-host'
    host.setAttribute('aria-hidden', 'true')
    host.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);'
    document.body.appendChild(host)
  }
  return host
}

async function getRecaptchaToken(apiKey) {
  const grecaptcha = await ensureRecaptchaScript()
  const paramsResponse = await fetch(
    `${IDENTITY_TOOLKIT}/recaptchaParams?key=${encodeURIComponent(apiKey)}`,
  )
  const params = await paramsResponse.json()
  if (!paramsResponse.ok) {
    throw new Error(mapFirebaseError(params.error?.message || 'reCAPTCHA setup failed'))
  }
  const siteKey = params.recaptchaSiteKey || params.recaptchaKey
  if (!siteKey) {
    throw new Error('Security check is unavailable. Please try again later.')
  }

  await new Promise((resolve) => {
    grecaptcha.ready(resolve)
  })

  const host = ensureRecaptchaHost()
  if (recaptchaWidgetId == null) {
    recaptchaWidgetId = grecaptcha.render(host, {
      sitekey: siteKey,
      size: 'invisible',
    })
  } else {
    grecaptcha.reset(recaptchaWidgetId)
  }

  return grecaptcha.execute(recaptchaWidgetId)
}

async function identityPost(path, apiKey, body) {
  const response = await fetch(`${IDENTITY_TOOLKIT}/${path}?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await response.json()
  if (!response.ok) {
    throw new Error(mapFirebaseError(data.error?.message || 'Request failed'))
  }
  return data
}

/**
 * @param {() => Promise<object>} fetchConfig — usually authService.getAuthConfig
 * @param {string} phoneInput — 10-digit or +91 number
 */
export async function sendOtp(fetchConfig, phoneInput) {
  const phone = normalizeIndianPhone(phoneInput)
  const config = await loadAuthConfig(fetchConfig)

  if (shouldUseDemoAuth(config)) {
    sessionInfo = 'demo'
    pendingPhone = phone
    return { phone, demo: true, demoOtp: config.demo_otp || '1234' }
  }

  if (!config.firebase || !config.firebase_web_api_key) {
    throw new Error('Phone sign-in is not configured on this store yet.')
  }

  const apiKey = config.firebase_web_api_key || DEFAULT_FIREBASE_API_KEY
  const recaptchaToken = await getRecaptchaToken(apiKey)
  const data = await identityPost('accounts:sendVerificationCode', apiKey, {
    phoneNumber: phone,
    recaptchaToken,
  })
  sessionInfo = data.sessionInfo
  pendingPhone = phone
  return { phone, demo: false }
}

/**
 * @returns {Promise<string>} Firebase ID token or `demo:+91…`
 */
export async function verifyOtp(fetchConfig, code) {
  const otp = String(code || '').trim()
  if (!sessionInfo || !pendingPhone) {
    throw new Error('Request a code first.')
  }

  const config = await loadAuthConfig(fetchConfig)

  if (shouldUseDemoAuth(config) || sessionInfo === 'demo') {
    const expected = String(config.demo_otp || '1234')
    if (otp !== expected) {
      throw new Error('That code is incorrect. Please try again.')
    }
    return `demo:${pendingPhone}`
  }

  const apiKey = config.firebase_web_api_key || DEFAULT_FIREBASE_API_KEY
  const data = await identityPost('accounts:signInWithPhoneNumber', apiKey, {
    sessionInfo,
    code: otp,
  })
  if (!data.idToken) {
    throw new Error('Sign-in did not return a token. Please try again.')
  }
  return data.idToken
}

export function clearOtpSession() {
  sessionInfo = null
  pendingPhone = null
}

export function getPendingPhone() {
  return pendingPhone
}

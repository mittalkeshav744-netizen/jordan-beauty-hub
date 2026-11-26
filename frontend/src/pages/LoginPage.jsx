import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router'

import IntentChoice, {
  AUTH_INTENT_COURSE,
  AUTH_INTENT_SHOP,
  intentDescription,
  intentHome,
} from '../components/auth/IntentChoice'
import Button from '../components/common/Button'
import ErrorMessage from '../components/common/ErrorMessage'
import PasswordField from '../components/forms/PasswordField'
import AuthShell from '../components/layout/AuthShell'
import { useAuth } from '../hooks/useAuth'
import { useForm } from '../hooks/useForm'
import { authService } from '../services/authService'
import {
  clearOtpSession,
  getPendingPhone,
  normalizeIndianPhone,
  sendOtp,
  verifyOtp,
} from '../services/firebasePhoneAuth'
import { getErrorMessage } from '../utils/errors'
import { required, validEmail } from '../utils/validators'

const REMEMBER_KEY = 'jbh-remember-email'

function validateLogin(values) {
  return {
    email: required(values.email, 'Email') || validEmail(values.email),
    password: required(values.password, 'Password'),
  }
}

function readRememberedEmail() {
  try {
    return window.localStorage.getItem(REMEMBER_KEY) || ''
  } catch {
    return ''
  }
}

function ModeTabs({ mode, onChange }) {
  const tabClass = (value) =>
    `flex-1 rounded-btn px-3 py-2 text-xs font-semibold tracking-wide uppercase transition-colors ${
      mode === value
        ? 'bg-ink text-white hover:bg-ink-soft'
        : 'border border-line bg-surface text-ink-soft hover:bg-cream hover:text-ink'
    }`

  return (
    <div className="mb-4 flex gap-2" role="tablist" aria-label="Sign-in method">
      <button type="button" role="tab" aria-selected={mode === 'email'} className={tabClass('email')} onClick={() => onChange('email')}>
        Email
      </button>
      <button type="button" role="tab" aria-selected={mode === 'phone'} className={tabClass('phone')} onClick={() => onChange('phone')}>
        Phone OTP
      </button>
    </div>
  )
}

function PhoneOtpForm({ onSuccess }) {
  const { loginWithFirebase } = useAuth()
  const [step, setStep] = useState('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [demoHint, setDemoHint] = useState('')
  const [error, setError] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)

  useEffect(() => () => clearOtpSession(), [])

  const requestCode = async (event) => {
    event.preventDefault()
    setError('')
    setIsSending(true)
    try {
      normalizeIndianPhone(phone)
      const result = await sendOtp(() => authService.getAuthConfig(), phone)
      setDemoHint(result.demo ? `Local demo code: ${result.demoOtp}` : '')
      setStep('otp')
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setIsSending(false)
    }
  }

  const confirmCode = async (event) => {
    event.preventDefault()
    setError('')
    setIsVerifying(true)
    try {
      const idToken = await verifyOtp(() => authService.getAuthConfig(), otp)
      const loggedIn = await loginWithFirebase(idToken)
      clearOtpSession()
      onSuccess(loggedIn)
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setIsVerifying(false)
    }
  }

  if (step === 'otp') {
    return (
      <form onSubmit={confirmCode} noValidate className="space-y-4">
        {error ? <ErrorMessage message={error} /> : null}
        <p className="text-sm text-ink-soft">
          Enter the 6-digit code sent to{' '}
          <span className="font-semibold text-ink">{getPendingPhone() || phone}</span>.
        </p>
        {demoHint ? <p className="text-xs text-muted">{demoHint}</p> : null}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="login-otp" className="text-xs font-semibold tracking-wide text-ink-soft uppercase">
            OTP code <span className="text-accent">*</span>
          </label>
          <input
            id="login-otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            maxLength={6}
            placeholder="6-digit code"
            className="auth-beauty__input tracking-[0.3em]"
            value={otp}
            onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
          />
        </div>
        <Button type="submit" variant="accent" fullWidth size="lg" isLoading={isVerifying}>
          Verify &amp; sign in
        </Button>
        <button
          type="button"
          className="btn-text w-full text-sm"
          onClick={() => {
            clearOtpSession()
            setOtp('')
            setDemoHint('')
            setStep('phone')
          }}
        >
          Change number
        </button>
      </form>
    )
  }

  return (
    <form onSubmit={requestCode} noValidate className="space-y-4">
      {error ? <ErrorMessage message={error} /> : null}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="login-phone" className="text-xs font-semibold tracking-wide text-ink-soft uppercase">
          Mobile number <span className="text-accent">*</span>
        </label>
        <div className="flex gap-2">
          <span className="inline-flex h-11 items-center rounded-control border border-line bg-subtle px-3 text-sm font-semibold text-ink-soft">
            +91
          </span>
          <input
            id="login-phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            required
            maxLength={10}
            placeholder="10-digit mobile"
            className="auth-beauty__input min-w-0 flex-1"
            value={phone}
            onChange={(event) => setPhone(event.target.value.replace(/\D/g, '').slice(0, 10))}
          />
        </div>
        <p className="text-xs text-muted">We will text a one-time code. Standard SMS rates may apply.</p>
      </div>
      <Button type="submit" variant="accent" fullWidth size="lg" isLoading={isSending}>
        Send OTP
      </Button>
    </form>
  )
}

export default function LoginPage() {
  const { login, isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const from =
    location.state?.from ||
    (searchParams.get('next')?.startsWith('/') ? searchParams.get('next') : '') ||
    ''
  const defaultIntent =
    location.state?.intent === AUTH_INTENT_COURSE || (from && from.startsWith('/courses'))
      ? AUTH_INTENT_COURSE
      : AUTH_INTENT_SHOP
  const [intent, setIntent] = useState(defaultIntent)
  const redirectTo = useMemo(
    () => intentHome(intent, { from, user }),
    [intent, from, user],
  )
  const remembered = readRememberedEmail()
  const [rememberMe, setRememberMe] = useState(Boolean(remembered))
  const [mode, setMode] = useState('email')
  const form = useForm({ email: remembered, password: '' }, validateLogin)
  const emailField = form.field('email')
  const passwordField = form.field('password')

  useEffect(() => {
    if (remembered) setRememberMe(true)
  }, [remembered])

  if (isAuthenticated) return <Navigate to={redirectTo} replace />

  const finishLogin = (loggedIn) => {
    navigate(intentHome(intent, { from, user: loggedIn }), { replace: true })
  }

  const submit = async (values) => {
    try {
      if (rememberMe) {
        window.localStorage.setItem(REMEMBER_KEY, values.email.trim())
      } else {
        window.localStorage.removeItem(REMEMBER_KEY)
      }
    } catch {
      /* ignore storage failures */
    }
    const loggedIn = await login({ email: values.email, password: values.password })
    finishLogin(loggedIn)
  }

  const registerState = { ...(location.state || {}), from, intent }

  return (
    <AuthShell
      heading="Welcome back"
      description={intentDescription(intent)}
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link to="/register" state={registerState} className="font-semibold text-accent hover:underline">
            Create account
          </Link>
        </>
      }
    >
      <IntentChoice value={intent} onChange={setIntent} />

      <ModeTabs
        mode={mode}
        onChange={(next) => {
          clearOtpSession()
          setMode(next)
        }}
      />

      {mode === 'phone' ? (
        <PhoneOtpForm onSuccess={finishLogin} />
      ) : (
        <form onSubmit={form.handleSubmit(submit)} noValidate className="space-y-4">
          {form.formError ? <ErrorMessage message={form.formError} /> : null}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="login-email" className="text-xs font-semibold tracking-wide text-ink-soft uppercase">
              Email <span className="text-accent">*</span>
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
              className={`auth-beauty__input ${emailField.error ? 'border-danger' : ''}`}
              name={emailField.name}
              value={emailField.value}
              onChange={emailField.onChange}
              aria-invalid={emailField.error ? true : undefined}
            />
            {emailField.error ? <p className="text-xs text-danger">{emailField.error}</p> : null}
          </div>

          <PasswordField
            id="login-password"
            label="Password"
            autoComplete="current-password"
            required
            placeholder="Your password"
            name={passwordField.name}
            value={passwordField.value}
            onChange={passwordField.onChange}
            error={passwordField.error}
          />

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <label className="inline-flex items-center gap-2 text-ink-soft">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                className="h-4 w-4 rounded border-line text-accent focus:ring-accent"
              />
              Remember me
            </label>
            <Link to="/forgot-password" className="font-medium text-accent hover:underline">
              Forgot password?
            </Link>
          </div>

          <Button type="submit" variant="accent" fullWidth size="lg" isLoading={form.isSubmitting}>
            Sign in
          </Button>
        </form>
      )}
    </AuthShell>
  )
}

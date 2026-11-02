import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'

import Button from '../components/common/Button'
import ErrorMessage from '../components/common/ErrorMessage'
import PasswordField from '../components/forms/PasswordField'
import AuthShell from '../components/layout/AuthShell'
import { useAuth } from '../hooks/useAuth'
import { useForm } from '../hooks/useForm'
import { required, validEmail } from '../utils/validators'

const REMEMBER_KEY = 'jbh-remember-email'

function validateLogin(values) {
  return {
    email: required(values.email, 'Email') || validEmail(values.email),
    password: required(values.password, 'Password'),
  }
}

function homeForUser(user, from) {
  if (from) return from
  if (user?.is_staff) return '/manage'
  return '/'
}

function readRememberedEmail() {
  try {
    return window.localStorage.getItem(REMEMBER_KEY) || ''
  } catch {
    return ''
  }
}

export default function LoginPage() {
  const { login, isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from || ''
  const redirectTo = homeForUser(user, from)
  const remembered = readRememberedEmail()
  const [rememberMe, setRememberMe] = useState(Boolean(remembered))
  const form = useForm({ email: remembered, password: '' }, validateLogin)
  const emailField = form.field('email')
  const passwordField = form.field('password')

  useEffect(() => {
    if (remembered) setRememberMe(true)
  }, [remembered])

  if (isAuthenticated) return <Navigate to={redirectTo} replace />

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
    navigate(homeForUser(loggedIn, from), { replace: true })
  }

  return (
    <AuthShell
      heading="Welcome back"
      description="Sign in with your email and password to continue shopping at Jordan Beauty Hub."
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link to="/register" state={location.state} className="font-semibold text-accent hover:underline">
            Create account
          </Link>
        </>
      }
    >
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
    </AuthShell>
  )
}

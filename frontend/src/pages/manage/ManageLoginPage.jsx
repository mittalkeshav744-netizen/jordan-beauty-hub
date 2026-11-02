import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'

import Button from '../../components/common/Button'
import ErrorMessage from '../../components/common/ErrorMessage'
import { PageLoader } from '../../components/common/Spinner'
import FormField from '../../components/forms/FormField'
import Logo from '../../components/layout/Logo'
import { useAuth } from '../../hooks/useAuth'
import { useForm } from '../../hooks/useForm'
import { useToast } from '../../hooks/useToast'
import { required, validEmail } from '../../utils/validators'

function validateManageLogin(values) {
  return {
    email: required(values.email, 'Email') || validEmail(values.email),
    password: required(values.password, 'Password'),
  }
}

export default function ManageLoginPage() {
  const { user, isAuthenticated, isCheckingSession, login, logout } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [accessError, setAccessError] = useState('')
  const form = useForm({ email: '', password: '' }, validateManageLogin)

  useEffect(() => {
    document.title = 'Owner Portal Sign In · Jordan Beauty Hub'
    return () => {
      document.title = 'Jordan Beauty Hub'
    }
  }, [])

  if (isCheckingSession) return <PageLoader />

  const from = location.state?.from || ''
  const target = from && from.startsWith('/manage') && from !== '/manage/login' ? from : '/manage'

  if (isAuthenticated && user?.is_staff) {
    return <Navigate to={target} replace />
  }

  const handleSwitchAccount = async () => {
    await logout()
    setAccessError('')
  }

  const submit = async (values) => {
    setAccessError('')
    try {
      const loggedIn = await login(values)
      if (!loggedIn?.is_staff) {
        await logout()
        setAccessError(
          'Access denied. This account does not have owner or staff permissions. Please sign in with an authorized account.',
        )
        return
      }
      showToast('Welcome to Owner Portal.', 'success')
      navigate(target, { replace: true })
    } catch {
      // API error shown via form.formError
    }
  }

  return (
    <div className="flex min-h-[85vh] flex-col justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-md">
        <div className="flex flex-col items-center text-center">
          <Link to="/" className="inline-block rounded-control focus-visible:outline-accent">
            <Logo />
          </Link>

          <div className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-xs font-bold tracking-wide text-accent uppercase">
            <svg
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              aria-hidden="true"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Owner & Staff Access
          </div>

          <h1 className="mt-3 text-2xl font-bold tracking-tight text-ink sm:text-3xl font-display">
            Owner Portal Sign In
          </h1>
          <p className="mt-2 text-sm text-muted">
            Restricted administrative area. Authorized store managers and staff only.
          </p>
        </div>

        <div className="mt-8 rounded-card border border-line bg-surface p-6 shadow-card sm:p-8">
          {isAuthenticated && !user?.is_staff ? (
            <div className="space-y-4">
              <div className="rounded-control border border-warning/30 bg-warning-soft p-4 text-warning">
                <div className="flex items-start gap-3">
                  <span className="text-xl leading-none" aria-hidden="true">
                    🔒
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold">Staff Permissions Required</h2>
                    <p className="mt-1 text-xs text-ink-soft">
                      You are currently signed in as <strong>{user?.email}</strong>. This account does not have owner or staff permissions.
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted">
                To enter the Owner Portal, please switch to an authorized staff account or return to the shop.
              </p>
              <div className="space-y-2 pt-2">
                <Button type="button" fullWidth variant="outline" onClick={handleSwitchAccount}>
                  Sign in with Staff Account
                </Button>
                <Link
                  to="/"
                  className="flex min-h-11 w-full items-center justify-center rounded-btn bg-ink text-sm font-semibold tracking-[0.06em] text-white shadow-[0_1px_2px_rgb(17_17_17/0.12)] transition-[background-color,box-shadow,transform] hover:bg-ink-soft hover:shadow-[0_4px_12px_rgb(17_17_17/0.14)] active:scale-[0.98]"
                >
                  Return to Storefront
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={form.handleSubmit(submit)} noValidate className="space-y-4">
              {(accessError || form.formError) && (
                <ErrorMessage message={accessError || form.formError} />
              )}
              <FormField
                label="Staff Email"
                type="email"
                autoComplete="email"
                required
                {...form.field('email')}
              />
              <FormField
                label="Password"
                type="password"
                autoComplete="current-password"
                required
                {...form.field('password')}
              />
              <Button type="submit" fullWidth size="lg" isLoading={form.isSubmitting}>
                Sign in to Owner Portal
              </Button>
            </form>
          )}

          <div className="mt-6 border-t border-line pt-4 text-center">
            <Link to="/" className="text-xs text-muted hover:text-ink hover:underline">
              ← Return to Jordan Beauty Hub Store
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

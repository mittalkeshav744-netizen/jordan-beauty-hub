import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'

import IntentChoice, {
  AUTH_INTENT_COURSE,
  AUTH_INTENT_SHOP,
  intentHome,
  intentRegisterDescription,
} from '../components/auth/IntentChoice'
import Button from '../components/common/Button'
import ErrorMessage from '../components/common/ErrorMessage'
import FormField from '../components/forms/FormField'
import PasswordField from '../components/forms/PasswordField'
import AuthShell from '../components/layout/AuthShell'
import { useAuth } from '../hooks/useAuth'
import { useForm } from '../hooks/useForm'
import { minLength, required, validEmail, validPhone } from '../utils/validators'

function validateRegistration(values) {
  return {
    first_name: required(values.first_name, 'First name'),
    email: required(values.email, 'Email') || validEmail(values.email),
    phone: values.phone ? validPhone(values.phone) : '',
    password: required(values.password, 'Password') || minLength(values.password, 8),
    confirm_password:
      values.confirm_password === values.password ? '' : 'Passwords do not match.',
  }
}

export default function RegisterPage() {
  const { register, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from || ''
  const defaultIntent =
    location.state?.intent === AUTH_INTENT_COURSE || (from && String(from).startsWith('/courses'))
      ? AUTH_INTENT_COURSE
      : AUTH_INTENT_SHOP
  const [intent, setIntent] = useState(defaultIntent)
  const redirectTo = intentHome(intent, { from })
  const form = useForm(
    { first_name: '', last_name: '', email: '', phone: '', password: '', confirm_password: '' },
    validateRegistration,
  )
  const passwordField = form.field('password')
  const confirmField = form.field('confirm_password')

  if (isAuthenticated) return <Navigate to={redirectTo} replace />

  const submit = async ({ confirm_password: _confirm, ...values }) => {
    const newUser = await register(values)
    if (newUser?.email_verification_required) {
      navigate('/verify-email', {
        replace: true,
        state: { email: newUser.email, from: redirectTo, intent },
      })
      return
    }
    navigate(redirectTo, { replace: true })
  }

  const loginState = { ...(location.state || {}), from, intent }

  return (
    <AuthShell
      heading="Create account"
      description={intentRegisterDescription(intent)}
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" state={loginState} className="font-semibold text-accent hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <IntentChoice value={intent} onChange={setIntent} />
      <form onSubmit={form.handleSubmit(submit)} noValidate className="grid gap-4 sm:grid-cols-2">
        {form.formError ? (
          <div className="sm:col-span-2">
            <ErrorMessage message={form.formError} />
          </div>
        ) : null}
        <FormField label="First name" autoComplete="given-name" required {...form.field('first_name')} />
        <FormField label="Last name" autoComplete="family-name" {...form.field('last_name')} />
        <FormField
          label="Email"
          type="email"
          autoComplete="email"
          className="sm:col-span-2"
          required
          {...form.field('email')}
        />
        <FormField
          label="Phone"
          type="tel"
          autoComplete="tel"
          className="sm:col-span-2"
          {...form.field('phone')}
        />
        <PasswordField
          className="sm:col-span-2"
          label="Password"
          autoComplete="new-password"
          required
          hint="At least 8 characters; avoid common passwords."
          name={passwordField.name}
          value={passwordField.value}
          onChange={passwordField.onChange}
          error={passwordField.error}
        />
        <PasswordField
          className="sm:col-span-2"
          label="Confirm password"
          autoComplete="new-password"
          required
          name={confirmField.name}
          value={confirmField.value}
          onChange={confirmField.onChange}
          error={confirmField.error}
        />
        <Button
          type="submit"
          variant="accent"
          fullWidth
          size="lg"
          isLoading={form.isSubmitting}
          className="sm:col-span-2"
        >
          Create account
        </Button>
      </form>
    </AuthShell>
  )
}

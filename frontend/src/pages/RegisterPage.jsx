import { Link, Navigate, useLocation, useNavigate } from 'react-router'

import Button from '../components/common/Button'
import ErrorMessage from '../components/common/ErrorMessage'
import FormField from '../components/forms/FormField'
import AuthCard from '../components/layout/AuthCard'
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
  const redirectTo = location.state?.from || '/'
  const form = useForm(
    { first_name: '', last_name: '', email: '', phone: '', password: '', confirm_password: '' },
    validateRegistration,
  )

  if (isAuthenticated) return <Navigate to={redirectTo} replace />

  const submit = async ({ confirm_password: _confirm, ...values }) => {
    await register(values)
    navigate(redirectTo, { replace: true })
  }

  return (
    <AuthCard
      title="Create account"
      subtitle="Join to check out faster and track your orders."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" state={location.state} className="font-semibold text-accent hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={form.handleSubmit(submit)} noValidate className="grid gap-4 sm:grid-cols-2">
        {form.formError && (
          <div className="sm:col-span-2">
            <ErrorMessage message={form.formError} />
          </div>
        )}
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
        <FormField
          label="Password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters; avoid common passwords."
          className="sm:col-span-2"
          required
          {...form.field('password')}
        />
        <FormField
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          className="sm:col-span-2"
          required
          {...form.field('confirm_password')}
        />
        <Button type="submit" fullWidth size="lg" isLoading={form.isSubmitting} className="sm:col-span-2">
          Create account
        </Button>
      </form>
    </AuthCard>
  )
}

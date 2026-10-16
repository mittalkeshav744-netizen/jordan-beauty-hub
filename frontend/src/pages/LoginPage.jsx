import { Link, Navigate, useLocation, useNavigate } from 'react-router'

import Button from '../components/common/Button'
import ErrorMessage from '../components/common/ErrorMessage'
import FormField from '../components/forms/FormField'
import AuthCard from '../components/layout/AuthCard'
import { useAuth } from '../hooks/useAuth'
import { useForm } from '../hooks/useForm'
import { required, validEmail } from '../utils/validators'

function validateLogin(values) {
  return {
    email: required(values.email, 'Email') || validEmail(values.email),
    password: required(values.password, 'Password'),
  }
}

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = location.state?.from || '/'
  const form = useForm({ email: '', password: '' }, validateLogin)

  if (isAuthenticated) return <Navigate to={redirectTo} replace />

  const submit = async (values) => {
    await login(values)
    navigate(redirectTo, { replace: true })
  }

  return (
    <AuthCard
      title="Sign in"
      subtitle="Welcome back! Sign in to shop and track your orders."
      footer={
        <>
          New here?{' '}
          <Link to="/register" state={location.state} className="font-semibold text-accent hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={form.handleSubmit(submit)} noValidate className="space-y-4">
        {form.formError && <ErrorMessage message={form.formError} />}
        <FormField label="Email" type="email" autoComplete="email" required {...form.field('email')} />
        <FormField
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          {...form.field('password')}
        />
        <p className="-mt-2 text-right text-sm">
          <Link to="/forgot-password" className="inline-block py-1 text-accent hover:underline">
            Forgot password?
          </Link>
        </p>
        <Button type="submit" fullWidth size="lg" isLoading={form.isSubmitting}>
          Sign in
        </Button>
      </form>
    </AuthCard>
  )
}

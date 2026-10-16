import { useState } from 'react'
import { Link } from 'react-router'

import Button from '../components/common/Button'
import ErrorMessage from '../components/common/ErrorMessage'
import FormField from '../components/forms/FormField'
import AuthCard from '../components/layout/AuthCard'
import { useForm } from '../hooks/useForm'
import { authService } from '../services/authService'
import { required, validEmail } from '../utils/validators'

export default function ForgotPasswordPage() {
  const [sentMessage, setSentMessage] = useState('')
  const form = useForm({ email: '' }, (values) => ({
    email: required(values.email, 'Email') || validEmail(values.email),
  }))

  const submit = async ({ email }) => {
    const response = await authService.requestPasswordReset(email.trim())
    setSentMessage(response.detail)
  }

  return (
    <AuthCard
      title="Forgot password"
      subtitle="Enter the email you signed up with and we will send you a link to choose a new password."
      footer={
        <Link to="/login" className="font-semibold text-accent hover:underline">
          Back to sign in
        </Link>
      }
    >
      {sentMessage ? (
        <div role="status" className="space-y-2 rounded-card border border-success/30 bg-success-soft p-4 text-sm text-success">
          <p>{sentMessage}</p>
          <p>Check your inbox and spam folder. The link can be used once.</p>
        </div>
      ) : (
        <form onSubmit={form.handleSubmit(submit)} noValidate className="space-y-4">
          {form.formError && <ErrorMessage message={form.formError} />}
          <FormField label="Email" type="email" autoComplete="email" required {...form.field('email')} />
          <Button type="submit" fullWidth size="lg" isLoading={form.isSubmitting}>
            Send reset link
          </Button>
        </form>
      )}
    </AuthCard>
  )
}

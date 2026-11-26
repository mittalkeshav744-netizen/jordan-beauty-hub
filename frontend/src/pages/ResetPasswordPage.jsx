import { useState } from 'react'
import { Link, useParams } from 'react-router'

import Button from '../components/common/Button'
import ErrorMessage from '../components/common/ErrorMessage'
import SuccessPanel from '../components/common/SuccessPanel'
import FormField from '../components/forms/FormField'
import AuthCard from '../components/layout/AuthCard'
import { useForm } from '../hooks/useForm'
import { authService } from '../services/authService'
import { minLength, required } from '../utils/validators'

function validateNewPassword(values) {
  return {
    new_password: required(values.new_password, 'New password') || minLength(values.new_password, 8),
    confirm_password:
      values.confirm_password === values.new_password ? '' : 'Passwords do not match.',
  }
}

export default function ResetPasswordPage() {
  const { uid, token } = useParams()
  const [done, setDone] = useState(false)
  const form = useForm({ new_password: '', confirm_password: '' }, validateNewPassword)

  const submit = async ({ new_password }) => {
    await authService.confirmPasswordReset({ uid, token, new_password })
    setDone(true)
  }

  if (done) {
    return (
      <div className="page-container flex justify-center py-6 sm:py-12">
        <SuccessPanel
          className="w-full"
          headingId="password-reset-heading"
          title="Congratulations — password updated!"
          message="You can sign in with your new password."
          actions={
            <Button to="/login" variant="accent" fullWidth size="lg">
              Sign in
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <AuthCard
      title="Choose a new password"
      footer={
        <Link to="/forgot-password" className="font-semibold text-accent hover:underline">
          Request a new link
        </Link>
      }
    >
      <form onSubmit={form.handleSubmit(submit)} noValidate className="space-y-4">
        {form.formError && <ErrorMessage message={form.formError} />}
        <FormField
          label="New password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters; avoid common passwords."
          required
          {...form.field('new_password')}
        />
        <FormField
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          required
          {...form.field('confirm_password')}
        />
        <Button type="submit" fullWidth size="lg" isLoading={form.isSubmitting}>
          Save new password
        </Button>
      </form>
    </AuthCard>
  )
}

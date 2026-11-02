import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import Button from '../components/common/Button'
import ErrorMessage from '../components/common/ErrorMessage'
import FormField from '../components/forms/FormField'
import AuthCard from '../components/layout/AuthCard'
import { useForm } from '../hooks/useForm'
import { useToast } from '../hooks/useToast'
import { authService } from '../services/authService'
import { getErrorMessage } from '../utils/errors'
import { minLength, required, validEmail } from '../utils/validators'

function validateOtpReset(values) {
  return {
    otp: required(values.otp, 'Code') || (/^\d{6}$/.test(values.otp.trim()) ? '' : 'Enter the 6-digit code.'),
    new_password: required(values.new_password, 'New password') || minLength(values.new_password, 8),
    confirm_password:
      values.confirm_password === values.new_password ? '' : 'Passwords do not match.',
  }
}

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [email, setEmail] = useState('')
  const [sentMessage, setSentMessage] = useState('')
  const [isResending, setIsResending] = useState(false)
  const [resendError, setResendError] = useState('')

  const requestForm = useForm({ email: '' }, (values) => ({
    email: required(values.email, 'Email') || validEmail(values.email),
  }))
  const otpForm = useForm({ otp: '', new_password: '', confirm_password: '' }, validateOtpReset)

  const requestCode = async ({ email: value }) => {
    const trimmed = value.trim()
    const response = await authService.requestPasswordReset(trimmed)
    setEmail(trimmed)
    setSentMessage(response.detail)
    setResendError('')
  }

  const resendCode = async () => {
    setResendError('')
    setIsResending(true)
    try {
      const response = await authService.requestPasswordReset(email)
      setSentMessage(response.detail)
      showToast('A new code is on the way.')
    } catch (error) {
      setResendError(getErrorMessage(error))
    } finally {
      setIsResending(false)
    }
  }

  const submitNewPassword = async ({ otp, new_password }) => {
    const response = await authService.confirmPasswordResetWithOtp({
      email,
      otp: otp.trim(),
      new_password,
    })
    showToast(response.detail)
    navigate('/login', { replace: true })
  }

  return (
    <AuthCard
      title={sentMessage ? 'Enter your code' : 'Forgot password'}
      subtitle={
        sentMessage
          ? `We emailed a 6-digit code to ${email}. Enter it below, or use the backup link in the same email.`
          : 'Enter the email you signed up with and we will send a 6-digit code to choose a new password.'
      }
      footer={
        <Link to="/login" className="font-semibold text-accent hover:underline">
          Back to sign in
        </Link>
      }
    >
      {sentMessage ? (
        <form onSubmit={otpForm.handleSubmit(submitNewPassword)} noValidate className="space-y-4">
          <div role="status" className="rounded-card border border-success/30 bg-success-soft p-4 text-sm text-success">
            <p>{sentMessage}</p>
            <p className="mt-1">Check your inbox and spam folder. The code expires in 10 minutes.</p>
          </div>
          {(otpForm.formError || resendError) && (
            <ErrorMessage message={otpForm.formError || resendError} />
          )}
          <FormField
            label="6-digit code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            required
            {...otpForm.field('otp')}
          />
          <FormField
            label="New password"
            type="password"
            autoComplete="new-password"
            hint="At least 8 characters; avoid common passwords."
            required
            {...otpForm.field('new_password')}
          />
          <FormField
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            required
            {...otpForm.field('confirm_password')}
          />
          <Button type="submit" fullWidth size="lg" isLoading={otpForm.isSubmitting}>
            Save new password
          </Button>
          <Button type="button" fullWidth variant="outline" isLoading={isResending} onClick={resendCode}>
            Resend code
          </Button>
        </form>
      ) : (
        <form onSubmit={requestForm.handleSubmit(requestCode)} noValidate className="space-y-4">
          {requestForm.formError && <ErrorMessage message={requestForm.formError} />}
          <FormField label="Email" type="email" autoComplete="email" required {...requestForm.field('email')} />
          <Button type="submit" fullWidth size="lg" isLoading={requestForm.isSubmitting}>
            Send reset code
          </Button>
        </form>
      )}
    </AuthCard>
  )
}

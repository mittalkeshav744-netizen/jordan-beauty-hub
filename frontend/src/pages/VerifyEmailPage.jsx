import { useState } from 'react'
import { Link, useLocation } from 'react-router'

import Button from '../components/common/Button'
import ErrorMessage from '../components/common/ErrorMessage'
import SuccessPanel from '../components/common/SuccessPanel'
import FormField from '../components/forms/FormField'
import AuthCard from '../components/layout/AuthCard'
import { useAuth } from '../hooks/useAuth'
import { useForm } from '../hooks/useForm'
import { useToast } from '../hooks/useToast'
import { authService } from '../services/authService'
import { getErrorMessage } from '../utils/errors'
import { required, validEmail } from '../utils/validators'

function validateVerify(values) {
  return {
    email: required(values.email, 'Email') || validEmail(values.email),
    otp: required(values.otp, 'Code') || (/^\d{6}$/.test(values.otp.trim()) ? '' : 'Enter the 6-digit code.'),
  }
}

export default function VerifyEmailPage() {
  const location = useLocation()
  const { showToast } = useToast()
  const { user, applyUser } = useAuth()
  const presetEmail = location.state?.email || user?.email || ''
  const [isResending, setIsResending] = useState(false)
  const [resendError, setResendError] = useState('')
  const [verified, setVerified] = useState(false)
  const form = useForm({ email: presetEmail, otp: '' }, validateVerify)
  const continueTo = location.state?.from || '/account'

  const submit = async ({ email, otp }) => {
    const response = await authService.verifyEmail({ email: email.trim(), otp: otp.trim() })
    if (response.email_verified === true || response.id) {
      if (response.id && applyUser) applyUser(response)
      else if (user && applyUser) applyUser({ ...user, email_verified: true })
    }
    setVerified(true)
  }

  const resend = async () => {
    const email = (form.values.email || '').trim()
    if (!email) {
      setResendError('Enter your email first.')
      return
    }
    setResendError('')
    setIsResending(true)
    try {
      const response = await authService.resendEmailVerification(email)
      showToast(response.detail)
    } catch (error) {
      setResendError(getErrorMessage(error))
    } finally {
      setIsResending(false)
    }
  }

  if (verified) {
    return (
      <div className="page-container flex justify-center py-6 sm:py-12">
        <SuccessPanel
          className="w-full"
          headingId="email-verified-heading"
          title="Congratulations — email verified!"
          message="Your account is ready. You can continue shopping and placing orders."
          actions={
            <>
              <Button to={continueTo} variant="accent" fullWidth size="lg">
                Continue
              </Button>
              <Button to="/shop" variant="outline" fullWidth>
                Browse shop
              </Button>
            </>
          }
        />
      </div>
    )
  }

  return (
    <AuthCard
      title="Verify your email"
      subtitle="Enter the 6-digit code we sent when you created your account."
      footer={
        <Link to="/account" className="font-semibold text-accent hover:underline">
          Skip for now
        </Link>
      }
    >
      <form onSubmit={form.handleSubmit(submit)} noValidate className="space-y-4">
        {(form.formError || resendError) && (
          <ErrorMessage message={form.formError || resendError} />
        )}
        <FormField
          label="Email"
          type="email"
          autoComplete="email"
          required
          {...form.field('email')}
        />
        <FormField
          label="6-digit code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          required
          {...form.field('otp')}
        />
        <Button type="submit" fullWidth size="lg" isLoading={form.isSubmitting}>
          Verify email
        </Button>
        <Button type="button" fullWidth variant="outline" isLoading={isResending} onClick={resend}>
          Resend code
        </Button>
      </form>
    </AuthCard>
  )
}

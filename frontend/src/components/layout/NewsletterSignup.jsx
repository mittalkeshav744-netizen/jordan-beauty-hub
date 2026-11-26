import { useState } from 'react'

import { useForm } from '../../hooks/useForm'
import { storeService } from '../../services/storeService'
import { required, validEmail } from '../../utils/validators'
import Button from '../common/Button'
import ErrorMessage from '../common/ErrorMessage'
import Modal from '../common/Modal'
import SuccessPanel from '../common/SuccessPanel'
import FormField from '../forms/FormField'

/**
 * Newsletter signup. `variant="footer"` embeds under the brand block in the dark footer.
 */
export default function NewsletterSignup({ variant = 'banner' }) {
  const isFooter = variant === 'footer'
  const [thanks, setThanks] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingEmail, setPendingEmail] = useState('')
  const [isConfirming, setIsConfirming] = useState(false)
  const [confirmError, setConfirmError] = useState(null)
  const [subscribed, setSubscribed] = useState(false)
  const form = useForm({ email: '' }, (values) => ({
    email: required(values.email, 'Email') || validEmail(values.email),
  }))

  const requestSubscribe = async ({ email }) => {
    setPendingEmail(email.trim())
    setConfirmError(null)
    setSubscribed(false)
    setConfirmOpen(true)
  }

  const confirmSubscribe = async () => {
    setIsConfirming(true)
    setConfirmError(null)
    try {
      const response = await storeService.subscribeToNewsletter(pendingEmail)
      form.setValues({ email: '' })
      setThanks(response.detail || 'You are subscribed.')
      setSubscribed(true)
    } catch (error) {
      setConfirmError(error)
    } finally {
      setIsConfirming(false)
    }
  }

  const closeModal = () => {
    if (isConfirming) return
    setConfirmOpen(false)
    setSubscribed(false)
    setConfirmError(null)
  }

  const emailField = form.field('email')
  const modal = (
    <Modal
      isOpen={confirmOpen}
      onClose={closeModal}
      title={subscribed ? "You're subscribed" : 'Confirm subscription'}
      footer={
        subscribed ? (
          <Button type="button" variant="accent" onClick={closeModal}>
            Done
          </Button>
        ) : (
          <>
            <Button type="button" variant="outline" onClick={closeModal} disabled={isConfirming}>
              Cancel
            </Button>
            <Button type="button" onClick={confirmSubscribe} isLoading={isConfirming}>
              Confirm subscribe
            </Button>
          </>
        )
      }
    >
      {subscribed ? (
        <SuccessPanel
          compact
          headingId="newsletter-success-heading"
          title="Congratulations — you are subscribed!"
          message={thanks || 'Offers and launches will arrive in your inbox.'}
        />
      ) : (
        <>
          <p className="text-sm text-ink-soft">
            Add <strong className="break-all text-ink">{pendingEmail}</strong> to the Jordan Beauty Hub
            newsletter?
          </p>
          {confirmError ? <ErrorMessage error={confirmError} className="mt-3" /> : null}
        </>
      )}
    </Modal>
  )

  if (isFooter) {
    return (
      <div
        className="mt-5 max-w-sm space-y-2"
        data-manage-edit="/manage/newsletter?focus=newsletter"
        data-manage-label="Newsletter signup"
      >
        <p id="newsletter-heading" className="text-xs font-semibold tracking-[0.16em] text-white/85 uppercase">
          Get offers first
        </p>
        <p className="text-xs text-white/55">Join our newsletter. No spam.</p>
        <form
          onSubmit={form.handleSubmit(requestSubscribe)}
          noValidate
          className="flex items-stretch gap-2"
          aria-labelledby="newsletter-heading"
        >
          <label className="sr-only" htmlFor="footer-newsletter-email">
            Email address
          </label>
          <input
            id="footer-newsletter-email"
            type="email"
            autoComplete="email"
            placeholder="Email address"
            value={emailField.value}
            onChange={emailField.onChange}
            aria-invalid={emailField.error ? true : undefined}
            className={`min-h-11 min-w-0 flex-1 rounded-control border bg-white/10 px-3 text-sm text-white placeholder:text-white/45 outline-none transition-colors focus:border-[color:var(--color-footer-blush)] focus:bg-white/15 ${
              emailField.error ? 'border-danger' : 'border-white/25'
            }`}
          />
          <Button type="submit" variant="accent" className="shrink-0 px-3 sm:px-4" isLoading={form.isSubmitting}>
            Subscribe
          </Button>
        </form>
        {emailField.error ? <p className="text-xs text-[color:var(--color-footer-blush)]">{emailField.error}</p> : null}
        {form.formError ? <ErrorMessage message={form.formError} /> : null}
        <p role="status" className="text-xs text-[color:var(--color-footer-blush)] empty:hidden">
          {thanks}
        </p>
        {modal}
      </div>
    )
  }

  return (
    <section
      aria-labelledby="newsletter-heading"
      className="bg-cream"
      data-manage-edit="/manage/newsletter?focus=newsletter"
      data-manage-label="Newsletter signup"
    >
      <div className="page-container grid gap-3 py-6 sm:gap-4 sm:py-10 md:grid-cols-2 md:items-center md:gap-10">
        <div className="space-y-1">
          <h2 id="newsletter-heading" className="text-base font-semibold sm:text-lg">
            Get offers and new launches first
          </h2>
          <p className="text-sm text-ink-soft">Join our newsletter. No spam, unsubscribe any time.</p>
        </div>
        <div className="space-y-2">
          <form onSubmit={form.handleSubmit(requestSubscribe)} noValidate className="flex items-start gap-2">
            <FormField
              label="Email address"
              type="email"
              autoComplete="email"
              className="min-w-0 flex-1"
              {...form.field('email')}
            />
            <Button type="submit" className="mt-[1.4rem] shrink-0 px-4" isLoading={form.isSubmitting}>
              Subscribe
            </Button>
          </form>
          {form.formError && <ErrorMessage message={form.formError} />}
          <p role="status" className="text-sm text-success empty:hidden">
            {thanks}
          </p>
        </div>
      </div>
      {modal}
    </section>
  )
}

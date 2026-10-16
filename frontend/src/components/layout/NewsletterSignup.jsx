import { useState } from 'react'

import { useForm } from '../../hooks/useForm'
import { storeService } from '../../services/storeService'
import { required, validEmail } from '../../utils/validators'
import Button from '../common/Button'
import ErrorMessage from '../common/ErrorMessage'
import FormField from '../forms/FormField'

export default function NewsletterSignup() {
  const [thanks, setThanks] = useState('')
  const form = useForm({ email: '' }, (values) => ({
    email: required(values.email, 'Email') || validEmail(values.email),
  }))

  const submit = async ({ email }) => {
    const response = await storeService.subscribeToNewsletter(email.trim())
    form.setValues({ email: '' })
    setThanks(response.detail)
  }

  return (
    <section aria-labelledby="newsletter-heading" className="bg-cream">
      <div className="page-container grid gap-4 py-8 sm:py-10 md:grid-cols-2 md:items-center md:gap-10">
        <div className="space-y-1">
          <h2 id="newsletter-heading" className="text-lg font-semibold">
            Get offers and new launches first
          </h2>
          <p className="text-sm text-ink-soft">Join our newsletter. No spam, unsubscribe any time.</p>
        </div>
        <div className="space-y-2">
          <form onSubmit={form.handleSubmit(submit)} noValidate className="flex items-start gap-2">
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
    </section>
  )
}

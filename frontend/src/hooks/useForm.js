import { useState } from 'react'

import { getErrorMessage, getFieldErrors } from '../utils/errors'

/**
 * Minimal controlled-form helper.
 *
 *   const form = useForm(initialValues, validate)
 *   <FormField {...form.field('email')} />
 *   <form onSubmit={form.handleSubmit(async (values) => api.save(values))}>
 *
 * `validate(values)` returns { field: 'message' } for client-side checks.
 * Server validation errors are mapped back onto the fields automatically.
 */
export function useForm(initialValues, validate = () => ({})) {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const setValue = (name, value) => {
    setValues((current) => ({ ...current, [name]: value }))
    if (errors[name]) setErrors((current) => ({ ...current, [name]: undefined }))
  }

  const field = (name) => ({
    name,
    value: values[name] ?? '',
    error: errors[name],
    onChange: (event) => {
      const { type, checked, value } = event.target
      setValue(name, type === 'checkbox' ? checked : value)
    },
  })

  const handleSubmit = (onSubmit) => async (event) => {
    event.preventDefault()
    setFormError('')
    const clientErrors = Object.fromEntries(
      Object.entries(validate(values)).filter(([, message]) => message),
    )
    setErrors(clientErrors)
    if (Object.keys(clientErrors).length) return

    setIsSubmitting(true)
    try {
      await onSubmit(values)
    } catch (error) {
      const fieldErrors = getFieldErrors(error)
      setErrors(fieldErrors)
      const fieldNames = Object.keys(fieldErrors).filter((name) => name in values)
      if (!fieldNames.length) setFormError(getErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return { values, setValues, setValue, errors, formError, isSubmitting, field, handleSubmit }
}

/**
 * Turn an Axios error into a message a customer can understand.
 * The backend always responds with { detail, errors }.
 */
export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) return fallback
  if (error.code === 'ECONNABORTED') return 'The request timed out. Please try again.'
  if (!error.response) return 'Cannot reach the server. Check your connection and try again.'

  const { status, data } = error.response
  if (data?.detail) return data.detail
  if (status === 404) return 'We could not find what you were looking for.'
  if (status >= 500) return 'Our server had a problem. Please try again shortly.'
  return fallback
}

/** Field-level validation errors: { email: 'message', ... } */
export function getFieldErrors(error) {
  const errors = error?.response?.data?.errors
  if (!errors || typeof errors !== 'object') return {}
  return Object.fromEntries(
    Object.entries(errors).map(([field, messages]) => [
      field,
      Array.isArray(messages) ? String(messages[0]) : String(messages),
    ]),
  )
}

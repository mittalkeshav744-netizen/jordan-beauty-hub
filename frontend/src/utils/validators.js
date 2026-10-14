// Client-side checks for usability only. The API validates everything again.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_PATTERN = /^\+?[0-9]{10,15}$/
const PIN_CODE_PATTERN = /^[1-9][0-9]{5}$/

export const required = (value, label = 'This field') =>
  String(value ?? '').trim() ? '' : `${label} is required.`

export const validEmail = (value) =>
  EMAIL_PATTERN.test(String(value).trim()) ? '' : 'Enter a valid email address.'

export const validPhone = (value) =>
  PHONE_PATTERN.test(String(value).replace(/[\s-]/g, '')) ? '' : 'Enter a valid 10-digit phone number.'

export const validPinCode = (value) =>
  PIN_CODE_PATTERN.test(String(value).trim()) ? '' : 'Enter a valid 6-digit PIN code.'

export const minLength = (value, length) =>
  String(value ?? '').length >= length ? '' : `Must be at least ${length} characters.`

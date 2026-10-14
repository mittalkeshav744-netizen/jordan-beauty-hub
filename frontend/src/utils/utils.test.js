import { getErrorMessage, getFieldErrors } from './errors'
import { discountPercent, formatPrice } from './format'
import { validPhone, validPinCode } from './validators'

describe('format', () => {
  it('formats rupees in the Indian numbering system', () => {
    expect(formatPrice('125000.50')).toBe('₹1,25,000.50')
    expect(formatPrice('139.8')).toBe('₹139.80')
    expect(formatPrice('699.00')).toBe('₹699')
  })

  it('calculates discount percentages', () => {
    expect(discountPercent('699', '999')).toBe(30)
    expect(discountPercent('699', null)).toBe(0)
  })
})

describe('errors', () => {
  it('maps API field errors to the first message per field', () => {
    const error = { response: { data: { errors: { email: ['Taken.', 'Other'] } } } }
    expect(getFieldErrors(error)).toEqual({ email: 'Taken.' })
  })

  it('falls back to a generic message', () => {
    expect(getErrorMessage({ response: { status: 418, data: {} } })).toMatch(/something went wrong/i)
  })
})

describe('validators', () => {
  it('accepts valid Indian phone numbers and PIN codes', () => {
    expect(validPhone('98765 43210')).toBe('')
    expect(validPhone('123')).not.toBe('')
    expect(validPinCode('560001')).toBe('')
    expect(validPinCode('060001')).not.toBe('')
  })
})

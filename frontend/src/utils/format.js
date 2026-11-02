/* Whole rupees show no paise (₹699); anything else always shows two digits (₹139.80). */
const wholeRupeeFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})
const paiseFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** Price × quantity in paise, so 299.00 × 39 is 11661.00 and not a float. */
export function multiplyMoney(unitPrice, quantity) {
  const paise = Math.round(Number(unitPrice) * 100)
  return ((paise * quantity) / 100).toFixed(2)
}

/** Sum decimal money strings without binary-float drift. */
export function sumMoney(values) {
  const paise = values.reduce((total, value) => total + Math.round(Number(value) * 100), 0)
  return (paise / 100).toFixed(2)
}

/** Prices arrive from the API as decimal strings ("699.00"). Display only. */
export function formatPrice(value) {
  if (value === null || value === undefined || value === '') return ''
  const amount = Number(value)
  return (Number.isInteger(amount) ? wholeRupeeFormatter : paiseFormatter).format(amount)
}

export function discountPercent(price, compareAtPrice) {
  const current = Number(price)
  const original = Number(compareAtPrice)
  if (!original || original <= current) return 0
  return Math.round(((original - current) / original) * 100)
}

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

export function formatDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  try {
    return dateFormatter.format(date)
  } catch {
    return ''
  }
}

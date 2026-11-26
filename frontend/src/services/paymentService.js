import apiClient from './apiClient'

export const paymentService = {
  getMethods: () => apiClient.get('/payments/methods/').then((response) => response.data),
  razorpayCreate: (orderNumber) =>
    apiClient
      .post('/payments/razorpay/create/', { order_number: orderNumber })
      .then((response) => response.data),
  razorpayVerify: (payload) =>
    apiClient.post('/payments/razorpay/verify/', payload).then((response) => response.data),
}

/** Load Razorpay Checkout.js once. */
export function loadRazorpayScript() {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'))
  if (window.Razorpay) return Promise.resolve(window.Razorpay)
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-razorpay-checkout]')
    if (existing) {
      existing.addEventListener('load', () => resolve(window.Razorpay))
      existing.addEventListener('error', () => reject(new Error('Could not load Razorpay')))
      return
    }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.dataset.razorpayCheckout = '1'
    script.onload = () => resolve(window.Razorpay)
    script.onerror = () => reject(new Error('Could not load Razorpay'))
    document.body.appendChild(script)
  })
}

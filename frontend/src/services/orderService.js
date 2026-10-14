import apiClient from './apiClient'

export const orderService = {
  list: (page = 1) => apiClient.get('/orders/', { params: { page } }).then((response) => response.data),
  get: (number) => apiClient.get(`/orders/${number}/`).then((response) => response.data),
  quote: (couponCode = '') =>
    apiClient.post('/orders/quote/', { coupon_code: couponCode }).then((response) => response.data),
  place: (data) => apiClient.post('/orders/', data).then((response) => response.data),
  cancel: (number) => apiClient.post(`/orders/${number}/cancel/`).then((response) => response.data),
}

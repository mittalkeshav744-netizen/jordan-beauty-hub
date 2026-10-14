import apiClient from './apiClient'

export const cartService = {
  get: () => apiClient.get('/cart/').then((response) => response.data),
  addItem: (variantId, quantity = 1) =>
    apiClient
      .post('/cart/items/', { variant_id: variantId, quantity })
      .then((response) => response.data),
  updateItem: (itemId, quantity) =>
    apiClient.patch(`/cart/items/${itemId}/`, { quantity }).then((response) => response.data),
  removeItem: (itemId) => apiClient.delete(`/cart/items/${itemId}/`).then((response) => response.data),
}

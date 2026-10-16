import apiClient from './apiClient'

export const wishlistService = {
  get: () => apiClient.get('/wishlist/').then((response) => response.data),
  add: (productId) => apiClient.post('/wishlist/', { product_id: productId }).then((response) => response.data),
  remove: (productId) => apiClient.delete(`/wishlist/${productId}/`).then((response) => response.data),
}

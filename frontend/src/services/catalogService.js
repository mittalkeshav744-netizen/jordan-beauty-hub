import apiClient from './apiClient'

export const catalogService = {
  getCategories: () => apiClient.get('/catalog/categories/').then((response) => response.data),
  getBrands: () => apiClient.get('/catalog/brands/').then((response) => response.data),
  getConcerns: () => apiClient.get('/catalog/concerns/').then((response) => response.data),
  getSkinTypes: () => apiClient.get('/catalog/skin-types/').then((response) => response.data),
  /** Skin quiz result. params: { skin_type, concern, max_price } (all optional). */
  getRoutine: (params) =>
    apiClient.get('/catalog/routine/', { params }).then((response) => response.data),
  getProducts: (params) =>
    apiClient.get('/catalog/products/', { params }).then((response) => response.data),
  /** { min, max } card prices for the given filters (price filter ignored). */
  getPriceRange: (params) =>
    apiClient.get('/catalog/products/price-range/', { params }).then((response) => response.data),
  getProduct: (slug) =>
    apiClient.get(`/catalog/products/${slug}/`).then((response) => response.data),
  /** Up to four products from the same category. */
  getRelatedProducts: (slug) =>
    apiClient.get(`/catalog/products/${slug}/related/`).then((response) => response.data),
  getReviews: (slug, page = 1) =>
    apiClient
      .get(`/catalog/products/${slug}/reviews/`, { params: { page } })
      .then((response) => response.data),
  createReview: (slug, data) =>
    apiClient.post(`/catalog/products/${slug}/reviews/`, data).then((response) => response.data),
}

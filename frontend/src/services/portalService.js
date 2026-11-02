import apiClient from './apiClient'

const list = (path, params = {}) =>
  apiClient.get(`/portal/${path}`, { params }).then((response) => response.data)

export const portalService = {
  dashboard: () => list('dashboard/'),
  navBadges: () => list('nav/'),
  settings: () => list('settings/'),

  listOrders: (params) => list('orders/', params),
  getOrder: (number) => list(`orders/${number}/`),
  updateOrderStatus: (number, data) =>
    apiClient.post(`/portal/orders/${number}/status/`, data).then((response) => response.data),

  listProducts: (params) => list('products/', params),
  getProduct: (id) => list(`products/${id}/`),
  catalogOptions: () => list('catalog-options/'),
  createProduct: (data) => apiClient.post('/portal/products/', data).then((response) => response.data),
  updateProduct: (id, data) =>
    apiClient.patch(`/portal/products/${id}/`, data).then((response) => response.data),
  deleteProduct: (id) => apiClient.delete(`/portal/products/${id}/`),
  addProductImages: (id, files) => {
    const body = new FormData()
    files.forEach((file) => body.append('images', file))
    return apiClient.post(`/portal/products/${id}/images/`, body).then((response) => response.data)
  },
  updateProductImage: (productId, imageId, data) =>
    apiClient
      .patch(`/portal/products/${productId}/images/${imageId}/`, data)
      .then((response) => response.data),
  deleteProductImage: (productId, imageId) =>
    apiClient
      .delete(`/portal/products/${productId}/images/${imageId}/`)
      .then((response) => response.data),
  addVariant: (productId, data) =>
    apiClient.post(`/portal/products/${productId}/variants/`, data).then((response) => response.data),
  updateVariant: (variantId, data) =>
    apiClient.patch(`/portal/variants/${variantId}/`, data).then((response) => response.data),
  deleteVariant: (variantId) =>
    apiClient.delete(`/portal/variants/${variantId}/`).then((response) => response.data),
  markOutOfStock: (variantId) =>
    apiClient.post(`/portal/variants/${variantId}/out-of-stock/`).then((response) => response.data),
  adjustStock: (variantId, data) =>
    apiClient.post(`/portal/variants/${variantId}/stock/`, data).then((response) => response.data),

  listReviews: (params) => list('reviews/', params),
  updateReview: (id, data) =>
    apiClient.patch(`/portal/reviews/${id}/`, data).then((response) => response.data),

  listCoupons: (params) => list('coupons/', params),
  getCoupon: (id) => list(`coupons/${id}/`),
  createCoupon: (data) =>
    apiClient.post('/portal/coupons/', data).then((response) => response.data),
  updateCoupon: (id, data) =>
    apiClient.patch(`/portal/coupons/${id}/`, data).then((response) => response.data),

  listCustomers: (params) => list('customers/', params),
  getCustomer: (id) => list(`customers/${id}/`),

  listLooks: (params) => list('looks/', params),
  updateLook: (id, data) =>
    apiClient.patch(`/portal/looks/${id}/`, data).then((response) => response.data),

  listCourses: (params) => list('courses/', params),
  getCourse: (id) => list(`courses/${id}/`),
  createCourse: (data) =>
    apiClient.post('/portal/courses/', data).then((response) => response.data),
  updateCourse: (id, data) =>
    apiClient.patch(`/portal/courses/${id}/`, data).then((response) => response.data),
  deleteCourse: (id) =>
    apiClient.delete(`/portal/courses/${id}/`).then((response) => response.data),

  listNewsletter: (params) => list('newsletter/', params),
  newsletterAudience: () =>
    apiClient.get('/portal/newsletter/audience/').then((response) => response.data),
  sendNewsletterCampaign: (data) =>
    apiClient.post('/portal/newsletter/send/', data).then((response) => response.data),

  listCategories: (params) => list('categories/', params),
  getCategory: (id) => list(`categories/${id}/`),
  createCategory: (data) => {
    let body = data
    if (data.image instanceof File) {
      body = new FormData()
      Object.entries(data).forEach(([key, value]) => {
        if (value != null) body.append(key, value)
      })
    }
    return apiClient.post('/portal/categories/', body).then((response) => response.data)
  },
  updateCategory: (id, data) => {
    let body = data
    if (data.image instanceof File) {
      body = new FormData()
      Object.entries(data).forEach(([key, value]) => {
        if (value != null) body.append(key, value)
      })
    }
    return apiClient.patch(`/portal/categories/${id}/`, body).then((response) => response.data)
  },
  deleteCategory: (id) =>
    apiClient.delete(`/portal/categories/${id}/`).then((response) => response.data),
  reorderCategories: (orderedIds) =>
    apiClient
      .post('/portal/categories/reorder/', { ordered_ids: orderedIds })
      .then((response) => response.data),

  getStorefrontConfig: () => list('storefront/config/'),
  updateStorefrontConfig: (data) => {
    let body
    if (data.hero_video_file instanceof File) {
      body = new FormData()
      Object.entries(data).forEach(([key, value]) => {
        if (value == null || key === 'id' || key === 'updated_at' || key === 'hero_video_file_url') {
          return
        }
        if (typeof value === 'boolean') {
          body.append(key, value ? 'true' : 'false')
        } else if (typeof value === 'object' && !(value instanceof File)) {
          body.append(key, JSON.stringify(value))
        } else {
          body.append(key, value)
        }
      })
    } else {
      const {
        hero_video_file: _file,
        hero_video_src: _src,
        hero_video_file_url: _url,
        id: _id,
        updated_at: _updated,
        ...rest
      } = data
      body = rest
    }
    return apiClient.patch('/portal/storefront/config/', body).then((response) => response.data)
  },
  listStorefrontReels: () => list('storefront/reels/'),
  createStorefrontReel: (data) => {
    let body
    if (data.video_file instanceof File) {
      body = new FormData()
      Object.entries(data).forEach(([key, value]) => {
        if (value == null) return
        if (typeof value === 'boolean') body.append(key, value ? 'true' : 'false')
        else body.append(key, value)
      })
    } else {
      const { video_file: _file, video_src: _src, video_file_url: _url, ...rest } = data
      body = rest
    }
    return apiClient.post('/portal/storefront/reels/', body).then((response) => response.data)
  },
  updateStorefrontReel: (id, data) => {
    let body
    if (data.video_file instanceof File) {
      body = new FormData()
      Object.entries(data).forEach(([key, value]) => {
        if (value == null) return
        if (typeof value === 'boolean') body.append(key, value ? 'true' : 'false')
        else body.append(key, value)
      })
    } else {
      const { video_file: _file, video_src: _src, video_file_url: _url, ...rest } = data
      body = rest
    }
    return apiClient.patch(`/portal/storefront/reels/${id}/`, body).then((response) => response.data)
  },
  deleteStorefrontReel: (id) =>
    apiClient.delete(`/portal/storefront/reels/${id}/`).then((response) => response.data),
  reorderStorefrontReels: (orderedIds) =>
    apiClient
      .post('/portal/storefront/reels/reorder/', { ordered_ids: orderedIds })
      .then((response) => response.data),

  getHomepagePicks: () => list('homepage-picks/'),
  saveHomepagePicks: (productIds) =>
    apiClient
      .put('/portal/homepage-picks/', { product_ids: productIds })
      .then((response) => response.data),
}

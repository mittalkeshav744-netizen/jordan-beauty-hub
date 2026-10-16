import apiClient from './apiClient'

export const looksService = {
  list: () => apiClient.get('/looks/').then((response) => response.data),
  get: (slug) => apiClient.get(`/looks/${slug}/`).then((response) => response.data),
}

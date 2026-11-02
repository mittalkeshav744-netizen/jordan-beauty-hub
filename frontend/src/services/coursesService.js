import apiClient from './apiClient'

export const coursesService = {
  list: () => apiClient.get('/courses/').then((response) => response.data),
  get: (slug) => apiClient.get(`/courses/${slug}/`).then((response) => response.data),
  enroll: (slug) => apiClient.post(`/courses/${slug}/enroll/`).then((response) => response.data),
  mine: () => apiClient.get('/courses/mine/').then((response) => response.data),
}

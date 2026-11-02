import apiClient from './apiClient'

export const authService = {
  /** The signed-in user, or null when nobody is signed in. */
  getCurrentUser: () => apiClient.get('/auth/session/').then((response) => response.data.user),
  updateProfile: (data) => apiClient.patch('/auth/me/', data).then((response) => response.data),
  /** Save skin-quiz answers; returns the full user object including beauty_profile. */
  saveBeautyProfile: (data) =>
    apiClient.put('/auth/beauty-profile/', data).then((response) => response.data),
  login: (credentials) => apiClient.post('/auth/login/', credentials).then((response) => response.data),
  register: (data) => apiClient.post('/auth/register/', data).then((response) => response.data),
  logout: () => apiClient.post('/auth/logout/'),
  requestPasswordReset: (email) =>
    apiClient.post('/auth/password-reset/', { email }).then((response) => response.data),
  /** data: { uid, token, new_password } from the emailed link. */
  confirmPasswordReset: (data) =>
    apiClient.post('/auth/password-reset/confirm/', data).then((response) => response.data),
  /** data: { email, otp, new_password } from the emailed 6-digit code. */
  confirmPasswordResetWithOtp: (data) =>
    apiClient.post('/auth/password-reset/otp/', data).then((response) => response.data),
  verifyEmail: (data) => apiClient.post('/auth/email/verify/', data).then((response) => response.data),
  resendEmailVerification: (email) =>
    apiClient.post('/auth/email/resend/', { email }).then((response) => response.data),
}

export const addressService = {
  list: () => apiClient.get('/auth/addresses/').then((response) => response.data),
  create: (data) => apiClient.post('/auth/addresses/', data).then((response) => response.data),
  update: (id, data) =>
    apiClient.patch(`/auth/addresses/${id}/`, data).then((response) => response.data),
  remove: (id) => apiClient.delete(`/auth/addresses/${id}/`),
}

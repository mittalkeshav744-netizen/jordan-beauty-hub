import apiClient from './apiClient'

let settingsRequest = null

export const storeService = {
  /** Public shop settings (shipping fee, free-shipping threshold, WhatsApp number). Fetched once per visit. */
  getSettings: () => {
    settingsRequest ??= apiClient
      .get('/store/settings/')
      .then((response) => response.data)
      .catch((error) => {
        settingsRequest = null
        throw error
      })
    return settingsRequest
  },
  subscribeToNewsletter: (email) =>
    apiClient.post('/store/newsletter/', { email }).then((response) => response.data),
  /** Beauty assistant (Google Gemini on the server). history: [{ role, content }]. */
  chat: ({ message, history = [] }) =>
    apiClient
      .post('/store/chat/', { message, history }, { timeout: 30000 })
      .then((response) => response.data),
}

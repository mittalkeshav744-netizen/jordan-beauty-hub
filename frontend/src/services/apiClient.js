import axios from 'axios'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true,
  // Django's CSRF protection: read the csrftoken cookie and echo it in a header.
  xsrfCookieName: 'csrftoken',
  xsrfHeaderName: 'X-CSRFToken',
  timeout: 15000,
})

let csrfRequest = null

/** Make sure the csrftoken cookie exists before the first unsafe request. */
export function ensureCsrfCookie() {
  if (document.cookie.includes('csrftoken=')) {
    return Promise.resolve()
  }
  csrfRequest ??= apiClient.get('/auth/csrf/').finally(() => {
    csrfRequest = null
  })
  return csrfRequest
}

const UNSAFE_METHODS = ['post', 'put', 'patch', 'delete']

apiClient.interceptors.request.use(async (config) => {
  if (UNSAFE_METHODS.includes(config.method)) {
    await ensureCsrfCookie()
  }
  return config
})

export default apiClient

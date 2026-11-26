import apiClient from './apiClient'

const root = '/certificates'

function list(path, params) {
  return apiClient.get(`${root}/${path}`, { params }).then((r) => r.data)
}

function get(path) {
  return apiClient.get(`${root}/${path}`).then((r) => r.data)
}

function post(path, data, config) {
  return apiClient.post(`${root}/${path}`, data, config).then((r) => r.data)
}

function patch(path, data, config) {
  return apiClient.patch(`${root}/${path}`, data, config).then((r) => r.data)
}

function destroy(path) {
  return apiClient.delete(`${root}/${path}`).then((r) => r.data)
}

export const certificateService = {
  dashboard: () => get('dashboard/'),
  reports: () => get('reports/'),
  exportReport: (params) =>
    apiClient
      .get(`${root}/reports/export/`, { params, responseType: 'blob' })
      .then((r) => r.data),
  settings: () => get('settings/'),
  updateSettings: (data) => {
    if (data instanceof FormData) return patch('settings/', data)
    return patch('settings/', data)
  },

  listCourses: (params) => list('courses/', params),
  getCourse: (id) => get(`courses/${id}/`),
  createCourse: (data) => post('courses/', data),
  updateCourse: (id, data) => patch(`courses/${id}/`, data),
  deleteCourse: (id) => destroy(`courses/${id}/`),

  listStudents: (params) => list('students/', params),
  getStudent: (id) => get(`students/${id}/`),
  createStudent: (data) => post('students/', data),
  updateStudent: (id, data) => patch(`students/${id}/`, data),
  deleteStudent: (id) => destroy(`students/${id}/`),
  studentCertificates: (id) => get(`students/${id}/certificates/`),
  exportStudents: (params) =>
    apiClient
      .get(`${root}/students/export/`, { params, responseType: 'blob' })
      .then((r) => r.data),
  importStudentsPreview: (file) => {
    const body = new FormData()
    body.append('file', file)
    return post('students/import_preview/', body)
  },
  importStudents: (file, mapping) => {
    const body = new FormData()
    body.append('file', file)
    if (mapping) body.append('mapping', JSON.stringify(mapping))
    return post('students/import_csv/', body)
  },
  /** Pull storefront course buyers/enrollees into the certificate student list. */
  syncStudentsFromShop: () => post('students/sync-from-shop/', {}),

  listEnrollments: (params) => list('enrollments/', params),
  createEnrollment: (data) => post('enrollments/', data),
  updateEnrollment: (id, data) => patch(`enrollments/${id}/`, data),
  deleteEnrollment: (id) => destroy(`enrollments/${id}/`),

  listGroups: (params) => list('groups/', params),
  getGroup: (id) => get(`groups/${id}/`),
  createGroup: (data) => post('groups/', data),
  updateGroup: (id, data) => patch(`groups/${id}/`, data),
  deleteGroup: (id) => destroy(`groups/${id}/`),
  listMembers: (id, params) => list(`groups/${id}/members/`, params),
  addMembers: (id, studentIds) => post(`groups/${id}/members/`, { student_ids: studentIds }),
  removeMembers: (id, studentIds) =>
    apiClient
      .delete(`${root}/groups/${id}/members/`, { data: { student_ids: studentIds } })
      .then((r) => r.data),

  listTemplates: (params) => list('templates/', params),
  getTemplate: (id) => get(`templates/${id}/`),
  createTemplate: (data) => post('templates/', data),
  updateTemplate: (id, data) => patch(`templates/${id}/`, data),
  deleteTemplate: (id) => destroy(`templates/${id}/`),
  publishTemplate: (id, data) => post(`templates/${id}/publish/`, data),
  duplicateTemplate: (id) => post(`templates/${id}/duplicate/`, {}),
  uploadTemplateAsset: (id, file) => {
    const body = new FormData()
    body.append('file', file)
    return post(`templates/${id}/upload_asset/`, body)
  },

  listIssued: (params) => list('issued/', params),
  getIssued: (id) => get(`issued/${id}/`),
  generate: (data) => post('issued/generate/', data),
  downloadPdf: (id) =>
    apiClient.get(`${root}/issued/${id}/download/`, { responseType: 'blob' }).then((r) => r.data),
  printPdf: (id) =>
    apiClient
      .get(`${root}/issued/${id}/download/`, {
        params: { fit_a4: 1, inline: 1 },
        responseType: 'blob',
      })
      .then((r) => r.data),
  printBundle: (data) =>
    apiClient.post(`${root}/issued/print-bundle/`, data, { responseType: 'blob' }).then((r) => r.data),
  publicDownloadUrl: (publicId) =>
    `/api${root}/verify/${encodeURIComponent(publicId)}/download/`,
  revoke: (id, reason) => post(`issued/${id}/revoke/`, { reason }),
  deleteIssued: (id) => destroy(`issued/${id}/`),
  reissue: (id, data = {}) => post(`issued/${id}/reissue/`, data),
  audit: (id) => get(`issued/${id}/audit/`),
  emailCertificate: (id, data) => post(`issued/${id}/email/`, data),

  listEmailLogs: (params) => list('email-logs/', params),
  bulkEmail: (data) => post('email-logs/bulk_send/', data),
  retryEmail: (id) => post(`email-logs/${id}/retry/`, {}),
  listEmailTemplates: () => list('email-templates/'),
  saveEmailTemplate: (data) => post('email-templates/', data),

  listFields: () => list('fields/'),
  fieldSources: () => get('fields/sources/'),
  createField: (data) => post('fields/', data),
  updateField: (id, data) => patch(`fields/${id}/`, data),
  deleteField: (id) => destroy(`fields/${id}/`),
  restoreDefaultFields: () => post('fields/restore-defaults/', {}),

  getJob: (id) => get(`jobs/${id}/`),
  listJobs: (params) => list('jobs/', params),
  processQueue: (limit = 50) => post('queue/process/', { limit }),

  verify: (publicId) =>
    apiClient.get(`${root}/verify/${encodeURIComponent(publicId)}/`).then((r) => r.data),
}

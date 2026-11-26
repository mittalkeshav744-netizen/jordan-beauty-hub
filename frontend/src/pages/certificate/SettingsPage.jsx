import { useEffect, useState } from 'react'

import DynamicFieldsManager from '../../components/certificate/DynamicFieldsManager'
import LoadingState from '../../components/certificate/LoadingState'
import FaIcon from '../../components/manage/FaIcon'
import { useToast } from '../../hooks/useToast'
import { certificateService } from '../../services/certificateService'

const EMPTY_TEMPLATE = {
  name: '',
  subject: '',
  body: '',
  is_default: false,
}

export default function SettingsPage() {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    institute_name: '',
    institute_address: '',
    authorized_signatory: '',
    certificate_id_prefix: 'JBH',
    default_email_subject: '',
    default_email_body: '',
    verification_base_url: '',
    logo_url: '',
    signature_image_url: '',
    stamp_image_url: '',
  })
  const [logoFile, setLogoFile] = useState(null)
  const [signatureFile, setSignatureFile] = useState(null)
  const [stampFile, setStampFile] = useState(null)
  const [emailTemplates, setEmailTemplates] = useState([])
  const [templateForm, setTemplateForm] = useState(EMPTY_TEMPLATE)
  const [savingTemplate, setSavingTemplate] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [data, templates] = await Promise.all([
        certificateService.settings(),
        certificateService.listEmailTemplates().catch(() => []),
      ])
      setForm({
        institute_name: data.institute_name || '',
        institute_address: data.institute_address || '',
        authorized_signatory: data.authorized_signatory || '',
        certificate_id_prefix: data.certificate_id_prefix || 'JBH',
        default_email_subject: data.default_email_subject || '',
        default_email_body: data.default_email_body || '',
        verification_base_url: data.verification_base_url || '',
        logo_url: data.logo_url || '',
        signature_image_url: data.signature_image_url || '',
        stamp_image_url: data.stamp_image_url || '',
      })
      setEmailTemplates(Array.isArray(templates) ? templates : templates?.results || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  if (loading) return <LoadingState />

  const saveSettings = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      const body = new FormData()
      ;[
        'institute_name',
        'institute_address',
        'authorized_signatory',
        'certificate_id_prefix',
        'default_email_subject',
        'default_email_body',
        'verification_base_url',
      ].forEach((key) => body.append(key, form[key] || ''))
      if (logoFile) body.append('logo', logoFile)
      if (signatureFile) body.append('signature_image', signatureFile)
      if (stampFile) body.append('stamp_image', stampFile)
      const updated = await certificateService.updateSettings(body)
      setForm((prev) => ({
        ...prev,
        logo_url: updated.logo_url || prev.logo_url,
        signature_image_url: updated.signature_image_url || prev.signature_image_url,
        stamp_image_url: updated.stamp_image_url || prev.stamp_image_url,
      }))
      setLogoFile(null)
      setSignatureFile(null)
      setStampFile(null)
      showToast('Settings saved.', 'success')
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Save failed.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const saveTemplate = async (event) => {
    event.preventDefault()
    setSavingTemplate(true)
    try {
      await certificateService.saveEmailTemplate(templateForm)
      showToast('Email template saved.', 'success')
      setTemplateForm(EMPTY_TEMPLATE)
      const templates = await certificateService.listEmailTemplates()
      setEmailTemplates(Array.isArray(templates) ? templates : templates?.results || [])
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Could not save template.', 'error')
    } finally {
      setSavingTemplate(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <form className="cert-card space-y-4 p-5 sm:p-6" onSubmit={saveSettings}>
        <h2 className="flex items-center gap-2 font-[family-name:var(--font-cert-display)] text-xl font-semibold text-[var(--cert-navy)]">
          <FaIcon icon="settings" className="h-4 w-4 text-[var(--cert-gold)]" />
          Institute settings
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            ['institute_name', 'Institute name'],
            ['authorized_signatory', 'Authorized signatory'],
            ['certificate_id_prefix', 'Certificate ID prefix'],
            ['verification_base_url', 'Verification base URL (optional)'],
          ].map(([key, label]) => (
            <label key={key} className="block text-sm font-medium">
              {label}
              <input
                className="cert-input mt-1"
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              />
            </label>
          ))}
        </div>
        <label className="block text-sm font-medium">
          Default email subject
          <input
            className="cert-input mt-1"
            value={form.default_email_subject}
            onChange={(e) => setForm((f) => ({ ...f, default_email_subject: e.target.value }))}
          />
        </label>
        <label className="block text-sm font-medium">
          Institute address
          <textarea
            className="cert-input mt-1 min-h-20"
            value={form.institute_address}
            onChange={(e) => setForm((f) => ({ ...f, institute_address: e.target.value }))}
          />
        </label>
        <label className="block text-sm font-medium">
          Default email body
          <textarea
            className="cert-input mt-1 min-h-36"
            value={form.default_email_body}
            onChange={(e) => setForm((f) => ({ ...f, default_email_body: e.target.value }))}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-3">
          {[
            ['logo', 'Logo', logoFile, setLogoFile, form.logo_url],
            ['signature', 'Signature', signatureFile, setSignatureFile, form.signature_image_url],
            ['stamp', 'Stamp', stampFile, setStampFile, form.stamp_image_url],
          ].map(([key, label, file, setFile, preview]) => (
            <div key={key} className="flex flex-col gap-2 rounded-[0.75rem] border border-[var(--cert-line)] bg-[var(--cert-ivory)]/50 p-3">
              <span className="text-xs font-semibold tracking-wide text-[var(--cert-muted)] uppercase">{label}</span>
              <div className="flex h-20 items-center justify-center rounded-[0.5rem] border border-dashed border-[var(--cert-line)] bg-white p-2">
                {preview ? (
                  <img src={preview} alt={label} className="max-h-16 w-auto object-contain" />
                ) : (
                  <FaIcon icon="image" className="h-5 w-5 text-[var(--cert-muted)]/50" />
                )}
              </div>
              <label className="cert-btn-outline cert-btn-sm cursor-pointer">
                <FaIcon icon="upload" className="h-3.5 w-3.5" />
                <span>{preview ? 'Replace' : 'Upload'}</span>
                <input
                  className="sr-only"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </label>
              {file ? <p className="truncate text-xs text-[var(--cert-muted)]">{file.name}</p> : null}
            </div>
          ))}
        </div>

        <p className="text-xs text-[var(--cert-muted)]">
          SMTP uses the existing backend EMAIL_* environment variables.
        </p>
        <button type="submit" className="cert-btn-primary" disabled={saving}>
          <FaIcon icon="check" className="h-3.5 w-3.5" />
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </form>

      <DynamicFieldsManager />

      <section className="cert-card space-y-4 p-5 sm:p-6">
        <h2 className="flex items-center gap-2 font-[family-name:var(--font-cert-display)] text-xl font-semibold text-[var(--cert-navy)]">
          <FaIcon icon="mail" className="h-4 w-4 text-[var(--cert-gold)]" />
          Email templates
        </h2>
        {emailTemplates.length > 0 ? (
          <ul className="divide-y divide-[var(--cert-line)] text-sm">
            {emailTemplates.map((tpl) => (
              <li key={tpl.id || tpl.name} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span className="flex items-center gap-2 font-medium">
                  {tpl.name || 'Untitled'}
                  {tpl.is_default ? <span className="cert-badge cert-badge--reissued">Default</span> : null}
                </span>
                <span className="text-[var(--cert-muted)]">{tpl.subject}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[var(--cert-muted)]">No named templates yet — defaults above still apply.</p>
        )}
        <form className="space-y-3 border-t border-[var(--cert-line)] pt-4" onSubmit={saveTemplate}>
          <label className="block text-sm font-medium">
            Template name
            <input
              className="cert-input mt-1"
              value={templateForm.name}
              onChange={(e) => setTemplateForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </label>
          <label className="block text-sm font-medium">
            Subject
            <input
              className="cert-input mt-1"
              value={templateForm.subject}
              onChange={(e) => setTemplateForm((f) => ({ ...f, subject: e.target.value }))}
              required
            />
          </label>
          <label className="block text-sm font-medium">
            Body
            <textarea
              className="cert-input mt-1 min-h-28"
              value={templateForm.body}
              onChange={(e) => setTemplateForm((f) => ({ ...f, body: e.target.value }))}
              required
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[var(--cert-navy)]"
              checked={templateForm.is_default}
              onChange={(e) => setTemplateForm((f) => ({ ...f, is_default: e.target.checked }))}
            />
            Set as default template
          </label>
          <button type="submit" className="cert-btn-primary" disabled={savingTemplate}>
            <FaIcon icon="check" className="h-3.5 w-3.5" />
            {savingTemplate ? 'Saving…' : 'Save email template'}
          </button>
        </form>
      </section>
    </div>
  )
}

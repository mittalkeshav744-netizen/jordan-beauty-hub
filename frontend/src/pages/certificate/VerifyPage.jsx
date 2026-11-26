import { useEffect, useState } from 'react'
import { Link, useNavigate, useOutletContext, useParams } from 'react-router'

import FaIcon from '../../components/manage/FaIcon'
import { certificateService } from '../../services/certificateService'
import '../../styles/certificate.css'

function normalizeSerial(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
}

function badgeClasses(data) {
  if (!data) return 'bg-[var(--cert-gold-soft)] text-[var(--cert-navy)]'
  if (data.valid) return 'bg-[#e7f5ee] text-[var(--cert-success)]'
  if (data.status === 'revoked' || data.status === 'reissued') {
    return 'bg-[#fff4e5] text-[#9a6700]'
  }
  return 'bg-[#fdecea] text-[var(--cert-danger)]'
}

function badgeLabel(data) {
  if (!data) return 'Checking'
  if (data.valid) return 'Authentic'
  if (data.status === 'revoked') return 'Revoked'
  if (data.status === 'reissued') return 'Superseded'
  if (data.status === 'not_found') return 'Not found'
  return 'Invalid'
}

function badgeIcon(data) {
  if (!data) return 'info'
  if (data.valid) return 'shield'
  if (data.status === 'revoked') return 'ban'
  if (data.status === 'reissued') return 'rotate'
  return 'info'
}

function Field({ label, value }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div>
      <dt className="text-[var(--cert-muted)]">{label}</dt>
      <dd className="font-semibold text-[var(--cert-navy)]">{value}</dd>
    </div>
  )
}

function VerifyShell({ inPortal, children }) {
  if (inPortal) {
    return <div className="mx-auto w-full max-w-2xl">{children}</div>
  }
  return (
    <div className="cert-shell flex min-h-dvh items-center justify-center px-4 py-10">{children}</div>
  )
}

function VerifyLanding({ inPortal }) {
  const navigate = useNavigate()
  const [serial, setSerial] = useState('')
  const [error, setError] = useState('')

  const onSubmit = (event) => {
    event.preventDefault()
    const next = normalizeSerial(serial)
    if (!next) {
      setError('Enter a certificate serial number.')
      return
    }
    setError('')
    navigate(`/certificate/verify/${encodeURIComponent(next)}`)
  }

  return (
    <VerifyShell inPortal={inPortal}>
      <div className="cert-card w-full max-w-lg p-6 sm:p-8">
        <p className="text-xs font-semibold tracking-[0.18em] text-[var(--cert-gold)] uppercase">
          Authenticity
        </p>
        <h2 className="mt-2 font-[family-name:var(--font-cert-display)] text-2xl font-semibold text-[var(--cert-navy)] sm:text-3xl">
          Verify a certificate
        </h2>
        <p className="mt-3 text-sm text-[var(--cert-muted)]">
          Enter the serial number printed on the certificate (for example JBH-2026-000001) to confirm it is authentic.
        </p>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <label className="block text-sm font-medium text-[var(--cert-navy)]">
            Certificate serial number
            <input
              className="cert-input mt-1"
              value={serial}
              onChange={(e) => setSerial(e.target.value)}
              placeholder="JBH-2026-000001"
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          {error ? <p className="text-sm text-[var(--cert-danger)]">{error}</p> : null}
          <button type="submit" className="cert-btn-primary w-full">
            <FaIcon icon="shield" className="h-3.5 w-3.5" />
            Verify
          </button>
        </form>
      </div>
    </VerifyShell>
  )
}

function VerifyResult({ certificateId, inPortal }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError('')
    setData(null)
    certificateService
      .verify(certificateId)
      .then((payload) => {
        if (alive) setData(payload)
      })
      .catch((err) => {
        if (!alive) return
        if (err?.response?.data) setData(err.response.data)
        else setError(err.message || 'Verification failed.')
      })
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [certificateId])

  return (
    <VerifyShell inPortal={inPortal}>
      <div className="cert-card w-full max-w-lg p-6 sm:p-8">
        <p className="text-xs font-semibold tracking-[0.18em] text-[var(--cert-gold)] uppercase">
          Certificate verification
        </p>
        <h2 className="mt-2 font-[family-name:var(--font-cert-display)] text-2xl font-semibold text-[var(--cert-navy)]">
          {data?.institute_name || 'Jordan Beauty Hub'}
        </h2>

        {loading ? <p className="mt-6 text-sm text-[var(--cert-muted)]">Checking authenticity…</p> : null}
        {error ? <p className="mt-6 text-sm text-[var(--cert-danger)]">{error}</p> : null}

        {data ? (
          <div className="mt-6 space-y-5">
            <div className={`flex items-start gap-3 rounded-[var(--cert-radius)] px-4 py-3 ${badgeClasses(data)}`}>
              <FaIcon icon={badgeIcon(data)} className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="text-xs font-semibold tracking-[0.14em] uppercase">{badgeLabel(data)}</p>
                <p className="mt-1 text-sm font-semibold">{data.message}</p>
              </div>
            </div>

            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="sm:col-span-2">
                <dt className="text-[var(--cert-muted)]">Serial number</dt>
                <dd className="font-[family-name:var(--font-cert-display)] text-lg font-semibold tracking-wide text-[var(--cert-navy)]">
                  {data.certificate_id}
                </dd>
              </div>
              <Field label="Student" value={data.student_name} />
              <Field label="Course" value={data.course_name} />
              <Field label="Institute" value={data.institute_name} />
              <Field label="Enrollment number" value={data.enrollment_number} />
              <Field label="Issue date" value={data.issue_date} />
              <Field label="Completion date" value={data.completion_date} />
              <Field label="Grade" value={data.grade} />
              <Field label="Duration" value={data.duration} />
              <Field label="Status" value={data.status ? String(data.status).replace(/_/g, ' ') : ''} />
              <Field label="Replaces" value={data.replaces} />
              <Field label="Superseded by" value={data.superseded_by} />
            </dl>

            {data.superseded_by ? (
              <p className="text-sm text-[var(--cert-muted)]">
                A newer certificate exists:{' '}
                <Link
                  className="font-semibold text-[var(--cert-navy)] underline"
                  to={`/certificate/verify/${encodeURIComponent(data.superseded_by)}`}
                >
                  {data.superseded_by}
                </Link>
              </p>
            ) : null}
            {data.replaces ? (
              <p className="text-sm text-[var(--cert-muted)]">
                This certificate replaces{' '}
                <Link
                  className="font-semibold text-[var(--cert-navy)] underline"
                  to={`/certificate/verify/${encodeURIComponent(data.replaces)}`}
                >
                  {data.replaces}
                </Link>
                .
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="mt-8 border-t border-[var(--cert-line)] pt-4">
          <Link to="/certificate/verify" className="cert-btn-outline w-full sm:w-auto">
            <FaIcon icon="search" className="h-3.5 w-3.5" />
            Check another serial
          </Link>
        </div>
      </div>
    </VerifyShell>
  )
}

export default function VerifyPage() {
  const { certificateId } = useParams()
  const outlet = useOutletContext()
  const inPortal = Boolean(outlet?.inPortal)
  if (!certificateId) return <VerifyLanding inPortal={inPortal} />
  return <VerifyResult certificateId={certificateId} inPortal={inPortal} />
}

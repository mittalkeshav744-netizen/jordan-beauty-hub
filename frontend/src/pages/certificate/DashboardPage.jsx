import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import CertificateStatusBadge from '../../components/certificate/CertificateStatusBadge'
import EmptyState from '../../components/certificate/EmptyState'
import LoadingState from '../../components/certificate/LoadingState'
import StatCard from '../../components/certificate/StatCard'
import FaIcon from '../../components/manage/FaIcon'
import { certificateService } from '../../services/certificateService'

export default function DashboardPage() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    certificateService
      .dashboard()
      .then((payload) => {
        if (alive) setData(payload)
      })
      .catch((err) => {
        if (alive) setError(err?.response?.data?.detail || err.message || 'Failed to load dashboard.')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  if (loading) return <LoadingState label="Loading dashboard" />
  if (error) return <EmptyState icon="info" title="Could not load dashboard" message={error} />
  if (!data) return null

  return (
    <div className="space-y-6">
      <div className="cert-card flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="text-sm font-semibold text-[var(--cert-navy)]">Academy overview</p>
          <p className="text-xs text-[var(--cert-muted)]">Live student, template, and issuance metrics.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/certificate/templates" className="cert-btn-outline cert-btn-sm">
            <FaIcon icon="templates" className="h-3.5 w-3.5" />
            Templates
          </Link>
          <Link to="/certificate/verify" className="cert-btn-outline cert-btn-sm">
            <FaIcon icon="shield" className="h-3.5 w-3.5" />
            Verify serial
          </Link>
          <Link to="/certificate/generator" className="cert-btn-primary cert-btn-sm">
            <FaIcon icon="generator" className="h-3.5 w-3.5" />
            Generate certificates
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Students" value={data.total_students} icon="customers" />
        <StatCard
          label="Courses"
          value={data.total_courses}
          hint={`${data.active_courses} published`}
          icon="courses"
        />
        <StatCard label="Completed enrollments" value={data.completed_students} icon="check" tone="success" />
        <StatCard label="Issued certificates" value={data.total_issued_certificates} icon="award" tone="gold" />
        <StatCard label="Pending certificates" value={data.pending_certificates} icon="jobs" />
        <StatCard label="Emails sent" value={data.emails_sent} icon="mail" tone="success" />
        <StatCard
          label="Failed emails"
          value={data.emails_failed}
          icon="ban"
          tone={data.emails_failed > 0 ? 'danger' : 'default'}
        />
        <StatCard label="Published courses" value={data.active_courses} icon="store" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="cert-card p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-[family-name:var(--font-cert-display)] text-lg font-semibold text-[var(--cert-navy)]">
              <FaIcon icon="award" className="h-4 w-4 text-[var(--cert-gold)]" />
              Recent certificates
            </h2>
            <Link to="/certificate/issued" className="text-xs font-semibold text-[var(--cert-navy)] hover:underline">
              View all
            </Link>
          </div>
          <ul className="mt-3 divide-y divide-[var(--cert-line)]">
            {(data.recent_certificates || []).length === 0 ? (
              <li className="py-6 text-sm text-[var(--cert-muted)]">No certificates issued yet.</li>
            ) : (
              data.recent_certificates.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <Link to={`/certificate/issued/${item.id}`} className="min-w-0 hover:text-[var(--cert-navy)]">
                    <p className="truncate font-semibold">{item.student__full_name}</p>
                    <p className="truncate text-xs text-[var(--cert-muted)]">
                      {item.public_id} · {item.course__title}
                    </p>
                  </Link>
                  <CertificateStatusBadge status={item.status} />
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="cert-card p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-[family-name:var(--font-cert-display)] text-lg font-semibold text-[var(--cert-navy)]">
              <FaIcon icon="customers" className="h-4 w-4 text-[var(--cert-gold)]" />
              Recent enrollments
            </h2>
            <Link to="/certificate/students" className="text-xs font-semibold text-[var(--cert-navy)] hover:underline">
              Students
            </Link>
          </div>
          <ul className="mt-3 divide-y divide-[var(--cert-line)]">
            {(data.recent_enrollments || []).length === 0 ? (
              <li className="py-6 text-sm text-[var(--cert-muted)]">No academy enrollments yet.</li>
            ) : (
              data.recent_enrollments.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{item.student__full_name}</p>
                    <p className="truncate text-xs text-[var(--cert-muted)]">{item.course__title}</p>
                  </div>
                  <span className="cert-badge cert-badge--draft shrink-0">{item.status}</span>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="cert-card p-4 sm:p-5">
          <h2 className="mb-3 flex items-center gap-2 font-[family-name:var(--font-cert-display)] text-lg font-semibold text-[var(--cert-navy)]">
            <FaIcon icon="courses" className="h-4 w-4 text-[var(--cert-gold)]" />
            Course-wise certificates
          </h2>
          <ul className="space-y-2 text-sm">
            {(data.course_stats || []).length === 0 ? (
              <li className="py-4 text-[var(--cert-muted)]">No courses yet.</li>
            ) : (
              data.course_stats.map((row) => (
                <li key={row.id} className="flex justify-between gap-3 border-b border-[var(--cert-line)] py-2 last:border-0">
                  <span className="min-w-0 truncate font-medium">{row.title}</span>
                  <span className="shrink-0 text-xs text-[var(--cert-muted)]">
                    {row.certificate_count} issued · {row.enrollment_count} enrolled
                  </span>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="cert-card p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-[family-name:var(--font-cert-display)] text-lg font-semibold text-[var(--cert-navy)]">
              <FaIcon icon="groups" className="h-4 w-4 text-[var(--cert-gold)]" />
              Batch / group stats
            </h2>
            <Link to="/certificate/groups" className="text-xs font-semibold text-[var(--cert-navy)] hover:underline">
              Groups
            </Link>
          </div>
          <ul className="space-y-2 text-sm">
            {(data.group_stats || []).length === 0 ? (
              <li className="py-4 text-[var(--cert-muted)]">No groups yet.</li>
            ) : (
              data.group_stats.map((row) => (
                <li key={row.id} className="flex justify-between gap-3 border-b border-[var(--cert-line)] py-2 last:border-0">
                  <span className="min-w-0 truncate font-medium">
                    {row.name}
                    <span className="block text-xs text-[var(--cert-muted)]">{row.course__title}</span>
                  </span>
                  <span className="shrink-0 text-xs text-[var(--cert-muted)]">
                    {row.student_count} students · {row.completed_count} completed
                  </span>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </div>
  )
}

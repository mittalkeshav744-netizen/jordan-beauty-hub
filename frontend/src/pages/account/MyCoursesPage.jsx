import { Link } from 'react-router'

import EmptyState from '../../components/common/EmptyState'
import ErrorMessage from '../../components/common/ErrorMessage'
import Skeleton from '../../components/common/Skeleton'
import { useApi } from '../../hooks/useApi'
import { coursesService } from '../../services/coursesService'
import { formatDate, formatPrice } from '../../utils/format'

export default function MyCoursesPage() {
  const { data, isLoading, error, reload } = useApi(() => coursesService.mine())

  const enrollments = Array.isArray(data) ? data : []

  return (
    <section aria-labelledby="my-courses-title">
      <h2 id="my-courses-title" className="font-display text-xl font-semibold text-ink">
        My courses
      </h2>
      <p className="mt-1 text-sm text-muted">Classes you enrolled in (separate from product orders).</p>

      {isLoading ? <Skeleton className="mt-4 h-40 w-full" /> : null}
      {error ? <ErrorMessage error={error} onRetry={reload} /> : null}

      {!isLoading && !error && enrollments.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title="No enrollments yet"
            message="Browse courses and enroll to unlock lessons here."
            action={
              <Link to="/courses" className="text-sm font-semibold text-berry underline">
                Browse courses
              </Link>
            }
          />
        </div>
      ) : null}

      {!isLoading && !error && enrollments.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {enrollments.map((row) => (
            <li key={row.id} className="rounded-card border border-line bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link
                    to={`/courses/${row.course.slug}`}
                    className="font-display text-lg font-semibold text-ink hover:text-berry"
                  >
                    {row.course.title}
                  </Link>
                  <p className="mt-1 text-sm text-muted">
                    Enrolled {formatDate(row.created_at)}
                    {Number(row.amount_paid) > 0 ? ` · ${formatPrice(row.amount_paid)}` : ' · Free'}
                  </p>
                </div>
                <Link
                  to={`/courses/${row.course.slug}`}
                  className="text-sm font-semibold text-berry hover:underline"
                >
                  Continue learning
                </Link>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

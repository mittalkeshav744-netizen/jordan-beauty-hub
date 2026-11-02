import { Link } from 'react-router'

import Breadcrumbs from '../components/common/Breadcrumbs'
import EmptyState from '../components/common/EmptyState'
import ErrorMessage from '../components/common/ErrorMessage'
import Reveal from '../components/common/Reveal'
import Skeleton from '../components/common/Skeleton'
import { useApi } from '../hooks/useApi'
import { coursesService } from '../services/coursesService'
import { formatPrice } from '../utils/format'

export default function CoursesPage() {
  const { data: courses, isLoading, error, reload } = useApi(() => coursesService.list())

  return (
    <div className="page-container pb-12">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Courses' }]} />
      <div className="py-6 text-center sm:py-8">
        <h1 className="section-title">Beauty courses</h1>
        <p className="mt-1 text-sm text-muted">
          Learn with video, downloads, and guided lessons — enroll separately from your shopping bag.
        </p>
      </div>

      {error && <ErrorMessage error={error} onRetry={reload} />}
      {!error && !isLoading && (courses ?? []).length === 0 && (
        <EmptyState title="Courses coming soon" message="New classes will appear here when published." />
      )}

      <ul className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
        {isLoading
          ? Array.from({ length: 3 }, (_, index) => (
              <li key={index}>
                <Skeleton className="aspect-[4/3] rounded-card" />
              </li>
            ))
          : (courses ?? []).map((course, index) => (
              <Reveal as="li" key={course.slug} delay={80 * (index % 3)}>
                <Link
                  to={`/courses/${course.slug}`}
                  className="group block overflow-hidden rounded-card border border-line bg-surface transition hover:border-ink/20"
                >
                  {course.cover_image ? (
                    <img
                      src={course.cover_image}
                      alt=""
                      className="aspect-[4/3] w-full object-cover bg-subtle transition duration-300 group-hover:scale-[1.02]"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex aspect-[4/3] items-center justify-center bg-cream px-4 text-center">
                      <span className="font-display text-xl font-semibold text-ink-soft">
                        {course.title}
                      </span>
                    </div>
                  )}
                  <div className="space-y-1 p-4">
                    <h2 className="font-display text-lg font-semibold text-ink group-hover:text-berry">
                      {course.title}
                    </h2>
                    <p className="line-clamp-2 text-sm text-muted">
                      {course.short_description || 'Open for details and enrollment.'}
                    </p>
                    <p className="pt-1 text-sm font-semibold text-ink">
                      {Number(course.price) > 0 ? formatPrice(course.price) : 'Free'}
                      <span className="ml-2 font-normal text-muted">
                        · {course.lesson_count || 0} lessons
                      </span>
                      {course.enrolled ? (
                        <span className="ml-2 text-success">· Enrolled</span>
                      ) : null}
                    </p>
                  </div>
                </Link>
              </Reveal>
            ))}
      </ul>
    </div>
  )
}

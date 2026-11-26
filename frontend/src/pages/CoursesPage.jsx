import { Link } from 'react-router'

import Breadcrumbs from '../components/common/Breadcrumbs'
import EmptyState from '../components/common/EmptyState'
import ErrorMessage from '../components/common/ErrorMessage'
import Reveal from '../components/common/Reveal'
import Skeleton from '../components/common/Skeleton'
import { useApi } from '../hooks/useApi'
import { useAuth } from '../hooks/useAuth'
import { coursesService } from '../services/coursesService'
import { formatPrice } from '../utils/format'

function CourseCard({ course, index }) {
  return (
    <Reveal as="li" delay={80 * (index % 3)}>
      <Link
        to={`/courses/${course.slug}`}
        className="group flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface shadow-card transition duration-300 hover:-translate-y-0.5 hover:border-ink/20 hover:shadow-raised"
      >
        <div className="relative overflow-hidden">
          {course.cover_image ? (
            <img
              src={course.cover_image}
              alt=""
              className="aspect-[4/3] w-full object-cover bg-subtle transition duration-500 group-hover:scale-[1.03]"
              loading="lazy"
            />
          ) : (
            <div className="flex aspect-[4/3] items-end bg-linear-to-br from-cream via-accent-soft/40 to-berry/15 px-5 pb-5">
              <span className="font-display text-2xl font-semibold text-ink">{course.title}</span>
            </div>
          )}
          {course.enrolled ? (
            <span className="absolute top-3 left-3 rounded-full bg-success px-2.5 py-1 text-[0.65rem] font-bold tracking-wide text-white uppercase">
              Enrolled
            </span>
          ) : null}
          {course.category ? (
            <span className="absolute top-3 right-3 rounded-full bg-ink/75 px-2.5 py-1 text-[0.65rem] font-semibold tracking-wide text-white uppercase backdrop-blur-sm">
              {course.category}
            </span>
          ) : null}
        </div>
        <div className="flex flex-1 flex-col gap-2 p-4 sm:p-5">
          <h2 className="font-display text-xl font-semibold text-ink transition group-hover:text-berry">
            {course.title}
          </h2>
          <p className="line-clamp-2 flex-1 text-sm text-muted">
            {course.short_description || 'Open for details, curriculum, and enrollment.'}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line/80 pt-3 text-sm">
            <span className="font-semibold text-ink">
              {Number(course.price) > 0 ? formatPrice(course.price) : 'Free'}
            </span>
            <span className="text-muted">{course.lesson_count || 0} lessons</span>
            {course.duration_text ? <span className="text-muted">{course.duration_text}</span> : null}
          </div>
          <span className="mt-1 text-xs font-semibold tracking-widest text-accent uppercase">
            View course →
          </span>
        </div>
      </Link>
    </Reveal>
  )
}

export default function CoursesPage() {
  const { isAuthenticated } = useAuth()
  const { data: courses, isLoading, error, reload } = useApi(() => coursesService.list())
  const list = courses ?? []

  return (
    <div className="pb-16">
      <section className="relative overflow-hidden border-b border-line bg-linear-to-br from-ink via-[#1f1630] to-berry/80 text-white">
        <div
          className="pointer-events-none absolute -top-16 -right-10 h-56 w-56 rounded-full bg-accent/25 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute bottom-0 left-10 h-40 w-40 rounded-full bg-white/10 blur-2xl"
          aria-hidden="true"
        />
        <div className="page-container relative py-10 sm:py-14">
          <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Courses' }]} tone="onDark" />
          <div className="mt-6 max-w-2xl">
            <p className="text-xs font-semibold tracking-[0.2em] text-accent uppercase">Academy</p>
            <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              Beauty courses
            </h1>
            <p className="mt-3 text-sm text-white/75 sm:text-base">
              Professional classes with lessons, modules, and certificates. Enroll once, learn at
              your pace.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to={isAuthenticated ? '/account/courses' : '/login'}
                state={isAuthenticated ? undefined : { intent: 'course', from: '/courses' }}
                className="inline-flex min-h-11 items-center justify-center rounded-btn bg-accent px-5 text-sm font-semibold text-ink transition hover:bg-white"
              >
                {isAuthenticated ? 'My courses' : 'Sign in to enroll'}
              </Link>
              <a
                href="#course-catalog"
                className="inline-flex min-h-11 items-center justify-center rounded-btn border border-white/30 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Browse catalog
              </a>
            </div>
          </div>
        </div>
      </section>

      <div id="course-catalog" className="page-container pt-8 sm:pt-10">
        {error ? <ErrorMessage error={error} onRetry={reload} /> : null}
        {!error && !isLoading && list.length === 0 ? (
          <EmptyState title="Courses coming soon" message="New classes will appear here when published." />
        ) : null}

        <ul className="grid gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {isLoading
            ? Array.from({ length: 3 }, (_, index) => (
                <li key={index}>
                  <Skeleton className="aspect-[4/3] rounded-card" />
                  <Skeleton className="mt-3 h-5 w-3/4 rounded" />
                  <Skeleton className="mt-2 h-4 w-full rounded" />
                </li>
              ))
            : list.map((course, index) => (
                <CourseCard key={course.slug} course={course} index={index} />
              ))}
        </ul>
      </div>
    </div>
  )
}

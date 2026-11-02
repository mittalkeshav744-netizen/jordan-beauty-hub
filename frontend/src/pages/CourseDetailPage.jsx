import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import Breadcrumbs from '../components/common/Breadcrumbs'
import Button from '../components/common/Button'
import ErrorMessage from '../components/common/ErrorMessage'
import Skeleton from '../components/common/Skeleton'
import { useApi } from '../hooks/useApi'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { coursesService } from '../services/coursesService'
import { formatPrice } from '../utils/format'

function LessonBody({ lesson }) {
  if (lesson.lesson_type === 'video' && lesson.video_url) {
    return (
      <div className="space-y-2">
        {lesson.video_url.includes('youtube') || lesson.video_url.includes('youtu.be') ? (
          <a
            href={lesson.video_url}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-berry underline"
          >
            Open video
          </a>
        ) : (
          <video controls className="w-full rounded-control bg-ink" src={lesson.video_url}>
            <track kind="captions" />
          </video>
        )}
      </div>
    )
  }
  if (lesson.lesson_type === 'link' && lesson.external_url) {
    return (
      <a
        href={lesson.external_url}
        target="_blank"
        rel="noreferrer"
        className="text-sm font-medium text-berry underline"
      >
        Open resource
      </a>
    )
  }
  if (lesson.attachment) {
    return (
      <a
        href={lesson.attachment}
        target="_blank"
        rel="noreferrer"
        className="text-sm font-medium text-berry underline"
      >
        Download file
      </a>
    )
  }
  if (lesson.body) {
    return <p className="whitespace-pre-wrap text-sm text-ink-soft">{lesson.body}</p>
  }
  return <p className="text-sm text-muted">Content unlocks after you enroll.</p>
}

export default function CourseDetailPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useToast()
  const [enrolling, setEnrolling] = useState(false)
  const { data: course, isLoading, error, reload, setData } = useApi(
    () => coursesService.get(slug),
    [slug],
  )

  const enroll = async () => {
    if (!user) {
      navigate(`/login?next=/courses/${slug}`)
      return
    }
    setEnrolling(true)
    try {
      const result = await coursesService.enroll(slug)
      setData(result.course)
      showToast('You are enrolled. Start learning below.', 'success')
    } catch (err) {
      showToast(err.response?.data?.detail || 'Could not enroll.', 'error')
    } finally {
      setEnrolling(false)
    }
  }

  if (isLoading) {
    return (
      <div className="page-container py-8">
        <Skeleton className="mb-4 h-8 w-48" />
        <Skeleton className="aspect-[21/9] w-full rounded-card" />
      </div>
    )
  }

  if (error || !course) {
    return (
      <div className="page-container py-8">
        <ErrorMessage error={error || { message: 'Course not found.' }} onRetry={reload} />
      </div>
    )
  }

  return (
    <div className="page-container pb-12">
      <Breadcrumbs
        items={[
          { label: 'Home', to: '/' },
          { label: 'Courses', to: '/courses' },
          { label: course.title },
        ]}
      />

      <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-start">
        <div>
          {course.cover_image ? (
            <img
              src={course.cover_image}
              alt=""
              className="mb-6 aspect-[16/9] w-full rounded-card object-cover bg-subtle"
            />
          ) : null}
          <h1 className="section-title">{course.title}</h1>
          {course.short_description ? (
            <p className="mt-2 text-base text-ink-soft">{course.short_description}</p>
          ) : null}
          {course.description ? (
            <p className="mt-4 whitespace-pre-wrap text-sm text-muted">{course.description}</p>
          ) : null}

          <div className="mt-8 space-y-4">
            <h2 className="font-display text-xl font-semibold text-ink">Curriculum</h2>
            {(course.modules || []).map((module) => (
              <section key={module.id} className="rounded-card border border-line bg-surface p-4">
                <h3 className="font-semibold text-ink">{module.title}</h3>
                <ol className="mt-3 space-y-3">
                  {(module.lessons || []).map((lesson, index) => (
                    <li key={lesson.id} className="border-t border-line/70 pt-3 first:border-0 first:pt-0">
                      <p className="text-sm font-medium text-ink">
                        {index + 1}. {lesson.title}
                        <span className="ml-2 text-xs font-normal tracking-wide text-muted uppercase">
                          {lesson.lesson_type}
                        </span>
                      </p>
                      {course.enrolled ? (
                        <div className="mt-2">
                          <LessonBody lesson={lesson} />
                        </div>
                      ) : (
                        <p className="mt-1 text-xs text-muted">Enroll to unlock this lesson.</p>
                      )}
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        </div>

        <aside className="rounded-card border border-line bg-cream/50 p-5 lg:sticky lg:top-24">
          <p className="font-display text-3xl font-bold text-ink">
            {Number(course.price) > 0 ? formatPrice(course.price) : 'Free'}
          </p>
          <p className="mt-1 text-sm text-muted">
            {course.module_count || course.modules?.length || 0} modules ·{' '}
            {course.lesson_count || 0} lessons
          </p>
          <p className="mt-3 text-sm text-ink-soft">
            Enrollment is separate from your shopping cart. Product checkout is unchanged.
          </p>
          {course.enrolled ? (
            <p className="mt-4 rounded-control bg-success-soft px-3 py-2 text-sm font-medium text-success">
              You are enrolled — scroll to learn.
            </p>
          ) : (
            <Button type="button" className="mt-4 w-full" isLoading={enrolling} onClick={enroll}>
              {user ? 'Enroll now' : 'Sign in to enroll'}
            </Button>
          )}
          <Link to="/courses" className="mt-3 block text-center text-sm text-muted hover:text-ink">
            Browse all courses
          </Link>
        </aside>
      </div>
    </div>
  )
}

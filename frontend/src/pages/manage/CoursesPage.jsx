import { useMemo, useState } from 'react'

import Button from '../../components/common/Button'
import EmptyState from '../../components/common/EmptyState'
import ErrorMessage from '../../components/common/ErrorMessage'
import Modal from '../../components/common/Modal'
import Pagination from '../../components/common/Pagination'
import Skeleton from '../../components/common/Skeleton'
import FormField from '../../components/forms/FormField'
import FaIcon from '../../components/manage/FaIcon'
import ManagePageHeader from '../../components/manage/ManagePageHeader'
import { useApi } from '../../hooks/useApi'
import { useManageFocus } from '../../hooks/useManageFocus'
import { useToast } from '../../hooks/useToast'
import { portalService } from '../../services/portalService'
import { formatPrice } from '../../utils/format'

const PAGE_SIZE = 12
const LESSON_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'video', label: 'Video' },
  { value: 'file', label: 'File note' },
  { value: 'link', label: 'Link' },
]

function coursesFromResponse(data) {
  if (Array.isArray(data?.results)) return data.results
  if (Array.isArray(data)) return data
  return []
}

function emptyLesson() {
  return {
    title: '',
    lesson_type: 'text',
    body: '',
    video_url: '',
    external_url: '',
    duration_minutes: 0,
  }
}

function emptyModule() {
  return { title: '', lessons: [emptyLesson()] }
}

function blankForm() {
  return {
    title: '',
    short_description: '',
    description: '',
    price: '0.00',
    is_published: false,
    is_active: true,
    modules: [emptyModule()],
  }
}

function formFromCourse(course) {
  return {
    title: course.title || '',
    short_description: course.short_description || '',
    description: course.description || '',
    price: course.price != null ? String(course.price) : '0.00',
    is_published: Boolean(course.is_published),
    is_active: course.is_active !== false,
    modules:
      Array.isArray(course.modules) && course.modules.length
        ? course.modules.map((module) => ({
            title: module.title || '',
            lessons:
              Array.isArray(module.lessons) && module.lessons.length
                ? module.lessons.map((lesson) => ({
                    title: lesson.title || '',
                    lesson_type: lesson.lesson_type || 'text',
                    body: lesson.body || '',
                    video_url: lesson.video_url || '',
                    external_url: lesson.external_url || '',
                    duration_minutes: lesson.duration_minutes || 0,
                  }))
                : [emptyLesson()],
          }))
        : [emptyModule()],
  }
}

function payloadFromForm(form) {
  return {
    title: form.title.trim(),
    short_description: form.short_description.trim(),
    description: form.description.trim(),
    price: form.price || '0.00',
    is_published: Boolean(form.is_published),
    is_active: Boolean(form.is_active),
    modules: (form.modules || [])
      .map((module, mi) => ({
        title: (module.title || '').trim(),
        sort_order: mi,
        lessons: (module.lessons || [])
          .map((lesson, li) => ({
            title: (lesson.title || '').trim(),
            lesson_type: lesson.lesson_type || 'text',
            body: lesson.body || '',
            video_url: lesson.video_url || '',
            external_url: lesson.external_url || '',
            duration_minutes: Number(lesson.duration_minutes) || 0,
            sort_order: li,
          }))
          .filter((lesson) => lesson.title),
      }))
      .filter((module) => module.title),
  }
}

export default function CoursesPage() {
  const { showToast } = useToast()
  const [page, setPage] = useState(1)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(blankForm)
  const [saving, setSaving] = useState(false)

  const { data, isLoading, error, reload, setData } = useApi(
    () => portalService.listCourses({ page, page_size: PAGE_SIZE }),
    [page],
  )

  const courses = coursesFromResponse(data)
  const totalCount = Number(data?.count ?? courses.length) || 0
  const publishedCount = useMemo(
    () => courses.filter((row) => row.is_published && row.is_active).length,
    [courses],
  )

  const openCreate = () => {
    setEditingId(null)
    setForm(blankForm())
    setEditorOpen(true)
  }

  const openEdit = async (course) => {
    try {
      const detail = await portalService.getCourse(course.id)
      setEditingId(detail.id)
      setForm(formFromCourse(detail))
      setEditorOpen(true)
    } catch (err) {
      showToast(err.response?.data?.detail || 'Could not load course.', 'error')
    }
  }

  const updateField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  const updateModule = (index, key, value) => {
    setForm((prev) => {
      const modules = prev.modules.map((module, i) =>
        i === index ? { ...module, [key]: value } : module,
      )
      return { ...prev, modules }
    })
  }

  const updateLesson = (moduleIndex, lessonIndex, key, value) => {
    setForm((prev) => {
      const modules = prev.modules.map((module, mi) => {
        if (mi !== moduleIndex) return module
        const lessons = module.lessons.map((lesson, li) =>
          li === lessonIndex ? { ...lesson, [key]: value } : lesson,
        )
        return { ...module, lessons }
      })
      return { ...prev, modules }
    })
  }

  const saveCourse = async () => {
    const payload = payloadFromForm(form)
    if (!payload.title) {
      showToast('Add a course title.', 'error')
      return
    }
    setSaving(true)
    try {
      const saved = editingId
        ? await portalService.updateCourse(editingId, payload)
        : await portalService.createCourse(payload)
      showToast(editingId ? 'Course updated.' : 'Course created.', 'success')
      setEditorOpen(false)
      if (editingId) {
        const nextResults = courses.map((row) => (row.id === saved.id ? { ...row, ...saved } : row))
        setData({
          count: data?.count ?? nextResults.length,
          next: data?.next ?? null,
          previous: data?.previous ?? null,
          results: nextResults,
        })
      } else {
        reload()
      }
    } catch (err) {
      showToast(err.response?.data?.detail || 'Could not save course.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const togglePublished = async (course) => {
    try {
      const updated = await portalService.updateCourse(course.id, {
        is_published: !course.is_published,
      })
      const nextResults = courses.map((row) =>
        row.id === course.id ? { ...row, ...updated } : row,
      )
      setData({
        count: data?.count ?? nextResults.length,
        next: data?.next ?? null,
        previous: data?.previous ?? null,
        results: nextResults,
      })
      showToast(updated.is_published ? 'Course published.' : 'Course unpublished.', 'success')
    } catch (err) {
      showToast(err.response?.data?.detail || 'Could not update course.', 'error')
    }
  }

  const deleteCourse = async (course) => {
    if (!window.confirm(`Delete “${course.title}”? Enrollments for this course will be removed.`)) {
      return
    }
    try {
      await portalService.deleteCourse(course.id)
      showToast('Course deleted.', 'success')
      reload()
    } catch (err) {
      showToast(err.response?.data?.detail || 'Could not delete course.', 'error')
    }
  }

  useManageFocus({ ready: !isLoading })

  return (
    <section aria-labelledby="manage-courses-title" data-manage-section="courses">
      <ManagePageHeader
        title="Courses"
        description="Sell beauty courses with video, files, links, and text — separate from the product cart."
        actions={
          <Button type="button" onClick={openCreate}>
            <FaIcon icon="plus" className="mr-2 h-3.5 w-3.5" />
            New course
          </Button>
        }
      />

      {!isLoading && !error && totalCount > 0 ? (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          <div className="manage-kpi p-4">
            <p className="flex items-center gap-2 text-xs font-semibold tracking-wider text-muted uppercase">
              <FaIcon icon="courses" className="h-3.5 w-3.5 text-berry" />
              Total courses
            </p>
            <p className="mt-1 font-display text-2xl font-bold text-ink">{totalCount}</p>
          </div>
          <div className="manage-kpi p-4">
            <p className="flex items-center gap-2 text-xs font-semibold tracking-wider text-muted uppercase">
              <FaIcon icon="check" className="h-3.5 w-3.5 text-success" />
              Live (page)
            </p>
            <p className="mt-1 font-display text-2xl font-bold text-success">{publishedCount}</p>
          </div>
        </div>
      ) : null}

      {isLoading ? <Skeleton className="h-64 w-full" /> : null}
      {error ? <ErrorMessage error={error} onRetry={reload} /> : null}

      {!isLoading && !error && courses.length === 0 ? (
        <EmptyState
          title="No courses yet"
          message="Create a course with modules and mixed lessons (video, file, link, or text)."
          action={
            <Button type="button" onClick={openCreate}>
              Create course
            </Button>
          }
        />
      ) : null}

      {!isLoading && !error && courses.length > 0 ? (
        <>
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {courses.map((course) => (
              <li key={course.id} className="overflow-hidden rounded-card border border-line bg-surface">
                {course.cover_image ? (
                  <img
                    src={course.cover_image}
                    alt=""
                    className="h-36 w-full object-cover bg-subtle"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-36 items-center justify-center bg-cream px-4 text-center">
                    <span className="font-display text-base font-semibold text-ink-soft">
                      {course.title}
                    </span>
                  </div>
                )}
                <div className="space-y-3 p-4">
                  <div>
                    <h2 className="font-display text-lg font-semibold text-ink">{course.title}</h2>
                    <p className="mt-1 text-sm text-muted line-clamp-2">
                      {course.short_description || 'No short description'}
                    </p>
                  </div>
                  <p className="text-sm text-ink-soft">
                    {formatPrice(course.price)} · {course.module_count || 0} modules ·{' '}
                    {course.lesson_count || 0} lessons · {course.enrollment_count || 0} enrolled
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => openEdit(course)}>
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => togglePublished(course)}
                    >
                      {course.is_published ? 'Unpublish' : 'Publish'}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-danger"
                      onClick={() => deleteCourse(course)}
                      aria-label={`Delete ${course.title}`}
                    >
                      <FaIcon icon="trash" className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-6">
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              totalCount={totalCount}
              onPageChange={setPage}
            />
          </div>
        </>
      ) : null}

      <Modal
        isOpen={editorOpen}
        onClose={() => !saving && setEditorOpen(false)}
        title={editingId ? 'Edit course' : 'New course'}
        size="xl"
        footer={
          <>
            <Button type="button" variant="outline" disabled={saving} onClick={() => setEditorOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={saving} onClick={saveCourse}>
              {saving ? 'Saving…' : 'Save course'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormField
            label="Title"
            name="title"
            value={form.title}
            onChange={(event) => updateField('title', event.target.value)}
            required
          />
          <FormField
            label="Short description"
            name="short_description"
            value={form.short_description}
            onChange={(event) => updateField('short_description', event.target.value)}
          />
          <FormField
            label="Full description"
            name="description"
            as="textarea"
            rows={3}
            value={form.description}
            onChange={(event) => updateField('description', event.target.value)}
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <FormField
              label="Price (₹)"
              name="price"
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(event) => updateField('price', event.target.value)}
            />
            <label className="flex items-end gap-2 pb-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={form.is_published}
                onChange={(event) => updateField('is_published', event.target.checked)}
              />
              Published on shop
            </label>
            <label className="flex items-end gap-2 pb-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) => updateField('is_active', event.target.checked)}
              />
              Active
            </label>
          </div>

          <div className="border-t border-line pt-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="font-semibold text-ink">Curriculum</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setForm((prev) => ({ ...prev, modules: [...prev.modules, emptyModule()] }))
                }
              >
                Add module
              </Button>
            </div>
            <ul className="space-y-4">
              {form.modules.map((module, moduleIndex) => (
                <li key={moduleIndex} className="rounded-control border border-line bg-cream/40 p-3">
                  <div className="mb-2 flex flex-wrap items-end gap-2">
                    <div className="min-w-0 flex-1">
                      <FormField
                        label={`Module ${moduleIndex + 1}`}
                        name={`module-${moduleIndex}`}
                        value={module.title}
                        onChange={(event) => updateModule(moduleIndex, 'title', event.target.value)}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-danger"
                      disabled={form.modules.length <= 1}
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          modules: prev.modules.filter((_, i) => i !== moduleIndex),
                        }))
                      }
                    >
                      Remove
                    </Button>
                  </div>
                  <ul className="space-y-3">
                    {module.lessons.map((lesson, lessonIndex) => (
                      <li
                        key={lessonIndex}
                        className="rounded-control border border-line/80 bg-surface p-3"
                      >
                        <div className="grid gap-2 sm:grid-cols-2">
                          <FormField
                            label="Lesson title"
                            name={`lesson-title-${moduleIndex}-${lessonIndex}`}
                            value={lesson.title}
                            onChange={(event) =>
                              updateLesson(moduleIndex, lessonIndex, 'title', event.target.value)
                            }
                          />
                          <FormField
                            label="Type"
                            name={`lesson-type-${moduleIndex}-${lessonIndex}`}
                            as="select"
                            value={lesson.lesson_type}
                            onChange={(event) =>
                              updateLesson(
                                moduleIndex,
                                lessonIndex,
                                'lesson_type',
                                event.target.value,
                              )
                            }
                          >
                            {LESSON_TYPES.map((type) => (
                              <option key={type.value} value={type.value}>
                                {type.label}
                              </option>
                            ))}
                          </FormField>
                        </div>
                        {(lesson.lesson_type === 'text' || lesson.lesson_type === 'file') && (
                          <FormField
                            label={lesson.lesson_type === 'file' ? 'File notes' : 'Lesson text'}
                            name={`lesson-body-${moduleIndex}-${lessonIndex}`}
                            as="textarea"
                            rows={2}
                            value={lesson.body}
                            onChange={(event) =>
                              updateLesson(moduleIndex, lessonIndex, 'body', event.target.value)
                            }
                          />
                        )}
                        {lesson.lesson_type === 'video' && (
                          <FormField
                            label="Video URL"
                            name={`lesson-video-${moduleIndex}-${lessonIndex}`}
                            value={lesson.video_url}
                            onChange={(event) =>
                              updateLesson(
                                moduleIndex,
                                lessonIndex,
                                'video_url',
                                event.target.value,
                              )
                            }
                          />
                        )}
                        {lesson.lesson_type === 'link' && (
                          <FormField
                            label="External link"
                            name={`lesson-link-${moduleIndex}-${lessonIndex}`}
                            value={lesson.external_url}
                            onChange={(event) =>
                              updateLesson(
                                moduleIndex,
                                lessonIndex,
                                'external_url',
                                event.target.value,
                              )
                            }
                          />
                        )}
                        <div className="mt-2 flex justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={module.lessons.length <= 1}
                            onClick={() =>
                              setForm((prev) => {
                                const modules = prev.modules.map((row, mi) => {
                                  if (mi !== moduleIndex) return row
                                  return {
                                    ...row,
                                    lessons: row.lessons.filter((_, li) => li !== lessonIndex),
                                  }
                                })
                                return { ...prev, modules }
                              })
                            }
                          >
                            Remove lesson
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() =>
                      setForm((prev) => {
                        const modules = prev.modules.map((row, mi) =>
                          mi === moduleIndex
                            ? { ...row, lessons: [...row.lessons, emptyLesson()] }
                            : row,
                        )
                        return { ...prev, modules }
                      })
                    }
                  >
                    Add lesson
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Modal>
    </section>
  )
}

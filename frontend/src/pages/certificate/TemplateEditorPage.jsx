import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import DynamicFieldsManager from '../../components/certificate/DynamicFieldsManager'
import LoadingState from '../../components/certificate/LoadingState'
import SignatureModal from '../../components/certificate/SignatureModal'
import Modal from '../../components/common/Modal'
import FaIcon from '../../components/manage/FaIcon'
import {
  CERTIFICATE_FONT_GROUPS,
  cssFontFamily,
} from '../../constants/certificateFonts'
import { useToast } from '../../hooks/useToast'
import { certificateService } from '../../services/certificateService'

const DEFAULT_PLACEHOLDERS = [
  { key: 'student_name', label: 'Student name', is_active: true },
  { key: 'course_name', label: 'Course name', is_active: true },
  { key: 'certificate_id', label: 'Certificate ID', is_active: true },
  { key: 'completion_date', label: 'Completion date', is_active: true },
  { key: 'issue_date', label: 'Issue date', is_active: true },
  { key: 'institute_name', label: 'Institute name', is_active: true },
  { key: 'grade', label: 'Grade', is_active: true },
  { key: 'duration', label: 'Duration', is_active: true },
  { key: 'enrollment_number', label: 'Enrollment number', is_active: true },
]

const DEFAULT_LAYOUT = {
  elements: [
    {
      id: 'title',
      type: 'text',
      text: 'Certificate of Completion',
      x: 50,
      y: 18,
      fontSize: 32,
      fontWeight: 'bold',
      fontFamily: 'cormorant',
      align: 'center',
      color: '#1a2744',
      letterSpacing: 1,
      zIndex: 1,
    },
    {
      id: 'student',
      type: 'dynamic',
      placeholder: '{{student_name}}',
      x: 50,
      y: 42,
      fontSize: 26,
      fontWeight: 'bold',
      fontFamily: 'cormorant',
      align: 'center',
      color: '#1a2744',
      zIndex: 2,
    },
    {
      id: 'course',
      type: 'dynamic',
      placeholder: '{{course_name}}',
      x: 50,
      y: 55,
      fontSize: 16,
      fontFamily: 'cormorant',
      align: 'center',
      color: '#4a5568',
      zIndex: 3,
    },
  ],
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n))
}

function nextZIndex(elements) {
  const max = (elements || []).reduce((acc, el) => Math.max(acc, Number(el.zIndex) || 0), 0)
  return max + 1
}

function elementLabel(el) {
  if (el.type === 'cover') return 'Cover / erase'
  if (el.type === 'qr') return 'QR code'
  if (el.type === 'image') return 'Image'
  if (el.type === 'dynamic') return el.placeholder || 'Field'
  return el.text || 'Text'
}

export default function TemplateEditorPage() {
  const { id } = useParams()
  const isCreate = !id || id === 'create'
  const navigate = useNavigate()
  const { showToast } = useToast()
  const canvasRef = useRef(null)
  const dragRef = useRef(null)
  const imageInputRef = useRef(null)
  const [loading, setLoading] = useState(!isCreate)
  const [saving, setSaving] = useState(false)
  const [uploadingAsset, setUploadingAsset] = useState(false)
  const [name, setName] = useState('New certificate template')
  const [orientation, setOrientation] = useState('landscape')
  const [layout, setLayout] = useState(DEFAULT_LAYOUT)
  const [history, setHistory] = useState([DEFAULT_LAYOUT])
  const [historyIndex, setHistoryIndex] = useState(0)
  const [selectedId, setSelectedId] = useState(null)
  const [backgroundFile, setBackgroundFile] = useState(null)
  const [backgroundUrl, setBackgroundUrl] = useState('')
  const [zoom, setZoom] = useState(1)
  const [showFieldMenu, setShowFieldMenu] = useState(false)
  const [fields, setFields] = useState(DEFAULT_PLACEHOLDERS)
  const [manageFieldsOpen, setManageFieldsOpen] = useState(false)
  const [signatureOpen, setSignatureOpen] = useState(false)
  const [instituteSignatureUrl, setInstituteSignatureUrl] = useState('')
  const [instituteSignatory, setInstituteSignatory] = useState('')
  const [editingId, setEditingId] = useState(null)
  const editInputRef = useRef(null)
  const [canvasTool, setCanvasTool] = useState('select')
  const eraseDraftRef = useRef(null)
  const [eraseDraft, setEraseDraft] = useState(null)

  const backgroundPreview = useMemo(() => {
    if (backgroundFile) return URL.createObjectURL(backgroundFile)
    if (backgroundUrl && !String(backgroundUrl).toLowerCase().endsWith('.pdf')) return backgroundUrl
    return ''
  }, [backgroundFile, backgroundUrl])

  useEffect(() => {
    if (!backgroundFile || !backgroundPreview.startsWith('blob:')) return undefined
    return () => URL.revokeObjectURL(backgroundPreview)
  }, [backgroundFile, backgroundPreview])

  useEffect(() => {
    let alive = true
    certificateService
      .listFields()
      .then((data) => {
        if (!alive) return
        const rows = Array.isArray(data) ? data : data?.results || []
        if (rows.length) setFields(rows)
      })
      .catch(() => {})
    certificateService
      .settings()
      .then((s) => {
        if (!alive || !s) return
        setInstituteSignatureUrl(s.signature_image_url || '')
        setInstituteSignatory(s.authorized_signatory || '')
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (isCreate) return undefined
    let alive = true
    certificateService
      .getTemplate(id)
      .then((tpl) => {
        if (!alive) return
        const nextLayout = tpl.latest_version?.layout_json || DEFAULT_LAYOUT
        setName(tpl.name)
        setOrientation(tpl.orientation || 'landscape')
        setLayout(nextLayout)
        setHistory([nextLayout])
        setHistoryIndex(0)
        setBackgroundUrl(tpl.background_file_url || '')
      })
      .catch(() => showToast('Could not load template.', 'error'))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [id, isCreate, showToast])

  const elements = layout.elements || []
  const sortedLayers = useMemo(
    () => [...elements].sort((a, b) => (Number(b.zIndex) || 0) - (Number(a.zIndex) || 0)),
    [elements],
  )
  const selected = useMemo(
    () => elements.find((el) => el.id === selectedId) || null,
    [elements, selectedId],
  )
  const hasQr = elements.some((el) => el.type === 'qr')

  const pushLayout = (next) => {
    setLayout(next)
    setHistory((prev) => {
      const trimmed = prev.slice(0, historyIndex + 1)
      const updated = [...trimmed, next].slice(-40)
      setHistoryIndex(updated.length - 1)
      return updated
    })
  }

  const commitCurrentLayout = () => {
    setLayout((current) => {
      setHistory((prev) => {
        const trimmed = prev.slice(0, historyIndex + 1)
        const last = trimmed[trimmed.length - 1]
        if (last && JSON.stringify(last) === JSON.stringify(current)) return prev
        const updated = [...trimmed, current].slice(-40)
        setHistoryIndex(updated.length - 1)
        return updated
      })
      return current
    })
  }

  const undo = () => {
    if (historyIndex <= 0) return
    const nextIndex = historyIndex - 1
    setHistoryIndex(nextIndex)
    setLayout(history[nextIndex])
  }

  const redo = () => {
    if (historyIndex >= history.length - 1) return
    const nextIndex = historyIndex + 1
    setHistoryIndex(nextIndex)
    setLayout(history[nextIndex])
  }

  const updateSelected = (patch, { record = true } = {}) => {
    if (!selectedId) return
    const next = {
      ...layout,
      elements: elements.map((el) => (el.id === selectedId ? { ...el, ...patch } : el)),
    }
    if (record) pushLayout(next)
    else setLayout(next)
  }

  const addElement = (el) => {
    const next = { ...el, id: el.id || `el-${crypto.randomUUID()}`, zIndex: nextZIndex(elements) }
    pushLayout({ ...layout, elements: [...elements, next] })
    setSelectedId(next.id)
    setShowFieldMenu(false)
  }

  const addText = () => {
    addElement({
      type: 'text',
      text: 'Double-click to edit',
      x: 50,
      y: 70,
      fontSize: 18,
      fontWeight: 'normal',
      fontFamily: 'cormorant',
      align: 'center',
      color: '#1a2744',
      letterSpacing: 0,
      width: 60,
    })
  }

  const addDynamic = (key) => {
    addElement({
      type: 'dynamic',
      placeholder: `{{${key}}}`,
      x: 50,
      y: 65,
      fontSize: 16,
      fontWeight: 'normal',
      fontFamily: 'cormorant',
      align: 'center',
      color: '#1a2744',
      letterSpacing: 0,
      width: 70,
    })
  }

  useEffect(() => {
    if (!editingId || !editInputRef.current) return undefined
    const node = editInputRef.current
    node.focus()
    node.select?.()
    return undefined
  }, [editingId])

  const addQr = () => {
    if (hasQr) {
      showToast('Only one QR code is allowed per template.', 'error')
      return
    }
    addElement({
      type: 'qr',
      x: 88,
      y: 82,
      width: 10,
    })
  }

  const addCover = (patch = {}) => {
    addElement({
      type: 'cover',
      x: 50,
      y: 50,
      width: 30,
      height: 10,
      fill: '#ffffff',
      ...patch,
    })
  }

  const onCertificatePhoto = (event) => {
    const file = event.target.files?.[0] || null
    event.target.value = ''
    setBackgroundFile(file)
    if (!file || !file.type?.startsWith('image/')) return
    const probeUrl = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const detected = img.naturalHeight > img.naturalWidth ? 'portrait' : 'landscape'
      setOrientation((prev) => {
        if (prev !== detected) {
          showToast(
            `Switched page orientation to A4 ${detected === 'portrait' ? 'Portrait' : 'Landscape'} to match photo.`,
            'info',
          )
        }
        return detected
      })
      URL.revokeObjectURL(probeUrl)
    }
    img.onerror = () => URL.revokeObjectURL(probeUrl)
    img.src = probeUrl
  }

  const canvasPercentFromEvent = (event) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    if (!rect.width || !rect.height) return null
    return {
      x: clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100),
      y: clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 100),
    }
  }

  const onCanvasPointerDown = (event) => {
    if (canvasTool !== 'erase') return
    if (event.target !== event.currentTarget && !event.target?.dataset?.eraseSurface) return
    event.preventDefault()
    event.stopPropagation()
    const pt = canvasPercentFromEvent(event)
    if (!pt) return
    eraseDraftRef.current = { startX: pt.x, startY: pt.y, x: pt.x, y: pt.y }
    setEraseDraft({ ...eraseDraftRef.current })
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  const onCanvasEraseMove = (event) => {
    if (canvasTool !== 'erase' || !eraseDraftRef.current) return
    const pt = canvasPercentFromEvent(event)
    if (!pt) return
    eraseDraftRef.current = { ...eraseDraftRef.current, x: pt.x, y: pt.y }
    setEraseDraft({ ...eraseDraftRef.current })
  }

  const finishEraseDraft = () => {
    const draft = eraseDraftRef.current
    eraseDraftRef.current = null
    setEraseDraft(null)
    if (!draft) return
    const left = Math.min(draft.startX, draft.x)
    const right = Math.max(draft.startX, draft.x)
    const top = Math.min(draft.startY, draft.y)
    const bottom = Math.max(draft.startY, draft.y)
    const width = right - left
    const height = bottom - top
    if (width < 1.5 || height < 1) return
    addCover({
      x: left + width / 2,
      y: top + height / 2,
      width,
      height,
      fill: '#ffffff',
    })
  }

  const ensureTemplateIdForAssets = async () => {
    if (!isCreate) return id
    const body = new FormData()
    body.append('name', name)
    body.append('source_type', backgroundFile ? 'upload' : 'editor')
    body.append('orientation', orientation)
    body.append('page_size', 'A4')
    body.append('is_active', 'true')
    if (backgroundFile) body.append('background_file', backgroundFile)
    const created = await certificateService.createTemplate(body)
    navigate(`/certificate/templates/${created.id}/edit`, { replace: true })
    return created.id
  }

  const uploadAndInsertImage = async (
    file,
    { x = 50, y = 75, width = 18, successMessage = 'Image added.' } = {},
  ) => {
    if (!file) return
    setUploadingAsset(true)
    try {
      const templateId = await ensureTemplateIdForAssets()
      const asset = await certificateService.uploadTemplateAsset(templateId, file)
      addElement({
        type: 'image',
        src: asset.path || asset.url,
        previewUrl: asset.url,
        x,
        y,
        width,
      })
      showToast(successMessage, 'success')
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Image upload failed.', 'error')
    } finally {
      setUploadingAsset(false)
    }
  }

  const onImageFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    await uploadAndInsertImage(file)
  }

  const handleInsertSignature = async (file) => {
    await uploadAndInsertImage(file, {
      x: 75,
      y: 78,
      width: 18,
      successMessage: 'Signature added. Drag to position it.',
    })
    setSignatureOpen(false)
  }

  const deleteElement = (id) => {
    if (!id) return
    pushLayout({
      ...layout,
      elements: elements.filter((el) => el.id !== id),
    })
    if (selectedId === id) setSelectedId(null)
    if (editingId === id) setEditingId(null)
    showToast('Element removed.', 'info')
  }

  const deleteSelected = () => deleteElement(selectedId)

  useEffect(() => {
    const onKeyDown = (event) => {
      if (!selectedId || editingId) return
      const target = event.target
      if (
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        deleteElement(selectedId)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedId, editingId, layout, elements])

  const moveLayer = (direction) => {
    if (!selected) return
    const ordered = [...elements].sort((a, b) => (Number(a.zIndex) || 0) - (Number(b.zIndex) || 0))
    const index = ordered.findIndex((el) => el.id === selectedId)
    if (index < 0) return
    const swapWith = direction === 'forward' ? index + 1 : index - 1
    if (swapWith < 0 || swapWith >= ordered.length) return
    const a = ordered[index]
    const b = ordered[swapWith]
    const zA = Number(a.zIndex) || 0
    const zB = Number(b.zIndex) || 0
    pushLayout({
      ...layout,
      elements: elements.map((el) => {
        if (el.id === a.id) return { ...el, zIndex: zB }
        if (el.id === b.id) return { ...el, zIndex: zA }
        return el
      }),
    })
  }

  const onPointerDown = (event, el) => {
    event.preventDefault()
    event.stopPropagation()
    setSelectedId(el.id)
    if (editingId === el.id) return
    if (editingId && editingId !== el.id) {
      setEditingId(null)
      commitCurrentLayout()
    }
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    dragRef.current = {
      id: el.id,
      startX: event.clientX,
      startY: event.clientY,
      origX: el.x,
      origY: el.y,
      width: rect.width,
      height: rect.height,
    }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  const startInlineEdit = (el) => {
    if (el.type !== 'text' && el.type !== 'dynamic') return
    setSelectedId(el.id)
    setEditingId(el.id)
    dragRef.current = null
  }

  const finishInlineEdit = () => {
    if (!editingId) return
    setEditingId(null)
    commitCurrentLayout()
  }

  const onPointerMove = (event) => {
    if (canvasTool === 'erase' && eraseDraftRef.current) {
      onCanvasEraseMove(event)
      return
    }
    const drag = dragRef.current
    if (!drag) return
    const dx = ((event.clientX - drag.startX) / drag.width) * 100
    const dy = ((event.clientY - drag.startY) / drag.height) * 100
    setLayout((prev) => ({
      ...prev,
      elements: prev.elements.map((el) =>
        el.id === drag.id
          ? { ...el, x: clamp(drag.origX + dx, 0, 100), y: clamp(drag.origY + dy, 0, 100) }
          : el,
      ),
    }))
  }

  const onPointerUp = () => {
    if (canvasTool === 'erase' && eraseDraftRef.current) {
      finishEraseDraft()
      return
    }
    if (!dragRef.current) return
    dragRef.current = null
    commitCurrentLayout()
  }

  const save = async () => {
    setSaving(true)
    try {
      let templateId = id
      if (isCreate) {
        const body = new FormData()
        body.append('name', name)
        body.append('source_type', backgroundFile ? 'upload' : 'editor')
        body.append('orientation', orientation)
        body.append('page_size', 'A4')
        body.append('is_active', 'true')
        if (backgroundFile) body.append('background_file', backgroundFile)
        const created = await certificateService.createTemplate(body)
        templateId = created.id
      } else {
        if (backgroundFile) {
          const body = new FormData()
          body.append('name', name)
          body.append('orientation', orientation)
          body.append('background_file', backgroundFile)
          const updated = await certificateService.updateTemplate(id, body)
          setBackgroundUrl(updated.background_file_url || backgroundUrl)
          setBackgroundFile(null)
        } else {
          await certificateService.updateTemplate(id, { name, orientation })
        }
      }
      await certificateService.publishTemplate(templateId, { layout_json: layout, orientation })
      showToast('Template saved.', 'success')
      navigate(`/certificate/templates/${templateId}/edit`)
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Save failed.', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingState />

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_16rem_16rem]">
      <div className="min-w-0 space-y-4">
        <div className="cert-card flex flex-wrap items-end justify-between gap-3 p-4">
          <div className="flex min-w-0 flex-1 flex-wrap items-end gap-3">
            <Link
              to="/certificate/templates"
              className="cert-btn-outline cert-icon-btn"
              title="Back to templates"
              aria-label="Back to templates"
            >
              <FaIcon icon="arrowLeft" className="h-3.5 w-3.5" />
            </Link>
            <label className="min-w-[12rem] flex-1 text-xs font-semibold tracking-wide text-[var(--cert-muted)] uppercase">
              Template name
              <input className="cert-input mt-1 font-normal" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="w-36 text-xs font-semibold tracking-wide text-[var(--cert-muted)] uppercase">
              Orientation
              <select className="cert-input mt-1 font-normal" value={orientation} onChange={(e) => setOrientation(e.target.value)}>
                <option value="landscape">Landscape</option>
                <option value="portrait">Portrait</option>
              </select>
            </label>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold tracking-wide text-[var(--cert-muted)] uppercase">
                Background
              </span>
              <label className="cert-btn-outline cursor-pointer">
                <FaIcon icon="upload" className="h-3.5 w-3.5" />
                <span>{backgroundFile ? 'Replace photo' : backgroundUrl ? 'Change photo' : 'Upload photo/PDF'}</span>
                <input
                  className="sr-only"
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp,.pdf,image/png,image/jpeg,image/webp,application/pdf"
                  onChange={onCertificatePhoto}
                />
              </label>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="cert-btn-outline cert-icon-btn"
              onClick={undo}
              disabled={historyIndex <= 0}
              title="Undo"
              aria-label="Undo"
            >
              <FaIcon icon="undo" className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              className="cert-btn-outline cert-icon-btn"
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              title="Redo"
              aria-label="Redo"
            >
              <FaIcon icon="redo" className="h-3.5 w-3.5" />
            </button>
            <div className="flex items-center gap-1 rounded-[0.625rem] border border-[var(--cert-line)] bg-[var(--cert-ivory)]/50 px-1 py-0.5">
              <button
                type="button"
                className="cert-btn-outline cert-icon-btn border-0 bg-transparent"
                onClick={() => setZoom((z) => clamp(z - 0.1, 0.6, 1.6))}
                title="Zoom out"
                aria-label="Zoom out"
              >
                <FaIcon icon="zoomOut" className="h-3.5 w-3.5" />
              </button>
              <span className="min-w-10 text-center text-xs font-semibold text-[var(--cert-navy)]">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                className="cert-btn-outline cert-icon-btn border-0 bg-transparent"
                onClick={() => setZoom((z) => clamp(z + 0.1, 0.6, 1.6))}
                title="Zoom in"
                aria-label="Zoom in"
              >
                <FaIcon icon="zoomIn" className="h-3.5 w-3.5" />
              </button>
            </div>
            <button type="button" className="cert-btn-primary" disabled={saving} onClick={save}>
              <FaIcon icon="check" className="h-3.5 w-3.5" />
              {saving ? 'Saving…' : 'Save & publish'}
            </button>
          </div>
          {backgroundFile || backgroundUrl ? (
            <p className="w-full text-xs text-[var(--cert-muted)]">
              Background: <span className="font-medium text-[var(--cert-navy)]">{backgroundFile?.name || 'Attached file'}</span>
            </p>
          ) : null}
        </div>

        <div className="cert-card flex flex-wrap items-center gap-2 p-3">
          <button
            type="button"
            className={`cert-btn-outline cert-btn-sm ${canvasTool === 'erase' ? 'ring-2 ring-[var(--cert-gold)]' : ''}`}
            onClick={() => {
              setCanvasTool((t) => (t === 'erase' ? 'select' : 'erase'))
              setSelectedId(null)
              setEditingId(null)
            }}
            aria-pressed={canvasTool === 'erase'}
            title="Click and drag on the photo to cover old print"
          >
            <FaIcon icon="eraser" className="h-3.5 w-3.5" />
            {canvasTool === 'erase' ? 'Erase on (drag)' : 'Erase / Cover'}
          </button>
          <button type="button" className="cert-btn-outline cert-btn-sm" onClick={addText}>
            <FaIcon icon="font" className="h-3.5 w-3.5" />
            Add text
          </button>
          <div className="relative">
            <button
              type="button"
              className="cert-btn-outline cert-btn-sm"
              onClick={() => setShowFieldMenu((v) => !v)}
              aria-expanded={showFieldMenu}
            >
              <FaIcon icon="code" className="h-3.5 w-3.5" />
              Insert field
            </button>
            {showFieldMenu ? (
              <div className="absolute left-0 z-20 mt-1 w-64 rounded-[var(--cert-radius)] border border-[var(--cert-line)] bg-white p-2 shadow-lg">
                <div className="max-h-56 space-y-0.5 overflow-auto">
                  {fields
                    .filter((f) => f.is_active !== false)
                    .map((field) => (
                      <button
                        key={field.key}
                        type="button"
                        className="flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-[var(--cert-gold-soft)]"
                        onClick={() => addDynamic(field.key)}
                      >
                        <span className="truncate font-medium text-[var(--cert-navy)]">{field.label}</span>
                        <code className="shrink-0 text-[0.68rem] text-[var(--cert-muted)]">{`{{${field.key}}}`}</code>
                      </button>
                    ))}
                </div>
                <div className="mt-1.5 border-t border-[var(--cert-line)] pt-1.5">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs font-semibold text-[var(--cert-navy)] hover:bg-[var(--cert-ivory)]"
                    onClick={() => {
                      setShowFieldMenu(false)
                      setManageFieldsOpen(true)
                    }}
                  >
                    <FaIcon icon="settings" className="h-3 w-3" />
                    Add / manage fields
                  </button>
                </div>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            className="cert-btn-outline cert-btn-sm"
            disabled={uploadingAsset}
            onClick={() => setSignatureOpen(true)}
          >
            <FaIcon icon="pen" className="h-3.5 w-3.5" />
            Add signature
          </button>
          <button
            type="button"
            className="cert-btn-outline cert-btn-sm"
            disabled={uploadingAsset}
            onClick={() => imageInputRef.current?.click()}
          >
            <FaIcon icon="image" className="h-3.5 w-3.5" />
            {uploadingAsset ? 'Uploading…' : 'Add image'}
          </button>
          <input
            ref={imageInputRef}
            type="file"
            className="sr-only"
            accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
            onChange={onImageFile}
          />
          <button type="button" className="cert-btn-outline cert-btn-sm" onClick={addQr} disabled={hasQr}>
            <FaIcon icon="qrcode" className="h-3.5 w-3.5" />
            Add QR
          </button>
          <span className="ml-auto hidden rounded-full bg-[var(--cert-ivory)] px-2.5 py-1 text-[0.68rem] font-semibold text-[var(--cert-navy)] sm:inline-flex">
            {orientation === 'portrait' ? 'A4 Portrait · 210 × 297 mm' : 'A4 Landscape · 297 × 210 mm'}
          </span>
          {canvasTool === 'erase' ? (
            <p className="w-full text-[0.7rem] text-[var(--cert-muted)]">
              Drag on the certificate to cover old print. Then Add text / field / signature on top. Press Erase again to
              exit.
            </p>
          ) : (
            <p className="w-full text-[0.7rem] text-[var(--cert-muted)]">
              Upload a photo or PDF, then place text, dynamic fields, signatures, images, or a QR code inside the dashed
              A4 print-safe frame.
            </p>
          )}
        </div>

        <div className="overflow-auto">
          <div
            ref={canvasRef}
            className={`cert-card relative mx-auto w-full max-w-4xl origin-top overflow-hidden bg-[var(--cert-gold-soft)] ${
              canvasTool === 'erase' ? 'cursor-crosshair' : ''
            }`}
            style={{
              aspectRatio: orientation === 'portrait' ? '1 / 1.414' : '1.414 / 1',
              transform: `scale(${zoom})`,
              backgroundImage: backgroundPreview ? `url(${backgroundPreview})` : undefined,
              // Stretch to canvas so OCR % boxes line up with the photo (cover crops and misaligns).
              backgroundSize: '100% 100%',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
            data-erase-surface="true"
            onPointerDown={onCanvasPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            onClick={() => {
              if (canvasTool === 'erase') return
              if (editingId) finishInlineEdit()
              setSelectedId(null)
            }}
          >
            <div
              className="pointer-events-none absolute inset-[2.2%] rounded-[2px] border border-dashed border-[var(--cert-navy)]/20"
              aria-hidden
            />
            {[...elements]
              .sort((a, b) => (Number(a.zIndex) || 0) - (Number(b.zIndex) || 0))
              .map((el) => {
                const isSelected = selectedId === el.id
                const boxWidth = el.width ? `${el.width}%` : undefined
                if (el.type === 'cover') {
                  const boxHeight = el.height ? `${el.height}%` : '8%'
                  return (
                    <button
                      key={el.id}
                      type="button"
                      onPointerDown={(event) => {
                        if (canvasTool === 'erase') return
                        onPointerDown(event, el)
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 touch-none ${
                        canvasTool === 'erase' ? 'pointer-events-none' : 'cursor-move'
                      } ${isSelected ? 'ring-2 ring-[var(--cert-gold)]' : ''}`}
                      style={{
                        left: `${el.x}%`,
                        top: `${el.y}%`,
                        width: boxWidth || '30%',
                        height: boxHeight,
                        backgroundColor: el.fill || '#ffffff',
                        zIndex: Number(el.zIndex) || 0,
                      }}
                      aria-label="Cover erase region"
                      title="Cover region — hides print underneath"
                    />
                  )
                }
                if (el.type === 'image') {
                  return (
                    <button
                      key={el.id}
                      type="button"
                      onPointerDown={(event) => {
                        if (canvasTool === 'erase') return
                        onPointerDown(event, el)
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 touch-none overflow-hidden ${
                        canvasTool === 'erase' ? 'pointer-events-none' : 'cursor-move'
                      } ${isSelected ? 'ring-2 ring-[var(--cert-gold)]' : ''}`}
                      style={{
                        left: `${el.x}%`,
                        top: `${el.y}%`,
                        width: boxWidth || '18%',
                        zIndex: Number(el.zIndex) || 0,
                      }}
                      aria-label="Image element"
                    >
                      {el.previewUrl || el.src ? (
                        <img
                          src={el.previewUrl || el.src}
                          alt=""
                          className="pointer-events-none h-auto w-full object-contain"
                          draggable={false}
                        />
                      ) : (
                        <span className="block bg-white/80 px-2 py-4 text-center text-xs text-[var(--cert-muted)]">
                          Image
                        </span>
                      )}
                    </button>
                  )
                }
                if (el.type === 'qr') {
                  return (
                    <button
                      key={el.id}
                      type="button"
                      onPointerDown={(event) => {
                        if (canvasTool === 'erase') return
                        onPointerDown(event, el)
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className={`absolute flex -translate-x-1/2 -translate-y-1/2 touch-none items-center justify-center border border-dashed border-[var(--cert-navy)] bg-white/90 text-[0.65rem] font-semibold text-[var(--cert-navy)] ${
                        canvasTool === 'erase' ? 'pointer-events-none' : 'cursor-move'
                      } ${isSelected ? 'ring-2 ring-[var(--cert-gold)]' : ''}`}
                      style={{
                        left: `${el.x}%`,
                        top: `${el.y}%`,
                        width: boxWidth || '10%',
                        aspectRatio: '1',
                        zIndex: Number(el.zIndex) || 0,
                      }}
                      aria-label="QR code element"
                    >
                      QR
                    </button>
                  )
                }
                const isEditing = editingId === el.id
                const textStyle = {
                  left: `${el.x}%`,
                  top: `${el.y}%`,
                  width: boxWidth,
                  fontSize: el.fontSize,
                  fontWeight: el.fontWeight || 'normal',
                  fontStyle: el.fontStyle || 'normal',
                  fontFamily: cssFontFamily(el.fontFamily),
                  color: el.color || '#1a2744',
                  textAlign: el.align || 'center',
                  lineHeight: el.lineHeight || 1.15,
                  letterSpacing: el.letterSpacing ? `${el.letterSpacing}px` : undefined,
                  zIndex: Number(el.zIndex) || 0,
                }
                if (isEditing) {
                  return (
                    <textarea
                      key={el.id}
                      ref={editInputRef}
                      rows={Math.max(1, String(el.text || el.placeholder || '').split('\n').length)}
                      className="absolute -translate-x-1/2 -translate-y-1/2 resize-none bg-white/95 px-2 py-1 ring-2 ring-[var(--cert-gold)] outline-none"
                      style={textStyle}
                      value={el.type === 'dynamic' ? el.placeholder || '' : el.text || ''}
                      onClick={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                      onChange={(e) =>
                        updateSelected(
                          el.type === 'dynamic' ? { placeholder: e.target.value } : { text: e.target.value },
                          { record: false },
                        )
                      }
                      onBlur={() => finishInlineEdit()}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          e.preventDefault()
                          finishInlineEdit()
                        }
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          finishInlineEdit()
                        }
                      }}
                      aria-label="Edit text"
                    />
                  )
                }
                return (
                  <button
                    key={el.id}
                    type="button"
                    onPointerDown={(event) => {
                      if (canvasTool === 'erase') return
                      onPointerDown(event, el)
                    }}
                    onClick={(e) => e.stopPropagation()}
                    onDoubleClick={(e) => {
                      e.stopPropagation()
                      if (canvasTool === 'erase') return
                      startInlineEdit(el)
                    }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 touch-none whitespace-pre-wrap px-1 ${
                      canvasTool === 'erase' ? 'pointer-events-none' : 'cursor-move'
                    } ${isSelected ? 'ring-2 ring-[var(--cert-gold)]' : ''}`}
                    style={textStyle}
                    title="Drag to move · Double-click to edit text"
                  >
                    {el.text || el.placeholder}
                  </button>
                )
              })}
            {eraseDraft ? (
              <div
                className="pointer-events-none absolute border border-dashed border-[var(--cert-navy)] bg-white/80"
                style={{
                  left: `${Math.min(eraseDraft.startX, eraseDraft.x)}%`,
                  top: `${Math.min(eraseDraft.startY, eraseDraft.y)}%`,
                  width: `${Math.abs(eraseDraft.x - eraseDraft.startX)}%`,
                  height: `${Math.abs(eraseDraft.y - eraseDraft.startY)}%`,
                  zIndex: 9998,
                }}
                aria-hidden
              />
            ) : null}
            {selected && !editingId && canvasTool !== 'erase' ? (
              <div
                className="absolute z-50 flex -translate-x-1/2 items-center gap-1 rounded-full border border-[var(--cert-line)] bg-white px-1.5 py-1 shadow-lg"
                style={{
                  left: `${clamp(selected.x, 12, 88)}%`,
                  top:
                    Number(selected.y) < 14
                      ? `calc(${selected.y}% + 2.25rem)`
                      : `calc(${selected.y}% - 2.75rem)`,
                }}
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                {(selected.type === 'text' || selected.type === 'dynamic') ? (
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--cert-navy)] hover:bg-[var(--cert-gold-soft)]"
                    onClick={() => startInlineEdit(selected)}
                    title="Edit text"
                    aria-label="Edit text"
                  >
                    <FaIcon icon="pen" className="h-3 w-3" />
                  </button>
                ) : null}
                {selected.type === 'cover' ? (
                  <span className="px-2 text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--cert-muted)]">
                    Cover
                  </span>
                ) : null}
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--cert-danger)] hover:bg-[#fdecea]"
                  onClick={deleteSelected}
                  title="Delete (Del)"
                  aria-label="Delete selected element"
                >
                  <FaIcon icon="trash" className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--cert-muted)] hover:bg-[var(--cert-ivory)]"
                  onClick={() => setSelectedId(null)}
                  title="Deselect"
                  aria-label="Deselect"
                >
                  <FaIcon icon="xmark" className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <aside className="cert-card h-fit space-y-3 p-4">
        <h3 className="text-sm font-semibold text-[var(--cert-navy)]">Layers</h3>
        <ul className="max-h-72 space-y-1 overflow-auto">
          {sortedLayers.map((el) => (
            <li key={el.id} className="group flex items-center gap-1">
              <button
                type="button"
                className={`min-w-0 flex-1 rounded px-2 py-1.5 text-left text-xs ${
                  selectedId === el.id ? 'bg-[var(--cert-gold-soft)] font-semibold' : 'hover:bg-[var(--cert-ivory)]'
                }`}
                onClick={() => setSelectedId(el.id)}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate">{elementLabel(el)}</span>
                  <span className="shrink-0 uppercase text-[var(--cert-muted)]">{el.type}</span>
                </span>
              </button>
              <button
                type="button"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded text-[var(--cert-danger)] opacity-70 hover:bg-[#fdecea] hover:opacity-100"
                onClick={() => deleteElement(el.id)}
                title={`Delete ${elementLabel(el)}`}
                aria-label={`Delete ${elementLabel(el)}`}
              >
                <FaIcon icon="trash" className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
          {!sortedLayers.length ? (
            <li className="text-xs text-[var(--cert-muted)]">No elements yet. Use the toolbar to add some.</li>
          ) : null}
        </ul>
        <div className="flex flex-wrap gap-2 border-t border-[var(--cert-line)] pt-3">
          <button
            type="button"
            className="cert-btn-outline cert-icon-btn"
            disabled={!selected}
            onClick={() => moveLayer('forward')}
            title="Bring forward"
            aria-label="Bring forward"
          >
            <FaIcon icon="up" className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="cert-btn-outline cert-icon-btn"
            disabled={!selected}
            onClick={() => moveLayer('back')}
            title="Send back"
            aria-label="Send back"
          >
            <FaIcon icon="down" className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="cert-btn-outline cert-icon-btn cert-icon-btn--danger"
            disabled={!selected}
            onClick={deleteSelected}
            title="Delete selected"
            aria-label="Delete selected"
          >
            <FaIcon icon="trash" className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="text-[0.7rem] text-[var(--cert-muted)]">Tip: select an item, then press Delete or Backspace.</p>
      </aside>

      <aside className="cert-card h-fit space-y-3 p-4">
        <h3 className="text-sm font-semibold text-[var(--cert-navy)]">Inspector</h3>
        {selected ? (
          <div className="space-y-3">
            <p className="text-xs text-[var(--cert-muted)]">
              Type: <span className="font-semibold uppercase text-[var(--cert-navy)]">{selected.type}</span>
            </p>
            {selected.type === 'text' || selected.type === 'dynamic' ? (
              <>
                {selected.detectedFontLabel ? (
                  <p className="rounded bg-[var(--cert-gold-soft)] px-2 py-1.5 text-[0.7rem] text-[var(--cert-navy)]">
                    Detected style: <strong>{selected.detectedFontLabel}</strong>
                    <span className="mt-0.5 block font-normal text-[var(--cert-muted)]">
                      Closest match in our fonts — not the exact licensed typeface from the photo.
                    </span>
                  </p>
                ) : null}
                <p className="text-[0.7rem] text-[var(--cert-muted)]">
                  Click to select · Double-click (or Edit text) to type on the canvas
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="cert-btn-outline cert-icon-btn"
                    onClick={() => startInlineEdit(selected)}
                    title="Edit text"
                    aria-label="Edit text"
                  >
                    <FaIcon icon="pen" className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    className="cert-btn-outline cert-icon-btn cert-icon-btn--danger"
                    onClick={deleteSelected}
                    title="Delete"
                    aria-label="Delete"
                  >
                    <FaIcon icon="trash" className="h-3.5 w-3.5" />
                  </button>
                </div>
                <label className="block text-xs font-medium">
                  {selected.type === 'dynamic' ? 'Placeholder' : 'Text'}
                  <textarea
                    className="cert-input mt-1 min-h-[4.5rem]"
                    rows={3}
                    value={selected.text || selected.placeholder || ''}
                    onChange={(e) =>
                      updateSelected(
                        selected.type === 'dynamic' ? { placeholder: e.target.value } : { text: e.target.value },
                        { record: false },
                      )
                    }
                    onBlur={() => commitCurrentLayout()}
                  />
                </label>
                <label className="block text-xs font-medium">
                  Color
                  <input
                    className="cert-input mt-1 h-10 p-1"
                    type="color"
                    value={selected.color || '#1a2744'}
                    onChange={(e) => updateSelected({ color: e.target.value })}
                  />
                </label>
                <div>
                  <span className="block text-xs font-medium">Align &amp; style</span>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {[
                      ['left', 'alignLeft', 'Align left'],
                      ['center', 'alignCenter', 'Align center'],
                      ['right', 'alignRight', 'Align right'],
                    ].map(([val, iconKey, label]) => {
                      const active = (selected.align || 'center') === val
                      return (
                        <button
                          key={val}
                          type="button"
                          className={`cert-btn-outline cert-icon-btn ${
                            active ? 'bg-[var(--cert-gold-soft)] ring-1 ring-[var(--cert-navy)]' : ''
                          }`}
                          onClick={() => updateSelected({ align: val })}
                          title={label}
                          aria-label={label}
                          aria-pressed={active}
                        >
                          <FaIcon icon={iconKey} className="h-3.5 w-3.5" />
                        </button>
                      )
                    })}
                    <button
                      type="button"
                      className={`cert-btn-outline cert-icon-btn ${
                        (selected.fontWeight || 'normal') === 'bold'
                          ? 'bg-[var(--cert-gold-soft)] ring-1 ring-[var(--cert-navy)]'
                          : ''
                      }`}
                      onClick={() =>
                        updateSelected({
                          fontWeight: (selected.fontWeight || 'normal') === 'bold' ? 'normal' : 'bold',
                        })
                      }
                      title="Bold"
                      aria-label="Bold"
                      aria-pressed={(selected.fontWeight || 'normal') === 'bold'}
                    >
                      <FaIcon icon="bold" className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className={`cert-btn-outline cert-icon-btn ${
                        (selected.fontStyle || 'normal') === 'italic'
                          ? 'bg-[var(--cert-gold-soft)] ring-1 ring-[var(--cert-navy)]'
                          : ''
                      }`}
                      onClick={() =>
                        updateSelected({
                          fontStyle: (selected.fontStyle || 'normal') === 'italic' ? 'normal' : 'italic',
                        })
                      }
                      title="Italic"
                      aria-label="Italic"
                      aria-pressed={(selected.fontStyle || 'normal') === 'italic'}
                    >
                      <FaIcon icon="italic" className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <label className="block text-xs font-medium">
                  Font family
                  <select
                    className="cert-input mt-1"
                    value={selected.fontFamily || 'cormorant'}
                    onChange={(e) => updateSelected({ fontFamily: e.target.value })}
                    style={{ fontFamily: cssFontFamily(selected.fontFamily || 'cormorant') }}
                  >
                    {CERTIFICATE_FONT_GROUPS.map((group) => (
                      <optgroup key={group.label} label={group.label}>
                        {group.fonts.map((f) => (
                          <option key={f.value} value={f.value} style={{ fontFamily: f.css }}>
                            {f.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </label>
                <label className="block text-xs font-medium">
                  Font size
                  <input
                    className="cert-input mt-1"
                    type="range"
                    min="8"
                    max="96"
                    value={selected.fontSize || 14}
                    onChange={(e) => updateSelected({ fontSize: Number(e.target.value) }, { record: false })}
                    onPointerUp={() => commitCurrentLayout()}
                  />
                  <span className="mt-1 block text-[var(--cert-muted)]">{selected.fontSize || 14}px</span>
                </label>
                <label className="block text-xs font-medium">
                  Letter spacing
                  <input
                    className="cert-input mt-1"
                    type="range"
                    min="0"
                    max="12"
                    step="0.5"
                    value={selected.letterSpacing || 0}
                    onChange={(e) => updateSelected({ letterSpacing: Number(e.target.value) }, { record: false })}
                    onPointerUp={() => commitCurrentLayout()}
                  />
                  <span className="mt-1 block text-[var(--cert-muted)]">{selected.letterSpacing || 0}px</span>
                </label>
                <label className="block text-xs font-medium">
                  Text box width (%)
                  <input
                    className="cert-input mt-1"
                    type="range"
                    min="10"
                    max="100"
                    value={selected.width || 60}
                    onChange={(e) => updateSelected({ width: Number(e.target.value) }, { record: false })}
                    onPointerUp={() => commitCurrentLayout()}
                  />
                  <span className="mt-1 block text-[var(--cert-muted)]">{selected.width || 60}%</span>
                </label>
              </>
            ) : null}
            {selected.type === 'cover' ? (
              <>
                <p className="text-[0.7rem] text-[var(--cert-muted)]">
                  Covers hide print on the photo without deleting the image. Place text or an image on top to replace
                  that region.
                </p>
                <label className="block text-xs font-medium">
                  Fill color
                  <input
                    className="cert-input mt-1 h-10 p-1"
                    type="color"
                    value={selected.fill || '#ffffff'}
                    onChange={(e) => updateSelected({ fill: e.target.value })}
                  />
                </label>
                <label className="block text-xs font-medium">
                  Width (%)
                  <input
                    className="cert-input mt-1"
                    type="range"
                    min="2"
                    max="100"
                    value={selected.width || 30}
                    onChange={(e) => updateSelected({ width: Number(e.target.value) }, { record: false })}
                    onPointerUp={() => commitCurrentLayout()}
                  />
                  <span className="mt-1 block text-[var(--cert-muted)]">{selected.width || 30}%</span>
                </label>
                <label className="block text-xs font-medium">
                  Height (%)
                  <input
                    className="cert-input mt-1"
                    type="range"
                    min="1"
                    max="100"
                    value={selected.height || 10}
                    onChange={(e) => updateSelected({ height: Number(e.target.value) }, { record: false })}
                    onPointerUp={() => commitCurrentLayout()}
                  />
                  <span className="mt-1 block text-[var(--cert-muted)]">{selected.height || 10}%</span>
                </label>
                <button
                  type="button"
                  className="cert-btn-outline cert-icon-btn cert-icon-btn--danger"
                  onClick={deleteSelected}
                  title="Delete cover"
                  aria-label="Delete cover"
                >
                  <FaIcon icon="trash" className="h-3.5 w-3.5" />
                </button>
              </>
            ) : null}
            {selected.type === 'image' || selected.type === 'qr' ? (
              <>
                <label className="block text-xs font-medium">
                  Size (%)
                  <input
                    className="cert-input mt-1"
                    type="range"
                    min="4"
                    max="40"
                    value={selected.width || (selected.type === 'qr' ? 10 : 18)}
                    onChange={(e) => updateSelected({ width: Number(e.target.value) }, { record: false })}
                    onPointerUp={() => commitCurrentLayout()}
                  />
                  <span className="mt-1 block text-[var(--cert-muted)]">
                    {selected.width || (selected.type === 'qr' ? 10 : 18)}%
                  </span>
                </label>
                <button
                  type="button"
                  className="cert-btn-outline cert-icon-btn cert-icon-btn--danger"
                  onClick={deleteSelected}
                  title="Delete"
                  aria-label="Delete"
                >
                  <FaIcon icon="trash" className="h-3.5 w-3.5" />
                </button>
              </>
            ) : null}
          </div>
        ) : (
          <p className="text-xs text-[var(--cert-muted)]">
            {backgroundPreview
              ? 'Select a layer on the canvas, or add text, dynamic fields, images, or cover blocks.'
              : 'Upload a certificate background or add text and dynamic fields to design your template.'}
          </p>
        )}
      </aside>

      <Modal
        isOpen={manageFieldsOpen}
        onClose={() => setManageFieldsOpen(false)}
        title="Manage certificate fields"
        description="Changes update the Insert field menu immediately."
        size="wide"
      >
        <DynamicFieldsManager embedded onFieldsChange={setFields} />
      </Modal>

      <SignatureModal
        isOpen={signatureOpen}
        onClose={() => setSignatureOpen(false)}
        onInsert={handleInsertSignature}
        busy={uploadingAsset}
        savedSignatureUrl={instituteSignatureUrl}
        defaultSignatory={instituteSignatory}
      />
    </div>
  )
}

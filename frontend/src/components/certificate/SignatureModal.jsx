import { useEffect, useRef, useState } from 'react'

import Modal from '../common/Modal'
import FaIcon from '../manage/FaIcon'
import { cssFontFamily } from '../../constants/certificateFonts'

const INK_COLORS = [
  { value: '#1a2744', label: 'Navy ink' },
  { value: '#111111', label: 'Black ink' },
  { value: '#0f4c81', label: 'Royal blue' },
  { value: '#6d3b2d', label: 'Sepia ink' },
]

const SCRIPT_FONTS = [
  { value: 'script', label: 'Great Vibes' },
  { value: 'dancing-script', label: 'Dancing Script' },
  { value: 'alex-brush', label: 'Alex Brush' },
  { value: 'allura', label: 'Allura' },
]

function trimTransparentCanvas(canvas, padding = 10) {
  const ctx = canvas.getContext('2d')
  const { width, height } = canvas
  const pixels = ctx.getImageData(0, 0, width, height).data
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = pixels[(y * width + x) * 4 + 3]
      if (alpha > 8) {
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < minX || maxY < minY) return null

  const outW = Math.max(1, maxX - minX + 1 + padding * 2)
  const outH = Math.max(1, maxY - minY + 1 + padding * 2)
  const out = document.createElement('canvas')
  out.width = outW
  out.height = outH
  out.getContext('2d').drawImage(
    canvas,
    minX,
    minY,
    maxX - minX + 1,
    maxY - minY + 1,
    padding,
    padding,
    maxX - minX + 1,
    maxY - minY + 1,
  )
  return out
}

function canvasToPngFile(canvas, filename = 'signature.png') {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Could not export signature image.'))
        return
      }
      resolve(new File([blob], filename, { type: 'image/png' }))
    }, 'image/png')
  })
}

async function processUploadedSignatureFile(file, stripWhiteBg) {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error('Could not read uploaded signature image.'))
      image.src = url
    })
    const maxDim = 900
    const scale = Math.min(1, maxDim / Math.max(img.naturalWidth || 1, img.naturalHeight || 1))
    const w = Math.max(1, Math.round((img.naturalWidth || 300) * scale))
    const h = Math.max(1, Math.round((img.naturalHeight || 120) * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0, w, h)

    if (stripWhiteBg) {
      const imageData = ctx.getImageData(0, 0, w, h)
      const data = imageData.data
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        const lum = 0.299 * r + 0.587 * g + 0.114 * b
        if (lum >= 235) {
          data[i + 3] = 0
        } else if (lum >= 195) {
          data[i + 3] = Math.round(data[i + 3] * ((235 - lum) / 40))
        }
      }
      ctx.putImageData(imageData, 0, 0)
    }

    const trimmed = trimTransparentCanvas(canvas) || canvas
    return await canvasToPngFile(trimmed, 'signature.png')
  } finally {
    URL.revokeObjectURL(url)
  }
}

export default function SignatureModal({
  isOpen,
  onClose,
  onInsert,
  busy = false,
  savedSignatureUrl = '',
  defaultSignatory = '',
}) {
  const [tab, setTab] = useState('draw')
  const [inkColor, setInkColor] = useState('#1a2744')
  const [strokeWidth, setStrokeWidth] = useState(3)
  const [hasStroke, setHasStroke] = useState(false)
  const [typedText, setTypedText] = useState(defaultSignatory || 'Authorized Signatory')
  const [scriptFont, setScriptFont] = useState('script')
  const [uploadFile, setUploadFile] = useState(null)
  const [uploadPreview, setUploadPreview] = useState('')
  const [stripWhiteBg, setStripWhiteBg] = useState(true)
  const [error, setError] = useState('')

  const padRef = useRef(null)
  const drawingRef = useRef(false)
  const lastPointRef = useRef(null)

  useEffect(() => {
    if (!isOpen || !defaultSignatory) return
    setTypedText((prev) => (!prev || prev === 'Authorized Signatory' ? defaultSignatory : prev))
  }, [isOpen, defaultSignatory])

  useEffect(() => {
    if (!uploadFile) {
      setUploadPreview('')
      return undefined
    }
    const url = URL.createObjectURL(uploadFile)
    setUploadPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [uploadFile])

  const clearPad = () => {
    const canvas = padRef.current
    if (!canvas) return
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
    setHasStroke(false)
    setError('')
  }

  const pointFromEvent = (event) => {
    const canvas = padRef.current
    const rect = canvas.getBoundingClientRect()
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    }
  }

  const startDraw = (event) => {
    const canvas = padRef.current
    if (!canvas) return
    event.preventDefault()
    canvas.setPointerCapture?.(event.pointerId)
    drawingRef.current = true
    const pt = pointFromEvent(event)
    lastPointRef.current = pt
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = inkColor
    ctx.beginPath()
    ctx.arc(pt.x, pt.y, strokeWidth / 2, 0, Math.PI * 2)
    ctx.fill()
    setHasStroke(true)
    setError('')
  }

  const moveDraw = (event) => {
    if (!drawingRef.current || !padRef.current) return
    const ctx = padRef.current.getContext('2d')
    const pt = pointFromEvent(event)
    const prev = lastPointRef.current || pt
    ctx.strokeStyle = inkColor
    ctx.lineWidth = strokeWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(prev.x, prev.y)
    ctx.lineTo(pt.x, pt.y)
    ctx.stroke()
    lastPointRef.current = pt
  }

  const endDraw = () => {
    drawingRef.current = false
    lastPointRef.current = null
  }

  const handleSubmit = async () => {
    setError('')
    try {
      if (tab === 'draw') {
        const trimmed = padRef.current ? trimTransparentCanvas(padRef.current) : null
        if (!trimmed || !hasStroke) {
          setError('Draw your signature inside the box first.')
          return
        }
        const file = await canvasToPngFile(trimmed, 'signature.png')
        await onInsert(file)
        return
      }

      if (tab === 'type') {
        const text = typedText.trim()
        if (!text) {
          setError('Enter the signature name first.')
          return
        }
        const canvas = document.createElement('canvas')
        canvas.width = 720
        canvas.height = 200
        const ctx = canvas.getContext('2d')
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.fillStyle = inkColor
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        let size = 76
        const stack = cssFontFamily(scriptFont)
        ctx.font = `${size}px ${stack}`
        while (ctx.measureText(text).width > 660 && size > 28) {
          size -= 4
          ctx.font = `${size}px ${stack}`
        }
        ctx.fillText(text, canvas.width / 2, canvas.height / 2)
        const trimmed = trimTransparentCanvas(canvas) || canvas
        const file = await canvasToPngFile(trimmed, 'signature.png')
        await onInsert(file)
        return
      }

      if (!uploadFile) {
        setError('Choose a signature image to upload.')
        return
      }
      const processed = await processUploadedSignatureFile(uploadFile, stripWhiteBg)
      await onInsert(processed)
    } catch (err) {
      setError(err?.message || 'Could not insert signature.')
    }
  }

  const handleUseSavedInstituteSignature = async () => {
    if (!savedSignatureUrl) return
    setError('')
    try {
      const response = await fetch(savedSignatureUrl)
      if (!response.ok) throw new Error('Could not load saved signature.')
      const blob = await response.blob()
      const file = new File([blob], 'institute-signature.png', { type: blob.type || 'image/png' })
      await onInsert(file)
    } catch (err) {
      setError(err?.message || 'Could not load institute signature.')
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !busy && onClose()}
      title="Add signature"
      description="Draw, type in calligraphy, or upload a signature image to place on the certificate."
      size="wide"
      footer={
        <>
          <button type="button" className="cert-btn-outline" disabled={busy} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="cert-btn-primary" disabled={busy} onClick={handleSubmit}>
            <FaIcon icon="check" className="h-3.5 w-3.5" />
            {busy ? 'Uploading…' : 'Insert signature'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--cert-line)] pb-3">
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Signature input modes">
            {[
              { id: 'draw', label: 'Draw', icon: 'pen' },
              { id: 'type', label: 'Type', icon: 'font' },
              { id: 'upload', label: 'Upload image', icon: 'upload' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                onClick={() => {
                  setTab(item.id)
                  setError('')
                }}
                className={tab === item.id ? 'cert-btn-primary cert-btn-sm' : 'cert-btn-outline cert-btn-sm'}
              >
                <FaIcon icon={item.icon} className="h-3 w-3" />
                {item.label}
              </button>
            ))}
          </div>

          {savedSignatureUrl ? (
            <button
              type="button"
              className="cert-btn-outline cert-btn-sm"
              disabled={busy}
              onClick={handleUseSavedInstituteSignature}
            >
              <FaIcon icon="shield" className="h-3 w-3" />
              Use institute signature
            </button>
          ) : null}
        </div>

        {tab === 'draw' ? (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-[var(--cert-radius)] border border-dashed border-[var(--cert-navy)]/40 bg-white">
              <canvas
                ref={padRef}
                width={560}
                height={180}
                onPointerDown={startDraw}
                onPointerMove={moveDraw}
                onPointerUp={endDraw}
                onPointerCancel={endDraw}
                className="h-44 w-full cursor-crosshair touch-none bg-[linear-gradient(transparent_78%,rgba(26,39,68,0.09)_79%,transparent_80%)]"
                aria-label="Signature drawing pad"
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-[var(--cert-muted)]">Ink:</span>
                  {INK_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setInkColor(c.value)}
                      className={`h-6 w-6 rounded-full border transition-transform ${
                        inkColor === c.value ? 'scale-110 ring-2 ring-[var(--cert-gold)]' : 'border-[var(--cert-line)]'
                      }`}
                      style={{ backgroundColor: c.value }}
                      aria-label={c.label}
                      title={c.label}
                    />
                  ))}
                </div>
                <label className="flex items-center gap-2 text-xs font-medium text-[var(--cert-muted)]">
                  Thickness
                  <select
                    className="cert-input w-24 py-1 text-xs"
                    value={strokeWidth}
                    onChange={(e) => setStrokeWidth(Number(e.target.value))}
                  >
                    <option value={2}>Fine</option>
                    <option value={3}>Medium</option>
                    <option value={5}>Bold</option>
                  </select>
                </label>
              </div>
              <button type="button" className="cert-btn-outline cert-btn-sm" onClick={clearPad}>
                <FaIcon icon="eraser" className="h-3 w-3" />
                Clear
              </button>
            </div>
          </div>
        ) : null}

        {tab === 'type' ? (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-medium text-[var(--cert-navy)]">
                Signatory name
                <input
                  type="text"
                  className="cert-input mt-1"
                  value={typedText}
                  onChange={(e) => setTypedText(e.target.value)}
                  placeholder="Jordan Beauty"
                />
              </label>
              <label className="block text-xs font-medium text-[var(--cert-navy)]">
                Calligraphy style
                <select
                  className="cert-input mt-1"
                  value={scriptFont}
                  onChange={(e) => setScriptFont(e.target.value)}
                >
                  {SCRIPT_FONTS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-[var(--cert-muted)]">Ink:</span>
              {INK_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setInkColor(c.value)}
                  className={`h-6 w-6 rounded-full border ${
                    inkColor === c.value ? 'scale-110 ring-2 ring-[var(--cert-gold)]' : 'border-[var(--cert-line)]'
                  }`}
                  style={{ backgroundColor: c.value }}
                  aria-label={c.label}
                  title={c.label}
                />
              ))}
            </div>

            <div className="flex min-h-28 items-center justify-center rounded-[var(--cert-radius)] border border-[var(--cert-line)] bg-[var(--cert-ivory)]/50 px-4 py-6">
              <span
                className="text-4xl leading-tight"
                style={{ fontFamily: cssFontFamily(scriptFont), color: inkColor }}
              >
                {typedText || 'Signature preview'}
              </span>
            </div>
          </div>
        ) : null}

        {tab === 'upload' ? (
          <div className="space-y-3">
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--cert-radius)] border border-dashed border-[var(--cert-line)] bg-[var(--cert-ivory)]/40 px-4 py-6 text-center hover:border-[var(--cert-navy)]">
              <FaIcon icon="upload" className="h-5 w-5 text-[var(--cert-navy)]" />
              <span className="text-sm font-medium text-[var(--cert-navy)]">
                {uploadFile ? uploadFile.name : 'Choose signature PNG, JPG, or WebP'}
              </span>
              <input
                type="file"
                className="sr-only"
                accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                onChange={(e) => {
                  setUploadFile(e.target.files?.[0] || null)
                  setError('')
                }}
              />
            </label>

            <label className="inline-flex items-center gap-2 text-xs font-medium text-[var(--cert-navy)]">
              <input
                type="checkbox"
                checked={stripWhiteBg}
                onChange={(e) => setStripWhiteBg(e.target.checked)}
              />
              Remove white paper background (make signature transparent)
            </label>

            {uploadPreview ? (
              <div className="flex justify-center rounded-[var(--cert-radius)] border border-[var(--cert-line)] bg-white p-4">
                <img src={uploadPreview} alt="Signature preview" className="max-h-28 object-contain" />
              </div>
            ) : null}
          </div>
        ) : null}

        {error ? <p className="text-xs font-medium text-[var(--cert-danger)]">{error}</p> : null}
      </div>
    </Modal>
  )
}

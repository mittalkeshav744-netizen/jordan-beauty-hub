/**
 * Map a pixel bounding box (origin top-left) to editor % coords
 * (x/y = center of the box, width/height = size as % of canvas).
 */
export function pixelBoxToPercent(box, imageWidth, imageHeight) {
  const left = Number(box.x0 ?? box.left ?? 0)
  const top = Number(box.y0 ?? box.top ?? 0)
  const right = Number(box.x1 ?? box.right ?? left)
  const bottom = Number(box.y1 ?? box.bottom ?? top)
  const w = Math.max(1, right - left)
  const h = Math.max(1, bottom - top)
  const cx = left + w / 2
  const cy = top + h / 2
  return {
    x: clampPercent((cx / imageWidth) * 100),
    y: clampPercent((cy / imageHeight) * 100),
    width: clampPercent((w / imageWidth) * 100, 2, 100),
    height: clampPercent((h / imageHeight) * 100, 1, 100),
  }
}

function clampPercent(n, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Number.isFinite(n) ? n : 0))
}

function rgbToHex(r, g, b) {
  const h = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
  return `#${h(r)}${h(g)}${h(b)}`
}

function luminance(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

const DYNAMIC_RULES = [
  { re: /^(student(\s+name)?|candidate(\s+name)?|awarded to|presented to)\b/i, placeholder: '{{student_name}}' },
  { re: /^(course(\s+name)?|program(\s+name)?|diploma(\s+name)?)\b/i, placeholder: '{{course_name}}' },
  { re: /enrol+ment|enroll(ment)?\s*(no|number|#)?/i, placeholder: '{{enrollment_number}}' },
  { re: /certificate\s*(id|#|no\.?|number)/i, placeholder: '{{certificate_id}}' },
  { re: /^(issue[d]?\s*date|date\s*of\s*issue|dated)\b/i, placeholder: '{{issue_date}}' },
  { re: /^(completion\s*date|date\s*of\s*completion|completed\s*on)\b/i, placeholder: '{{completion_date}}' },
  { re: /^(grade|score|marks)\b/i, placeholder: '{{grade}}' },
  { re: /^(institute|academy|college|school)(\s+name)?\b/i, placeholder: '{{institute_name}}' },
  { re: /^(duration|weeks|months|hours)\b/i, placeholder: '{{duration}}' },
]

/**
 * Guess a dynamic placeholder from OCR text; otherwise return null (use static text).
 */
export function guessDynamicPlaceholder(text) {
  const raw = String(text || '').trim()
  if (!raw || raw.length > 48) return null
  for (const rule of DYNAMIC_RULES) {
    if (rule.re.test(raw)) return rule.placeholder
  }
  return null
}

export function estimateFontSize(boxHeightPx, imageHeight) {
  // Map glyph box height → CSS px on a ~640px-tall preview, with a gentle floor/ceiling.
  const pagePx = 720
  const size = (boxHeightPx / Math.max(1, imageHeight)) * pagePx * 1.05
  return Math.round(clampPercent(size, 11, 84))
}

function looksLikePersonName(text) {
  const raw = String(text || '').trim()
  if (!raw || raw.length > 42) return false
  if (/certificate|doctorate|awarded|recognition|conferred|chancellor|degree|arts/i.test(raw)) {
    return false
  }
  const words = raw.split(/\s+/).filter(Boolean)
  if (words.length < 2 || words.length > 4) return false
  return words.every((w) => /^[A-Z][a-z'’.-]+$/.test(w) || /^[A-Z]\.?$/.test(w))
}

/**
 * Sample cover fill + ink color + weight/style hints from the photo crop.
 * True typeface ID is not possible in-browser; we classify into editor families.
 */
export function analyzeTextCrop(imageData, { text = '', boxHeightPx = 0, imageHeight = 1 } = {}) {
  const { data, width, height } = imageData
  if (!width || !height || !data?.length) {
    return {
      fill: '#f7f3ec',
      color: '#1a1a1a',
      fontFamily: 'cormorant',
      fontWeight: 'normal',
      fontStyle: 'normal',
      detectedFontLabel: 'Serif (Cormorant Garamond)',
    }
  }

  const cornerSamples = []
  const inkSamples = []
  const step = Math.max(1, Math.floor(Math.min(width, height) / 48))

  const pushRgb = (arr, i) => {
    arr.push([data[i], data[i + 1], data[i + 2]])
  }

  // Corners / rim → background (cover fill)
  const rim = Math.max(1, Math.floor(Math.min(width, height) * 0.12))
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const onRim = x < rim || y < rim || x >= width - rim || y >= height - rim
      if (!onRim) continue
      pushRgb(cornerSamples, (y * width + x) * 4)
    }
  }

  const bg =
    cornerSamples.length > 0
      ? medianRgb(cornerSamples)
      : [247, 243, 236]
  const bgLum = luminance(...bg)

  // Interior dark/saturated pixels → ink
  for (let y = rim; y < height - rim; y += step) {
    for (let x = rim; x < width - rim; x += step) {
      const i = (y * width + x) * 4
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const lum = luminance(r, g, b)
      const sat = Math.max(r, g, b) - Math.min(r, g, b)
      const isInk = bgLum - lum > 28 || (sat > 35 && lum < bgLum - 10)
      if (isInk) inkSamples.push([r, g, b])
    }
  }

  const ink = inkSamples.length > 8 ? medianRgb(inkSamples) : [26, 26, 26]
  const inkRatio = inkSamples.length / Math.max(1, Math.floor(((width - 2 * rim) * (height - 2 * rim)) / (step * step)))

  const relativeHeight = boxHeightPx / Math.max(1, imageHeight)
  const isDisplay = relativeHeight >= 0.045 || (text.length <= 18 && relativeHeight >= 0.032)
  const isScript =
    looksLikePersonName(text) ||
    (relativeHeight >= 0.035 && text.split(/\s+/).length <= 4 && inkRatio < 0.22 && /[a-z]/.test(text))

  let fontFamily = 'cormorant'
  let fontWeight = inkRatio > 0.34 || (isDisplay && text === text.toUpperCase()) ? 'bold' : 'normal'
  let fontStyle = 'normal'
  let detectedFontLabel = 'Serif (Cormorant Garamond)'

  if (isScript) {
    fontFamily = 'script'
    fontWeight = 'normal'
    fontStyle = 'normal'
    detectedFontLabel = 'Script / cursive (Great Vibes)'
  } else if (isDisplay && text === text.toUpperCase() && text.length <= 24) {
    fontFamily = 'cormorant'
    fontWeight = 'bold'
    detectedFontLabel = 'Display serif bold (Cormorant Garamond)'
  } else if (relativeHeight < 0.028 && text.length > 40) {
    fontFamily = 'times'
    fontWeight = 'normal'
    detectedFontLabel = 'Body serif (Times)'
  } else if (!/[a-z]/.test(text) && text.length > 2) {
    fontFamily = 'cormorant'
    detectedFontLabel = fontWeight === 'bold' ? 'All-caps serif bold' : 'All-caps serif (Cormorant)'
  }

  // Green certificate titles often use dark green ink — keep sampled color.
  return {
    fill: rgbToHex(...bg),
    color: rgbToHex(...ink),
    fontFamily,
    fontWeight,
    fontStyle,
    detectedFontLabel,
    inkRatio,
  }
}

function medianRgb(samples) {
  const channel = (idx) => {
    const vals = samples.map((s) => s[idx]).sort((a, b) => a - b)
    return vals[Math.floor(vals.length / 2)] || 0
  }
  return [channel(0), channel(1), channel(2)]
}

export function guessAlign(pct) {
  const left = pct.x - pct.width / 2
  // Certificates are usually left-stacked; only treat as centered when the block sits mid-page.
  if (Math.abs(pct.x - 50) < 10 && left > 18 && pct.width > 35) return 'center'
  return 'left'
}

function lineMetrics(line) {
  const text = String(line.text || '').replace(/[ \t]+/g, ' ').trim()
  const box = line.bbox || line
  const x0 = Number(box.x0 ?? box.left ?? 0)
  const y0 = Number(box.y0 ?? box.top ?? 0)
  const x1 = Number(box.x1 ?? box.right ?? x0)
  const y1 = Number(box.y1 ?? box.bottom ?? y0)
  return {
    text,
    confidence: Number(line.confidence ?? line.conf ?? 0),
    x0,
    y0,
    x1,
    y1,
    h: Math.max(1, y1 - y0),
  }
}

function isStandaloneLine(metrics) {
  if (!metrics?.text) return true
  if (looksLikePersonName(metrics.text)) return true
  const letters = metrics.text.replace(/[^A-Za-z]/g, '')
  const upper = letters && letters === letters.toUpperCase() && metrics.text.length <= 42
  return Boolean(upper)
}

/**
 * Join neighbouring body lines into one paragraph so a certificate
 * does not become a stack of thin cover strips.
 */
export function groupCertificateLines(lines, imageWidth) {
  const prepared = (lines || [])
    .map(lineMetrics)
    .filter((line) => line.text.length >= 2 && line.confidence >= 40)
    .sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0)

  const groups = []
  for (const line of prepared) {
    const prev = groups[groups.length - 1]
    const prevLine = prev?.lines[prev.lines.length - 1]
    const gap = prevLine ? line.y0 - prevLine.y1 : 9999
    const heightClose = prevLine && Math.abs(prevLine.h - line.h) / Math.max(prevLine.h, line.h) <= 0.4
    const leftClose = prevLine && Math.abs(line.x0 - prev.x0) <= imageWidth * 0.08
    const gapClose = prevLine && gap > -line.h * 0.35 && gap <= line.h * 0.9
    const bothBody = prevLine && !isStandaloneLine(prevLine) && !isStandaloneLine(line)
    const longEnough = prevLine && (prevLine.text.length >= 18 || line.text.length >= 18)
    if (prev && heightClose && leftClose && gapClose && bothBody && longEnough) {
      prev.lines.push(line)
      prev.x0 = Math.min(prev.x0, line.x0)
      prev.y0 = Math.min(prev.y0, line.y0)
      prev.x1 = Math.max(prev.x1, line.x1)
      prev.y1 = Math.max(prev.y1, line.y1)
      prev.confidence = Math.min(prev.confidence, line.confidence)
    } else {
      groups.push({
        lines: [line],
        x0: line.x0,
        y0: line.y0,
        x1: line.x1,
        y1: line.y1,
        confidence: line.confidence,
      })
    }
  }

  return groups.map((group) => ({
    text: group.lines.map((line) => line.text).join('\n'),
    confidence: group.confidence,
    bbox: { x0: group.x0, y0: group.y0, x1: group.x1, y1: group.y1 },
    lineHeightPx: group.lines.reduce((sum, line) => sum + line.h, 0) / group.lines.length,
  }))
}

/**
 * Convert OCR lines into cover + text/dynamic layers, optionally styled from image crops.
 */
export function ocrLinesToElements(lines, imageWidth, imageHeight, startZ = 1, styleForLine) {
  const elements = []
  let z = startZ
  const grouped = groupCertificateLines(lines, imageWidth)
  for (let i = 0; i < grouped.length; i += 1) {
    const line = grouped[i]
    const text = line.text
    const confidence = Number(line.confidence ?? 80)
    if (confidence < 40) continue
    const box = line.bbox || line
    const pct = pixelBoxToPercent(box, imageWidth, imageHeight)
    const boxH = Math.max(1, line.lineHeightPx || (box.y1 ?? box.bottom ?? 0) - (box.y0 ?? box.top ?? 0))
    const style =
      typeof styleForLine === 'function'
        ? styleForLine(line, i, pct)
        : {
            fill: '#f7f3ec',
            color: '#1a1a1a',
            fontFamily: 'cormorant',
            fontWeight: 'normal',
            fontStyle: 'normal',
            detectedFontLabel: 'Serif (Cormorant Garamond)',
          }

    // Generous cover so original print does not ghost through.
    const padW = Math.min(100, pct.width + 4)
    const padH = Math.min(100, pct.height + Math.max(1.8, (boxH / imageHeight) * 100 * 0.45))
    const coverId = `ocr-cover-${z}`
    const textId = `ocr-text-${z}`
    elements.push({
      id: coverId,
      type: 'cover',
      x: pct.x,
      y: pct.y,
      width: padW,
      height: padH,
      fill: style.fill || '#f7f3ec',
      zIndex: z,
    })
    z += 1

    const fontSize = estimateFontSize(boxH, imageHeight)
    const align = text.includes('\n') ? 'left' : guessAlign(pct)
    const dynamic = text.includes('\n') ? null : guessDynamicPlaceholder(text)
    const base = {
      id: textId,
      x: pct.x,
      y: pct.y,
      width: Math.min(100, padW + 1),
      fontSize,
      fontFamily: style.fontFamily || 'cormorant',
      fontWeight: style.fontWeight || (fontSize >= 28 ? 'bold' : 'normal'),
      fontStyle: style.fontStyle || 'normal',
      lineHeight: text.includes('\n') ? 1.35 : 1.15,
      align,
      color: style.color || '#1a1a1a',
      detectedFontLabel: style.detectedFontLabel || '',
      zIndex: z,
    }
    if (dynamic) {
      elements.push({ ...base, type: 'dynamic', placeholder: dynamic })
    } else {
      elements.push({ ...base, type: 'text', text })
    }
    z += 1
  }
  return elements
}

function loadImageElement(imageUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not load certificate image for OCR.'))
    img.crossOrigin = 'anonymous'
    img.src = imageUrl
  })
}

function getCropImageData(ctx, box, imageWidth, imageHeight) {
  const left = Math.max(0, Math.floor(Number(box.x0 ?? box.left ?? 0)))
  const top = Math.max(0, Math.floor(Number(box.y0 ?? box.top ?? 0)))
  const right = Math.min(imageWidth, Math.ceil(Number(box.x1 ?? box.right ?? left + 1)))
  const bottom = Math.min(imageHeight, Math.ceil(Number(box.y1 ?? box.bottom ?? top + 1)))
  const w = Math.max(1, right - left)
  const h = Math.max(1, bottom - top)
  try {
    return ctx.getImageData(left, top, w, h)
  } catch {
    return { data: new Uint8ClampedArray(4), width: 1, height: 1 }
  }
}

/**
 * Run browser OCR on an image URL/blob URL. Returns layout elements (cover + text).
 */
export async function detectTextOnCertificateImage(imageUrl, { startZ = 1 } = {}) {
  const img = await loadImageElement(imageUrl)
  const width = img.naturalWidth || img.width
  const height = img.naturalHeight || img.height

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(img, 0, 0)

  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('eng')
  try {
    const result = await worker.recognize(canvas)
    const data = result?.data || {}
    const lines = []
    const blocks = data.blocks || []
    if (blocks.length) {
      for (const block of blocks) {
        for (const para of block.paragraphs || []) {
          for (const line of para.lines || []) {
            lines.push({
              text: line.text,
              confidence: line.confidence,
              bbox: line.bbox,
            })
          }
        }
      }
    } else if (Array.isArray(data.lines)) {
      for (const line of data.lines) {
        lines.push({
          text: line.text,
          confidence: line.confidence,
          bbox: line.bbox,
        })
      }
    }

    const elements = ocrLinesToElements(lines, width, height, startZ, (line) => {
      const box = line.bbox || line
      const boxH = Math.max(1, line.lineHeightPx || (box.y1 ?? 0) - (box.y0 ?? 0))
      const pad = Math.round(boxH * 0.45)
      const crop = getCropImageData(
        ctx,
        {
          x0: Number(box.x0 ?? 0) - pad,
          y0: Number(box.y0 ?? 0) - pad,
          x1: Number(box.x1 ?? 0) + pad,
          y1: Number(box.y1 ?? 0) + pad,
        },
        width,
        height,
      )
      return analyzeTextCrop(crop, {
        text: String(line.text || '').split('\n')[0],
        boxHeightPx: boxH,
        imageHeight: height,
      })
    })

    return {
      elements,
      imageWidth: width,
      imageHeight: height,
      lineCount: lines.length,
    }
  } finally {
    await worker.terminate()
  }
}

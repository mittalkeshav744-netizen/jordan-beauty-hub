import { describe, expect, it } from 'vitest'

import {
  analyzeTextCrop,
  estimateFontSize,
  groupCertificateLines,
  guessAlign,
  guessDynamicPlaceholder,
  ocrLinesToElements,
  pixelBoxToPercent,
} from './certificateOcr'

describe('certificateOcr helpers', () => {
  it('maps pixel boxes to centered percent coords', () => {
    const pct = pixelBoxToPercent({ x0: 100, y0: 50, x1: 300, y1: 150 }, 1000, 500)
    expect(pct.x).toBe(20)
    expect(pct.y).toBe(20)
    expect(pct.width).toBe(20)
    expect(pct.height).toBe(20)
  })

  it('guesses dynamic placeholders from OCR labels', () => {
    expect(guessDynamicPlaceholder('Student Name')).toBe('{{student_name}}')
    expect(guessDynamicPlaceholder('Enrollment No')).toBe('{{enrollment_number}}')
    expect(guessDynamicPlaceholder('Random award title')).toBeNull()
  })

  it('builds cover + text layers from OCR lines', () => {
    const elements = ocrLinesToElements(
      [
        {
          text: 'Certificate of Completion',
          confidence: 90,
          bbox: { x0: 100, y0: 40, x1: 900, y1: 120 },
        },
        {
          text: 'Student Name',
          confidence: 88,
          bbox: { x0: 200, y0: 200, x1: 800, y1: 260 },
        },
      ],
      1000,
      700,
      5,
    )
    expect(elements.length).toBe(4)
    expect(elements[0].type).toBe('cover')
    expect(elements[0].fill).toMatch(/^#/)
    expect(elements[1].type).toBe('text')
    expect(elements[1].text).toBe('Certificate of Completion')
    expect(elements[1].align).toBe('left')
    expect(elements[2].type).toBe('cover')
    expect(elements[3].type).toBe('dynamic')
    expect(elements[3].placeholder).toBe('{{student_name}}')
  })

  it('estimates readable font sizes from box height', () => {
    expect(estimateFontSize(80, 700)).toBeGreaterThan(40)
    expect(estimateFontSize(20, 700)).toBeGreaterThanOrEqual(11)
  })

  it('classifies person-name crops as script when ink is sparse', () => {
    const width = 120
    const height = 40
    const data = new Uint8ClampedArray(width * height * 4)
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 247
      data[i + 1] = 243
      data[i + 2] = 236
      data[i + 3] = 255
    }
    // Sparse dark pixels in the middle (script-like)
    for (let x = 20; x < 100; x += 6) {
      const i = (20 * width + x) * 4
      data[i] = 10
      data[i + 1] = 60
      data[i + 2] = 30
    }
    const style = analyzeTextCrop(
      { data, width, height },
      { text: 'Agustin Jerde', boxHeightPx: 60, imageHeight: 800 },
    )
    expect(style.fontFamily).toBe('script')
    expect(style.detectedFontLabel.toLowerCase()).toContain('script')
  })

  it('prefers left align for left-stacked certificate text', () => {
    expect(guessAlign({ x: 28, y: 40, width: 40, height: 4 })).toBe('left')
  })

  it('joins neighbouring body lines into one editable paragraph', () => {
    const grouped = groupCertificateLines(
      [
        {
          text: 'has been awarded the honorary degree of Doctor of Arts',
          confidence: 90,
          bbox: { x0: 80, y0: 400, x1: 820, y1: 430 },
        },
        {
          text: 'in recognition of outstanding achievement and dedication',
          confidence: 90,
          bbox: { x0: 82, y0: 438, x1: 810, y1: 468 },
        },
        {
          text: 'HONORARY DOCTORATE',
          confidence: 92,
          bbox: { x0: 80, y0: 40, x1: 520, y1: 80 },
        },
      ],
      1000,
    )
    expect(grouped).toHaveLength(2)
    expect(grouped[0].text).toBe('HONORARY DOCTORATE')
    expect(grouped[1].text).toContain('\n')
  })
})

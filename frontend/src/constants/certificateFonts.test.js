import { describe, expect, it } from 'vitest'

import {
  CERTIFICATE_FONT_GROUPS,
  FONT_FAMILIES,
  cssFontFamily,
} from './certificateFonts'

describe('certificateFonts', () => {
  it('groups fonts across sans-serif, serif, script, display, and monospace', () => {
    const groupLabels = CERTIFICATE_FONT_GROUPS.map((g) => g.label)
    expect(groupLabels).toEqual([
      'Sans-Serif',
      'Serif',
      'Script & Calligraphy',
      'Display & Headings',
      'Monospace',
    ])
    const values = FONT_FAMILIES.map((f) => f.value)
    expect(values).toContain('open-sans')
    expect(values).toContain('poppins')
    expect(values).toContain('cormorant')
    expect(values).toContain('playfair')
    expect(values).toContain('script')
    expect(values).toContain('dancing-script')
    expect(values).toContain('roboto-mono')
  })

  it('resolves canonical keys and legacy aliases to matching CSS font stacks', () => {
    expect(cssFontFamily('open-sans')).toContain('"Open Sans"')
    expect(cssFontFamily('Open Sans')).toContain('"Open Sans"')
    expect(cssFontFamily('opensans')).toContain('"Open Sans"')
    expect(cssFontFamily('playfair')).toContain('"Playfair Display"')
    expect(cssFontFamily('cormorant-garamond')).toContain('"Cormorant Garamond"')
    expect(cssFontFamily('roboto_mono')).toContain('"Roboto Mono"')
    expect(cssFontFamily('unknown-font')).toBe('Helvetica, Arial, sans-serif')
  })
})

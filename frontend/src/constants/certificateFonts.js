/**
 * Grouped typography catalog shared by the Certificate Template Editor.
 * Every custom font key here maps 1:1 to bundled TTFs in backend/apps/certificates/fonts/.
 */
export const CERTIFICATE_FONT_GROUPS = [
  {
    label: 'Sans-Serif',
    fonts: [
      { value: 'open-sans', label: 'Open Sans', css: '"Open Sans", Arial, sans-serif' },
      { value: 'poppins', label: 'Poppins', css: '"Poppins", Arial, sans-serif' },
      { value: 'roboto', label: 'Roboto', css: '"Roboto", Arial, sans-serif' },
      { value: 'lato', label: 'Lato', css: '"Lato", Arial, sans-serif' },
      { value: 'montserrat', label: 'Montserrat', css: '"Montserrat", Arial, sans-serif' },
      { value: 'inter', label: 'Inter', css: '"Inter", Arial, sans-serif' },
      { value: 'nunito', label: 'Nunito', css: '"Nunito", Arial, sans-serif' },
      { value: 'raleway', label: 'Raleway', css: '"Raleway", Arial, sans-serif' },
      { value: 'helvetica', label: 'Helvetica', css: 'Helvetica, Arial, sans-serif' },
    ],
  },
  {
    label: 'Serif',
    fonts: [
      {
        value: 'cormorant',
        label: 'Cormorant Garamond',
        css: '"Cormorant Garamond", Georgia, "Times New Roman", serif',
      },
      {
        value: 'playfair',
        label: 'Playfair Display',
        css: '"Playfair Display", Georgia, "Times New Roman", serif',
      },
      {
        value: 'merriweather',
        label: 'Merriweather',
        css: '"Merriweather", Georgia, "Times New Roman", serif',
      },
      { value: 'lora', label: 'Lora', css: '"Lora", Georgia, "Times New Roman", serif' },
      { value: 'cinzel', label: 'Cinzel', css: '"Cinzel", Georgia, "Times New Roman", serif' },
      {
        value: 'libre-baskerville',
        label: 'Libre Baskerville',
        css: '"Libre Baskerville", Georgia, "Times New Roman", serif',
      },
      { value: 'times', label: 'Times New Roman', css: '"Times New Roman", Times, serif' },
    ],
  },
  {
    label: 'Script & Calligraphy',
    fonts: [
      {
        value: 'script',
        label: 'Great Vibes',
        css: '"Great Vibes", "Segoe Script", "Brush Script MT", cursive',
      },
      {
        value: 'dancing-script',
        label: 'Dancing Script',
        css: '"Dancing Script", "Segoe Script", cursive',
      },
      {
        value: 'alex-brush',
        label: 'Alex Brush',
        css: '"Alex Brush", "Segoe Script", cursive',
      },
      { value: 'pacifico', label: 'Pacifico', css: '"Pacifico", "Segoe Script", cursive' },
      { value: 'allura', label: 'Allura', css: '"Allura", "Segoe Script", cursive' },
    ],
  },
  {
    label: 'Display & Headings',
    fonts: [
      { value: 'oswald', label: 'Oswald', css: '"Oswald", Impact, sans-serif' },
      {
        value: 'bricolage',
        label: 'Bricolage Grotesque',
        css: '"Bricolage Grotesque", Arial, sans-serif',
      },
    ],
  },
  {
    label: 'Monospace',
    fonts: [
      { value: 'roboto-mono', label: 'Roboto Mono', css: '"Roboto Mono", "Courier New", monospace' },
      { value: 'courier', label: 'Courier', css: '"Courier New", Courier, monospace' },
    ],
  },
]

export const FONT_FAMILIES = CERTIFICATE_FONT_GROUPS.flatMap((group) => group.fonts)

const CSS_BY_KEY = new Map(FONT_FAMILIES.map((f) => [f.value, f.css]))

const FONT_ALIASES = {
  opensans: 'open-sans',
  'open-sans': 'open-sans',
  sans: 'open-sans',
  'sans-serif': 'helvetica',
  'cormorant-garamond': 'cormorant',
  cormorantgaramond: 'cormorant',
  garamond: 'cormorant',
  'playfair-display': 'playfair',
  playfairdisplay: 'playfair',
  librebaskerville: 'libre-baskerville',
  'great-vibes': 'script',
  greatvibes: 'script',
  cursive: 'script',
  dancingscript: 'dancing-script',
  alexbrush: 'alex-brush',
  'bricolage-grotesque': 'bricolage',
  bricolagegrotesque: 'bricolage',
  robotomono: 'roboto-mono',
  'times-roman': 'times',
  'times-new-roman': 'times',
  serif: 'times',
  mono: 'courier',
  monospace: 'courier',
}

/**
 * Resolve a stored template element font key (or legacy alias) to a CSS font-family stack.
 */
export function cssFontFamily(family) {
  const normalized = (family || 'helvetica').trim().toLowerCase().replace(/[\s_]+/g, '-')
  const canonical = FONT_ALIASES[normalized] || normalized
  return CSS_BY_KEY.get(canonical) || 'Helvetica, Arial, sans-serif'
}

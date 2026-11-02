/** Writable storefront config fields sent to the portal API. */
export const STOREFRONT_WRITE_FIELDS = [
  'announcement_text',
  'announcement_link',
  'announcement_enabled',
  'hero_tag',
  'hero_title',
  'hero_rotating_lines',
  'hero_media_type',
  'hero_video_url',
  'hero_video_loop_end',
  'hero_primary_cta_text',
  'hero_primary_cta_link',
  'hero_secondary_cta_text',
  'hero_secondary_cta_link',
  'marquee_items',
  'quiz_badge',
  'quiz_title',
  'quiz_subtitle',
  'quiz_button_text',
  'quiz_link',
  'quiz_enabled',
  'benefits',
  'budget_tiles',
  'sections_order',
]

const RECOMMENDATIONS_SECTION = {
  id: 'recommendations',
  name: 'Formulated For You (Personalized)',
  enabled: true,
}

/** Build editable form state from the API config payload. */
export function buildStorefrontForm(config) {
  if (!config) return null
  const sections = (config.sections_order || []).map((section) => ({ ...section }))
  if (sections.length > 0 && !sections.some((section) => section.id === 'recommendations')) {
    const quizIdx = sections.findIndex((section) => section.id === 'quiz')
    const insertIdx = quizIdx !== -1 ? quizIdx + 1 : 2
    sections.splice(insertIdx, 0, { ...RECOMMENDATIONS_SECTION })
  }
  return {
    ...config,
    hero_rotating_lines: [...(config.hero_rotating_lines || [])],
    marquee_items: [...(config.marquee_items || [])],
    benefits: (config.benefits || []).map((benefit) => ({ ...benefit })),
    budget_tiles: (config.budget_tiles || []).map((tile) => ({
      label: tile.label || 'Under',
      amount: tile.amount || '',
      to: tile.to || '/shop',
    })),
    sections_order: sections,
  }
}

/** Strip read-only / UI-only fields before PATCH. */
export function storefrontWritePayload(form, heroVideoFile = null) {
  const payload = {}
  for (const key of STOREFRONT_WRITE_FIELDS) {
    if (form[key] !== undefined) payload[key] = form[key]
  }
  if (heroVideoFile instanceof File) {
    payload.hero_video_file = heroVideoFile
  }
  return payload
}

export function reelPreviewSrc(reel) {
  return reel?.video_file_url || reel?.video_url || ''
}

export function heroPreviewSrc(config) {
  return config?.hero_video_file_url || config?.hero_video_url || ''
}

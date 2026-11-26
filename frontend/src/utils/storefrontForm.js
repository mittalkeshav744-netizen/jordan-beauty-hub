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
  'footer_tagline',
  'footer_shop_title',
  'footer_account_title',
  'footer_help_title',
  'footer_shop_links',
  'footer_account_links',
  'footer_help_links',
  'footer_include_categories',
  'policies',
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
  const mapLinks = (links) =>
    (links || []).map((link) => ({
      label: link.label || '',
      to: link.to || '/',
      ...(link.show ? { show: link.show } : {}),
    }))

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
    footer_tagline:
      config.footer_tagline ||
      'Makeup, skincare, haircare and body care — chosen with care and delivered across India.',
    footer_shop_title: config.footer_shop_title || 'Shop',
    footer_account_title: config.footer_account_title || 'My account',
    footer_help_title: config.footer_help_title || 'Help',
    footer_shop_links: mapLinks(config.footer_shop_links),
    footer_account_links: mapLinks(config.footer_account_links),
    footer_help_links: mapLinks(config.footer_help_links),
    footer_include_categories: config.footer_include_categories !== false,
    policies: config.policies && typeof config.policies === 'object' ? config.policies : {},
  }
}

/** Strip read-only / UI-only fields before PATCH. */
export function storefrontWritePayload(form, heroVideoFile = null, storeLogoFile = null) {
  const payload = {}
  for (const key of STOREFRONT_WRITE_FIELDS) {
    if (form[key] !== undefined) payload[key] = form[key]
  }
  if (heroVideoFile instanceof File) {
    payload.hero_video_file = heroVideoFile
  }
  if (storeLogoFile instanceof File) {
    payload.store_logo = storeLogoFile
  }
  return payload
}

export function reelPreviewSrc(reel) {
  return reel?.video_file_url || reel?.video_url || ''
}

export function heroPreviewSrc(config) {
  return config?.hero_video_file_url || config?.hero_video_url || ''
}

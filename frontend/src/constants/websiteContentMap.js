/** Editable storefront regions shown in the owner “Website content” map. */
export const WEBSITE_CONTENT_TARGETS = [
  { path: '/manage/storefront?focus=hero', label: 'Hero banner' },
  { path: '/manage/storefront?focus=announcement', label: 'Announcement bar' },
  { path: '/manage/storefront?focus=marquee', label: 'Marquee ticker' },
  { path: '/manage/storefront?focus=quiz', label: 'Skin quiz promo' },
  { path: '/manage/storefront?focus=reels', label: 'Watch & shop reels' },
  { path: '/manage/storefront?focus=sections', label: 'Homepage section order' },
  { path: '/manage/storefront?focus=benefits', label: 'Trust / benefits strip' },
  { path: '/manage/storefront?focus=budget', label: 'Shop by budget tiles' },
  { path: '/manage/categories?focus=categories', label: 'Shop by category' },
  { path: '/manage/products?focus=products', label: 'Products & new arrivals' },
  { path: '/manage/looks?focus=looks', label: 'Get the look' },
  { path: '/manage/newsletter?focus=newsletter', label: 'Newsletter signup' },
]

/** Storefront tab to open for a given ?focus= value. */
export const STOREFRONT_FOCUS_TAB = {
  announcement: 'hero',
  hero: 'hero',
  reels: 'reels',
  sections: 'sections',
  marquee: 'content',
  quiz: 'content',
  benefits: 'content',
  budget: 'content',
}

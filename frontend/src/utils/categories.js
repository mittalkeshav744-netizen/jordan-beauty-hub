/** How many categories appear in header nav and the home strip. */
export const FEATURED_CATEGORY_LIMIT = 6

/** Active categories already come sorted by sort_order from the API. */
export function topCategories(categories, limit = FEATURED_CATEGORY_LIMIT) {
  if (!Array.isArray(categories) || categories.length === 0) return []
  return categories.slice(0, limit)
}

export function categoryShopPath(category) {
  return `/shop?category=${category.slug}`
}

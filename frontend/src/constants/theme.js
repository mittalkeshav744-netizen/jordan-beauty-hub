/**
 * Category colours, in category order, so a category's home tile and its shop banner match.
 * Pair with a direction utility such as bg-linear-to-b or bg-linear-to-r.
 */
export const CATEGORY_GRADIENTS = [
  'from-tile-rose to-tile-rose-deep',
  'from-tile-orchid to-tile-orchid-deep',
  'from-tile-peach to-tile-peach-deep',
]

export function categoryGradient(index) {
  return CATEGORY_GRADIENTS[Math.max(index, 0) % CATEGORY_GRADIENTS.length]
}

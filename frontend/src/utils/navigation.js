/** True when a nav link like "/shop?category=lips" matches the current location. */
export function isNavLinkActive(linkTo, location) {
  const [path, query = ''] = linkTo.split('?')
  if (location.pathname !== path) return false
  const linkCategory = new URLSearchParams(query).get('category')
  const currentCategory = new URLSearchParams(location.search).get('category')
  return linkCategory === currentCategory
}

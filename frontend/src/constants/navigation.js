import { POLICY_LINKS } from './policies'

export const STORE_NAME = 'Jordan Beauty Hub'

/**
 * Brand logo. Put the logo file in frontend/public (e.g. public/logo.svg) and set
 * STORE_LOGO_SRC = '/logo.svg'. While it is null a "JBH" placeholder mark is shown.
 */
export const STORE_LOGO_SRC = null

export const ANNOUNCEMENT = 'Cash on delivery available across India'

/** Always first in the shop nav. Category links are loaded from the catalog API. */
export const SHOP_ALL_LINK = { label: 'Shop all', to: '/shop' }

/** Non-category nav items (kept after API category links). */
export const FEATURED_NAV_LINKS = [
  { label: 'Skin quiz', to: '/skin-quiz', highlight: true },
  { label: 'Get the look', to: '/looks', highlight: true },
  { label: 'Courses', to: '/courses', highlight: true },
]

/**
 * @deprecated Prefer useNavCategories() — categories are no longer hardcoded.
 * Kept as a static fallback shape for tests / empty API.
 */
export const MAIN_NAV_LINKS = [SHOP_ALL_LINK, ...FEATURED_NAV_LINKS]

/** Scrolling strip under the home page banner. */
export const MARQUEE_ITEMS = [
  'Cash on delivery across India',
  'Made for Indian skin tones',
  'Genuine products',
  'Take the free skin quiz',
  'Shop complete looks',
]

/**
 * Fallback “Shop by budget” tiles when storefront config has none yet.
 * Live tiles come from Owner Studio → Storefront → budget_tiles.
 */
export const BUDGET_LINKS = [
  { label: 'Under', amount: '₹299', to: '/shop?max_price=299' },
  { label: 'Under', amount: '₹499', to: '/shop?max_price=499' },
  { label: 'Under', amount: '₹999', to: '/shop?max_price=999' },
  { label: 'Premium', amount: '₹1000+', to: '/shop?min_price=1000' },
]

/** `show: 'guest'` links appear only when signed out, `show: 'member'` only when signed in. */
/** Footer groups without category slugs — Shop categories are filled from the API. */
export const FOOTER_SHOP_BASE_LINKS = [
  { label: 'All products', to: '/shop' },
  { label: 'Bestsellers', to: '/shop?featured=true' },
]

export const FOOTER_ACCOUNT_LINKS = [
  { label: 'Sign in', to: '/login', show: 'guest' },
  { label: 'My account', to: '/account', show: 'member' },
  { label: 'My orders', to: '/account/orders' },
  { label: 'My courses', to: '/account/courses', show: 'member' },
  { label: 'Wishlist', to: '/account/wishlist' },
  { label: 'Addresses', to: '/account' },
  { label: 'Bag', to: '/cart' },
]

export const FOOTER_LINK_GROUPS = [
  {
    title: 'Shop',
    links: FOOTER_SHOP_BASE_LINKS,
  },
  {
    title: 'My account',
    links: FOOTER_ACCOUNT_LINKS,
  },
  {
    title: 'Help',
    links: POLICY_LINKS,
  },
]

/** Words the search box placeholder types out one after another ("Search for Lipstick"…). */
export const SEARCH_SUGGESTIONS = ['Lipstick', 'Kajal', 'Vitamin C Serum', 'Sunscreen', 'Foundation', 'Hair Oil']

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Top rated' },
  { value: 'name', label: 'Name A–Z' },
]

/** Shown on the strip under every shop banner. */
export const SHOP_PERKS = ['Cash on delivery', 'Genuine products', 'Easy cancellations']

export const INDIAN_STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar',
  'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka',
  'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
  'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
]

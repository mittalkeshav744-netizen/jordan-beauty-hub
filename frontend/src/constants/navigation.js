import { POLICY_LINKS } from './policies'

export const STORE_NAME = 'Jordan Beauty Hub'

/**
 * Brand logo. Put the logo file in frontend/public (e.g. public/logo.svg) and set
 * STORE_LOGO_SRC = '/logo.svg'. While it is null a "JBH" placeholder mark is shown.
 */
export const STORE_LOGO_SRC = null

export const ANNOUNCEMENT = 'Cash on delivery available across India'

/** Main navigation. Category links use the slugs created in Django Admin. */
export const MAIN_NAV_LINKS = [
  { label: 'Shop all', to: '/shop' },
  { label: 'Lips', to: '/shop?category=lips' },
  { label: 'Face', to: '/shop?category=face' },
  { label: 'Eyes', to: '/shop?category=eyes' },
  { label: 'Skincare', to: '/shop?category=skincare' },
  { label: 'Haircare', to: '/shop?category=haircare' },
  { label: 'Body Care', to: '/shop?category=body-care' },
  { label: 'Skin quiz', to: '/skin-quiz', highlight: true },
  { label: 'Get the look', to: '/looks', highlight: true },
]

/** Scrolling strip under the home page banner. */
export const MARQUEE_ITEMS = [
  'Cash on delivery across India',
  'Made for Indian skin tones',
  'Genuine products',
  'Take the free skin quiz',
  'Shop complete looks',
]

/** "Shop by budget" tiles on the home page. Prices use the shop's existing price filter. */
export const BUDGET_LINKS = [
  { label: 'Under', amount: '₹299', to: '/shop?max_price=299' },
  { label: 'Under', amount: '₹499', to: '/shop?max_price=499' },
  { label: 'Under', amount: '₹999', to: '/shop?max_price=999' },
  { label: 'Premium', amount: '₹1000+', to: '/shop?min_price=1000' },
]

/** `show: 'guest'` links appear only when signed out, `show: 'member'` only when signed in. */
export const FOOTER_LINK_GROUPS = [
  {
    title: 'Shop',
    links: [
      { label: 'All products', to: '/shop' },
      { label: 'Bestsellers', to: '/shop?featured=true' },
      { label: 'Makeup', to: '/shop?category=lips,face,eyes' },
      { label: 'Skincare', to: '/shop?category=skincare' },
    ],
  },
  {
    title: 'My account',
    links: [
      { label: 'Sign in', to: '/login', show: 'guest' },
      { label: 'My account', to: '/account', show: 'member' },
      { label: 'My orders', to: '/account/orders' },
      { label: 'Wishlist', to: '/account/wishlist' },
      { label: 'Addresses', to: '/account' },
      { label: 'Bag', to: '/cart' },
    ],
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

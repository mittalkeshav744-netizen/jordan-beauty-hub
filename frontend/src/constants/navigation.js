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
      { label: 'Addresses', to: '/account' },
      { label: 'Bag', to: '/cart' },
    ],
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

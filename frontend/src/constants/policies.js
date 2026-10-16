/**
 * Store policy pages, shown at /policies/<slug>.
 * DRAFT TEXT: the store owner must review it (and ideally have it checked) before going live.
 * It describes only what the software actually does; add your business name, address and
 * contact details where the pages ask customers to contact you.
 */
export const POLICY_LAST_UPDATED = '14 October 2026'

export const POLICIES = {
  returns: {
    title: 'Returns & replacements',
    intro:
      'For hygiene and safety reasons we do not accept returns of beauty and personal care products. ' +
      'If something arrives damaged or is not what you ordered, we will replace it.',
    sections: [
      {
        heading: 'When we replace an item',
        paragraphs: [
          'The product arrived damaged, leaking or broken.',
          'You received a different product, shade or size from the one you ordered.',
          'Part of your order is missing.',
        ],
      },
      {
        heading: 'How to ask for a replacement',
        paragraphs: [
          'Contact us as soon as possible after your order is delivered. Tell us your order number ' +
            '(shown under My orders) and send clear photos of the product and its packaging.',
          'Please keep the item and its packaging until your request is resolved.',
        ],
      },
      {
        heading: 'What we cannot replace',
        paragraphs: [
          'Products that have been opened or used and are not damaged or incorrect.',
          'A change of mind, or a shade or product that does not suit you.',
        ],
      },
      {
        heading: 'Cancelling an order',
        paragraphs: [
          'You can cancel an order yourself from My orders while it is pending or confirmed. ' +
            'Once it is being packed or has shipped, it can no longer be cancelled online.',
          'All orders are Cash on Delivery, so there is nothing to refund for a cancelled order.',
        ],
      },
    ],
  },
  shipping: {
    title: 'Shipping & delivery',
    intro: 'We deliver across India and every order is paid by Cash on Delivery.',
    sections: [
      {
        heading: 'Delivery charges',
        paragraphs: [
          'Any delivery charge, and the order value above which delivery is free, is shown in your bag ' +
            'and at checkout before you place the order.',
        ],
      },
      {
        heading: 'Paying for your order',
        paragraphs: [
          'Pay the order total in cash to the delivery partner when your order arrives. ' +
            'We do not take card, UPI or online payments on this website.',
        ],
      },
      {
        heading: 'Tracking your order',
        paragraphs: [
          'Sign in and open My orders to see the status of each order: pending, confirmed, processing, ' +
            'shipped and delivered.',
        ],
      },
      {
        heading: 'Delivery address',
        paragraphs: [
          'Please check your address, PIN code and phone number at checkout. The delivery partner may call ' +
            'this number to find you.',
        ],
      },
    ],
  },
  privacy: {
    title: 'Privacy policy',
    intro: 'This page explains what information we collect when you use this website and how we use it.',
    sections: [
      {
        heading: 'Information we collect',
        paragraphs: [
          'Account details: your name, email address, phone number (optional) and password. ' +
            'Passwords are stored only in encrypted (hashed) form.',
          'Delivery addresses you save, your orders, your bag, your wishlist and any reviews you write.',
          'Your email address if you sign up for our newsletter.',
        ],
      },
      {
        heading: 'How we use it',
        paragraphs: [
          'To create your account, deliver your orders, contact you about them and show your order history.',
          'To send password reset emails you ask for, and newsletter emails if you subscribed.',
          'We do not sell your personal information.',
        ],
      },
      {
        heading: 'Payments',
        paragraphs: ['All orders are Cash on Delivery. We do not collect or store card or bank details.'],
      },
      {
        heading: 'Cookies and browser storage',
        paragraphs: [
          'We use essential cookies to keep you signed in and to protect forms against misuse.',
          'Your browser remembers the products you viewed recently so we can show them again. ' +
            'This list stays on your device.',
        ],
      },
      {
        heading: 'Your choices',
        paragraphs: [
          'You can update your name and phone number and manage your addresses under My account.',
          'To have your account or newsletter subscription removed, contact us.',
        ],
      },
    ],
  },
  terms: {
    title: 'Terms & conditions',
    intro: 'By using this website and placing an order you agree to these terms.',
    sections: [
      {
        heading: 'Products and prices',
        paragraphs: [
          'Prices are shown in Indian Rupees (₹) and include all taxes. Product colours on screen may look ' +
            'slightly different from the real product.',
          'Prices, offers and stock can change at any time. The price that applies is the one shown at checkout ' +
            'when you place your order.',
        ],
      },
      {
        heading: 'Orders',
        paragraphs: [
          'You need an account to place an order. We may cancel an order if a product is out of stock, ' +
            'the address cannot be served, or the order appears to be fraudulent. We will let you know if this happens.',
        ],
      },
      {
        heading: 'Payment',
        paragraphs: ['All orders are paid by Cash on Delivery when they are delivered.'],
      },
      {
        heading: 'Returns and replacements',
        paragraphs: ['Please see our Returns & replacements policy.'],
      },
      {
        heading: 'Reviews',
        paragraphs: [
          'Only customers who have received a product can review it. Reviews must be honest and must not contain ' +
            'offensive content or personal information; we may hide reviews that break these rules.',
        ],
      },
      {
        heading: 'Your account',
        paragraphs: ['Keep your password private. You are responsible for orders placed from your account.'],
      },
    ],
  },
}

export const POLICY_LINKS = Object.entries(POLICIES).map(([slug, policy]) => ({
  label: policy.title,
  to: `/policies/${slug}`,
}))

import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router'

import { AuthContext, CartContext, ToastContext } from '../context/contexts'

/**
 * Render a component with router + context values that tests can override:
 *   renderWithProviders(<Page />, { auth: { isAuthenticated: true }, route: '/shop' })
 */
export function renderWithProviders(ui, { route = '/', auth = {}, cart = {}, toast = {} } = {}) {
  const authValue = {
    user: null,
    isAuthenticated: false,
    isCheckingSession: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    updateProfile: vi.fn(),
    ...auth,
  }
  const cartValue = {
    cart: { items: [], item_count: 0, subtotal: '0.00' },
    isLoading: false,
    error: null,
    refreshCart: vi.fn(),
    addItem: vi.fn(),
    updateItem: vi.fn(),
    removeItem: vi.fn(),
    clearLocalCart: vi.fn(),
    ...cart,
  }
  const toastValue = { showToast: vi.fn(), ...toast }

  const result = render(
    <MemoryRouter initialEntries={[route]}>
      <ToastContext.Provider value={toastValue}>
        <AuthContext.Provider value={authValue}>
          <CartContext.Provider value={cartValue}>{ui}</CartContext.Provider>
        </AuthContext.Provider>
      </ToastContext.Provider>
    </MemoryRouter>,
  )
  return { ...result, authValue, cartValue, toastValue }
}

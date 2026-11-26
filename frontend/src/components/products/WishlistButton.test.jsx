import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { renderWithProviders } from '../../test/renderWithProviders'
import WishlistButton from './WishlistButton'

const PRODUCT = { id: 7, name: 'Matte Velvet Lipstick' }
const SIGNED_IN = { isAuthenticated: true, user: { id: 1 } }

describe('WishlistButton', () => {
  it('lets signed-out visitors save to the local wishlist', async () => {
    const { wishlistValue, toastValue } = renderWithProviders(<WishlistButton product={PRODUCT} />)

    await userEvent.click(screen.getByRole('button', { name: 'Save Matte Velvet Lipstick to wishlist' }))

    expect(wishlistValue.addToWishlist).toHaveBeenCalledWith(7)
    expect(toastValue.showToast).toHaveBeenCalledWith('Matte Velvet Lipstick saved to your wishlist.')
  })

  it('saves an unsaved product', async () => {
    const addToWishlist = vi.fn().mockResolvedValue()
    renderWithProviders(<WishlistButton product={PRODUCT} />, { auth: SIGNED_IN, wishlist: { addToWishlist } })
    const button = screen.getByRole('button', { name: 'Save Matte Velvet Lipstick to wishlist' })
    expect(button).toHaveAttribute('aria-pressed', 'false')

    await userEvent.click(button)

    expect(addToWishlist).toHaveBeenCalledWith(7)
  })

  it('removes a saved product and shows the saved state', async () => {
    const removeFromWishlist = vi.fn().mockResolvedValue()
    renderWithProviders(<WishlistButton product={PRODUCT} variant="full" />, {
      auth: SIGNED_IN,
      wishlist: { isSaved: (id) => id === 7, removeFromWishlist },
    })

    await userEvent.click(screen.getByRole('button', { name: 'Saved to wishlist' }))

    expect(removeFromWishlist).toHaveBeenCalledWith(7)
  })

  it('reports a server error', async () => {
    const addToWishlist = vi.fn().mockRejectedValue({ response: { status: 400, data: { detail: 'This product is not available.' } } })
    const { toastValue } = renderWithProviders(<WishlistButton product={PRODUCT} />, {
      auth: SIGNED_IN,
      wishlist: { addToWishlist },
    })

    await userEvent.click(screen.getByRole('button', { name: 'Save Matte Velvet Lipstick to wishlist' }))

    expect(toastValue.showToast).toHaveBeenCalledWith('This product is not available.', 'error')
  })
})

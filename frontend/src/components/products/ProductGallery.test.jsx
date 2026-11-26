import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import ProductGallery from './ProductGallery'

const IMAGES = [
  { id: 1, image: 'https://example.com/a.jpg', alt_text: 'Front' },
  { id: 2, image: 'https://example.com/b.jpg', alt_text: 'Back' },
]

describe('ProductGallery', () => {
  it('opens and closes the zoom lightbox', async () => {
    const user = userEvent.setup()
    render(<ProductGallery images={IMAGES} productName="Rose Mist" />)

    await user.click(screen.getByRole('button', { name: /zoom rose mist image/i }))
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(dialog.querySelector('img[alt="Front"]')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Close zoomed image' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('does not offer zoom when there is no image url', () => {
    render(
      <ProductGallery
        images={[{ id: 1, image: '', alt_text: 'Soon' }]}
        productName="Placeholder"
      />,
    )
    expect(screen.queryByRole('button', { name: /zoom/i })).not.toBeInTheDocument()
  })

  it('shows a full-resolution hover pan layer while the pointer is over the image', async () => {
    const user = userEvent.setup()
    render(<ProductGallery images={IMAGES} productName="Rose Mist" />)
    const zoomButton = screen.getByRole('button', { name: /zoom rose mist image/i })

    await user.hover(zoomButton)
    const layer = screen.getByTestId('gallery-hover-zoom')
    expect(layer).toHaveStyle({
      backgroundSize: '200%',
    })
    expect(layer.style.backgroundImage).toContain('example.com/a.jpg')
  })
})

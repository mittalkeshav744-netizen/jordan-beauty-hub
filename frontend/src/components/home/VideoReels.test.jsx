import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { VIDEO_REELS } from '../../constants/media'
import { renderWithProviders } from '../../test/renderWithProviders'
import VideoReels from './VideoReels'

describe('VideoReels', () => {
  it('shows every clip with a watch control and shop link', async () => {
    const user = userEvent.setup()
    const { container } = renderWithProviders(<VideoReels />)

    const region = screen.getByRole('region', { name: 'Watch & shop' })
    const shopLinks = within(region).getAllByRole('link', { name: /shop now/i })
    expect(shopLinks).toHaveLength(VIDEO_REELS.length)
    expect(shopLinks[0]).toHaveAttribute('href', '/shop?category=skincare')
    expect(screen.getByText('The glow serum drop')).toBeInTheDocument()
    expect(screen.queryByText('AI-generated video')).not.toBeInTheDocument()

    const firstVideo = container.querySelector('video')
    expect(firstVideo.getAttribute('src')).toContain('/videos/serum.mp4')
    expect(firstVideo).toHaveAttribute('aria-hidden', 'true')
    expect(firstVideo.muted).toBe(true)

    await user.click(screen.getByRole('button', { name: /watch the glow serum drop/i }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('link', { name: /shop now/i })).toHaveAttribute(
      'href',
      '/shop?category=skincare',
    )
  })
})

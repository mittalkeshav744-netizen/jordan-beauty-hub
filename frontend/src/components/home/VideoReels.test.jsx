import { screen, within } from '@testing-library/react'

import { VIDEO_REELS } from '../../constants/media'
import { renderWithProviders } from '../../test/renderWithProviders'
import VideoReels from './VideoReels'

describe('VideoReels', () => {
  it('shows every clip as a labelled link to matching products', () => {
    const { container } = renderWithProviders(<VideoReels />)

    const links = within(screen.getByRole('region', { name: 'Watch & shop' })).getAllByRole('link')
    expect(links).toHaveLength(VIDEO_REELS.length)
    expect(screen.getByRole('link', { name: /the glow serum drop/i })).toHaveAttribute('href', '/shop?category=skincare')
    expect(screen.queryByText('AI-generated video')).not.toBeInTheDocument()

    const firstVideo = container.querySelector('video')
    expect(firstVideo).toHaveAttribute('src', '/videos/serum.mp4#t=4')
    expect(firstVideo).toHaveAttribute('aria-hidden', 'true')
    expect(firstVideo.muted).toBe(true)
  })
})

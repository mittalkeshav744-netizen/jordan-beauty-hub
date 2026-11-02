import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import WebsiteContentModal from './WebsiteContentModal'

const navigate = vi.fn()

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router')
  return {
    ...actual,
    useNavigate: () => navigate,
  }
})

describe('WebsiteContentModal', () => {
  afterEach(() => {
    navigate.mockReset()
  })

  it('shows a full-bleed preview iframe without a jump-to legend', () => {
    const onClose = vi.fn()
    render(
      <MemoryRouter>
        <WebsiteContentModal isOpen onClose={onClose} />
      </MemoryRouter>,
    )

    expect(screen.getByText('Website content', { selector: 'h2' })).toBeInTheDocument()
    const frame = screen.getByTitle('Shop preview — editable regions', { hidden: true })
    expect(frame.getAttribute('src')).toMatch(/^\/\?ownerMap=1&_=\d+$/)
    expect(screen.queryByText('Jump to')).not.toBeInTheDocument()
  })

  it('navigates when the iframe posts an owner-map message', () => {
    const onClose = vi.fn()
    render(
      <MemoryRouter>
        <WebsiteContentModal isOpen onClose={onClose} />
      </MemoryRouter>,
    )

    fireEvent(
      window,
      new MessageEvent('message', {
        origin: window.location.origin,
        data: { type: 'owner-map-navigate', path: '/manage/storefront?focus=hero' },
      }),
    )

    expect(onClose).toHaveBeenCalled()
    expect(navigate).toHaveBeenCalledWith('/manage/storefront?focus=hero')
  })
})

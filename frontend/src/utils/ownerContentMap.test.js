import { afterEach, describe, expect, it, vi } from 'vitest'

import { isOwnerMapMode, startOwnerContentMap } from './ownerContentMap'

describe('ownerContentMap', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    document.getElementById('owner-content-map-styles')?.remove()
    document.getElementById('owner-map-floating-label')?.remove()
    vi.restoreAllMocks()
  })

  it('detects ownerMap query flag', () => {
    expect(isOwnerMapMode('?ownerMap=1')).toBe(true)
    expect(isOwnerMapMode('?foo=1')).toBe(false)
  })

  it('highlights editable regions and posts navigate message on click', () => {
    const region = document.createElement('section')
    region.setAttribute('data-manage-edit', '/manage/storefront?focus=hero')
    region.setAttribute('data-manage-label', 'Hero')
    const link = document.createElement('a')
    link.href = '/'
    link.textContent = 'Logo'
    region.appendChild(link)
    document.body.appendChild(region)

    const postMessage = vi.fn()
    Object.defineProperty(window, 'parent', {
      configurable: true,
      value: { postMessage },
    })

    const stop = startOwnerContentMap()

    region.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 20, clientY: 30 }))
    expect(region.classList.contains('owner-map-active')).toBe(true)
    expect(document.getElementById('owner-map-floating-label')?.hidden).toBe(false)

    const click = new MouseEvent('click', { bubbles: true, cancelable: true })
    link.dispatchEvent(click)
    expect(click.defaultPrevented).toBe(true)
    expect(postMessage).toHaveBeenCalledWith(
      { type: 'owner-map-navigate', path: '/manage/storefront?focus=hero' },
      window.location.origin,
    )

    stop()
    expect(region.classList.contains('owner-map-active')).toBe(false)
  })

  it('blocks double-click follow-up without posting twice', () => {
    const region = document.createElement('section')
    region.setAttribute('data-manage-edit', '/manage/categories?focus=categories')
    document.body.appendChild(region)

    const postMessage = vi.fn()
    Object.defineProperty(window, 'parent', {
      configurable: true,
      value: { postMessage },
    })

    const stop = startOwnerContentMap()
    region.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }))
    region.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 2 }))
    expect(postMessage).toHaveBeenCalledTimes(1)

    stop()
  })
})

import { useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'

import { useAddToCart } from '../../hooks/useAddToCart'
import { useAuth } from '../../hooks/useAuth'
import { useStoreSettings } from '../../hooks/useStoreSettings'
import { storeService } from '../../services/storeService'
import {
  chatStorageKey,
  clearChatMessages,
  loadChatMessages,
  markPageNudgeSeen,
  saveChatMessages,
  shouldShowPageNudge,
} from '../../utils/beautyChatStorage'
import { getErrorMessage } from '../../utils/errors'
import Button from './Button'
import ProductImage from './ProductImage'

const WELCOME_GUEST =
  'Hi! I am Mira from Jordan Beauty Hub. Ask about COD, delivery or returns anytime. For product suggestions, please sign in or create an account first — then I can send you to the right product pages.'

const WELCOME_MEMBER =
  'Hi! I am Mira from Jordan Beauty Hub. Tell me what you need (skin, makeup, gift, order status) and I will help — product cards open the page; prices are on each product page.'

const LINK_RE = /\/(?:products|register|login|shop|skin-quiz|looks|cart|account|policies)(?:\/[a-z0-9-]*)*/gi

const GUEST_CHIPS = [
  { label: 'Cash on Delivery?', message: 'Do you have Cash on Delivery?' },
  { label: 'Delivery', message: 'How does delivery work across India?' },
  { label: 'Returns', message: 'What is your return and replacement policy?' },
  { label: 'Create account', message: 'How do I create an account?' },
]

const MEMBER_CHIPS = [
  { label: 'Brown skin makeup', message: 'I need makeup suggestions for brown / Indian skin' },
  { label: 'Glowing skin', message: 'I want a simple glowing skincare routine' },
  { label: 'Gift idea', message: 'I need a beauty gift idea — please ask me who it is for and the occasion' },
  { label: 'My orders', message: 'Where is my latest order?' },
  { label: 'Get the look', message: 'Suggest a makeup look from Get the look' },
  { label: 'Skin quiz', message: 'Should I take the skin quiz?' },
]

function friendlyLinkLabel(path) {
  if (path === '/register') return 'create an account'
  if (path === '/login') return 'sign in'
  if (path === '/shop') return 'our shop'
  if (path === '/skin-quiz') return 'skin quiz'
  if (path === '/looks') return 'Get the look'
  if (path === '/cart') return 'your bag'
  if (path.startsWith('/products/')) return 'this product'
  if (path.startsWith('/policies/')) return 'our policy'
  if (path.startsWith('/account')) return 'your account'
  return 'open page'
}

function ChatText({ text, onNavigate }) {
  const nodes = []
  const source = String(text)
  let lastIndex = 0
  let match
  const pattern = new RegExp(LINK_RE.source, 'gi')
  while ((match = pattern.exec(source)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(<span key={`t-${lastIndex}`}>{source.slice(lastIndex, match.index)}</span>)
    }
    const path = match[0]
    nodes.push(
      <Link
        key={`l-${match.index}`}
        to={path}
        onClick={onNavigate}
        className="font-semibold text-accent underline underline-offset-2 hover:text-accent-hover"
      >
        {friendlyLinkLabel(path)}
      </Link>,
    )
    lastIndex = match.index + path.length
  }
  if (lastIndex < source.length) {
    nodes.push(<span key={`t-${lastIndex}`}>{source.slice(lastIndex)}</span>)
  }
  return <span className="whitespace-pre-wrap">{nodes}</span>
}

function pathLabel(path) {
  if (path === '/register') return 'Create account'
  if (path === '/login') return 'Sign in'
  if (path.startsWith('/products/')) return 'View product'
  if (path === '/shop') return 'Browse shop'
  if (path === '/skin-quiz') return 'Skin quiz'
  if (path.startsWith('/looks')) return 'View look'
  return 'Open'
}

function pageChips(isAuthenticated, pathname) {
  const base = isAuthenticated ? MEMBER_CHIPS : GUEST_CHIPS
  if (pathname?.startsWith('/products/')) {
    const slug = pathname.replace(/\/+$/, '').split('/').pop()
    const about = isAuthenticated
      ? {
          label: 'About this product',
          message: `I am looking at ${slug.replace(/-/g, ' ')}. Tell me who it suits and how to use it. Mark it with [[slug:${slug}]]`,
        }
      : {
          label: 'Sign in for this product',
          message: 'I want advice about the product on this page — should I sign in first?',
        }
    return [about, ...base]
  }
  if (isAuthenticated && pathname?.startsWith('/cart')) {
    return [
      {
        label: 'Bag help',
        message: 'I am in my bag — any tip before I checkout with Cash on Delivery?',
      },
      ...base,
    ]
  }
  if (isAuthenticated && pathname?.startsWith('/looks')) {
    return [{ label: 'Pick a look', message: 'Help me pick a look from Get the look' }, ...base]
  }
  return base
}

function welcomeMessage(isAuthenticated) {
  return isAuthenticated ? WELCOME_MEMBER : WELCOME_GUEST
}

function ProductCards({ products, onNavigate, canAddToBag, onAddToBag, pendingVariantId }) {
  if (!products?.length) return null
  return (
    <ul className="mt-2 space-y-2">
      {products.map((product) => {
        const needsShade = (product.variant_count || 0) > 1
        const canAdd = canAddToBag && product.default_variant_id && !needsShade
        return (
          <li key={product.slug} className="rounded-control border border-line bg-canvas p-2">
            <Link
              to={product.path}
              onClick={onNavigate}
              className="flex gap-2 transition-colors hover:opacity-90"
            >
              <ProductImage
                src={product.image?.url}
                alt={product.image?.alt || product.name}
                className="h-14 w-14 shrink-0 rounded-control bg-subtle"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold tracking-wide text-muted uppercase">
                  {product.brand}
                </span>
                <span className="block truncate text-sm font-semibold text-ink">{product.name}</span>
                <span className="mt-0.5 line-clamp-2 text-xs text-ink-soft">
                  {product.reason || product.short_description || 'Open for details and price'}
                </span>
              </span>
            </Link>
            <div className="mt-2 flex flex-wrap gap-2">
              <Link
                to={product.path}
                onClick={onNavigate}
                className="inline-flex min-h-8 items-center rounded-control border border-line px-2.5 text-[0.65rem] font-semibold tracking-wide uppercase hover:border-accent hover:text-accent"
              >
                View
              </Link>
              {canAdd && (
                <button
                  type="button"
                  disabled={pendingVariantId === product.default_variant_id}
                  onClick={() => onAddToBag(product)}
                  className="inline-flex min-h-8 items-center rounded-control bg-accent px-2.5 text-[0.65rem] font-semibold tracking-wide text-white uppercase hover:bg-accent-hover disabled:opacity-60"
                >
                  {pendingVariantId === product.default_variant_id ? 'Adding…' : 'Add to bag'}
                </button>
              )}
              {needsShade && (
                <Link
                  to={product.path}
                  onClick={onNavigate}
                  className="inline-flex min-h-8 items-center rounded-control border border-accent/40 bg-accent/10 px-2.5 text-[0.65rem] font-semibold tracking-wide text-accent uppercase"
                >
                  Choose shade
                </Link>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export default function BeautyChat() {
  const settings = useStoreSettings()
  const { isAuthenticated, user } = useAuth()
  const { pathname } = useLocation()
  const { addToCart, pendingVariantId } = useAddToCart()
  const titleId = useId()
  const listRef = useRef(null)
  const storageKey = chatStorageKey(isAuthenticated, user?.id)
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState(() =>
    loadChatMessages(storageKey, [{ role: 'assistant', content: welcomeMessage(isAuthenticated) }]),
  )
  const [isSending, setIsSending] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [chips, setChips] = useState(() => pageChips(isAuthenticated, pathname))
  const [whatsappUrl, setWhatsappUrl] = useState(null)
  const [showNudge, setShowNudge] = useState(false)

  useEffect(() => {
    const nextKey = chatStorageKey(isAuthenticated, user?.id)
    const loaded = loadChatMessages(nextKey, [
      { role: 'assistant', content: welcomeMessage(isAuthenticated) },
    ])
    setMessages(loaded)
    setChips(pageChips(isAuthenticated, pathname))
  }, [isAuthenticated, user?.id, pathname])

  useEffect(() => {
    saveChatMessages(storageKey, messages)
  }, [messages, storageKey])

  useEffect(() => {
    if (!settings?.whatsapp_number) {
      setWhatsappUrl(null)
      return
    }
    setWhatsappUrl(
      `https://wa.me/${settings.whatsapp_number}?text=${encodeURIComponent(
        'Hi, I need help from Jordan Beauty Hub.',
      )}`,
    )
  }, [settings?.whatsapp_number])

  useEffect(() => {
    if (shouldShowPageNudge(pathname)) setShowNudge(true)
    else setShowNudge(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return undefined
    const list = listRef.current
    if (list && typeof list.scrollTo === 'function') {
      list.scrollTo({ top: list.scrollHeight, behavior: 'smooth' })
    } else if (list) {
      list.scrollTop = list.scrollHeight
    }
    return undefined
  }, [messages, open, isSending])

  if (settings && settings.chat_enabled === false) return null
  if (!settings?.chat_enabled) return null

  const closeChat = () => setOpen(false)

  const openChat = () => {
    setOpen(true)
    if (showNudge) {
      markPageNudgeSeen(pathname)
      setShowNudge(false)
    }
  }

  const resetChat = () => {
    clearChatMessages(storageKey)
    setMessages([{ role: 'assistant', content: welcomeMessage(isAuthenticated) }])
    setChips(pageChips(isAuthenticated, pathname))
    setError('')
  }

  const sendMessage = async (rawText) => {
    const text = rawText.trim()
    if (!text || isSending) return

    const history = messages
      .filter((entry) => entry.role === 'user' || entry.role === 'assistant')
      .slice(-6)
      .map(({ role, content }) => ({ role, content }))

    setInput('')
    setError('')
    setStatus('')
    setMessages((current) => [
      ...current,
      { role: 'user', content: text },
      { role: 'assistant', content: '', streaming: true, products: [], productPaths: [] },
    ])
    setIsSending(true)

    const applyDone = (done) => {
      setStatus('')
      if (done.suggested_replies?.length) setChips(done.suggested_replies)
      if (done.whatsapp_url) setWhatsappUrl(done.whatsapp_url)
      setMessages((current) => {
        const next = [...current]
        const last = next[next.length - 1]
        if (last?.role === 'assistant') {
          next[next.length - 1] = {
            role: 'assistant',
            content: done.reply || last.content || '',
            productPaths: done.product_paths || [],
            products: done.products || [],
            requiresAuth: Boolean(done.requires_auth),
          }
        }
        return next
      })
    }

    const payload = {
      message: text,
      history,
      page_path: pathname || '/',
    }

    try {
      let data
      try {
        data = await storeService.chatStream(payload, {
          onStatus: (message) => setStatus(message || 'Thinking…'),
          onToken: (chunk) => {
            if (!chunk) return
            setStatus('')
            setMessages((current) => {
              const next = [...current]
              const last = next[next.length - 1]
              if (last?.role === 'assistant' && last.streaming) {
                next[next.length - 1] = { ...last, content: `${last.content || ''}${chunk}` }
              }
              return next
            })
          },
          onDone: applyDone,
        })
      } catch (streamErr) {
        if (streamErr?.name === 'AbortError') throw streamErr
        // SSE can fail behind some hosts/proxies — non-stream still works for go-live.
        setStatus('Thinking…')
        data = await storeService.chat(payload)
        applyDone(data)
      }
      if (data.suggested_replies?.length) setChips(data.suggested_replies)
      if (data.whatsapp_url) setWhatsappUrl(data.whatsapp_url)
    } catch (err) {
      if (err?.name === 'AbortError') return
      setStatus('')
      setMessages((current) => {
        const next = [...current]
        const last = next[next.length - 1]
        if (last?.role === 'assistant' && last.streaming && !last.content) {
          next.pop()
        } else if (last?.role === 'assistant' && last.streaming) {
          next[next.length - 1] = { ...last, streaming: false }
        }
        return next
      })
      setError(getErrorMessage(err, 'I could not reply just now. Please try again.'))
    } finally {
      setIsSending(false)
      setStatus('')
    }
  }

  const send = (event) => {
    event.preventDefault()
    sendMessage(input)
  }

  const handleAddToBag = async (product) => {
    await addToCart(product.default_variant_id, 1, product.name)
  }

  return (
    <div className="fixed right-3 bottom-3 z-40 flex flex-col items-end gap-2 sm:right-6 sm:bottom-6 sm:gap-3">
      {showNudge && !open && (
        <button
          type="button"
          onClick={openChat}
          className="max-w-[14rem] rounded-card border border-line bg-surface px-2.5 py-2 text-left text-[0.7rem] text-ink shadow-raised sm:max-w-[16rem] sm:px-3 sm:text-xs"
        >
          <span className="font-semibold text-accent">Need a hand?</span>
          <span className="mt-0.5 block text-ink-soft">Ask Mira about this page — tap to chat.</span>
        </button>
      )}

      {open && (
        <section
          aria-labelledby={titleId}
          className="flex h-[min(32rem,78dvh)] w-[min(22rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-card border border-line bg-surface shadow-raised sm:h-[min(34rem,80vh)]"
        >
          <header className="flex items-center justify-between gap-3 border-b border-line bg-ink px-4 py-3 text-white">
            <div className="min-w-0">
              <h2 id={titleId} className="truncate text-sm font-semibold tracking-wide uppercase">
                Beauty assistant
              </h2>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[0.65rem] text-white/75">
                {whatsappUrl && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline-offset-2 hover:text-white hover:underline"
                  >
                    Chat on WhatsApp
                  </a>
                )}
                <button
                  type="button"
                  onClick={resetChat}
                  className="underline-offset-2 hover:text-white hover:underline"
                >
                  New chat
                </button>
              </div>
            </div>
            <button
              type="button"
              aria-label="Close chat"
              title="Close"
              onClick={closeChat}
              className="rounded-btn px-2 py-1 text-lg leading-none text-danger-soft transition-colors hover:bg-white/15 hover:text-white"
            >
              ×
            </button>
          </header>

          <ul ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-cream/40 px-3 py-3" aria-live="polite">
            {messages.map((entry, index) => (
              <li
                key={`${entry.role}-${index}`}
                className={`max-w-[95%] rounded-card px-3 py-2 text-sm leading-relaxed ${
                  entry.role === 'user'
                    ? 'ml-auto bg-accent text-white'
                    : 'mr-auto border border-line bg-surface text-ink'
                }`}
              >
                {entry.role === 'assistant' ? (
                  <ChatText text={entry.content} onNavigate={closeChat} />
                ) : (
                  entry.content
                )}
                {entry.role === 'assistant' && (
                  <ProductCards
                    products={entry.products}
                    onNavigate={closeChat}
                    canAddToBag={isAuthenticated}
                    onAddToBag={handleAddToBag}
                    pendingVariantId={pendingVariantId}
                  />
                )}
                {entry.role === 'assistant' && !entry.products?.length && entry.productPaths?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {entry.productPaths.map((path) => (
                      <Link
                        key={path}
                        to={path}
                        onClick={closeChat}
                        className="inline-flex min-h-9 items-center rounded-control border border-accent/40 bg-accent/10 px-2.5 text-xs font-semibold tracking-wide text-accent uppercase hover:bg-accent hover:text-white"
                      >
                        {pathLabel(path)}
                      </Link>
                    ))}
                  </div>
                )}
              </li>
            ))}
            {isSending && status ? (
              <li className="mr-auto rounded-card border border-line bg-surface px-3 py-2 text-sm text-muted">
                {status}
              </li>
            ) : null}
            {isSending &&
            !status &&
            messages[messages.length - 1]?.role === 'assistant' &&
            !messages[messages.length - 1]?.content ? (
              <li className="mr-auto rounded-card border border-line bg-surface px-3 py-2 text-sm text-muted">
                Thinking…
              </li>
            ) : null}
          </ul>

          <div className="border-t border-line bg-surface px-3 pt-2">
            <div
              className="scrollbar-hide -mx-1 flex gap-1.5 overflow-x-auto pb-2"
              aria-label="Suggested questions"
            >
              {chips.map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  disabled={isSending}
                  onClick={() => sendMessage(chip.message)}
                  className="shrink-0 rounded-full border border-line bg-canvas px-3 py-1.5 text-[0.7rem] font-semibold text-ink-soft transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={send} className="border-t border-line bg-surface p-3">
            {error && (
              <p role="alert" className="mb-2 text-xs text-danger">
                {error}
              </p>
            )}
            {!isAuthenticated && (
              <p className="mb-2 text-[0.7rem] text-muted">
                Product picks need an account.{' '}
                <Link to="/register" onClick={closeChat} className="font-semibold text-accent hover:underline">
                  Register
                </Link>{' '}
                or{' '}
                <Link to="/login" onClick={closeChat} className="font-semibold text-accent hover:underline">
                  sign in
                </Link>
                .
              </p>
            )}
            <label htmlFor="beauty-chat-input" className="sr-only">
              Message the beauty assistant
            </label>
            <div className="flex gap-2">
              <input
                id="beauty-chat-input"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                maxLength={1000}
                placeholder={isAuthenticated ? 'What do you need help with?' : 'Ask about COD, or sign in for products…'}
                autoComplete="off"
                disabled={isSending}
                className="min-w-0 flex-1 rounded-control border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-accent"
              />
              <Button type="submit" variant="accent" size="sm" isLoading={isSending} disabled={!input.trim()}>
                Send
              </Button>
            </div>
          </form>
        </section>
      )}

      <button
        type="button"
        aria-expanded={open}
        aria-label={open ? 'Close chat' : 'Ask us'}
        title={open ? 'Close chat' : 'Ask us'}
        onClick={() => (open ? closeChat() : openChat())}
        className="flex h-11 items-center gap-1.5 rounded-full bg-accent px-3.5 text-xs font-semibold tracking-wide text-white uppercase shadow-raised transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:h-14 sm:gap-2 sm:px-5 sm:text-sm"
      >
        <span aria-hidden="true" className="text-base leading-none sm:text-lg">
          ✦
        </span>
        {open ? (
          <span aria-hidden="true" className="text-base leading-none sm:text-lg">
            ×
          </span>
        ) : (
          'Ask us'
        )}
      </button>
    </div>
  )
}

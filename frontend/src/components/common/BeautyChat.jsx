import { useEffect, useId, useRef, useState } from 'react'

import { useStoreSettings } from '../../hooks/useStoreSettings'
import { storeService } from '../../services/storeService'
import { getErrorMessage } from '../../utils/errors'
import Button from './Button'

const WELCOME =
  'Hi! I am the Jordan Beauty Hub assistant. Ask about products, COD, delivery, returns, or what might suit your skin.'

export default function BeautyChat() {
  const settings = useStoreSettings()
  const titleId = useId()
  const listRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([{ role: 'assistant', content: WELCOME }])
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')

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
  // While settings load, keep the button hidden until we know chat is on.
  if (!settings?.chat_enabled) return null

  const send = async (event) => {
    event.preventDefault()
    const text = input.trim()
    if (!text || isSending) return

    const history = messages
      .filter((entry) => entry.role === 'user' || entry.role === 'assistant')
      .slice(-10)
      .map(({ role, content }) => ({ role, content }))

    setInput('')
    setError('')
    setMessages((current) => [...current, { role: 'user', content: text }])
    setIsSending(true)
    try {
      const { reply } = await storeService.chat({ message: text, history })
      setMessages((current) => [...current, { role: 'assistant', content: reply }])
    } catch (err) {
      setError(getErrorMessage(err, 'I could not reply just now. Please try again.'))
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="fixed right-4 bottom-4 z-40 flex flex-col items-end gap-3 sm:right-6 sm:bottom-6">
      {open && (
        <section
          aria-labelledby={titleId}
          className="flex h-[min(28rem,70vh)] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-card border border-line bg-surface shadow-raised"
        >
          <header className="flex items-center justify-between gap-3 border-b border-line bg-ink px-4 py-3 text-white">
            <div className="min-w-0">
              <h2 id={titleId} className="truncate text-sm font-semibold tracking-wide uppercase">
                Beauty assistant
              </h2>
              <p className="truncate text-[0.65rem] text-white/70">Powered by Google Gemini</p>
            </div>
            <button
              type="button"
              aria-label="Close chat"
              onClick={() => setOpen(false)}
              className="rounded-control px-2 py-1 text-lg leading-none text-white/80 hover:bg-white/10 hover:text-white"
            >
              ×
            </button>
          </header>

          <ul ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-cream/40 px-3 py-3" aria-live="polite">
            {messages.map((entry, index) => (
              <li
                key={`${entry.role}-${index}`}
                className={`max-w-[90%] rounded-card px-3 py-2 text-sm leading-relaxed ${
                  entry.role === 'user'
                    ? 'ml-auto bg-accent text-white'
                    : 'mr-auto border border-line bg-surface text-ink'
                }`}
              >
                {entry.content}
              </li>
            ))}
            {isSending && (
              <li className="mr-auto rounded-card border border-line bg-surface px-3 py-2 text-sm text-muted">
                Thinking…
              </li>
            )}
          </ul>

          <form onSubmit={send} className="border-t border-line bg-surface p-3">
            {error && (
              <p role="alert" className="mb-2 text-xs text-danger">
                {error}
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
                placeholder="Ask about products, COD…"
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
        onClick={() => setOpen((value) => !value)}
        className="flex h-14 items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold tracking-wide text-white uppercase shadow-raised transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <span aria-hidden="true" className="text-lg leading-none">
          ✦
        </span>
        {open ? 'Close' : 'Ask us'}
      </button>
    </div>
  )
}

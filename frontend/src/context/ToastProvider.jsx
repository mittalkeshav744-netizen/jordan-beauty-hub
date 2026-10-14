import { useCallback, useMemo, useRef, useState } from 'react'

import ToastViewport from '../components/common/ToastViewport'
import { ToastContext } from './contexts'

const TOAST_DURATION_MS = 4000

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const nextId = useRef(1)

  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback(
    (message, variant = 'success') => {
      const id = nextId.current++
      setToasts((current) => [...current, { id, message, variant }])
      setTimeout(() => dismissToast(id), TOAST_DURATION_MS)
    },
    [dismissToast],
  )

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  )
}

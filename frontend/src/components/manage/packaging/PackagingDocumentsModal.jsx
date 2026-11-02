import { useMemo, useState } from 'react'

import Button from '../../common/Button'
import Modal from '../../common/Modal'
import { useToast } from '../../../hooks/useToast'
import {
  downloadPackingSlipPdf,
  downloadThankYouPdf,
} from '../../../services/packagingPdfService'
import {
  printBothDocuments,
  printPackingSlips,
  printThankYouInserts,
} from '../../../utils/packagingPrint'
import { normalizeOrderForPackaging } from '../../../utils/packagingOrder'
import PackingSlipDocument from './PackingSlipDocument'
import ThankYouInsertDocument from './ThankYouInsertDocument'

const TABS = [
  { id: 'slip', label: 'Packing slip' },
  { id: 'thank-you', label: 'Thank-you insert' },
]

/**
 * Preview + PDF/print for one or more portal orders.
 * orders: array of portal order detail objects.
 */
export default function PackagingDocumentsModal({ isOpen, onClose, orders = [] }) {
  const { showToast } = useToast()
  const [tab, setTab] = useState('slip')
  const [busy, setBusy] = useState('')

  const list = useMemo(() => (Array.isArray(orders) ? orders.filter(Boolean) : []), [orders])
  const labels = list.map((order) => normalizeOrderForPackaging(order).number).join(', ')

  const run = async (key, action) => {
    setBusy(key)
    try {
      await action()
    } catch (err) {
      showToast(err?.message || 'Could not complete packaging action.', 'error')
    } finally {
      setBusy('')
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Packaging documents"
      description={labels ? `Order ${labels}` : 'No orders selected'}
      size="xl"
      footer={
        <div className="flex w-full flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!list.length || Boolean(busy)}
            isLoading={busy === 'pdf-slip'}
            onClick={() => run('pdf-slip', () => downloadPackingSlipPdf(list))}
          >
            Download packing PDF
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!list.length || Boolean(busy)}
            isLoading={busy === 'pdf-thank'}
            onClick={() => run('pdf-thank', () => downloadThankYouPdf(list))}
          >
            Download thank-you PDF
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!list.length || Boolean(busy)}
            isLoading={busy === 'print-slip'}
            onClick={() => run('print-slip', () => printPackingSlips(list))}
          >
            Print slip
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!list.length || Boolean(busy)}
            isLoading={busy === 'print-thank'}
            onClick={() => run('print-thank', () => printThankYouInserts(list))}
          >
            Print thank-you
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!list.length || Boolean(busy)}
            isLoading={busy === 'print-both'}
            onClick={() => run('print-both', () => printBothDocuments(list))}
          >
            Print both
          </Button>
        </div>
      }
      contentClassName="flex min-h-0 flex-1 flex-col overflow-hidden p-0 text-sm text-ink"
    >
      <div className="shrink-0 border-b border-line bg-cream/40 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Document type">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => setTab(item.id)}
              className={`min-h-10 rounded-btn px-3 text-xs font-semibold tracking-wide uppercase transition-colors ${
                tab === item.id
                  ? 'bg-ink text-white'
                  : 'border border-line bg-surface text-ink hover:bg-subtle'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">
          Packing slips are for staff only (no prices). Thank-you inserts go in the parcel.
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-subtle/40 px-3 py-4 sm:px-5">
        {!list.length ? (
          <p className="text-sm text-muted">No order data available.</p>
        ) : (
          <ul className="mx-auto flex max-w-3xl flex-col gap-6">
            {list.map((order) => {
              const number = normalizeOrderForPackaging(order).number
              return (
                <li key={number} className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
                  {list.length > 1 ? (
                    <p className="border-b border-line bg-cream/50 px-4 py-2 text-xs font-semibold tracking-wide text-muted uppercase">
                      {number}
                    </p>
                  ) : null}
                  <div className="p-4 sm:p-6">
                    {tab === 'slip' ? (
                      <PackingSlipDocument order={order} />
                    ) : (
                      <ThankYouInsertDocument order={order} />
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </Modal>
  )
}

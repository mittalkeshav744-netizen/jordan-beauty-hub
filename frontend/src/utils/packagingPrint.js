import { STORE_NAME } from '../constants/navigation'
import { formatDate } from './format'
import {
  formatShippingBlock,
  normalizeOrderForPackaging,
  totalUnits,
} from './packagingOrder'

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function slipHtml(order) {
  const pack = normalizeOrderForPackaging(order)
  const address = formatShippingBlock(pack)
    .map((line) => `<div>${escapeHtml(line)}</div>`)
    .join('')
  const rows =
    pack.items.length === 0
      ? '<tr><td colspan="6">No line items on this order.</td></tr>'
      : pack.items
          .map(
            (item) => `
        <tr>
          <td>${item.serial}</td>
          <td>${escapeHtml(item.productName)}</td>
          <td>${escapeHtml(item.sku)}</td>
          <td>${escapeHtml(item.variantName)}</td>
          <td>${item.quantity}</td>
          <td class="check">☐</td>
        </tr>`,
          )
          .join('')

  return `
    <section class="page slip">
      <header class="row">
        <div>
          <div class="brand">${escapeHtml(STORE_NAME)}</div>
        </div>
        <div class="right">
          <h1>PACKING SLIP</h1>
          <div class="strong">${escapeHtml(pack.number)}</div>
          <div class="muted">${escapeHtml(formatDate(pack.createdAt) || '—')}</div>
        </div>
      </header>
      <h2>Customer / ship to</h2>
      <div class="strong">${escapeHtml(pack.customerName)}</div>
      ${pack.phone ? `<div>${escapeHtml(pack.phone)}</div>` : ''}
      ${address || '<div class="muted">No shipping address on file.</div>'}
      ${
        pack.customerNote
          ? `<div class="note"><strong>Packing note:</strong> ${escapeHtml(pack.customerNote)}</div>`
          : ''
      }
      <table>
        <thead>
          <tr><th>#</th><th>Product</th><th>SKU</th><th>Variant</th><th>Qty</th><th>Packed</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p class="strong">Total units to pack: ${totalUnits(pack.items)}</p>
      <footer>Packed with care by ${escapeHtml(STORE_NAME)}.</footer>
    </section>`
}

function thankYouHtml(order) {
  const pack = normalizeOrderForPackaging(order)
  return `
    <section class="page thank">
      <div class="card">
        <div class="brand">${escapeHtml(STORE_NAME)}</div>
        <h1>THANK YOU FOR YOUR ORDER!</h1>
        <p class="dear">Dear ${escapeHtml(pack.customerName)},</p>
        <p class="muted">Order ${escapeHtml(pack.number)}</p>
        <p>Thank you for choosing ${escapeHtml(STORE_NAME)}.</p>
        <p>We are delighted to be a part of your beauty journey. We hope you love your purchase as much as we loved preparing it for you.</p>
        <p class="tagline">Your Beauty, Your Glow.</p>
        <p class="muted small">Questions? Reach out through the Jordan Beauty Hub website.</p>
        <p class="brand small">${escapeHtml(STORE_NAME)}</p>
      </div>
    </section>`
}

const PRINT_CSS = `
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Georgia, 'Times New Roman', serif; color: #242024; }
  .page { page-break-after: always; }
  .page:last-child { page-break-after: auto; }
  .slip { padding: 16mm; }
  .thank { padding: 0; }
  .row { display: flex; justify-content: space-between; gap: 16px; border-bottom: 1px solid #E8B7C8; padding-bottom: 12px; margin-bottom: 16px; }
  .brand { font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #54243F; }
  h1 { margin: 0; font-size: 20px; letter-spacing: 0.1em; color: #54243F; }
  h2 { margin: 0 0 6px; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: #54243F; }
  .right { text-align: right; }
  .strong { font-weight: 700; }
  .muted { color: #686868; font-size: 12px; }
  .note { margin-top: 10px; padding: 8px 10px; background: #FAF6F2; border: 1px solid #E8B7C8; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; margin-top: 18px; font-size: 12px; }
  th { text-align: left; border-bottom: 2px solid #54243F; padding: 6px 4px; font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: #54243F; }
  td { border-bottom: 1px solid #e7e2e4; padding: 8px 4px; vertical-align: top; }
  tr { page-break-inside: avoid; }
  .check { text-align: center; }
  footer { margin-top: 28px; text-align: center; font-size: 11px; color: #54243F; border-top: 1px solid #E8B7C8; padding-top: 10px; }
  .thank .card { min-height: 190mm; margin: 8mm; padding: 18mm 14mm; border: 1px solid #54243F; border-radius: 8px; background: #FAF6F2; text-align: center; display: flex; flex-direction: column; justify-content: space-between; }
  .thank h1 { font-size: 22px; margin: 12px 0; }
  .dear { color: #803B5B; font-weight: 700; }
  .tagline { font-size: 18px; color: #54243F; font-weight: 700; margin-top: 18px; }
  .small { font-size: 11px; }
  @page.slip-page { size: A4; margin: 12mm; }
  @page.thank-page { size: A5; margin: 8mm; }
`

function openPrintWindow(htmlBody, pageClass) {
  const popup = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700')
  if (!popup) {
    throw new Error('Pop-up blocked. Allow pop-ups to print packaging documents.')
  }
  popup.document.write(`<!doctype html><html><head><title>${STORE_NAME} packaging</title>
    <style>${PRINT_CSS}
      @media print {
        ${pageClass === 'slip' ? '@page { size: A4; margin: 12mm; }' : '@page { size: A5; margin: 8mm; }'}
      }
    </style></head><body>${htmlBody}</body></html>`)
  popup.document.close()
  popup.focus()
  // Allow layout before print
  setTimeout(() => {
    popup.print()
    popup.close()
  }, 250)
}

export function printPackingSlips(orders) {
  const list = Array.isArray(orders) ? orders : [orders]
  if (!list.length) throw new Error('No orders to print.')
  openPrintWindow(list.map(slipHtml).join(''), 'slip')
}

export function printThankYouInserts(orders) {
  const list = Array.isArray(orders) ? orders : [orders]
  if (!list.length) throw new Error('No orders to print.')
  openPrintWindow(list.map(thankYouHtml).join(''), 'thank')
}

export function printBothDocuments(orders) {
  const list = Array.isArray(orders) ? orders : [orders]
  if (!list.length) throw new Error('No orders to print.')
  // Print slips first, then thank-you cards (two print dialogs keeps page sizes correct).
  printPackingSlips(list)
  setTimeout(() => printThankYouInserts(list), 600)
}

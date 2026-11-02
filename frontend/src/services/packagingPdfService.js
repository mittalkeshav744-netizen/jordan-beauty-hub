import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

import { STORE_NAME } from '../constants/navigation'
import { formatDate } from '../utils/format'
import {
  formatShippingBlock,
  normalizeOrderForPackaging,
  totalUnits,
} from '../utils/packagingOrder'

const PLUM = [84, 36, 63]
const BERRY = [128, 59, 91]
const CHARCOAL = [36, 32, 36]
const MUTED = [104, 104, 104]

function drawBrandHeader(doc, title, x, y) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...PLUM)
  doc.text(STORE_NAME, x, y)
  doc.setFontSize(16)
  doc.text(title, x, y + 8)
  return y + 14
}

function addPackingSlipPage(doc, order, { isFirst }) {
  const pack = normalizeOrderForPackaging(order)
  if (!isFirst) doc.addPage('a4', 'portrait')

  let y = drawBrandHeader(doc, 'PACKING SLIP', 14, 18)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...CHARCOAL)
  doc.text(`Order: ${pack.number}`, 14, y)
  doc.text(`Date: ${formatDate(pack.createdAt) || '—'}`, 14, y + 5)

  y += 14
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...PLUM)
  doc.text('CUSTOMER / SHIP TO', 14, y)
  y += 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...CHARCOAL)
  doc.text(pack.customerName, 14, y)
  y += 5
  if (pack.phone) {
    doc.text(pack.phone, 14, y)
    y += 5
  }
  for (const line of formatShippingBlock(pack)) {
    const wrapped = doc.splitTextToSize(line, 180)
    doc.text(wrapped, 14, y)
    y += wrapped.length * 5
  }

  if (pack.customerNote) {
    y += 3
    doc.setFontSize(9)
    doc.setTextColor(...MUTED)
    const note = doc.splitTextToSize(`Packing note: ${pack.customerNote}`, 180)
    doc.text(note, 14, y)
    y += note.length * 4.5 + 2
  }

  autoTable(doc, {
    startY: Math.max(y + 4, 60),
    head: [['#', 'Product', 'SKU', 'Variant', 'Qty', 'Packed']],
    body: pack.items.map((item) => [
      String(item.serial),
      item.productName,
      item.sku,
      item.variantName,
      String(item.quantity),
      '☐',
    ]),
    styles: { fontSize: 9, textColor: CHARCOAL, cellPadding: 2.5 },
    headStyles: { fillColor: PLUM, textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 10 },
      4: { cellWidth: 14, halign: 'center' },
      5: { cellWidth: 18, halign: 'center' },
    },
    margin: { left: 14, right: 14 },
  })

  const afterTable = doc.lastAutoTable?.finalY || y + 20
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...CHARCOAL)
  doc.text(`Total units to pack: ${totalUnits(pack.items)}`, 14, afterTable + 8)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...PLUM)
  doc.text(`Packed with care by ${STORE_NAME}.`, 105, 285, { align: 'center' })
}

function addThankYouPage(doc, order) {
  const pack = normalizeOrderForPackaging(order)

  doc.setFillColor(250, 246, 242)
  doc.rect(0, 0, 148, 210, 'F')

  doc.setDrawColor(...PLUM)
  doc.setLineWidth(0.6)
  doc.roundedRect(8, 8, 132, 194, 3, 3, 'S')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...PLUM)
  doc.text(STORE_NAME, 74, 28, { align: 'center' })

  doc.setFontSize(15)
  doc.text('THANK YOU FOR YOUR ORDER!', 74, 48, { align: 'center' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...BERRY)
  doc.text(`Dear ${pack.customerName},`, 74, 62, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...MUTED)
  doc.text(`Order ${pack.number}`, 74, 70, { align: 'center' })

  doc.setTextColor(...CHARCOAL)
  doc.setFontSize(10)
  const body = doc.splitTextToSize(
    `Thank you for choosing ${STORE_NAME}.\n\nWe are delighted to be a part of your beauty journey. We hope you love your purchase as much as we loved preparing it for you.`,
    110,
  )
  doc.text(body, 74, 88, { align: 'center' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...PLUM)
  doc.text('Your Beauty, Your Glow.', 74, 140, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...MUTED)
  doc.text('Questions? Reach out through the Jordan Beauty Hub website.', 74, 175, {
    align: 'center',
  })
  doc.setTextColor(...PLUM)
  doc.text(STORE_NAME, 74, 185, { align: 'center' })
}

export function downloadPackingSlipPdf(orders) {
  const list = Array.isArray(orders) ? orders : [orders]
  if (!list.length) throw new Error('No orders to export.')
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  list.forEach((order, index) => addPackingSlipPage(doc, order, { isFirst: index === 0 }))
  const name =
    list.length === 1
      ? `packing-slip-${normalizeOrderForPackaging(list[0]).number}.pdf`
      : 'packing-slips-bulk.pdf'
  doc.save(name)
}

export function downloadThankYouPdf(orders) {
  const list = Array.isArray(orders) ? orders : [orders]
  if (!list.length) throw new Error('No orders to export.')
  const doc = new jsPDF({ unit: 'mm', format: [148, 210], orientation: 'portrait' })
  list.forEach((order, index) => {
    if (index > 0) doc.addPage([148, 210], 'portrait')
    addThankYouPage(doc, order)
  })
  const name =
    list.length === 1
      ? `thank-you-${normalizeOrderForPackaging(list[0]).number}.pdf`
      : 'thank-you-bulk.pdf'
  doc.save(name)
}

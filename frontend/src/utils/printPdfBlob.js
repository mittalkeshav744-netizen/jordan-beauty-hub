/**
 * Browser PDF download and print-dialog helpers for Certificate Studio.
 */
export function downloadPdfBlob(blob, filename = 'certificate.pdf') {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function printPdfBlob(blob, title = 'Certificate') {
  const url = URL.createObjectURL(blob)
  const iframe = document.createElement('iframe')
  iframe.setAttribute('title', title)
  // Keep a real off-screen viewport box so Chromium PDF viewer renders full A4 pages cleanly.
  iframe.style.cssText =
    'position:fixed;left:-200vw;top:0;width:100vw;height:100vh;border:0;pointer-events:none'
  document.body.appendChild(iframe)
  iframe.onload = () => {
    window.setTimeout(() => {
      try {
        iframe.contentWindow.focus()
        iframe.contentWindow.print()
      } catch {
        window.open(url, '_blank', 'noopener,noreferrer')
      }
    }, 250)
    window.setTimeout(() => {
      iframe.remove()
      URL.revokeObjectURL(url)
    }, 60_000)
  }
  iframe.src = url
}

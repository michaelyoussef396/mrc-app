import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

/**
 * Fetch a URL and return it as a base64 data URL.
 * Returns null if the fetch fails for any reason.
 */
async function fetchAsBase64DataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const blob = await response.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

/**
 * Find all external URLs in the HTML (img src, CSS url()) and replace
 * them with inline base64 data URLs. This makes the HTML fully
 * self-contained — no CORS issues, no expired signed URLs.
 */
async function embedExternalResources(html: string): Promise<string> {
  const urlRegex = /(?:src="|url\(['"]?)(https?:\/\/[^"'\s)]+)(?:"|['"]?\))/g
  const urls = new Set<string>()
  let match: RegExpExecArray | null
  while ((match = urlRegex.exec(html)) !== null) {
    urls.add(match[1])
  }
  if (urls.size === 0) return html

  // Fetch all URLs in parallel
  const entries = await Promise.all(
    [...urls].map(async (url) => ({
      url,
      dataUrl: await fetchAsBase64DataUrl(url),
    }))
  )

  // Replace each URL with its base64 data URL
  let result = html
  for (const { url, dataUrl } of entries) {
    if (dataUrl) {
      result = result.replaceAll(url, dataUrl)
    }
  }
  return result
}

/**
 * Convert an HTML report string into a real PDF blob.
 *
 * Works by loading the HTML in a visible (but clipped) iframe, waiting for
 * all fonts to load, capturing each page with html2canvas at 2x resolution,
 * and composing them into a jsPDF A4 document.
 *
 * Page structure expected: `.report-page.page-break` or `.tc-page.page-break`
 * divs, each representing one A4 page (794×1123px).
 */
export async function convertHtmlToPdf(htmlContent: string): Promise<Blob> {
  // Embed all external resources (images, fonts) as base64 data URLs
  // so html2canvas has no CORS/expiry issues
  const selfContainedHtml = await embedExternalResources(htmlContent)

  // Create iframe — visible but clipped so html2canvas can render properly.
  // html2canvas has issues capturing off-screen elements (left:-9999px).
  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;left:0;top:0;width:794px;height:1123px;border:none;opacity:0;pointer-events:none;z-index:-1;'
  document.body.appendChild(iframe)

  try {
    // Write HTML content into the iframe
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
    if (!iframeDoc) throw new Error('Failed to access iframe document')

    iframeDoc.open()
    iframeDoc.write(selfContainedHtml)
    iframeDoc.close()

    // Wait for iframe load + fonts ready
    await new Promise<void>((resolve) => {
      const iframeWin = iframe.contentWindow
      if (!iframeWin) { resolve(); return }

      iframeWin.addEventListener('load', async () => {
        // Wait for all @font-face fonts to finish loading in the iframe
        try {
          const iframeDocument = iframeWin.document as Document & { fonts?: FontFaceSet }
          if (iframeDocument.fonts) {
            await iframeDocument.fonts.ready
          }
        } catch {
          // fonts API not available — fall through
        }
        // Extra buffer for rendering to settle (images, layout reflow)
        setTimeout(resolve, 1500)
      })

      // Fallback timeout — don't hang forever
      setTimeout(resolve, 10000)
    })

    // Find all page elements
    const pages = iframeDoc.querySelectorAll('.page-break')
    if (pages.length === 0) {
      throw new Error('No page elements found in HTML report')
    }

    // A4 dimensions in mm
    const A4_WIDTH_MM = 210
    const A4_HEIGHT_MM = 297

    // Create PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    for (let i = 0; i < pages.length; i++) {
      const pageEl = pages[i] as HTMLElement

      // Add new page for pages after the first
      if (i > 0) {
        pdf.addPage()
      }

      // Force each page to exact A4 pixel dimensions to avoid cut-off
      const origHeight = pageEl.style.height
      const origOverflow = pageEl.style.overflow
      pageEl.style.height = '1123px'
      pageEl.style.overflow = 'hidden'

      // Capture the page element as canvas
      const canvas = await html2canvas(pageEl, {
        scale: 2,           // 2x for crisp output on retina
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#FFFFFF',
        width: 794,
        height: 1123,       // Fixed A4 height — never exceed
        windowWidth: 794,
        logging: false,
        // Render from the iframe's window context for proper font access
        foreignObjectRendering: false,
      })

      // Restore original styles
      pageEl.style.height = origHeight
      pageEl.style.overflow = origOverflow

      // Convert canvas to high-quality image
      const imgData = canvas.toDataURL('image/jpeg', 0.95)

      // Add to PDF — full A4 page, no scaling needed since we fixed 794×1123
      pdf.addImage(imgData, 'JPEG', 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM)
    }

    // Return as blob
    return pdf.output('blob')
  } finally {
    // Clean up iframe
    document.body.removeChild(iframe)
  }
}

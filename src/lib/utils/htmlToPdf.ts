import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

/**
 * Convert an HTML report string into a real PDF blob.
 *
 * Works by loading the HTML in a hidden iframe, capturing each page
 * element with html2canvas, and composing them into a jsPDF A4 document.
 *
 * Page structure expected: `.report-page.page-break` or `.tc-page.page-break`
 * divs, each representing one A4 page (794×1123px).
 */
export async function convertHtmlToPdf(htmlContent: string): Promise<Blob> {
  // Create hidden iframe to render the HTML
  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:794px;height:1123px;border:none;'
  document.body.appendChild(iframe)

  try {
    // Write HTML content into the iframe
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
    if (!iframeDoc) throw new Error('Failed to access iframe document')

    iframeDoc.open()
    iframeDoc.write(htmlContent)
    iframeDoc.close()

    // Wait for images and fonts to load
    await new Promise<void>((resolve) => {
      const iframeWin = iframe.contentWindow
      if (!iframeWin) { resolve(); return }

      // Wait for iframe load event + extra buffer for images
      iframeWin.addEventListener('load', () => setTimeout(resolve, 1500))
      // Fallback timeout in case load never fires
      setTimeout(resolve, 5000)
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

      // Capture the page element as canvas
      const canvas = await html2canvas(pageEl, {
        scale: 2, // 2x for crisp output
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#FFFFFF',
        width: 794,
        height: pageEl.scrollHeight || 1123,
        windowWidth: 794,
        logging: false,
      })

      // Convert canvas to image and add to PDF
      const imgData = canvas.toDataURL('image/jpeg', 0.92)

      // Calculate dimensions to fit A4
      const canvasRatio = canvas.height / canvas.width
      const pageWidth = A4_WIDTH_MM
      const pageHeight = pageWidth * canvasRatio

      // If the page is taller than A4, scale to fit height instead
      if (pageHeight > A4_HEIGHT_MM) {
        const scaledWidth = A4_HEIGHT_MM / canvasRatio
        const xOffset = (A4_WIDTH_MM - scaledWidth) / 2
        pdf.addImage(imgData, 'JPEG', xOffset, 0, scaledWidth, A4_HEIGHT_MM)
      } else {
        pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight)
      }
    }

    // Return as blob
    return pdf.output('blob')
  } finally {
    // Clean up iframe
    document.body.removeChild(iframe)
  }
}

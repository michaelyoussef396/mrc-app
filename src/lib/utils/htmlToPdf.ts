import { jsPDF } from 'jspdf'

/**
 * Fetch a URL and return it as a base64 data URL.
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
 * them with inline base64 data URLs.
 */
async function embedExternalResources(html: string): Promise<string> {
  const urlRegex = /(?:src="|url\(['"]?)(https?:\/\/[^"'\s)]+)(?:"|['"]?\))/g
  const urls = new Set<string>()
  let match: RegExpExecArray | null
  while ((match = urlRegex.exec(html)) !== null) {
    urls.add(match[1])
  }
  if (urls.size === 0) return html

  const entries = await Promise.all(
    [...urls].map(async (url) => ({
      url,
      dataUrl: await fetchAsBase64DataUrl(url),
    }))
  )

  let result = html
  for (const { url, dataUrl } of entries) {
    if (dataUrl) {
      result = result.replaceAll(url, dataUrl)
    }
  }
  return result
}

/**
 * Render a single page element to a canvas using the browser's native
 * renderer via SVG foreignObject. This produces pixel-perfect output
 * unlike html2canvas which re-implements CSS.
 */
async function renderPageToCanvas(
  pageEl: HTMLElement,
  iframeDoc: Document,
  width: number,
  height: number,
  scale: number
): Promise<HTMLCanvasElement> {
  // Clone the page element with all computed styles inlined
  const clone = pageEl.cloneNode(true) as HTMLElement

  // Get all stylesheets from the iframe as text
  const styleSheets: string[] = []
  for (const sheet of Array.from(iframeDoc.styleSheets)) {
    try {
      const rules = Array.from(sheet.cssRules)
      styleSheets.push(rules.map(r => r.cssText).join('\n'))
    } catch {
      // Cross-origin stylesheet — skip
    }
  }

  // Also grab any <style> tags directly from the document
  const styleTags = iframeDoc.querySelectorAll('style')
  styleTags.forEach(tag => {
    if (tag.textContent) styleSheets.push(tag.textContent)
  })

  const allStyles = styleSheets.join('\n')

  // Build a self-contained HTML snippet for the foreignObject
  const foreignHtml = `
    <div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;height:${height}px;overflow:hidden;margin:0;padding:0;">
      <style>${allStyles}</style>
      ${clone.outerHTML}
    </div>
  `

  // Create SVG with foreignObject
  const svgString = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <foreignObject width="100%" height="100%">
        ${foreignHtml}
      </foreignObject>
    </svg>
  `

  // Convert SVG to an image
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
  const svgUrl = URL.createObjectURL(svgBlob)

  const img = new Image()
  img.width = width * scale
  img.height = height * scale

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('SVG foreignObject render failed'))
    img.src = svgUrl
  })

  // Draw to canvas at desired scale
  const canvas = document.createElement('canvas')
  canvas.width = width * scale
  canvas.height = height * scale
  const ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)
  ctx.drawImage(img, 0, 0, width, height)

  URL.revokeObjectURL(svgUrl)
  return canvas
}

/**
 * Convert an HTML report string into a PDF blob.
 *
 * Strategy: Load HTML in a hidden iframe, then for each page:
 * 1. Try SVG foreignObject rendering (uses browser's native renderer)
 * 2. Fall back to html2canvas if foreignObject fails (CORS/taint issues)
 *
 * Page structure: `.page-break` divs, each ~794×1123px (A4 proportions).
 */
export async function convertHtmlToPdf(htmlContent: string): Promise<Blob> {
  const selfContainedHtml = await embedExternalResources(htmlContent)

  // Create iframe — on-screen but invisible
  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;left:0;top:0;width:794px;height:1123px;border:none;opacity:0;pointer-events:none;z-index:-1;'
  document.body.appendChild(iframe)

  try {
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
    if (!iframeDoc) throw new Error('Failed to access iframe document')

    iframeDoc.open()
    iframeDoc.write(selfContainedHtml)
    iframeDoc.close()

    // Wait for iframe load + fonts
    await new Promise<void>((resolve) => {
      const iframeWin = iframe.contentWindow
      if (!iframeWin) { resolve(); return }

      iframeWin.addEventListener('load', async () => {
        try {
          const doc = iframeWin.document as Document & { fonts?: FontFaceSet }
          if (doc.fonts) await doc.fonts.ready
        } catch { /* ignore */ }
        setTimeout(resolve, 2000)
      })
      setTimeout(resolve, 12000)
    })

    const pages = iframeDoc.querySelectorAll('.page-break')
    if (pages.length === 0) throw new Error('No page elements found')

    const A4_W = 210, A4_H = 297
    const PX_W = 794, PX_H = 1123
    const SCALE = 2

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

    for (let i = 0; i < pages.length; i++) {
      const pageEl = pages[i] as HTMLElement
      if (i > 0) pdf.addPage()

      let canvas: HTMLCanvasElement

      try {
        // Primary: SVG foreignObject — uses browser's real renderer
        canvas = await renderPageToCanvas(pageEl, iframeDoc, PX_W, PX_H, SCALE)
      } catch {
        // Fallback: html2canvas (may have quality issues but at least produces output)
        const { default: html2canvas } = await import('html2canvas')
        pageEl.style.height = `${PX_H}px`
        pageEl.style.overflow = 'hidden'
        canvas = await html2canvas(pageEl, {
          scale: SCALE,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#FFFFFF',
          width: PX_W,
          height: PX_H,
          windowWidth: PX_W,
          logging: false,
        })
      }

      const imgData = canvas.toDataURL('image/jpeg', 0.95)
      pdf.addImage(imgData, 'JPEG', 0, 0, A4_W, A4_H)
    }

    return pdf.output('blob')
  } finally {
    document.body.removeChild(iframe)
  }
}

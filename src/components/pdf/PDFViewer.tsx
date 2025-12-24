// PDFViewer Component
// Displays a PDF report with navigation and controls
// Mobile-first design with 48px touch targets

import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PDFViewerProps {
  /** URL to the PDF or HTML report */
  url: string
  /** Whether this is HTML content (rendered in iframe) or actual PDF */
  isHtml?: boolean
  /** Callback when PDF finishes loading */
  onLoadSuccess?: () => void
  /** Callback when PDF fails to load */
  onLoadError?: (error: string) => void
  /** Optional class name */
  className?: string
}

export function PDFViewer({
  url,
  isHtml = true,
  onLoadSuccess,
  onLoadError,
  className = ''
}: PDFViewerProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [zoom, setZoom] = useState(100)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
  }, [url])

  const handleLoad = () => {
    setLoading(false)
    onLoadSuccess?.()
  }

  const handleError = () => {
    setLoading(false)
    const errorMsg = 'Failed to load report'
    setError(errorMsg)
    onLoadError?.(errorMsg)
  }

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 200))
  }

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 50))
  }

  const handleFullscreen = () => {
    if (iframeRef.current) {
      if (iframeRef.current.requestFullscreen) {
        iframeRef.current.requestFullscreen()
      }
    }
  }

  const handlePrint = () => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.print()
    }
  }

  return (
    <div className={`pdf-viewer flex flex-col h-full ${className}`}>
      {/* Controls Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-100 border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleZoomOut}
            disabled={zoom <= 50}
            className="h-12 w-12 min-h-[48px] min-w-[48px]"
            title="Zoom out"
          >
            <ZoomOut className="h-5 w-5" />
          </Button>
          <span className="text-sm font-medium min-w-[60px] text-center">
            {zoom}%
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={handleZoomIn}
            disabled={zoom >= 200}
            className="h-12 w-12 min-h-[48px] min-w-[48px]"
            title="Zoom in"
          >
            <ZoomIn className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleFullscreen}
            className="h-12 w-12 min-h-[48px] min-w-[48px]"
            title="Fullscreen"
          >
            <Maximize2 className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* PDF/HTML Content */}
      <div className="flex-1 overflow-auto bg-gray-200 p-4">
        {loading && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-orange-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading report...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center max-w-md px-4">
              <p className="text-red-600 mb-4">{error}</p>
              <Button
                onClick={() => window.location.reload()}
                className="bg-orange-600 hover:bg-orange-700"
              >
                Retry
              </Button>
            </div>
          </div>
        )}

        {!error && (
          <div
            className="mx-auto transition-transform origin-top"
            style={{
              transform: `scale(${zoom / 100})`,
              width: `${100 / (zoom / 100)}%`,
              maxWidth: zoom > 100 ? 'none' : '100%'
            }}
          >
            <iframe
              ref={iframeRef}
              src={url}
              className="w-full bg-white shadow-lg rounded-lg"
              style={{
                minHeight: '1200px',
                display: loading ? 'none' : 'block'
              }}
              onLoad={handleLoad}
              onError={handleError}
              title="Inspection Report"
            />
          </div>
        )}
      </div>

      {/* Print Button - Fixed at bottom on mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 safe-area-inset-bottom">
        <Button
          onClick={handlePrint}
          className="w-full h-14 min-h-[56px] bg-orange-600 hover:bg-orange-700 text-lg font-semibold"
        >
          Print / Save as PDF
        </Button>
      </div>
    </div>
  )
}

export default PDFViewer

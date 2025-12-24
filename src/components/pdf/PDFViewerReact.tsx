// PDFViewerReact Component
// Visual PDF preview using react-pdf with edit overlay support
// Mobile-first design with 48px touch targets

import { useState, useCallback } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { Button } from '@/components/ui/button'
import { Loader2, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize } from 'lucide-react'

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`

interface PDFViewerReactProps {
  /** URL of the PDF to display */
  pdfUrl: string
  /** Whether edit mode is active */
  editMode?: boolean
  /** Callback when an editable field is clicked */
  onFieldClick?: (fieldKey: string, pageNumber: number, position: { x: number; y: number }) => void
  /** Callback when PDF loads successfully */
  onLoadSuccess?: () => void
  /** Callback when PDF fails to load */
  onLoadError?: (error: string) => void
}

export function PDFViewerReact({
  pdfUrl,
  editMode = false,
  onFieldClick,
  onLoadSuccess,
  onLoadError
}: PDFViewerReactProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState<number>(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [scale, setScale] = useState(1.0)

  // Calculate responsive width based on viewport
  const getPageWidth = useCallback(() => {
    const containerWidth = Math.min(window.innerWidth - 32, 794) // A4 width max
    return containerWidth * scale
  }, [scale])

  function handleDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages)
    setLoading(false)
    setError(null)
    onLoadSuccess?.()
  }

  function handleDocumentLoadError(err: Error) {
    console.error('PDF load error:', err)
    setLoading(false)
    setError('Failed to load PDF. Please try again.')
    onLoadError?.(err.message)
  }

  function goToPreviousPage() {
    setPageNumber(prev => Math.max(1, prev - 1))
  }

  function goToNextPage() {
    setPageNumber(prev => Math.min(numPages, prev + 1))
  }

  function zoomIn() {
    setScale(prev => Math.min(2.0, prev + 0.25))
  }

  function zoomOut() {
    setScale(prev => Math.max(0.5, prev - 0.25))
  }

  function resetZoom() {
    setScale(1.0)
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-gray-100 rounded-lg">
        <Loader2 className="h-12 w-12 animate-spin text-orange-600 mb-4" />
        <p className="text-gray-600">Loading report...</p>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-red-50 rounded-lg p-6">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="pdf-viewer-react">
      {/* Toolbar */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
        {/* Page Navigation */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={goToPreviousPage}
            disabled={pageNumber <= 1}
            className="h-10 w-10 min-h-[40px] min-w-[40px]"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <span className="text-sm font-medium min-w-[80px] text-center">
            Page {pageNumber} of {numPages}
          </span>

          <Button
            variant="outline"
            size="icon"
            onClick={goToNextPage}
            disabled={pageNumber >= numPages}
            className="h-10 w-10 min-h-[40px] min-w-[40px]"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={zoomOut}
            disabled={scale <= 0.5}
            className="h-10 w-10 min-h-[40px] min-w-[40px]"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>

          <button
            onClick={resetZoom}
            className="text-sm font-medium min-w-[50px] text-center hover:text-orange-600"
          >
            {Math.round(scale * 100)}%
          </button>

          <Button
            variant="outline"
            size="icon"
            onClick={zoomIn}
            disabled={scale >= 2.0}
            className="h-10 w-10 min-h-[40px] min-w-[40px]"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* PDF Content */}
      <div className="relative overflow-auto bg-gray-200 p-4">
        <div className="flex justify-center">
          <div className="relative bg-white shadow-lg">
            <Document
              file={pdfUrl}
              onLoadSuccess={handleDocumentLoadSuccess}
              onLoadError={handleDocumentLoadError}
              loading={
                <div className="flex items-center justify-center h-[600px]">
                  <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
                </div>
              }
            >
              <Page
                pageNumber={pageNumber}
                width={getPageWidth()}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                loading={
                  <div className="flex items-center justify-center h-[600px] w-[400px]">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                }
              />
            </Document>

            {/* Edit Overlay - shown in edit mode */}
            {editMode && (
              <EditOverlay
                pageNumber={pageNumber}
                scale={scale}
                onFieldClick={onFieldClick}
              />
            )}
          </div>
        </div>
      </div>

      {/* Mobile Page Navigation */}
      <div className="md:hidden fixed bottom-20 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 flex items-center justify-between z-20">
        <Button
          variant="outline"
          onClick={goToPreviousPage}
          disabled={pageNumber <= 1}
          className="h-12 min-h-[48px] px-4"
        >
          <ChevronLeft className="h-5 w-5 mr-1" />
          Previous
        </Button>

        <span className="text-sm font-medium">
          {pageNumber} / {numPages}
        </span>

        <Button
          variant="outline"
          onClick={goToNextPage}
          disabled={pageNumber >= numPages}
          className="h-12 min-h-[48px] px-4"
        >
          Next
          <ChevronRight className="h-5 w-5 ml-1" />
        </Button>
      </div>
    </div>
  )
}

// Edit Overlay Component - Shows edit buttons on editable fields
interface EditOverlayProps {
  pageNumber: number
  scale: number
  onFieldClick?: (fieldKey: string, pageNumber: number, position: { x: number; y: number }) => void
}

function EditOverlay({ pageNumber, scale, onFieldClick }: EditOverlayProps) {
  // Map of editable fields per page with their positions
  // These positions correspond to the PDF template layout
  const EDITABLE_FIELDS: Record<number, Array<{
    key: string
    label: string
    x: number
    y: number
    type: 'text' | 'textarea' | 'image' | 'currency' | 'number'
  }>> = {
    1: [ // Cover Page
      { key: 'client_name', label: 'Client Name', x: 50, y: 380, type: 'text' },
      { key: 'property_address', label: 'Address', x: 50, y: 420, type: 'textarea' },
      { key: 'cover_photo', label: 'Cover Photo', x: 350, y: 200, type: 'image' }
    ],
    2: [ // Value Proposition - What We Found
      { key: 'ai_summary', label: 'What We Found', x: 50, y: 300, type: 'textarea' }
    ],
    3: [ // Outdoor Environment
      { key: 'outdoor_temperature', label: 'Temperature', x: 150, y: 400, type: 'number' },
      { key: 'outdoor_humidity', label: 'Humidity', x: 350, y: 400, type: 'number' },
      { key: 'outdoor_comments', label: 'Comments', x: 50, y: 500, type: 'textarea' }
    ],
    5: [ // Problem Analysis
      { key: 'cause_of_mould', label: 'Cause of Mould', x: 50, y: 300, type: 'textarea' }
    ],
    6: [ // Cleaning Estimate
      { key: 'labor_cost', label: 'Labor Cost', x: 400, y: 350, type: 'currency' },
      { key: 'equipment_cost', label: 'Equipment Cost', x: 400, y: 400, type: 'currency' },
      { key: 'total_inc_gst', label: 'Total (inc GST)', x: 400, y: 500, type: 'currency' }
    ]
  }

  const fieldsOnPage = EDITABLE_FIELDS[pageNumber] || []

  if (fieldsOnPage.length === 0) return null

  return (
    <div className="absolute inset-0 pointer-events-none">
      {fieldsOnPage.map((field) => (
        <button
          key={field.key}
          onClick={() => onFieldClick?.(field.key, pageNumber, { x: field.x, y: field.y })}
          className="absolute pointer-events-auto flex items-center justify-center
                     w-8 h-8 min-w-[32px] min-h-[32px] rounded-full
                     bg-orange-600 text-white shadow-lg
                     hover:bg-orange-700 hover:scale-110
                     transition-all duration-200 z-10"
          style={{
            left: `${field.x * scale}px`,
            top: `${field.y * scale}px`,
          }}
          title={`Edit ${field.label}`}
        >
          {field.type === 'image' ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          )}
        </button>
      ))}
    </div>
  )
}

export default PDFViewerReact

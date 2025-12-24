// ReportPreviewHTML Component
// Renders the HTML report with edit overlay buttons
// Fetches HTML content and renders it directly to avoid cross-origin issues

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/integrations/supabase/client'
import {
  Loader2,
  ZoomIn,
  ZoomOut,
  Printer,
  ChevronLeft,
  ChevronRight,
  Edit,
  Image as ImageIcon,
  ExternalLink
} from 'lucide-react'

interface EditableField {
  key: string
  label: string
  type: 'text' | 'textarea' | 'image' | 'currency' | 'number'
  page: number
  position: { x: number; y: number }
}

// Editable fields configuration matching the template
const EDITABLE_FIELDS: EditableField[] = [
  // Page 1 - Cover
  { key: 'client_name', label: 'Client Name', type: 'text', page: 1, position: { x: 50, y: 370 } },
  { key: 'property_address', label: 'Property Address', type: 'textarea', page: 1, position: { x: 50, y: 420 } },
  { key: 'cover_photo', label: 'Cover Photo', type: 'image', page: 1, position: { x: 550, y: 200 } },

  // Page 2 - Value Proposition / What We Found
  { key: 'ai_summary', label: 'What We Found', type: 'textarea', page: 2, position: { x: 50, y: 280 } },

  // Page 3 - Outdoor Environment
  { key: 'outdoor_temperature', label: 'Temperature', type: 'number', page: 3, position: { x: 280, y: 340 } },
  { key: 'outdoor_humidity', label: 'Humidity', type: 'number', page: 3, position: { x: 480, y: 340 } },
  { key: 'outdoor_dew_point', label: 'Dew Point', type: 'number', page: 3, position: { x: 680, y: 340 } },
  { key: 'outdoor_comments', label: 'Outdoor Comments', type: 'textarea', page: 3, position: { x: 50, y: 700 } },
  { key: 'front_door_photo', label: 'Front Door Photo', type: 'image', page: 3, position: { x: 150, y: 450 } },
  { key: 'front_house_photo', label: 'House Photo', type: 'image', page: 3, position: { x: 450, y: 450 } },

  // Page 5 - Problem Analysis / Cause of Mould
  { key: 'cause_of_mould', label: 'Cause of Mould', type: 'textarea', page: 5, position: { x: 50, y: 300 } },

  // Page 6 - Cleaning Estimate
  { key: 'labor_cost', label: 'Labor Cost', type: 'currency', page: 6, position: { x: 650, y: 350 } },
  { key: 'equipment_cost', label: 'Equipment Cost', type: 'currency', page: 6, position: { x: 650, y: 400 } },
  { key: 'subtotal_ex_gst', label: 'Subtotal', type: 'currency', page: 6, position: { x: 650, y: 470 } },
  { key: 'gst_amount', label: 'GST', type: 'currency', page: 6, position: { x: 650, y: 510 } },
  { key: 'total_inc_gst', label: 'Total (inc GST)', type: 'currency', page: 6, position: { x: 650, y: 560 } },
]

interface ReportPreviewHTMLProps {
  /** URL to the HTML report */
  htmlUrl: string
  /** Whether edit mode is active */
  editMode?: boolean
  /** Callback when a field edit button is clicked */
  onFieldClick?: (field: EditableField) => void
  /** Callback when report loads */
  onLoadSuccess?: () => void
  /** Callback on load error */
  onLoadError?: (error: string) => void
}

export function ReportPreviewHTML({
  htmlUrl,
  editMode = false,
  onFieldClick,
  onLoadSuccess,
  onLoadError
}: ReportPreviewHTMLProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [htmlContent, setHtmlContent] = useState<string | null>(null)
  const [zoom, setZoom] = useState(100)
  const [currentPage, setCurrentPage] = useState(1)
  const totalPages = 9 // Total pages in the template
  const pageHeight = 1123 // A4 page height in pixels

  // Fetch HTML content on mount
  useEffect(() => {
    async function fetchHTML() {
      try {
        setLoading(true)
        setError(null)

        // Try to extract storage path from URL and download via Supabase client
        // This handles CORS properly
        let html: string | null = null

        // Check if this is a Supabase Storage URL
        if (htmlUrl.includes('supabase') && htmlUrl.includes('/storage/')) {
          // Extract the path after 'inspection-reports/'
          const pathMatch = htmlUrl.match(/inspection-reports\/(.+)$/)
          if (pathMatch) {
            const storagePath = pathMatch[1]
            console.log('[ReportPreview] Fetching via Supabase storage:', storagePath)

            const { data, error: downloadError } = await supabase.storage
              .from('inspection-reports')
              .download(storagePath)

            if (downloadError) {
              console.warn('[ReportPreview] Supabase download failed:', downloadError)
            } else if (data) {
              html = await data.text()
              console.log('[ReportPreview] Successfully fetched via Supabase storage')
            }
          }
        }

        // Fallback to direct fetch if Supabase didn't work
        if (!html) {
          console.log('[ReportPreview] Fetching via direct fetch:', htmlUrl)
          const response = await fetch(htmlUrl, {
            mode: 'cors',
            credentials: 'omit'
          })
          if (!response.ok) {
            throw new Error(`Failed to fetch report: ${response.status}`)
          }
          html = await response.text()
        }

        setHtmlContent(html)
        setLoading(false)
        onLoadSuccess?.()
      } catch (err) {
        console.error('[ReportPreview] Failed to load report:', err)
        const errorMsg = err instanceof Error ? err.message : 'Failed to load report'
        setError(errorMsg)
        setLoading(false)
        onLoadError?.(errorMsg)
      }
    }

    if (htmlUrl) {
      fetchHTML()
    }
  }, [htmlUrl, onLoadSuccess, onLoadError])

  // Get fields for current page
  const fieldsOnPage = EDITABLE_FIELDS.filter(f => f.page === currentPage)

  // Zoom controls
  const zoomIn = () => setZoom(prev => Math.min(200, prev + 25))
  const zoomOut = () => setZoom(prev => Math.max(50, prev - 25))

  // Scroll to page
  const scrollToPage = (pageNum: number) => {
    if (containerRef.current) {
      const scrollTop = (pageNum - 1) * pageHeight * (zoom / 100)
      containerRef.current.scrollTo({
        top: scrollTop,
        behavior: 'smooth'
      })
    }
  }

  // Page navigation
  const goToPreviousPage = () => {
    const newPage = Math.max(1, currentPage - 1)
    setCurrentPage(newPage)
    scrollToPage(newPage)
  }

  const goToNextPage = () => {
    const newPage = Math.min(totalPages, currentPage + 1)
    setCurrentPage(newPage)
    scrollToPage(newPage)
  }

  // Track scroll position to update current page
  const handleScroll = () => {
    if (containerRef.current) {
      const scrollTop = containerRef.current.scrollTop
      const scaledPageHeight = pageHeight * (zoom / 100)
      const newPage = Math.floor(scrollTop / scaledPageHeight) + 1
      if (newPage !== currentPage && newPage >= 1 && newPage <= totalPages) {
        setCurrentPage(newPage)
      }
    }
  }

  // Print report - open in new tab
  const handlePrint = () => {
    window.open(htmlUrl, '_blank')
  }

  // Open in new tab for full view
  const handleOpenFullView = () => {
    window.open(htmlUrl, '_blank')
  }

  return (
    <div className="report-preview-html flex flex-col h-full">
      {/* Toolbar */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between shadow-sm">
        {/* Page Navigation */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={goToPreviousPage}
            disabled={currentPage <= 1}
            className="h-10 w-10 min-h-[40px] min-w-[40px]"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <span className="text-sm font-medium min-w-[80px] text-center">
            Page {currentPage} of {totalPages}
          </span>

          <Button
            variant="outline"
            size="icon"
            onClick={goToNextPage}
            disabled={currentPage >= totalPages}
            className="h-10 w-10 min-h-[40px] min-w-[40px]"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Zoom and Print Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={zoomOut}
            disabled={zoom <= 50}
            className="h-10 w-10"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>

          <span className="text-sm font-medium min-w-[45px] text-center">{zoom}%</span>

          <Button
            variant="outline"
            size="icon"
            onClick={zoomIn}
            disabled={zoom >= 200}
            className="h-10 w-10"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>

          <div className="hidden sm:block w-px h-6 bg-gray-300 mx-2" />

          <Button
            variant="outline"
            onClick={handleOpenFullView}
            className="hidden sm:flex h-10"
            title="Open full report in new tab"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Full View
          </Button>

          <Button
            variant="outline"
            onClick={handlePrint}
            className="hidden sm:flex h-10"
          >
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* Report Content */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-gray-200 relative"
        onScroll={handleScroll}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-orange-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading report...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-50 z-10">
            <div className="text-center p-6">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={() => window.location.reload()}>
                Retry
              </Button>
            </div>
          </div>
        )}

        {htmlContent && !loading && !error && (
          <div className="p-4 flex justify-center">
            <div
              ref={contentRef}
              className="relative bg-white shadow-2xl"
              style={{
                width: `${794 * (zoom / 100)}px`,
                minHeight: `${pageHeight * totalPages * (zoom / 100)}px`,
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'top left',
              }}
            >
              {/* Render HTML content directly */}
              <div
                className="report-content"
                style={{
                  width: '794px',
                  minHeight: `${pageHeight * totalPages}px`,
                }}
                dangerouslySetInnerHTML={{ __html: htmlContent }}
              />

              {/* Edit Overlay - Positioned buttons */}
              {editMode && (
                <div
                  className="absolute inset-0 pointer-events-none"
                >
                  {EDITABLE_FIELDS.map((field) => (
                    <button
                      key={field.key}
                      onClick={() => onFieldClick?.(field)}
                      className="absolute pointer-events-auto flex items-center justify-center
                                 w-10 h-10 min-w-[40px] min-h-[40px] rounded-full
                                 bg-orange-600 text-white shadow-lg
                                 hover:bg-orange-700 hover:scale-110
                                 transition-all duration-200 z-30
                                 animate-pulse"
                      style={{
                        left: `${field.position.x}px`,
                        top: `${field.position.y + (field.page - 1) * pageHeight}px`,
                      }}
                      title={`Edit ${field.label}`}
                    >
                      {field.type === 'image' ? (
                        <ImageIcon className="w-5 h-5" />
                      ) : (
                        <Edit className="w-5 h-5" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Mobile Page Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 flex items-center justify-between z-30 safe-area-bottom">
        <Button
          variant="outline"
          onClick={goToPreviousPage}
          disabled={currentPage <= 1}
          className="h-12 min-h-[48px] px-4"
        >
          <ChevronLeft className="h-5 w-5 mr-1" />
          Prev
        </Button>

        <div className="flex flex-col items-center">
          <span className="text-sm font-medium">
            {currentPage} / {totalPages}
          </span>
          {editMode && fieldsOnPage.length > 0 && (
            <span className="text-xs text-orange-600">
              {fieldsOnPage.length} editable
            </span>
          )}
        </div>

        <Button
          variant="outline"
          onClick={goToNextPage}
          disabled={currentPage >= totalPages}
          className="h-12 min-h-[48px] px-4"
        >
          Next
          <ChevronRight className="h-5 w-5 ml-1" />
        </Button>
      </div>
    </div>
  )
}

export default ReportPreviewHTML

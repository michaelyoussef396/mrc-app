// ReportPreviewHTML Component
// Renders the HTML report with inline edit buttons on Page 1
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
  ExternalLink,
  Pencil,
  Check,
  X,
  Camera,
} from 'lucide-react'

// --- Existing edit overlay fields (Pages 2+) ---

interface EditableField {
  key: string
  label: string
  type: 'text' | 'textarea' | 'image' | 'currency' | 'number'
  page: number
  position: { x: number; y: number }
}

const EDITABLE_FIELDS: EditableField[] = [
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

// --- Page 1 inline edit field definitions ---
// Positions calibrated from the HTML template (794px A4 width)

interface Page1Field {
  key: string
  label: string
  type: 'text' | 'date' | 'select' | 'address' | 'photo'
  /** Where the pencil icon sits */
  btnPos: { x: number; y: number }
  /** Where the editor card appears */
  editorPos: { x: number; y: number }
  width: number
}

const PAGE1_FIELDS: Page1Field[] = [
  { key: 'ordered_by', label: 'Ordered By', type: 'text',
    btnPos: { x: 258, y: 322 }, editorPos: { x: 28, y: 308 }, width: 260 },
  { key: 'inspector', label: 'Inspector', type: 'text',
    btnPos: { x: 258, y: 382 }, editorPos: { x: 28, y: 368 }, width: 260 },
  { key: 'date', label: 'Date', type: 'date',
    btnPos: { x: 258, y: 442 }, editorPos: { x: 28, y: 428 }, width: 260 },
  { key: 'directed_to', label: 'Directed To', type: 'text',
    btnPos: { x: 198, y: 532 }, editorPos: { x: 27, y: 518 }, width: 210 },
  { key: 'property_type', label: 'Property Type', type: 'select',
    btnPos: { x: 198, y: 602 }, editorPos: { x: 27, y: 588 }, width: 210 },
  { key: 'address', label: 'Address', type: 'address',
    btnPos: { x: 690, y: 800 }, editorPos: { x: 310, y: 775 }, width: 380 },
  { key: 'cover_photo', label: 'Photo', type: 'photo',
    btnPos: { x: 718, y: 435 }, editorPos: { x: 718, y: 435 }, width: 0 },
]

const PROPERTY_TYPES = [
  { value: 'house', label: 'House' },
  { value: 'units', label: 'Units' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'duplex', label: 'Duplex' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'construction', label: 'Construction' },
  { value: 'industrial', label: 'Industrial' },
]

// --- Interfaces ---

export interface Page1Data {
  ordered_by: string
  inspector: string
  date: string
  directed_to: string
  property_type: string
  address_street: string
  address_suburb: string
  address_state: string
  address_postcode: string
}

interface ReportPreviewHTMLProps {
  htmlUrl: string
  editMode?: boolean
  onFieldClick?: (field: EditableField) => void
  onLoadSuccess?: () => void
  onLoadError?: (error: string) => void
  // Page 1 inline editing
  page1Data?: Page1Data | null
  onPage1FieldSave?: (key: string, value: string | Record<string, string>) => Promise<void>
  onPage1PhotoChange?: () => void
  photoUploading?: boolean
}

export function ReportPreviewHTML({
  htmlUrl,
  editMode = false,
  onFieldClick,
  onLoadSuccess,
  onLoadError,
  page1Data,
  onPage1FieldSave,
  onPage1PhotoChange,
  photoUploading = false,
}: ReportPreviewHTMLProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [htmlContent, setHtmlContent] = useState<string | null>(null)
  const [zoom, setZoom] = useState(100)
  const [currentPage, setCurrentPage] = useState(1)
  const totalPages = 9
  const pageHeight = 1123

  // Page 1 inline edit state
  const [editingP1, setEditingP1] = useState<string | null>(null)
  const [editP1Value, setEditP1Value] = useState('')
  const [editP1Address, setEditP1Address] = useState({ street: '', suburb: '', state: '', postcode: '' })
  const [savingP1, setSavingP1] = useState(false)

  // Fetch HTML content on mount
  useEffect(() => {
    async function fetchHTML() {
      try {
        setLoading(true)
        setError(null)

        let html: string | null = null

        if (htmlUrl.includes('supabase') && htmlUrl.includes('/storage/')) {
          const pathMatch = htmlUrl.match(/inspection-reports\/(.+)$/)
          if (pathMatch) {
            const storagePath = pathMatch[1]
            const { data, error: downloadError } = await supabase.storage
              .from('inspection-reports')
              .download(storagePath)

            if (downloadError) {
              console.warn('[ReportPreview] Supabase download failed:', downloadError)
            } else if (data) {
              html = await data.text()
            }
          }
        }

        if (!html) {
          const response = await fetch(htmlUrl, { mode: 'cors', credentials: 'omit' })
          if (!response.ok) throw new Error(`Failed to fetch report: ${response.status}`)
          html = await response.text()
        }

        setHtmlContent(html)
        setLoading(false)
        onLoadSuccess?.()
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to load report'
        setError(errorMsg)
        setLoading(false)
        onLoadError?.(errorMsg)
      }
    }

    if (htmlUrl) fetchHTML()
  }, [htmlUrl, onLoadSuccess, onLoadError])

  // Get fields for current page (Pages 2+ edit mode)
  const fieldsOnPage = EDITABLE_FIELDS.filter(f => f.page === currentPage)

  // Zoom controls
  const zoomIn = () => setZoom(prev => Math.min(200, prev + 25))
  const zoomOut = () => setZoom(prev => Math.max(50, prev - 25))

  const scrollToPage = (pageNum: number) => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: (pageNum - 1) * pageHeight * (zoom / 100),
        behavior: 'smooth',
      })
    }
  }

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

  const handlePrint = () => window.open(htmlUrl, '_blank')
  const handleOpenFullView = () => window.open(htmlUrl, '_blank')

  // --- Page 1 inline edit handlers ---

  function startP1Edit(field: Page1Field) {
    if (!page1Data) return

    if (field.type === 'photo') {
      onPage1PhotoChange?.()
      return
    }

    setEditingP1(field.key)

    switch (field.key) {
      case 'ordered_by': setEditP1Value(page1Data.ordered_by); break
      case 'inspector': setEditP1Value(page1Data.inspector); break
      case 'date': setEditP1Value(page1Data.date); break
      case 'directed_to': setEditP1Value(page1Data.directed_to); break
      case 'property_type': setEditP1Value(page1Data.property_type); break
      case 'address':
        setEditP1Address({
          street: page1Data.address_street,
          suburb: page1Data.address_suburb,
          state: page1Data.address_state,
          postcode: page1Data.address_postcode,
        })
        break
    }
  }

  async function saveP1Edit() {
    if (!editingP1 || !onPage1FieldSave) return
    setSavingP1(true)
    try {
      if (editingP1 === 'address') {
        await onPage1FieldSave('address', editP1Address)
      } else {
        await onPage1FieldSave(editingP1, editP1Value)
      }
      setEditingP1(null)
      setEditP1Value('')
    } catch {
      // Keep editing state on error so user can retry
    } finally {
      setSavingP1(false)
    }
  }

  function cancelP1Edit() {
    setEditingP1(null)
    setEditP1Value('')
  }

  // --- Render ---

  return (
    <div className="report-preview-html flex flex-col h-full">
      {/* Toolbar */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPreviousPage} disabled={currentPage <= 1}
            className="h-10 w-10 min-h-[40px] min-w-[40px]">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <span className="text-sm font-medium min-w-[80px] text-center">
            Page {currentPage} of {totalPages}
          </span>
          <Button variant="outline" size="icon" onClick={goToNextPage} disabled={currentPage >= totalPages}
            className="h-10 w-10 min-h-[40px] min-w-[40px]">
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={zoomOut} disabled={zoom <= 50} className="h-10 w-10">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[45px] text-center">{zoom}%</span>
          <Button variant="outline" size="icon" onClick={zoomIn} disabled={zoom >= 200} className="h-10 w-10">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <div className="hidden sm:block w-px h-6 bg-gray-300 mx-2" />
          <Button variant="outline" onClick={handleOpenFullView} className="hidden sm:flex h-10" title="Open full report in new tab">
            <ExternalLink className="h-4 w-4 mr-2" />
            Full View
          </Button>
          <Button variant="outline" onClick={handlePrint} className="hidden sm:flex h-10">
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
              <Button onClick={() => window.location.reload()}>Retry</Button>
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
              {/* Render HTML content */}
              <div
                className="report-content"
                style={{ width: '794px', minHeight: `${pageHeight * totalPages}px` }}
                dangerouslySetInnerHTML={{ __html: htmlContent }}
              />

              {/* Page 1 Inline Edit Overlay - Always visible when page1Data provided */}
              {page1Data && (
                <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 40 }}>
                  {PAGE1_FIELDS.map((field) => {
                    const isEditing = editingP1 === field.key

                    // Photo: camera button
                    if (field.type === 'photo') {
                      return (
                        <button
                          key={field.key}
                          onClick={() => startP1Edit(field)}
                          disabled={photoUploading}
                          className="absolute pointer-events-auto w-10 h-10 min-w-[40px] min-h-[40px] rounded-full bg-orange-600 text-white shadow-lg flex items-center justify-center hover:bg-orange-700 hover:scale-110 transition-all"
                          style={{ left: field.btnPos.x, top: field.btnPos.y }}
                          title="Change photo"
                        >
                          {photoUploading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <Camera className="w-5 h-5" />
                          )}
                        </button>
                      )
                    }

                    // Editing: inline editor card
                    if (isEditing) {
                      return (
                        <div
                          key={field.key}
                          className="absolute pointer-events-auto bg-white rounded-lg shadow-xl border border-gray-200 p-3"
                          style={{ left: field.editorPos.x, top: field.editorPos.y, width: field.width }}
                        >
                          <div className="text-xs text-gray-500 mb-1.5 font-semibold uppercase tracking-wide">
                            {field.label}
                          </div>

                          {field.type === 'address' ? (
                            <div className="space-y-1.5">
                              <input
                                value={editP1Address.street}
                                onChange={(e) => setEditP1Address(prev => ({ ...prev, street: e.target.value }))}
                                placeholder="Street"
                                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                autoFocus
                              />
                              <input
                                value={editP1Address.suburb}
                                onChange={(e) => setEditP1Address(prev => ({ ...prev, suburb: e.target.value }))}
                                placeholder="Suburb"
                                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                              />
                              <div className="flex gap-1.5">
                                <input
                                  value={editP1Address.state}
                                  onChange={(e) => setEditP1Address(prev => ({ ...prev, state: e.target.value }))}
                                  placeholder="State"
                                  className="w-1/2 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                />
                                <input
                                  value={editP1Address.postcode}
                                  onChange={(e) => setEditP1Address(prev => ({ ...prev, postcode: e.target.value }))}
                                  placeholder="Postcode"
                                  className="w-1/2 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                />
                              </div>
                            </div>
                          ) : field.type === 'select' ? (
                            <select
                              value={editP1Value}
                              onChange={(e) => setEditP1Value(e.target.value)}
                              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                              autoFocus
                            >
                              <option value="">Select...</option>
                              {PROPERTY_TYPES.map(t => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type={field.type === 'date' ? 'date' : 'text'}
                              value={editP1Value}
                              onChange={(e) => setEditP1Value(e.target.value)}
                              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                              autoFocus
                            />
                          )}

                          <div className="flex justify-end gap-1.5 mt-2">
                            <button
                              onClick={cancelP1Edit}
                              disabled={savingP1}
                              className="flex items-center gap-1 px-2.5 py-1 rounded text-sm text-gray-600 hover:bg-gray-100 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                              Cancel
                            </button>
                            <button
                              onClick={saveP1Edit}
                              disabled={savingP1}
                              className="flex items-center gap-1 px-2.5 py-1 rounded text-sm text-white bg-green-600 hover:bg-green-700 transition-colors"
                            >
                              {savingP1 ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Check className="w-3.5 h-3.5" />
                              )}
                              Save
                            </button>
                          </div>
                        </div>
                      )
                    }

                    // Default: pencil edit button
                    return (
                      <button
                        key={field.key}
                        onClick={() => startP1Edit(field)}
                        className="absolute pointer-events-auto w-10 h-10 min-w-[40px] min-h-[40px] rounded-full bg-orange-600 text-white shadow-lg flex items-center justify-center hover:bg-orange-700 hover:scale-110 transition-all animate-pulse"
                        style={{ left: field.btnPos.x, top: field.btnPos.y }}
                        title={`Edit ${field.label}`}
                      >
                        <Pencil className="w-5 h-5" />
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Edit Overlay for Pages 2+ - Positioned buttons (existing system) */}
              {editMode && (
                <div className="absolute inset-0 pointer-events-none">
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
        <Button variant="outline" onClick={goToPreviousPage} disabled={currentPage <= 1}
          className="h-12 min-h-[48px] px-4">
          <ChevronLeft className="h-5 w-5 mr-1" />
          Prev
        </Button>
        <div className="flex flex-col items-center">
          <span className="text-sm font-medium">{currentPage} / {totalPages}</span>
          {editMode && fieldsOnPage.length > 0 && (
            <span className="text-xs text-orange-600">{fieldsOnPage.length} editable</span>
          )}
        </div>
        <Button variant="outline" onClick={goToNextPage} disabled={currentPage >= totalPages}
          className="h-12 min-h-[48px] px-4">
          Next
          <ChevronRight className="h-5 w-5 ml-1" />
        </Button>
      </div>
    </div>
  )
}

export default ReportPreviewHTML

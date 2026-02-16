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

// EDITABLE_FIELDS disabled — page numbers were wrong for dynamically-generated reports.
// Will be re-implemented with DOM-based positioning when outdoor/cleaning estimate editing is needed.
const EDITABLE_FIELDS: EditableField[] = []

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

// --- VP edit button positions are computed from the DOM after HTML renders ---
// The edge function generates VP pages with flow-based layout, so fixed positions don't work.

interface VPDynPos {
  key: string
  label: string
  top: number // absolute y-position in the document (from DOM measurement)
}

/** Walk the offsetParent chain to get an element's position relative to a container */
function getPositionInContainer(el: HTMLElement, container: HTMLElement): { top: number; left: number } {
  let top = 0
  let left = 0
  let current: HTMLElement | null = el
  while (current && current !== container) {
    top += current.offsetTop
    left += current.offsetLeft
    current = current.offsetParent as HTMLElement | null
  }
  return { top, left }
}

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

export interface VPData {
  what_we_found: string
  what_we_will_do: string
}

export interface OutdoorData {
  outdoor_temperature: number
  outdoor_humidity: number
  outdoor_dew_point: number
}

export interface AreaRecord {
  id: string
  area_name: string
  temperature: number
  humidity: number
  dew_point: number
  external_moisture: number
  internal_moisture: number
  mould_visible_locations: string[] | null
  comments: string | null
  extra_notes: string | null
}

export interface SubfloorEditData {
  observations: string
  landscape: string
  comments: string
  readings: Array<{ id: string; location: string; moisture_percentage: number; reading_order: number }>
}

export interface CostData {
  labor_cost_ex_gst: number
  equipment_cost_ex_gst: number
  subtotal_ex_gst: number
  gst_amount: number
  total_inc_gst: number
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
  // Value Proposition (Page 4) inline editing
  vpData?: VPData | null
  onVPFieldSave?: (key: string, value: string) => Promise<void>
  // Problem Analysis — single field for entire section
  paContent?: string | null
  onPASave?: (value: string) => Promise<void>
  // Demolition — single field for entire section
  demoContent?: string | null
  onDemoSave?: (value: string) => Promise<void>
  // Outdoor Environment — 3 number fields
  outdoorData?: OutdoorData | null
  onOutdoorFieldSave?: (key: string, value: number) => Promise<void>
  // Subfloor — text/dropdown/number fields
  subfloorData?: SubfloorEditData | null
  onSubfloorFieldSave?: (field: string, value: string) => Promise<void>
  onSubfloorReadingSave?: (readingId: string, moisturePercentage: number, location: string) => Promise<void>
  // Cleaning Estimate — 5 cost fields
  costData?: CostData | null
  onCostSave?: (costs: CostData) => Promise<void>
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
  vpData,
  onVPFieldSave,
  paContent,
  onPASave,
  demoContent,
  onDemoSave,
  outdoorData,
  onOutdoorFieldSave,
  subfloorData,
  onSubfloorFieldSave,
  onSubfloorReadingSave,
  costData,
  onCostSave,
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

  // Value Proposition (Page 4) inline edit state
  const [editingVP, setEditingVP] = useState<string | null>(null)
  const [editVPValue, setEditVPValue] = useState('')
  const [savingVP, setSavingVP] = useState(false)

  // VP heading positions computed from DOM
  const [vpPositions, setVpPositions] = useState<VPDynPos[]>([])

  // Problem Analysis — single edit for entire section
  const [editingPA, setEditingPA] = useState(false)
  const [editPAValue, setEditPAValue] = useState('')
  const [savingPA, setSavingPA] = useState(false)
  const [paPageTop, setPaPageTop] = useState<number | null>(null)

  // Demolition — single edit for entire section
  const [editingDemo, setEditingDemo] = useState(false)
  const [editDemoValue, setEditDemoValue] = useState('')
  const [savingDemo, setSavingDemo] = useState(false)
  const [demoPageTop, setDemoPageTop] = useState<number | null>(null)

  // Outdoor Environment — 3 number fields
  const [editingOutdoor, setEditingOutdoor] = useState<string | null>(null)
  const [editOutdoorValue, setEditOutdoorValue] = useState('')
  const [savingOutdoor, setSavingOutdoor] = useState(false)
  const [outdoorPositions, setOutdoorPositions] = useState<VPDynPos[]>([])

  // Subfloor — inline edit state for observation, landscape, comments, moisture
  const [editingSubfloor, setEditingSubfloor] = useState<string | null>(null)
  const [editSubfloorValue, setEditSubfloorValue] = useState('')
  const [editSubfloorReadings, setEditSubfloorReadings] = useState<Array<{ id: string; location: string; moisture_percentage: number }>>([])
  const [savingSubfloor, setSavingSubfloor] = useState(false)
  const [subfloorPositions, setSubfloorPositions] = useState<VPDynPos[]>([])

  // Cleaning Estimate — cost editing state
  const [editingCost, setEditingCost] = useState(false)
  const [costForm, setCostForm] = useState<CostData>({ labor_cost_ex_gst: 0, equipment_cost_ex_gst: 0, subtotal_ex_gst: 0, gst_amount: 0, total_inc_gst: 0 })
  const [savingCost, setSavingCost] = useState(false)
  const [costPageTop, setCostPageTop] = useState<number | null>(null)

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

  // Find VP and PA headings in rendered DOM and compute their absolute positions
  useEffect(() => {
    if (!htmlContent || !contentRef.current) {
      setVpPositions([])
      setPaPageTop(null)
      setDemoPageTop(null)
      return
    }

    let cancelled = false

    function findHeadings(attempt: number) {
      const container = contentRef.current
      if (!container || cancelled) return

      // --- VP headings: <div> elements with Garet Heavy ~33px font ---
      const VP_HEADINGS = [
        { text: 'WHAT WE FOUND', key: 'what_we_found', label: 'What We Found' },
        { text: "WHAT WE'RE GOING TO DO", key: 'what_we_will_do', label: "What We're Going To Do" },
      ]

      const vpFound: VPDynPos[] = []
      const divs = container.querySelectorAll('div')

      for (const h of VP_HEADINGS) {
        for (const div of Array.from(divs)) {
          const text = div.textContent?.trim()
          if (!text) continue
          const normalized = text.toUpperCase().replace(/[\u2018\u2019\u2032]/g, "'")
          if (normalized !== h.text) continue
          const style = window.getComputedStyle(div)
          const fontSize = parseFloat(style.fontSize)
          if (fontSize < 18) continue

          const pos = getPositionInContainer(div as HTMLElement, container)
          vpFound.push({ key: h.key, label: h.label, top: pos.top })
          break
        }
      }

      setVpPositions(vpFound)

      // --- PA: find the "PROBLEM" title div to position a single edit button ---
      let foundPaTop: number | null = null
      const allDivs = container.querySelectorAll('div')
      for (const div of Array.from(allDivs)) {
        const text = div.textContent?.trim().toUpperCase() || ''
        if (!text.startsWith('PROBLEM')) continue
        const style = window.getComputedStyle(div)
        const fontSize = parseFloat(style.fontSize)
        if (fontSize < 30) continue // "PROBLEM" title uses ~56px font
        const pos = getPositionInContainer(div as HTMLElement, container)
        foundPaTop = pos.top
        break
      }

      setPaPageTop(foundPaTop)

      // --- Demolition: find the "DEMOLITION" title div (56px font, same pattern as PA) ---
      let foundDemoTop: number | null = null
      for (const div of Array.from(allDivs)) {
        const text = div.textContent?.trim().toUpperCase() || ''
        if (text !== 'DEMOLITION') continue
        const style = window.getComputedStyle(div)
        const fontSize = parseFloat(style.fontSize)
        if (fontSize < 30) continue
        const pos = getPositionInContainer(div as HTMLElement, container)
        foundDemoTop = pos.top
        break
      }

      setDemoPageTop(foundDemoTop)

      // --- Outdoor: find 3 label divs (23px Garet Heavy) for temperature, humidity, dew point ---
      const OUTDOOR_LABELS = [
        { search: 'OUTDOORTEMPERATURE', key: 'outdoor_temperature', label: 'Temperature' },
        { search: 'OUTDOORHUMIDITY', key: 'outdoor_humidity', label: 'Humidity' },
        { search: 'OUTDOORDEWPOINT', key: 'outdoor_dew_point', label: 'Dew Point' },
      ]

      const outdoorFound: VPDynPos[] = []
      for (const lbl of OUTDOOR_LABELS) {
        for (const div of Array.from(allDivs)) {
          const text = div.textContent?.trim().toUpperCase().replace(/\s+/g, '') || ''
          if (text !== lbl.search) continue
          const style = window.getComputedStyle(div)
          const fontSize = parseFloat(style.fontSize)
          if (fontSize < 20 || fontSize > 30) continue
          const pos = getPositionInContainer(div as HTMLElement, container)
          outdoorFound.push({ key: lbl.key, label: lbl.label, top: pos.top })
          break
        }
      }

      setOutdoorPositions(outdoorFound)

      // --- Subfloor: find section headings on the navy panel (16px Garet Heavy, white text) ---
      const SUBFLOOR_LABELS = [
        { search: 'SUBFLOOROBSERVATION', key: 'observations', label: 'Observation' },
        { search: 'SUBFLOORLANDSCAPE', key: 'landscape', label: 'Landscape' },
        { search: 'SUBFLOORCOMMENTS', key: 'comments', label: 'Comments' },
        { search: 'MOISTURELEVELS', key: 'moisture', label: 'Moisture Levels' },
      ]

      const subfloorFound: VPDynPos[] = []
      for (const lbl of SUBFLOOR_LABELS) {
        for (const div of Array.from(allDivs)) {
          const text = div.textContent?.trim().toUpperCase().replace(/\s+/g, '') || ''
          if (text !== lbl.search) continue
          const style = window.getComputedStyle(div)
          const fontSize = parseFloat(style.fontSize)
          if (fontSize < 12 || fontSize > 22) continue
          const pos = getPositionInContainer(div as HTMLElement, container)
          subfloorFound.push({ key: lbl.key, label: lbl.label, top: pos.top })
          break
        }
      }

      setSubfloorPositions(subfloorFound)

      // --- Cleaning Estimate: find "CLEANING ESTIMATE" title (40px Garet Heavy, blue text) ---
      let foundCostTop: number | null = null
      for (const div of Array.from(allDivs)) {
        const text = div.textContent?.trim().toUpperCase() || ''
        if (text !== 'CLEANING ESTIMATE') continue
        const style = window.getComputedStyle(div)
        const fontSize = parseFloat(style.fontSize)
        if (fontSize < 30) continue
        const pos = getPositionInContainer(div as HTMLElement, container)
        foundCostTop = pos.top
        break
      }

      setCostPageTop(foundCostTop)

      console.log(`[ReportPreview] Heading search (attempt ${attempt}): VP=${vpFound.length}, PA=${foundPaTop !== null ? 'found' : 'not found'}, Demo=${foundDemoTop !== null ? 'found' : 'not found'}, Outdoor=${outdoorFound.length}, Subfloor=${subfloorFound.length}, Cost=${foundCostTop !== null ? 'found' : 'not found'}`)

      // Retry if headings not found (timing/render issue)
      if ((vpFound.length === 0 || foundPaTop === null || foundDemoTop === null || outdoorFound.length < 3) && attempt < 3 && !cancelled) {
        setTimeout(() => findHeadings(attempt + 1), 800)
      }
    }

    // Initial search after DOM paint
    const timer = setTimeout(() => findHeadings(1), 400)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [htmlContent])

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

  // --- Value Proposition (Page 4) inline edit handlers ---

  function startVPEdit(key: string) {
    if (!vpData) return
    setEditingVP(key)
    if (key === 'what_we_found') {
      setEditVPValue(vpData.what_we_found)
    } else if (key === 'what_we_will_do') {
      setEditVPValue(vpData.what_we_will_do)
    }
  }

  async function saveVPEdit() {
    if (!editingVP || !onVPFieldSave) return
    setSavingVP(true)
    try {
      await onVPFieldSave(editingVP, editVPValue)
      setEditingVP(null)
      setEditVPValue('')
    } catch {
      // Keep editing state on error so user can retry
    } finally {
      setSavingVP(false)
    }
  }

  function cancelVPEdit() {
    setEditingVP(null)
    setEditVPValue('')
  }

  // --- Problem Analysis inline edit handlers (single field) ---

  function startPAEdit() {
    setEditingPA(true)
    setEditPAValue(paContent || '')
  }

  async function savePAEdit() {
    if (!editingPA || !onPASave) return
    setSavingPA(true)
    try {
      await onPASave(editPAValue)
      setEditingPA(false)
      setEditPAValue('')
    } catch {
      // Keep editing state on error so user can retry
    } finally {
      setSavingPA(false)
    }
  }

  function cancelPAEdit() {
    setEditingPA(false)
    setEditPAValue('')
  }

  // --- Demolition inline edit handlers (single field) ---

  function startDemoEdit() {
    setEditingDemo(true)
    setEditDemoValue(demoContent || '')
  }

  async function saveDemoEdit() {
    if (!editingDemo || !onDemoSave) return
    setSavingDemo(true)
    try {
      await onDemoSave(editDemoValue)
      setEditingDemo(false)
      setEditDemoValue('')
    } catch {
      // Keep editing state on error so user can retry
    } finally {
      setSavingDemo(false)
    }
  }

  function cancelDemoEdit() {
    setEditingDemo(false)
    setEditDemoValue('')
  }

  // --- Outdoor Environment inline edit handlers (3 number fields) ---

  function startOutdoorEdit(key: string) {
    if (!outdoorData) return
    setEditingOutdoor(key)
    const value = outdoorData[key as keyof OutdoorData]
    setEditOutdoorValue(String(value ?? ''))
  }

  async function saveOutdoorEdit() {
    if (!editingOutdoor || !onOutdoorFieldSave) return
    setSavingOutdoor(true)
    try {
      await onOutdoorFieldSave(editingOutdoor, parseFloat(editOutdoorValue) || 0)
      setEditingOutdoor(null)
      setEditOutdoorValue('')
    } catch {
      // Keep editing state on error so user can retry
    } finally {
      setSavingOutdoor(false)
    }
  }

  function cancelOutdoorEdit() {
    setEditingOutdoor(null)
    setEditOutdoorValue('')
  }

  // --- Subfloor inline edit handlers ---

  function startSubfloorEdit(key: string) {
    if (!subfloorData) return
    setEditingSubfloor(key)
    if (key === 'observations') {
      setEditSubfloorValue(subfloorData.observations || '')
    } else if (key === 'landscape') {
      setEditSubfloorValue(subfloorData.landscape || '')
    } else if (key === 'comments') {
      setEditSubfloorValue(subfloorData.comments || '')
    } else if (key === 'moisture') {
      setEditSubfloorReadings(
        subfloorData.readings.map(r => ({ id: r.id, location: r.location, moisture_percentage: r.moisture_percentage }))
      )
    }
  }

  async function saveSubfloorEdit() {
    if (!editingSubfloor) return
    setSavingSubfloor(true)
    try {
      if (editingSubfloor === 'moisture') {
        // Save each reading
        if (onSubfloorReadingSave) {
          for (const r of editSubfloorReadings) {
            await onSubfloorReadingSave(r.id, r.moisture_percentage, r.location)
          }
        }
      } else if (onSubfloorFieldSave) {
        await onSubfloorFieldSave(editingSubfloor, editSubfloorValue)
      }
      setEditingSubfloor(null)
      setEditSubfloorValue('')
      setEditSubfloorReadings([])
    } catch {
      // Keep editing state on error so user can retry
    } finally {
      setSavingSubfloor(false)
    }
  }

  function cancelSubfloorEdit() {
    setEditingSubfloor(null)
    setEditSubfloorValue('')
    setEditSubfloorReadings([])
  }

  // --- Cleaning Estimate cost edit handlers ---

  function startCostEdit() {
    if (!costData) return
    setEditingCost(true)
    setCostForm({ ...costData })
  }

  function updateCostField(field: keyof CostData, value: number) {
    setCostForm(prev => {
      const next = { ...prev, [field]: value }
      // Auto-recalculate derived fields when labor or equipment changes
      if (field === 'labor_cost_ex_gst' || field === 'equipment_cost_ex_gst') {
        next.subtotal_ex_gst = Math.round((next.labor_cost_ex_gst + next.equipment_cost_ex_gst) * 100) / 100
        next.gst_amount = Math.round(next.subtotal_ex_gst * 0.1 * 100) / 100
        next.total_inc_gst = Math.round((next.subtotal_ex_gst + next.gst_amount) * 100) / 100
      }
      return next
    })
  }

  async function saveCostEdit() {
    if (!editingCost || !onCostSave) return
    setSavingCost(true)
    try {
      await onCostSave(costForm)
      setEditingCost(false)
    } catch {
      // Keep editing state on error
    } finally {
      setSavingCost(false)
    }
  }

  function cancelCostEdit() {
    setEditingCost(false)
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

              {/* Value Proposition Inline Edit Overlay — dynamically positioned from DOM */}
              {vpData && vpPositions.length > 0 && (
                <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 41 }}>
                  {vpPositions.map((vp) => {
                    const isEditing = editingVP === vp.key

                    if (isEditing) {
                      return (
                        <div
                          key={vp.key}
                          className="absolute pointer-events-auto bg-white rounded-lg shadow-xl border-2 border-orange-400 p-4"
                          style={{ left: 30, top: vp.top - 5, width: 725 }}
                        >
                          <div className="text-xs text-gray-500 mb-2 font-semibold uppercase tracking-wide">
                            {vp.label}
                          </div>
                          <textarea
                            value={editVPValue}
                            onChange={(e) => setEditVPValue(e.target.value)}
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-vertical"
                            style={{ minHeight: '180px' }}
                            autoFocus
                          />
                          <div className="flex justify-end gap-2 mt-2">
                            <button
                              onClick={cancelVPEdit}
                              disabled={savingVP}
                              className="flex items-center gap-1 px-3 py-1.5 rounded text-sm text-gray-600 hover:bg-gray-100 transition-colors min-h-[36px]"
                            >
                              <X className="w-4 h-4" />
                              Cancel
                            </button>
                            <button
                              onClick={saveVPEdit}
                              disabled={savingVP}
                              className="flex items-center gap-1 px-3 py-1.5 rounded text-sm text-white bg-orange-600 hover:bg-orange-700 transition-colors min-h-[36px]"
                            >
                              {savingVP ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Check className="w-4 h-4" />
                              )}
                              Save
                            </button>
                          </div>
                        </div>
                      )
                    }

                    return (
                      <button
                        key={vp.key}
                        onClick={() => startVPEdit(vp.key)}
                        className="absolute pointer-events-auto w-10 h-10 min-w-[40px] min-h-[40px] rounded-full bg-orange-600 text-white shadow-lg flex items-center justify-center hover:bg-orange-700 hover:scale-110 transition-all animate-pulse"
                        style={{ left: 740, top: vp.top }}
                        title={`Edit ${vp.label}`}
                      >
                        <Pencil className="w-5 h-5" />
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Problem Analysis Inline Edit Overlay — single button for entire section */}
              {paContent !== undefined && paPageTop !== null && (
                <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 42 }}>
                  {editingPA ? (
                    <div
                      className="absolute pointer-events-auto bg-white rounded-lg shadow-xl border-2 border-orange-400 p-4"
                      style={{ left: 30, top: paPageTop - 5, width: 734 }}
                    >
                      <div className="text-xs text-gray-500 mb-2 font-semibold uppercase tracking-wide">
                        Problem Analysis &amp; Recommendations
                      </div>
                      <textarea
                        value={editPAValue}
                        onChange={(e) => setEditPAValue(e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-vertical"
                        style={{ minHeight: '320px' }}
                        autoFocus
                      />
                      <div className="flex justify-end gap-2 mt-2">
                        <button
                          onClick={cancelPAEdit}
                          disabled={savingPA}
                          className="flex items-center gap-1 px-3 py-1.5 rounded text-sm text-gray-600 hover:bg-gray-100 transition-colors min-h-[36px]"
                        >
                          <X className="w-4 h-4" />
                          Cancel
                        </button>
                        <button
                          onClick={savePAEdit}
                          disabled={savingPA}
                          className="flex items-center gap-1 px-3 py-1.5 rounded text-sm text-white bg-orange-600 hover:bg-orange-700 transition-colors min-h-[36px]"
                        >
                          {savingPA ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={startPAEdit}
                      className="absolute pointer-events-auto w-10 h-10 min-w-[40px] min-h-[40px] rounded-full bg-orange-600 text-white shadow-lg flex items-center justify-center hover:bg-orange-700 hover:scale-110 transition-all animate-pulse"
                      style={{ left: 740, top: paPageTop }}
                      title="Edit Problem Analysis"
                    >
                      <Pencil className="w-5 h-5" />
                    </button>
                  )}
                </div>
              )}

              {/* Demolition Inline Edit Overlay — single button for entire section */}
              {demoContent !== undefined && demoPageTop !== null && (
                <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 43 }}>
                  {editingDemo ? (
                    <div
                      className="absolute pointer-events-auto bg-white rounded-lg shadow-xl border-2 border-orange-400 p-4"
                      style={{ left: 30, top: demoPageTop - 5, width: 734 }}
                    >
                      <div className="text-xs text-gray-500 mb-2 font-semibold uppercase tracking-wide">
                        Demolition
                      </div>
                      <textarea
                        value={editDemoValue}
                        onChange={(e) => setEditDemoValue(e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-vertical"
                        style={{ minHeight: '320px' }}
                        autoFocus
                      />
                      <div className="flex justify-end gap-2 mt-2">
                        <button
                          onClick={cancelDemoEdit}
                          disabled={savingDemo}
                          className="flex items-center gap-1 px-3 py-1.5 rounded text-sm text-gray-600 hover:bg-gray-100 transition-colors min-h-[36px]"
                        >
                          <X className="w-4 h-4" />
                          Cancel
                        </button>
                        <button
                          onClick={saveDemoEdit}
                          disabled={savingDemo}
                          className="flex items-center gap-1 px-3 py-1.5 rounded text-sm text-white bg-orange-600 hover:bg-orange-700 transition-colors min-h-[36px]"
                        >
                          {savingDemo ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={startDemoEdit}
                      className="absolute pointer-events-auto w-10 h-10 min-w-[40px] min-h-[40px] rounded-full bg-orange-600 text-white shadow-lg flex items-center justify-center hover:bg-orange-700 hover:scale-110 transition-all animate-pulse"
                      style={{ left: 740, top: demoPageTop }}
                      title="Edit Demolition"
                    >
                      <Pencil className="w-5 h-5" />
                    </button>
                  )}
                </div>
              )}

              {/* Outdoor Environment Inline Edit Overlay — 3 number fields */}
              {outdoorData && outdoorPositions.length > 0 && (
                <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 44 }}>
                  {outdoorPositions.map((od) => {
                    const isEditing = editingOutdoor === od.key

                    if (isEditing) {
                      return (
                        <div
                          key={od.key}
                          className="absolute pointer-events-auto bg-white rounded-lg shadow-xl border-2 border-orange-400 p-3"
                          style={{ left: 30, top: od.top - 5, width: 280 }}
                        >
                          <div className="text-xs text-gray-500 mb-1.5 font-semibold uppercase tracking-wide">
                            {od.label}
                          </div>
                          <input
                            type="number"
                            value={editOutdoorValue}
                            onChange={(e) => setEditOutdoorValue(e.target.value)}
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            autoFocus
                          />
                          <div className="flex justify-end gap-2 mt-2">
                            <button
                              onClick={cancelOutdoorEdit}
                              disabled={savingOutdoor}
                              className="flex items-center gap-1 px-3 py-1.5 rounded text-sm text-gray-600 hover:bg-gray-100 transition-colors min-h-[36px]"
                            >
                              <X className="w-4 h-4" />
                              Cancel
                            </button>
                            <button
                              onClick={saveOutdoorEdit}
                              disabled={savingOutdoor}
                              className="flex items-center gap-1 px-3 py-1.5 rounded text-sm text-white bg-orange-600 hover:bg-orange-700 transition-colors min-h-[36px]"
                            >
                              {savingOutdoor ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Check className="w-4 h-4" />
                              )}
                              Save
                            </button>
                          </div>
                        </div>
                      )
                    }

                    return (
                      <button
                        key={od.key}
                        onClick={() => startOutdoorEdit(od.key)}
                        className="absolute pointer-events-auto w-10 h-10 min-w-[40px] min-h-[40px] rounded-full bg-orange-600 text-white shadow-lg flex items-center justify-center hover:bg-orange-700 hover:scale-110 transition-all animate-pulse"
                        style={{ left: 220, top: od.top }}
                        title={`Edit ${od.label}`}
                      >
                        <Pencil className="w-5 h-5" />
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Subfloor Inline Edit Overlay — 4 section fields */}
              {subfloorData && subfloorPositions.length > 0 && (
                <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 45 }}>
                  {subfloorPositions.map((sf) => {
                    const isEditing = editingSubfloor === sf.key

                    if (isEditing) {
                      // Editing: show inline editor card
                      const isTextarea = sf.key === 'observations' || sf.key === 'comments'
                      const isDropdown = sf.key === 'landscape'
                      const isMoisture = sf.key === 'moisture'

                      return (
                        <div
                          key={sf.key}
                          className="absolute pointer-events-auto bg-white rounded-lg shadow-xl border-2 border-orange-400 p-3"
                          style={{ left: 30, top: sf.top - 5, width: isMoisture ? 400 : 500 }}
                        >
                          <div className="text-xs text-gray-500 mb-1.5 font-semibold uppercase tracking-wide">
                            {sf.label}
                          </div>

                          {isTextarea && (
                            <textarea
                              value={editSubfloorValue}
                              onChange={(e) => setEditSubfloorValue(e.target.value)}
                              className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-vertical"
                              style={{ minHeight: '200px' }}
                              autoFocus
                            />
                          )}

                          {isDropdown && (
                            <select
                              value={editSubfloorValue}
                              onChange={(e) => setEditSubfloorValue(e.target.value)}
                              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent min-h-[44px]"
                              autoFocus
                            >
                              <option value="">Select...</option>
                              <option value="sloping_block">Sloping Block</option>
                              <option value="flat_block">Flat</option>
                            </select>
                          )}

                          {isMoisture && (
                            <div className="space-y-2">
                              {editSubfloorReadings.map((reading, idx) => (
                                <div key={reading.id} className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={reading.location}
                                    onChange={(e) => {
                                      const next = [...editSubfloorReadings]
                                      next[idx] = { ...next[idx], location: e.target.value }
                                      setEditSubfloorReadings(next)
                                    }}
                                    className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    placeholder="Location"
                                  />
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    value={reading.moisture_percentage}
                                    onChange={(e) => {
                                      const next = [...editSubfloorReadings]
                                      next[idx] = { ...next[idx], moisture_percentage: parseFloat(e.target.value) || 0 }
                                      setEditSubfloorReadings(next)
                                    }}
                                    className="w-20 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    autoFocus={idx === 0}
                                  />
                                  <span className="text-sm text-gray-500">%</span>
                                </div>
                              ))}
                              {editSubfloorReadings.length === 0 && (
                                <p className="text-sm text-gray-400 italic">No moisture readings recorded.</p>
                              )}
                            </div>
                          )}

                          <div className="flex justify-end gap-2 mt-2">
                            <button
                              onClick={cancelSubfloorEdit}
                              disabled={savingSubfloor}
                              className="flex items-center gap-1 px-3 py-1.5 rounded text-sm text-gray-600 hover:bg-gray-100 transition-colors min-h-[36px]"
                            >
                              <X className="w-4 h-4" />
                              Cancel
                            </button>
                            <button
                              onClick={saveSubfloorEdit}
                              disabled={savingSubfloor}
                              className="flex items-center gap-1 px-3 py-1.5 rounded text-sm text-white bg-orange-600 hover:bg-orange-700 transition-colors min-h-[36px]"
                            >
                              {savingSubfloor ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Check className="w-4 h-4" />
                              )}
                              Save
                            </button>
                          </div>
                        </div>
                      )
                    }

                    // Not editing: show pencil button next to heading
                    return (
                      <button
                        key={sf.key}
                        onClick={() => startSubfloorEdit(sf.key)}
                        className="absolute pointer-events-auto w-10 h-10 min-w-[40px] min-h-[40px] rounded-full bg-orange-600 text-white shadow-lg flex items-center justify-center hover:bg-orange-700 hover:scale-110 transition-all animate-pulse"
                        style={{ left: 760, top: sf.top }}
                        title={`Edit ${sf.label}`}
                      >
                        <Pencil className="w-5 h-5" />
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Cleaning Estimate Inline Edit Overlay — 5 cost fields */}
              {costData && costPageTop !== null && (
                <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 46 }}>
                  {editingCost ? (
                    <div
                      className="absolute pointer-events-auto bg-white rounded-lg shadow-xl border-2 border-orange-400 p-4"
                      style={{ left: 30, top: costPageTop - 5, width: 440 }}
                    >
                      <div className="text-xs text-gray-500 mb-3 font-semibold uppercase tracking-wide">
                        Cleaning Estimate Costs
                      </div>

                      <div className="space-y-2.5">
                        <div className="flex items-center gap-3">
                          <label className="text-sm text-gray-600 w-36 shrink-0">Labour (ex GST)</label>
                          <div className="flex items-center gap-1 flex-1">
                            <span className="text-sm text-gray-400">$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={costForm.labor_cost_ex_gst}
                              onChange={(e) => updateCostField('labor_cost_ex_gst', parseFloat(e.target.value) || 0)}
                              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                              autoFocus
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <label className="text-sm text-gray-600 w-36 shrink-0">Equipment (ex GST)</label>
                          <div className="flex items-center gap-1 flex-1">
                            <span className="text-sm text-gray-400">$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={costForm.equipment_cost_ex_gst}
                              onChange={(e) => updateCostField('equipment_cost_ex_gst', parseFloat(e.target.value) || 0)}
                              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            />
                          </div>
                        </div>

                        <div className="border-t border-gray-200 pt-2 space-y-1.5">
                          <div className="flex items-center gap-3">
                            <label className="text-sm text-gray-500 w-36 shrink-0">Subtotal (ex GST)</label>
                            <span className="text-sm font-medium">${costForm.subtotal_ex_gst.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <label className="text-sm text-gray-500 w-36 shrink-0">GST (10%)</label>
                            <span className="text-sm font-medium">${costForm.gst_amount.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <label className="text-sm text-gray-700 font-semibold w-36 shrink-0">Total (inc GST)</label>
                            <span className="text-sm font-bold text-orange-700">${costForm.total_inc_gst.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 mt-3">
                        <button
                          onClick={cancelCostEdit}
                          disabled={savingCost}
                          className="flex items-center gap-1 px-3 py-1.5 rounded text-sm text-gray-600 hover:bg-gray-100 transition-colors min-h-[36px]"
                        >
                          <X className="w-4 h-4" />
                          Cancel
                        </button>
                        <button
                          onClick={saveCostEdit}
                          disabled={savingCost}
                          className="flex items-center gap-1 px-3 py-1.5 rounded text-sm text-white bg-orange-600 hover:bg-orange-700 transition-colors min-h-[36px]"
                        >
                          {savingCost ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={startCostEdit}
                      className="absolute pointer-events-auto w-10 h-10 min-w-[40px] min-h-[40px] rounded-full bg-orange-600 text-white shadow-lg flex items-center justify-center hover:bg-orange-700 hover:scale-110 transition-all animate-pulse"
                      style={{ left: 740, top: costPageTop }}
                      title="Edit Cleaning Estimate Costs"
                    >
                      <Pencil className="w-5 h-5" />
                    </button>
                  )}
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

// ViewReportPDF Page
// View, edit, and approve inspection PDF reports
// Mobile-first design with 48px touch targets
// Page 1: inline edit buttons next to each field on the PDF
// Pages 2+: toggle edit mode for overlay buttons

import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { ReportPreviewHTML } from '@/components/pdf/ReportPreviewHTML'
import type { Page1Data, VPData, OutdoorData, AreaRecord } from '@/components/pdf/ReportPreviewHTML'
import { EditFieldModal } from '@/components/pdf/EditFieldModal'
import { ImageUploadModal } from '@/components/pdf/ImageUploadModal'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Download,
  CheckCircle,
  Edit,
  RefreshCw,
  History,
  Loader2,
  AlertCircle,
  Send,
  Eye,
  Upload,
  Check,
  Plus,
  Camera,
  Trash2,
} from 'lucide-react'
import {
  generateInspectionPDF,
  approvePDF,
  getPDFVersionHistory,
  updateFieldAndRegenerate
} from '@/lib/api/pdfGeneration'
import { sendEmail, sendSlackNotification, buildReportApprovedHtml } from '@/lib/api/notifications'
import { uploadInspectionPhoto, deleteInspectionPhoto, loadInspectionPhotos, getPhotoSignedUrl } from '@/lib/utils/photoUpload'
import { resizePhoto } from '@/lib/offline/photoResizer'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

interface Inspection {
  id: string
  job_number: string
  pdf_url: string | null
  pdf_version: number
  pdf_approved: boolean
  pdf_approved_at: string | null
  pdf_generated_at: string | null
  lead_id?: string
  // Page 1 fields
  requested_by?: string
  attention_to?: string
  inspection_date?: string
  inspector_name?: string
  dwelling_type?: string
  // Value Proposition fields
  what_we_found_text?: string
  what_we_will_do_text?: string
  what_you_get_text?: string
  // Problem Analysis fields
  problem_analysis_content?: string
  what_we_discovered?: string
  identified_causes?: string
  why_this_happened?: string
  // Demolition field
  demolition_content?: string
  // Editable fields (Pages 2+)
  ai_summary_text?: string
  cause_of_mould?: string
  outdoor_temperature?: number
  outdoor_humidity?: number
  outdoor_dew_point?: number
  outdoor_comments?: string
  labor_cost_ex_gst?: number
  equipment_cost_ex_gst?: number
  subtotal_ex_gst?: number
  gst_amount?: number
  total_inc_gst?: number
  lead?: {
    id: string
    full_name: string
    email?: string
    property_type?: string
    property_address_street: string
    property_address_suburb: string
    property_address_state?: string
    property_address_postcode?: string
  }
}

interface PDFVersion {
  id: string
  version_number: number
  pdf_url: string
  created_at: string
  file_size_bytes: number
}

interface EditableField {
  key: string
  label: string
  type: 'text' | 'textarea' | 'image' | 'currency' | 'number'
  page: number
  position: { x: number; y: number }
}

// Select query for inspections (used in both load paths)
const INSPECTION_SELECT = `
  id,
  job_number,
  pdf_url,
  pdf_version,
  pdf_approved,
  pdf_approved_at,
  pdf_generated_at,
  lead_id,
  requested_by,
  attention_to,
  inspection_date,
  inspector_name,
  dwelling_type,
  what_we_found_text,
  what_we_will_do_text,
  what_you_get_text,
  problem_analysis_content,
  what_we_discovered,
  identified_causes,
  why_this_happened,
  demolition_content,
  ai_summary_text,
  cause_of_mould,
  outdoor_temperature,
  outdoor_humidity,
  outdoor_dew_point,
  outdoor_comments,
  labor_cost_ex_gst,
  equipment_cost_ex_gst,
  subtotal_ex_gst,
  gst_amount,
  total_inc_gst,
  lead:leads(
    id,
    full_name,
    email,
    property_type,
    property_address_street,
    property_address_suburb,
    property_address_state,
    property_address_postcode
  )
`

export default function ViewReportPDF() {
  const { inspectionId, id } = useParams<{ inspectionId?: string; id?: string }>()
  const effectiveId = inspectionId || id
  const navigate = useNavigate()

  const [inspection, setInspection] = useState<Inspection | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [approving, setApproving] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [showVersions, setShowVersions] = useState(false)
  const [versions, setVersions] = useState<PDFVersion[]>([])

  // Edit modal state (Pages 2+)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingField, setEditingField] = useState<{
    key: string
    label: string
    type: 'text' | 'textarea' | 'number' | 'currency' | 'date'
    currentValue: string | number
  } | null>(null)

  // Image upload modal state
  const [imageModalOpen, setImageModalOpen] = useState(false)
  const [editingImage, setEditingImage] = useState<{
    key: string
    label: string
    currentUrl?: string
  } | null>(null)

  // Areas Inspected data + edit sheet
  const [areasData, setAreasData] = useState<AreaRecord[]>([])
  const [areaEditOpen, setAreaEditOpen] = useState(false)
  const [editingAreaId, setEditingAreaId] = useState<string | null>(null)
  const [areaForm, setAreaForm] = useState<Record<string, unknown>>({})
  const [savingArea, setSavingArea] = useState(false)

  // Area photos
  const [areaPhotos, setAreaPhotos] = useState<Array<{ id: string; storage_path: string; signed_url: string; caption: string | null }>>([])
  const [areaPhotoUploading, setAreaPhotoUploading] = useState(false)
  const [primaryPhotoId, setPrimaryPhotoId] = useState<string | null>(null)
  const [areaPhotosLoading, setAreaPhotosLoading] = useState(false)

  // Area photo picker (select from all inspection photos)
  const [areaPhotoPickerOpen, setAreaPhotoPickerOpen] = useState(false)
  const [areaPhotoPickerLoading, setAreaPhotoPickerLoading] = useState(false)
  const [allInspectionPhotos, setAllInspectionPhotos] = useState<Array<{ id: string; storage_path: string; signed_url: string; caption: string | null; photo_type: string; area_id: string | null }>>([])

  // Add new area
  const [addingArea, setAddingArea] = useState(false)
  const [newAreaName, setNewAreaName] = useState('')
  const [savingNewArea, setSavingNewArea] = useState(false)

  // Page 1 photo picker
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoPickerOpen, setPhotoPickerOpen] = useState(false)
  const [photoPickerLoading, setPhotoPickerLoading] = useState(false)
  const [availablePhotos, setAvailablePhotos] = useState<Array<{ id: string; storage_path: string; signed_url: string; caption: string | null; photo_type: string }>>([])
  const photoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (effectiveId) {
      loadInspection()
    }
  }, [effectiveId])

  async function loadInspection() {
    if (!effectiveId) {
      toast.error('No inspection ID provided')
      setLoading(false)
      return
    }

    try {
      let { data, error } = await supabase
        .from('inspections')
        .select(INSPECTION_SELECT)
        .eq('id', effectiveId)
        .single()

      if (error || !data) {
        const { data: inspByLead, error: leadError } = await supabase
          .from('inspections')
          .select(INSPECTION_SELECT)
          .eq('lead_id', effectiveId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (leadError || !inspByLead) {
          throw new Error('Inspection not found')
        }

        data = inspByLead
      }

      setInspection(data as unknown as Inspection)

      // Fetch inspection_areas for inline editing
      const inspId = (data as unknown as Inspection).id
      const { data: areas, error: areasError } = await supabase
        .from('inspection_areas')
        .select('id, area_name, temperature, humidity, dew_point, external_moisture, internal_moisture, mould_visible_locations, comments, extra_notes')
        .eq('inspection_id', inspId)
        .order('area_order', { ascending: true })

      if (areasError) {
        console.warn('[ViewReportPDF] Failed to load inspection areas:', areasError)
      } else {
        console.log(`[ViewReportPDF] Loaded ${areas?.length || 0} inspection areas`)
      }
      setAreasData((areas || []) as AreaRecord[])
    } catch (error) {
      console.error('Load error:', error)
      toast.error('Failed to load inspection')
    } finally {
      setLoading(false)
    }
  }

  async function handleGeneratePDF() {
    if (!inspection?.id) return

    setGenerating(true)
    toast.loading('Generating report...', { id: 'pdf-gen' })

    try {
      const result = await generateInspectionPDF(inspection.id, { regenerate: true })

      if (result.success && result.pdfUrl) {
        toast.success('Report generated successfully!', { id: 'pdf-gen' })
        await loadInspection()
      } else {
        toast.error(result.error || 'Failed to generate report', { id: 'pdf-gen' })
      }
    } catch (error) {
      console.error('Generate error:', error)
      toast.error('Failed to generate report', { id: 'pdf-gen' })
    } finally {
      setGenerating(false)
    }
  }

  async function handleApprove() {
    if (!inspection?.id) return

    setApproving(true)
    toast.loading('Approving report...', { id: 'approve' })

    try {
      const result = await approvePDF(inspection.id)

      if (result.success) {
        toast.success('Report approved and ready to send!', { id: 'approve' })
        await loadInspection()

        const lead = inspection.lead
        const address = lead
          ? [lead.property_address_street, lead.property_address_suburb].filter(Boolean).join(', ')
          : ''

        sendSlackNotification({
          event: 'report_approved',
          leadId: lead?.id,
          leadName: lead?.full_name,
          propertyAddress: address,
        })

        if (lead?.email) {
          sendEmail({
            to: lead.email,
            subject: `Your Inspection Report — ${inspection.job_number || 'Mould & Restoration Co'}`,
            html: buildReportApprovedHtml({
              customerName: lead.full_name,
              address,
              jobNumber: inspection.job_number || undefined,
            }),
            leadId: lead.id,
            inspectionId: inspection.id,
            templateName: 'report-approved',
          })
        }
      } else {
        toast.error(result.error || 'Failed to approve report', { id: 'approve' })
      }
    } catch (error) {
      console.error('Approve error:', error)
      toast.error('Failed to approve report', { id: 'approve' })
    } finally {
      setApproving(false)
    }
  }

  function handleDownload() {
    if (!inspection?.pdf_url) return
    window.open(inspection.pdf_url, '_blank')
    toast.info('Report opened - use Print > Save as PDF')
  }

  async function handleShowVersions() {
    if (!inspection?.id) return

    if (showVersions) {
      setShowVersions(false)
      return
    }

    const history = await getPDFVersionHistory(inspection.id)
    setVersions(history)
    setShowVersions(true)
  }

  // --- Pages 2+ edit handlers (existing) ---

  function handleFieldClick(field: EditableField) {
    if (field.type === 'image') {
      setEditingImage({
        key: field.key,
        label: field.label,
        currentUrl: undefined,
      })
      setImageModalOpen(true)
    } else {
      const currentValue = getFieldValue(field.key)
      setEditingField({
        key: field.key,
        label: field.label,
        type: field.type === 'currency' ? 'currency' : field.type === 'number' ? 'number' : field.type === 'textarea' ? 'textarea' : 'text',
        currentValue,
      })
      setEditModalOpen(true)
    }
  }

  function getFieldValue(fieldKey: string): string | number {
    if (!inspection) return ''

    const fieldMap: Record<string, () => string | number> = {
      'client_name': () => inspection.lead?.full_name || '',
      'property_address': () => {
        const lead = inspection.lead
        if (!lead) return ''
        return [lead.property_address_street, lead.property_address_suburb, lead.property_address_state, lead.property_address_postcode].filter(Boolean).join(', ')
      },
      'ai_summary': () => inspection.ai_summary_text || '',
      'cause_of_mould': () => inspection.cause_of_mould || '',
      'outdoor_temperature': () => inspection.outdoor_temperature || 0,
      'outdoor_humidity': () => inspection.outdoor_humidity || 0,
      'outdoor_dew_point': () => inspection.outdoor_dew_point || 0,
      'outdoor_comments': () => inspection.outdoor_comments || '',
      'labor_cost': () => inspection.labor_cost_ex_gst || 0,
      'equipment_cost': () => inspection.equipment_cost_ex_gst || 0,
      'subtotal_ex_gst': () => inspection.subtotal_ex_gst || 0,
      'gst_amount': () => inspection.gst_amount || 0,
      'total_inc_gst': () => inspection.total_inc_gst || 0,
    }

    const getter = fieldMap[fieldKey]
    return getter ? getter() : ''
  }

  async function handleImageUploadSuccess() {
    toast.success('Image uploaded!', { id: 'image-upload' })
    await handleGeneratePDF()
    setImageModalOpen(false)
    setEditingImage(null)
  }

  // --- Page 1 inline edit handlers ---

  // Build page1Data from current inspection state
  const page1Data: Page1Data | null = inspection ? {
    ordered_by: inspection.requested_by || inspection.lead?.full_name || '',
    inspector: inspection.inspector_name || '',
    date: inspection.inspection_date || '',
    directed_to: inspection.attention_to || inspection.lead?.full_name || '',
    property_type: inspection.lead?.property_type || inspection.dwelling_type || '',
    address_street: inspection.lead?.property_address_street || '',
    address_suburb: inspection.lead?.property_address_suburb || '',
    address_state: inspection.lead?.property_address_state || '',
    address_postcode: inspection.lead?.property_address_postcode || '',
  } : null

  // Build VP data from current inspection state
  const vpData: VPData | null = inspection ? {
    what_we_found: inspection.what_we_found_text || '',
    what_we_will_do: inspection.what_we_will_do_text || '',
  } : null

  // Problem Analysis content — single blob field
  const paContent = inspection?.problem_analysis_content || null

  // Demolition content — single blob field
  const demoContent = inspection?.demolition_content || null

  // Outdoor Environment data
  const outdoorData: OutdoorData | null = inspection ? {
    outdoor_temperature: inspection.outdoor_temperature ?? 0,
    outdoor_humidity: inspection.outdoor_humidity ?? 0,
    outdoor_dew_point: inspection.outdoor_dew_point ?? 0,
  } : null

  async function handleVPFieldSave(key: string, value: string) {
    if (!inspection?.id) return

    try {
      const columnMap: Record<string, string> = {
        what_we_found: 'what_we_found_text',
        what_we_will_do: 'what_we_will_do_text',
      }

      const column = columnMap[key]
      if (!column) return

      const { error } = await supabase
        .from('inspections')
        .update({ [column]: value || null, updated_at: new Date().toISOString() })
        .eq('id', inspection.id)

      if (error) throw error

      toast.success(`${key === 'what_we_found' ? 'What We Found' : "What We're Going To Do"} updated`)
      await handleGeneratePDF()
    } catch (error) {
      console.error('VP save failed:', error)
      toast.error('Failed to save')
      throw error
    }
  }

  async function handlePASave(value: string) {
    if (!inspection?.id) return

    try {
      const { error } = await supabase
        .from('inspections')
        .update({ problem_analysis_content: value || null, updated_at: new Date().toISOString() })
        .eq('id', inspection.id)

      if (error) throw error

      toast.success('Problem Analysis updated')
      await handleGeneratePDF()
    } catch (error) {
      console.error('PA save failed:', error)
      toast.error('Failed to save')
      throw error
    }
  }

  async function handleDemoSave(value: string) {
    if (!inspection?.id) return

    try {
      const { error } = await supabase
        .from('inspections')
        .update({ demolition_content: value || null, updated_at: new Date().toISOString() })
        .eq('id', inspection.id)

      if (error) throw error

      toast.success('Demolition content updated')
      await handleGeneratePDF()
    } catch (error) {
      console.error('Demolition save failed:', error)
      toast.error('Failed to save')
      throw error
    }
  }

  async function handleOutdoorFieldSave(key: string, value: number) {
    if (!inspection?.id) return

    try {
      const { error } = await supabase
        .from('inspections')
        .update({ [key]: value, updated_at: new Date().toISOString() })
        .eq('id', inspection.id)

      if (error) throw error

      const labelMap: Record<string, string> = {
        outdoor_temperature: 'Temperature',
        outdoor_humidity: 'Humidity',
        outdoor_dew_point: 'Dew Point',
      }
      toast.success(`${labelMap[key] || key} updated`)
      await handleGeneratePDF()
    } catch (error) {
      console.error('Outdoor save failed:', error)
      toast.error('Failed to save')
      throw error
    }
  }

  function openAreaEdit(area: AreaRecord) {
    setEditingAreaId(area.id)
    setAreaForm({
      temperature: area.temperature ?? 0,
      humidity: area.humidity ?? 0,
      dew_point: area.dew_point ?? 0,
      external_moisture: area.external_moisture ?? 0,
      internal_moisture: area.internal_moisture ?? 0,
      mould_visible_locations: area.mould_visible_locations || [],
      comments: area.comments || '',
      extra_notes: area.extra_notes || '',
    })
    setAreaPhotos([])
    setAreaEditOpen(true)
    // Load photos for this area
    loadAreaPhotos(area.id)
  }

  async function saveAreaForm() {
    if (!editingAreaId || !inspection?.id) return
    setSavingArea(true)

    try {
      const updates = {
        temperature: parseFloat(String(areaForm.temperature)) || 0,
        humidity: parseFloat(String(areaForm.humidity)) || 0,
        dew_point: parseFloat(String(areaForm.dew_point)) || 0,
        external_moisture: parseFloat(String(areaForm.external_moisture)) || 0,
        internal_moisture: parseFloat(String(areaForm.internal_moisture)) || 0,
        mould_visible_locations: areaForm.mould_visible_locations,
        comments: (areaForm.comments as string) || null,
        extra_notes: (areaForm.extra_notes as string) || null,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from('inspection_areas')
        .update(updates)
        .eq('id', editingAreaId)

      if (error) throw error

      toast.success('Area updated')
      setAreaEditOpen(false)
      setEditingAreaId(null)
      await handleGeneratePDF()

      // Refresh areas data
      const { data: areas } = await supabase
        .from('inspection_areas')
        .select('id, area_name, temperature, humidity, dew_point, external_moisture, internal_moisture, mould_visible_locations, comments, extra_notes')
        .eq('inspection_id', inspection.id)
        .order('area_order', { ascending: true })
      setAreasData((areas || []) as AreaRecord[])
    } catch (error) {
      console.error('Area save failed:', error)
      toast.error('Failed to save area')
    } finally {
      setSavingArea(false)
    }
  }

  async function loadAreaPhotos(areaId: string) {
    setAreaPhotosLoading(true)
    try {
      // Get primary_photo_id for this area
      const { data: area } = await supabase
        .from('inspection_areas')
        .select('primary_photo_id')
        .eq('id', areaId)
        .single()

      setPrimaryPhotoId(area?.primary_photo_id || null)

      // Load ALL photos assigned to this area
      const { data: photos, error } = await supabase
        .from('photos')
        .select('id, storage_path, file_name, caption')
        .eq('area_id', areaId)
        .order('created_at', { ascending: true })

      console.log(`[loadAreaPhotos] area=${areaId}, primary=${area?.primary_photo_id}, photos=${photos?.length ?? 0}`, error || '')

      if (photos && photos.length > 0) {
        const withUrls = await Promise.all(
          photos.map(async (p) => {
            try {
              const signed_url = await getPhotoSignedUrl(p.storage_path)
              return { id: p.id, storage_path: p.storage_path, signed_url, caption: p.caption }
            } catch {
              return { id: p.id, storage_path: p.storage_path, signed_url: '', caption: p.caption }
            }
          })
        )
        setAreaPhotos(withUrls)
      } else {
        setAreaPhotos([])
      }
    } catch (err) {
      console.warn('Failed to load area photos:', err)
    } finally {
      setAreaPhotosLoading(false)
    }
  }

  async function handleDeleteAreaPhoto(photoId: string) {
    try {
      await deleteInspectionPhoto(photoId)
      setAreaPhotos(prev => prev.filter(p => p.id !== photoId))
      toast.success('Photo deleted — regenerating PDF...')
      await handleGeneratePDF()
    } catch (err) {
      console.error('Delete area photo failed:', err)
      toast.error('Failed to delete photo')
    }
  }

  async function openAreaPhotoPicker() {
    if (!inspection?.id) return
    setAreaPhotoPickerOpen(true)
    setAreaPhotoPickerLoading(true)
    try {
      const photos = await loadInspectionPhotos(inspection.id)
      setAllInspectionPhotos(
        photos
          .filter(p => p.signed_url)
          .map(p => ({
            id: p.id,
            storage_path: p.storage_path,
            signed_url: p.signed_url,
            caption: p.caption,
            photo_type: p.photo_type,
            area_id: p.area_id,
          }))
      )
    } catch {
      setAllInspectionPhotos([])
    } finally {
      setAreaPhotoPickerLoading(false)
    }
  }

  async function handleSelectPhotoForArea(photoId: string) {
    if (!editingAreaId || !inspection?.id) return
    setAreaPhotoUploading(true)
    setAreaPhotoPickerOpen(false)
    try {
      // Only update primary_photo_id on the area — never touch other photos' area_id
      await supabase
        .from('inspection_areas')
        .update({ primary_photo_id: photoId })
        .eq('id', editingAreaId)

      // Update primary state — keeps all area photos visible
      setPrimaryPhotoId(photoId)

      toast.success('Area photo updated')
      await handleGeneratePDF()
    } catch (error) {
      console.error('Failed to set area photo:', error)
      toast.error('Failed to set area photo')
    } finally {
      setAreaPhotoUploading(false)
    }
  }

  async function handleUploadNewAreaPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !editingAreaId || !inspection?.id) return
    e.target.value = ''

    setAreaPhotoUploading(true)
    try {
      const resized = await resizePhoto(file)
      // Upload to inspection pool only — NO area assignment, NO primary_photo_id
      await uploadInspectionPhoto(resized, {
        inspection_id: inspection.id,
        photo_type: 'area',
        order_index: 0,
      })

      toast.success('Photo uploaded — select it from the grid')
      // Reopen picker with refreshed photos so user can select the new one
      await openAreaPhotoPicker()
    } catch (err) {
      console.error('Area photo upload failed:', err)
      toast.error('Failed to upload photo')
    } finally {
      setAreaPhotoUploading(false)
    }
  }

  async function handleAddArea() {
    if (!newAreaName.trim() || !inspection?.id) return
    setSavingNewArea(true)

    try {
      // Get max area_order
      const maxOrder = areasData.length > 0
        ? Math.max(...areasData.map((a, i) => i + 1))
        : 0

      const { data: newArea, error } = await supabase
        .from('inspection_areas')
        .insert({
          inspection_id: inspection.id,
          area_name: newAreaName.trim(),
          area_order: maxOrder + 1,
          temperature: 0,
          humidity: 0,
          dew_point: 0,
          external_moisture: 0,
          internal_moisture: 0,
        })
        .select('id, area_name, temperature, humidity, dew_point, external_moisture, internal_moisture, mould_visible_locations, comments, extra_notes')
        .single()

      if (error) throw error

      // Refresh areas list
      const { data: areas } = await supabase
        .from('inspection_areas')
        .select('id, area_name, temperature, humidity, dew_point, external_moisture, internal_moisture, mould_visible_locations, comments, extra_notes')
        .eq('inspection_id', inspection.id)
        .order('area_order', { ascending: true })
      setAreasData((areas || []) as AreaRecord[])

      // Auto-open the new area for editing
      setNewAreaName('')
      setAddingArea(false)
      if (newArea) {
        openAreaEdit(newArea as AreaRecord)
      }
      toast.success('Area created')
    } catch (err) {
      console.error('Add area failed:', err)
      toast.error('Failed to create area')
    } finally {
      setSavingNewArea(false)
    }
  }

  async function handlePage1FieldSave(key: string, value: string | Record<string, string>) {
    if (!inspection?.id || !inspection?.lead_id) return

    try {
      if (key === 'cover_photo') {
        // Photo was uploaded separately, just regenerate
      } else if (key === 'address') {
        const addr = value as Record<string, string>
        const { error } = await supabase
          .from('leads')
          .update({
            property_address_street: addr.street,
            property_address_suburb: addr.suburb,
            property_address_state: addr.state,
            property_address_postcode: addr.postcode,
          })
          .eq('id', inspection.lead_id)
        if (error) throw error
      } else {
        // Map inline field keys to database columns
        const fieldMap: Record<string, { table: 'inspections' | 'leads'; column: string; also?: { table: 'leads'; column: string } }> = {
          ordered_by: { table: 'inspections', column: 'requested_by' },
          inspector: { table: 'inspections', column: 'inspector_name' },
          date: { table: 'inspections', column: 'inspection_date' },
          directed_to: { table: 'inspections', column: 'attention_to' },
          property_type: { table: 'inspections', column: 'dwelling_type', also: { table: 'leads', column: 'property_type' } },
        }

        const mapping = fieldMap[key]
        if (mapping) {
          if (mapping.table === 'inspections') {
            const { error } = await supabase
              .from('inspections')
              .update({ [mapping.column]: (value as string) || null, updated_at: new Date().toISOString() })
              .eq('id', inspection.id)
            if (error) throw error
          }
          if (mapping.also) {
            await supabase
              .from('leads')
              .update({ [mapping.also.column]: (value as string) || null })
              .eq('id', inspection.lead_id)
          }
        }
      }

      // Regenerate PDF with new data
      await handleGeneratePDF()
    } catch (error) {
      console.error('Page 1 save failed:', error)
      toast.error('Failed to save')
      throw error
    }
  }

  async function handlePage1PhotoChange() {
    if (!inspection?.id) return
    setPhotoPickerOpen(true)
    setPhotoPickerLoading(true)
    try {
      const photos = await loadInspectionPhotos(inspection.id)
      setAvailablePhotos(photos.filter(p => p.signed_url))
    } catch {
      setAvailablePhotos([])
    } finally {
      setPhotoPickerLoading(false)
    }
  }

  async function handleSelectExistingPhoto(photoId: string) {
    if (!inspection?.id) return
    setPhotoUploading(true)
    setPhotoPickerOpen(false)
    try {
      // Remove old front_house caption from any existing photo
      const { data: existing } = await supabase
        .from('photos')
        .select('id')
        .eq('inspection_id', inspection.id)
        .eq('caption', 'front_house')

      if (existing) {
        for (const p of existing) {
          if (p.id !== photoId) {
            await supabase.from('photos').update({ caption: null }).eq('id', p.id)
          }
        }
      }

      // Set selected photo as front_house
      await supabase
        .from('photos')
        .update({ caption: 'front_house', photo_type: 'outdoor' })
        .eq('id', photoId)

      toast.success('Cover photo updated')
      await handleGeneratePDF()
    } catch (error) {
      console.error('Failed to set cover photo:', error)
      toast.error('Failed to set cover photo')
    } finally {
      setPhotoUploading(false)
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !inspection?.id) return

    setPhotoUploading(true)
    try {
      const resizedBlob = await resizePhoto(file)
      const resizedFile = new File([resizedBlob], file.name, { type: 'image/jpeg' })

      // Delete existing front_house photo
      const { data: existing } = await supabase
        .from('photos')
        .select('id')
        .eq('inspection_id', inspection.id)
        .eq('caption', 'front_house')

      if (existing) {
        for (const p of existing) {
          try { await deleteInspectionPhoto(p.id) } catch { /* ignore */ }
        }
      }

      await uploadInspectionPhoto(resizedFile, {
        inspection_id: inspection.id,
        photo_type: 'outdoor',
        caption: 'front_house',
        order_index: 0,
      })

      toast.success('Photo updated')
      await handleGeneratePDF()
    } catch (error) {
      console.error('Photo upload failed:', error)
      toast.error('Failed to upload photo')
    } finally {
      setPhotoUploading(false)
      if (photoInputRef.current) photoInputRef.current.value = ''
    }
  }

  // --- Render ---

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-16 w-16 animate-spin text-orange-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading inspection report...</p>
        </div>
      </div>
    )
  }

  if (!inspection?.pdf_url) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="h-16 w-16 text-orange-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Report Generated</h2>
          <p className="text-gray-600 mb-6">
            A report has not been generated for this inspection yet.
          </p>
          <div className="flex flex-col gap-3">
            <Button
              onClick={handleGeneratePDF}
              disabled={generating}
              className="h-14 min-h-[56px] bg-orange-600 hover:bg-orange-700 text-lg"
            >
              {generating ? (
                <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Generating...</>
              ) : (
                <><RefreshCw className="h-5 w-5 mr-2" />Generate Report</>
              )}
            </Button>
            <Button variant="outline" onClick={() => navigate(-1)} className="h-12 min-h-[48px]">
              <ArrowLeft className="h-5 w-5 mr-2" />
              Go Back
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-40 shadow-sm">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost" size="icon" onClick={() => navigate(-1)}
              className="h-12 w-12 min-h-[48px] min-w-[48px]" aria-label="Go back"
            >
              <ArrowLeft className="h-6 w-6" />
            </Button>
            <div className="hidden sm:block">
              <h1 className="text-lg font-semibold">
                {inspection.job_number || 'Inspection Report'}
              </h1>
              {inspection?.lead && (
                <p className="text-sm text-gray-600">
                  {inspection.lead.full_name} - {inspection.lead.property_address_suburb}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center px-2 py-1 text-xs bg-gray-100 rounded">
              v{inspection.pdf_version || 1}
            </span>

            {/* Mobile buttons */}
            <div className="flex sm:hidden gap-2">
              <Button variant="outline" size="icon" onClick={handleDownload}
                className="h-12 w-12 min-h-[48px] min-w-[48px]">
                <Download className="h-5 w-5" />
              </Button>
              <Button
                size="icon" onClick={handleApprove}
                disabled={inspection.pdf_approved || approving}
                className={`h-12 w-12 min-h-[48px] min-w-[48px] ${
                  inspection.pdf_approved ? 'bg-green-600 hover:bg-green-600' : 'bg-orange-600 hover:bg-orange-700'
                }`}
              >
                {approving ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle className="h-5 w-5" />}
              </Button>
            </div>

            {/* Desktop buttons */}
            <div className="hidden sm:flex gap-2">
              <Button variant="outline" onClick={handleShowVersions} className="h-10">
                <History className="h-4 w-4 mr-2" />
                History
              </Button>
              <Button
                variant={editMode ? 'default' : 'outline'}
                onClick={() => setEditMode(!editMode)}
                className={editMode ? 'bg-orange-600 hover:bg-orange-700' : ''}
              >
                {editMode ? (
                  <><Eye className="h-4 w-4 mr-2" />View Mode</>
                ) : (
                  <><Edit className="h-4 w-4 mr-2" />Edit Mode</>
                )}
              </Button>
              <Button variant="outline" onClick={handleGeneratePDF} disabled={generating}>
                {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Regenerate
              </Button>
              <Button variant="outline" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button
                onClick={handleApprove}
                disabled={inspection.pdf_approved || approving}
                className={inspection.pdf_approved ? 'bg-green-600 hover:bg-green-600' : 'bg-orange-600 hover:bg-orange-700'}
              >
                {approving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : inspection.pdf_approved ? (
                  <CheckCircle className="h-4 w-4 mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                {inspection.pdf_approved ? 'Approved' : 'Approve & Send'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Version History Panel */}
      {showVersions && versions.length > 0 && (
        <div className="bg-white border-b border-gray-200 px-4 py-3 z-30">
          <div className="max-w-6xl mx-auto">
            <h3 className="text-sm font-semibold mb-2">Version History</h3>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {versions.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setInspection(prev => prev ? { ...prev, pdf_url: v.pdf_url } : null)}
                  className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm border min-h-[48px] ${
                    inspection.pdf_url === v.pdf_url
                      ? 'bg-orange-100 border-orange-500'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <div className="font-medium">v{v.version_number}</div>
                  <div className="text-xs text-gray-500">
                    {new Date(v.created_at).toLocaleDateString('en-AU')}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Edit Mode Indicator (Pages 2+) */}
      {editMode && (
        <div className="bg-orange-500 text-white text-center py-2 text-sm font-medium z-30 flex items-center justify-center gap-2">
          <Edit className="h-4 w-4" />
          Edit Mode Active - Click orange buttons on the report to edit fields
        </div>
      )}

      {/* Main Content: Report Preview */}
      <div className="flex-1">
        <ReportPreviewHTML
          htmlUrl={inspection.pdf_url}
          editMode={editMode}
          onFieldClick={handleFieldClick}
          onLoadSuccess={() => console.log('Report loaded')}
          onLoadError={(error) => toast.error(error)}
          page1Data={page1Data}
          onPage1FieldSave={handlePage1FieldSave}
          onPage1PhotoChange={handlePage1PhotoChange}
          photoUploading={photoUploading}
          vpData={vpData}
          onVPFieldSave={handleVPFieldSave}
          paContent={paContent}
          onPASave={handlePASave}
          demoContent={demoContent}
          onDemoSave={handleDemoSave}
          outdoorData={outdoorData}
          onOutdoorFieldSave={handleOutdoorFieldSave}
        />
      </div>

      {/* Floating Edit Areas Button */}
      <button
        onClick={() => setAreaEditOpen(true)}
        className="fixed bottom-24 md:bottom-20 left-4 bg-orange-600 hover:bg-orange-700 text-white px-4 py-3 rounded-full shadow-lg flex items-center gap-2 z-50 min-h-[48px] transition-colors animate-pulse"
      >
        <Edit className="h-5 w-5" />
        <span className="font-medium text-sm">
          {areasData.length > 0 ? `Edit Areas (${areasData.length})` : 'Add Areas'}
        </span>
      </button>

      {/* Area Edit Dialog */}
      <Dialog open={areaEditOpen} onOpenChange={setAreaEditOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Area Readings</DialogTitle>
            <DialogDescription>
              Select an area to edit its readings and notes
            </DialogDescription>
          </DialogHeader>

          {/* Area selector — show all areas as cards */}
          {!editingAreaId ? (
            <div className="space-y-3">
              {areasData.map((area) => (
                <button
                  key={area.id}
                  onClick={() => openAreaEdit(area)}
                  className="w-full text-left p-4 rounded-lg border border-gray-200 hover:border-orange-400 hover:bg-orange-50 transition-colors min-h-[48px]"
                >
                  <div className="font-semibold text-base">{area.area_name}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    {area.temperature}°C · {area.humidity}% RH · DP {area.dew_point}°C
                    {area.mould_visible_locations && area.mould_visible_locations.length > 0 && (
                      <span className="ml-2 text-red-600">· Mould: {area.mould_visible_locations.join(', ')}</span>
                    )}
                  </div>
                </button>
              ))}

              {/* Add Area */}
              {addingArea ? (
                <div className="p-4 rounded-lg border-2 border-dashed border-orange-300 bg-orange-50 space-y-3">
                  <input
                    type="text"
                    value={newAreaName}
                    onChange={(e) => setNewAreaName(e.target.value)}
                    placeholder="Area name (e.g. Bedroom 2)"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-[44px]"
                    autoFocus
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddArea() }}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => { setAddingArea(false); setNewAreaName('') }}
                      disabled={savingNewArea}
                      className="flex-1 min-h-[44px]"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAddArea}
                      disabled={savingNewArea || !newAreaName.trim()}
                      className="flex-1 min-h-[44px] bg-orange-600 hover:bg-orange-700"
                    >
                      {savingNewArea ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</>
                      ) : (
                        <><Check className="h-4 w-4 mr-2" />Create Area</>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setAddingArea(true)}
                  className="w-full p-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-orange-400 hover:bg-orange-50 transition-colors min-h-[48px] flex items-center justify-center gap-2 text-gray-500 hover:text-orange-600"
                >
                  <Plus className="h-5 w-5" />
                  <span className="font-medium text-sm">Add Area</span>
                </button>
              )}
            </div>
          ) : (
            /* Area edit form */
            <div className="space-y-4">
              <button
                onClick={() => setEditingAreaId(null)}
                className="text-sm text-orange-600 hover:text-orange-700 font-medium min-h-[36px]"
              >
                ← Back to area list
              </button>

              <div className="font-semibold text-lg">
                {areasData.find(a => a.id === editingAreaId)?.area_name}
              </div>

              {/* Readings grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Temperature (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={areaForm.temperature as number ?? ''}
                    onChange={(e) => setAreaForm(f => ({ ...f, temperature: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Humidity (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={areaForm.humidity as number ?? ''}
                    onChange={(e) => setAreaForm(f => ({ ...f, humidity: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Dew Point (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={areaForm.dew_point as number ?? ''}
                    onChange={(e) => setAreaForm(f => ({ ...f, dew_point: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">External Moisture (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={areaForm.external_moisture as number ?? ''}
                    onChange={(e) => setAreaForm(f => ({ ...f, external_moisture: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Internal Moisture (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={areaForm.internal_moisture as number ?? ''}
                    onChange={(e) => setAreaForm(f => ({ ...f, internal_moisture: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-[44px]"
                  />
                </div>
              </div>

              {/* Visible Mould checkboxes */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Visible Mould Locations</label>
                <div className="flex flex-wrap gap-2">
                  {['Ceiling', 'Cornice', 'Windows', 'Window Furnishings', 'Walls', 'Skirting', 'Flooring', 'Wardrobe', 'Cupboard', 'Contents', 'Grout/Silicone'].map(loc => {
                    const locs = (areaForm.mould_visible_locations as string[]) || []
                    const checked = locs.includes(loc)
                    return (
                      <label key={loc} className="flex items-center gap-1.5 text-sm bg-gray-50 px-3 py-1.5 rounded-lg border cursor-pointer hover:bg-gray-100 min-h-[36px]">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            const next = checked ? locs.filter(l => l !== loc) : [...locs, loc]
                            setAreaForm(f => ({ ...f, mould_visible_locations: next }))
                          }}
                          className="w-4 h-4"
                        />
                        {loc}
                      </label>
                    )
                  })}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Notes / Comments</label>
                <textarea
                  value={(areaForm.comments as string) || ''}
                  onChange={(e) => setAreaForm(f => ({ ...f, comments: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-vertical"
                  style={{ minHeight: '120px' }}
                  placeholder="Area notes..."
                />
              </div>

              {/* Extra Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Extra Notes</label>
                <textarea
                  value={(areaForm.extra_notes as string) || ''}
                  onChange={(e) => setAreaForm(f => ({ ...f, extra_notes: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-vertical"
                  style={{ minHeight: '100px' }}
                  placeholder="Additional notes..."
                />
              </div>

              {/* Area Photos — max 6 in clean grid */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Area Photos{areaPhotos.length > 0 && <span className="text-gray-400 font-normal ml-1">({Math.min(areaPhotos.length, 6)}{areaPhotos.length > 6 ? `/${areaPhotos.length}` : ''})</span>}
                </label>
                {areaPhotosLoading && (
                  <div className="flex items-center justify-center py-6 mb-3">
                    <Loader2 className="h-6 w-6 animate-spin text-orange-600" />
                    <span className="ml-2 text-sm text-gray-500">Loading area photos...</span>
                  </div>
                )}
                {!areaPhotosLoading && areaPhotos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {areaPhotos.slice(0, 6).map((photo) => {
                      const isPrimary = photo.id === primaryPhotoId
                      return (
                        <div key={photo.id} className="relative group aspect-square">
                          <button
                            onClick={() => openAreaPhotoPicker()}
                            className={`w-full h-full cursor-pointer rounded-lg overflow-hidden border-2 transition-all hover:border-orange-500 hover:shadow-md ${
                              isPrimary ? 'border-orange-500 ring-2 ring-orange-300' : 'border-gray-200'
                            }`}
                          >
                            {photo.signed_url ? (
                              <img
                                src={photo.signed_url}
                                alt={photo.caption || 'Area photo'}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
                                No preview
                              </div>
                            )}
                          </button>
                          {isPrimary && (
                            <div className="absolute top-1 left-1 bg-orange-600 text-white rounded-full p-0.5 z-10">
                              <Check className="w-3 h-3" />
                            </div>
                          )}
                          <button
                            onClick={() => handleDeleteAreaPhoto(photo.id)}
                            className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity min-w-[28px] min-h-[28px] flex items-center justify-center z-10"
                            title="Delete photo"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => openAreaPhotoPicker()}
                  disabled={areaPhotoUploading}
                  className="w-full min-h-[48px] border-dashed"
                >
                  {areaPhotoUploading ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading...</>
                  ) : (
                    <><Camera className="h-4 w-4 mr-2" />Select or Upload Photo</>
                  )}
                </Button>
              </div>

              {/* Save / Cancel */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => { setEditingAreaId(null); setAreaEditOpen(false) }}
                  disabled={savingArea}
                  className="flex-1 h-12 min-h-[48px]"
                >
                  Cancel
                </Button>
                <Button
                  onClick={saveAreaForm}
                  disabled={savingArea}
                  className="flex-1 h-12 min-h-[48px] bg-orange-600 hover:bg-orange-700"
                >
                  {savingArea ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
                  ) : (
                    <><Check className="h-4 w-4 mr-2" />Save & Regenerate</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Hidden file input for Page 1 photo upload */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoUpload}
        className="hidden"
      />

      {/* Approved Badge */}
      {inspection.pdf_approved && (
        <div className="fixed bottom-24 md:bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 z-50">
          <CheckCircle className="h-5 w-5" />
          <span className="font-medium">Approved</span>
        </div>
      )}

      {/* Edit Field Modal (Pages 2+) */}
      {editingField && (
        <EditFieldModal
          inspectionId={inspection.id}
          field={{
            field_key: editingField.key,
            field_label: editingField.label,
            field_type: editingField.type,
          }}
          currentValue={editingField.currentValue}
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false)
            setEditingField(null)
          }}
          onSuccess={async () => {
            await loadInspection()
            await handleGeneratePDF()
          }}
        />
      )}

      {/* Image Upload Modal (Pages 2+) */}
      {editingImage && inspection?.id && (
        <ImageUploadModal
          isOpen={imageModalOpen}
          onClose={() => {
            setImageModalOpen(false)
            setEditingImage(null)
          }}
          inspectionId={inspection.id}
          fieldKey={editingImage.key}
          fieldLabel={editingImage.label}
          currentPhotoUrl={editingImage.currentUrl}
          onSuccess={handleImageUploadSuccess}
        />
      )}

      {/* Area Photo Picker Dialog */}
      <Dialog open={areaPhotoPickerOpen} onOpenChange={setAreaPhotoPickerOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Area Photo</DialogTitle>
            <DialogDescription>
              Choose an existing photo or upload a new one
            </DialogDescription>
          </DialogHeader>

          {areaPhotoPickerLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
            </div>
          ) : (
            <>
              {allInspectionPhotos.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {allInspectionPhotos.map((photo) => {
                    const isCurrent = photo.id === primaryPhotoId
                    return (
                      <button
                        key={photo.id}
                        onClick={() => handleSelectPhotoForArea(photo.id)}
                        className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all hover:border-orange-500 hover:shadow-md ${
                          isCurrent ? 'border-orange-500 ring-2 ring-orange-300' : 'border-gray-200'
                        }`}
                      >
                        <img
                          src={photo.signed_url}
                          alt={photo.caption || photo.photo_type}
                          className="w-full h-full object-cover"
                        />
                        {isCurrent && (
                          <div className="absolute top-1 right-1 bg-orange-600 text-white rounded-full p-0.5">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-4">No photos found for this inspection</p>
              )}

              <label className="flex items-center justify-center w-full h-12 min-h-[48px] mt-2 border border-input bg-background rounded-md cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors">
                <Upload className="h-5 w-5 mr-2" />
                Upload New Photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUploadNewAreaPhoto}
                  className="hidden"
                />
              </label>
            </>
          )}
        </DialogContent>
      </Dialog>
      {/* Photo Picker Dialog (Page 1 cover photo) */}
      <Dialog open={photoPickerOpen} onOpenChange={setPhotoPickerOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Cover Photo</DialogTitle>
            <DialogDescription>
              Choose an existing photo or upload a new one
            </DialogDescription>
          </DialogHeader>

          {photoPickerLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
            </div>
          ) : (
            <>
              {availablePhotos.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {availablePhotos.map((photo) => (
                    <button
                      key={photo.id}
                      onClick={() => handleSelectExistingPhoto(photo.id)}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all hover:border-orange-500 hover:shadow-md ${
                        photo.caption === 'front_house' ? 'border-orange-500 ring-2 ring-orange-300' : 'border-gray-200'
                      }`}
                    >
                      <img
                        src={photo.signed_url}
                        alt={photo.caption || photo.photo_type}
                        className="w-full h-full object-cover"
                      />
                      {photo.caption === 'front_house' && (
                        <div className="absolute top-1 right-1 bg-orange-600 text-white rounded-full p-0.5">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-4">No photos found for this inspection</p>
              )}

              <Button
                onClick={() => {
                  setPhotoPickerOpen(false)
                  photoInputRef.current?.click()
                }}
                variant="outline"
                className="w-full h-12 min-h-[48px] mt-2"
              >
                <Upload className="h-5 w-5 mr-2" />
                Upload New Photo
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

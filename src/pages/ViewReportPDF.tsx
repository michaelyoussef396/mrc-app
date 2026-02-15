// ViewReportPDF Page
// View, edit, and approve inspection PDF reports
// Mobile-first design with 48px touch targets
// Page 1: inline edit buttons next to each field on the PDF
// Pages 2+: toggle edit mode for overlay buttons

import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { ReportPreviewHTML } from '@/components/pdf/ReportPreviewHTML'
import type { Page1Data } from '@/components/pdf/ReportPreviewHTML'
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
} from 'lucide-react'
import {
  generateInspectionPDF,
  approvePDF,
  getPDFVersionHistory,
  updateFieldAndRegenerate
} from '@/lib/api/pdfGeneration'
import { sendEmail, sendSlackNotification, buildReportApprovedHtml } from '@/lib/api/notifications'
import { uploadInspectionPhoto, deleteInspectionPhoto, loadInspectionPhotos } from '@/lib/utils/photoUpload'
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
        />
      </div>

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

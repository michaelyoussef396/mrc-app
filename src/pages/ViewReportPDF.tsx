// ViewReportPDF Page
// View, edit, and approve inspection PDF reports
// Mobile-first design with 48px touch targets
// NEW: Visual preview with edit buttons ON the PDF

import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { ReportPreviewHTML } from '@/components/pdf/ReportPreviewHTML'
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
  Mail
} from 'lucide-react'
import {
  generateInspectionPDF,
  approvePDF,
  getPDFVersionHistory,
  updateFieldAndRegenerate
} from '@/lib/api/pdfGeneration'

interface Inspection {
  id: string
  job_number: string
  pdf_url: string | null
  pdf_version: number
  pdf_approved: boolean
  pdf_approved_at: string | null
  pdf_generated_at: string | null
  lead_id?: string
  // Editable fields
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

export default function ViewReportPDF() {
  // Support both old route (:id for lead) and new route (:inspectionId)
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

  // Edit modal state
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
      // First try to load as inspection ID
      let { data, error } = await supabase
        .from('inspections')
        .select(`
          id,
          job_number,
          pdf_url,
          pdf_version,
          pdf_approved,
          pdf_approved_at,
          pdf_generated_at,
          lead_id,
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
            property_address_street,
            property_address_suburb,
            property_address_state,
            property_address_postcode
          )
        `)
        .eq('id', effectiveId)
        .single()

      // If not found as inspection, try to find by lead_id
      if (error || !data) {
        const { data: inspByLead, error: leadError } = await supabase
          .from('inspections')
          .select(`
            id,
            job_number,
            pdf_url,
            pdf_version,
            pdf_approved,
            pdf_approved_at,
            pdf_generated_at,
            lead_id,
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
              property_address_street,
              property_address_suburb,
              property_address_state,
              property_address_postcode
            )
          `)
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

    // Open in new tab for print-to-PDF
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

  // Handle field click from the edit overlay
  function handleFieldClick(field: EditableField) {
    if (field.type === 'image') {
      // Open image upload modal
      setEditingImage({
        key: field.key,
        label: field.label,
        currentUrl: undefined // Would need to fetch from photos table
      })
      setImageModalOpen(true)
    } else {
      // Open text/number edit modal
      const currentValue = getFieldValue(field.key)
      setEditingField({
        key: field.key,
        label: field.label,
        type: field.type === 'currency' ? 'currency' : field.type === 'number' ? 'number' : field.type === 'textarea' ? 'textarea' : 'text',
        currentValue: currentValue
      })
      setEditModalOpen(true)
    }
  }

  // Get current value of a field
  function getFieldValue(fieldKey: string): string | number {
    if (!inspection) return ''

    const fieldMap: Record<string, () => string | number> = {
      'client_name': () => inspection.lead?.full_name || '',
      'property_address': () => {
        const lead = inspection.lead
        if (!lead) return ''
        return [
          lead.property_address_street,
          lead.property_address_suburb,
          lead.property_address_state,
          lead.property_address_postcode
        ].filter(Boolean).join(', ')
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

  // Handle saving edited field
  async function handleSaveField(newValue: string | number | boolean) {
    if (!editingField || !inspection?.id) return

    try {
      const result = await updateFieldAndRegenerate(
        inspection.id,
        editingField.key,
        newValue
      )

      if (result.success) {
        toast.success('Field updated and PDF regenerated!', { id: 'pdf-regen' })
        await loadInspection()
        setEditModalOpen(false)
        setEditingField(null)
      } else {
        toast.error(result.error || 'Failed to update field')
      }
    } catch (error) {
      console.error('Save field error:', error)
      toast.error('Failed to save changes')
    }
  }

  // Handle image upload success
  async function handleImageUploadSuccess() {
    toast.success('Image uploaded!', { id: 'image-upload' })
    await handleGeneratePDF() // Regenerate PDF with new image
    setImageModalOpen(false)
    setEditingImage(null)
  }

  // Loading state
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

  // No PDF generated yet
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
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <RefreshCw className="h-5 w-5 mr-2" />
                  Generate Report
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate(-1)}
              className="h-12 min-h-[48px]"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Go Back
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Main view with Report Preview
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header - Sticky */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-40 shadow-sm">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          {/* Left: Back + Title */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="h-12 w-12 min-h-[48px] min-w-[48px]"
              aria-label="Go back"
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

          {/* Right: Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Version indicator */}
            <span className="hidden sm:inline-flex items-center px-2 py-1 text-xs bg-gray-100 rounded">
              v{inspection.pdf_version || 1}
            </span>

            {/* Mobile: Icon only buttons */}
            <div className="flex sm:hidden gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setEditMode(!editMode)}
                className={`h-12 w-12 min-h-[48px] min-w-[48px] ${editMode ? 'bg-orange-100 border-orange-500' : ''}`}
              >
                {editMode ? <Eye className="h-5 w-5" /> : <Edit className="h-5 w-5" />}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleDownload}
                className="h-12 w-12 min-h-[48px] min-w-[48px]"
              >
                <Download className="h-5 w-5" />
              </Button>
              <Button
                size="icon"
                onClick={handleApprove}
                disabled={inspection.pdf_approved || approving}
                className={`h-12 w-12 min-h-[48px] min-w-[48px] ${
                  inspection.pdf_approved
                    ? 'bg-green-600 hover:bg-green-600'
                    : 'bg-orange-600 hover:bg-orange-700'
                }`}
              >
                {approving ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <CheckCircle className="h-5 w-5" />
                )}
              </Button>
            </div>

            {/* Desktop: Full buttons */}
            <div className="hidden sm:flex gap-2">
              <Button
                variant="outline"
                onClick={handleShowVersions}
                className="h-10"
              >
                <History className="h-4 w-4 mr-2" />
                History
              </Button>
              <Button
                variant={editMode ? 'default' : 'outline'}
                onClick={() => setEditMode(!editMode)}
                className={editMode ? 'bg-orange-600 hover:bg-orange-700' : ''}
              >
                {editMode ? (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    View Mode
                  </>
                ) : (
                  <>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Mode
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleGeneratePDF}
                disabled={generating}
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Regenerate
              </Button>
              <Button
                variant="outline"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button
                onClick={handleApprove}
                disabled={inspection.pdf_approved || approving}
                className={
                  inspection.pdf_approved
                    ? 'bg-green-600 hover:bg-green-600'
                    : 'bg-orange-600 hover:bg-orange-700'
                }
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
                  onClick={() => {
                    setInspection(prev => prev ? { ...prev, pdf_url: v.pdf_url } : null)
                  }}
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

      {/* Edit Mode Indicator */}
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
        />
      </div>

      {/* Approved Badge */}
      {inspection.pdf_approved && (
        <div className="fixed bottom-24 md:bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 z-50">
          <CheckCircle className="h-5 w-5" />
          <span className="font-medium">Approved</span>
        </div>
      )}

      {/* Edit Field Modal */}
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

      {/* Image Upload Modal */}
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
    </div>
  )
}

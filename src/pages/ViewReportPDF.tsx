// ViewReportPDF Page
// View, edit, and approve inspection PDF reports
// Mobile-first design with 48px touch targets
// Page 1: inline edit buttons next to each field on the PDF
// Pages 2+: toggle edit mode for overlay buttons

import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { ReportPreviewHTML } from '@/components/pdf/ReportPreviewHTML'
import type { Page1Data, VPData, OutdoorData, AreaRecord, SubfloorEditData, CostData } from '@/components/pdf/ReportPreviewHTML'
import { EditFieldModal } from '@/components/pdf/EditFieldModal'
import { ImageUploadModal } from '@/components/pdf/ImageUploadModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
  Mail,
  X,
  FileText,
} from 'lucide-react'
import {
  generateInspectionPDF,
  approvePDF,
  getPDFVersionHistory,
} from '@/lib/api/pdfGeneration'
import { StalePdfBanner } from '@/components/pdf/StalePdfBanner'
import { sendEmail, sendSlackNotification, buildReportApprovedHtml, buildJobReportEmailHtml } from '@/lib/api/notifications'
import { generateJobReportPdf } from '@/lib/api/jobReportPdf'
import { uploadInspectionPhoto, deleteInspectionPhoto, loadInspectionPhotos, getPhotoSignedUrl } from '@/lib/utils/photoUpload'
import { recordPhotoHistory } from '@/lib/utils/photoHistory'
import { logFieldEdits } from '@/lib/api/fieldEditLog'
import { PhotoCaptionPromptDialog } from '@/components/photos/PhotoCaptionPromptDialog'
// Lazy-loaded: convertHtmlToPdf is ~600KB (html2canvas + jsPDF)
import { resizePhoto } from '@/lib/offline/photoResizer'
import { formatDateAU } from '@/lib/dateUtils'
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
  pdf_blob_url?: string | null
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
  labour_cost_ex_gst?: number
  equipment_cost_ex_gst?: number
  subtotal_ex_gst?: number
  gst_amount?: number
  total_inc_gst?: number
  option_selected?: number | null
  treatment_methods?: string[] | null
  option_1_labour_ex_gst?: number | null
  option_1_equipment_ex_gst?: number | null
  option_1_total_inc_gst?: number | null
  option_2_total_inc_gst?: number | null
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

// Select query for inspections (used in both load paths).
// Stage 3.4.5: AI summary text fields (what_we_found_text, what_we_will_do_text,
// what_you_get_text, problem_analysis_content, demolition_content, ai_summary_text)
// are no longer selected from inspections — they're fetched from the
// latest_ai_summary view in loadInspection() and merged onto the inspection
// object after fetch.
const INSPECTION_SELECT = `
  id,
  job_number,
  pdf_url,
  pdf_version,
  pdf_approved,
  pdf_approved_at,
  pdf_generated_at,
  pdf_blob_url,
  lead_id,
  requested_by,
  attention_to,
  inspection_date,
  inspector_name,
  dwelling_type,
  what_we_discovered,
  identified_causes,
  why_this_happened,
  cause_of_mould,
  outdoor_temperature,
  outdoor_humidity,
  outdoor_dew_point,
  outdoor_comments,
  labour_cost_ex_gst,
  equipment_cost_ex_gst,
  subtotal_ex_gst,
  gst_amount,
  total_inc_gst,
  option_selected,
  treatment_methods,
  option_1_labour_ex_gst,
  option_1_equipment_ex_gst,
  option_1_total_inc_gst,
  option_2_total_inc_gst,
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

function JobReportPreview({ htmlUrl }: { htmlUrl: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [htmlContent, setHtmlContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [iframeHeight, setIframeHeight] = useState(1200)

  useEffect(() => {
    let cancelled = false

    async function fetchHtml() {
      try {
        setLoading(true)
        setError(null)

        let raw: string | null = null

        if (htmlUrl.includes('supabase') && htmlUrl.includes('/storage/')) {
          const pathMatch = htmlUrl.match(/inspection-reports\/(.+)$/)
          if (pathMatch) {
            const { data, error: dlErr } = await supabase.storage
              .from('inspection-reports')
              .download(pathMatch[1])
            if (!dlErr && data) raw = await data.text()
          }
        }

        if (!raw) {
          const res = await fetch(htmlUrl, { mode: 'cors', credentials: 'omit' })
          if (!res.ok) throw new Error(`Failed to fetch report: ${res.status}`)
          raw = await res.text()
        }

        if (cancelled) return

        setHtmlContent(raw)
        setLoading(false)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load report')
          setLoading(false)
        }
      }
    }

    if (htmlUrl) fetchHtml()
    return () => {
      cancelled = true
    }
  }, [htmlUrl])

  function handleIframeLoad() {
    const doc = iframeRef.current?.contentDocument
    if (!doc) return
    // Give fonts + background images a tick to settle before measuring.
    const measure = () => {
      const h = Math.max(doc.body.scrollHeight, doc.documentElement.scrollHeight)
      if (h > 0) setIframeHeight(h)
    }
    measure()
    window.setTimeout(measure, 300)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-3 text-gray-500">Loading report...</span>
      </div>
    )
  }

  if (error || !htmlContent) {
    return (
      <div className="text-center space-y-2 py-20">
        <AlertCircle className="h-12 w-12 text-red-400 mx-auto" />
        <p className="text-red-600 font-medium">Failed to load report</p>
        {error && <p className="text-sm text-gray-500">{error}</p>}
      </div>
    )
  }

  return (
    <iframe
      ref={iframeRef}
      title="Job Completion Report"
      srcDoc={htmlContent}
      sandbox="allow-same-origin allow-scripts"
      onLoad={handleIframeLoad}
      className="bg-white shadow-2xl mx-auto block"
      style={{ width: '794px', height: `${iframeHeight}px`, border: 'none' }}
    />
  )
}

export default function ViewReportPDF() {
  const { inspectionId, id, leadId } = useParams<{ inspectionId?: string; id?: string; leadId?: string }>()
  const effectiveId = inspectionId || id || leadId
  const navigate = useNavigate()
  const location = useLocation()
  const reportType: 'inspection' | 'job' = location.pathname.startsWith('/admin/job-report') ? 'job' : 'inspection'
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()

  const [inspection, setInspection] = useState<Inspection | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [approving, setApproving] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [showVersions, setShowVersions] = useState(false)
  const [jobPdfUrlOverride, setJobPdfUrlOverride] = useState<string | null>(null)
  const [versions, setVersions] = useState<PDFVersion[]>([])

  // PDF upload for email attachment
  const [showPdfUpload, setShowPdfUpload] = useState(false)
  const [pdfUploading, setPdfUploading] = useState(false)

  // Email approval stage
  const [stage, setStage] = useState<'report' | 'email-approval'>('report')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [emailRecipient, setEmailRecipient] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)

  function prefillEmailAndOpenStage() {
    if (reportType === 'job' && jobCompletion) {
      const lead = jobCompletion.lead as { full_name?: string; email?: string; property_address_street?: string; property_address_suburb?: string } | null
      const addr = lead ? [lead.property_address_street, lead.property_address_suburb].filter(Boolean).join(', ') : ''
      setEmailRecipient(lead?.email || '')
      setEmailSubject(`Your Job Completion Report — ${jobCompletion.job_number || 'Mould & Restoration Co'}`)
      setEmailBody(
        `Hi ${lead?.full_name || 'there'},\n\n` +
        `Great news — the remediation work at ${addr} has been completed` +
        `${jobCompletion.job_number ? ` (Ref: ${jobCompletion.job_number})` : ''}.\n\n` +
        `Please find the job completion report attached for your records.\n\n` +
        `If you have any questions, please don't hesitate to get in touch.\n\n` +
        `Kind regards,\nMould & Restoration Co.\n0433 880 403`
      )
      setStage('email-approval')
      return
    }
    const lead = inspection?.lead
    const addr = lead ? [lead.property_address_street, lead.property_address_suburb].filter(Boolean).join(', ') : ''
    setEmailRecipient(lead?.email || '')
    setEmailSubject(`Your Inspection Report — ${inspection?.job_number || 'Mould & Restoration Co'}`)
    setEmailBody(
      `Hi ${lead?.full_name || 'there'},\n\n` +
      `Great news — your mould inspection report for ${addr} has been completed and approved` +
      `${inspection?.job_number ? ` (Ref: ${inspection.job_number})` : ''}.\n\n` +
      `Our team has thoroughly reviewed the findings and the report is now ready for you.\n\n` +
      `If you have any questions about the report or would like to discuss remediation options, please don't hesitate to get in touch.\n\n` +
      `Kind regards,\nMould & Restoration Co.\n0433 880 403`
    )
    setStage('email-approval')
  }

  // Job report field editing
  const [jobEditOpen, setJobEditOpen] = useState(false)
  const [jobEditField, setJobEditField] = useState<{
    column: string
    label: string
    type: 'text' | 'textarea' | 'date' | 'select'
    currentValue: string
    options?: string[]
  } | null>(null)
  const [jobEditValue, setJobEditValue] = useState('')
  const [jobEditSaving, setJobEditSaving] = useState(false)

  // Job report photo editing
  const [jobPhotoPickerOpen, setJobPhotoPickerOpen] = useState(false)
  const [jobPhotoPickerCategory, setJobPhotoPickerCategory] = useState<'before' | 'after' | 'demolition'>('before')
  const [jobReplacingPhotoId, setJobReplacingPhotoId] = useState<string | null>(null)
  const [jobPhotoPool, setJobPhotoPool] = useState<Array<{ key: string; label: string; photos: Array<{ id: string; signed_url: string }> }>>([])
  const [jobPhotoPoolLoading, setJobPhotoPoolLoading] = useState(false)
  const jobUploadRef = useRef<HTMLInputElement>(null)
  const areaUploadRef = useRef<HTMLInputElement>(null)
  const [jobPhotoUploading, setJobPhotoUploading] = useState(false)

  // Stage 4.1: caption-required prompt for the two admin photo-replace flows
  // (handleJobPhotoUpload, handleUploadNewAreaPhoto). Captured before the file
  // picker opens, then attached to the upload metadata.
  const [captionPromptOpen, setCaptionPromptOpen] = useState(false)
  const [captionPromptKind, setCaptionPromptKind] = useState<'job' | 'area'>('area')
  const pendingCaptionRef = useRef<string>('')

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

  // Subfloor data + photos
  const [subfloorData, setSubfloorData] = useState<{ id: string; observations: string; comments: string; landscape: string } | null>(null)
  const [subfloorReadings, setSubfloorReadings] = useState<Array<{ id: string; location: string; moisture_percentage: number; reading_order: number }>>([])
  const [subfloorPhotos, setSubfloorPhotos] = useState<Array<{ id: string; storage_path: string; signed_url: string }>>([])
  const [subfloorPhotosLoading, setSubfloorPhotosLoading] = useState(false)
  const [subfloorEditOpen, setSubfloorEditOpen] = useState(false)
  const [subfloorPhotoPickerOpen, setSubfloorPhotoPickerOpen] = useState(false)
  const [subfloorPhotoPickerLoading, setSubfloorPhotoPickerLoading] = useState(false)
  const [replacingSubfloorPhotoId, setReplacingSubfloorPhotoId] = useState<string | null>(null)

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

  // Auto-open email stage if navigated with ?action=send-email
  useEffect(() => {
    if (inspection && !loading && searchParams.get('action') === 'send-email') {
      prefillEmailAndOpenStage()
      // Clear the query param so it doesn't re-trigger
      searchParams.delete('action')
      setSearchParams(searchParams, { replace: true })
    }
  }, [inspection, loading])

  // Job completion data — only fetched when viewing a job report
  const { data: jobCompletion, isLoading: jobCompletionLoading, refetch: refetchJobCompletion } = useQuery({
    queryKey: ['job-completion-report', effectiveId],
    queryFn: async () => {
      if (!effectiveId) return null
      const { data, error } = await supabase
        .from('job_completions')
        .select('*, lead:leads(id, full_name, email, property_address_street, property_address_suburb, property_address_state, property_address_postcode, status)')
        .eq('lead_id', effectiveId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) console.error('Failed to fetch job completion:', error)
      return data
    },
    enabled: reportType === 'job' && !!effectiveId,
  })

  // Job report version history
  const { data: jobVersions = [] } = useQuery({
    queryKey: ['job-report-versions', jobCompletion?.id],
    queryFn: async () => {
      if (!jobCompletion?.id) return []
      const { data } = await supabase
        .from('job_completion_pdf_versions')
        .select('id, version_number, pdf_url, created_at, generated_by')
        .eq('job_completion_id', jobCompletion.id)
        .order('version_number', { ascending: false })
      return data || []
    },
    enabled: reportType === 'job' && !!jobCompletion?.id,
  })

  // Job report photos for edit panel
  const { data: jobPhotos = { before: [] as Array<{ id: string; signed_url: string }>, after: [] as Array<{ id: string; signed_url: string }>, demolition: [] as Array<{ id: string; signed_url: string }> }, refetch: refetchJobPhotos } = useQuery({
    queryKey: ['job-report-photos', jobCompletion?.id, editMode],
    queryFn: async () => {
      if (!jobCompletion?.id) return { before: [], after: [], demolition: [] }
      const { data } = await supabase
        .from('photos')
        .select('id, storage_path, photo_category')
        .eq('job_completion_id', jobCompletion.id)
        .in('photo_category', ['before', 'after', 'demolition'])
        .is('deleted_at', null)
        .order('created_at', { ascending: true })

      const withUrls = await Promise.all((data || []).map(async (p) => {
        const { data: urlData } = await supabase.storage
          .from('inspection-photos')
          .createSignedUrl(p.storage_path, 3600)
        return { id: p.id, photo_category: p.photo_category, signed_url: urlData?.signedUrl || '' }
      }))

      const valid = withUrls.filter(p => p.signed_url)
      return {
        before: valid.filter(p => p.photo_category === 'before'),
        after: valid.filter(p => p.photo_category === 'after'),
        demolition: valid.filter(p => p.photo_category === 'demolition'),
      }
    },
    enabled: reportType === 'job' && !!jobCompletion?.id && editMode,
  })

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

      const inspId = (data as unknown as Inspection).id

      // Stage 3.4.5: AI summary text comes from latest_ai_summary view.
      const { data: latestSummary } = await supabase
        .from('latest_ai_summary')
        .select('ai_summary_text, what_we_found_text, what_we_will_do_text, what_you_get_text, problem_analysis_content, demolition_content')
        .eq('inspection_id', inspId)
        .maybeSingle()

      const merged = {
        ...(data as unknown as Inspection),
        ai_summary_text: latestSummary?.ai_summary_text ?? undefined,
        what_we_found_text: latestSummary?.what_we_found_text ?? undefined,
        what_we_will_do_text: latestSummary?.what_we_will_do_text ?? undefined,
        what_you_get_text: latestSummary?.what_you_get_text ?? undefined,
        problem_analysis_content: latestSummary?.problem_analysis_content ?? undefined,
        demolition_content: latestSummary?.demolition_content ?? undefined,
      }
      setInspection(merged)

      // Fetch inspection_areas for inline editing
      const { data: areas, error: areasError } = await supabase
        .from('inspection_areas')
        .select('id, area_name, temperature, humidity, dew_point, external_moisture, internal_moisture, mould_visible_locations, comments, extra_notes')
        .eq('inspection_id', inspId)
        .order('area_order', { ascending: true })

      if (areasError) {
        console.warn('[ViewReportPDF] Failed to load inspection areas:', areasError)
      } else {
      }
      setAreasData((areas || []) as AreaRecord[])

      // Load subfloor data (Phase 5 — subfloor_required column dropped;
      // subfloor section now renders when subfloor_data row exists)
      {
        const { data: sfData } = await supabase
          .from('subfloor_data')
          .select('id, observations, comments, landscape')
          .eq('inspection_id', inspId)
          .single()

        if (sfData) {
          setSubfloorData(sfData)

          // Load subfloor readings
          const { data: sfReadings } = await supabase
            .from('subfloor_readings')
            .select('id, location, moisture_percentage, reading_order')
            .eq('subfloor_id', sfData.id)
            .order('reading_order', { ascending: true })

          setSubfloorReadings((sfReadings || []).map(r => ({
            ...r,
            moisture_percentage: parseFloat(String(r.moisture_percentage)) || 0,
          })))

        }
      }
    } catch (error) {
      console.error('Load error:', error)
      toast.error('Failed to load inspection')
    } finally {
      setLoading(false)
    }
  }

  async function handleGeneratePDF() {
    if (reportType === 'job' && jobCompletion) {
      setGenerating(true)
      try {
        await generateJobReportPdf(jobCompletion.id)
        toast.success('Job report regenerated')
        refetchJobCompletion()
      } catch (err) {
        toast.error('Failed to regenerate job report')
        console.error(err)
      } finally {
        setGenerating(false)
      }
      return
    }

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

  const JOB_EDITABLE_FIELDS = [
    { column: 'requested_by', label: 'Requested By', type: 'text' as const },
    { column: 'attention_to', label: 'Attention To', type: 'text' as const },
    { column: 'completion_date', label: 'Completion Date', type: 'date' as const },
    { column: 'premises_type', label: 'Premises Type', type: 'select' as const, options: ['residential', 'commercial'] },
    { column: 'additional_notes', label: 'Additional Notes', type: 'textarea' as const },
    { column: 'scope_what_changed', label: 'What Changed', type: 'textarea' as const },
    { column: 'scope_why_changed', label: 'Why Changed', type: 'textarea' as const },
    { column: 'scope_extra_work', label: 'Extra Work', type: 'textarea' as const },
    { column: 'scope_reduced', label: 'Scope Reduced', type: 'textarea' as const },
    { column: 'demolition_justification', label: 'Demolition Justification', type: 'textarea' as const },
    { column: 'demolition_removal_notes', label: 'Demolition Removal Notes', type: 'textarea' as const },
  ]

  function getJobFieldValue(column: string): string {
    if (!jobCompletion) return ''
    const val = (jobCompletion as Record<string, unknown>)[column]
    return val != null ? String(val) : ''
  }

  function openJobFieldEdit(column: string, label: string, type: 'text' | 'textarea' | 'date' | 'select', currentValue: string, options?: string[]) {
    setJobEditField({ column, label, type, currentValue, options })
    setJobEditValue(currentValue)
    setJobEditOpen(true)
  }

  async function handleJobFieldSave() {
    if (!jobCompletion?.id || !jobEditField) return
    setJobEditSaving(true)
    try {
      await supabase
        .from('job_completions')
        .update({ [jobEditField.column]: jobEditValue || null })
        .eq('id', jobCompletion.id)

      toast.success(`${jobEditField.label} updated`)
      setJobEditOpen(false)
      setJobEditField(null)
      setJobPdfUrlOverride(null)
    } catch (err) {
      toast.error('Failed to update field')
      console.error(err)
    } finally {
      setJobEditSaving(false)
    }
  }

  async function openJobPhotoPicker(replacingId: string, category: 'before' | 'after' | 'demolition') {
    setJobReplacingPhotoId(replacingId)
    setJobPhotoPickerCategory(category)
    setJobPhotoPickerOpen(true)
    setJobPhotoPoolLoading(true)

    try {
      const inspectionId = jobCompletion?.inspection_id
      if (!inspectionId) { setJobPhotoPoolLoading(false); return }

      const [photosResult, areasResult] = await Promise.all([
        supabase
          .from('photos')
          .select('id, storage_path, photo_type, photo_category, area_id')
          .eq('inspection_id', inspectionId)
          .is('deleted_at', null)
          .order('order_index', { ascending: true }),
        supabase
          .from('inspection_areas')
          .select('id, area_name')
          .eq('inspection_id', inspectionId),
      ])

      const areaNameMap = new Map<string, string>()
      if (areasResult.data) {
        for (const a of areasResult.data) areaNameMap.set(a.id, a.area_name)
      }

      const withUrls = await Promise.all((photosResult.data || []).map(async (p) => {
        const { data: urlData } = await supabase.storage
          .from('inspection-photos')
          .createSignedUrl(p.storage_path, 3600)
        return { ...p, signed_url: urlData?.signedUrl || '' }
      }))

      const valid = withUrls.filter(p => p.signed_url)

      const areaGroups = new Map<string, Array<{ id: string; signed_url: string }>>()
      const subfloor: Array<{ id: string; signed_url: string }> = []
      const outdoor: Array<{ id: string; signed_url: string }> = []
      const general: Array<{ id: string; signed_url: string }> = []
      const after: Array<{ id: string; signed_url: string }> = []
      const demolition: Array<{ id: string; signed_url: string }> = []

      for (const p of valid) {
        if (p.photo_category === 'after') { after.push(p); continue }
        if (p.photo_category === 'demolition') { demolition.push(p); continue }
        const type = p.photo_type ?? 'general'
        if (type === 'area' && p.area_id) {
          if (!areaGroups.has(p.area_id)) areaGroups.set(p.area_id, [])
          areaGroups.get(p.area_id)!.push(p)
        } else if (type === 'subfloor') { subfloor.push(p) }
        else if (type === 'outdoor') { outdoor.push(p) }
        else { general.push(p) }
      }

      const groups: Array<{ key: string; label: string; photos: Array<{ id: string; signed_url: string }> }> = []
      for (const [areaId, photos] of areaGroups) {
        groups.push({ key: `area-${areaId}`, label: areaNameMap.get(areaId) ?? 'Area', photos })
      }
      if (subfloor.length > 0) groups.push({ key: 'subfloor', label: 'Subfloor', photos: subfloor })
      if (outdoor.length > 0) groups.push({ key: 'outdoor', label: 'Outdoor / External', photos: outdoor })
      if (general.length > 0) groups.push({ key: 'general', label: 'General', photos: general })
      if (after.length > 0) groups.push({ key: 'after', label: 'After Photos', photos: after })
      if (demolition.length > 0) groups.push({ key: 'demolition', label: 'Demolition Photos', photos: demolition })

      setJobPhotoPool(groups)
    } catch {
      setJobPhotoPool([])
    } finally {
      setJobPhotoPoolLoading(false)
    }
  }

  async function handleJobPhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (jobUploadRef.current) jobUploadRef.current.value = ''
    if (!file || !jobCompletion?.inspection_id) return

    const caption = pendingCaptionRef.current.trim()
    if (!caption) {
      toast.error('Caption required — please try uploading again')
      return
    }

    setJobPhotoUploading(true)
    try {
      const { uploadInspectionPhoto: upload } = await import('@/lib/utils/photoUpload')
      const result = await upload(file, {
        inspection_id: jobCompletion.inspection_id,
        photo_type: 'general',
        caption,
      })
      toast.success('Photo uploaded')
      await handleJobPhotoSwap(result.photo_id)
    } catch (err) {
      console.error('Upload failed:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to upload photo')
    } finally {
      pendingCaptionRef.current = ''
      setJobPhotoUploading(false)
    }
  }

  async function handleJobPhotoSwap(newPhotoId: string) {
    if (!jobReplacingPhotoId || !jobCompletion?.id) return
    setJobPhotoPickerOpen(false)

    try {
      // The original if/else passed the same category in both branches
      // (the 'before' branch and the else fall-through with 'before' as
      // jobPhotoPickerCategory both wrote 'before'). Collapsed to one path.
      const swapCategory = jobPhotoPickerCategory

      // Stage 4.3: guard against resurrecting soft-deleted rows
      await supabase.from('photos')
        .update({ job_completion_id: null, photo_category: null })
        .eq('id', jobReplacingPhotoId)
        .is('deleted_at', null)
      await supabase.from('photos')
        .update({ job_completion_id: jobCompletion.id, photo_category: swapCategory })
        .eq('id', newPhotoId)
        .is('deleted_at', null)

      // Stage 4.2: domain-level history for both ends of the swap.
      // Non-blocking — never throws.
      await recordPhotoHistory({
        photo_id: jobReplacingPhotoId,
        inspection_id: jobCompletion.inspection_id,
        action: 'category_changed',
        before: { photo_category: swapCategory, job_completion_id: jobCompletion.id },
        after: { photo_category: null, job_completion_id: null },
      })
      await recordPhotoHistory({
        photo_id: newPhotoId,
        inspection_id: jobCompletion.inspection_id,
        action: 'category_changed',
        before: { photo_category: null, job_completion_id: null },
        after: { photo_category: swapCategory, job_completion_id: jobCompletion.id },
      })

      toast.success('Photo swapped')
      setJobReplacingPhotoId(null)
      setJobPdfUrlOverride(null)
      refetchJobPhotos()
    } catch (err) {
      console.error('Photo swap failed:', err)
      toast.error('Failed to swap photo')
    }
  }

  async function handleApprove() {
    if (reportType === 'job' && jobCompletion) {
      setApproving(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        await supabase.from('job_completions').update({
          pdf_approved: true,
          pdf_approved_at: new Date().toISOString(),
          pdf_approved_by: user?.id,
        }).eq('id', jobCompletion.id)
        await supabase.from('activities').insert({
          lead_id: jobCompletion.lead_id,
          activity_type: 'status_change',
          title: 'Job report approved',
          description: 'Admin approved the job completion report',
        })
        toast.success('Job report approved — review email before sending')
        await refetchJobCompletion()
        prefillEmailAndOpenStage()
      } catch (err) {
        toast.error('Failed to approve')
        console.error(err)
      } finally {
        setApproving(false)
      }
      return
    }

    if (!inspection?.id) return

    setApproving(true)
    toast.loading('Approving report...', { id: 'approve' })

    try {
      const result = await approvePDF(inspection.id)

      if (result.success) {
        toast.success('Report approved! Redirecting to lead...', { id: 'approve' })

        // Navigate to Lead View page
        if (inspection.lead_id) {
          navigate(`/leads/${inspection.lead_id}`)
        } else {
          await loadInspection()
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

  async function handleSendEmail() {
    if (reportType === 'job' && jobCompletion) {
      const lead = jobCompletion.lead as { id: string; full_name: string; email?: string; property_address_street?: string; property_address_suburb?: string; property_address_state?: string; property_address_postcode?: string } | null
      if (!lead) {
        toast.error('Lead not found')
        return
      }
      const recipient = emailRecipient.trim()
      if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
        toast.error('Please enter a valid recipient email')
        return
      }
      if (!jobCompletion.pdf_url) {
        toast.error('No job report available')
        return
      }

      setSendingEmail(true)
      toast.loading('Converting report to PDF...', { id: 'send-email' })

      try {
        const address = [lead.property_address_street, lead.property_address_suburb, lead.property_address_state, lead.property_address_postcode].filter(Boolean).join(', ')

        // 1. Get PDF content as base64 (match inspection pattern)
        let base64Content: string

        const jobBlobUrl = (jobCompletion as { pdf_blob_url?: string | null }).pdf_blob_url
        if (jobBlobUrl) {
          // Use stored browser-rendered PDF if available
          toast.loading('Preparing PDF attachment...', { id: 'send-email' })
          const { data: pdfData, error: pdfError } = await supabase.storage
            .from('report-pdfs')
            .download(jobBlobUrl)
          if (pdfError || !pdfData) throw new Error('Failed to download stored PDF')
          const arrayBuffer = await pdfData.arrayBuffer()
          base64Content = btoa(
            new Uint8Array(arrayBuffer).reduce((s, b) => s + String.fromCharCode(b), '')
          )
        } else {
          // Fallback: fetch HTML from storage and convert client-side
          toast.loading('Generating PDF from report HTML...', { id: 'send-email' })
          let htmlContent: string
          const pathMatch = jobCompletion.pdf_url.match(/inspection-reports\/(.+)$/)
          if (pathMatch) {
            const { data, error } = await supabase.storage
              .from('inspection-reports')
              .download(pathMatch[1])
            if (error || !data) throw new Error('Failed to download report file')
            htmlContent = await data.text()
          } else {
            const response = await fetch(jobCompletion.pdf_url)
            if (!response.ok) throw new Error('Failed to fetch report file')
            htmlContent = await response.text()
          }
          const { convertHtmlToPdf } = await import('@/lib/utils/htmlToPdf')
          const pdfBlob = await convertHtmlToPdf(htmlContent)
          base64Content = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve((reader.result as string).split(',')[1])
            reader.onerror = reject
            reader.readAsDataURL(pdfBlob)
          })
        }

        // 2. Build email HTML via the canonical branded builder.
        // customMessage threads the admin's edited body into the branded shell
        // (header + details box + CTA + signature + disclaimer all preserved).
        toast.loading('Sending email...', { id: 'send-email' })
        const completionDate = formatDateAU(jobCompletion.completion_date as string | null | undefined) || ''
        const emailHtml = buildJobReportEmailHtml({
          customerName: lead.full_name,
          propertyAddress: address,
          jobNumber: jobCompletion.job_number || '',
          completionDate,
          pdfUrl: jobCompletion.pdf_url,
          customMessage: emailBody.trim() || undefined,
        })

        // 3. Filename
        const jobNumber = jobCompletion.job_number || 'Report'
        const filename = `MRC-${jobNumber}-Job-Report.pdf`

        // 4. Send email with PDF attachment
        await sendEmail({
          to: recipient,
          subject: emailSubject,
          html: emailHtml,
          leadId: lead.id,
          templateName: 'job_report_sent',
          attachments: [{
            filename,
            content: base64Content,
            content_type: 'application/pdf',
          }],
        })

        // 5. Slack notification
        sendSlackNotification({
          event: 'report_approved',
          leadId: lead.id,
          leadName: lead.full_name,
          propertyAddress: address,
        })

        // 6. Update lead status + activity log (surface errors — do not swallow)
        const { error: statusErr } = await supabase
          .from('leads')
          .update({ status: 'job_report_pdf_sent' })
          .eq('id', lead.id)
        if (statusErr) {
          console.error('Lead status update failed:', statusErr)
          toast.error(`Email sent but status update failed: ${statusErr.message}`, { id: 'send-email' })
        }
        await logFieldEdits({
          leadId: lead.id,
          entityType: 'lead',
          entityId: lead.id,
          changes: [{ field: 'status', old: (lead as { id: string; full_name: string; email?: string; property_address_street?: string; property_address_suburb?: string; property_address_state?: string; property_address_postcode?: string; status?: string }).status ?? null, new: 'job_report_pdf_sent' }],
          extraMetadata: { trigger: 'job_report_emailed', recipient },
        }).catch(err => console.error('Activity log failed:', err))
        queryClient.invalidateQueries({ queryKey: ['activity-timeline'] })

        toast.success(`Email sent to ${recipient} with PDF attached!`, { id: 'send-email' })
        navigate(`/leads/${lead.id}`)
      } catch (err) {
        console.error('Job report send error:', err)
        const msg = err instanceof Error ? err.message : 'Failed to send email'
        toast.error(msg, { id: 'send-email' })
      } finally {
        setSendingEmail(false)
      }
      return
    }

    if (!inspection?.id) return

    const lead = inspection.lead
    if (!lead) {
      toast.error('Lead not found')
      return
    }
    const recipient = emailRecipient.trim()
    if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
      toast.error('Please enter a valid recipient email')
      return
    }

    if (!inspection.pdf_url) {
      toast.error('No PDF report available')
      return
    }

    setSendingEmail(true)
    toast.loading('Converting report to PDF...', { id: 'send-email' })

    try {
      const address = [lead.property_address_street, lead.property_address_suburb].filter(Boolean).join(', ')

      // 1. Get PDF content as base64
      let base64Content: string

      if (inspection.pdf_blob_url) {
        // Use stored browser-rendered PDF (perfect quality)
        toast.loading('Preparing PDF attachment...', { id: 'send-email' })
        const { data: pdfData, error: pdfError } = await supabase.storage
          .from('report-pdfs')
          .download(inspection.pdf_blob_url)
        if (pdfError || !pdfData) throw new Error('Failed to download stored PDF')
        const arrayBuffer = await pdfData.arrayBuffer()
        base64Content = btoa(
          new Uint8Array(arrayBuffer).reduce((s, b) => s + String.fromCharCode(b), '')
        )
      } else {
        // Fallback: client-side conversion (lower quality — user should upload PDF first)
        toast.loading('Generating PDF (upload saved PDF for better quality)...', { id: 'send-email' })
        let htmlContent: string
        const pathMatch = inspection.pdf_url!.match(/inspection-reports\/(.+)$/)
        if (pathMatch) {
          const { data, error } = await supabase.storage
            .from('inspection-reports')
            .download(pathMatch[1])
          if (error || !data) throw new Error('Failed to download report file')
          htmlContent = await data.text()
        } else {
          const response = await fetch(inspection.pdf_url!)
          if (!response.ok) throw new Error('Failed to fetch report file')
          htmlContent = await response.text()
        }
        const { convertHtmlToPdf } = await import('@/lib/utils/htmlToPdf')
        const pdfBlob = await convertHtmlToPdf(htmlContent)
        base64Content = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve((reader.result as string).split(',')[1])
          reader.onerror = reject
          reader.readAsDataURL(pdfBlob)
        })
      }

      // 2. Build branded HTML email body (include custom message if provided)
      toast.loading('Sending email...', { id: 'send-email' })
      const emailHtml = buildReportApprovedHtml({
        customerName: lead.full_name,
        address,
        jobNumber: inspection.job_number || undefined,
        customMessage: emailBody.trim() || undefined,
      })

      // 5. Build filename
      const jobNumber = inspection.job_number || 'Report'
      const filename = `MRC-${jobNumber}-Inspection-Report.pdf`

      // 6. Send email with PDF attachment
      await sendEmail({
        to: recipient,
        subject: emailSubject,
        html: emailHtml,
        leadId: lead.id,
        inspectionId: inspection.id,
        templateName: 'report-approved',
        attachments: [{
          filename,
          content: base64Content,
          content_type: 'application/pdf',
        }],
      })

      // 7. Send Slack notification
      sendSlackNotification({
        event: 'report_approved',
        leadId: lead.id,
        leadName: lead.full_name,
        propertyAddress: address,
      })

      // 8. Update lead status to closed
      await supabase
        .from('leads')
        .update({ status: 'closed' })
        .eq('id', lead.id)

      toast.success(`Email sent to ${recipient} with PDF attached!`, { id: 'send-email' })

      // 9. Redirect to Lead View
      navigate(`/leads/${lead.id}`)
    } catch (error) {
      console.error('Send email error:', error)
      const msg = error instanceof Error ? error.message : 'Failed to send email'
      toast.error(msg, { id: 'send-email' })
    } finally {
      setSendingEmail(false)
    }
  }

  async function handleDownload() {
    if (reportType === 'job') {
      const pdfUrl = jobPdfUrlOverride || jobCompletion?.pdf_url
      if (!pdfUrl) { toast.error('PDF not yet generated'); return }

      toast.loading('Preparing PDF...', { id: 'download' })
      try {
        let html: string
        const pathMatch = pdfUrl.match(/inspection-reports\/(.+)$/)
        if (pathMatch) {
          const { data, error } = await supabase.storage
            .from('inspection-reports')
            .download(pathMatch[1])
          if (error || !data) throw new Error('Failed to download report')
          html = await data.text()
        } else {
          const response = await fetch(pdfUrl)
          if (!response.ok) throw new Error('Failed to fetch report')
          html = await response.text()
        }

        const title = jobCompletion?.job_number || 'Job_Report'
        const modifiedHtml = html.replace(
          /<head>/i,
          `<head><title>${title}</title>`
        ) + '\n<script>window.onload=function(){setTimeout(function(){window.print()},600)}</script>'

        const blob = new Blob([modifiedHtml], { type: 'text/html' })
        const blobUrl = URL.createObjectURL(blob)
        const printWindow = window.open(blobUrl, '_blank')
        if (!printWindow) {
          toast.error('Pop-up blocked — please allow pop-ups', { id: 'download' })
          URL.revokeObjectURL(blobUrl)
          return
        }
        toast.success('Print dialog opening — select "Save as PDF"', { id: 'download' })
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000)
      } catch (error) {
        console.error('Job report download failed:', error)
        toast.error('Failed to prepare PDF', { id: 'download' })
      }
      return
    }

    if (!inspection?.pdf_url) {
      toast.error('PDF not yet generated')
      return
    }

    toast.loading('Preparing PDF...', { id: 'download' })

    try {
      // Fetch the HTML report from Supabase Storage
      let html: string
      const pathMatch = inspection.pdf_url.match(/inspection-reports\/(.+)$/)

      if (pathMatch) {
        const storagePath = pathMatch[1]
        const { data, error } = await supabase.storage
          .from('inspection-reports')
          .download(storagePath)

        if (error || !data) throw new Error('Failed to download report')
        html = await data.text()
      } else {
        const response = await fetch(inspection.pdf_url)
        if (!response.ok) throw new Error('Failed to fetch report')
        html = await response.text()
      }

      // Build filename from job number
      const jobNumber = inspection.job_number || 'report'
      const title = `MRC-${jobNumber}`

      // Inject <title> for PDF filename and auto-print script
      const modifiedHtml = html.replace(
        /<head>/i,
        `<head><title>${title}</title>`
      ) + '\n<script>window.onload=function(){setTimeout(function(){window.print()},600)}</script>'

      // Create blob URL and open in new tab
      const blob = new Blob([modifiedHtml], { type: 'text/html' })
      const blobUrl = URL.createObjectURL(blob)

      const printWindow = window.open(blobUrl, '_blank')
      if (!printWindow) {
        toast.error('Pop-up blocked — please allow pop-ups for this site', { id: 'download' })
        URL.revokeObjectURL(blobUrl)
        return
      }

      toast.success('Print dialog opening — select "Save as PDF"', { id: 'download' })
      setShowPdfUpload(true)

      // Clean up blob URL after 60s
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000)
    } catch (error) {
      console.error('Download failed:', error)
      toast.error('Failed to prepare PDF', { id: 'download' })
    }
  }

  async function handlePdfUpload(file: File) {
    if (!inspection?.id) return
    setPdfUploading(true)
    try {
      const path = `${inspection.id}/report-v${inspection.pdf_version || 1}.pdf`
      const { error: uploadError } = await supabase.storage
        .from('report-pdfs')
        .upload(path, file, { contentType: 'application/pdf', upsert: true })
      if (uploadError) throw uploadError

      await supabase.from('inspections')
        .update({ pdf_blob_url: path })
        .eq('id', inspection.id)

      setInspection(prev => prev ? { ...prev, pdf_blob_url: path } : null)
      setShowPdfUpload(false)
      toast.success('PDF uploaded — ready to send as email attachment')
    } catch (err) {
      console.error('PDF upload failed:', err)
      toast.error('Failed to upload PDF')
    } finally {
      setPdfUploading(false)
    }
  }

  async function handleShowVersions() {
    if (showVersions) {
      setShowVersions(false)
      return
    }

    if (reportType === 'job') {
      // Job versions are fetched via useQuery — just toggle visibility
      setShowVersions(true)
      return
    }

    if (!inspection?.id) return

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
      'labor_cost': () => inspection.labour_cost_ex_gst || 0,
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

  // Subfloor data for inline editing
  const subfloorEditData: SubfloorEditData | null = subfloorData ? {
    observations: subfloorData.observations || '',
    landscape: subfloorData.landscape || '',
    comments: subfloorData.comments || '',
    readings: subfloorReadings,
  } : null

  // Cost data for cleaning estimate editing
  const costData: CostData | null = inspection ? {
    labour_cost_ex_gst: inspection.labour_cost_ex_gst ?? 0,
    equipment_cost_ex_gst: inspection.equipment_cost_ex_gst ?? 0,
    subtotal_ex_gst: inspection.subtotal_ex_gst ?? 0,
    gst_amount: inspection.gst_amount ?? 0,
    total_inc_gst: inspection.total_inc_gst ?? 0,
    option_selected: inspection.option_selected ?? null,
    treatment_methods: inspection.treatment_methods ?? [],
    option_1_labour_ex_gst: inspection.option_1_labour_ex_gst ?? 0,
    option_1_equipment_ex_gst: inspection.option_1_equipment_ex_gst ?? 0,
    option_1_total_inc_gst: inspection.option_1_total_inc_gst ?? 0,
    option_2_total_inc_gst: inspection.option_2_total_inc_gst ?? 0,
  } : null

  // Stage 3.4.5: inline AI summary edits create a new ai_summary_versions row
  // with generation_type='manual_edit' (mirrors InspectionAIReview.handleSave).
  // Race-safe via retry-on-UNIQUE. Other unchanged sections are carried forward
  // from the latest active version. Local component state is updated so the
  // visible text reflects the save without a full reload.
  async function persistManualEdit(updates: {
    ai_summary_text?: string | null
    what_we_found_text?: string | null
    what_we_will_do_text?: string | null
    problem_analysis_content?: string | null
    demolition_content?: string | null
  }) {
    if (!inspection?.id) throw new Error('No inspection loaded')

    const { data: { session: editSession } } = await supabase.auth.getSession()
    const editorId = editSession?.user?.id ?? null

    const MAX_ATTEMPTS = 3
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const { data: latest, error: latestErr } = await supabase
        .from('ai_summary_versions')
        .select('version_number, ai_summary_text, what_we_found_text, what_we_will_do_text, problem_analysis_content, demolition_content')
        .eq('inspection_id', inspection.id)
        .order('version_number', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (latestErr) throw new Error(`version max query failed: ${latestErr.message}`)

      const previousMax = (latest?.version_number as number | undefined) ?? 0
      const nextVersion = previousMax + 1

      const merged = {
        ai_summary_text: updates.ai_summary_text !== undefined ? updates.ai_summary_text : (latest?.ai_summary_text ?? null),
        what_we_found_text: updates.what_we_found_text !== undefined ? updates.what_we_found_text : (latest?.what_we_found_text ?? null),
        what_we_will_do_text: updates.what_we_will_do_text !== undefined ? updates.what_we_will_do_text : (latest?.what_we_will_do_text ?? null),
        problem_analysis_content: updates.problem_analysis_content !== undefined ? updates.problem_analysis_content : (latest?.problem_analysis_content ?? null),
        demolition_content: updates.demolition_content !== undefined ? updates.demolition_content : (latest?.demolition_content ?? null),
      }

      const { data: inserted, error: insertErr } = await supabase
        .from('ai_summary_versions')
        .insert({
          inspection_id: inspection.id,
          version_number: nextVersion,
          generation_type: 'manual_edit',
          generated_by: editorId,
          ...merged,
        })
        .select('id')
        .single()

      if (insertErr) {
        const isUniqueViolation = (insertErr as { code?: string }).code === '23505'
        if (isUniqueViolation && attempt < MAX_ATTEMPTS) continue
        throw new Error(`version insert failed: ${insertErr.message}`)
      }

      const newId = inserted?.id as string

      if (previousMax > 0) {
        const { error: supersedeErr } = await supabase
          .from('ai_summary_versions')
          .update({
            superseded_at: new Date().toISOString(),
            superseded_by_version_id: newId,
          })
          .eq('inspection_id', inspection.id)
          .neq('id', newId)
          .is('superseded_at', null)
        if (supersedeErr) {
          console.warn('[ViewReportPDF] supersession update failed:', supersedeErr.message)
        }
      }

      // Reflect the edit in component state so the rendered fields update
      // without a refetch.
      setInspection(prev => prev ? { ...prev, ...merged } as typeof prev : prev)
      return
    }

    throw new Error('exceeded retry limit on version_number unique violation')
  }

  async function handleVPFieldSave(key: string, value: string) {
    if (!inspection?.id) return

    try {
      const updates: Parameters<typeof persistManualEdit>[0] = {}
      if (key === 'what_we_found') {
        updates.what_we_found_text = value || null
        updates.ai_summary_text = value || null
      } else if (key === 'what_we_will_do') {
        updates.what_we_will_do_text = value || null
      } else {
        return
      }

      await persistManualEdit(updates)
      toast.success(`${key === 'what_we_found' ? 'What We Found' : "What We're Going To Do"} updated`)
    } catch (error) {
      console.error('VP save failed:', error)
      toast.error('Failed to save')
      throw error
    }
  }

  async function handlePASave(value: string) {
    if (!inspection?.id) return

    try {
      await persistManualEdit({ problem_analysis_content: value || null })
      toast.success('Problem Analysis updated')
    } catch (error) {
      console.error('PA save failed:', error)
      toast.error('Failed to save')
      throw error
    }
  }

  async function handleDemoSave(value: string) {
    if (!inspection?.id) return

    try {
      await persistManualEdit({ demolition_content: value || null })
      toast.success('Demolition content updated')
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
    } catch (error) {
      console.error('Outdoor save failed:', error)
      toast.error('Failed to save')
      throw error
    }
  }

  // --- Subfloor save handlers ---

  async function handleSubfloorFieldSave(field: string, value: string) {
    if (!subfloorData?.id) return

    try {
      const columnMap: Record<string, string> = {
        observations: 'observations',
        landscape: 'landscape',
        comments: 'comments',
      }

      const column = columnMap[field]
      if (!column) return

      const { error } = await supabase
        .from('subfloor_data')
        .update({ [column]: value || null, updated_at: new Date().toISOString() })
        .eq('id', subfloorData.id)

      if (error) throw error

      // Update local state
      setSubfloorData(prev => prev ? { ...prev, [column]: value } : prev)

      toast.success(`Subfloor ${field} updated`)
    } catch (error) {
      console.error('Subfloor save failed:', error)
      toast.error('Failed to save')
      throw error
    }
  }

  async function handleSubfloorReadingSave(readingId: string, moisturePercentage: number, location: string) {
    try {
      const { error } = await supabase
        .from('subfloor_readings')
        .update({ moisture_percentage: moisturePercentage, location: location.trim() })
        .eq('id', readingId)

      if (error) throw error

      // Update local state
      setSubfloorReadings(prev =>
        prev.map(r => r.id === readingId ? { ...r, moisture_percentage: moisturePercentage, location: location.trim() } : r)
      )

      toast.success('Moisture reading updated')
    } catch (error) {
      console.error('Subfloor reading save failed:', error)
      toast.error('Failed to save reading')
      throw error
    }
  }

  async function handleCostSave(costs: CostData) {
    if (!inspection?.id) return

    try {
      const { error } = await supabase
        .from('inspections')
        .update({
          labour_cost_ex_gst: costs.labour_cost_ex_gst,
          equipment_cost_ex_gst: costs.equipment_cost_ex_gst,
          subtotal_ex_gst: costs.subtotal_ex_gst,
          gst_amount: costs.gst_amount,
          total_inc_gst: costs.total_inc_gst,
          option_selected: costs.option_selected,
          treatment_methods: costs.treatment_methods,
          option_1_labour_ex_gst: costs.option_1_labour_ex_gst || null,
          option_1_equipment_ex_gst: costs.option_1_equipment_ex_gst || null,
          option_1_total_inc_gst: costs.option_1_total_inc_gst || null,
          option_2_total_inc_gst: costs.option_2_total_inc_gst || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', inspection.id)

      if (error) throw error

      // Update local state so UI reflects the saved changes
      setInspection(prev => prev ? {
        ...prev,
        labour_cost_ex_gst: costs.labour_cost_ex_gst,
        equipment_cost_ex_gst: costs.equipment_cost_ex_gst,
        subtotal_ex_gst: costs.subtotal_ex_gst,
        gst_amount: costs.gst_amount,
        total_inc_gst: costs.total_inc_gst,
        option_selected: costs.option_selected,
        treatment_methods: costs.treatment_methods,
        option_1_labour_ex_gst: costs.option_1_labour_ex_gst,
        option_1_equipment_ex_gst: costs.option_1_equipment_ex_gst,
        option_1_total_inc_gst: costs.option_1_total_inc_gst,
        option_2_total_inc_gst: costs.option_2_total_inc_gst,
      } : null)

      toast.success('Estimate updated')
    } catch (error) {
      console.error('Cost save failed:', error)
      toast.error('Failed to save estimate')
      throw error
    }
  }

  async function loadSubfloorPhotos() {
    if (!subfloorData?.id) return
    setSubfloorPhotosLoading(true)
    try {
      const { data: photos } = await supabase
        .from('photos')
        .select('id, storage_path')
        .eq('subfloor_id', subfloorData.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })

      if (photos && photos.length > 0) {
        const withUrls = await Promise.all(
          photos.map(async (p) => {
            try {
              const signed_url = await getPhotoSignedUrl(p.storage_path)
              return { id: p.id, storage_path: p.storage_path, signed_url }
            } catch {
              return { id: p.id, storage_path: p.storage_path, signed_url: '' }
            }
          })
        )
        setSubfloorPhotos(withUrls)
      } else {
        setSubfloorPhotos([])
      }
    } catch (err) {
      console.warn('Failed to load subfloor photos:', err)
    } finally {
      setSubfloorPhotosLoading(false)
    }
  }

  async function openSubfloorPhotoPicker(replacingPhotoId: string) {
    if (!inspection?.id) return
    setReplacingSubfloorPhotoId(replacingPhotoId)
    setSubfloorPhotoPickerOpen(true)
    setSubfloorPhotoPickerLoading(true)
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
      setSubfloorPhotoPickerLoading(false)
    }
  }

  async function handleSwapSubfloorPhoto(newPhotoId: string) {
    if (!replacingSubfloorPhotoId || !subfloorData?.id) return
    setSubfloorPhotoPickerOpen(false)
    try {
      // Remove subfloor_id from old photo. Stage 4.3: guard against
      // resurrecting soft-deleted rows.
      await supabase
        .from('photos')
        .update({ subfloor_id: null })
        .eq('id', replacingSubfloorPhotoId)
        .is('deleted_at', null)

      // Set subfloor_id on new photo
      await supabase
        .from('photos')
        .update({ subfloor_id: subfloorData.id })
        .eq('id', newPhotoId)
        .is('deleted_at', null)

      toast.success('Subfloor photo swapped')
      setReplacingSubfloorPhotoId(null)
      await loadSubfloorPhotos()
    } catch (err) {
      console.error('Swap subfloor photo failed:', err)
      toast.error('Failed to swap photo')
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

      const primaryId = area?.primary_photo_id || null
      setPrimaryPhotoId(primaryId)

      // Load ALL photos assigned to this area. Stage 4.3: filter soft-deleted.
      const { data: photos, error } = await supabase
        .from('photos')
        .select('id, storage_path, file_name, caption')
        .eq('area_id', areaId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })

      let allAreaPhotos = photos || []

      // If primary_photo_id photo isn't in area_id results, fetch and include it.
      // Stage 4.3: deleteInspectionPhoto NULLs primary_photo_id before soft-delete,
      // but defense-in-depth — still filter soft-deleted here.
      if (primaryId && !allAreaPhotos.some(p => p.id === primaryId)) {
        const { data: primaryPhoto } = await supabase
          .from('photos')
          .select('id, storage_path, file_name, caption')
          .eq('id', primaryId)
          .is('deleted_at', null)
          .maybeSingle()
        if (primaryPhoto) {
          allAreaPhotos = [primaryPhoto, ...allAreaPhotos]
        }
      }

      // Build the EXACT same 6 photos the PDF template uses:
      // Step 1: primary first, then others (same as duplicateAreaPages)
      let ordered = [...allAreaPhotos]
      if (primaryId) {
        const pIdx = ordered.findIndex(p => p.id === primaryId)
        if (pIdx > 0) {
          const [primary] = ordered.splice(pIdx, 1)
          ordered.unshift(primary)
        }
      }

      // Step 2: Split into regular vs infrared (same as PDF)
      const regularPhotos = ordered.filter(p => p.caption !== 'infrared' && p.caption !== 'natural_infrared')
      const infraredPhoto = ordered.find(p => p.caption === 'infrared')
      const naturalInfraredPhoto = ordered.find(p => p.caption === 'natural_infrared')

      // Step 3: Take first 4 regular + infrared + natural_infrared = max 6
      // This matches PDF template slots: area_photo_1-4, area_infrared_photo, area_natural_infrared_photo
      const pdfPhotos: typeof ordered = regularPhotos.slice(0, 4)
      if (infraredPhoto) pdfPhotos.push(infraredPhoto)
      if (naturalInfraredPhoto) pdfPhotos.push(naturalInfraredPhoto)


      if (pdfPhotos.length > 0) {
        const withUrls = await Promise.all(
          pdfPhotos.map(async (p) => {
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
      toast.success('Photo deleted')
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
    } catch (error) {
      console.error('Failed to set area photo:', error)
      toast.error('Failed to set area photo')
    } finally {
      setAreaPhotoUploading(false)
    }
  }

  async function handleUploadNewAreaPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !editingAreaId || !inspection?.id) {
      e.target.value = ''
      return
    }
    e.target.value = ''

    const caption = pendingCaptionRef.current.trim()
    if (!caption) {
      toast.error('Caption required — please try uploading again')
      return
    }

    setAreaPhotoUploading(true)
    try {
      const resized = await resizePhoto(file)
      // Upload to inspection pool only — NO area assignment, NO primary_photo_id
      await uploadInspectionPhoto(resized, {
        inspection_id: inspection.id,
        photo_type: 'area',
        order_index: 0,
        caption,
      })

      toast.success('Photo uploaded — select it from the grid')
      // Reopen picker with refreshed photos so user can select the new one
      await openAreaPhotoPicker()
    } catch (err) {
      console.error('Area photo upload failed:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to upload photo')
    } finally {
      pendingCaptionRef.current = ''
      setAreaPhotoUploading(false)
    }
  }

  function openCaptionPrompt(kind: 'job' | 'area') {
    setCaptionPromptKind(kind)
    setCaptionPromptOpen(true)
  }

  function handleCaptionPromptConfirm(caption: string) {
    pendingCaptionRef.current = caption
    setCaptionPromptOpen(false)
    if (captionPromptKind === 'job') {
      jobUploadRef.current?.click()
    } else {
      areaUploadRef.current?.click()
    }
  }

  function handleCaptionPromptCancel() {
    setCaptionPromptOpen(false)
    pendingCaptionRef.current = ''
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
      // Set selected photo as front_house. Previously-marked photos retain
      // their caption — clearing it would destroy human-entered descriptions
      // when the caption column is later repurposed for free-form text.
      await supabase
        .from('photos')
        .update({ caption: 'front_house', photo_type: 'outdoor' })
        .eq('id', photoId)

      toast.success('Cover photo updated')
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
    } catch (error) {
      console.error('Photo upload failed:', error)
      toast.error('Failed to upload photo')
    } finally {
      setPhotoUploading(false)
      if (photoInputRef.current) photoInputRef.current.value = ''
    }
  }

  // --- Render ---

  const reportTitle = reportType === 'job' ? 'Job Completion Report' : 'Inspection Report'
  const displayVersions = reportType === 'job' ? jobVersions : versions
  const isPageLoading = reportType === 'job' ? jobCompletionLoading : loading

  if (isPageLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-16 w-16 animate-spin text-orange-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading {reportTitle.toLowerCase()}...</p>
        </div>
      </div>
    )
  }

  // Job report: show generate prompt if no PDF yet
  if (reportType === 'job' && !jobPdfUrlOverride && !jobCompletion?.pdf_url) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="text-center max-w-md">
          <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Report Generated</h2>
          <p className="text-gray-600 mb-6">
            A job completion report has not been generated yet.
          </p>
          <div className="flex flex-col gap-3">
            <Button
              onClick={handleGeneratePDF}
              disabled={generating}
              size="lg"
              className="h-14 min-h-[56px] bg-orange-600 hover:bg-orange-700 text-lg"
            >
              {generating ? (
                <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Generating...</>
              ) : (
                'Generate Job Report'
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

  if (!inspection?.pdf_url && reportType === 'inspection') {
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

  // === EMAIL APPROVAL STAGE ===
  if (stage === 'email-approval') {
    const jobLead = reportType === 'job' ? jobCompletion?.lead as { full_name?: string; email?: string; property_address_street?: string; property_address_suburb?: string } | null : null
    const lead = reportType === 'job' ? jobLead : inspection?.lead
    const address = lead
      ? [lead.property_address_street, lead.property_address_suburb].filter(Boolean).join(', ')
      : ''
    const emailJobNumber = reportType === 'job' ? jobCompletion?.job_number : inspection?.job_number

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-40 shadow-sm">
          <div className="flex items-center justify-between max-w-6xl mx-auto">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost" size="icon" onClick={() => setStage('report')}
                className="h-12 w-12 min-h-[48px] min-w-[48px]" aria-label="Back to report"
              >
                <ArrowLeft className="h-6 w-6" />
              </Button>
              <div>
                <h1 className="text-lg font-semibold">Send Report Email</h1>
                <p className="text-sm text-gray-600">
                  {emailJobNumber} — {lead?.full_name}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Email Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto p-4 space-y-6">

            {/* Approved confirmation */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-green-800">Report Approved</p>
                <p className="text-sm text-green-700">Review and customise the email below, then send to the customer.</p>
              </div>
            </div>

            {/* Recipient */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                <div className="relative">
                  <Mail className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <Input
                    type="email"
                    value={emailRecipient}
                    onChange={(e) => setEmailRecipient(e.target.value)}
                    className="min-h-[48px] text-sm pl-9"
                    placeholder="customer@example.com"
                  />
                </div>
                {!emailRecipient && (
                  <p className="text-xs text-red-500 mt-1">Recipient email is required</p>
                )}
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <Input
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="min-h-[48px] text-sm"
                  placeholder="Email subject..."
                />
              </div>

              {/* Body */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <Textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  className="min-h-[200px] text-sm leading-relaxed resize-y"
                  placeholder="Email message..."
                />
              </div>
            </div>

            {/* Report attachment preview */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">PDF Attachment</label>
              {(reportType === 'job' ? (jobPdfUrlOverride || jobCompletion?.pdf_url) : inspection?.pdf_blob_url) ? (
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-md border border-green-200">
                  <FileText className="h-8 w-8 text-green-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      MRC-{emailJobNumber || 'Report'}-{reportType === 'job' ? 'Job-Report' : 'Inspection-Report'}.pdf
                    </p>
                    <p className="text-xs text-green-600">{reportType === 'job' ? 'PDF ready' : 'Browser-quality PDF ready'}</p>
                  </div>
                  <Button
                    variant="outline" size="sm"
                    onClick={handleDownload}
                    className="min-h-[40px] flex-shrink-0"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Preview
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-md border border-orange-200">
                    <AlertCircle className="h-8 w-8 text-orange-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">No PDF uploaded</p>
                      <p className="text-xs text-orange-600">Go back, click Download, save as PDF, then upload it</p>
                    </div>
                    <Button
                      variant="outline" size="sm"
                      onClick={() => { setStage('report'); setShowPdfUpload(true) }}
                      className="min-h-[40px] flex-shrink-0 border-orange-300 text-orange-700 hover:bg-orange-50"
                    >
                      <Upload className="h-4 w-4 mr-1" />
                      Upload PDF
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 pb-8">
              <Button
                onClick={handleSendEmail}
                disabled={sendingEmail || !emailRecipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRecipient)}
                className="h-14 min-h-[56px] bg-[#121D73] hover:bg-[#0f1860] text-lg font-semibold"
              >
                {sendingEmail ? (
                  <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Sending...</>
                ) : (
                  <><Send className="h-5 w-5 mr-2" />Send Email to Customer</>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setStage('report')}
                className="h-12 min-h-[48px]"
              >
                <X className="h-5 w-5 mr-2" />
                Back to Report
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // === REPORT STAGE (default) ===
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
                {reportType === 'job' ? (jobCompletion?.job_number || 'Job Completion Report') : (inspection?.job_number || 'Inspection Report')}
              </h1>
              {reportType === 'job' ? (
                jobCompletion?.lead && (
                  <p className="text-sm text-gray-600">
                    {(jobCompletion.lead as { full_name?: string; property_address_suburb?: string }).full_name} - {(jobCompletion.lead as { property_address_suburb?: string }).property_address_suburb}
                  </p>
                )
              ) : (
                inspection?.lead && (
                  <p className="text-sm text-gray-600">
                    {inspection.lead.full_name} - {inspection.lead.property_address_suburb}
                  </p>
                )
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center px-2 py-1 text-xs bg-gray-100 rounded">
              v{reportType === 'job' ? (jobCompletion?.pdf_version || 1) : (inspection?.pdf_version || 1)}
            </span>

            {/* Mobile buttons */}
            <div className="flex sm:hidden gap-2">
              <Button variant="outline" size="icon" onClick={handleDownload}
                className="h-12 w-12 min-h-[48px] min-w-[48px]">
                <Download className="h-5 w-5" />
              </Button>
              {(reportType === 'job' ? jobCompletion?.pdf_approved : inspection?.pdf_approved) ? (
                <Button
                  size="icon" onClick={prefillEmailAndOpenStage}
                  className="h-12 w-12 min-h-[48px] min-w-[48px] bg-[#121D73] hover:bg-[#0f1860]"
                >
                  <Mail className="h-5 w-5" />
                </Button>
              ) : (
                <Button
                  size="icon" onClick={handleApprove}
                  disabled={approving}
                  className="h-12 w-12 min-h-[48px] min-w-[48px] bg-orange-600 hover:bg-orange-700"
                >
                  {approving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                </Button>
              )}
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
              {(reportType === 'job' ? jobCompletion?.pdf_approved : inspection?.pdf_approved) ? (
                <>
                  <span className="inline-flex items-center px-3 py-1 text-sm bg-green-100 text-green-700 rounded-full font-medium">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Approved
                  </span>
                  <Button
                    onClick={prefillEmailAndOpenStage}
                    className="bg-[#121D73] hover:bg-[#0f1860]"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Send Email
                  </Button>
                </>
              ) : (
                <Button
                  onClick={handleApprove}
                  disabled={approving}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {approving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Approve & Send
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {reportType === 'inspection' && (
        <div className="px-4 pt-3 max-w-6xl w-full mx-auto">
          <StalePdfBanner
            inspectionId={inspection?.id}
            isRegenerating={generating}
            onRegenerate={handleGeneratePDF}
          />
        </div>
      )}

      {/* Version History Panel */}
      {showVersions && displayVersions.length > 0 && (
        <div className="bg-white border-b border-gray-200 px-4 py-3 z-30">
          <div className="max-w-6xl mx-auto">
            <h3 className="text-sm font-semibold mb-2">Version History</h3>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {displayVersions.map((v) => {
                const currentPdfUrl = reportType === 'job' ? (jobPdfUrlOverride || jobCompletion?.pdf_url) : inspection?.pdf_url
                const isActive = currentPdfUrl === v.pdf_url
                return (
                <button
                  key={v.id}
                  onClick={() => {
                    if (reportType === 'inspection') {
                      setInspection(prev => prev ? { ...prev, pdf_url: v.pdf_url } : null)
                    } else if (reportType === 'job') {
                      setJobPdfUrlOverride(v.pdf_url)
                    }
                  }}
                  className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm border min-h-[48px] ${
                    isActive
                      ? 'bg-orange-100 border-orange-500'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <div className="font-medium">v{v.version_number}</div>
                  <div className="text-xs text-gray-500">
                    {formatDateAU(v.created_at)}
                  </div>
                </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* PDF Upload for Email Attachment */}
      {showPdfUpload && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-3 z-30">
          <div className="max-w-6xl mx-auto flex items-center gap-3 flex-wrap">
            <Upload className="h-5 w-5 text-blue-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-blue-900">Upload saved PDF for email attachment</p>
              <p className="text-xs text-blue-700">After saving from the print dialog, select the file here</p>
            </div>
            <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer min-h-[48px] ${
              pdfUploading ? 'bg-blue-200 text-blue-700' : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}>
              {pdfUploading ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Uploading...</>
              ) : (
                <><Upload className="h-4 w-4" />Choose PDF</>
              )}
              <input
                type="file"
                accept=".pdf"
                className="hidden"
                disabled={pdfUploading}
                onChange={(e) => e.target.files?.[0] && handlePdfUpload(e.target.files[0])}
              />
            </label>
            {inspection?.pdf_blob_url && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                <Check className="h-3 w-3" />PDF ready
              </span>
            )}
            <button onClick={() => setShowPdfUpload(false)} className="text-blue-400 hover:text-blue-600 min-h-[48px] min-w-[48px] flex items-center justify-center">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Edit Mode Indicator */}
      {editMode && (
        <div className="bg-orange-500 text-white text-center py-2 text-sm font-medium z-30 flex items-center justify-center gap-2">
          <Edit className="h-4 w-4" />
          {reportType === 'job'
            ? 'Edit Mode Active — Use the field panel to edit report data'
            : 'Edit Mode Active — Click orange buttons on the report to edit fields'}
        </div>
      )}

      {/* Main Content: Report Preview */}
      <div className="flex-1">
        {reportType === 'job' ? (
          <div className="flex-1 bg-gray-50 flex flex-col items-center justify-start p-6 overflow-auto">
            {(jobPdfUrlOverride || jobCompletion?.pdf_url) ? (
              <JobReportPreview htmlUrl={jobPdfUrlOverride || jobCompletion!.pdf_url!} />
            ) : (
              <div className="text-center space-y-4 py-20">
                <FileText className="h-16 w-16 text-gray-300 mx-auto" />
                <p className="text-lg text-gray-500 font-medium">No report generated yet</p>
                <Button size="lg" onClick={handleGeneratePDF} disabled={generating}>
                  {generating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</> : 'Generate Job Report'}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <ReportPreviewHTML
            htmlUrl={inspection!.pdf_url!}
            editMode={editMode}
            onFieldClick={handleFieldClick}
            onLoadSuccess={() => {}}
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
            subfloorData={subfloorEditData}
            onSubfloorFieldSave={handleSubfloorFieldSave}
            onSubfloorReadingSave={handleSubfloorReadingSave}
            costData={costData}
            onCostSave={handleCostSave}
          />
        )}
      </div>

      {/* Floating Edit Areas Button — inspection only */}
      {reportType === 'inspection' && (
      <button
        onClick={() => setAreaEditOpen(true)}
        className="fixed bottom-24 md:bottom-20 left-4 bg-orange-600 hover:bg-orange-700 text-white px-4 py-3 rounded-full shadow-lg flex items-center gap-2 z-50 min-h-[48px] transition-colors animate-pulse"
      >
        <Edit className="h-5 w-5" />
        <span className="font-medium text-sm">
          {areasData.length > 0 ? `Edit Areas (${areasData.length})` : 'Add Areas'}
        </span>
      </button>
      )}

      {/* Floating Edit Subfloor Photos Button — only show if subfloor is required (inspection only) */}
      {reportType === 'inspection' && subfloorData && (
        <button
          onClick={() => { setSubfloorEditOpen(true); loadSubfloorPhotos() }}
          className="fixed bottom-40 md:bottom-20 right-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-full shadow-lg flex items-center gap-2 z-50 min-h-[48px] transition-colors animate-pulse"
        >
          <Camera className="h-5 w-5" />
          <span className="font-medium text-sm">Subfloor Photos</span>
        </button>
      )}

      {/* Job Report Edit Panel */}
      {reportType === 'job' && editMode && (
        <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 bg-white border border-orange-200 rounded-xl shadow-lg z-50 max-h-[60vh] overflow-y-auto">
          <div className="p-3 border-b border-orange-100 bg-orange-50 rounded-t-xl">
            <h3 className="font-semibold text-orange-900 text-sm">Edit Job Report Fields</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {JOB_EDITABLE_FIELDS.map(f => (
              <button
                key={f.column}
                onClick={() => openJobFieldEdit(f.column, f.label, f.type, getJobFieldValue(f.column), f.options)}
                className="w-full text-left px-4 py-3 hover:bg-orange-50 flex justify-between items-center min-h-[48px]"
              >
                <div className="min-w-0 flex-1 mr-3">
                  <span className="text-sm font-medium text-gray-900">{f.label}</span>
                  {getJobFieldValue(f.column) && (
                    <p className="text-xs text-gray-500 truncate">{getJobFieldValue(f.column)}</p>
                  )}
                </div>
                <Edit className="h-4 w-4 text-orange-500 flex-shrink-0" />
              </button>
            ))}
          </div>

          {/* Photo sections */}
          {([
            { key: 'before' as const, label: 'Before Photos', photos: jobPhotos.before },
            { key: 'after' as const, label: 'After Photos', photos: jobPhotos.after },
            { key: 'demolition' as const, label: 'Demolition Photos', photos: jobPhotos.demolition },
          ]).map(section => (
            section.photos.length > 0 && (
              <div key={section.key} className="p-3 border-t border-gray-200">
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                  {section.label} ({section.photos.length})
                </h4>
                <div className="grid grid-cols-4 gap-1.5">
                  {section.photos.map(p => (
                    <button
                      key={p.id}
                      onClick={() => openJobPhotoPicker(p.id, section.key)}
                      className="aspect-square rounded-md overflow-hidden border border-gray-200 hover:border-orange-400 transition-colors"
                    >
                      <img src={p.signed_url} alt="" loading="lazy" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )
          ))}
        </div>
      )}

      <PhotoCaptionPromptDialog
        isOpen={captionPromptOpen}
        title={captionPromptKind === 'job' ? 'Replace Photo' : 'Upload New Area Photo'}
        description={
          captionPromptKind === 'job'
            ? 'Describe what this replacement photo shows'
            : 'Describe what this area photo shows'
        }
        onConfirm={handleCaptionPromptConfirm}
        onCancel={handleCaptionPromptCancel}
      />

      {/* Job Report Edit Dialog */}
      <Dialog open={jobEditOpen} onOpenChange={setJobEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit {jobEditField?.label}</DialogTitle>
            <DialogDescription>Update this field and regenerate the report.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            {jobEditField?.type === 'textarea' ? (
              <Textarea
                value={jobEditValue}
                onChange={e => setJobEditValue(e.target.value)}
                rows={4}
                className="text-[15px]"
              />
            ) : jobEditField?.type === 'date' ? (
              <Input
                type="date"
                value={jobEditValue}
                onChange={e => setJobEditValue(e.target.value)}
              />
            ) : jobEditField?.type === 'select' ? (
              <select
                value={jobEditValue}
                onChange={e => setJobEditValue(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select...</option>
                {jobEditField.options?.map(o => (
                  <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>
                ))}
              </select>
            ) : (
              <Input
                value={jobEditValue}
                onChange={e => setJobEditValue(e.target.value)}
              />
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setJobEditOpen(false)}>Cancel</Button>
            <Button onClick={handleJobFieldSave} disabled={jobEditSaving} className="bg-orange-600 hover:bg-orange-700">
              {jobEditSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save & Regenerate
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Job Photo Picker Dialog */}
      <Dialog open={jobPhotoPickerOpen} onOpenChange={setJobPhotoPickerOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Replacement Photo</DialogTitle>
            <DialogDescription>
              Pick any photo or upload a new one to replace the current {jobPhotoPickerCategory} photo.
            </DialogDescription>
          </DialogHeader>

          <input ref={jobUploadRef} type="file" accept="image/*" className="hidden" onChange={handleJobPhotoUpload} />

          <Button
            variant="outline"
            onClick={() => openCaptionPrompt('job')}
            disabled={jobPhotoUploading}
            className="w-full h-12 mb-3"
          >
            {jobPhotoUploading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading...</>
            ) : (
              <><Upload className="h-4 w-4 mr-2" />Upload New Photo</>
            )}
          </Button>

          {jobPhotoPoolLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
            </div>
          ) : jobPhotoPool.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">No photos found for this lead.</p>
          ) : (
            <div className="space-y-4">
              {jobPhotoPool.map(group => (
                <div key={group.key}>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                    {group.label} ({group.photos.length})
                  </h4>
                  <div className="grid grid-cols-4 gap-2">
                    {group.photos.map(p => {
                      const isCurrent = p.id === jobReplacingPhotoId
                      return (
                        <button
                          key={p.id}
                          onClick={() => !isCurrent && handleJobPhotoSwap(p.id)}
                          disabled={isCurrent}
                          className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                            isCurrent
                              ? 'border-orange-500 ring-2 ring-orange-300 opacity-60'
                              : 'border-gray-200 hover:border-orange-500'
                          }`}
                        >
                          <img src={p.signed_url} alt="" loading="lazy" className="w-full h-full object-cover" />
                          {isCurrent && (
                            <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

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
                  Area Photos{areaPhotos.length > 0 && <span className="text-gray-400 font-normal ml-1">({areaPhotos.length} in PDF)</span>}
                </label>
                {areaPhotosLoading && (
                  <div className="flex items-center justify-center py-6 mb-3">
                    <Loader2 className="h-6 w-6 animate-spin text-orange-600" />
                    <span className="ml-2 text-sm text-gray-500">Loading area photos...</span>
                  </div>
                )}
                {!areaPhotosLoading && areaPhotos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {areaPhotos.map((photo, idx) => {
                      const isPrimary = photo.id === primaryPhotoId
                      const slotLabel = photo.caption === 'infrared' ? 'IR'
                        : photo.caption === 'natural_infrared' ? 'NIR'
                        : `${idx + 1}`
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
                          <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded z-10">{slotLabel}</div>
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
      {(reportType === 'job' ? jobCompletion?.pdf_approved : inspection?.pdf_approved) && (
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

              <input
                ref={areaUploadRef}
                type="file"
                accept="image/*"
                onChange={handleUploadNewAreaPhoto}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => openCaptionPrompt('area')}
                className="flex items-center justify-center w-full h-12 min-h-[48px] mt-2 border border-input bg-background rounded-md cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <Upload className="h-5 w-5 mr-2" />
                Upload New Photo
              </button>
            </>
          )}
        </DialogContent>
      </Dialog>
      {/* Subfloor Photos Dialog */}
      <Dialog open={subfloorEditOpen} onOpenChange={setSubfloorEditOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Subfloor Photos</DialogTitle>
            <DialogDescription>
              Click any photo to replace it with a different one
            </DialogDescription>
          </DialogHeader>

          {subfloorPhotosLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-2 text-sm text-gray-500">Loading subfloor photos...</span>
            </div>
          ) : subfloorPhotos.length > 0 ? (
            <div className="grid grid-cols-4 gap-2">
              {subfloorPhotos.map((photo, idx) => (
                <button
                  key={photo.id}
                  onClick={() => openSubfloorPhotoPicker(photo.id)}
                  className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer group"
                >
                  {photo.signed_url ? (
                    <img
                      src={photo.signed_url}
                      alt={`Subfloor photo ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
                      No preview
                    </div>
                  )}
                  <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded z-10">
                    {idx + 1}
                  </div>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <Edit className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-4">No subfloor photos found</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Subfloor Photo Picker (swap photo) */}
      <Dialog open={subfloorPhotoPickerOpen} onOpenChange={setSubfloorPhotoPickerOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Replace Subfloor Photo</DialogTitle>
            <DialogDescription>
              Select a photo to replace the current one
            </DialogDescription>
          </DialogHeader>

          {subfloorPhotoPickerLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <>
              {allInspectionPhotos.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {allInspectionPhotos.map((photo) => {
                    const isCurrent = photo.id === replacingSubfloorPhotoId
                    return (
                      <button
                        key={photo.id}
                        onClick={() => handleSwapSubfloorPhoto(photo.id)}
                        className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all hover:border-blue-500 hover:shadow-md ${
                          isCurrent ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-200'
                        }`}
                      >
                        <img
                          src={photo.signed_url}
                          alt={photo.caption || photo.photo_type}
                          className="w-full h-full object-cover"
                        />
                        {isCurrent && (
                          <div className="absolute top-1 right-1 bg-blue-600 text-white rounded-full p-0.5">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-4">No photos found</p>
              )}
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

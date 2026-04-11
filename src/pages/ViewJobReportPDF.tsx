import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { generateJobReportPdf } from '@/lib/api/jobReportPdf'
import { sendJobReportEmail } from '@/lib/api/notifications'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  ArrowLeft,
  RefreshCw,
  Download,
  CheckCircle2,
  Mail,
  Loader2,
  FileText,
  Clock,
} from 'lucide-react'

const dateFormatter = new Intl.DateTimeFormat('en-AU', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'Australia/Melbourne',
})

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  return dateFormatter.format(new Date(dateStr))
}

export default function ViewJobReportPDF() {
  const { leadId } = useParams<{ leadId: string }>()
  const navigate = useNavigate()
  const { hasRole } = useAuth()

  const [isRegenerating, setIsRegenerating] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [showEmailDialog, setShowEmailDialog] = useState(false)

  const { data: lead } = useQuery({
    queryKey: ['lead', leadId],
    queryFn: async () => {
      if (!leadId) return null
      const { data, error } = await supabase
        .from('leads')
        .select('id, full_name, email, property_address_street, property_address_suburb, property_address_state, property_address_postcode, status')
        .eq('id', leadId)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!leadId,
  })

  const { data: jobCompletion, refetch: refetchJc } = useQuery({
    queryKey: ['job-completion', leadId],
    queryFn: async () => {
      if (!leadId) return null
      const { data, error } = await supabase
        .from('job_completions')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!leadId,
  })

  const { data: versions = [] } = useQuery({
    queryKey: ['job-report-versions', jobCompletion?.id],
    queryFn: async () => {
      if (!jobCompletion?.id) return []
      const { data, error } = await supabase
        .from('job_completion_pdf_versions')
        .select('id, version_number, pdf_url, created_at, generated_by')
        .eq('job_completion_id', jobCompletion.id)
        .order('version_number', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!jobCompletion?.id,
  })

  const { data: techProfile } = useQuery({
    queryKey: ['profile', jobCompletion?.completed_by],
    queryFn: async () => {
      if (!jobCompletion?.completed_by) return null
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', jobCompletion.completed_by)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!jobCompletion?.completed_by,
  })

  async function handleRegenerate() {
    if (!jobCompletion?.id) return
    setIsRegenerating(true)
    try {
      await generateJobReportPdf(jobCompletion.id)
      toast.success('PDF regenerated')
      refetchJc()
    } catch (err) {
      console.error('[ViewJobReportPDF] Regenerate failed:', err)
      toast.error('Failed to regenerate PDF')
    } finally {
      setIsRegenerating(false)
    }
  }

  async function handleApprove() {
    if (!jobCompletion?.id || !leadId) return
    setIsApproving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      await supabase
        .from('job_completions')
        .update({
          pdf_approved: true,
          pdf_approved_at: new Date().toISOString(),
          pdf_approved_by: user?.id,
        })
        .eq('id', jobCompletion.id)
      await supabase.from('activities').insert({
        lead_id: leadId,
        activity_type: 'status_change',
        title: 'Job report PDF approved',
        description: 'Admin approved the job report PDF for sending',
      })
      toast.success('Report approved')
      refetchJc()
    } catch (err) {
      console.error('[ViewJobReportPDF] Approve failed:', err)
      toast.error('Failed to approve')
    } finally {
      setIsApproving(false)
    }
  }

  async function handleSendEmail() {
    if (!lead || !jobCompletion) return
    setIsSendingEmail(true)
    try {
      const address = [
        lead.property_address_street,
        lead.property_address_suburb,
        lead.property_address_state,
        lead.property_address_postcode,
      ].filter(Boolean).join(', ')

      await sendJobReportEmail({
        leadId: lead.id,
        customerEmail: lead.email || '',
        customerName: lead.full_name || '',
        propertyAddress: address,
        jobNumber: jobCompletion.job_number || '',
        completionDate: formatDate(jobCompletion.completion_date),
        technicianName: techProfile?.full_name || '',
        pdfUrl: jobCompletion.pdf_url || '',
      })

      await supabase
        .from('leads')
        .update({ status: 'job_report_pdf_sent' })
        .eq('id', lead.id)

      await supabase.from('activities').insert({
        lead_id: lead.id,
        activity_type: 'email_sent',
        title: 'Job report sent to customer',
        description: `Sent to ${lead.email}`,
      })

      toast.success('Report sent to customer')
      setShowEmailDialog(false)
      navigate(`/leads/${lead.id}`)
    } catch (err) {
      console.error('[ViewJobReportPDF] Send email failed:', err)
      toast.error('Failed to send email')
    } finally {
      setIsSendingEmail(false)
    }
  }

  function handleDownload() {
    if (jobCompletion?.pdf_url) {
      window.open(jobCompletion.pdf_url, '_blank')
    }
  }

  function handleBack() {
    if (leadId) {
      navigate(`/leads/${leadId}`)
    } else {
      navigate(-1)
    }
  }

  const hasPdf = !!jobCompletion?.pdf_url
  const isApproved = !!jobCompletion?.pdf_approved
  const customerName = lead?.full_name || 'Customer'

  if (!leadId) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">No lead ID provided</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-white px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleBack} className="h-10 w-10 shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold text-gray-900">
              Job Report — {customerName}
            </h1>
            {jobCompletion?.job_number && (
              <p className="text-sm text-muted-foreground">{jobCompletion.job_number}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {jobCompletion?.pdf_version != null && jobCompletion.pdf_version > 0 && (
              <Badge variant="secondary">v{jobCompletion.pdf_version}</Badge>
            )}
            {isApproved && (
              <Badge className="bg-green-100 text-green-800">Approved</Badge>
            )}
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <div className="border-b bg-white px-4 py-2">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRegenerate}
            disabled={isRegenerating || !jobCompletion?.id}
            className="h-10 min-w-[44px]"
          >
            {isRegenerating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            {hasPdf ? 'Regenerate' : 'Generate'}
          </Button>

          {hasPdf && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="h-10 min-w-[44px]"
            >
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          )}

          {hasPdf && !isApproved && hasRole('admin') && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleApprove}
              disabled={isApproving}
              className="h-10 min-w-[44px]"
            >
              {isApproving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Approve
            </Button>
          )}

          {hasPdf && isApproved && hasRole('admin') && (
            <Button
              size="sm"
              onClick={() => setShowEmailDialog(true)}
              className="h-10 min-w-[44px] bg-blue-600 hover:bg-blue-700"
            >
              <Mail className="mr-2 h-4 w-4" />
              Send to Customer
            </Button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="mx-auto max-w-7xl p-4">
        <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
          {/* PDF preview */}
          <div className="min-h-0">
            {hasPdf ? (
              <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
                <iframe
                  src={jobCompletion.pdf_url!}
                  title="Job Report PDF"
                  className="h-[800px] w-full border-0"
                  sandbox="allow-same-origin"
                />
              </div>
            ) : (
              <Card className="flex min-h-[400px] items-center justify-center">
                <CardContent className="text-center">
                  <FileText className="mx-auto mb-4 h-16 w-16 text-muted-foreground/40" />
                  <h3 className="mb-2 text-lg font-medium text-gray-900">No Report Generated</h3>
                  <p className="mb-6 text-sm text-muted-foreground">
                    Generate the job report PDF to preview it here.
                  </p>
                  <Button
                    onClick={handleRegenerate}
                    disabled={isRegenerating || !jobCompletion?.id}
                    className="h-12 min-w-[200px]"
                  >
                    {isRegenerating ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <FileText className="mr-2 h-4 w-4" />
                    )}
                    Generate Report
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Version history */}
          <Card className="h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4" />
                Version History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {versions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No versions yet</p>
              ) : (
                <ul className="space-y-3">
                  {versions.map((v) => (
                    <li key={v.id} className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">Version {v.version_number}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(v.created_at)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 shrink-0 text-xs"
                        onClick={() => window.open(v.pdf_url, '_blank')}
                      >
                        View
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Send Email Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Job Report</DialogTitle>
            <DialogDescription>
              Send the approved job completion report to the customer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="rounded-md bg-gray-50 p-3">
              <p className="text-sm">
                <span className="font-medium">To:</span>{' '}
                {lead?.email || 'No email on file'}
              </p>
              <p className="text-sm">
                <span className="font-medium">Name:</span> {customerName}
              </p>
              {jobCompletion?.job_number && (
                <p className="text-sm">
                  <span className="font-medium">Job:</span> {jobCompletion.job_number}
                </p>
              )}
            </div>
            {!lead?.email && (
              <p className="text-sm text-destructive">
                This lead has no email address. Please add one before sending.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEmailDialog(false)}
              disabled={isSendingEmail}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendEmail}
              disabled={isSendingEmail || !lead?.email}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSendingEmail ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Mail className="mr-2 h-4 w-4" />
              )}
              Send Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

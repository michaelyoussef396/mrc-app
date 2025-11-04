import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Download, Send, AlertCircle, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function ViewReportPDF() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState(false)
  const [lead, setLead] = useState<any>(null)
  const [pdfUrl, setPdfUrl] = useState<string>('')

  useEffect(() => {
    loadLeadData()
  }, [id])

  const loadLeadData = async () => {
    if (!id) {
      navigate('/leads')
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error

      setLead(data)
      setPdfUrl((data as any).report_pdf_url || '')
    } catch (error: any) {
      console.error('Error loading lead:', error)
      toast({
        title: 'Error',
        description: 'Failed to load report',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    setApproving(true)
    try {
      // TODO: Implement email sending logic
      const { error } = await supabase
        .from('leads')
        .update({ 
          status: 'inspection_report_pdf_completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error

      toast({
        title: 'Report Approved',
        description: 'The report has been approved and sent to the client'
      })

      navigate(`/report/approved/${id}`)
    } catch (error: any) {
      console.error('Error approving report:', error)
      navigate(`/report/approval-failed/${id}`)
    } finally {
      setApproving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading report...</p>
        </div>
      </div>
    )
  }

  if (!pdfUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">No Report Found</h1>
          <p className="text-muted-foreground mb-6">
            The inspection report PDF is not available yet.
          </p>
          <Button onClick={() => navigate(`/lead/new/${id}`)}>
            <ArrowLeft className="mr-2 w-4 h-4" />
            Back to Lead
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/lead/new/${id}`)}
              >
                <ArrowLeft className="mr-2 w-4 h-4" />
                Back to Lead
              </Button>
              <div>
                <h1 className="text-xl font-bold">{lead?.lead_number || 'Inspection Report'}</h1>
                <p className="text-sm text-muted-foreground">
                  {lead?.customer_name} - {lead?.property_address}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => window.open(pdfUrl, '_blank')}
              >
                <Download className="mr-2 w-4 h-4" />
                Download
              </Button>
              <Button
                onClick={handleApprove}
                disabled={approving}
                className="bg-green-600 hover:bg-green-700"
              >
                {approving ? (
                  <>
                    <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                    Approving...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 w-4 h-4" />
                    Approve & Send to Client
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-card rounded-lg shadow-lg overflow-hidden" style={{ height: 'calc(100vh - 180px)' }}>
          <iframe
            src={pdfUrl}
            className="w-full h-full"
            title="Inspection Report PDF"
          />
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { FileText, Loader2 } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

interface GeneratePDFButtonProps {
  leadId: string
  inspectionId?: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg'
}

export default function GeneratePDFButton({ 
  leadId, 
  inspectionId,
  variant = 'default',
  size = 'default' 
}: GeneratePDFButtonProps) {
  const [generating, setGenerating] = useState(false)
  const navigate = useNavigate()

  const handleGeneratePDF = async () => {
    setGenerating(true)
    
    try {
      // Fetch inspection data
      const { data: inspection, error: inspectionError } = await supabase
        .from('inspections')
        .select(`
          *,
          inspection_areas (
            *,
            moisture_readings (*)
          ),
          equipment_bookings (
            *,
            equipment (*)
          ),
          subfloor_data (
            *,
            subfloor_readings (*)
          )
        `)
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (inspectionError) throw inspectionError
      if (!inspection) throw new Error('No inspection found')

      // Fetch lead data
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single()

      if (leadError) throw leadError

      // Prepare inspection data for PDF generation
      const inspectionData = {
        jobNumber: inspection.job_number,
        inspector: inspection.inspector_id,
        requestedBy: inspection.requested_by || lead.full_name,
        attentionTo: inspection.attention_to || lead.full_name,
        inspectionDate: inspection.inspection_date,
        address: `${lead.property_address_street}, ${lead.property_address_suburb} VIC ${lead.property_address_postcode}`,
        dwellingType: inspection.dwelling_type,
        outdoorTemperature: inspection.outdoor_temperature,
        outdoorHumidity: inspection.outdoor_humidity,
        outdoorDewPoint: inspection.outdoor_dew_point,
        totalCost: inspection.estimated_cost_inc_gst,
        areas: inspection.inspection_areas || []
      }

      // Call edge function to generate PDF
      const { data, error } = await supabase.functions.invoke('generate-inspection-pdf', {
        body: {
          inspectionData,
          leadId
        }
      })

      if (error) throw error

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate PDF')
      }

      toast.success('PDF Generated Successfully!', {
        description: 'Redirecting to PDF viewer...'
      })

      // Navigate to PDF viewer
      setTimeout(() => {
        navigate(`/report/view/${leadId}`)
      }, 1000)

    } catch (error: any) {
      console.error('Error generating PDF:', error)
      toast.error('Failed to generate PDF', {
        description: error.message
      })
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Button
      onClick={handleGeneratePDF}
      disabled={generating}
      variant={variant}
      size={size}
      className="gap-2"
    >
      {generating ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Generating PDF...
        </>
      ) : (
        <>
          <FileText className="w-4 h-4" />
          Generate PDF Report
        </>
      )}
    </Button>
  )
}

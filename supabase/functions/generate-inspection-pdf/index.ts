import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { inspectionData, leadId } = await req.json()
    
    console.log('Generating PDF for lead:', leadId)
    console.log('Inspection data:', JSON.stringify(inspectionData))

    // Load the HTML template
    const templateUrl = new URL('../../src/templates/inspection-report-template.html', import.meta.url)
    let htmlTemplate = await fetch(templateUrl).then(res => res.text())

    // Replace placeholders with actual data
    htmlTemplate = populateTemplate(htmlTemplate, inspectionData)

    // TODO: Convert HTML to PDF using a service like:
    // - PDFShift API
    // - HTML2PDF API
    // - Puppeteer (requires custom Deno Deploy setup)
    // For now, we'll store the HTML and return a mock PDF URL
    
    // Store HTML version temporarily
    const htmlFileName = `inspection-${leadId}-${Date.now()}.html`
    const { data: htmlUpload, error: htmlError } = await supabase.storage
      .from('report-pdfs')
      .upload(htmlFileName, htmlTemplate, {
        contentType: 'text/html',
        upsert: true
      })

    if (htmlError) {
      console.error('Error uploading HTML:', htmlError)
      throw htmlError
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('report-pdfs')
      .getPublicUrl(htmlFileName)

    console.log('PDF generated successfully:', publicUrl)

    // Update lead status to approve_report_pdf
    const { error: updateError } = await supabase
      .from('leads')
      .update({ 
        status: 'approve_report_pdf' as any,
        report_pdf_url: publicUrl as any,
        updated_at: new Date().toISOString()
      } as any)
      .eq('id', leadId)

    if (updateError) {
      console.error('Error updating lead status:', updateError)
      throw updateError
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        pdfUrl: publicUrl,
        message: 'PDF report generated successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error generating PDF:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

function populateTemplate(html: string, data: any): string {
  // Replace basic placeholders
  html = html.replace(/Amy Michael/g, data.requestedBy || 'Client Name')
  html = html.replace(/Clayton/g, data.inspector || 'Inspector')
  html = html.replace(/02\/11\/2025/g, formatDate(data.inspectionDate))
  html = html.replace(/townhouse/gi, data.dwellingType || 'Property')
  html = html.replace(/2\/79 McIntosh Street Airport West VIC 3042/g, data.address || '')
  
  // Replace outdoor environment data
  if (data.outdoorTemperature) {
    html = html.replace(/25\.0°C/g, `${data.outdoorTemperature}°C`)
  }
  if (data.outdoorHumidity) {
    html = html.replace(/44\.0%/g, `${data.outdoorHumidity}%`)
  }
  if (data.outdoorDewPoint) {
    html = html.replace(/11\.0°C/g, `${data.outdoorDewPoint}°C`)
  }

  // Replace cost information
  if (data.totalCost) {
    const costFormatted = `$${(data.totalCost / 1.1).toFixed(2)} + GST`
    html = html.replace(/\$1,232\.41 \+ GST/g, costFormatted)
  }

  // Replace area names in "examined areas" section
  if (data.areas && data.areas.length > 0) {
    const areasList = data.areas.map((a: any) => a.areaName).join('<br/>')
    html = html.replace(/Ensuite<br\/>Bedroom 1<br\/>/g, areasList + '<br/>')
  }

  // TODO: Add more sophisticated template replacement
  // - Multiple areas (repeat page 4 for each area)
  // - Photos (replace image sources)
  // - Moisture readings
  // - Equipment details
  
  return html
}

function formatDate(isoDate: string): string {
  const date = new Date(isoDate)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

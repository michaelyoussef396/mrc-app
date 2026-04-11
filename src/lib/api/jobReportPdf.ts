import { supabase } from '@/integrations/supabase/client'

/**
 * Call the generate-job-report-pdf Edge Function.
 * Returns the public URL of the generated HTML report and its version number.
 */
export async function generateJobReportPdf(
  jobCompletionId: string
): Promise<{ pdfUrl: string; version: number }> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-job-report-pdf`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ jobCompletionId }),
    },
  )

  const result = await response.json()
  if (!result.success) {
    throw new Error(result.error || 'PDF generation failed')
  }

  return { pdfUrl: result.pdfUrl, version: result.version }
}

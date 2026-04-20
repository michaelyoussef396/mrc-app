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

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 90_000)
  let response: Response
  try {
    response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-job-report-pdf`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jobCompletionId }),
        signal: controller.signal,
      },
    )
  } catch (err) {
    clearTimeout(timeout)
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('PDF generation timed out. Please try again.')
    }
    throw err
  }
  clearTimeout(timeout)

  const result = await response.json()
  if (!result.success) {
    throw new Error(result.error || 'PDF generation failed')
  }

  return { pdfUrl: result.pdfUrl, version: result.version }
}

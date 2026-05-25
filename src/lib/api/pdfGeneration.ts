// PDF Generation API Helper
// Calls the generate-inspection-pdf Supabase Edge Function
//
// PDF regeneration is user-explicit only. Save handlers must NOT chain a
// PDF regen call. The Stale PDF banner surfaces a Regenerate button when
// the latest AI summary is newer than the latest PDF version. See
// docs/inspection-workflow-fix-plan-v2-2026-04-30.md, Stage 1.4.

import { supabase } from '@/integrations/supabase/client'
import { addBusinessBreadcrumb, captureBusinessError } from '@/lib/sentry'
import { dispatchInReportEdit, type DispatchOpts } from './inReportEditDispatch'

export interface PDFGenerationResult {
  success: boolean
  pdfUrl?: string
  html?: string
  version?: number
  inspectionId?: string
  generatedAt?: string
  error?: string
}

/**
 * Generate a PDF report for an inspection
 * @param inspectionId - The UUID of the inspection
 * @param options - Optional settings for generation
 * @returns PDF URL or HTML content for client-side rendering
 */
export async function generateInspectionPDF(
  inspectionId: string,
  options: {
    regenerate?: boolean
    returnHtml?: boolean
  } = {}
): Promise<PDFGenerationResult> {
  try {

    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError) {
      console.error('[PDF Generation] Session error:', sessionError)
      return {
        success: false,
        error: `Session error: ${sessionError.message}`
      }
    }

    if (!session) {
      console.error('[PDF Generation] No active session')
      return {
        success: false,
        error: 'Not authenticated. Please log in to generate reports.'
      }
    }


    addBusinessBreadcrumb('PDF generation started', { inspectionId, regenerate: options.regenerate })

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const functionUrl = `${supabaseUrl}/functions/v1/generate-inspection-pdf`

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 90_000)
    let response: Response
    try {
      response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          inspectionId,
          regenerate: options.regenerate || false,
          returnHtml: options.returnHtml || false,
        }),
        signal: controller.signal,
      })
    } catch (err) {
      clearTimeout(timeout)
      if (err instanceof DOMException && err.name === 'AbortError') {
        captureBusinessError('PDF generation timeout', { inspectionId })
        return { success: false, error: 'PDF generation timed out. Please try again.' }
      }
      throw err
    }
    clearTimeout(timeout)

    if (!response.ok) {
      const errorBody = await response.text()
      console.error('[PDF Generation] Edge function error:', response.status, errorBody)
      captureBusinessError('PDF generation failed', {
        inspectionId,
        status: response.status,
        error: errorBody,
      })
      return {
        success: false,
        error: `Edge function error (${response.status}): ${errorBody}`
      }
    }

    const data = await response.json()

    return {
      success: true,
      pdfUrl: data.pdfUrl,
      html: data.html,
      version: data.version,
      inspectionId: data.inspectionId,
      generatedAt: data.generatedAt
    }
  } catch (error) {
    console.error('[PDF Generation] Caught error:', error)
    captureBusinessError('PDF generation exception', {
      inspectionId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Update a single editable field via the code-resident in-report edit
 * dispatch (Phase B1). Replaces the dead `editable_fields` table lookup that
 * pointed at renamed/dropped columns. The caller MUST inject
 * `opts.persistManualEdit` so Class B fields (ai_summary) can route through
 * the component-scoped version-on-write helper without duplicating
 * race-safe insert logic. Does NOT regenerate the PDF — regen is
 * user-explicit (see file header).
 */
export async function updateInspectionField(
  inspectionId: string,
  fieldKey: string,
  newValue: string | number | boolean,
  opts: DispatchOpts
): Promise<PDFGenerationResult> {
  try {
    const result = await dispatchInReportEdit(
      inspectionId,
      fieldKey,
      newValue as string | number,
      opts,
    )
    return result.success
      ? { success: true }
      : { success: false, error: result.error }
  } catch (error) {
    console.error('Update inspection field error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get PDF version history for an inspection
 * @param inspectionId - The UUID of the inspection
 * @returns Array of PDF versions
 */
export async function getPDFVersionHistory(inspectionId: string) {
  try {
    const { data, error } = await supabase
      .from('pdf_versions')
      .select('*')
      .eq('inspection_id', inspectionId)
      .order('version_number', { ascending: false })

    if (error) {
      console.error('Failed to fetch PDF versions:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error fetching PDF versions:', error)
    return []
  }
}

/**
 * Mark a PDF as approved
 * @param inspectionId - The UUID of the inspection
 * @returns Success status
 */
export async function approvePDF(inspectionId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return { success: false, error: 'Not authenticated' }
    }

    const { error } = await supabase
      .from('inspections')
      .update({
        pdf_approved: true,
        pdf_approved_at: new Date().toISOString(),
        pdf_approved_by: session.user.id
      })
      .eq('id', inspectionId)

    if (error) {
      return { success: false, error: error.message }
    }

    // Update the lead status to 'inspection_email_approval' (next stage after approval)
    const { data: inspection } = await supabase
      .from('inspections')
      .select('lead_id')
      .eq('id', inspectionId)
      .single()

    if (inspection?.lead_id) {
      await supabase
        .from('leads')
        .update({ status: 'inspection_email_approval' })
        .eq('id', inspection.lead_id)
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

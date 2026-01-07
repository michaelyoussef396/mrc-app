// PDF Generation API Helper
// Calls the generate-inspection-pdf Supabase Edge Function

import { supabase } from '@/integrations/supabase/client'

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
    console.log('[PDF Generation] Starting for inspection:', inspectionId)

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

    console.log('[PDF Generation] User authenticated:', session.user.email)

    // Use direct fetch instead of supabase.functions.invoke to debug the issue
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const functionUrl = `${supabaseUrl}/functions/v1/generate-inspection-pdf`

    console.log('[PDF Generation] Calling function URL:', functionUrl)

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        inspectionId,
        regenerate: options.regenerate || false,
        returnHtml: options.returnHtml || false
      })
    })

    console.log('[PDF Generation] Response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[PDF Generation] Error response:', errorText)
      return {
        success: false,
        error: `Server error (${response.status}): ${errorText}`
      }
    }

    const data = await response.json()
    console.log('[PDF Generation] Success! PDF URL:', data?.pdfUrl)

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
    if (error instanceof Error) {
      console.error('[PDF Generation] Error name:', error.name)
      console.error('[PDF Generation] Error message:', error.message)
      console.error('[PDF Generation] Error stack:', error.stack)
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Update a field and regenerate the PDF
 * @param inspectionId - The UUID of the inspection
 * @param fieldKey - The field key to update
 * @param newValue - The new value for the field
 * @returns Updated PDF result
 */
export async function updateFieldAndRegenerate(
  inspectionId: string,
  fieldKey: string,
  newValue: string | number | boolean
): Promise<PDFGenerationResult> {
  try {
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return {
        success: false,
        error: 'Not authenticated'
      }
    }

    // First, fetch the editable field metadata to know which table/column to update
    const { data: fieldMeta, error: metaError } = await supabase
      .from('editable_fields')
      .select('field_table, field_column')
      .eq('field_key', fieldKey)
      .single()

    if (metaError || !fieldMeta) {
      return {
        success: false,
        error: `Field ${fieldKey} not found in editable_fields`
      }
    }

    // Update the field in the appropriate table
    // For now, we handle the common cases
    if (fieldMeta.field_table === 'inspections') {
      const { error: updateError } = await supabase
        .from('inspections')
        .update({
          [fieldMeta.field_column]: newValue,
          last_edited_at: new Date().toISOString(),
          last_edited_by: session.user.id
        })
        .eq('id', inspectionId)

      if (updateError) {
        return {
          success: false,
          error: `Failed to update field: ${updateError.message}`
        }
      }
    } else if (fieldMeta.field_table === 'leads') {
      // Need to get the lead_id from the inspection first
      const { data: inspection, error: inspError } = await supabase
        .from('inspections')
        .select('lead_id')
        .eq('id', inspectionId)
        .single()

      if (inspError || !inspection?.lead_id) {
        return {
          success: false,
          error: 'Could not find associated lead'
        }
      }

      const { error: updateError } = await supabase
        .from('leads')
        .update({ [fieldMeta.field_column]: newValue })
        .eq('id', inspection.lead_id)

      if (updateError) {
        return {
          success: false,
          error: `Failed to update lead field: ${updateError.message}`
        }
      }
    }

    // Regenerate the PDF with the updated data
    return generateInspectionPDF(inspectionId, { regenerate: true })
  } catch (error) {
    console.error('Update and regenerate error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
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

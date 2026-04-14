// Supabase Edge Function: generate-job-report-pdf
// Generates job completion PDF by populating HTML template with job data
// Template fetched from Supabase Storage (pdf-templates bucket)
// Returns: Populated HTML URL or raw HTML

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://esm.sh/zod@3.22.4'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const TEMPLATE_URL = `${SUPABASE_URL}/storage/v1/object/public/pdf-templates/job-report-template.html`

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, baggage, sentry-trace',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// --- Input validation ---

const RequestBodySchema = z.object({
  jobCompletionId: z.string().uuid().optional(),
  leadId: z.string().uuid().optional(),
  regenerate: z.boolean().optional().default(false),
  returnHtml: z.boolean().optional().default(false),
}).refine(data => data.jobCompletionId || data.leadId, {
  message: 'Either jobCompletionId or leadId is required',
})

// --- Helpers ---

function escapeHtml(str: string | null | undefined): string {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatDateLong(dateString: string | null | undefined): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Australia/Melbourne',
  })
}

function capitalize(str: string | null | undefined): string {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

// 1×1 transparent PNG for empty photo slots
const EMPTY_PHOTO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='

// --- Main handler ---

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(
    SUPABASE_URL,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  try {
    // Parse and validate body
    let rawBody: unknown
    try {
      rawBody = await req.json()
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const parsed = RequestBodySchema.safeParse(rawBody)
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid request body', details: parsed.error.issues }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const { regenerate, returnHtml } = parsed.data
    let { jobCompletionId } = parsed.data
    const { leadId } = parsed.data

    // ===== STEP 1: Resolve job completion =====
    if (!jobCompletionId && leadId) {
      const { data: jcRow, error: jcErr } = await supabase
        .from('job_completions')
        .select('id')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (jcErr || !jcRow) {
        return new Response(
          JSON.stringify({ error: 'No job completion found for this lead' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
      jobCompletionId = jcRow.id
    }

    console.log(`Generating job report PDF for: ${jobCompletionId}, regenerate: ${regenerate}`)

    // ===== STEP 2: Fetch all data =====
    const { data: jc, error: jcError } = await supabase
      .from('job_completions')
      .select('*')
      .eq('id', jobCompletionId)
      .single()

    if (jcError || !jc) {
      return new Response(
        JSON.stringify({ error: 'Job completion not found', details: jcError?.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Lead
    const { data: lead } = await supabase
      .from('leads')
      .select('*')
      .eq('id', jc.lead_id)
      .single()

    if (!lead) {
      return new Response(
        JSON.stringify({ error: 'Lead not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Technician name
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', jc.completed_by)
      .maybeSingle()

    const technicianName = profile?.full_name || jc.remediation_completed_by || 'Technician'

    // Photos — before, after, demolition
    const { data: photos } = await supabase
      .from('photos')
      .select('id, storage_path, photo_category')
      .eq('job_completion_id', jobCompletionId)
      .in('photo_category', ['before', 'after', 'demolition'])
      .order('created_at', { ascending: true })

    const allPhotos = (photos || []) as Array<{ id: string; storage_path: string; photo_category: string }>
    const beforePhotos = allPhotos.filter(p => p.photo_category === 'before')
    const afterPhotos = allPhotos.filter(p => p.photo_category === 'after')
    const demolitionPhotos = allPhotos.filter(p => p.photo_category === 'demolition')

    console.log(`Photos: ${beforePhotos.length} before, ${afterPhotos.length} after, ${demolitionPhotos.length} demolition`)

    // ===== STEP 3: Download photos and embed as base64 data URIs =====
    // Self-contained reports never expire — no more 1-hour signed URL TTL.
    const photoDataUris = new Map<string, string>()
    const uniquePaths = [...new Set(allPhotos.map(p => p.storage_path).filter(Boolean))]

    const BATCH_SIZE = 6
    for (let i = 0; i < uniquePaths.length; i += BATCH_SIZE) {
      const batch = uniquePaths.slice(i, i + BATCH_SIZE)
      const results = await Promise.all(
        batch.map(async (storagePath) => {
          try {
            const { data, error } = await supabase.storage
              .from('inspection-photos')
              .download(storagePath)
            if (error || !data) {
              console.error(`Failed to download ${storagePath}:`, error)
              return null
            }

            const buf = await data.arrayBuffer()
            const bytes = new Uint8Array(buf)
            let binary = ''
            const chunkSize = 0x8000
            for (let j = 0; j < bytes.length; j += chunkSize) {
              binary += String.fromCharCode.apply(
                null,
                Array.from(bytes.subarray(j, j + chunkSize)),
              )
            }
            const base64 = btoa(binary)
            const mime = data.type || 'image/jpeg'
            return { path: storagePath, uri: `data:${mime};base64,${base64}` }
          } catch (err) {
            console.error(`Error embedding ${storagePath}:`, err)
            return null
          }
        }),
      )
      for (const result of results) {
        if (result) photoDataUris.set(result.path, result.uri)
      }
    }

    console.log(`Embedded ${photoDataUris.size} photos as base64`)

    function getPhotoUrl(photo: { storage_path: string } | undefined): string {
      if (!photo) return EMPTY_PHOTO
      return photoDataUris.get(photo.storage_path) || EMPTY_PHOTO
    }

    // ===== STEP 4: Fetch template =====
    console.log('Fetching template from Storage...')
    const templateResponse = await fetch(TEMPLATE_URL)
    if (!templateResponse.ok) {
      console.error(`Failed to fetch template: ${templateResponse.status}`)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch PDF template from storage' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }
    let html = await templateResponse.text()
    console.log(`Template fetched: ${(html.length / 1024).toFixed(1)} KB`)

    // ===== STEP 5: Populate template =====

    // 5a. Simple {{variable}} replacements
    const address = [
      lead.property_address_street,
      lead.property_address_suburb,
      lead.property_address_state,
      lead.property_address_postcode,
    ].filter(Boolean).join(', ')

    const replacements: Record<string, string> = {
      '{{job_date}}': escapeHtml(formatDate(jc.completion_date)),
      '{{business_address}}': escapeHtml(address),
      '{{technician_name}}': escapeHtml(technicianName),
      '{{ordered_by}}': escapeHtml(jc.requested_by || lead.full_name || ''),
      '{{directed_to}}': escapeHtml(jc.attention_to || lead.full_name || ''),
      '{{property_type}}': escapeHtml(capitalize(jc.premises_type) || 'Residential'),
    }

    for (const [placeholder, value] of Object.entries(replacements)) {
      html = html.replaceAll(placeholder, value)
    }

    // 5b. Conditional: demolition page
    const ifDemoStart = '<!-- IF: demolition_works -->'
    const ifDemoEnd = '<!-- ENDIF -->'
    const demoStartIdx = html.indexOf(ifDemoStart)
    const demoEndIdx = html.indexOf(ifDemoEnd)

    if (demoStartIdx !== -1 && demoEndIdx !== -1) {
      if (!jc.demolition_works) {
        // Remove the entire demolition page block
        html = html.substring(0, demoStartIdx) + html.substring(demoEndIdx + ifDemoEnd.length)
      } else {
        // Keep the block, remove the marker comments, populate fields
        html = html.replace(ifDemoStart, '')
        html = html.replace(ifDemoEnd, '')

        html = html.replaceAll('{{demolition_justification}}', escapeHtml(jc.demolition_justification || ''))
        html = html.replaceAll('{{demolition_removal_notes}}', escapeHtml(jc.demolition_removal_notes || ''))

        for (let i = 1; i <= 4; i++) {
          html = html.replaceAll(`{{demolition_photo_${i}}}`, getPhotoUrl(demolitionPhotos[i - 1]))
        }
      }
    }

    // 5c. Repeatable: paired before/after photo pages (3 pairs per page)
    html = expandPairedPhotoPages(html, beforePhotos, afterPhotos, getPhotoUrl)

    // 5d. Dynamic contents page numbers
    const pairCount = Math.max(beforePhotos.length, afterPhotos.length)
    const treatedAreaPages = pairCount === 0 ? 1 : Math.ceil(pairCount / 3)
    const demolitionPage = 3 + treatedAreaPages
    const termsPage = demolitionPage + (jc.demolition_works ? 1 : 0)
    const pad = (n: number) => n.toString().padStart(2, '0')

    html = html.replaceAll('{{contents_demolition_page}}', pad(demolitionPage))
    html = html.replaceAll('{{contents_terms_page}}', pad(termsPage))

    // ===== STEP 6: Store and return =====
    const newVersion = regenerate ? (jc.pdf_version || 0) + 1 : (jc.pdf_version || 0) + 1

    if (returnHtml) {
      await supabase
        .from('job_completions')
        .update({ pdf_version: newVersion, pdf_generated_at: new Date().toISOString() })
        .eq('id', jobCompletionId)

      return new Response(
        JSON.stringify({
          success: true,
          html,
          version: newVersion,
          jobCompletionId,
          generatedAt: new Date().toISOString(),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Upload to storage
    const timestamp = Date.now()
    const filename = `job-report-${jobCompletionId}-v${newVersion}-${timestamp}.html`

    const { error: uploadError } = await supabase.storage
      .from('inspection-reports')
      .upload(filename, html, { contentType: 'text/html', upsert: true })

    if (uploadError) {
      console.error('Failed to upload HTML:', uploadError)
      return new Response(
        JSON.stringify({ error: 'Failed to save report', details: uploadError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const { data: urlData } = supabase.storage
      .from('inspection-reports')
      .getPublicUrl(filename)

    const reportUrl = urlData.publicUrl

    // Update job_completions record
    const { error: updateError } = await supabase
      .from('job_completions')
      .update({
        pdf_url: reportUrl,
        pdf_version: newVersion,
        pdf_generated_at: new Date().toISOString(),
      })
      .eq('id', jobCompletionId)

    if (updateError) {
      console.error('Failed to update job completion:', updateError)
    }

    // Log to job_completion_pdf_versions
    const authHeader = req.headers.get('authorization')
    let userId: string | null = null
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
      userId = user?.id || null
    }

    const { error: versionError } = await supabase
      .from('job_completion_pdf_versions')
      .insert({
        job_completion_id: jobCompletionId,
        version_number: newVersion,
        pdf_url: reportUrl,
        generated_by: userId,
      })

    if (versionError) {
      console.error('Failed to log version:', versionError)
    }

    console.log(`Job report PDF generated: ${reportUrl}`)

    return new Response(
      JSON.stringify({
        success: true,
        pdfUrl: reportUrl,
        version: newVersion,
        jobCompletionId,
        generatedAt: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )

  } catch (error) {
    console.error('Error in generate-job-report-pdf:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Log to error_logs (fire-and-forget)
    try {
      const logClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
      await logClient.from('error_logs').insert({
        error_type: 'edge_function_error',
        severity: 'critical',
        message: `Job report PDF generation failed: ${errorMessage}`,
        stack_trace: error instanceof Error ? error.stack : null,
        context: { function: 'generate-job-report-pdf' },
        source: 'edge_function',
      })
    } catch { /* non-blocking */ }

    return new Response(
      JSON.stringify({ success: false, error: `Failed to generate PDF: ${errorMessage}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})

// --- Repeatable photo page expansion ---

function expandPairedPhotoPages(
  html: string,
  beforePhotos: Array<{ storage_path: string }>,
  afterPhotos: Array<{ storage_path: string }>,
  getUrl: (photo: { storage_path: string } | undefined) => string,
): string {
  const startMarker = '<!-- REPEATABLE: treated_areas per 3 -->'
  const endMarker = '<!-- END REPEATABLE -->'

  const startIdx = html.indexOf(startMarker)
  const endIdx = html.indexOf(endMarker, startIdx)
  if (startIdx === -1 || endIdx === -1) return html

  const beforeBlock = html.substring(0, startIdx)
  const pageTemplate = html.substring(startIdx + startMarker.length, endIdx)
  const afterBlock = html.substring(endIdx + endMarker.length)

  const pairCount = Math.max(beforePhotos.length, afterPhotos.length)

  type PhotoOrUndef = { storage_path: string } | undefined
  const groups: Array<{ befores: PhotoOrUndef[]; afters: PhotoOrUndef[] }> = []

  if (pairCount === 0) {
    groups.push({
      befores: [undefined, undefined, undefined],
      afters: [undefined, undefined, undefined],
    })
  } else {
    for (let i = 0; i < pairCount; i += 3) {
      const befores: PhotoOrUndef[] = []
      const afters: PhotoOrUndef[] = []
      for (let j = 0; j < 3; j++) {
        befores.push(beforePhotos[i + j] ?? undefined)
        afters.push(afterPhotos[i + j] ?? undefined)
      }
      groups.push({ befores, afters })
    }
  }

  const pages = groups.map(({ befores, afters }) => {
    let page = pageTemplate
    for (let i = 1; i <= 3; i++) {
      page = page.replaceAll(`{{before_photo_${i}}}`, getUrl(befores[i - 1]))
      page = page.replaceAll(`{{after_photo_${i}}}`, getUrl(afters[i - 1]))
    }
    return page
  })

  return beforeBlock + pages.join('\n') + afterBlock
}

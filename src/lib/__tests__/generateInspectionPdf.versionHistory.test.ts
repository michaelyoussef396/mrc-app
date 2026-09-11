// @vitest-environment node
// Execute the complete EF handler in Node with mocked Deno/IO boundaries.
// This does not verify native Deno, remote dependency versions, or a live database.
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { z } from 'zod'
import { describe, expect, it, vi } from 'vitest'

const source = readFileSync('supabase/functions/generate-inspection-pdf/index.ts', 'utf8')
const executable = ts.transpileModule(source.replace(/^import .* from 'https:[^']+'\r?\n/gm, ''), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
}).outputText
const inspectionId = '00000000-0000-4000-8000-000000000001'
const reportUrl = 'https://localhost.invalid/report.html'
const template = ['Cover', 'Value Proposition', 'Areas Inspected', 'Outdoor Environment',
  'Subfloor', 'Problem Analysis', 'Demolition', 'Visual Mould Cleaning']
  .map((title, i) => `<!-- Page ${i + 1}: ${title} -->`).join('\n')

async function generate(databaseCode?: string) {
  const inspection = { id: inspectionId, pdf_version: 2, areas: [], subfloor_required: false,
    lead: { status: 'inspection_completed' } }
  const update = vi.fn()
  const insert = vi.fn((row) => {
    // Michael's verified constraint, 11 Sep; emulate rejection without a live DB.
    const allowed = ['legacy_ef_render', 'hard_save', 'manual_upload_fallback']
    const code = databaseCode ?? (allowed.includes(row.generation_type) ? null : '23514')
    return Promise.resolve({ error: code ? { code, message: 'History insert rejected' } : null })
  })
  const client = {
    from(table: string) {
      if (table === 'pdf_versions') return { insert }
      const data = table === 'inspections' ? inspection : table === 'photos' ? [] : null
      const query = {
        select: () => query, eq: () => query, is: () => query, order: () => query,
        single: () => query, maybeSingle: () => query,
        update: (row: unknown) => { update(row); return query },
        then: (resolve: (value: unknown) => unknown) => resolve({ data, error: null }),
      }
      return query
    },
    storage: { from: () => ({ upload: async () => ({ error: null }),
      getPublicUrl: () => ({ data: { publicUrl: reportUrl } }) }) },
    auth: { getUser: async () => ({ data: { user: { id: inspectionId } }, error: null }) },
  }
  const logger = { log: vi.fn(), warn: vi.fn(), error: vi.fn() }
  let handler!: (req: Request) => Promise<Response>
  new Function('createClient', 'z', 'Deno', 'fetch', 'console', executable)(
    () => client, z,
    { env: { get: () => 'dummy' }, serve: (fn: typeof handler) => { handler = fn } },
    async () => new Response(template), logger,
  )
  const response = await handler(new Request('https://localhost.invalid/generate-inspection-pdf', {
    method: 'POST', headers: { Authorization: 'Bearer dummy', 'Content-Type': 'application/json' },
    body: JSON.stringify({ inspectionId, regenerate: true }),
  }))
  return { response, body: await response.json(), insert, update, logger }
}

describe('inspection EF version history', () => {
  it('persists legacy EF provenance accepted by the generation-type constraint', async () => {
    const { response, body, insert, update, logger } = await generate()
    expect(insert).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      inspection_id: inspectionId, version_number: 3, generation_type: 'legacy_ef_render', pdf_url: reportUrl,
    }))
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ pdf_version: 3, pdf_url: reportUrl }))
    expect(response.status).toBe(200)
    expect(body).toMatchObject({ success: true, pdfUrl: reportUrl, version: 3, versionHistorySaved: true })
    expect(body.warning).toBeUndefined()
    expect(logger.error).not.toHaveBeenCalled()
  })

  it.each(['23514', '42501'])('surfaces PG %s while preserving successful report delivery', async (code) => {
    const { response, body, insert, logger } = await generate(code)
    expect(insert).toHaveBeenCalledOnce()
    expect(response.status).toBe(200)
    expect(body).toMatchObject({
      success: true, pdfUrl: reportUrl, version: 3, inspectionId, versionHistorySaved: false,
      warning: { code: 'PDF_VERSION_HISTORY_SAVE_FAILED', databaseCode: code },
    })
    expect(logger.error).toHaveBeenCalledWith(
      '[generate-inspection-pdf] Failed to save pdf_versions row',
      expect.objectContaining({ code, inspectionId, version: 3 }),
    )
  })
})

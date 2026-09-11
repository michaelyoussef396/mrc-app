import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { z } from 'zod'

// Execute the shipped handler, replacing only remote imports and its I/O boundaries.
const source = readFileSync(new URL('./index.ts', import.meta.url), 'utf8').replace(/^import .*\n/gm, '')
const js = stripTypeScriptTypes(source)
const jobCompletionId = '00000000-0000-4000-8000-000000000001'
function setup({ history = [], insertCode, lookupCode } = {}) {
  const rows = history.map(version_number => ({ version_number }))
  const updates = [], uploads = [], attempts = []
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'caller' } } }) },
    rpc: async () => ({ data: true }),
    storage: { from: () => ({
      upload: async path => { uploads.push(path); return {} },
      getPublicUrl: path => ({ data: { publicUrl: `https://localhost.invalid/${path}` } }),
    }) },
    from(table) {
      const data = table === 'job_completions' ? { pdf_version: 0 } : table === 'photos' ? [] : {}
      const query = {
        select() { return this }, eq() { return this }, order() { return this },
        limit() { return this }, in() { return this }, is() { return this },
        single: async () => ({ data }),
        maybeSingle: async () => table === 'job_completion_pdf_versions'
          ? { data: rows.toSorted((a, b) => b.version_number - a.version_number)[0], error: lookupCode && { code: lookupCode } }
          : { data },
        update(row) { updates.push(row); return this },
        then(resolve) { resolve({ data }) },
        async insert(row) {
          if (table !== 'job_completion_pdf_versions') return {}
          attempts.push(row.version_number)
          const code = insertCode || (rows.some(r => r.version_number === row.version_number) && '23505')
          if (code) return { error: { code } }
          rows.push(row)
          return {}
        },
      }
      return query
    },
  }
  let handler
  new Function('createClient', 'z', 'Deno', 'fetch', 'console', js)(
    () => client, z, { env: { get: () => 'dummy' }, serve: fn => { handler = fn } },
    async () => new Response('<html>{{job_date}}</html>'), { log() {}, warn() {}, error() {} },
  )
  const run = async (flags = {}) => {
    const response = await handler(new Request('https://localhost.invalid', {
      method: 'POST', headers: { Authorization: 'Bearer dummy' },
      body: JSON.stringify({ jobCompletionId, regenerate: true, ...flags }),
    }))
    return { status: response.status, ...await response.json() }
  }
  return { run, rows, updates, uploads, attempts }
}

test('overlapping regenerations preserve distinct history despite the same stale parent counter', async () => {
  const db = setup({ history: [1] })
  const results = await Promise.all([db.run(), db.run()])
  assert.deepEqual(results.map(r => r.version).sort(), [2, 3])
  assert.deepEqual(db.attempts, [2, 2, 3])
  assert.deepEqual(db.rows.slice(1).map(r => [r.job_completion_id, r.generated_by]), [[jobCompletionId, 'caller'], [jobCompletionId, 'caller']])
  assert.deepEqual(db.updates.map(r => r.pdf_version).sort(), [2, 3])
})
for (const [failure, options, attempts] of [
  ['retry exhaustion', { insertCode: '23505' }, 3],
  ['non-unique insert error', { insertCode: '42501' }, 1],
  ['history lookup error', { lookupCode: '42501' }, 0],
]) test(`${failure} returns failure instead of silently dropping audit history`, async () => {
  const db = setup(options)
  const result = await db.run()
  assert.equal(result.status, 500)
  assert.equal(result.success, false)
  assert.equal(db.attempts.length, attempts)
  assert.equal(db.updates.length, 0)
})
test('previewOnly retains zero persistence effects', async () => {
  const db = setup()
  assert.equal((await db.run({ previewOnly: true })).version, null)
  assert.deepEqual([db.attempts, db.updates, db.uploads], [[], [], []])
})

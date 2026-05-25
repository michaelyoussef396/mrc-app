// Phase 7: report version history panel. Reads pdf_versions rows for an
// inspection and renders each one with its generation type, timestamp,
// email status, and a download button (for new-pipeline rows that have a
// pdf_storage_path).
//
// Mobile-first: stacked card list at <768px, condensed table at ≥768px.

import { useEffect, useState } from 'react'
import { Download, Loader2, Mail, RefreshCw } from 'lucide-react'

import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { downloadBlobAs } from '@/lib/api/reportPipeline'

const REPORT_PDFS_BUCKET = 'report-pdfs'

interface VersionRow {
  id: string
  version_number: number
  created_at: string
  pdf_url: string | null
  pdf_storage_path: string | null
  html_storage_path: string | null
  html_hash: string | null
  was_emailed: boolean
  emailed_at: string | null
  generation_type: 'legacy_ef_render' | 'hard_save' | 'manual_upload_fallback' | null
  created_by: string | null
}

interface ReportVersionHistoryProps {
  inspectionId: string
  jobNumber: string | null
  refreshKey?: unknown
}

const MELBOURNE_DATE = new Intl.DateTimeFormat('en-AU', {
  timeZone: 'Australia/Melbourne',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

function formatMelbourne(iso: string): string {
  return MELBOURNE_DATE.format(new Date(iso))
}

function generationLabel(g: VersionRow['generation_type']): { label: string; tone: 'default' | 'secondary' | 'outline' | 'destructive' } {
  if (g === 'hard_save') return { label: 'Server render', tone: 'default' }
  if (g === 'manual_upload_fallback') return { label: 'Manual upload', tone: 'secondary' }
  return { label: 'Legacy', tone: 'outline' }
}

export function ReportVersionHistory({ inspectionId, jobNumber, refreshKey }: ReportVersionHistoryProps) {
  const [rows, setRows] = useState<VersionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetch() {
      setLoading(true)
      const { data, error } = await supabase
        .from('pdf_versions')
        .select('id, version_number, created_at, pdf_url, pdf_storage_path, html_storage_path, html_hash, was_emailed, emailed_at, generation_type, created_by')
        .eq('inspection_id', inspectionId)
        .order('version_number', { ascending: false })
      if (cancelled) return
      if (error) {
        console.error('[ReportVersionHistory] fetch failed', error)
        setRows([])
      } else {
        setRows((data ?? []) as unknown as VersionRow[])
      }
      setLoading(false)
    }

    void fetch()
    return () => { cancelled = true }
  }, [inspectionId, refreshKey])

  async function handleDownload(row: VersionRow) {
    if (!row.pdf_storage_path) return
    setDownloadingId(row.id)
    try {
      const { data, error } = await supabase.storage
        .from(REPORT_PDFS_BUCKET)
        .download(row.pdf_storage_path)
      if (error || !data) throw new Error(error?.message ?? 'Download failed')
      const filename = `MRC-${jobNumber ?? 'Report'}-v${row.version_number}.pdf`
      downloadBlobAs(data, filename)
    } catch (err) {
      console.error('[ReportVersionHistory] download failed', err)
      toast.error('Download failed')
    } finally {
      setDownloadingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Loading version history…
      </div>
    )
  }
  if (rows.length === 0) {
    return <div className="text-sm text-muted-foreground py-4">No versions yet. Click Download to create the first hard-save.</div>
  }

  return (
    <div>
      {/* Mobile list ≤md, table ≥md */}
      <ul className="flex flex-col gap-2 md:hidden">
        {rows.map((row) => <VersionCard key={row.id} row={row} jobNumber={jobNumber} onDownload={handleDownload} busy={downloadingId === row.id} />)}
      </ul>
      <table className="hidden md:table w-full text-sm">
        <thead>
          <tr className="text-left text-muted-foreground border-b">
            <th className="py-2 pr-2">Version</th>
            <th className="py-2 pr-2">Type</th>
            <th className="py-2 pr-2">Generated (Melbourne)</th>
            <th className="py-2 pr-2">Emailed</th>
            <th className="py-2 pr-2 text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const gen = generationLabel(row.generation_type)
            const canDownload = row.pdf_storage_path !== null
            return (
              <tr key={row.id} className="border-b last:border-0">
                <td className="py-2 pr-2 font-medium">v{row.version_number}</td>
                <td className="py-2 pr-2"><Badge variant={gen.tone}>{gen.label}</Badge></td>
                <td className="py-2 pr-2">{formatMelbourne(row.created_at)}</td>
                <td className="py-2 pr-2">
                  {row.was_emailed
                    ? <span className="inline-flex items-center gap-1 text-green-700"><Mail className="h-3.5 w-3.5" aria-hidden="true" />{row.emailed_at ? formatMelbourne(row.emailed_at) : 'yes'}</span>
                    : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="py-2 pr-0 text-right">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-[44px]"
                    disabled={!canDownload || downloadingId === row.id}
                    onClick={() => handleDownload(row)}
                  >
                    {downloadingId === row.id
                      ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      : canDownload ? <><Download className="h-4 w-4 mr-1" aria-hidden="true" />Download</>
                      : <><RefreshCw className="h-4 w-4 mr-1" aria-hidden="true" />Legacy</>}
                  </Button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function VersionCard({ row, jobNumber: _jobNumber, onDownload, busy }: {
  row: VersionRow
  jobNumber: string | null
  onDownload: (row: VersionRow) => void
  busy: boolean
}) {
  const gen = generationLabel(row.generation_type)
  const canDownload = row.pdf_storage_path !== null
  return (
    <li className="rounded-lg border bg-card p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-medium">v{row.version_number}</div>
          <Badge variant={gen.tone} className="mt-1">{gen.label}</Badge>
          <div className="text-xs text-muted-foreground mt-1">{formatMelbourne(row.created_at)}</div>
          {row.was_emailed && (
            <div className="text-xs text-green-700 mt-1 inline-flex items-center gap-1">
              <Mail className="h-3.5 w-3.5" aria-hidden="true" />
              Emailed {row.emailed_at ? formatMelbourne(row.emailed_at) : ''}
            </div>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-[48px] shrink-0"
          disabled={!canDownload || busy}
          onClick={() => onDownload(row)}
        >
          {busy
            ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            : canDownload ? <><Download className="h-4 w-4 mr-1" aria-hidden="true" />PDF</>
            : 'Legacy'}
        </Button>
      </div>
    </li>
  )
}

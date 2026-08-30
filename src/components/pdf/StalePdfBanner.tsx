import { useEffect, useState } from 'react'
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { supabase } from '@/integrations/supabase/client'

// Phase 3 Stage 3.4.5: the staleness signal reads the latest active
// ai_summary_versions row's generated_at via the latest_ai_summary view,
// compared to the most recent pdf_versions.created_at.
//
// 2026-08-27: also reads the newest inspection_areas.updated_at. Area edits —
// readings, notes, and hiding a page via include_in_report — change the render
// without touching the AI summary, so the summary timestamp alone reported a
// stale PDF as fresh. The send-time html_hash guard still caught it, but only
// after the admin had already committed to sending.

interface StalePdfBannerProps {
  inspectionId: string | null | undefined
  isRegenerating: boolean
  onRegenerate: () => void | Promise<void>
}

export function StalePdfBanner({ inspectionId, isRegenerating, onRegenerate }: StalePdfBannerProps) {
  const [isStale, setIsStale] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function fetchStaleness() {
      if (!inspectionId) {
        if (!cancelled) setIsStale(false)
        return
      }

      const [summaryRes, areaRes, pdfRes] = await Promise.all([
        supabase
          .from('latest_ai_summary')
          .select('generated_at')
          .eq('inspection_id', inspectionId)
          .maybeSingle(),
        // Area edits — readings, notes, and show/hide (include_in_report) — all
        // change the rendered report but leave the AI summary untouched, so the
        // summary timestamp alone cannot see them.
        // nullsFirst:false because Postgres sorts NULLs first on DESC, and a
        // single legacy row with a null updated_at would otherwise win the sort
        // and mask every real edit.
        supabase
          .from('inspection_areas')
          .select('updated_at')
          .eq('inspection_id', inspectionId)
          .order('updated_at', { ascending: false, nullsFirst: false })
          .limit(1)
          .maybeSingle(),
        // hard_save only, matching the send guard (reportPipeline.ts:182, :273).
        // Without this filter the banner is self-defeating: the legacy EF writes
        // a pdf_versions row on every preview render (generate-inspection-pdf
        // index.ts:2348), and an area edit auto-triggers exactly such a render —
        // so the row that lands is newer than the edit that caused it and the
        // banner clears itself before the admin ever sees it. What actually gets
        // emailed is the newest hard_save, so that is what staleness is measured
        // against.
        supabase
          .from('pdf_versions')
          .select('created_at')
          .eq('inspection_id', inspectionId)
          .eq('generation_type', 'hard_save')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ])

      if (cancelled) return

      const pdfAt = pdfRes.data?.created_at

      // No hard save yet — there is nothing sendable to be out of date, and the
      // send path already blocks with its own "click Download first" prompt
      // (reportPipeline.ts checkSendMismatch -> kind: 'no_hard_save').
      if (!pdfAt) {
        setIsStale(false)
        return
      }

      // Newest edit of any kind. Previously an inspection with no AI summary
      // was reported fresh no matter how much its areas had changed.
      const editedAt = [summaryRes.data?.generated_at, areaRes.data?.updated_at]
        .filter((t): t is string => Boolean(t))
        .map(t => new Date(t).getTime())

      if (editedAt.length === 0) {
        setIsStale(false)
        return
      }

      setIsStale(Math.max(...editedAt) > new Date(pdfAt).getTime())
    }

    fetchStaleness()
    return () => { cancelled = true }
  }, [inspectionId, isRegenerating])

  if (!isStale) return null

  return (
    <div
      role="alert"
      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-yellow-900"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0 text-yellow-600" aria-hidden="true" />
        <p className="text-sm font-medium leading-snug">
          PDF is out of date. Regenerate before sending to customer.
        </p>
      </div>
      <Button
        type="button"
        size="sm"
        onClick={onRegenerate}
        disabled={isRegenerating}
        className="h-12 min-h-[48px] bg-yellow-600 hover:bg-yellow-700 text-white"
      >
        {isRegenerating ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />Regenerating…</>
        ) : (
          <><RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />Regenerate PDF</>
        )}
      </Button>
    </div>
  )
}

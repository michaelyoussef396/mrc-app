import { useEffect, useState } from 'react'
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { supabase } from '@/integrations/supabase/client'

// Phase 3 migration note: the staleness signal currently reads
// inspections.ai_summary_generated_at vs the latest pdf_versions.created_at.
// When Phase 3 ships ai_summary_versions (Stage 3.1), replace the
// inspections.ai_summary_generated_at read with the latest version row's
// generated_at. One-line query change in fetchStaleness().

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

      const [summaryRes, pdfRes] = await Promise.all([
        supabase
          .from('inspections')
          .select('ai_summary_generated_at')
          .eq('id', inspectionId)
          .maybeSingle(),
        supabase
          .from('pdf_versions')
          .select('created_at')
          .eq('inspection_id', inspectionId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ])

      if (cancelled) return

      const summaryAt = summaryRes.data?.ai_summary_generated_at
      const pdfAt = pdfRes.data?.created_at

      if (!summaryAt) {
        setIsStale(false)
        return
      }

      if (!pdfAt) {
        setIsStale(true)
        return
      }

      setIsStale(new Date(summaryAt).getTime() > new Date(pdfAt).getTime())
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

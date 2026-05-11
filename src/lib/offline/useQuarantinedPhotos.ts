// Stage 4.1.5 — UI hook for the quarantine surface.
//
// Polls the quarantinedPhotos store. Photos land here when SyncManager's
// dequeue caption gate rejects them (corruption, pre-Stage-4.1 enqueue,
// manual IndexedDB tampering). The banner uses count to decide whether
// to show; the modal uses the full list to let the tech re-caption + retry
// or discard.

import { useCallback, useEffect, useState } from 'react'
import { syncManager } from './SyncManager'
import type { QuarantinedPhoto } from './types'

const POLL_INTERVAL_MS = 5_000

interface UseQuarantinedPhotosResult {
  count: number
  photos: QuarantinedPhoto[]
  refresh: () => Promise<void>
  requeue: (id: string, caption: string) => Promise<void>
  discard: (id: string) => Promise<void>
}

export function useQuarantinedPhotos(): UseQuarantinedPhotosResult {
  const [count, setCount] = useState(0)
  const [photos, setPhotos] = useState<QuarantinedPhoto[]>([])

  const refresh = useCallback(async () => {
    try {
      const list = await syncManager.getQuarantinedPhotos()
      setPhotos(list)
      setCount(list.length)
    } catch {
      // IndexedDB may be unavailable (e.g. SSR / private mode) — leave state.
    }
  }, [])

  const requeue = useCallback(async (id: string, caption: string) => {
    await syncManager.requeueQuarantinedPhoto(id, caption)
    await refresh()
  }, [refresh])

  const discard = useCallback(async (id: string) => {
    await syncManager.discardQuarantinedPhoto(id)
    await refresh()
  }, [refresh])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [refresh])

  return { count, photos, refresh, requeue, discard }
}

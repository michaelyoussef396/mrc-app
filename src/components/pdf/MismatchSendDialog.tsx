// Phase 5: send-time mismatch guard. Shown when the report data has drifted
// since the admin last hard-saved a version. Two CTAs — re-save fresh and
// send (default), or send the previously-reviewed v{N} as-is.
//
// Mobile-first: all buttons at min-h-[48px] for glove-friendly touch targets.

import { AlertTriangle, Loader2, RefreshCw, Send } from 'lucide-react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export type MismatchChoice = 'hard_save_fresh' | 'send_as_is' | 'cancel'

interface MismatchSendDialogProps {
  open: boolean
  versionNumber: number
  busy: boolean
  onChoose: (choice: MismatchChoice) => void
}

export function MismatchSendDialog({ open, versionNumber, busy, onChoose }: MismatchSendDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => { if (!next && !busy) onChoose('cancel') }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" aria-hidden="true" />
            Report data has changed since v{versionNumber}
          </AlertDialogTitle>
          <AlertDialogDescription>
            The inspection data has been edited since you last saved v{versionNumber}.
            The PDF attached to that version no longer matches the current report.
            Choose how to proceed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex flex-col gap-2 sm:flex-row sm:gap-2">
          <AlertDialogCancel
            className="min-h-[48px] mt-0"
            disabled={busy}
            onClick={() => onChoose('cancel')}
          >
            Cancel
          </AlertDialogCancel>
          <button
            type="button"
            className="min-h-[48px] inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            disabled={busy}
            onClick={() => onChoose('send_as_is')}
          >
            <Send className="h-4 w-4 mr-2" aria-hidden="true" />
            Send v{versionNumber} as-is
          </button>
          <AlertDialogAction
            className="min-h-[48px]"
            disabled={busy}
            onClick={() => onChoose('hard_save_fresh')}
          >
            {busy
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />Saving…</>
              : <><RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />Hard-save fresh &amp; send</>}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

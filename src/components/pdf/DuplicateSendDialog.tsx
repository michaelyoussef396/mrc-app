import { AlertTriangle, Send } from 'lucide-react'

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

export type DuplicateSendChoice = 'send_anyway' | 'cancel'

interface DuplicateSendDialogProps {
  open: boolean
  recipientEmail: string
  sentDate: string
  onChoose: (choice: DuplicateSendChoice) => void
}

export function DuplicateSendDialog({ open, recipientEmail, sentDate, onChoose }: DuplicateSendDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => { if (!next) onChoose('cancel') }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" aria-hidden="true" />
            Report already emailed
          </AlertDialogTitle>
          <AlertDialogDescription>
            An inspection report was emailed to <strong className="text-foreground">{recipientEmail}</strong> on{' '}
            <strong className="text-foreground">{sentDate}</strong>. Sending again will deliver a duplicate to the
            customer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex flex-col gap-2 sm:flex-row sm:gap-2">
          <AlertDialogCancel
            className="min-h-[48px] mt-0"
            onClick={() => onChoose('cancel')}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            className="min-h-[48px] bg-amber-600 hover:bg-amber-700"
            onClick={() => onChoose('send_anyway')}
          >
            <Send className="h-4 w-4 mr-2" aria-hidden="true" />
            Send Again
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

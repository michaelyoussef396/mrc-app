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

interface PhotoDeleteConfirmProps {
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
  deleting?: boolean
}

export function PhotoDeleteConfirm({ isOpen, onConfirm, onCancel, deleting }: PhotoDeleteConfirmProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => { if (!open && !deleting) onCancel() }}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete photo?</AlertDialogTitle>
          <AlertDialogDescription>
            This photo will be removed from the report. It can be recovered later if needed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting} className="min-h-[48px]">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => { e.preventDefault(); onConfirm() }}
            disabled={deleting}
            className="min-h-[48px] bg-red-600 hover:bg-red-700 text-white"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

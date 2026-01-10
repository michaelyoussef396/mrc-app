/**
 * NewLeadDialog - Lead Creation Dialog
 *
 * Simple dialog that displays the lead creation form.
 * Previously had a two-step wizard for HiPages vs Normal leads,
 * now simplified to just show the Normal lead form.
 *
 * Features:
 * - Responsive dialog sizing (95vw mobile, 600px desktop)
 * - ESC key closes dialog
 * - Passes success callback to parent for dashboard refresh
 */

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { NormalLeadForm } from './NormalLeadForm';

// ============================================================================
// TYPES
// ============================================================================

interface NewLeadDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function NewLeadDialog({
  open,
  onClose,
  onSuccess,
}: NewLeadDialogProps): React.ReactElement {

  /**
   * Handle successful form submission
   * Close dialog and trigger parent refresh
   */
  const handleSuccess = (): void => {
    onSuccess();
    onClose();
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-[95vw] sm:max-w-[600px] p-4 sm:p-6 max-h-[85vh] overflow-y-auto pb-8"
        aria-describedby="lead-creation-description"
      >
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">
            Create New Lead
          </DialogTitle>
          <DialogDescription className="text-base">
            Enter lead information to add to your pipeline
          </DialogDescription>
        </DialogHeader>
        <div id="lead-creation-description" className="sr-only">
          Fill out the form to create a new lead
        </div>
        <div className="mt-4">
          <NormalLeadForm onSuccess={handleSuccess} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

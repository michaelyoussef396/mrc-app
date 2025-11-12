/**
 * NewLeadDialog - Main Container Component
 *
 * Orchestrates the dual-path lead creation flow:
 * 1. Step 1: Select lead type (HiPages or Normal)
 * 2. Step 2: Show appropriate form based on selection
 *
 * Features:
 * - Two-step wizard flow with state management
 * - Back navigation from forms to selector
 * - Responsive dialog sizing (95vw mobile, 600px desktop)
 * - ESC key closes dialog
 * - Resets state on close
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
import { LeadTypeSelector } from './LeadTypeSelector';
import { HiPagesLeadForm } from './HiPagesLeadForm';
import { NormalLeadForm } from './NormalLeadForm';
import type { LeadType } from '@/types/lead-creation.types';

// ============================================================================
// TYPES
// ============================================================================

interface NewLeadDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type DialogStep = 'select' | 'form';

// ============================================================================
// COMPONENT
// ============================================================================

export function NewLeadDialog({
  open,
  onClose,
  onSuccess,
}: NewLeadDialogProps): React.ReactElement {
  // State management
  const [step, setStep] = React.useState<DialogStep>('select');
  const [leadType, setLeadType] = React.useState<LeadType | null>(null);

  // Reset state when dialog closes
  React.useEffect(() => {
    if (!open) {
      // Delay reset to allow smooth closing animation
      const timer = setTimeout(() => {
        setStep('select');
        setLeadType(null);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  /**
   * Handle lead type selection
   * Transition from selector to form
   */
  const handleLeadTypeSelect = (type: LeadType): void => {
    setLeadType(type);
    setStep('form');
  };

  /**
   * Handle back navigation from form
   * Return to lead type selector
   */
  const handleBack = (): void => {
    setStep('select');
    setLeadType(null);
  };

  /**
   * Handle successful form submission
   * Close dialog and trigger parent refresh
   */
  const handleSuccess = (): void => {
    onSuccess();
    onClose();
  };

  // ============================================================================
  // RENDER CONTENT
  // ============================================================================

  /**
   * Render dialog header based on current step
   */
  const renderHeader = (): React.ReactElement => {
    if (step === 'select') {
      return (
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">
            Create New Lead
          </DialogTitle>
          <DialogDescription className="text-base">
            Choose the type of lead you want to create
          </DialogDescription>
        </DialogHeader>
      );
    }

    // Form step - show specific title
    const title = leadType === 'hipages' ? 'HiPages Lead' : 'Normal Lead';
    const description =
      leadType === 'hipages'
        ? 'Quick entry from HiPages marketplace'
        : 'Complete lead information';

    return (
      <DialogHeader>
        <DialogTitle className="text-2xl font-semibold">
          {title}
        </DialogTitle>
        <DialogDescription className="text-base">
          {description}
        </DialogDescription>
      </DialogHeader>
    );
  };

  /**
   * Render main content based on current step
   */
  const renderContent = (): React.ReactElement => {
    if (step === 'select') {
      return <LeadTypeSelector onSelect={handleLeadTypeSelect} />;
    }

    // Form step - show appropriate form
    if (leadType === 'hipages') {
      return (
        <HiPagesLeadForm onSuccess={handleSuccess} onBack={handleBack} />
      );
    }

    if (leadType === 'normal') {
      return (
        <NormalLeadForm onSuccess={handleSuccess} onBack={handleBack} />
      );
    }

    // Fallback (should never reach here)
    return <div>Invalid lead type selected</div>;
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-[95vw] sm:max-w-[600px] p-4 sm:p-6 max-h-[90vh] overflow-y-auto"
        aria-describedby="lead-creation-description"
      >
        {renderHeader()}
        <div id="lead-creation-description" className="sr-only">
          {step === 'select'
            ? 'Select between HiPages quick entry or normal lead entry'
            : 'Fill out the form to create a new lead'}
        </div>
        <div className="mt-4">{renderContent()}</div>
      </DialogContent>
    </Dialog>
  );
}

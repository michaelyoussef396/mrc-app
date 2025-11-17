/**
 * INTEGRATION EXAMPLE - NewLeadDialog Usage
 *
 * This file shows how to integrate the new dual-path lead creation
 * components into your dashboard or leads page.
 *
 * Location: Example only - adapt to your needs
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { NewLeadDialog } from '@/components/leads/NewLeadDialog';

// ============================================================================
// EXAMPLE 1: Simple Integration in Leads Dashboard
// ============================================================================

export function LeadsDashboard() {
  const [isNewLeadDialogOpen, setIsNewLeadDialogOpen] = useState(false);

  /**
   * Handle successful lead creation
   * Refresh your leads list here
   */
  const handleLeadCreated = () => {
    console.log('Lead created successfully!');
    // Refetch leads, update state, show success message, etc.
    // Example: queryClient.invalidateQueries(['leads']);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Leads</h1>

        {/* Create New Lead Button */}
        <Button
          onClick={() => setIsNewLeadDialogOpen(true)}
          className="h-12 px-6"
        >
          <Plus className="h-5 w-5 mr-2" />
          Create New Lead
        </Button>
      </div>

      {/* Your leads list/grid here */}
      <div className="space-y-4">
        {/* LeadCard components... */}
      </div>

      {/* New Lead Dialog */}
      <NewLeadDialog
        open={isNewLeadDialogOpen}
        onClose={() => setIsNewLeadDialogOpen(false)}
        onSuccess={handleLeadCreated}
      />
    </div>
  );
}

// ============================================================================
// EXAMPLE 2: Integration with React Query (Data Refetching)
// ============================================================================

export function LeadsDashboardWithReactQuery() {
  const [isNewLeadDialogOpen, setIsNewLeadDialogOpen] = useState(false);

  // Example: Using React Query to fetch leads
  // const { data: leads, refetch } = useQuery(['leads'], fetchLeads);

  const handleLeadCreated = async () => {
    // Refetch leads after creation
    // await refetch();
    console.log('Lead created, refetching...');
  };

  return (
    <div className="p-6">
      <Button onClick={() => setIsNewLeadDialogOpen(true)}>
        Create New Lead
      </Button>

      <NewLeadDialog
        open={isNewLeadDialogOpen}
        onClose={() => setIsNewLeadDialogOpen(false)}
        onSuccess={handleLeadCreated}
      />
    </div>
  );
}

// ============================================================================
// EXAMPLE 3: Integration with Floating Action Button (FAB)
// ============================================================================

export function LeadsDashboardWithFAB() {
  const [isNewLeadDialogOpen, setIsNewLeadDialogOpen] = useState(false);

  return (
    <div className="relative p-6">
      {/* Your content */}
      <div className="space-y-4">
        {/* LeadCard components... */}
      </div>

      {/* Floating Action Button (Mobile-friendly) */}
      <button
        onClick={() => setIsNewLeadDialogOpen(true)}
        className="
          fixed bottom-6 right-6 z-50
          h-14 w-14 sm:h-16 sm:w-16
          rounded-full
          bg-blue-600 hover:bg-blue-700
          text-white
          shadow-lg
          transition-all
          hover:scale-110
          focus:ring-4 focus:ring-blue-300
        "
        aria-label="Create new lead"
      >
        <Plus className="h-6 w-6 sm:h-8 sm:w-8 mx-auto" />
      </button>

      <NewLeadDialog
        open={isNewLeadDialogOpen}
        onClose={() => setIsNewLeadDialogOpen(false)}
        onSuccess={() => {
          // Handle success
          console.log('Lead created!');
        }}
      />
    </div>
  );
}

// ============================================================================
// EXAMPLE 4: Programmatic Opening (e.g., from URL params)
// ============================================================================

export function LeadsDashboardWithURLControl() {
  const [isNewLeadDialogOpen, setIsNewLeadDialogOpen] = useState(false);

  // Example: Open dialog based on URL param
  React.useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('create') === 'lead') {
      setIsNewLeadDialogOpen(true);
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  return (
    <div className="p-6">
      <Button onClick={() => setIsNewLeadDialogOpen(true)}>
        Create New Lead
      </Button>

      <NewLeadDialog
        open={isNewLeadDialogOpen}
        onClose={() => setIsNewLeadDialogOpen(false)}
        onSuccess={() => {
          console.log('Lead created from URL trigger!');
        }}
      />
    </div>
  );
}

// ============================================================================
// EXAMPLE 5: With Keyboard Shortcut
// ============================================================================

export function LeadsDashboardWithKeyboardShortcut() {
  const [isNewLeadDialogOpen, setIsNewLeadDialogOpen] = useState(false);

  // Keyboard shortcut: Ctrl/Cmd + K to open
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsNewLeadDialogOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="p-6">
      <div className="flex items-center gap-2">
        <Button onClick={() => setIsNewLeadDialogOpen(true)}>
          Create New Lead
        </Button>
        <span className="text-sm text-gray-500">
          or press{' '}
          <kbd className="px-2 py-1 bg-gray-100 rounded border">
            Ctrl + K
          </kbd>
        </span>
      </div>

      <NewLeadDialog
        open={isNewLeadDialogOpen}
        onClose={() => setIsNewLeadDialogOpen(false)}
        onSuccess={() => {
          console.log('Lead created via keyboard shortcut!');
        }}
      />
    </div>
  );
}

// ============================================================================
// EXAMPLE 6: With Success Analytics Tracking
// ============================================================================

export function LeadsDashboardWithAnalytics() {
  const [isNewLeadDialogOpen, setIsNewLeadDialogOpen] = useState(false);

  const handleLeadCreated = () => {
    // Track successful lead creation in analytics
    // Example: gtag('event', 'lead_created', { method: 'dual_path_form' });

    console.log('Lead created, tracking analytics...');

    // Show success notification
    // Example: showNotification('Lead created successfully!');

    // Refetch leads
    // Example: refetchLeads();
  };

  return (
    <div className="p-6">
      <Button onClick={() => setIsNewLeadDialogOpen(true)}>
        Create New Lead
      </Button>

      <NewLeadDialog
        open={isNewLeadDialogOpen}
        onClose={() => setIsNewLeadDialogOpen(false)}
        onSuccess={handleLeadCreated}
      />
    </div>
  );
}

// ============================================================================
// USAGE NOTES
// ============================================================================

/**
 * Props for NewLeadDialog:
 *
 * @param {boolean} open - Controls dialog visibility
 * @param {() => void} onClose - Called when dialog should close (ESC, overlay click, cancel)
 * @param {() => void} onSuccess - Called after successful lead creation
 *
 * Features:
 * - Dual-path workflow (HiPages quick entry vs Normal full entry)
 * - Auto-save to Supabase 'leads' table
 * - Toast notifications for success/error
 * - Mobile-first responsive design
 * - Full accessibility (WCAG 2.1 AA)
 * - Form validation with Zod schemas
 * - Auto-format phone numbers
 * - Loading states during submission
 */

/**
 * Lead Creation Flow:
 *
 * 1. User clicks "Create New Lead" button
 * 2. NewLeadDialog opens showing LeadTypeSelector
 * 3. User selects lead type:
 *    a. HiPages Lead → Shows HiPagesLeadForm (4 fields)
 *    b. Normal Lead → Shows NormalLeadForm (8 fields)
 * 4. User fills form and submits
 * 5. Data validates with Zod schema
 * 6. API call to Supabase 'leads' table
 * 7. Success: Toast notification, onSuccess callback, dialog closes
 * 8. Error: Toast error message, form stays open for retry
 */

/**
 * Database Fields Populated:
 *
 * HiPages Lead:
 * - full_name: 'HiPages Lead' (default)
 * - email: from form
 * - phone: from form (auto-formatted)
 * - property_address_street: 'To be confirmed' (default)
 * - property_address_suburb: from form
 * - property_address_postcode: from form
 * - property_address_state: 'VIC' (always)
 * - lead_source: 'hipages'
 * - status: 'new_lead' (temporary until migration)
 * - notes: optional
 *
 * Normal Lead:
 * - full_name: from form
 * - email: from form
 * - phone: from form (auto-formatted)
 * - property_address_street: from form
 * - property_address_suburb: from form
 * - property_address_postcode: from form
 * - property_address_state: 'VIC' (always)
 * - urgency: from form (ASAP, within_week, etc.)
 * - issue_description: from form (20-1000 chars)
 * - property_type: optional
 * - lead_source: 'website' (default)
 * - status: 'new_lead'
 * - notes: optional
 */

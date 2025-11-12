import { Loader2, AlertCircle, Clipboard } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { InspectionJobCard } from '@/components/inspection/InspectionJobCard';
import { TopNavbar } from '@/components/layout/TopNavbar';
import {
  useInspectionLeads,
  useInspectionLeadsCount,
} from '@/hooks/useInspectionLeads';

/**
 * SelectLead Page
 *
 * Displays leads ready for inspection (status: 'inspection_waiting')
 * Sorted by urgency (ASAP → urgent → high → medium → low) then oldest first (FIFO)
 *
 * Features:
 * - Mobile-first responsive grid layout
 * - Real-time updates via Supabase Realtime
 * - Loading, error, and empty states
 * - Lead count badge in header
 * - Touch-friendly job cards (≥48px targets)
 *
 * Route: /inspection/select-lead
 */
export function SelectLead() {
  // Fetch inspection-ready leads
  const {
    data: leads,
    isLoading,
    error,
  } = useInspectionLeads();

  // Get lead count for header badge
  const { data: leadCount } = useInspectionLeadsCount();

  return (
    <>
      <TopNavbar />
      <div className="container mx-auto p-4 md:p-6 space-y-6 pb-20">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">Select Lead for Inspection</h1>
              {leadCount !== undefined && leadCount > 0 && (
                <Badge
                  variant="default"
                  className="h-7 min-w-7 px-2 text-base font-semibold bg-blue-600"
                >
                  {leadCount}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              Choose a lead to start the inspection process
            </p>
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="ml-3 text-muted-foreground">Loading inspection leads...</p>
          </div>
        ) : error ? (
          /* Error State */
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <p className="text-destructive font-semibold mb-2">
                Error loading inspection leads
              </p>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                {error instanceof Error ? error.message : 'Something went wrong'}
              </p>
              <p className="text-xs text-muted-foreground mt-4">
                Try refreshing the page or contact support if the problem persists
              </p>
            </CardContent>
          </Card>
        ) : leads && leads.length > 0 ? (
          /* Content State: Grid of Job Cards */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {leads.map((lead) => (
              <InspectionJobCard key={lead.id} lead={lead} />
            ))}
          </div>
        ) : (
          /* Empty State */
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Clipboard className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="font-semibold mb-2">No leads ready for inspection</p>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                There are currently no leads waiting for inspection.
                When leads are ready, they will appear here sorted by urgency.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Real-time Updates Info (Development Only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="text-xs text-muted-foreground text-center mt-4">
            🔄 Real-time updates enabled • Auto-refresh every 30s
          </div>
        )}
      </div>
    </>
  );
}

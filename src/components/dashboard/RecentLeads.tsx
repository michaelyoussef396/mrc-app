import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Phone, Clock, ArrowRight, User } from 'lucide-react';
import { useRecentLeads } from '@/hooks/useDashboardStats';
import { STATUS_FLOW, LeadStatus } from '@/lib/statusFlow';
import { cn } from '@/lib/utils';

// Australian date formatting helper
function formatAustralianDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Just now (< 1 minute)
  if (diffMins < 1) {
    return 'Just now';
  }

  // Minutes ago (< 1 hour)
  if (diffMins < 60) {
    return `${diffMins} min${diffMins === 1 ? '' : 's'} ago`;
  }

  // Hours ago (< 24 hours)
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  }

  // Yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }

  // This week (show day name)
  if (diffDays < 7) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  }

  // Otherwise: Australian format "13 Jan 2026"
  const day = date.getDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

// Get status badge styles from STATUS_FLOW
function getStatusBadgeStyles(status: string): { bg: string; text: string; label: string } {
  const statusConfig = STATUS_FLOW[status as LeadStatus];

  if (!statusConfig) {
    return { bg: 'bg-gray-100', text: 'text-gray-700', label: status };
  }

  // Map HSL colors to Tailwind classes for better compatibility
  const colorMap: Record<string, { bg: string; text: string }> = {
    'new_lead': { bg: 'bg-blue-100', text: 'text-blue-700' },
    'inspection_waiting': { bg: 'bg-amber-100', text: 'text-amber-700' },
    'approve_inspection_report': { bg: 'bg-purple-100', text: 'text-purple-700' },
    'inspection_email_approval': { bg: 'bg-sky-100', text: 'text-sky-700' },
    'closed': { bg: 'bg-green-100', text: 'text-green-700' },
    'not_landed': { bg: 'bg-red-100', text: 'text-red-700' },
  };

  const colors = colorMap[status] || { bg: 'bg-gray-100', text: 'text-gray-700' };

  return {
    bg: colors.bg,
    text: colors.text,
    label: statusConfig.shortTitle,
  };
}

export function RecentLeads() {
  const { data: recentLeads, isLoading, error } = useRecentLeads(10);

  // Error state
  if (error) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Leads</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-red-500">
            <p>Failed to load recent leads</p>
            <p className="text-sm text-muted-foreground mt-1">Please try refreshing the page</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Leads</CardTitle>
        <Link to="/leads">
          <Button variant="ghost" size="sm">
            View All
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          // Loading skeleton
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
                <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                  <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : recentLeads && recentLeads.length > 0 ? (
          <div className="space-y-2">
            {recentLeads.map((lead) => {
              const statusStyles = getStatusBadgeStyles(lead.status);

              return (
                <Link
                  key={lead.id}
                  to={`/leads/${lead.id}`}
                  className="block group"
                >
                  <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    {/* Icon */}
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="font-medium text-sm truncate group-hover:text-primary">
                          {lead.display_name}
                        </p>
                        <Badge
                          variant="secondary"
                          className={cn(
                            'text-xs flex-shrink-0',
                            statusStyles.bg,
                            statusStyles.text
                          )}
                        >
                          {statusStyles.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        {/* Phone */}
                        {lead.phone && (
                          <>
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              <span>{lead.phone}</span>
                            </div>
                            <span className="hidden sm:inline">•</span>
                          </>
                        )}
                        {/* Suburb */}
                        <span className="truncate">{lead.suburb}</span>
                        <span>•</span>
                        {/* Date */}
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatAustralianDate(lead.created_at)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Arrow icon (visible on hover) */}
                    <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          // Empty state
          <div className="text-center py-8 text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="font-medium">No leads yet</p>
            <p className="text-sm mt-1">Create your first lead to get started</p>
            <Link to="/leads">
              <Button variant="link" className="mt-2">
                Create your first lead
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

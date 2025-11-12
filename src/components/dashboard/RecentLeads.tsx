import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Phone, Globe, Clock, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useRecentLeads } from '@/hooks/useDashboardStats';
import { cn } from '@/lib/utils';

export function RecentLeads() {
  const { data: recentLeads, isLoading } = useRecentLeads(10);

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
              const isHiPages = lead.lead_source === 'hipages';

              return (
                <Link
                  key={lead.id}
                  to={`/leads/${lead.id}`}
                  className="block group"
                >
                  <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    {/* Icon */}
                    <div className={cn(
                      'flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center',
                      isHiPages ? 'bg-purple-100' : 'bg-blue-100'
                    )}>
                      {isHiPages ? (
                        <Phone className="h-5 w-5 text-purple-600" />
                      ) : (
                        <Globe className="h-5 w-5 text-blue-600" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm truncate group-hover:text-primary">
                          {lead.display_name}
                        </p>
                        <Badge
                          variant="secondary"
                          className={cn(
                            'text-xs flex-shrink-0',
                            isHiPages ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                          )}
                        >
                          {isHiPages ? 'HiPages' : 'New Lead'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="truncate">{lead.suburb}</span>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}</span>
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
          <div className="text-center py-8 text-muted-foreground">
            <p>No recent leads yet</p>
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

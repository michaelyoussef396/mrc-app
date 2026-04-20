import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import {
  UserPlus,
  ArrowRight,
  Calendar,
  Mail,
  XCircle,
  Archive,
  Activity,
  MailCheck,
  MailX,
  Bell,
  Clock,
  PencilLine,
} from 'lucide-react';
import type { TimelineEvent, FieldEditMetadata } from '@/hooks/useActivityTimeline';
import { formatDateTimeAU } from '@/lib/dateUtils';

// Icon component lookup
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  UserPlus,
  ArrowRight,
  Calendar,
  Mail,
  XCircle,
  Archive,
  Activity,
  MailCheck,
  MailX,
  Bell,
  PencilLine,
};

const MAX_DIFF_STRING_LENGTH = 60;

function formatDiffValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') {
    const truncated =
      value.length > MAX_DIFF_STRING_LENGTH
        ? `${value.slice(0, MAX_DIFF_STRING_LENGTH)}…`
        : value;
    return `"${truncated}"`;
  }
  const json = JSON.stringify(value);
  return json.length > MAX_DIFF_STRING_LENGTH
    ? `${json.slice(0, MAX_DIFF_STRING_LENGTH)}…`
    : json;
}

function getFieldEditMetadata(
  metadata: Record<string, unknown> | undefined
): FieldEditMetadata | null {
  if (!metadata) return null;
  const changes = metadata.changes;
  if (!Array.isArray(changes)) return null;
  return metadata as unknown as FieldEditMetadata;
}

// Relative time formatting (Australian)
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

  if (diffDays < 7) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  }

  const day = date.getDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${day} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

// Source badge colors
function getSourceBadge(source: TimelineEvent['source']) {
  switch (source) {
    case 'email':
      return { label: 'Email', className: 'bg-teal-100 text-teal-700' };
    case 'notification':
      return { label: 'Notification', className: 'bg-blue-100 text-blue-700' };
    default:
      return null;
  }
}

interface ActivityTimelineProps {
  events: TimelineEvent[];
  isLoading: boolean;
  showLeadName?: boolean;
  compact?: boolean;
}

export function ActivityTimeline({
  events,
  isLoading,
  showLeadName = true,
  compact = false,
}: ActivityTimelineProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(compact ? 4 : 6)].map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-full bg-gray-100 animate-pulse flex-shrink-0" />
            <div className="flex-1 space-y-2 pt-0.5">
              <div className="h-4 w-40 bg-gray-100 animate-pulse rounded" />
              <div className="h-3 w-28 bg-gray-100 animate-pulse rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-8">
        <Activity className="h-10 w-10 mx-auto mb-2 text-gray-300" />
        <p className="text-sm text-gray-500">No activity yet</p>
        <p className="text-xs text-gray-400 mt-1">Activities will appear here as the lead progresses.</p>
      </div>
    );
  }

  return (
    <div className={compact ? 'space-y-0.5' : 'space-y-0'}>
      {events.map((event, index) => {
        const IconComponent = ICON_MAP[event.iconName] || Activity;
        // Parse the icon color classes: "text-blue-600 bg-blue-100" -> separate
        const [textColor, bgColor] = event.iconColor.split(' ');
        const sourceBadge = showLeadName ? getSourceBadge(event.source) : null;
        const isLast = index === events.length - 1;

        if (compact) {
          // Compact view for dashboard
          return (
            <div
              key={event.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${bgColor}`}>
                <IconComponent className={`h-4 w-4 ${textColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {event.title}
                  </p>
                  {sourceBadge && (
                    <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 flex-shrink-0 ${sourceBadge.className}`}>
                      {sourceBadge.label}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{formatRelativeTime(event.timestamp)}</span>
                  {showLeadName && event.leadName && (
                    <>
                      <span>-</span>
                      <Link
                        to={`/leads/${event.leadId}`}
                        className="text-blue-600 hover:underline truncate"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {event.leadName}
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        }

        // Full timeline view for lead detail
        const fieldEdit =
          event.type === 'field_edit' ? getFieldEditMetadata(event.metadata) : null;

        return (
          <div
            key={event.id}
            className={`relative pl-6 ${isLast ? 'pb-0' : 'pb-4'} ${isLast ? '' : 'border-l-2 border-gray-200'} ml-[7px]`}
          >
            {/* Timeline dot */}
            <div className={`absolute left-[-9px] top-0 h-4 w-4 rounded-full border-2 border-white ${bgColor}`}>
              <IconComponent className={`h-2 w-2 absolute top-[2px] left-[2px] ${textColor}`} />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                {fieldEdit && (
                  <span className="inline-flex items-center rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 text-xs font-medium">
                    v{fieldEdit.version}
                  </span>
                )}
                <p className="text-sm font-medium">{event.title}</p>
                {sourceBadge && (
                  <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${sourceBadge.className}`}>
                    {sourceBadge.label}
                  </Badge>
                )}
              </div>
              {fieldEdit ? (
                <ul className="space-y-0.5">
                  {fieldEdit.changes.map((change, i) => (
                    <li key={i} className="text-xs text-muted-foreground">
                      <span className="font-medium">{change.field}:</span>{' '}
                      {formatDiffValue(change.old)} → {formatDiffValue(change.new)}
                    </li>
                  ))}
                </ul>
              ) : (
                event.description && (
                  <p className="text-xs text-gray-500">{event.description}</p>
                )
              )}
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDateTimeAU(event.timestamp)}
                {event.actorName && (
                  <span className="text-gray-500"> — {event.actorName}</span>
                )}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  UserPlus,
  ArrowRight,
  Calendar,
  Mail,
  XCircle,
  Archive,
  Activity,
  MailCheck,
  MailWarning,
  MailX,
  Bell,
  Clock,
  PencilLine,
  StickyNote,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { TimelineEvent, FieldEditMetadata } from '@/hooks/useActivityTimeline';
import { formatDateTimeAU } from '@/lib/dateUtils';
import { getFieldLabel } from '@/lib/utils/fieldLabels';
import { STATUS_FLOW } from '@/lib/statusFlow';

function humaniseEnumKey(key: string): string {
  const statusConfig = STATUS_FLOW[key as keyof typeof STATUS_FLOW];
  if (statusConfig) return statusConfig.title;
  return key.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

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
  MailWarning,
  MailX,
  Bell,
  PencilLine,
  StickyNote,
  Layers,
};

const MAX_DIFF_STRING_LENGTH = 60;

function formatDiffValue(value: unknown, fieldName?: string): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') {
    if (fieldName === 'status' || fieldName === 'Status') return humaniseEnumKey(value);
    if (/^[a-z][a-z_]+$/.test(value) && value.includes('_')) return humaniseEnumKey(value);
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

interface SectionMilestoneChange {
  field: string;
  old: unknown;
  new: unknown;
}

function getSectionMilestoneChanges(
  metadata: Record<string, unknown> | undefined
): SectionMilestoneChange[] | null {
  if (!metadata) return null;
  const changes = metadata.changes;
  if (!Array.isArray(changes)) return null;
  return changes as SectionMilestoneChange[];
}

interface SectionMilestoneRowProps {
  changes: SectionMilestoneChange[];
}

function SectionMilestoneRow({ changes }: SectionMilestoneRowProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 transition-colors mt-0.5"
          aria-expanded={isOpen}
        >
          {isOpen ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
          {isOpen ? 'Hide' : 'Show'} {changes.length} field{changes.length === 1 ? '' : 's'}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="mt-1 space-y-0.5">
          {changes.map((change, i) => (
            <li key={i} className="text-xs text-muted-foreground">
              <span className="font-medium">{getFieldLabel(change.field)}:</span>{' '}
              {formatDiffValue(change.old, change.field)} → {formatDiffValue(change.new, change.field)}
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
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

function EmailBodyExpander({ messageId, leadId }: { messageId: string; leadId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggle = useCallback(async () => {
    if (isOpen) {
      setIsOpen(false);
      setHtml(null);
      return;
    }
    setIsOpen(true);
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Session expired — please re-login');
      }
      const { data, error: efError } = await supabase.functions.invoke('fetch-resend-email', {
        body: { messageId, leadId },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (efError) throw new Error(efError.message);
      if (data?.error) throw new Error(data.error);
      setHtml(data?.html_body ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load email');
    } finally {
      setLoading(false);
    }
  }, [isOpen, messageId, leadId]);

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={handleToggle}
        className="inline-flex items-center gap-1 text-xs text-teal-600 hover:text-teal-800 transition-colors min-h-[48px] min-w-[48px] px-1"
      >
        {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        {isOpen ? 'Hide email' : 'View email'}
      </button>
      {isOpen && (
        <div className="mt-1.5">
          {loading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-teal-400 border-t-transparent" />
              Loading email content…
            </div>
          )}
          {error && (
            <p className="text-xs text-red-500 py-1">{error}</p>
          )}
          {html && !loading && (
            <div
              className="text-xs border border-gray-200 rounded-md p-3 bg-white max-h-60 overflow-y-auto"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }}
            />
          )}
          {!html && !loading && !error && (
            <p className="text-xs text-muted-foreground py-1">No email body available</p>
          )}
        </div>
      )}
    </div>
  );
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
        const noteAdded =
          event.type === 'note_added' && event.metadata && typeof event.metadata.note_text === 'string'
            ? (event.metadata as { note_text: string; author?: string })
            : null;
        const sectionMilestoneChanges =
          event.type === 'section_milestone'
            ? getSectionMilestoneChanges(event.metadata)
            : null;

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
                {sectionMilestoneChanges && (
                  <span className="inline-flex items-center rounded-full bg-indigo-100 text-indigo-700 px-2 py-0.5 text-xs font-medium">
                    Section Save
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
                      <span className="font-medium">{getFieldLabel(change.field)}:</span>{' '}
                      {formatDiffValue(change.old, change.field)} → {formatDiffValue(change.new, change.field)}
                    </li>
                  ))}
                </ul>
              ) : sectionMilestoneChanges ? (
                <SectionMilestoneRow changes={sectionMilestoneChanges} />
              ) : noteAdded ? (
                <blockquote className="text-xs text-gray-700 border-l-2 border-gray-300 pl-2 whitespace-pre-wrap">
                  {noteAdded.note_text}
                </blockquote>
              ) : (
                event.description && (
                  <p className="text-xs text-gray-500">{event.description}</p>
                )
              )}
              {event.source === 'email' && event.metadata?.provider_message_id && event.leadId && (
                <EmailBodyExpander
                  messageId={event.metadata.provider_message_id as string}
                  leadId={event.leadId}
                />
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

import { useQuery } from '@tanstack/react-query';
import { FileText, Loader2, RefreshCw, ExternalLink, Mail } from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface InspectionReportHistoryProps {
  inspectionId: string;
  leadId: string;
  onRegenerate: () => void;
  isRegenerating: boolean;
}

interface PdfVersionRow {
  id: string;
  version_number: number;
  created_at: string | null;
  created_by: string | null;
  pdf_url: string;
}

interface EmailLogRow {
  id: string;
  subject: string;
  recipient_email: string;
  sent_at: string | null;
  created_at: string | null;
  status: string;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Melbourne',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(iso));
}

async function fetchPdfVersions(inspectionId: string): Promise<PdfVersionRow[]> {
  const { data, error } = await supabase
    .from('pdf_versions')
    .select('id, version_number, created_at, created_by, pdf_url')
    .eq('inspection_id', inspectionId)
    .order('version_number', { ascending: false });
  if (error) throw error;
  return (data ?? []) as PdfVersionRow[];
}

async function fetchEmailLogs(leadId: string): Promise<EmailLogRow[]> {
  const { data, error } = await supabase
    .from('email_logs')
    .select('id, subject, recipient_email, sent_at, created_at, status')
    .eq('lead_id', leadId)
    .order('sent_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as EmailLogRow[];
}

async function fetchGeneratorNames(userIds: string[]): Promise<Record<string, string>> {
  if (userIds.length === 0) return {};
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', userIds);
  if (error) return {};
  const map: Record<string, string> = {};
  for (const row of data ?? []) {
    map[row.id as string] = (row.full_name as string) || 'Unknown';
  }
  return map;
}

function statusBadgeClass(status: string): string {
  const s = status.toLowerCase();
  if (s === 'delivered') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  if (s === 'failed' || s === 'bounced') return 'bg-red-100 text-red-800 border-red-200';
  return 'bg-blue-100 text-blue-800 border-blue-200';
}

export function InspectionReportHistory({
  inspectionId,
  leadId,
  onRegenerate,
  isRegenerating,
}: InspectionReportHistoryProps) {
  const { data: versions = [], isLoading: versionsLoading } = useQuery({
    queryKey: ['pdf-versions', inspectionId],
    queryFn: () => fetchPdfVersions(inspectionId),
    staleTime: 30_000,
  });

  const { data: emails = [], isLoading: emailsLoading } = useQuery({
    queryKey: ['email-logs', leadId],
    queryFn: () => fetchEmailLogs(leadId),
    staleTime: 30_000,
  });

  const generatorIds = Array.from(
    new Set(versions.map((v) => v.created_by).filter((id): id is string => !!id)),
  );

  const { data: generatorNames = {} } = useQuery({
    queryKey: ['pdf-generator-names', generatorIds.sort().join(',')],
    queryFn: () => fetchGeneratorNames(generatorIds),
    enabled: generatorIds.length > 0,
    staleTime: 5 * 60_000,
  });

  const isLoading = versionsLoading || emailsLoading;

  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 flex items-center gap-2 text-sm text-[#86868b]">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading report history...
      </div>
    );
  }

  const hasVersions = versions.length > 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="h-5 w-5 text-violet-600 flex-shrink-0" />
          <h3 className="font-semibold text-[#1d1d1f] truncate">Inspection Report History</h3>
          {hasVersions && (
            <Badge variant="secondary" className="ml-1">
              {versions.length} version{versions.length === 1 ? '' : 's'}
            </Badge>
          )}
        </div>
        {hasVersions && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRegenerate}
            disabled={isRegenerating}
          >
            {isRegenerating ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1.5" />
            )}
            {isRegenerating ? 'Regenerating...' : 'Regenerate'}
          </Button>
        )}
      </div>

      {!hasVersions ? (
        <p className="text-sm text-[#86868b] italic">No PDF generated yet</p>
      ) : (
        <Accordion type="multiple" defaultValue={['versions']} className="w-full">
          <AccordionItem value="versions">
            <AccordionTrigger className="text-sm font-semibold">
              PDF Versions ({versions.length})
            </AccordionTrigger>
            <AccordionContent>
              <ul className="space-y-2">
                {versions.map((v, idx) => {
                  const isLatest = idx === 0;
                  const generator = v.created_by ? generatorNames[v.created_by] ?? 'Unknown' : 'Unknown';
                  return (
                    <li
                      key={v.id}
                      className="flex items-center justify-between gap-3 py-2 border-b border-gray-50 last:border-0"
                    >
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <Badge variant="outline">v{v.version_number}</Badge>
                        {isLatest && (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">
                            Current
                          </Badge>
                        )}
                        <span className="text-xs text-[#86868b]">
                          {formatDateTime(v.created_at)}
                        </span>
                        <span className="text-xs text-[#86868b]">• by {generator}</span>
                      </div>
                      <a
                        href={v.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#007AFF] hover:underline"
                      >
                        View <ExternalLink className="h-3 w-3" />
                      </a>
                    </li>
                  );
                })}
              </ul>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="emails">
            <AccordionTrigger className="text-sm font-semibold">
              Email History ({emails.length})
            </AccordionTrigger>
            <AccordionContent>
              {emails.length === 0 ? (
                <p className="text-sm text-[#86868b] italic">No emails sent yet</p>
              ) : (
                <ul className="space-y-2">
                  {emails.map((e) => (
                    <li
                      key={e.id}
                      className="flex items-start justify-between gap-3 py-2 border-b border-gray-50 last:border-0"
                    >
                      <div className="flex items-start gap-2 min-w-0 flex-1">
                        <Mail className="h-3.5 w-3.5 text-[#86868b] flex-shrink-0 mt-1" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-[#1d1d1f] truncate">{e.subject}</p>
                          <p className="text-xs text-[#86868b] truncate">
                            to {e.recipient_email} • {formatDateTime(e.sent_at ?? e.created_at)}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className={statusBadgeClass(e.status)}>
                        {e.status}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  );
}

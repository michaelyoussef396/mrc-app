// Phase 1 internal notes feed for a lead — text only, both roles read and
// write, author-only soft delete. Backed by public.lead_notes via
// src/lib/api/leadNotes.ts. NEVER customer-visible. Sits beside the frozen
// legacy "Internal Notes" card in LeadDetail; the two are separate surfaces.

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, MessageSquare, RefreshCw, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import {
  createLeadNote,
  listLeadNotes,
  softDeleteLeadNote,
  LEAD_NOTE_MAX_LENGTH,
  type LeadNote,
} from '@/lib/api/leadNotes';
import { formatDateTimeAU, formatRelativeOrDateAU } from '@/lib/dateUtils';

interface LeadNotesSectionProps {
  leadId: string;
}

const OPTIMISTIC_ID_PREFIX = 'optimistic-';
const UNKNOWN_AUTHOR = 'Unknown';

function leadNotesKey(leadId: string) {
  return ['lead-notes', leadId] as const;
}

function isOptimistic(note: LeadNote) {
  return note.id.startsWith(OPTIMISTIC_ID_PREFIX);
}

export function LeadNotesSection({ leadId }: LeadNotesSectionProps) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState('');
  const [pendingDelete, setPendingDelete] = useState<LeadNote | null>(null);

  const authorName = profile?.full_name?.trim() || user?.email || UNKNOWN_AUTHOR;
  const queryKey = leadNotesKey(leadId);

  const {
    data: notes = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: () => listLeadNotes(leadId),
    staleTime: 15_000,
  });

  const invalidateNotes = () => {
    queryClient.invalidateQueries({ queryKey });
    queryClient.invalidateQueries({ queryKey: ['activity-timeline'] });
  };

  const addNote = useMutation({
    mutationFn: (body: string) => createLeadNote({ leadId, body, authorName }),
    onMutate: async (body) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<LeadNote[]>(queryKey) ?? [];
      const now = new Date().toISOString();
      const optimistic: LeadNote = {
        id: `${OPTIMISTIC_ID_PREFIX}${now}`,
        lead_id: leadId,
        author_id: user?.id ?? '',
        body: body.trim(),
        created_at: now,
        updated_at: now,
        deleted_at: null,
        authorName,
      };
      queryClient.setQueryData<LeadNote[]>(queryKey, [optimistic, ...previous]);
      setDraft('');
      return { previous, body };
    },
    onError: (error, _body, context) => {
      if (context) {
        queryClient.setQueryData(queryKey, context.previous);
        setDraft(context.body);
      }
      toast.error(error instanceof Error ? error.message : 'Could not save note — please try again');
    },
    onSettled: invalidateNotes,
  });

  const deleteNote = useMutation({
    mutationFn: (noteId: string) => softDeleteLeadNote(noteId),
    onMutate: async (noteId) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<LeadNote[]>(queryKey) ?? [];
      queryClient.setQueryData<LeadNote[]>(
        queryKey,
        previous.filter((note) => note.id !== noteId),
      );
      return { previous };
    },
    onError: (error, _noteId, context) => {
      if (context) queryClient.setQueryData(queryKey, context.previous);
      toast.error(error instanceof Error ? error.message : 'Could not delete note — please try again');
    },
    onSettled: invalidateNotes,
  });

  const canSubmit = draft.trim().length > 0 && !addNote.isPending;

  const handleSubmit = () => {
    if (!canSubmit) return;
    addNote.mutate(draft);
  };

  const handleConfirmDelete = () => {
    if (!pendingDelete) return;
    deleteNote.mutate(pendingDelete.id);
    setPendingDelete(null);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Notes
        </CardTitle>
        <p className="text-xs text-muted-foreground">Internal to the team — never shown to customers.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-xs font-normal text-muted-foreground" htmlFor="lead-note-draft">
            Add a note
          </label>
          <Textarea
            id="lead-note-draft"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={3}
            maxLength={LEAD_NOTE_MAX_LENGTH}
            placeholder="What happened, what's next…"
            disabled={addNote.isPending}
          />
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="h-12 w-full sm:w-auto"
          >
            {addNote.isPending ? <Loader2 className="animate-spin" /> : <Send />}
            {addNote.isPending ? 'Saving…' : 'Add Note'}
          </Button>
        </div>

        <div className="space-y-2" aria-live="polite" aria-label="Lead notes">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading notes…
            </div>
          ) : isError ? (
            <div className="rounded-md border border-dashed bg-slate-50/50 p-3 space-y-2">
              <p className="text-sm text-destructive">Couldn't load notes.</p>
              <Button type="button" variant="outline" onClick={() => refetch()} className="h-12 w-full sm:w-auto">
                <RefreshCw />
                Retry
              </Button>
            </div>
          ) : notes.length === 0 ? (
            <div className="rounded-md border border-dashed bg-slate-50/50 p-3">
              <p className="text-sm italic text-muted-foreground">No notes yet.</p>
            </div>
          ) : (
            notes.map((note) => {
              const isOwn = note.author_id === user?.id;
              return (
                <article key={note.id} className="rounded-md border bg-slate-50 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                        <span className="font-medium truncate">{note.authorName ?? UNKNOWN_AUTHOR}</span>
                        <time dateTime={note.created_at} title={formatDateTimeAU(note.created_at)}>
                          {isOptimistic(note) ? 'Saving…' : formatRelativeOrDateAU(note.created_at)}
                        </time>
                      </div>
                      <p className="text-sm whitespace-pre-line leading-relaxed text-foreground break-words">
                        {note.body}
                      </p>
                    </div>
                    {isOwn && !isOptimistic(note) && (
                      <button
                        type="button"
                        onClick={() => setPendingDelete(note)}
                        disabled={deleteNote.isPending}
                        aria-label="Delete this note"
                        className="h-12 w-12 -mr-2 -mt-2 flex items-center justify-center rounded-md text-muted-foreground hover:bg-slate-100 hover:text-destructive transition-colors flex-shrink-0 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </div>
      </CardContent>

      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this note?</AlertDialogTitle>
            <AlertDialogDescription>
              It will be removed from the feed for everyone. The activity log entry is kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-12">Keep it</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="h-12 bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

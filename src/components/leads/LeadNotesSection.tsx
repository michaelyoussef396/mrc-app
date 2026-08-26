// Internal notes feed for a lead — text, @mentions and file attachments.
// Both roles read and write; author-only soft delete. Backed by
// src/lib/api/leadNotes.ts and src/lib/api/leadNoteAttachments.ts.
// NEVER customer-visible. Sits beside the frozen legacy "Internal Notes" card
// in LeadDetail; the two are separate surfaces.

import { useCallback, useId, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AtSign, Download, Loader2, MessageSquare, Paperclip, RefreshCw, Send, Trash2, X } from 'lucide-react';
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
  addLeadNoteMentions,
  createLeadNote,
  listLeadNotes,
  listStaffForMentions,
  parseMentions,
  segmentNoteBody,
  softDeleteLeadNote,
  LEAD_NOTE_MAX_LENGTH,
  type LeadNote,
  type MentionCandidate,
} from '@/lib/api/leadNotes';
import {
  ALLOWED_ATTACHMENT_MIME_TYPES,
  formatFileSize,
  getAttachmentSignedUrl,
  listNoteAttachments,
  softDeleteAttachment,
  uploadNoteAttachment,
  validateAttachment,
  type LeadNoteAttachment,
} from '@/lib/api/leadNoteAttachments';
import { postLeadNoteToSlack } from '@/lib/api/leadNoteSlack';
import { formatDateTimeAU, formatRelativeOrDateAU } from '@/lib/dateUtils';

interface LeadNotesSectionProps {
  leadId: string;
  /** Customer name, for the Slack post. Required so a new mount site cannot forget it. */
  leadName: string;
}

/**
 * Staged files travel WITH the mutation rather than being read from component
 * state inside mutationFn. onMutate clears pendingFiles to reset the composer,
 * and react-query v5 hands a re-rendered mutationFn to the in-flight mutation —
 * so a closure read there sees the already-emptied array and silently uploads
 * nothing.
 */
interface AddNoteInput {
  body: string;
  files: File[];
}

/**
 * Body for a note that carries files but no typed text. Attaching a file
 * without a comment is a normal thing to want to do, but `lead_notes` enforces
 * CHECK (body ~ '\\S'), so an empty body is impossible without a migration —
 * one is generated instead. File names are not repeated here: they already
 * render as attachment rows directly beneath the body.
 */
function describeAttachments(files: File[]): string {
  return files.length === 1 ? `Attached ${files[0].name}` : `Attached ${files.length} files`;
}

const OPTIMISTIC_ID_PREFIX = 'optimistic-';
const UNKNOWN_AUTHOR = 'Unknown';
const STAFF_STALE_TIME_MS = 5 * 60_000;

function leadNotesKey(leadId: string) {
  return ['lead-notes', leadId] as const;
}

function isOptimistic(note: LeadNote) {
  return note.id.startsWith(OPTIMISTIC_ID_PREFIX);
}

/**
 * The "@…" the caret currently sits inside, if any. The query may contain
 * spaces so multi-word names stay searchable; the picker closes on its own
 * once nothing matches.
 */
function activeMentionQuery(value: string, caret: number): { query: string; start: number } | null {
  const before = value.slice(0, caret);
  const match = before.match(/(?:^|\s)@([^@\n]*)$/);
  if (!match) return null;
  return { query: match[1], start: caret - match[1].length - 1 };
}

export function LeadNotesSection({ leadId, leadName }: LeadNotesSectionProps) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState('');
  const [caret, setCaret] = useState(0);
  const [highlighted, setHighlighted] = useState(0);
  // Escape, blur and a completed selection all close the picker. Dismissal is
  // its own state rather than a caret sentinel: activeMentionQuery slices the
  // draft on caret, so an out-of-range caret corrupts the query instead of
  // closing anything.
  const [pickerDismissed, setPickerDismissed] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingDelete, setPendingDelete] = useState<LeadNote | null>(null);
  const [pendingAttachmentDelete, setPendingAttachmentDelete] = useState<LeadNoteAttachment | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const optionId = (id: string) => `${listboxId}-${id}`;

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

  // Keyed on leadId, so it runs alongside the notes query rather than
  // waterfalling behind it.
  const { data: attachmentsByNote } = useQuery({
    queryKey: ['lead-note-attachments', leadId],
    queryFn: () => listNoteAttachments(leadId),
    staleTime: 15_000,
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['mention-candidates'],
    queryFn: listStaffForMentions,
    staleTime: STAFF_STALE_TIME_MS,
  });

  // Highlighting resolves against the live staff list, not the per-note
  // lead_note_mentions rows: those exclude self-mentions by design, do not exist
  // for pre-Phase-2 notes, and come back empty on several silent-failure paths.
  // Purely presentational — it changes nothing about who is notified.
  const staffNames = useMemo(() => staff.map((candidate) => candidate.fullName), [staff]);

  const mentionState = activeMentionQuery(draft, caret);
  const matches = useMemo(() => {
    if (!mentionState) return [];
    const needle = mentionState.query.trim().toLowerCase();
    return staff
      .filter((candidate) => candidate.fullName.toLowerCase().includes(needle))
      .slice(0, 6);
  }, [mentionState, staff]);
  const isPickerOpen = mentionState !== null && matches.length > 0 && !pickerDismissed;

  const invalidateNotes = () => {
    queryClient.invalidateQueries({ queryKey });
    queryClient.invalidateQueries({ queryKey: ['lead-note-attachments', leadId] });
    queryClient.invalidateQueries({ queryKey: ['activity-timeline'] });
    queryClient.invalidateQueries({ queryKey: ['technician-alerts'] });
  };

  const syncCaret = (element: HTMLTextAreaElement) => {
    setCaret(element.selectionStart ?? 0);
    setHighlighted(0);
    // Typing or moving the caret is fresh intent — re-arm the picker.
    setPickerDismissed(false);
  };

  const insertMention = useCallback(
    (candidate: MentionCandidate) => {
      const active = activeMentionQuery(draft, caret);
      if (!active) return;

      const next = `${draft.slice(0, active.start)}@${candidate.fullName} ${draft.slice(caret)}`;
      const nextCaret = active.start + candidate.fullName.length + 2;
      setDraft(next);
      setCaret(nextCaret);
      setHighlighted(0);
      // Close after selecting: the draft now ends "@Full Name " and
      // activeMentionQuery would otherwise still match it.
      setPickerDismissed(true);

      requestAnimationFrame(() => {
        textareaRef.current?.focus();
        textareaRef.current?.setSelectionRange(nextCaret, nextCaret);
      });
    },
    [caret, draft],
  );

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!isPickerOpen) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setHighlighted((index) => Math.min(index + 1, matches.length - 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setHighlighted((index) => Math.max(index - 1, 0));
        break;
      case 'Enter':
      case 'Tab':
        event.preventDefault();
        insertMention(matches[highlighted]);
        break;
      case 'Escape':
        event.preventDefault();
        setPickerDismissed(true);
        break;
      default:
    }
  };

  const handleFilesPicked = (event: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(event.target.files ?? []);
    const accepted: File[] = [];

    for (const file of picked) {
      try {
        validateAttachment(file);
        accepted.push(file);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : `Couldn't attach ${file.name}`);
      }
    }

    if (accepted.length > 0) setPendingFiles((current) => [...current, ...accepted]);
    // Reset so picking the same file twice in a row still fires onChange.
    event.target.value = '';
  };

  const addNote = useMutation({
    mutationFn: async ({ body, files }: AddNoteInput) => {
      const note = await createLeadNote({ leadId, body, authorName });

      const mentionedIds = parseMentions(body, staff);
      const mentionedNames = staff
        .filter((candidate) => mentionedIds.includes(candidate.id))
        .map((candidate) => candidate.fullName);

      // A note is saved the moment createLeadNote returns. Everything after it
      // is best-effort enrichment: each failure is surfaced on its own rather
      // than discarding a note the user already wrote.
      if (mentionedIds.length > 0) {
        try {
          await addLeadNoteMentions(note.id, mentionedIds);
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Note saved, but the mentions failed');
        }
      }

      const attachedNames: string[] = [];
      for (const file of files) {
        try {
          await uploadNoteAttachment({ noteId: note.id, leadId, file });
          attachedNames.push(file.name);
        } catch (error) {
          toast.error(error instanceof Error ? error.message : `Couldn't attach ${file.name}`);
        }
      }

      // Every note posts to Slack, plain or mentioned. It sits outside every
      // guard above so neither a failed mention RPC nor a failed upload can skip
      // it, and last so it names only the files that actually landed. Slack
      // deliberately carries the body; the in-app notification does NOT, because
      // that would cross the lead's own RLS boundary.
      await postLeadNoteToSlack({
        leadId,
        leadName,
        authorName,
        body,
        mentionedNames,
        attachmentNames: attachedNames,
      });

      return note;
    },
    onMutate: async ({ body, files }: AddNoteInput) => {
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
      setPendingFiles([]);
      return { previous, body, files };
    },
    onError: (error, _input, context) => {
      if (context) {
        queryClient.setQueryData(queryKey, context.previous);
        setDraft(context.body);
        setPendingFiles(context.files);
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

  const deleteAttachment = useMutation({
    mutationFn: (attachmentId: string) => softDeleteAttachment(attachmentId),
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Could not remove attachment — please try again');
    },
    onSettled: invalidateNotes,
  });

  const handleOpenAttachment = async (attachment: LeadNoteAttachment) => {
    // Opened synchronously, while the tap is still the active user gesture:
    // iOS Safari blocks window.open once an await has ended that window, which
    // made the button look dead on exactly the phones the techs use. `noopener`
    // is omitted deliberately — it makes window.open return null, and we need
    // the handle to navigate; opener is severed manually instead.
    const tab = window.open('', '_blank');
    if (tab) tab.opener = null;

    try {
      const url = await getAttachmentSignedUrl(attachment.storage_path);
      // No `download` option on the signed URL, so images and PDFs render
      // inline with their stored content-type instead of forcing a save.
      if (tab) tab.location.replace(url);
      else window.location.href = url;
    } catch (error) {
      tab?.close();
      toast.error(error instanceof Error ? error.message : 'Could not open that file');
    }
  };

  const canSubmit = (draft.trim().length > 0 || pendingFiles.length > 0) && !addNote.isPending;

  const handleSubmit = () => {
    if (!canSubmit) return;
    const typed = draft.trim();
    addNote.mutate({ body: typed || describeAttachments(pendingFiles), files: pendingFiles });
  };

  const handleConfirmDelete = () => {
    if (!pendingDelete) return;
    deleteNote.mutate(pendingDelete.id);
    setPendingDelete(null);
  };

  const handleConfirmAttachmentDelete = () => {
    if (!pendingAttachmentDelete) return;
    deleteAttachment.mutate(pendingAttachmentDelete.id);
    setPendingAttachmentDelete(null);
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
          <div className="relative">
            <Textarea
              id="lead-note-draft"
              ref={textareaRef}
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
                syncCaret(event.target);
              }}
              onClick={(event) => syncCaret(event.currentTarget)}
              onKeyUp={(event) => {
                if (!['ArrowDown', 'ArrowUp', 'Enter', 'Escape', 'Tab'].includes(event.key)) {
                  syncCaret(event.currentTarget);
                }
              }}
              onKeyDown={handleKeyDown}
              onBlur={() => setPickerDismissed(true)}
              rows={3}
              maxLength={LEAD_NOTE_MAX_LENGTH}
              placeholder="What happened, what's next… type @ to mention someone, or just attach a file"
              disabled={addNote.isPending}
              role="combobox"
              aria-expanded={isPickerOpen}
              aria-controls={isPickerOpen ? listboxId : undefined}
              aria-activedescendant={
                isPickerOpen && matches[highlighted] ? optionId(matches[highlighted].id) : undefined
              }
              aria-autocomplete="list"
            />
            {isPickerOpen && (
              <ul
                id={listboxId}
                role="listbox"
                aria-label="Mention a team member"
                className="mt-1 w-full max-h-48 overflow-y-auto rounded-md border bg-popover shadow-md"
              >
                {matches.map((candidate, index) => (
                  <li
                    key={candidate.id}
                    id={optionId(candidate.id)}
                    role="option"
                    aria-selected={index === highlighted}
                    onMouseDown={(event) => {
                      // mousedown, not click — the textarea must not blur first.
                      event.preventDefault();
                      insertMention(candidate);
                    }}
                    onMouseEnter={() => setHighlighted(index)}
                    className={`flex h-12 cursor-pointer items-center gap-2 px-3 text-sm ${
                      index === highlighted ? 'bg-accent text-accent-foreground' : ''
                    }`}
                  >
                    <AtSign className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <span className="truncate">{candidate.fullName}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {pendingFiles.length > 0 && (
            <ul className="space-y-1" aria-label="Files to attach">
              {pendingFiles.map((file, index) => (
                <li
                  key={`${file.name}-${index}`}
                  className="flex items-center gap-2 rounded-md border bg-slate-50 px-2 py-1"
                >
                  <Paperclip className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate text-xs">{file.name}</span>
                  <span className="flex-shrink-0 text-[11px] text-muted-foreground">
                    {formatFileSize(file.size)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPendingFiles((current) => current.filter((_, i) => i !== index))}
                    aria-label={`Remove ${file.name}`}
                    className="h-12 w-12 -mr-2 flex flex-shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-slate-100 hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            accept={ALLOWED_ATTACHMENT_MIME_TYPES.join(',')}
            onChange={handleFilesPicked}
          />

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="h-12 w-full sm:w-auto"
            >
              {addNote.isPending ? <Loader2 className="animate-spin" /> : <Send />}
              {addNote.isPending ? 'Saving…' : 'Add Note'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={addNote.isPending}
              className="h-12 w-full sm:w-auto"
            >
              <Paperclip />
              Attach file
            </Button>
          </div>
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
              const segments = segmentNoteBody(note.body, staffNames);
              const hasMention = segments.some((segment) => segment.isMention);
              const attachments = attachmentsByNote?.get(note.id) ?? [];

              return (
                <article
                  key={note.id}
                  className={`rounded-md border bg-slate-50 p-3 ${
                    hasMention ? 'border-l-2 border-l-violet-400' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                        <span className="font-medium truncate">{note.authorName ?? UNKNOWN_AUTHOR}</span>
                        <time dateTime={note.created_at} title={formatDateTimeAU(note.created_at)}>
                          {isOptimistic(note) ? 'Saving…' : formatRelativeOrDateAU(note.created_at)}
                        </time>
                      </div>
                      <p className="text-sm whitespace-pre-line leading-relaxed text-foreground break-words">
                        {segments.map((segment, index) =>
                          segment.isMention ? (
                            <span
                              key={index}
                              className="rounded bg-violet-100 px-1 font-medium text-violet-600"
                            >
                              {segment.text}
                            </span>
                          ) : (
                            <span key={index}>{segment.text}</span>
                          ),
                        )}
                      </p>

                      {attachments.length > 0 && (
                        <ul className="space-y-1 pt-1" aria-label="Attachments">
                          {attachments.map((attachment) => (
                            <li
                              key={attachment.id}
                              className="flex items-center gap-2 rounded-md border bg-white px-2 py-1"
                            >
                              <Paperclip className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                              <span className="min-w-0 flex-1 truncate text-xs" title={attachment.file_name}>
                                {attachment.file_name}
                              </span>
                              <span className="flex-shrink-0 text-[11px] text-muted-foreground">
                                {formatFileSize(attachment.file_size)}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleOpenAttachment(attachment)}
                                aria-label={`Open ${attachment.file_name}`}
                                className="h-12 w-12 flex flex-shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-slate-100 hover:text-foreground"
                              >
                                <Download className="h-4 w-4" />
                              </button>
                              {attachment.uploaded_by === user?.id && (
                                <button
                                  type="button"
                                  onClick={() => setPendingAttachmentDelete(attachment)}
                                  disabled={deleteAttachment.isPending}
                                  aria-label={`Remove ${attachment.file_name}`}
                                  className="h-12 w-12 -mr-2 flex flex-shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-slate-100 hover:text-destructive disabled:opacity-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
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
              It will be removed from the feed for everyone, along with its attachments. The activity log
              entry is kept.
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

      <AlertDialog
        open={pendingAttachmentDelete !== null}
        onOpenChange={(open) => !open && setPendingAttachmentDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this attachment?</AlertDialogTitle>
            <AlertDialogDescription>
              It will disappear from the note for everyone. Only you can remove a file you uploaded.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-12">Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAttachmentDelete}
              className="h-12 bg-red-600 hover:bg-red-700"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

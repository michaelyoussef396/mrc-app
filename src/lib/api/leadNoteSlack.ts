// The one place a lead note becomes a Slack post. Every authored-note surface
// routes through here so the channel reads the same either way:
//   - src/components/leads/LeadNotesSection.tsx      (lead_notes feed)
//   - src/pages/LeadDetail.tsx handleSaveNote        (admin Internal Notes card)
//   - src/pages/TechnicianJobDetail.tsx handleSaveNotes (tech Internal Notes card)
//
// DELIBERATELY NOT reachable from the two booking auto-appends
// (BookJobSheet.tsx, bookingService.ts). Those are side effects of a booking,
// not authored notes, and booking already fires its own inspection_booked post.
// `grep -rln "postLeadNoteToSlack" src` must list only this module, those
// three call sites, and this module's test.
//
// Slack deliberately carries the note body; the in-app notification does NOT.
// See supabase/migrations/20260826120002_lead_note_notification_rpcs.sql — a
// notification row is gated only by its own user_id, so putting lead content
// there would hand it past the lead's own RLS. The Slack channel is a separate,
// accepted trust boundary. Preserve that asymmetry.

import { sendSlackNotification } from '@/lib/api/notifications';

/** send-slack-notification caps `message` at 1000 characters (zod schema). */
const SLACK_MESSAGE_MAX = 1000;
/** At most this many file names before the list collapses to "+N more". */
const ATTACHMENT_NAMES_SHOWN = 3;
/** Per-name cap so one pathological filename cannot swallow the body. */
const ATTACHMENT_NAME_MAX = 60;

export interface LeadNoteSlackPost {
  leadId: string;
  leadName: string;
  authorName: string;
  body: string;
  /** Full names of everyone tagged. Empty or absent means this is a plain note. */
  mentionedNames?: string[];
  /** File NAMES only — never contents, never signed URLs. */
  attachmentNames?: string[];
}

/**
 * Slack's `text` field interprets &, < and >, so an unescaped note body could
 * inject a fake link into the team channel. Applied before length accounting so
 * the 1000-character cap is measured on the wire form.
 */
function escapeSlackText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Australian style: "A", "A and B", "A, B and C" — no Oxford comma. */
function formatNameListAU(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

function cleanNames(names: string[] | undefined): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const name of names ?? []) {
    const trimmed = name?.trim();
    if (!trimmed || seen.has(trimmed.toLowerCase())) continue;
    seen.add(trimmed.toLowerCase());
    out.push(trimmed);
  }
  return out;
}

/**
 * Build the mrkdwn string for one note.
 *
 * A mention post is deliberately distinct from a plain post: different leading
 * emoji, different heading, and it names who was tagged, so someone scanning the
 * channel sees instantly that a mention needs their attention.
 *
 * TRUNCATION RULE: the heading and the file list are fixed cost and are never
 * trimmed — only the body gives way. A 10,000-character note therefore still
 * tells the channel which lead it is, who wrote it and what came attached.
 */
export function formatLeadNoteSlackMessage(post: LeadNoteSlackPost): string {
  const leadName = escapeSlackText(post.leadName?.trim() || 'this lead');
  const authorName = escapeSlackText(post.authorName?.trim() || 'Someone');
  const mentioned = cleanNames(post.mentionedNames).map(escapeSlackText);
  const files = cleanNames(post.attachmentNames).map((name) =>
    escapeSlackText(
      name.length > ATTACHMENT_NAME_MAX ? `${name.slice(0, ATTACHMENT_NAME_MAX - 1)}…` : name,
    ),
  );

  const heading =
    mentioned.length > 0
      ? `🔔 *${authorName} mentioned ${formatNameListAU(mentioned)} on ${leadName}*`
      : `📝 *New note on ${leadName}* — ${authorName}`;

  const shown = files.slice(0, ATTACHMENT_NAMES_SHOWN);
  const extra = files.length - shown.length;
  const footer =
    files.length > 0 ? `\n📎 ${shown.join(', ')}${extra > 0 ? ` +${extra} more` : ''}` : '';

  const body = escapeSlackText(post.body?.trim() ?? '');
  const room = SLACK_MESSAGE_MAX - heading.length - 1 - footer.length;
  const shownBody =
    room <= 0 ? '' : body.length <= room ? body : `${body.slice(0, room - 1).trimEnd()}…`;

  // Belt and braces: a pathological heading alone can never push the payload
  // past the cap and have the Edge Function reject the whole post.
  return `${heading}\n${shownBody}${footer}`.slice(0, SLACK_MESSAGE_MAX);
}

/**
 * Post one note to Slack. Never throws and never rejects: Slack is the least
 * important thing that happens when someone writes a note, and a note that is
 * already saved must never be reported as failed because the channel was down.
 */
export async function postLeadNoteToSlack(post: LeadNoteSlackPost): Promise<void> {
  try {
    await sendSlackNotification({
      event: 'custom',
      leadId: post.leadId,
      leadName: post.leadName,
      message: formatLeadNoteSlackMessage(post),
    });
  } catch (error) {
    console.error('[LeadNotes] Slack post failed:', error);
  }
}

# PR — Batch A: email templates and copy

- **Head:** `batch-a-templates-copy` → **Base:** `main`
- **Stacked PR 1 of 3.** Create and merge this one first; create the batch B PR only after
  this has merged (otherwise the later PR displays these commits too).
- Merge with **"Create a merge commit"** — never squash, never rebase (repo rule).

Everything below the line is the PR body, ready to paste.

---

Customer-facing email copy unified and corrected across every template and sending
surface: canonical business name ("Mould & Restoration Co."), the 1800 business line in
place of a personal mobile, Google review links removed from transactional email, a
one-sentence confidentiality disclaimer, uppercase AM/PM timestamps everywhere, and
display-only title-casing for customer names and addresses. Plus missing Radix
dialog/sheet titles for accessibility, and the email preview scripts brought back in sync.

## Commits (12, oldest first)

| Commit | Change |
|---|---|
| `e7bb77f` | fix(email): replace personal mobile with 1800 business line in email prefills |
| `cf86cd4` | fix(email): remove Google review link from transactional templates |
| `5bb20c4` | fix(email): canonical business name across all templates and sender identity |
| `47919d1` | fix(email): shorten confidentiality disclaimer to one sentence |
| `14c6b06` | feat(email): display-only title-casing for customer names and addresses |
| `1f9de5e` | fix(email): enquiry confirmation — AM/PM time, postcode row, issue description |
| `44669db` | fix(ui): standardise timestamps on uppercase AM/PM |
| `a87546d` | fix(email): remove duplicated questions sentence from report email |
| `6ff42df` | fix(a11y): add missing titles and descriptions to Radix dialogs and sheets |
| `666ef3a` | chore(scripts): sync preview-email replicas with the new shared-shell copy |
| `ef8916d` | fix(email): title-case state allowlist and curly-apostrophe handling |
| `a58f5d9` | fix(email): canonical name in preview-script constants; drop job-prefill duplicate |

## Surfaces touched

- **Edge Functions (3):** `receive-framer-lead`, `send-email`, `send-inspection-reminder`
  — email body copy only, no contract changes. Need a PROD deploy after merge; safe to
  deploy independent of the frontend bundle.
- **Supabase Auth templates (6):** `supabase/templates/*.html` (confirmation, recovery,
  invite, magic_link, email_change, reauthentication). **These do NOT ship with EF
  deploys** — they require a separate `deploy-templates.sh` run against the target ref
  (see `docs/PRODUCTION_MERGE_RUNBOOK.md`, Stage 2.2).
- **Frontend:** display formatting (`displayFormat.ts` + tests, `dateUtils.ts`,
  `notifications.ts`), booking/schedule/lead components, `TechnicianInspectionForm.tsx`,
  `ViewReportPDF.tsx`, and the two email preview scripts.
- **No sacred surfaces** (`/src/auth/**`, `pricing.ts`, `penaltyLadder.ts`,
  `statusFlow.ts`, `supabase/migrations/**` all untouched). No migrations.

## Verification

- Part of the 4 Aug 8-point DEV verification pass on `45c0a71` + DEV EF stack (all 8
  passed). The three email EFs run on DEV (`ctppzqnysmzynkxjlzta`) as v6/v6/v6, deployed
  3 Aug (session-attested; re-check with
  `npx supabase functions list --project-ref ctppzqnysmzynkxjlzta`).
- On the full stack (`4b06aa1`): `npm run typecheck` clean, `npm run build` clean, Vitest
  **496/496** (33 files).
- Auth templates deployed to DEV via `deploy-templates.sh ctppzqnysmzynkxjlzta` and
  verified by triggered auth emails.

## Deploy notes

Post-merge PROD work is sequenced in `docs/PRODUCTION_MERGE_RUNBOOK.md` (the runbook
lands with batch C; until then it lives in the local working tree): the three email EFs
deploy in Stage 2.1, the six auth templates in Stage 2.2 (explicit ref + typed PROD
confirmation). `check-overdue-invoices` is untouched by this branch.

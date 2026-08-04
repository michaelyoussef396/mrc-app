# Production Merge Runbook — Batches A/B/C (written 4 Aug 2026)

Run by Michael, top to bottom. Claude Code does not execute any step in this file.
Written to be run cold, days later, with no memory of the sessions that produced it.

**The repo is linked to PROD.** Every Supabase command below carries an explicit
`--project-ref`. If you ever type one without it, it targets production — stop and retype.

| env | ref | role |
|---|---|---|
| **PROD** | `ecyivrxjpsmjmexqatym` | LIVE — mrcsystem.com, real customers |
| **DEV** | `ctppzqnysmzynkxjlzta` | sandbox clone |

Vercel project is **`mrc-system`** — the repo's `.vercel` link is stale (`mrc-app-1`
was deleted), so every Vercel command carries `--project mrc-system` and dashboard checks
select that project explicitly.

## What ships

Three stacked branches, verified by the 4 Aug 8-point DEV pass on `45c0a71` + DEV EF v10,
plus two follow-up commits (`9d1c723`, `4b06aa1`):

| Branch | Commits | Payload |
|---|---|---|
| `batch-a-templates-copy` | 12 | Email templates and copy (3 EFs, 6 auth templates) |
| `batch-b-ai-prompt` | 9 | AI summary prompt + generation hardening (4 EFs, deploy script) |
| `batch-c-forms-ui` | 11 | Forms, PDF, UI (2 EFs — generate-inspection-pdf, plus the `9d1c723` truncation-guard follow-up to generate-inspection-summary) + session docs |

- **Five Edge Functions** to deploy to PROD: `send-email`, `send-inspection-reminder`,
  `receive-framer-lead`, `generate-inspection-pdf` (Stage 2), and
  `generate-inspection-summary` (Stage 4 — deliberately last, see below).
- **Six auth email templates** via `supabase/templates/deploy-templates.sh` (Stage 2) —
  these do NOT move with EF deploys; the script PATCHes Supabase Auth config directly.

## What does NOT ship

- ⛔ **`check-overdue-invoices` is not deployed and not touched.** The 29 Jul silent-revert
  fear is resolved with evidence: PROD runs platform VERSION 11 (deployed 2026-07-29, the
  `0a2fbac` rewrite; no deploy since), `0a2fbac` is an ancestor of both `main` and
  `production`, and `git diff production batch-c-forms-ui -- supabase/functions/check-overdue-invoices/`
  is **empty** — every branch carries byte-identical source, so no merge order can revert
  it. Byte-proof (4 Aug): the deployed PROD source was downloaded via
  `supabase functions download` and diffed against `main` — **identical**. PR #72 merged
  into main 2026-07-30 (`8fe47e9`); TODO.md's "PR #72 stays OPEN" section is stale. The
  standing rule holds anyway: never deploy this EF as part of any batch work.
- **No Storage PDF template uploads.** `src/templates/*.html` is untouched by all three
  batches. For future waves the rule stands: **deploy the EF FIRST, upload the Storage
  template SECOND** — the live inspection EF strips unknown `{{placeholders}}` (blank
  fields) and the job EF prints them literally on customer PDFs if the template lands
  first. This wave: nothing to upload.
- **No migrations.** No `supabase/migrations/**` changes in any batch. No sacred surface
  (`/src/auth/**`, `pricing.ts`, `penaltyLadder.ts`, `statusFlow.ts`) is touched.

## The ordering principle

`generate-inspection-summary`'s new prompt consumes **TOTAL PROJECT WORK DAYS**
(`totalWorkDays`), which only the new frontend bundle sends (`7ccfa38`). The other four
EFs have no frontend coupling. Therefore:

1. Four frontend-safe EFs + auth templates → **before** the production merge (Stage 2).
2. Production merge → Vercel deploys the new bundle (Stage 3).
3. `generate-inspection-summary` → **immediately after** Stage 3 is verified (Stage 4).

The transitional windows are benign in one direction only: old EF + new frontend is fine
(the EF's zod schema ignores the extra field); new EF + old frontend degrades (the model
re-derives work days — the exact bug `7ccfa38` fixed). That asymmetry is why the summary
EF goes last, in the same sitting as the merge.

---

## Stage 0 — Pre-flight

**0.1** Working tree must be committable-clean. From `~/mrc-app-1` on `batch-c-forms-ui`:

```bash
git status --porcelain
```

The session docs (this runbook, the three `pr-batch-*.md` descriptions, the 4 Aug
findings append) were committed onto `batch-c-forms-ui` on 4 Aug — the branch carries 11
commits. The only expected leftovers are regenerable GitNexus noise (`.claude/**`,
`CLAUDE.md`, `AGENTS.md`, `supabase/.temp/*`):

```bash
# discard the GitNexus churn so branch switching is not blocked
git checkout -- CLAUDE.md AGENTS.md .claude supabase/.temp
```

**Good looks like:** `git status --porcelain` empty except untracked
`.claude/skills/generated/*` dirs. Anything else dirty → stop and identify it before
merging.

**0.2** Verify the Vercel **Production** env scope (guards a repeat of the 23 Jul
blank-page outage — the marketplace integration that caused it was removed 2 Aug, the
check stays as habit):

```bash
npx vercel env ls production --project mrc-system
```

**Good looks like:** `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` present in the
Production scope (values must be the PROD project — URL contains `ecyivrxjpsmjmexqatym`).
Also confirm `VITE_GOOGLE_MAPS_API_KEY` exists in Production and is the **post-rotation**
browser key — the Preview-scope copy is known-stale after the 4 Aug server-key rotation,
and address autocomplete throws "API key expired" wherever the stale key serves.

**0.3** Verification gates recorded 4 Aug on `batch-c-forms-ui` (`4b06aa1`):
`npm run typecheck` clean, `npm run build` clean, full Vitest suite green. If you are
running this runbook against different commits, re-run all three before proceeding.

**Rollback:** nothing has changed yet — abort freely.

---

## Stage 1 — Merge the stack into main

Stacked branches merge **sequentially**: A, then B, then C. Merge conflicts against main
are impossible by construction (batch-a forks from main's tip `74e29d2`) — if git reports
a conflict anyway, the remote moved: STOP, `git merge --abort`, investigate before
resolving anything by hand.

**1.1** Sync main. As of 4 Aug, **local main is one unpushed docs commit ahead of
origin** — local `74e29d2` ("docs: close issue 32") vs `origin/main` at `5b9b945`.
Push it first, or the batch A PR will display 13 commits instead of 12:

```bash
git rev-parse main          # must print 74e29d28c993521d56b869368d68f8c75655d792
git fetch origin
git rev-parse origin/main   # expected: 5b9b945… (one behind), or 74e29d2… if already pushed
git checkout main
git push origin main        # brings origin/main to 74e29d2
```

If `origin/main` prints anything OTHER than those two SHAs, main moved remotely since
this runbook was written — stop and re-run the conflict prediction
(`git merge-tree --write-tree origin/main batch-c-forms-ui`) before continuing.

**1.2 — PR path (preferred; descriptions are in `docs/pr-batch-*.md`):**

```bash
git push -u origin batch-a-templates-copy batch-b-ai-prompt batch-c-forms-ui
```

Then on GitHub, strictly one at a time — **create each PR only after the previous one has
merged**, or the later PR will display the earlier batches' commits too:

1. PR `batch-a-templates-copy` → `main`, paste `docs/pr-batch-a-templates-copy.md`,
   merge with **"Create a merge commit"** (never squash, never rebase — repo rule).
2. PR `batch-b-ai-prompt` → `main`, paste its description, merge the same way.
3. PR `batch-c-forms-ui` → `main`, paste its description, merge the same way.

**1.2-alt — local path (equivalent):**

```bash
git checkout main && git pull origin main
git merge --no-ff batch-a-templates-copy -m "merge: batch A — email templates and copy"
git merge --no-ff batch-b-ai-prompt    -m "merge: batch B — AI summary prompt and generation"
git merge --no-ff batch-c-forms-ui     -m "merge: batch C — forms, PDF and UI"
git push origin main
```

**Good looks like:** `git log --oneline origin/main -4` shows three merge commits on top
of `74e29d2`; the Vercel deployment for `main` (project `mrc-system`, a preview deploy)
goes green.

**Rollback:** before pushing — `git reset --hard 74e29d2`. After pushing — never force-push;
revert the merges in reverse order:
`git revert -m 1 <merge-C> <merge-B> <merge-A> && git push origin main`.

---

## Stage 2 — PROD Edge Functions (4 of 5) + auth templates

Run from `~/mrc-app-1` **on the merged main** (`git checkout main && git pull`).

**2.1** Deploy the four frontend-safe EFs (order among these four does not matter; all are
proven decoupled from the bundle — the email EFs are copy-only, `receive-framer-lead` is
the external webhook, and `generate-inspection-pdf`'s change reads attribution from the
caller's JWT and degrades to NULL without one):

```bash
npx supabase functions deploy send-email                --project-ref ecyivrxjpsmjmexqatym
npx supabase functions deploy send-inspection-reminder  --project-ref ecyivrxjpsmjmexqatym
npx supabase functions deploy receive-framer-lead       --project-ref ecyivrxjpsmjmexqatym
npx supabase functions deploy generate-inspection-pdf   --project-ref ecyivrxjpsmjmexqatym
```

⛔ **Do NOT deploy `check-overdue-invoices`.** It is not in this list on purpose — see
"What does NOT ship". PROD v11 is current and correct.

**Good looks like** (versions as of 4 Aug — each deployed one bumps by exactly 1 with a
fresh UPDATED_AT; `check-overdue-invoices` stays at 11 / 2026-07-29):

```bash
npx supabase functions list --project-ref ecyivrxjpsmjmexqatym
```

| EF | before | after |
|---|---|---|
| send-email | 27 | 28 |
| send-inspection-reminder | 18 | 19 |
| receive-framer-lead | 40 | 41 |
| generate-inspection-pdf | 104 | 105 |
| check-overdue-invoices | 11 | **11 — unchanged** |

**Rollback (any single EF):** redeploy the pre-merge source from a temp worktree — never
edit the working tree for this:

```bash
git worktree add /tmp/mrc-rollback-74e29d2 74e29d2
cd /tmp/mrc-rollback-74e29d2
npx supabase functions deploy <name> --project-ref ecyivrxjpsmjmexqatym
cd ~/mrc-app-1 && git worktree remove /tmp/mrc-rollback-74e29d2
```

**2.2** Deploy the six auth email templates (Batch A). These are Supabase **Auth config**,
not Edge Functions — EF deploys never move them. The script requires the ref as an
argument and, for PROD, an interactive typed confirmation; it fails closed when
non-interactive. Token comes from https://supabase.com/dashboard/account/tokens — export
it in your shell, never paste it into a Claude Code chat.

```bash
cd ~/mrc-app-1/supabase/templates
SUPABASE_ACCESS_TOKEN=<your-token> ./deploy-templates.sh ecyivrxjpsmjmexqatym
# prompt: This is the LIVE project. Type 'yes' to continue:  → type: yes
```

**Good looks like:** the script prints the PATCHed auth config as JSON with no error;
then trigger a password reset from the mrcsystem.com login page and check the email:
canonical business name ("Mould & Restoration Co."), no Google review link, one-sentence
confidentiality disclaimer. (The sender stays `noreply@mrcsystem.com` — the envelope
cutover is L5, separate work, unaffected by this runbook.)

**Rollback:** re-run the script against the pre-batch template copies:

```bash
mkdir -p /tmp/templates-rollback && cd /tmp/templates-rollback
for f in confirmation recovery invite magic_link email_change reauthentication; do
  git -C ~/mrc-app-1 show 3d1d1e5:supabase/templates/$f.html > $f.html
done
cp ~/mrc-app-1/supabase/templates/deploy-templates.sh .
chmod +x deploy-templates.sh
SUPABASE_ACCESS_TOKEN=<your-token> ./deploy-templates.sh ecyivrxjpsmjmexqatym
# prompt: Type 'yes' to continue  → yes
```

Deliberately the CURRENT script with the OLD template copies: the `3d1d1e5` version of
the script hardcodes PROD, ignores the ref argument and has no typed confirmation — do
not extract or run that one.

---

## Stage 3 — Merge main → production

```bash
git checkout production && git pull origin production
git merge --no-ff main -m "merge: batches A-C — email templates/copy, AI prompt hardening, forms/PDF/UI"
git push origin production
git checkout main
```

Never commit directly to `production`; the merge commit is the only thing that lands
there. Conflict prediction on 4 Aug was clean (`git merge-tree --write-tree production
batch-c-forms-ui` → no conflict entries); a conflict here again means the remote moved —
abort and investigate.

**Good looks like:**
1. Vercel dashboard → project **mrc-system** → the production deployment for this push is
   green and serving.
2. The served bundle points at PROD Supabase (the 23 Jul outage check):

```bash
BUNDLE=$(curl -s https://mrcsystem.com | grep -o '/assets/index-[^"]*\.js' | head -1)
curl -s "https://mrcsystem.com$BUNDLE" | grep -c ecyivrxjpsmjmexqatym   # must be ≥ 1
curl -s "https://mrcsystem.com$BUNDLE" | grep -c ctppzqnysmzynkxjlzta   # must be 0
```

3. Log in at mrcsystem.com — dashboard renders, no console errors.

**Rollback:** Vercel dashboard → mrc-system → Deployments → select the previous production
deployment → **Promote to Production** (instant, no git needed). Then make git agree:
`git checkout production && git revert -m 1 <merge-sha> && git push origin production`.

---

## Stage 4 — Deploy generate-inspection-summary to PROD

**Only after every Stage 3 check is green.** This EF is last because its prompt consumes
`totalWorkDays`, which only the new bundle sends.

```bash
git checkout main
npx supabase functions deploy generate-inspection-summary --project-ref ecyivrxjpsmjmexqatym
```

**Good looks like:** `npx supabase functions list --project-ref ecyivrxjpsmjmexqatym`
shows generate-inspection-summary **69 → 70** with a fresh UPDATED_AT. Optional live
check: generate an AI summary on a staged/test inspection as admin; the EF logs
(Dashboard → Edge Functions → generate-inspection-summary → Logs) should show
`Trying model: google/gemini-2.5-flash` → `finish_reason=stop` → `Success` with no
"trying next" line.

**Rollback:** worktree recipe from Stage 2.1 with `<name>` = `generate-inspection-summary`.
Trade-off to know before rolling back: the `74e29d2` version restores the OLD behaviour —
no truncation guard, no parse-failure fallback — so a flash-lite bad body would again kill
the request instead of falling through.

---

## Stage 5 — Post-merge verification

1. **Env vars intact:** `npx vercel env ls production --project mrc-system` → the four
   `VITE_*` vars still present in Production scope.
2. **Live smoke at 375px** (phone or devtools): log in → open a lead → inspection form
   opens → Section 9 cost summary shows the waste-disposal line on a waste-bearing record
   (batch C) → lead page cost estimate includes waste.
3. **Smoke lead** (23 Jul pattern): create a test lead → confirm it appears on the
   dashboard and in Slack → customer confirmation email shows the 1800 number, canonical
   business name, AM/PM times (batch A) → delete the lead.
4. **AI summary** (batch B, after Stage 4): regenerate on a test inspection → narrative
   sticks to selected services, timeline uses the supplied work-days figure, amber panel
   behaves.
5. Anything off → the relevant stage's rollback, then diagnose from the EF logs /
   Vercel logs before retrying.

---

*Evidence base: 4 Aug plan-mode research (git forensics + `supabase functions list` on
both refs) recorded in `docs/pr-batch-*.md` and the session log. Versions cited are as of
4 Aug 2026; re-check `functions list` if run later.*

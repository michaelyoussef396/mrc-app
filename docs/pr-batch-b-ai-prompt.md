# PR — Batch B: AI summary prompt and generation

- **Head:** `batch-b-ai-prompt` → **Base:** `main`
- **Stacked PR 2 of 3.** Create only after the batch A PR has merged; merge before
  creating the batch C PR.
- Merge with **"Create a merge commit"** — never squash, never rebase (repo rule).

Everything below the line is the PR body, ready to paste.

---

Hardens AI summary generation against inventing scope: the structured prompt is
constrained to the services actually selected on the inspection, contradictory inputs
surface as visible `[DATA CONFLICT: …]` markers instead of being silently smoothed over,
and the job's work-days figure is supplied to the model rather than derived by it. The
same scope and duration rules now ride on every per-section regeneration path, closing the
fresh-generation branch that previously dropped them. On the form side, implausible
temperature/humidity/moisture entries warn as they're typed (without flashing on the first
digit). Infrastructure: `@supabase/functions-js` pinned so the deployed functions bundle,
and the auth-template deploy script now requires an explicit project ref instead of
defaulting to PROD.

## Commits (9, oldest first)

Note: an earlier session brief counted 10 commits on this branch; the actual count is 9
(`git rev-list --count batch-a-templates-copy..batch-b-ai-prompt`).

| Commit | Change |
|---|---|
| `dd062f5` | fix(ai): literal emoji in the structured prompt headings |
| `7ccfa38` | fix(ai): supply the work-days figure instead of letting the model derive it |
| `d112441` | fix(ai): constrain the narrative to selected services; surface data conflicts |
| `91f1633` | feat(inspection): warn on implausible temperature, humidity and moisture entries |
| `8441cff` | fix(ai): carry the scope rules into every fresh-generation section prompt |
| `b43970b` | fix(inspection): stop the range warning flashing on the first digit typed |
| `f28f66e` | fix(ai): duration rule on every prompt path; legacy stain-removing toggle |
| `8c574f6` | fix(scripts): require an explicit project ref for auth-template deploys |
| `e5f3407` | fix(ef): pin functions-js so the four deployed functions can bundle |

## Surfaces touched

- **Edge Functions:** `generate-inspection-summary` (prompt + generation, 6 commits);
  `e5f3407` additionally pins the import on `receive-framer-lead`, `send-email`,
  `send-inspection-reminder` (no behaviour change).
- **Frontend:** `InspectionAIReview.tsx`, `TechnicianInspectionForm.tsx`,
  `inspectionUtils.ts` + tests, `summaryChecks.ts` + tests (the render-time amber-panel
  guard that flags services the narrative claims but the inspection never selected).
- **Scripts:** `supabase/templates/deploy-templates.sh` — ref is now a required argument;
  PROD requires a typed confirmation and fails closed non-interactively.
- **No sacred surfaces, no migrations.**

## Verification

- 4 Aug 8-point DEV verification pass: all 8 passed, including scope-discipline checks on
  regenerated summaries (narrative stays inside selected services; timeline matches the
  supplied work-days figure) and the amber-panel guard behaving as designed.
- `generate-inspection-summary` runs on DEV (`ctppzqnysmzynkxjlzta`) as v10, deployed
  3 Aug, exercised against inspection INS-2026-0001 (session-attested; re-check with
  `npx supabase functions list --project-ref ctppzqnysmzynkxjlzta`).
- On the full stack (`4b06aa1`): typecheck clean, build clean, Vitest **496/496**
  (includes `summaryChecks.test.ts` 19 and `inspectionUtils.test.ts` 41).

## Deploy notes — read before deploying this EF to PROD

`generate-inspection-summary` must **not** go live meaningfully ahead of the frontend:
its prompt consumes TOTAL PROJECT WORK DAYS (`totalWorkDays`), which only the new bundle
sends (`7ccfa38`). Old EF + new frontend is benign (zod ignores the extra field); new EF +
old frontend re-derives days — the exact defect `7ccfa38` fixes. The runbook therefore
deploys this EF **last**, immediately after the production merge is verified
(`docs/PRODUCTION_MERGE_RUNBOOK.md`, Stage 4 — the runbook lands with batch C; until
then it lives in the local working tree).

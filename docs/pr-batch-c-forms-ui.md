# PR — Batch C: forms, PDF and UI

- **Head:** `batch-c-forms-ui` → **Base:** `main`
- **Stacked PR 3 of 3.** Create only after the batch B PR has merged.
- Merge with **"Create a merge commit"** — never squash, never rebase (repo rule).

Everything below the line is the PR body, ready to paste.

---

Launch-testing fixes across the inspection form, lead views and the PDF pipeline. Photo
capture takes one photo per captioned slot (the multi-select overflow wrote orphan rows).
Waste disposal is now visible end to end on the lead side: recorded volume and cost
surface on the lead view, and the lead-view cost estimate includes the waste amount it
previously understated. The invoice summary flags actuals that diverge from the quote.
`pdf_versions` rows written by the legacy generator are attributed to the caller instead
of rendering as "Unknown". The Drying Equipment toggle now gates its quantities the same
way HEPA does — turning it off stops the quantities feeding pricing and saves, with the
load path reconciling pre-gate records instead of dropping their equipment retroactively.
Finally, AI generation is made resilient to truncated model responses: bodies with
`finish_reason` of `length`/`error` are rejected, an unparseable body sends the request to
the next model in the chain instead of failing outright, and `gemini-2.5-flash-lite` is
demoted to fallback after failing 3/3 on DEV with an upstream stream fault.

## Commits (10, oldest first)

| Commit | Change |
|---|---|
| `0e38505` | fix(inspection): one photo per captioned slot |
| `b75020e` | fix(leads): surface recorded waste volume and cost |
| `d83c58d` | fix(leads): include waste in the lead-view cost estimate |
| `9e6216e` | feat(leads): flag actuals that diverge from quote on the invoice summary |
| `da8bf0c` | fix(ef): attribute pdf_versions rows written by the legacy generator |
| `c894d62` | docs: park issue 15, record issue 24 verification and batch C outcomes |
| `bcb9e99` | fix(inspection): drying equipment toggle gates its quantities |
| `45c0a71` | docs: record the drying equipment gate as shipped |
| `9d1c723` | fix(ai): reject truncated model responses; demote flash-lite to fallback |
| `4b06aa1` | docs(api): correct generate-inspection-summary contract and model chain |

An eleventh commit (`docs: production merge runbook, PR descriptions, 4 Aug findings`)
completes this branch — it carries `docs/PRODUCTION_MERGE_RUNBOOK.md`, the three
`pr-batch-*.md` descriptions (including this file) and the 4 Aug findings append.

## Surfaces touched

- **Edge Functions (2):** `generate-inspection-pdf` (`da8bf0c` — caller attribution from
  the JWT-bound client, degrades to NULL without an Authorization header; no frontend
  coupling) and `generate-inspection-summary` (`9d1c723` — truncation guard + validate
  callback + model chain reorder).
- **Frontend:** `TechnicianInspectionForm.tsx`, `LeadDetail.tsx`,
  `InspectionDataDisplay.tsx`, `InvoiceSummaryCard.tsx`, new `quoteVariance.ts` + tests.
- **`LeadDetail.tsx` note:** the single hunk sits at ~`:2080`. The frozen ALL_STATUSES
  index thresholds at `:500-543` are untouched.
- **Docs:** `LAUNCH_TESTING_FINDINGS.md`, `TODO.md`, `API.md`.
- **No sacred surfaces, no migrations.** `check-overdue-invoices` untouched (verified:
  `git diff production batch-c-forms-ui -- supabase/functions/check-overdue-invoices/`
  is empty).

## Verification

- 4 Aug 8-point DEV verification pass on `45c0a71` + DEV EF v10: **all 8 passed** (photo
  slots, waste lines, variance flags, drying gate, PDF attribution, AI regeneration).
  DEV versions are session-attested; re-check with
  `npx supabase functions list --project-ref ctppzqnysmzynkxjlzta`.
- The AI resilience fix (`9d1c723`) was proven live on DEV: flash-lite returned
  `finish_reason=error` with a body cut mid-sentence, the validator rejected it, and the
  chain fell through to `gemini-2.5-flash`, which completed with `finish_reason=stop` —
  the first time the fallback chain has ever engaged on this failure class.
- On `4b06aa1`: `npm run typecheck` clean, `npm run build` clean, Vitest **496/496**
  (33 files), including `quoteVariance.test.ts` 13 and the 60/60 pricing suite untouched.

## Deploy notes

`generate-inspection-pdf` is frontend-safe and deploys in runbook Stage 2.1;
`generate-inspection-summary` deploys **after** the production merge (Stage 4 — see the
batch B PR for the `totalWorkDays` coupling). The runbook itself
(`docs/PRODUCTION_MERGE_RUNBOOK.md`) lands with this branch.

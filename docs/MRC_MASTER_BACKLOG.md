# MRC MASTER BACKLOG & PRICING CANON — 3 September 2026

**Sources:** Slack (`#app-issues`, `#general`, all task channels, Glen DM) · 28 Aug team meeting · `MRC_Handoff_Strategy_and_Operations.md` (compiled 2 Sep) · `MRC_Pricing_List_Aug_2026.pdf` (effective 31 Aug) · Sessions C & D · standing security findings · Michael's decisions 3 Sep.

**Authority:** The 2 Sep handoff document **supersedes** the 31 Aug pricing PDF wherever they disagree, except where flagged below as unresolved.

**Self-contained.** Appendices A–M reproduce every source verbatim. No other file is needed to work from this.

---

## ▶️ HOW TO USE THIS DOCUMENT

**Step 1 — put it on disk.** Download this file and save it to:

```
~/mrc-app-1/docs/_INBOX_MASTER_BACKLOG.md
```

Do **not** paste this whole document into Claude Code. It's ~1,900 lines. Saving it
to disk lets the session read it with `@` and keeps your context free for the actual
work.

**Step 2 — open Claude Code in the main worktree.**

```
cd ~/mrc-app-1
claude
```

Kill auto mode with `Shift+Tab`. Check `/context`. Set `/model` to the latest Opus.

**Step 3 — paste the Session E brief only.** It's in the "SESSION E" section below.
It reads the file from disk. Nothing else gets pasted. **One session, one terminal.**
Parallel sessions start in Phase 2, not now.

**Step 4 — Session E ends with everything saved and a list of questions.** Answer
them. It folds the answers back in and hands you a session plan. Then it stops.

**Step 5 — that's the last of the documentation work.** From here it's worktrees,
parallel sessions and Codex on every diff. A fresh session per worktree, handoff
prompt plus one brief, forever. The docs only get updated as a by-product of
shipping — one ledger entry and one ticked box at a time.

At the end of Session E you will have, committed on `docs/backlog-pricing-canon-and-ledger`:

| File | What |
|---|---|
| `docs/MRC_MASTER_BACKLOG.md` | This document, archived verbatim |
| `docs/TODO.md` | The working tracker, every item with a stable ID and tracking columns |
| `docs/PRICING_CANON.md` | All rate tables, rules, and the UNRESOLVED conflicts |
| `docs/BUG_LEDGER.md` | Bug classes, entry template, 16 seed entries |

Plus a drift audit in the session output showing exactly how far `pricing.ts` has
diverged from the canon.

⚠️ **You still push and merge.** Session E does not commit.

---

# ⛔ THE PHASE GATE — READ THIS BEFORE YOU OPEN CLAUDE CODE

**There are two phases. They never happen in the same session.**

## PHASE 1 — Session E. **One session. Everything.**

One session, one worktree, one branch. Codex setup **and** all the documentation.
No parallelism yet — that starts in Phase 2, when there are real bugs to fix.

It runs in four parts:

| Part | What | Ends with |
|---|---|---|
| **A** | Codex review loop — pre-flight report, then install | Review loop live, one logged run |
| **B** | Write the docs | Four files written, drift audit reported |
| **C** | Ask you everything | Numbered questions, waits for answers |
| **D** | Hand back a session plan | **STOP** |

**Writes:** `docs/MRC_MASTER_BACKLOG.md` · `docs/TODO.md` · `docs/PRICING_CANON.md`
· `docs/BUG_LEDGER.md` · `AGENTS.md` · `docs/codex-review-log.md` ·
`CLAUDE.md` (append) · `~/.codex/config.toml`

**Does not:** touch a single `.tsx` or `.ts` outside `docs/` · start any backlog
item · act on the drift audit · fix P0-0, P0-2 or anything else.

⚠️ **Run `/compact` between Part A and Part B.** Part A reads a 902-line procedure,
Part B reads a 2,500-line backlog. Doing both without compacting will degrade the
questions in Part C, which are the most valuable output of the session.

## ⛔ GATE — you approve the plan

Answer the questions. Review the four docs. Approve the session plan.
Push and merge the docs branch yourself.

Nothing crosses this line until you've done that.

## PHASE 2 — Execution. Worktrees, parallel sessions, Codex on every diff.

Once E and J are merged and the plan is approved, **the documentation work is
finished.** Nothing goes back to writing docs. From here it's worktrees, parallel
sessions and the review loop.

Each session gets the **Session Handoff Prompt** plus **one** brief. Sessions that
share no files run at the same time — the plan from Session E tells you which pairs
are safe.

**Ready-to-go briefs already written:**

| Session | Job | Owns | Parallel with |
|---|---|---|---|
| **G** | One lead view for every lead — investigate, then collapse two render paths into one | `LeadDetail.tsx` · `InspectionDataDisplay.tsx` | H, F |
| **H** | Lead list — kill "Load more", real pagination, true server count | `Leads.tsx` · `lib/api/leads.ts` | G, F |
| **F** | Worktree cleanup + guard hook flip | `.claude/hooks/` · `.claude/settings.json` · `scripts/` | G, H |
| **I** | Pricing engine rebuild — plan only | `pricing.ts` (read) | nothing — runs alone |

### The loop, from here on

```
1. Open a worktree.        One session, one branch, one brief.
2. Claude Code writes.     Diff stays under ~150 lines.
3. Codex reviews it.       /codex:adversarial-review --base main
                           READ THE Target: LINE before triaging.
4. Michael triages.        Findings are claims, not patches. Accept, reject,
                           or defer each one.
5. Ledger entry written.   Same commit as the fix. Non-negotiable.
6. Michael merges --no-ff. Preview tested at 375px, pinned commit URL,
                           full SW reset.
7. TODO.md item ticked.    Branch deleted, local and remote.
```

Repeat per item, in priority order, several worktrees at a time.

**Why the gate exists.** The moment a fix session starts, its own context becomes
the source of truth and the backlog stops being read. Save, question, answer,
approve — *then* build. After that, you never go back to writing documents; the
docs get updated as a by-product of shipping, one ledger entry and one ticked box
at a time.



### Contents

| Part | What's in it |
|---|---|
| **The Phase Gate** | Setup session vs execution sessions — never the same session |
| **Orientation** | What MRC is, how pricing works, where things live, what will surprise you |
| **P0-CRITICAL** | Two different lead views exist — read first |
| **Health-check findings** | 26 Aug–4 Sep: silent data loss, false email sends, double-firing crons, dead audit trail. Plus the **1 Oct Node deadline**. |
| **Session C rework** | Why the parked branch can't merge as built |
| **Decisions locked** | Every ruling made 3–4 Sep |
| **Conflicts resolved** | C1 and C2 answered by Glen — audit of the Slack DM |
| **Canonical pricing** | The live rate tables and rules |
| **Backlog** | Blocked · P0 · P1 · P2 · P3 · Marketing · Infrastructure · Shipped |
| **Bug Ledger** | The self-improving layer — bug classes, entry format, seed entries |
| **Briefs** | Session E (save + clarify — **run this first**) · F (worktrees + hook) · G (lead detail) · H (lead list pagination) |
| **Knowledge layer** | `~/okf/projects/` — where every agent leaves its history |
| **Codex loop** | Fixed rulings, known plugin issues, the missing repo fact — set up in Session E Part A |
| **Workflow** | Session order · handoff prompt · multi-worktree + Claude/Codex rules |
| **Appendix A** | Team, roles, the four-step plan, targets |
| **Appendix B** | Pricing list 31 Aug, verbatim |
| **Appendix C** | Real estate loyalty discount, full build spec |
| **Appendix D** | Office playbook — time blocks, call rules, standards |
| **Appendix E** | App vision, official fix list, tracking, V2 |
| **Appendix F** | Growth, hiring, the quiet season |
| **Appendix G** | Individual task lists |
| **Appendix H** | Slack bug reports traced to source |
| **Appendix I** | Hard operating rules — never relax |
| **Appendix J** | Every open question, and who owns it |
| **Appendix K** | Glossary — every MRC term defined |
| **Appendix L** | Why things are the way they are — decisions with reasoning, do not relitigate |
| **Appendix M** | Answers to the questions agents actually ask |

---

# 🧭 ORIENTATION — READ THIS BEFORE ANYTHING ELSE

*For any agent picking this up cold. Everything here is answered so you don't have
to ask.*

## What MRC is

**Mould & Restoration Co.** is a Melbourne mould remediation business. Five people.
Two owner-technicians in vans doing inspections and remediation, one office admin,
one casual, one developer (Michael, who owns this codebase and is the only person
who deploys).

**The app** (`mrcsystem.com`) replaces an Airtable + Zapier + ServiceM8 patchwork.
It runs the whole business: lead comes in → gets booked → technician inspects on
site → app generates a PDF report and a quote → customer approves → remediation job
gets booked → job report → invoice.

It went live **31 August 2026**. It is in production, with real customers receiving
real quotes. **A pricing bug bills a real person the wrong amount.** That is why
`pricing.ts` is a frozen surface.

## The two things people confuse

**Inspection ≠ Job.** They are separate bookings, separate forms, separate PDFs.

| | Inspection | Job |
|---|---|---|
| What | Technician attends, assesses, measures, photographs | Technician attends and does the remediation work |
| Output | Inspection report PDF + a quote with two options | Job report PDF |
| Form | 9 sections, `TechnicianInspectionForm.tsx` | Job completion form (Phase 2, in progress) |
| Calendar | Blue cards | Orange cards |
| Charged | Usually free. $385 if paid inspection. | The quote amount |

A lead can have an inspection and no job (customer didn't proceed), a job with no
inspection (repeat customer, known scope), or both.

## The quote — Option 1 and Option 2

Every inspection produces **two priced options** the customer chooses between.

- **Option 1 — Surface Treatment.** Clean and treat the mould. Nothing is removed.
- **Option 2 — Comprehensive.** Includes demolition: cut out and replace affected
  material.

They are **alternatives, not a running total.** Option 2 is not Option 1 plus
demolition — it's a different scope of the same job. Getting this wrong is the bug
Session C fixed.

**Subfloor work appears in both** (decision locked 3 Sep). It's remediation of the
crawl space under the floor, and it's needed regardless of which option the customer
picks.

## How a job is priced

1. The technician records **hours** per area, per work type, during the inspection.
2. Work types: **Surface**, **Demolition**, **Subfloor**, **Construction Site**.
3. Hours → a **rate table lookup** (2h to 8h rows, nearest row between).
4. Beyond 8 hours: **each day = that category's 8-hour rate.** No discount for
   longer jobs.
5. **Mixed job** (some areas surface, some demolition): total ALL hours, price the
   whole lot at the **highest category present**. Not per-area. Not stacked.
6. Add **equipment** (dehumidifiers, air movers) at a per-unit-per-day rate.
   Equipment is **never discounted**.
7. Add **waste disposal**, **travel** if beyond 50km, **paid inspection credit** if
   applicable.
8. **GST 10%** on the subtotal.

## The 9 sections of the inspection form

| # | Section | Notes |
|---|---|---|
| 1 | Basic Information | Customer, address, date |
| 2 | Property Details | Type, occupation, parking |
| 3 | **Area Inspection** | Repeatable per room. Mould locations, temp/humidity, moisture readings, photos, hours, demolition toggle. This is where hours come from. |
| 4 | **Subfloor Assessment** | Yes/No toggle + hours. The toggle only hid the UI until Session D. |
| 5 | Outdoor Environment | External readings |
| 6 | Waste Disposal | Volume, cost |
| 7 | Work Procedure & Equipment | Equipment selection and days |
| 8 | Job Summary | AI-generated summary of findings |
| 9 | **Cost Estimate** | Where everything above becomes money. Both options shown. |

## Where things live

| Path | What |
|---|---|
| `src/pages/TechnicianInspectionForm.tsx` | The 9-section form. ~4,700 lines. Where hours are captured and Section 9 is calculated live. |
| `src/pages/LeadDetail.tsx` | The lead view. `ALL_STATUSES` at lines 500–543 is **frozen** — hardcoded index thresholds gate the nulling of financial data. |
| `src/components/leads/InspectionDataDisplay.tsx` | Re-renders inspection data on the leads side. Mirrors Section 9 logic — changes usually need making in both. |
| `src/lib/calculations/pricing.ts` | The pricing engine. **Frozen.** Every change goes through `pricing-guardian`. |
| `src/lib/calculations/subfloorHours.ts` | Added Session D. The tristate subfloor rule, extracted so it's testable. |
| `src/lib/statusFlow.ts` | The 12-stage lead pipeline. **Frozen.** |
| `src/lib/bookingService.ts` | Calendar booking logic |
| `src/lib/api/pdfGeneration.ts` | Calls the PDF Edge Function |
| `src/lib/offline/SyncManager.ts` | Dexie offline sync — technicians work in basements with no signal |
| `supabase/functions/generate-inspection-pdf` | Builds the report PDF |
| `docs/` | All documentation. 27 files. No `context/` folder. |

## Things that will surprise you

**The PDF template is not in the repo.** It's read at **runtime** from Supabase
Storage at `pdf-templates/inspection-report-template-final.html`. Editing the repo
copy does nothing. You must upload to Storage — and Storage does not overwrite
same-named files, so delete first, then upload.

**A blanket `@media print` rule strips backgrounds from every div** in that
template. Any new background colour needs an allow-list entry or it prints white.

**`npm run typecheck` is a no-op.** The root tsconfig has `"files": []`, so it
checks nothing and always exits 0. Use `npx tsc -p tsconfig.app.json --noEmit`. The
baseline is ~99 pre-existing errors and **varies between worktrees** — measure it in
the one you're in before you claim you introduced or fixed anything.

**The Supabase MCP defaults to PROD.** It has no project ref pinned. Every call must
pass `project_id` explicitly or you may write to the live customer database. This
has already happened once.

**`supabase db push` is permanently banned.** The migration history is forked — 16
shared, ~104 local-only, ~102 remote-only. Migrations are applied by hand in the
Studio SQL editor. There is a Bash guard hook that blocks Supabase CLI commands
without an explicit non-PROD ref.

**`supabase db query --linked` executes DDL.** It was believed read-only. It isn't.
It's blocked.

**GitNexus misses call edges** for components declared inline inside another file. A
"0 callers / dead code" verdict is not trustworthy — always grep as a fallback. This
has produced a confidently wrong answer before (`calculateWasteDisposalCost` showed
0 callers with a live call at `TechnicianInspectionForm.tsx:1696`).

**`supabase-js` returns PromiseLike, not Promise.** `.catch()` chaining silently
does nothing.

**There are 17 git worktrees.** One session per worktree, one branch per worktree.
Confirm the worktree you're in carries current `main` before starting. Two sessions
must never own the same file.

## Who decides what

| Decision | Owner |
|---|---|
| Pricing, rates, discounts | **Glen and Clayton** — they're the owners, it's their money |
| Architecture | **Glen and Clayton consulted**, Michael decides |
| Anything operational / daily workflow | **Vryan** raises it, Michael builds it |
| Commits, pushes, merges, deploys, migrations, Storage uploads | **Michael only.** No agent ever does these. |

## What an agent must never do

- Commit, push, merge, deploy, or apply a migration
- Write to the production database without Michael's explicit approval **in that
  session** — a comment in a `.sql` file is not approval
- Edit a frozen surface without an explicit flag: `pricing.ts`, `statusFlow.ts`,
  `LeadDetail.tsx` lines 500–543, `/src/auth/**`, `supabase/migrations/**`,
  `supabase/functions/**`
- Claim a deploy succeeded based on a version number or a CLI success message —
  **verify by content**
- `git add -A`
- Add AI attribution to a commit message

## Australian conventions — non-negotiable

Dates `DD/MM/YYYY` · currency `$X,XXX.XX` · locale `en-AU` · timezone
`Australia/Melbourne` · GST 10% · spelling is Australian English (mould, not mold —
this matters, it's in customer-facing reports).

## The mobile constraint

Technicians use this **on phones, in crawl spaces, wearing work gloves.** 375px is
the primary viewport, not an afterthought. 48px minimum touch targets. No horizontal
scroll. Auto-save every 30 seconds — a technician losing 40 minutes of form data in
a basement is a real and previously-occurring failure.


---

# 🚨🚨 P0-CRITICAL — TWO DIFFERENT LEAD VIEWS EXIST

**Found 4 Sep. This is the top priority. Everything else waits.**

Two leads with the identical status `Awaiting Job` render completely differently.

| | Lead A — Customer A | Lead B — Customer B |
|---|---|---|
| ID | `MRC-2026-0124` / `8f28255f-8ff9-46f7-a623-55489ef34215` | Repeat Customer, Epping |
| Status | Awaiting Job | Awaiting Job |
| Inspection | ✅ Complete — INS-2026-0027, report sent 02/09 9:57 PM | ✅ Complete |
| Renders | Contact, property, issue, lead details, inspection scheduled, customer requests, internal notes, notes, activity log | **Everything** |
| **Missing** | Cost Estimate · Subfloor Status · Waste Disposal · Recommended Dehumidifier Size · Parking · Additional Info for Technician · Cause of Mould · Property Occupation · Cost Breakdown (Admin) · entire Inspection Data accordion · AI Summary · Inspection Report History · PDF Versions · Email History | — |

### Michael's diagnosis, 4 Sep

**This is not data loss.** The inspection data exists. The problem is that **two
different render paths exist for the same status** — one lead gets the full page
view with every section, another gets a cut-down view. Which path a lead takes is
not predictable from its status.

> *"There are different views here. Every lead view, in every lead, should always
> show every piece of information and everything. Nothing should be hidden. Or we
> have one lead view where it shows everything."* — Michael, 4 Sep

### The requirement

**One lead view. Every lead. Every section it has data for, always.** No conditional
layouts. No status-dependent rendering. If a section has no data, it renders empty
or is omitted for that reason alone — never because of what status the lead is in.

### Still worth one read query first

Not to check for data loss — to check the **join**. If Customer A's inspection row isn't
properly linked to her lead, un-gating the render just produces empty sections and
the real bug is the relationship, not the layout. One read confirms which.

The status round-trip in her activity log is still the best lead on *why* her lead
took a different path:

```
v5   —              → Awaiting Job          02/09  9:57 PM
v6   Awaiting Job   → Awaiting Inspection   03/09 11:14 AM
v7   Awaiting Insp. → Awaiting Job          03/09 11:14 AM
```

`ALL_STATUSES` at `LeadDetail.tsx:500–543` uses hardcoded index thresholds. A
backwards transition crosses one. That's the most likely mechanism for a lead ending
up on the wrong render path.

**Resolves:** P0-3 (AI summary not visible) and P0-4 (Customer A — no details, no
download) are the **same bug**.

**Brief:** Session G, at the bottom of this document. **Run it first.**

---

## 🚨 READ THIS SECOND — SESSION C MUST BE REWORKED, NOT MERGED

Glen's final ruling on mixed jobs contradicts what was built.

| | Behaviour |
|---|---|
| **Old (broken, was live)** | Surface for the whole job **+** demolition for the whole job, stacked |
| **Session C (built, on branch)** | Each area priced for what it needs, then added: 2h demo @ demo rate + 2h surface @ surface rate |
| **Glen's final rule (correct)** | **Total the hours, price the whole scope at the highest category present.** 2h demo + 2h surface = **4h at the demolition rate** = $1,275.26 |

> *"Never price area-by-area (double-charges the mobilisation premium baked into 2h rows) and never stack categories."* — §4.5

**Action:** `fix/option-stacking-equipment-days` fixed the stacking (correct) but implemented per-area either/or (incorrect). The equipment Days multiplier on that branch is still good. **Rework the labour half before merge.**

---

## 📌 DECISIONS LOCKED

| Decision | Ruling |
|---|---|
| **Mixed jobs** | ✅ Total hours → price all at highest category present. Never per-area. Never stacked. Virtual/photo quotes presented as a range. |
| **Multi-day** | ✅ Every day on site = that category's **day-1 (8h) rate. No step-down.** 3-day subfloor = 3 × $3,175.21. Multi-tech multiplies: 2 techs × 3 days = 6 × day rate. **Old `dayRates` curves are retired.** Big-job exceptions = manual director override on the quote, never engine logic. |
| **Same-day multi-tech** | ✅ 8h rate × number of technicians. Two techs all day = 2 × the 8h price. |
| **Discount ceiling** | ✅ Discounts stop at 8 hours. The 2–8h rows are the only scaled prices. Old 16/24/32/40/48h block discounts are dead. |
| **Subfloor in both options** | ✅ Approved. Option 1 = surface + subfloor. Option 2 = demolition + subfloor. Option 1 currently hardcodes `subfloorHours: 0`. Changes every quote. |
| **Option 2 stacking** | ✅ Glen's 31 Aug complaint is resolved in principle — but see the rework note above. |
| **User permissions** | ✅ **Every user gets both admin and technician access.** No role separation. Confirmed in handoff §6. |
| **Equipment scheduling** | ✅ **Small version now.** Free-text named calendar blocks + quick-fill equipment pickup (technician + job + equipment) saving a record. Big version → P3-7. |
| **Netlify equipment tracker** | ⏸️ Last on the list. **Claude must ask Michael for the link and Glen's screenshots before starting P3-7.** |
| **Dehumidifier toggle** | 🔍 Investigate first — Michael suspects it's wired to nothing. |
| **Moisture location + photo** | 🔍 Investigate first — confirm nothing renders before removing. |
| **Quote chasing** | 🔍 Codebase audit first — partial implementation may exist. |

---

## ✅ CONFLICTS RESOLVED — 4 SEP (Slack DM audit)

Glen answered all three by sending `MRC_Handoff_Strategy_and_Operations.md` on
2 Sep. The DM history settles the two that looked contradictory.

### C1 — Equipment day rates: **$119 dehumidifier / $46 air mover** ✅

| When | What |
|---|---|
| 31 Aug 20:38 | Glen sends the pricing PDF — $120 / $44 |
| 31 Aug 20:38 | Glen, one minute later: *"only one thing wrong with that is that its $119 and $46 for the dehumidifier and blower rental"* |
| 31 Aug 20:48 | Michael: *"I'll set them back to $119 and $46 — that's what the app was already running"* |
| 2 Sep 19:51 | Handoff doc says $120 / $44 |

The handoff doc was compiled from the meeting recording plus the PDF. It never saw
the Slack correction. **Glen's direct correction wins. $119 / $46. No app change
needed — that's what it already runs.**

### C2 — Loyalty ladder at property #7: **standard rates, permanently** ✅

Michael asked: *"What resets at the 7th — back to 10%, or does it start over
completely?"*

The handoff doc answers directly: `#7 onward → standard rates, permanently — the
ladder does not restart`, and adds a rule that appears nowhere in the PDF: **it ends
early if an agency hits 10 properties in one month.** That extra condition only
makes sense as a considered answer to the question, not as a copy-forward.

**Standard rates permanently at #7. Early exit at 10 properties in a month.**

### Mixed jobs — Glen chose **total hours at highest category** ✅

Michael gave him both numbers side by side:
- Total at highest: ~$1,275
- Per-area, added: ~$1,351

The handoff doc uses Michael's own example verbatim — *"2h demo + 2h surface = 4h at
the demolition rate ($1,275.26)"* — and adds the reasoning: *"never price
area-by-area (double-charges the mobilisation premium baked into 2h rows)."*

**Confirmed. Session C's per-area logic must be reworked.**

### C3 — Moisture comment/photo — still open 🔍

| Source | Rule |
|---|---|
| Handoff §6 item 5 | Plain number fields; **comment/photo optional**; no location on PDF |
| Michael, 3 Sep | Remove location **and** photo |

Reconcile during the P2-8 investigation. Low stakes either way.

---

## 💰 CANONICAL PRICING — EFFECTIVE 31 AUG 2026

All prices **ex GST**. Quote format: `$X,XXX.XX + GST` — **keep the odd cents.**

### Residential rate tables

| Hours | Surface (No Demo) | Construction Site | Demolition | Subfloor |
|---|---|---|---|---|
| 2h | $635.27 | $695.39 | $795.23 | $1,195.84 |
| 3h | $785.45 | $878.39 | $1,035.25 | $1,562.68 |
| 4h | $994.53 | $1,135.74 | $1,275.26 | $2,074.75 |
| 5h | $1,107.50 | $1,272.91 | $1,425.41 | $2,349.24 |
| 6h | $1,220.30 | $1,410.61 | $1,575.56 | $2,624.46 |
| 7h | $1,332.95 | $1,548.94 | $1,725.72 | $2,900.98 |
| 8h | $1,445.33 | $1,685.91 | $1,875.87 | $3,175.21 |

⚠️ **Demolition 2h / 4h / 8h are exact** (derived from the confirmed commercial table ÷ 1.25). **In-between rows are linear interpolation** pending Clayton's full table. Flag demolition quotes for Clayton or Glen to review before sending until confirmed.

Between 2 and 8 hours, price by the **nearest row**.

### Commercial rates — 25% surcharge folded silently into labour

Applies to Surface, Demolition, Subfloor. **Never shown to the client as a separate line.** Driven automatically by the report front-page property type (e.g. "House — Commercial"). Construction Site uses its own table and takes **no** surcharge on top.

| | 2h | 4h | 8h |
|---|---|---|---|
| Surface (No Demo) | $794.09 | $1,243.16 | $1,806.66 |
| Demolition | $994.04 | $1,594.08 | $2,344.84 |
| Subfloor | $1,494.80 | $2,593.44 | $3,969.01 |

### Minimums & premiums

- **Bathroom condensation: 1-hour minimum, $450 + GST.** First hour priced heavier than subsequent hours.
- **Non-bathroom condensation: 2-hour minimum.**
- **1-hour demolition jobs are premium-priced.** Setup and pack-down run ~25 min each way — the client is paying for mobilisation, not just cutting time.

### Equipment & fixed fees

| Item | Rate |
|---|---|
| Dehumidifier hire | **$119/day/unit + GST** ✅ confirmed C1 |
| Air mover (blower) hire | **$46/day/unit + GST** ✅ confirmed C1 |
| Equipment cap — residential | 4 days maximum (commercial negotiated separately) |
| Paid inspection | $385 + GST — credited against the quote if mould confirmed and client proceeds; **non-refundable for long-distance travel** |
| Weekend inspection callout | $500 |
| Travel beyond 50 km | $1.50/km — **its own line item** |

Travel fees and paid inspections are **separate line items** — never baked into the job price.

**Equipment is never discounted.**

### Real estate loyalty discount — app build spec

- **Per agency**, counted per property sent, applied **automatically per job**
- #1 → 10% · #2 → 12% · #3 → 14% · #4 → 16% · #5 → 18% · #6 → 20% · **#7 onward → standard rates, permanently** ✅
- Ends early if an agency hits **10 properties in one month**
- **Labour only** — never off equipment hire or waste disposal
- **Forfeited** if the account goes to debt collection or credit default listing
- Every lead must be **tagged with its referring agency** (also gives per-agency revenue tracking)
- **Manual discount cap stays 13%.** The automatic loyalty engine may reach 20%. Above 13% manual = director override.

### Current agency stable

River Edge (biggest), Peter Lee, Elite, C+M, HNB (great payer), O'Brien. **Ace** — relationship soured over ~$800 late fees on a ~$600 invoice, no work orders since.

---

## ⏸️ STILL BLOCKED

| # | Item | Waiting on |
|---|---|---|
| B1 | **Full residential demolition hourly table** — interpolated rows in use meantime | **Clayton** |
| B2 | **Glanz email + mobile** | **Glen** |
| B3 | **0b PROD verification** | Michael (pre-flight) — blocks Session B merge + two-tech |
| B4 | **What is the "Split" tab in splitracker?** Unrelated to equipment — ask before speccing P3-7 | **Glen** |
| B5 | **Glanz Sunday availability** (currently Wed/Fri/Sat) | **Glanz** |

---

## 🔴 P0 — CRITICAL / LIVE DAMAGE

| # | Item | Detail |
|---|---|---|
| **P0-0** | **🚨 TWO DIFFERENT LEAD VIEWS EXIST** | Customer A renders 9 sections; Customer B renders everything. Same status. **Not data loss** — the data exists, the render path differs. Requirement: one lead view, every lead, every section it has data for, always. Suspected `ALL_STATUSES` index-threshold gating triggered by a backwards status transition. Session G. |
| P0-1 | **`pdf-assets` / `pdf-templates` anonymously writable on PROD** | Live security hole. Fix written + DEV-rehearsed on `fix/pdf-assets-anon-write-rls`. Apply off-peak. |
| P0-2 | **🚨 Lead list count is fake + "Load more" hides leads** | The header count is derived from **what's currently loaded**, not from a real `COUNT` query. Loads 50 → says "50 of 50". Click Load more → finds more → count grows. **Affects every tab** (All, New Lead, Awaiting Inspection, etc.), so every tab count is wrong. Team believes leads stop registering after inspection — they don't, they're just never loaded. **Fix: kill "Load more" entirely. Replace with real pagination, 50 per page, and a true total from a `count` query.** Session H. |
| P0-3 | **AI summary review not visible on completed inspections** | ✅ **Same bug as P0-0.** Folded in. |
| P0-4 | **Customer A — no details, can't download report** | ✅ **Same bug as P0-0.** Folded in. Reproduced and diagnosed 4 Sep. |
| P0-5 | **`send-email` EF — unauthenticated relay, spoofable `from`** | Anyone can send email as MRC. Own scoped session. |
| P0-6 | **DEV Vault holds a PROD-valid `service_role_key`** (SF-5) | DEV cron received HTTP 200 from PROD. Highest-severity standing finding. |
| P0-7 | **Supabase MCP has no project ref pinned** | Defaults to PROD. Already caused a test INSERT on PROD. Pin to DEV in `~/.claude.json` or remove. |
| P0-8 | **Archived leads still holding technician slots + sending reminders** | Customers receiving reminders for archived work. |

---

## 🟠 P1 — PRICING ENGINE REBUILD

This is one coherent body of work. Do not ship it piecemeal.

| # | Item | Detail |
|---|---|---|
| P1-1 | **Load the new rate tables** | Four residential tables (Surface, Construction Site, Demolition, Subfloor), 2h–8h. Nearest-row pricing between rows. |
| P1-2 | **Commercial property type + 25% surcharge** | Add Commercial to Premises Type. Surcharge folded into labour, never a visible line. Construction Site exempt. |
| P1-3 | **Industrial + Construction added to Premises Type** | Glen requested 31 Aug with screenshot. |
| P1-4 | **Multi-day = day-rate multiples** | Every day = day-1 8h rate. No step-down. **Retire the `dayRates` arrays entirely.** Multi-tech multiplies. |
| P1-5 | **Mixed jobs = highest-category anchor** | Total the hours, price at the highest category present. **Reworks Session C.** |
| P1-6 | **Session C rework + merge** | Keep the equipment Days multiplier. Replace per-area either/or with the highest-category rule. |
| P1-7 | **Subfloor in BOTH options** | Option 1 = surface + subfloor. Option 2 = demolition + subfloor. Remove the hardcoded `subfloorHours: 0`. |
| P1-8 | **Minimums & premiums** | Bathroom condensation 1h min $450. Non-bathroom condensation 2h min. 1h demolition premium. |
| P1-9 | **Fixed fees as separate line items** | Paid inspection $385 (creditable), weekend callout $500, travel $1.50/km beyond 50km. Never baked into job price. |
| P1-10 | **Loyalty discount engine + agency tagging** | Per-agency property counter, auto-applied, labour only. Lift **auto** cap to 20%, keep **manual** cap at 13%. Tag every lead with referring agency. |
| P1-11 | **Tech cost-estimate view must match report pricing incl. overrides** | Techs currently see a different number to the report. |
| P1-12 | **Quote format** | `$X,XXX.XX + GST` everywhere. Keep the odd cents. |
| P1-13 | **Print pricing chart for Glen + Clayton to confirm** | Reusable PDF sheet, generated from the live tables so it can't drift. |

⚠️ **`pricing.ts` is a frozen surface.** Every change goes through `pricing-guardian`. This rebuild touches nearly all of it — plan it as its own multi-session body of work with a full Vitest suite before any merge.

---

## 🟠 P1 — WORKFLOW & DATA

| # | Item | Detail |
|---|---|---|
| P1-14 | **Internal notes / notes disappear on some lead statuses** | Shows sometimes, not others. Status-dependent render bug. |
| P1-15 | **Search leads by Lead ID** | e.g. `MRC-2026-0179`. Small, high daily value. |
| P1-16 | **Repeat-client quick create — prefill address/contact** | New job for existing client, details fill themselves in. |
| P1-17 | **Attachments on the job file** (separate from lead notes) | Glen + Vryan both flagged. Essential for invoices and manual entries. |
| P1-18 | **All users get admin + technician access** | ✅ Locked. |
| P1-19 | **Glanz onboarding** — admin + technician, app + Slack | Blocked on B4. |
| P1-19b | **🐛 Mobile nav bar detaches from the bottom and floats mid-screen** | Reported by Glen, seen by Michael. The bottom nav is not reliably pinned — on some pages, or after scrolling, it appears stranded in the middle of the viewport instead of anchored at the bottom. Obscures content. Field techs hit this daily at 375px. **Likely cause: a transformed ancestor.** Any ancestor with `transform`, `filter`, `backdrop-filter`, `perspective`, `will-change` or `contain` creates a new containing block, and `position: fixed` then resolves against **that element** instead of the viewport. Common culprits: a Radix/shadcn animation wrapper, a `transition-transform` on a drawer or sheet, or a `will-change` added for scroll performance. **Do not fix by switching to `sticky` or absolute-positioning it — find the ancestor.** |
| P1-20 | **🐛 Floating nav bar detaches from the bottom** | Intermittent. The bottom nav is meant to stay pinned to the viewport, but on some pages / after some scrolling it comes loose and ends up **stranded mid-screen**, sitting over content. Seen repeatedly, not once. **Most likely cause:** `position: fixed` breaks when any ancestor has `transform`, `filter`, `perspective`, `backdrop-filter`, `will-change` or `contain` — those create a new containing block and `fixed` starts resolving against the ancestor instead of the viewport. Common triggers here: a Radix/shadcn dialog or sheet wrapper, a Tailwind `transform` utility, or an animation class left on a parent. **Check that before rewriting any CSS.** Affects technicians daily at 375px. |
| P1-21 | **"Recommend Dehumidifier Hire" toggle — INVESTIGATE** | Trace what it writes, whether it reaches the PDF, whether it affects pricing. Then rename / hide on surface jobs / delete. Clayton is waiting. |

---

## 🟡 P2 — EQUIPMENT & SCHEDULING (SMALL VERSION)

| # | Item |
|---|---|
| P2-1 | **Named calendar blocks** — free-text name, block a time slot, not tied to a job |
| P2-2 | **Equipment pickup quick-fill** — technician + job + equipment, saves a record, shows on calendar |
| P2-3 | **Equipment unit + day selection on the job** — ties to the Session C Days multiplier |
| P2-4 | **Two technicians on one job** — 0a/0b/0c rehearsed on DEV, blocked on B5 |
| P2-5 | **Auto-scheduler slot recommendations with travel-time estimates** — from handoff §6 pipeline vision |

---

## 🟡 P2 — REPORT & PDF

| # | Item | Detail |
|---|---|---|
| P2-6 | **Infrared observations must print BELOW the infrared section** | Official fix list §6 item 4. |
| P2-7 | **Infrared Observations section on the area page** | Under extra notes. Show all toggled-on infrared fields. Check whether they surface anywhere else first. |
| P2-8 | **Moisture — plain number fields, no location on PDF — INVESTIGATE FIRST** | Confirm nothing renders before removing. Reconcile C3. |
| P2-9 | **Remove unused report pages** | e.g. subfloor-only jobs printing empty sections. |
| P2-10 | **PDF cover clips past ~25 rooms** | Needs an EF change **plus** a Storage template upload. |
| P2-11 | **Photo flow — button presses per area** | Bulk capture shipped. Confirm with Clayton it covers his complaint. |

---

## 🟡 P2 — CRM & COMMS

| # | Item | Detail |
|---|---|---|
| P2-12 | **Quote chasing — AUDIT CODEBASE FIRST** | Report sent → customer ghosts. Partial implementation may exist. Target: a view of unanswered quotes **and** a follow-up mechanism. Maps to "Awaiting jobs (unconverted quotes)" in the pipeline. |
| P2-13 | **Job diary — ServiceM8-style comms log per job** | Communications only, inside the job file. |
| P2-14 | **Google review request script** | Copy/paste SMS, not email-only. Option for Claude to generate a personalised one. Vryan sends a personal SMS after every invoice — script is pinned in Claude. |
| P2-15 | **Lead view phone tap → message or call** | Currently call only. |
| P2-16 | **Notification bell live instead of 30s poll** | |

---

## 🟢 P3 — BACKLOG

| # | Item | Detail |
|---|---|---|
| P3-1 | **Invoicing + Xero linking** | Official fix list §6 item 10. Revisit the drafted plan. |
| P3-2 | **Business tracking suite** | Revenue per job by client type and job type · fortnightly profit vs expenses (approximation over precision, Xero-integrated) · conversion rate per technician (drives bonuses) · cost per lead and per conversion by channel. This data decides channel pivots and hiring. |
| P3-3 | **Email domain switch to `mouldandrestoration.com.au`** | |
| P3-4 | **Framer → Supabase lead capture wiring** | |
| P3-5 | **Phase 2 job completion workflow** | Spec at `docs/JOB_COMPLETION_PRD.md`. |
| P3-6 | **SMS quick-action from lead numbers** | Handoff backlog. |
| P3-7 | **Equipment module — PORT `splitracker`, don't rebuild** | Glen already built and runs a working app at `splitracker.netlify.app`. Screenshots reviewed 4 Sep. **Fleet:** 8 dehumidifiers · 20 blowers · 6 scrubbers, 34 total, 13 deployed. **Per deployment:** job number, address, install date, ACTIVE/COMPLETE, overdue day counter. **Nav:** Home · Equipment · Personal · Split · Jobs · History. **Observed problems it already has:** several deployments show "No address"; overdue units sitting at 68d, 56d, 48d, 47d with no escalation. **The MRC opportunity:** deployments link to real jobs, so addresses populate automatically and overdue equipment surfaces against the customer it's sitting at. ⚠️ Ask Glen what the "Split" tab is before speccing — it isn't equipment. |
| P3-8 | **In-app notifications** | Needs a native app. Handoff backlog. |
| P3-9 | **Dedicated end-of-day report send window** | Handoff backlog. |
| P3-10 | **Photo-caption removal polish** | Handoff backlog. |
| P3-11 | **V2 — AI-agent-first rebuild** | Current app (~250k lines) gets buttoned up only, no new feature sprawl. Every v1 refinement feeds the v2 spec. |

---

## 🟢 P3 — MARKETING & WEB (NOT APP WORK)

| # | Item |
|---|---|
| M1 | Website redesign — new contact form with photo upload |
| M2 | Website SEO + Google optimisation (with Clayton, post-warehouse) |
| M3 | LinkedIn outreach strategy — Glanz drives. High End Developments network first, then maintenance companies, schools, apartment developers, insurance procurement |
| M4 | Real estate agency canvassing — opportunistic, in free windows, especially heading into summer |
| M5 | Google Business Profile map pin + surfacing 121 five-star reviews (91 Google, 30 hipages) — currently invisible in the local pack and AI search |

---

## 🔧 INFRASTRUCTURE / TECH DEBT

| # | Item | Detail |
|---|---|---|
| T1 | **`docs/todo-log-2026-08-31` branch unmerged** | 11 findings logged. Merge or fold into this document. |
| T2 | **SF-2: `audit_log_trigger()` carries `anon EXECUTE`** | Missed when siblings were revoked. |
| T3 | **`pg_default_acl` hazard** | Every new `public` function silently regains `anon EXECUTE`. Explicit `REVOKE FROM anon` in every migration creating a `SECURITY DEFINER` function. |
| T4 | **Full API key rotation** | Resend, Google Maps, OpenRouter, Supabase, Slack, Sentry. |
| T5 | **Dev Supabase environment separation** | Plan at `docs/L4-environment-separation-plan.md`. |
| T6 | **PROD pre-flight for 0a/0b/0c** | 15 read-only Studio blocks. PP6a needs human adjudication. Resume note in `DOCS/DEPLOY-LOG.md`. |
| T7 | **`npm run typecheck` is a no-op** | Root tsconfig has `"files": []`. Use `npx tsc -p tsconfig.app.json --noEmit`. Baseline 99 errors, varies per worktree — re-measure. |
| T8 | **Guard hook exists in only one place** | `block-supabase-prod.sh` lives ONLY at `~/.claude/hooks/`. The repo copy was deleted. Contains rule 3.5 (read-only allowlist for `migration list`, `db diff`, `inspect db *`, gated on `.temp/project-ref` reading DEV, fails closed). Tracked contract is `scripts/test-supabase-guard.sh`, 15 fixtures. **Restore into the repo before deleting the home copy** — see Session F brief. |
| T9 | **Incident 1 — `STATUS: NOT APPLIED` is unenforced prose** | A migration can be marked not-applied and nothing stops it being applied. Needs a real gate, not a comment. **Open, not started.** |
| T10 | **Incident 5 — write protection binds to tool names, not resources** | Bash walks straight past it. The protection is nominal for anything invoked through a shell. **Open, not started.** |
| T11 | **SessionStart warning for worktrees missing a named safety commit** | No warning fires today. **Open, not started.** |
| T12 | **Worktree drift** | 17 worktrees total. 14 current at `3191a39`. Three blocked: `mrc-app-1`, `mrc-cost-estimate`, `mrc-reminder-ef`. Register at `docs/POST_INCIDENT_FRAMEWORK.md`. |

---

## 📋 OPERATING CONTEXT (from handoff — not tasks, but shapes decisions)

- **Reports are tablet/laptop only.** Phone PDF viewer is unsupported.
- **Glanz mirrors every ServiceM8 booking into the app daily** from 31 Aug forward. No back-fill.
- **Pipeline:** New lead → Awaiting inspection → AI review → Approved → email sent → Awaiting jobs (unconverted quotes) → Booked → Scheduled.
- **Vision:** ServiceM8 + FastField + Monday.com in one, with AI.
- **Hire trigger:** 2–3 weeks of constant bookings in both calendars. End state 6 technicians + 3 office staff.
- **Quiet season Jan–Mar.** Last summer burned ~$90k → ~$15k. Defence this year is app efficiency, geolocation + SEO, LinkedIn, more recurring clients.

---

## ✅ SHIPPED — DO NOT RE-LOG

**Leads:** repeat clients, unit numbers kept, lead notes with @mentions + attachments, full-database search, optional preferred date/time, "Start Job" opens job form, @mentions in job notes.

**Schedule:** To Schedule search rail, Reschedule deep-links, hour/minute/AM-PM picker, conflict banner detail, booking cancel resets lead correctly, 7 stranded leads restored + 3 duplicates archived, colour-coded cards.

**Photos:** auto captions, before-photos on the day, before + after photos on jobs with no inspection, bigger delete target, bulk upload.

**Reports/PDF:** false "NOT saved" error fixed, email size fix, hide-area-from-report, ex-GST display, two layout overlaps fixed, room names legible on cover, real save error messages.

**Pricing:** 2h rates corrected, saved estimates recompute at current rates, manual override works.

**Notifications:** in-app bell, Framer confirmations + reminders logged, duplicate scheduled-job firing fixed.

**Sessions C & D:** Equipment Days multiplier (branch, keep). Option 2 stacking fix (branch — labour half needs rework per §Mixed jobs). Subfloor toggle zero-out (merged `14b14f3`).

**Official fix list §6 items 1–3 complete:** report emailing bug, unit numbers, repeat clients.

---

# 🔥 HEALTH-CHECK FINDINGS — 26 AUG TO 4 SEP

Source: automated 8am/8pm health checks, Sentry alerts, email triage. **Verify
current state of each before acting — some may already be fixed.**

## ⏰ HARD DEADLINE — 1 OCT

**Vercel drops Node 20 on 1 October. `mrc-app` builds fail after that date.**
Bump to Node 22 in project settings, `engines`, and `.nvmrc`, then confirm a clean
build. This is the only item in this entire document with an external deadline
attached — everything else waits, this doesn't.

Google Maps Platform ToS changes 28 Sep. Noted, no action identified yet.

## 🧨 THE SYSTEMIC PATTERN — FUNCTIONS RETURN 200 ON FAILURE

Three separate failures, one shared cause. This is the most important finding in
the whole set:

| Function | What fails | What it returns |
|---|---|---|
| `generate-inspection-pdf` | `pdf_versions` insert rejected by constraint | **200** |
| Email send path | Resend returns an error | **200**, logs `status='sent'`, posts "sent" to Slack |
| `calculate-travel-time` | Google Maps `REQUEST_DENIED` | **200** |

**Every one of these was invisible until an automated health check went looking.**
The fix in each case is the same shape: a failed write or a failed upstream call
must throw, return non-200, and reach Sentry. Fixing the three individually and not
auditing every other EF for the same pattern misses the point.

## P0-A — `pdf_versions` insert silently rejected · DATA LOSS ONGOING

`generate-inspection-pdf` inserts `generation_type='legacy_ef'`. The constraint
`pdf_versions_generation_type_check` only permits `'legacy_ef_render'`. The insert
fails, the function returns 200, nothing surfaces it.

**Evidence:** 10 rows lost by 27 Aug · 2 more on 2 Sep (inspection `2fd7b2a6`) ·
inspection `09651492` has v2 and v3 in Storage but only v1 in `pdf_versions`.
**Recurs on every EF-path regeneration.**

**Do:** pick the canonical value — check every reader *and* writer of
`generation_type` before choosing — and align them. Make a failed insert fail
loudly. Reconcile Storage objects against `pdf_versions` rows for affected
inspections and backfill where the file exists.

Five-minute fix. Losing data every day it isn't done.

## P0-B — Email logged as "sent" without checking Resend · CUSTOMER-FACING

The send path writes `email_logs.status='sent'` and posts "sent" to Slack regardless
of what Resend actually returned.

**Three confirmed cases:**

| When | What | Reality |
|---|---|---|
| 26 Aug 10:41 | Booking confirmation for a 29 Aug inspection | Resend returned **SUPPRESSED**. Slack said sent. |
| 28 Aug | INS-2026-0009 → [email redacted] | **Bounced.** `email_logs` says sent. |
| 1 Sep 19:49 | INS-2026-0020 → [email redacted] | **Failed at Resend.** Slack posted "Inspection report sent". Same address received INS-2026-0019 fine — transient. |

**Do:**
1. Treat a Resend API error as **failed**, not sent
2. Check the Resend suppression list **before** sending; surface "recipient
   suppressed" as its own state
3. Wire Resend webhooks — `email.bounced`, `email.failed`, `email.suppressed`,
   `email.complained`, `email.delivery_delayed` — to update `email_logs`
4. Failures go to Slack **and** an in-app flag, never silence
5. Retry transient failures

**Then:** list every `email_logs` row marked sent since 26 Aug whose Resend status
isn't delivered. **Michael decides resends — do not send anything to a customer
without his confirmation.** INS-2026-0009 and INS-2026-0020 need manual resends
unless already done.

## P0-C — Scheduled functions double-firing · CUSTOMER-FACING

`send-inspection-reminder`: **26 invocations for 13 hourly slots**, in every check
since 26 Aug. `check-overdue-invoices`: ran twice at 09:00 on 1 Sep and 3 Sep.

**Confirmed customer impact:** a reminder went out 30 Aug 23:55 saying *"coming up
in 2 days"* for an inspection dated **26 Aug** — four days in the past. So the
selection window picks up past inspections as well as firing twice.

Whether customers received two copies per slot is unconfirmed — check `email_logs`
and Resend.

**Do:** find the second trigger (duplicate `pg_cron` entry? cron plus an external
scheduler? two deployments registering the same schedule?) and remove it. Make
reminders **idempotent** — record sent reminder per inspection + type, skip if it
exists. Fix the date window. Same guard on `check-overdue-invoices`.

⚠️ **Overlaps P0-8** (archived leads sending reminders). Investigate together —
likely the same selection query.

## P0-D — `login_activity` has written nothing since FEBRUARY

Three failed logins from `37.114.50.142` on 31 Aug 15:50 went **completely
unrecorded**.

The security audit trail shipped in Phase 1 and has been dead for six months. Find
what stopped it — RLS policy, dropped trigger, function signature change — and
restore it. Then work out what else silently stopped at the same time.

## P0-E — Google Maps API key · VERIFY FIRST, MAY BE FIXED

26–27 Aug: 47–50× `REQUEST_DENIED: The provided API key is expired` from
`calculate-travel-time`. Function returned 200 anyway. **6 of 7 leads that day had
no lat/lng** → zone assignment and travel-time routing silently broken.

Not mentioned in any check since 27 Aug. Either it was rotated, or the check stopped
looking. **Confirm which.**

**Do:** verify the key works. Count leads with null lat/lng since ~22 Aug and
backfill geocoding. Make `REQUEST_DENIED` a logged error, not a 200.

## P1-S — Sentry and observability blind spots

- **Prod `ignoreErrors` rule for "Failed to fetch" is swallowing real failures.**
  31 Aug: a genuine session failure (TypeError + Supabase auth 500) never reached
  Issues. 2 Sep: prod errors landed in Sentry logs but not Issues. **Narrow the
  rule.**
- **Sentry dev project has had zero events since 26 Aug.** Check DSN and env wiring.
- **Replays at 80% of the free quota.** Period ends 17 Sep, pay-as-you-go is off, so
  replays simply stop at 100%. Lower the sample rate if coverage matters.

## P1-T — Open Sentry issues, triage each

| Issue | What | Note |
|---|---|---|
| **MRC-APP-1D** | "Photo upload failed" · `/technician/inspection` · prod · iPhone Safari · first 2 Sep 13:25 | Adjacent to the #111/#112 photo work — may be a regression from it |
| **MRC-APP-1B** | "Failed to upload lead note attachment" · `/leads` · prod · first 27 Aug 17:12 | Suspect commit `20eac74` |
| **MRC-APP-1A** | "Hard-save endpoint unreachable: POST /api/render-pdf" · `/admin/leads` | |
| **MRC-APP-14 / -17** | MIME-type errors · `/admin/schedule` and a technician job page | |
| **MRC-APP-18** | "Inspection form save failed" · 25 Aug | |
| **MRC-APP-19** | ServiceWorker registration AbortError | |
| MRC-APP-1C | Validation block on an incomplete inspection | **Not a fault. Ignore.** |

## P2-X — Smaller items

- **Duplicate lead submission** 27 Aug 09:21 — same submitter twice → MRC-2026-0093
  and 0094, customer received two confirmations. Add idempotency to the lead form:
  submit token, dedupe window, disable double-click.
- **`fan_out_notification` RPC returning PGRST202** (26 Aug). One in-app
  notification row lost 31 Aug 02:23 while Slack and email went out. Confirm the RPC
  exists and its signature matches the caller.
- **`manage-users` 503s** — twice on 1 Sep.
- **2 job completions stuck in draft** since 24 Aug.

## 🔗 THE CONNECTION WORTH NOTICING

**~80 leads sitting uncontacted in `new_lead`, oldest ~4 weeks, growing.**

The handoff calls this an ops problem. **It may not be.** P0-2 is that the lead list
caps at 50 and the count is computed from loaded rows. If the team physically cannot
see leads 51 through 80 in the list, they aren't ignoring them — the app is hiding
them.

**Check this before treating it as an ops failure.** If it's P0-2, fixing the
pagination surfaces four weeks of unworked leads at once, and someone needs to be
ready for that.


---

# 🧠 THE BUG LEDGER — SELF-IMPROVING BUILD

**Why this exists.** The subfloor toggle bug (Session D, 40 minutes of tracing) was
the *same class* as an equipment toggle bug fixed months earlier. The comment above
`getEffectiveDryingQty` described it verbatim:

> *"the toggle only hid the UI while the quantities kept feeding pricing and kept
> being saved, so a tech who turned it off still billed the customer for equipment
> they could no longer see."*

Nobody knew that comment existed. The same bug was re-diagnosed from scratch.

**From now on, every fix writes back what it learned.** Not a changelog — a
*pattern library*. The goal is that the next occurrence of a known class is found
by reading one file, not by tracing 50 call sites.

### `docs/BUG_LEDGER.md` — the format

Every entry, no exceptions:

```
## BUG-<n> — <one-line symptom in the user's words>

**Class:** <pattern name, links to the CLASSES section>
**Found:** <date> by <who> · **Fixed:** <date>, <commit>
**Severity:** P0 / P1 / P2

**Symptom**
What the user saw. Their words, not yours.

**Root cause**
The actual mechanism. One paragraph. No hedging.

**Why it was hard to find**
The misleading signal — what looked like the cause but wasn't. This field
is the most valuable one in the entry. Skip it and the ledger is a changelog.

**Files touched**
path:line — what changed there

**Fix pattern**
The reusable shape of the solution, stated so it applies to the next
instance, not just this one.

**Verification**
Exactly how it was proven fixed. Mutation test? Studio query? 375px pass?

**Related**
BUG-<n>, BUG-<n> — other instances of the same class
```

### The CLASSES section — the part that compounds

At the top of `BUG_LEDGER.md`, above the individual entries:

```
# BUG CLASSES — CHECK THESE FIRST

## CLASS: Toggle hides UI but data keeps feeding
A boolean toggle controls VISIBILITY ONLY. The underlying field keeps its
value and continues flowing into pricing, saves and PDFs.
Instances: BUG-1 (equipment), BUG-2 (subfloor)
Check: for every toggle, does the OFF state zero the value at every read
site, or only unmount the section?
Predicate convention: zero on === false, never !== true — legacy null rows
must keep rendering.

## CLASS: Runtime asset vs repo asset
The artefact read at runtime is not the one in git.
Instances: BUG-3 (PDF template in Storage)
Check: before editing any template, confirm where it is READ from.

## CLASS: Count derived from loaded state
A total is computed from what is in client memory, so it can only ever
equal what is on screen.
Instances: BUG-4 (lead list "50 of 50")
Check: any "X of Y" — is Y a server count or a array.length?

## CLASS: Status index thresholds gate data
Hardcoded position in an ordered status array controls rendering and
nulling. A backwards transition crosses a threshold.
Instances: BUG-5 (lead detail hiding sections)
Check: any logic keyed on indexOf(status) rather than the status itself.

## CLASS: Function returns 200 on failure
A write is rejected, or an upstream call errors, and the function returns
success anyway. The caller has no way to know. Invisible until something
external goes looking.
Instances: BUG-12 (pdf_versions constraint), BUG-13 (email marked sent
when Resend errored), BUG-14 (Maps REQUEST_DENIED)
Check: EVERY Edge Function. For each DB write and each upstream call, is
the failure path a throw, a non-200 and a Sentry event? If not, it is an
instance of this class waiting to be found.
This class has already cost: 12+ lost pdf_versions rows, at least 3
customers who never received an email the system claims was sent, and a
day of leads with no geocoding.

## CLASS: Scheduled function fires twice
Two registrations for one schedule. Duplicate pg_cron entry, cron plus an
external scheduler, or two deployments each registering it.
Instances: BUG-15 (send-inspection-reminder, 26 runs for 13 slots)
Check: count invocations against expected slots. Then make the work
idempotent regardless — record what was sent, skip if it exists. Removing
the second trigger without idempotency just hides it until next time.

## CLASS: Audit trail stops silently
A logging table stops receiving rows and nothing notices, because the
absence of a row is not an error.
Instances: BUG-16 (login_activity, dead since February — six months)
Check: for every audit or log table, when was the last row written?
Any gap longer than the expected write interval is a dead trail.

## CLASS: position:fixed silently becomes position:absolute
An ancestor with transform, filter, backdrop-filter, perspective,
will-change or contain creates a new containing block. Every
position: fixed descendant then resolves against THAT element, not the
viewport. The element still "works" — it just anchors to the wrong thing,
so it drifts on scroll instead of staying pinned.
Instances: BUG-11 (mobile nav floating mid-screen)
Check: walk the ancestor chain in DevTools for any of those six
properties. The fix is removing or scoping the ancestor property, never
changing the fixed element itself.

## CLASS: Verification by proxy
A deploy was believed successful because a version number changed or a CLI
printed success.
Rule: verify by CONTENT. Download and diff. Always.
```

### Seed entries — write these first

The ledger starts with what's already known, so it's useful on day one:

| ID | Symptom | Class |
|---|---|---|
| BUG-1 | Equipment toggle off, customer still billed for equipment | Toggle hides UI |
| BUG-2 | Subfloor toggle off, hours still in the quote | Toggle hides UI |
| BUG-3 | PDF template edited in repo, output unchanged | Runtime vs repo asset |
| BUG-4 | Lead list says "50 of 50", team thinks leads vanish | Count from loaded state |
| BUG-5 | Customer A's lead shows 9 sections, Customer B's shows everything | Status index thresholds → two render paths |
| BUG-6 | Option 2 = Option 1 + demolition, stacked | Additive where exclusive intended |
| BUG-7 | "Report was NOT saved" — it had saved | Error surfaced from response size, not outcome |
| BUG-8 | `npm run typecheck` passes, code doesn't compile | Empty `files: []` in root tsconfig |
| BUG-9 | `db query --linked` executed DDL, believed read-only | Tool trusted by name, not behaviour |
| BUG-10 | Supabase MCP wrote to PROD during a test | No project ref pinned, defaults to PROD |
| BUG-11 | Mobile nav bar floats mid-screen instead of pinning to the bottom | `position: fixed` broken by transformed ancestor |
| BUG-12 | PDF versions missing from the table but present in Storage | Function returns 200 on failure |
| BUG-13 | Slack says "report sent", customer never received it | Function returns 200 on failure |
| BUG-14 | Leads with no lat/lng, travel time silently wrong | Function returns 200 on failure |
| BUG-15 | Reminder emails fire twice, and for inspections already past | Scheduled function fires twice |
| BUG-16 | Failed logins not recorded since February | Audit trail stops silently |

### The rule that makes it work

**No branch merges until its ledger entry is written.** One paragraph is enough.
The entry goes in the same commit as the fix, so it can never drift from the code.

Before starting ANY investigation, read `BUG_LEDGER.md` classes first. If the
symptom matches a known class, the trace is already half done.


---

# 📎 CLAUDE CODE BRIEF — SESSION F: WORKTREE CLEANUP & GUARD HOOK FLIP

Run this after Session E. It clears the three blocked worktrees and moves the
Supabase guard hook into the repo. Ordering is load-bearing — step 4 before step 3
completes is incident 4 repeating.

```
[SESSION F — WORKTREE CLEANUP & GUARD HOOK FLIP]

ultrathink

/plan
PROJECT: ~/mrc-app-1
MODEL: latest Opus available (/model)

Picking up from last night (3 Sept). Read docs/POST_INCIDENT_FRAMEWORK.md first —
that's the register from last night's work and it has the full context.

WHERE THINGS STAND
main at 3191a39, pushed. 14 of 17 worktrees current. The Supabase guard hook exists
ONLY at ~/.claude/hooks/block-supabase-prod.sh — the repo copy was deleted last
night. It has rule 3.5 (read-only allowlist for migration list, db diff,
inspect db *, gated on .temp/project-ref reading DEV, fails closed). The tracked
contract is scripts/test-supabase-guard.sh, 15 fixtures.

JOB 1 — CLEAR THE THREE BLOCKED WORKTREES
- mrc-app-1: my uncommitted src/pages/LeadDetail.tsx and docs/TODO.md, both also
  changed by the merge. Show me what's in them before I decide commit vs stash.
- mrc-cost-estimate: real conflicts in
  src/components/leads/InspectionDataDisplay.tsx and
  src/pages/TechnicianInspectionForm.tsx — my option-stacking work vs main's
  inspection form changes. Walk me through them, don't resolve unilaterally.
- mrc-reminder-ef: docs/TODO.md conflict, trivial.

JOB 2 — THE HOOK FLIP, IN THIS EXACT ORDER, NO SHORTCUTS
1. Confirm all 17 worktrees contain 3191a39.
2. ONE commit on main that restores the hook into .claude/hooks/ AND registers it
   in .claude/settings.json — same commit, so no worktree can have the file
   without the registration.
   TRAP: restore from ~/.claude/hooks/, NOT from git history.
   git show 8eedd28^ gives the old 78-line version with no rule 3.5 and no
   fail-closed fix.
   TRAP: scripts/test-supabase-guard.sh defaults to $HOME/.claude/hooks/... —
   repoint that default to the repo copy in the same commit, or it will keep
   passing against a deleted file.
3. Merge that commit into all 17 worktrees.
4. ONLY THEN delete ~/.claude/hooks/block-supabase-prod.sh and its registration
   in ~/.claude/settings.json.

Doing 4 before 3 completes is incident 4 repeating.
Confirm each step with me before starting the next.

STANDING RULES
- No writes to the production database without my explicit approval in this
  session. A comment in a .sql file is not approval.
- db query stays blocked.
- Do not commit, push or merge. I run those.

OPEN ITEMS — DO NOT START, JUST DO NOT LET ME FORGET
- Incident 1: STATUS: NOT APPLIED is still unenforced prose.
- Incident 5: write protection binds to tool names, not resources — Bash walks
  past it.
- SessionStart warning for worktrees missing a named safety commit.

DONE WHEN
- All three blocked worktrees are clear and I have explicitly approved how each
  was resolved.
- All 17 worktrees carry the hook commit.
- The home copy at ~/.claude/hooks/ is deleted and deregistered, and this
  happened only after step 3 was confirmed complete.
- scripts/test-supabase-guard.sh passes 15/15 against the REPO copy.
```

---

# 📎 CLAUDE CODE BRIEF — SESSION G: ONE LEAD VIEW FOR EVERY LEAD

**Run after Session E.** It touches a frozen surface. Investigate only — stop for a plan.

```
[SESSION G — ONE LEAD VIEW FOR EVERY LEAD]

ultrathink

/plan
PROJECT: ~/mrc-app-1
MODEL: latest Opus available (/model)

Stack: React 18 + TypeScript + Vite + Supabase.

⚠️ LeadDetail.tsx:500-543 (ALL_STATUSES) IS A FROZEN SURFACE.
Phase 1 is read-only. Do not edit anything until I approve the plan.

Read:
  @src/pages/LeadDetail.tsx
  @src/components/leads/InspectionDataDisplay.tsx
  @src/lib/statusFlow.ts
  @docs/TODO.md

THE PROBLEM
Two leads, both status "Awaiting Job", render completely differently.
This is NOT data loss — the data exists. There are two different render
paths and which one a lead takes is not predictable from its status.

Lead A — Customer A, MRC-2026-0124
  id 8f28255f-8ff9-46f7-a623-55489ef34215
  Completed inspection INS-2026-0027, report sent 02/09 9:57 PM.
  Renders ONLY: contact, property, issue, lead details, inspection
  scheduled, customer requests, internal notes, notes, activity log.
  MISSING: Cost Estimate, Subfloor Status, Waste Disposal, Recommended
  Dehumidifier Size, Parking, Additional Info for Technician, Cause of
  Mould, Property Occupation, Cost Breakdown (Admin), the entire
  Inspection Data accordion, AI Summary, Inspection Report History,
  PDF Versions, Email History.

Lead B — Customer B (Repeat Customer, Epping)
  Same "Awaiting Job" status. Renders ALL of the above.

THE REQUIREMENT
One lead view. Every lead. Every section it has data for, always.
No conditional layouts. No status-dependent rendering. A section is
omitted only because it has no data — never because of lead status.

SUSPECTED MECHANISM
Customer A's activity log shows a status round-trip within one minute:
  v5  — → Awaiting Job                    02/09 9:57 PM
  v6  Awaiting Job → Awaiting Inspection  03/09 11:14 AM
  v7  Awaiting Inspection → Awaiting Job  03/09 11:14 AM

LeadDetail.tsx:500-543 holds ALL_STATUSES with hardcoded index
thresholds. A backwards transition crosses one. That is the most likely
reason her lead ended up on a different render path.

PHASE 1 — INVESTIGATE ONLY. NO CODE CHANGES. REPORT BACK AND STOP.

1. Map EVERY condition in LeadDetail.tsx that decides whether a section
   renders. For each one give me: the section, the exact condition, the
   line number, and in plain English what makes it true or false.
   I want the complete list — this is the deliverable.

2. Identify which of those conditions Customer A fails and Customer B passes.
   Name the specific condition.

3. Using the Supabase MCP with project_id EXPLICITLY set to PROD
   (ecyivrxjpsmjmexqatym), READ ONLY — no writes of any kind — confirm
   the JOIN, not the data:
     - Is Customer A's inspection row linked to her lead? What is the foreign
       key value on each side?
     - Are the cost estimate and AI summary columns populated?
     - Do PDF version and email history rows exist and point at her lead?
   Run the same reads against Customer B's lead and diff the shape.

   Purpose: if the link is broken, un-gating the render produces empty
   sections and the real bug is the relationship, not the layout. I need
   to know which before you propose anything.

4. Count how many other leads are on the cut-down render path. Read-only.
   Report the number and the lead IDs.

5. Propose — do not implement — how to collapse the two render paths into
   one. Tell me:
     - which conditions can be deleted outright
     - which need replacing with a has-data check instead of a status
       check
     - whether ALL_STATUSES indexing can be removed entirely from the
       render logic, or whether something else depends on it
     - what the risk is to the financial-data nulling behaviour those
       thresholds currently gate, and how to preserve it if it is
       load-bearing

STOP AT THE END OF PHASE 1. Report and wait for my decision.

CONSTRAINTS
- NO writes to the production database. Reads only. A comment in a .sql
  file is not approval.
- Do NOT edit LeadDetail.tsx, statusFlow.ts, pricing.ts or /src/auth/**
  in this phase.
- Supabase MCP calls MUST pass project_id explicitly. It defaults to PROD
  and has already caused an unintended write.
- Do not commit, push or merge. Michael runs those.
- Branch (for phase 2 only, once approved): fix/one-lead-view

DONE WHEN
- Every render condition in LeadDetail.tsx is documented in plain English
  with its line number
- The specific condition Customer A fails is named
- The join is confirmed intact or broken, with the actual key values
- The count of other leads on the cut-down path is reported
- A collapse plan is proposed, including what happens to the financial
  nulling behaviour
- Zero files modified
```

⚠️ **Run this in a fresh worktree off `main`.** `InspectionDataDisplay.tsx` is one of
the two files with unresolved conflicts in `mrc-cost-estimate` — do not use that one.

---

# 🔁 SESSION ORDER — REVISED

| Order | Session | Purpose | Blocked by |
|---|---|---|---|
| **0** | **N** | **Node 22 bump.** Hard deadline 1 Oct — builds fail after. Small, isolated, do it whenever. | — |
| **1** | **E** | **One session, four parts.** Codex loop setup → write the docs → ask questions → hand back a plan. No fixes. | — **run this first, alone** |
| 2 | **G** | Lead view — map every render condition, find why two paths exist | E approved |
| 3 | **G2** | Collapse to one lead view | G plan + Michael's approval |
| 4 | **H** | Lead list — kill Load more, real pagination + true count | E · runs parallel to G, no shared files |
| 5 | **F** | Worktree cleanup + guard hook flip | E |
| 6 | **J** | Health-check P0s — 200-on-failure audit across every EF, then A/B/C/D/E | E |
| 7 | **I** | Pricing engine rebuild — plan only, no code | Clayton's demolition table |

**Session E comes first, always.** Nothing gets built until it's saved, questioned
and answered. The moment a fix session starts, its own context becomes the source of
truth and the backlog stops being read.

---

# 📎 CLAUDE CODE BRIEF — SESSION H: LEAD LIST PAGINATION & TRUE COUNT

```
[SESSION H — LEAD LIST PAGINATION & TRUE COUNT]

ultrathink

/plan
PROJECT: ~/mrc-app-1
MODEL: latest Opus available (/model)

Stack: React 18 + TypeScript + Vite + Supabase + TanStack Query.

Read:
  @src/pages/Leads.tsx
  @src/lib/api/leads.ts
  @docs/TODO.md

THE PROBLEM
The Lead Management header count is computed from the number of rows
currently loaded into client state, not from a real total. So it loads 50
and reports "50 of 50". Click "Load more" and it fetches more, and the
count grows to match. The number has never been a total.

This affects EVERY tab — All, New Lead, Awaiting Inspection, Job
Scheduled, and the rest. Every tab count is wrong the same way.

Operational impact: the team believes leads stop being created after an
inspection completes. They are not. They are simply never loaded, and the
count confirms the false belief. Leads ARE findable via search, which
proves the records exist.

TASK
1. Find where the header count is derived. Confirm it reads from loaded
   client state rather than a server count.

2. Replace the "Load more" pattern with real pagination:
   - 50 leads per page
   - Page controls: first / previous / next / last, plus the current page
     and total page count
   - Remove the "Load more" button entirely
   - Page state survives a tab switch sensibly (reset to page 1 on tab
     change — do not carry page 7 into a tab with 2 pages)

3. Replace the header count with a TRUE total from Supabase:
   - Use { count: 'exact', head: true } so no rows are transferred
   - The count must respect the active tab filter and the active search
     term
   - Display as "Showing 1-50 of 213" — not "50 of 50"

4. Same treatment for every tab. Do not fix All and leave the rest.

5. Mobile: pagination controls must work at 375px with 48px touch
   targets. Field techs use this with gloves on.

VERIFY
- Total shown for "All" matches SELECT count(*) against the same filter
  in Studio (read-only, project_id explicit)
- Every tab count matches its own filtered count
- Page 1 → last page walks through every lead with no duplicates and no
  gaps
- Search + pagination compose correctly: searching narrows the total, and
  the pages reflect the narrowed set

CONSTRAINTS
- Do NOT modify src/pages/LeadDetail.tsx — Session G owns that file
- Do NOT modify src/lib/statusFlow.ts, pricing.ts or /src/auth/**
- Supabase MCP calls MUST pass project_id explicitly. Read-only.
- No writes to the production database.
- Branch: fix/lead-list-pagination
- No git add -A. Explicit paths only. No AI attribution.
- Do not commit, push or merge. Michael runs those.

DONE WHEN
- "Load more" is gone from the codebase
- Header shows a true server-side total on every tab
- 50-per-page pagination works on every tab, at 375px
- Total matches a Studio count query for at least 3 different tabs
- npx tsc -p tsconfig.app.json --noEmit unchanged from this worktree's
  baseline
- No existing Vitest tests broken
```

⚠️ **Run this in its own worktree.** Session G owns `LeadDetail.tsx`; this session
owns `Leads.tsx`. No overlap, so they can run in parallel.

---

# 📎 SESSION HANDOFF PROMPT — PASTE AT THE START OF EVERY NEW SESSION

Keeps every worktree, every model and every session reading from the same page.

```
[SESSION <LETTER> — <NAME>]

ultrathink

PROJECT: ~/mrc-app-1
MODEL: latest Opus available (/model)
WORKTREE: <path>   BRANCH: <branch>

Read before anything else:
  @docs/TODO.md
  @docs/PRICING_CANON.md
  @docs/POST_INCIDENT_FRAMEWORK.md

CONTEXT YOU INHERIT
- main is at <commit>. 17 worktrees. Confirm this one contains it before
  starting.
- Frozen surfaces — do not edit without an explicit flag in this session:
    src/lib/calculations/pricing.ts
    src/lib/statusFlow.ts
    src/pages/LeadDetail.tsx (ALL_STATUSES, lines 500-543)
    /src/auth/**
    supabase/migrations/**
    supabase/functions/**
- Supabase MCP defaults to PROD. EVERY call must pass project_id
  explicitly. PROD ecyivrxjpsmjmexqatym / DEV ctppzqnysmzynkxjlzta.
- No writes to the production database without Michael's explicit
  approval in this session. A comment in a .sql file is not approval.
- supabase db push is permanently prohibited. Migrations are
  Studio-by-hand only.
- npm run typecheck is a no-op. Use
  npx tsc -p tsconfig.app.json --noEmit and re-measure the baseline in
  THIS worktree — it varies (99 vs 122 seen).
- Never git add -A. Explicit paths only. No AI attribution in commits.
- Michael is deployment captain. You never commit, push, merge or deploy.

OUTPUT RULES
- Tag line one of every response: [SESSION <LETTER> — <NAME>]
- Anything Michael needs to run goes in its own clean copy-paste block.
- Verify by content, never by version number or a CLI success message.
- Report what you did NOT do as clearly as what you did.

TASK
<paste the specific brief here>
```

---

# 📎 MULTI-WORKTREE / CLAUDE + CODEX WORKFLOW

**The model.** One worktree per session. One branch per worktree. Sessions never
share a working directory — that's what stopped Session C and Session D from
colliding on `TechnicianInspectionForm.tsx`.

**Before opening any session**

```
cd <worktree>
git log --oneline -1          # does this worktree carry current main?
git status                    # clean tree, or known WIP?
npx tsc -p tsconfig.app.json --noEmit 2>&1 | tail -1   # baseline for THIS worktree
```

**Assigning work across sessions**

| Rule | Why |
|---|---|
| One frozen surface per session, maximum | Two sessions in `pricing.ts` is an unresolvable merge |
| Investigation sessions are read-only and stop for a verdict | Prevents fixing a symptom and burying the cause — see Session G |
| Never give two sessions the same file | Session C ↔ main conflict in `InspectionDataDisplay.tsx` is what happens |
| Every session tags its output `[SESSION X — NAME]` | Traceability when four are open |
| Michael merges, always `--no-ff` | Keeps every branch's commits recoverable |

**Claude + Codex split — CORRECTED 4 Sep**

⚠️ Codex **reviews. It never edits.** Do not give it implementation work of any
kind. See the Codex Review Loop section below for the full ruling.

| Claude Code | Codex |
|---|---|
| Writes all code | Reviews diffs that Claude Code produced |
| Has MCP, tools, skills, sub-agents, and the whole conversation | Has **none of those, deliberately** |
| Knows the history and the live DB | Has seen neither — that's the entire point |
| Output is a branch | Output is a list of **claims to triage**, not patches |

Codex's value is that it hasn't been in the room. Give it context and you destroy
the thing you're paying for.

**Closing a session**

1. Session reports what changed and what it deliberately did not touch
2. Michael reviews the diff
3. Michael pushes the branch → Vercel builds a preview
4. Michael verifies on the **pinned commit-hash URL**, fresh Incognito, full SW
   reset, 375px
5. Michael merges `--no-ff`
6. Branch deleted local and remote
7. **`docs/BUG_LEDGER.md` entry written** — in the same commit as the fix, never after
8. **`docs/TODO.md` updated with the item ID marked done** — this is the step that
   gets skipped and it's why things get relogged

**Merge order when several branches are open**

Smallest blast radius first. A branch touching one file merges before a branch
touching six. Whoever merges last resolves the conflicts — so the biggest branch
should be the one still moving, not the one everyone else has to rebase around.

---

# 🗄️ THE KNOWLEDGE LAYER — OKF

**The intent:** every agent — Claude Code, Codex, Cloud, chat — leaves behind
something durable. Next session starts further along than the last. The same
mistake never costs 40 minutes twice.

## OKF gets a new sub-area

`~/okf/concepts/` stays exactly as it is — strict, sourced, Gate 2, Codex-reviewed.
Don't touch it.

**Add `~/okf/projects/` alongside it.** Loose. No gate. Any agent writes to it
freely.

```
~/okf/
├── concepts/          ← strict, gated. Unchanged.
├── _pending/          ← concept drafts awaiting Gate 2. Unchanged.
└── projects/          ← NEW. Loose. No gate.
    └── mrc/
        ├── sessions.md     append one entry per session
        ├── bugs.md         every bug, cause, fix, and why it was hard to find
        └── decisions.md    what was decided and why, so it isn't relitigated
```

**Why a sub-area rather than the strict path:** the value is in writing things down
at all. A gate that makes agents skip the step defeats the purpose. `concepts/`
stays rigorous because it's meant to be durable and citable. `projects/` just needs
to be *there*.

## What agents write

At the end of every session, append to `~/okf/projects/mrc/sessions.md`:

```
## <date> — [SESSION <letter> — <name>]
Agent:    Claude Code / Codex / chat
Branch:   <branch>          Commit: <sha or none>

Did:      what actually landed
Did NOT:  what was deliberately left, and why
Broke:    anything that got worse, or nothing
Open:     what the next session inherits
```

Ten lines. Not a transcript.

**"Did NOT" is the field that matters.** It's what stops the next session
re-investigating something already ruled out.

Bugs go to `bugs.md` in the same shape as the repo's `BUG_LEDGER.md` — symptom, root
cause, **why it was hard to find**, fix pattern. Duplicating it in OKF is fine and
deliberate: the repo copy dies with the repo, the OKF copy survives.

## Promotion is optional, not required

If a pattern proves itself across several projects, draft it into `_pending/` and run
it through Gate 2 like any other concept. That's a bonus, not an obligation.

Nothing in `projects/` needs to earn its place. It just needs to exist.

## Already worth writing down

From MRC alone:

- **Toggle hides the UI while the value keeps feeding downstream** — equipment, then
  subfloor. Second one cost 40 minutes because the first wasn't recorded.
- **Verification by proxy** — EF deploy reported success while serving old code;
  Storage silently refused an overwrite; `npm run typecheck` checks nothing.
- **A tool trusted by its name, not its behaviour** — `db query --linked` executed
  DDL; the Supabase MCP defaults to PROD.
- **Runtime asset is not the repo asset** — the PDF template is read from Storage.
- **`position: fixed` breaks when an ancestor has `transform`** — the floating nav.

## One question for you

**Is `~/okf/projects/mrc/` the right shape**, or do you want it somewhere else in
OKF? Everything else here is loose enough not to need a ruling.


---

# 🔍 THE CODEX REVIEW LOOP

**Model: Claude Code writes. Codex reviews. Michael triages.**

Procedure lives at `~/dev/policies/codex-workflow-setup.md` (902 lines). That file
is the procedure — follow it, don't improvise, don't retype its blocks from memory.

## Fixed rulings — do not relitigate

| Ruling | Why |
|---|---|
| **Codex reviews, never edits** | Findings are *claims to triage*, not patches. `/codex:rescue` is never used. |
| **Review gate OFF in every repo** | Per-workspace-root setting, so it must be disabled per repo. |
| **`AGENTS.md` is a reviewer brief, not a `CLAUDE.md` mirror** | It carries only repo facts a reviewer with no history could get wrong. Nothing else. |
| **Codex gets NO tools, MCP, skills or sub-agents** | No `.codex/agents/`, no `.agents/skills/`, no Supabase/Slack/Resend MCP. Review commands are read-only. **Codex's value is that it hasn't seen the conversation or the live DB.** Giving it context destroys the thing you're paying for. |
| **Diffs ≤ ~150 lines** | Beyond that, review quality collapses. |
| **Foreground inside worktrees. Background only from the main checkout.** | Avoids plugin issue #367. |
| **Three logged runs before anything becomes knowledge** | No conclusions from a single review. |
| **Nothing writes to `~/okf` from this machine** | |

## Known plugin issues to design around

| Issue | Effect | Mitigation |
|---|---|---|
| **#697** | The codex broker **disables git hooks in worktrees** — and foreground-in-worktree is the normal path | Audit hooks before installing. If the repo depends on a pre-commit hook, know it won't fire. |
| **#705** | You cannot verify which model actually ran | Set `model`, `model_reasoning_effort` **and** `review_model` to the same value in `~/.codex/config.toml`. Which one the plugin honours is unsettled. |
| **#653** | A bad `--base` **exits 0** and silently reviews a wider diff | **Read the `Target:` line in the output before triaging.** Every time. |
| **#367** | Worktree plumbing | Smoke test from the main checkout, never a worktree. |

## Repo facts that belong in MRC's `AGENTS.md`

A reviewer with no history will get these wrong and file false findings:

| Fact | In the §5 block? |
|---|---|
| Migrations go **PROD-first via management API**, then DEV manually hours later. **PROD ahead of DEV is normal, not an incident.** | ✅ present |
| **Migration policy lives in `.sql` file headers.** Read them before commenting on ordering. | ✅ present |
| Files marked `NOT APPLIED` in their header are not applied. | ✅ present |
| **Supabase backend — not Rails, not Neon.** | ❌ **MISSING — must be added** |

⚠️ I read §5. The block covers three of the four. **The Supabase-not-Rails/Neon line
is not in it.** Add it when pasting.

## Setup order

```
1. Install plugin (§1)
2. /codex:setup --disable-review-gate
3. Set model, model_reasoning_effort AND review_model to the same value
   in ~/.codex/config.toml
4. Paste the §4-5 blocks (adding the Supabase fact). NOT §6 — OKF.
5. Create docs/codex-review-log.md from the §8 template
6. One foreground /codex:adversarial-review --base main on a small diff
7. READ THE Target: LINE before triaging
8. Log the run
```

---

---
# 📎 SESSION E — THE SETUP SESSION. FOUR PARTS. NO FIXES.

**This is the only session you run right now.** It stands up the Codex review loop,
writes every document, asks you everything, and hands back a plan. **It fixes
nothing.** The multi-worktree parallel work starts in *fresh* sessions afterwards,
once everything is saved and every ambiguity is resolved.

Run `/compact` between Part A and Part B — the two halves read a lot.

**Why this order:** the moment a fix session starts, the backlog stops being the
source of truth and the session's own context becomes it. Save first, clarify
second, build third — in separate sessions, every time.

```
[SESSION E — SETUP. CODEX LOOP, DOCS, QUESTIONS, PLAN. NO FIXES.]

ultrathink

/plan
PROJECT: ~/mrc-app-1
MODEL: latest Opus available (/model)
MACHINE: Mac.

SETUP AND QUESTIONS ONLY.
Do not fix anything. Do not touch application code. Do not start any
backlog item. If you find yourself about to edit a .tsx or .ts file
outside docs/, stop — that is a later session's job.

This session has FOUR PARTS. Do them in order. Stop where told.

═══════════════════════════════════════════════════════════
PART A — CODEX REVIEW LOOP
═══════════════════════════════════════════════════════════

THE PROCEDURE
  ~/dev/policies/codex-workflow-setup.md   — 902 lines, already on this
  machine.

Read: §1 (install) · §4-5 (the CLAUDE.md and AGENTS.md blocks for MRC,
placeholders already filled) · §8-9 (log template, setup steps, failure
modes).

⚠️ §6 IS NOT MRC. It is the OKF knowledge-profile blocks for a different
repo at ~/okf, with its own CLAUDE.md, its own AGENTS.md and a log at
~/dev/logs/codex-review-log-okf.md. Nothing writes to ~/okf from this
machine. Read §6 only to confirm you are skipping it. Do not paste any
part of it into this repo.

That file IS the procedure. Follow it. Do not improvise. Do not retype
the blocks from memory — paste them from the file.

FIXED RULINGS — DO NOT RELITIGATE
- Codex reviews, never edits. Findings are claims to triage, not patches.
  /codex:rescue is never used.
- Review gate OFF in every repo.
- AGENTS.md is a reviewer brief, not a CLAUDE.md mirror. Repo facts a
  reviewer with no history could get wrong, and nothing else.
- Codex gets NO tools, MCP servers, skills, or sub-agents. No
  .codex/agents/, no .agents/skills/, no Supabase/Slack/Resend MCP.
  Review commands are read-only and Codex's value is that it hasn't seen
  the conversation or the live DB.
- Diffs <= ~150 lines. Foreground inside worktrees, background only from
  the main checkout.

BEFORE YOU INSTALL OR WRITE ANYTHING, REPORT:

1. Pre-commit hooks in this repo?
   Check: core.hooksPath · .husky/ · .pre-commit-config.yaml ·
   lefthook.yml · non-.sample files in .git/hooks/
   Why: issue #697 — the codex broker disables git hooks in worktrees,
   and foreground-in-worktree is the normal path.

2. Existing AGENTS.md or CLAUDE.md at the root — do they exist, and what
   is in them?

3. ls ~/.codex/AGENTS.md ~/.codex/AGENTS.override.md
   Either one is prepended to EVERY review on this machine, ahead of the
   repo brief. I want both absent. Report what you find, do not delete.

4. Is Codex CLI installed and authenticated on this machine?

THEN STOP AND WAIT. I approve each step individually.

ORDER AFTER MY APPROVAL
  1. Install plugin (§1)
  2. /codex:setup --disable-review-gate
  3. Set model, model_reasoning_effort AND review_model to the same value
     in ~/.codex/config.toml. Which one the plugin honours is unsettled,
     and #705 means you cannot verify which ran — so set all three.
  4. Paste the §4-5 blocks. NOT §6 — that is OKF.
  5. Create docs/codex-review-log.md from the §8 template
  6. One foreground /codex:adversarial-review --base main on a small diff
  7. READ THE Target: LINE IN THE OUTPUT BEFORE TRIAGING.
     #653: a bad --base exits 0 and silently reviews a wider diff.
  8. Log the run

REPO FACTS FOR AGENTS.md
Check §5 already has these. Add any that are missing:
  - Supabase backend, not Rails/Neon.
  - Normal workflow is PROD-first via PAT, then DEV manually hours later.
    Schema states that look out of order are routine, not incidents.
  - Migration policy lives in .sql file headers in this repo.

  NOTE: I have read §5. It already covers the PROD-first rule, the .sql
  header rule and the NOT APPLIED rule. It does NOT state that the
  backend is Supabase. Add that line.

Three logged runs before anything is proposed as knowledge.
Nothing writes to ~/okf from this machine.

WHEN PART A IS DONE: tell me, and tell me to run /compact before you
continue. Do not start Part B until I say go.

Read first, in this order:
  @docs/_INBOX_MASTER_BACKLOG.md     ← the source of truth, read it fully
  @docs/TODO.md                       ← what's currently tracked
  @docs/COST_CALCULATION_SYSTEM.md    ← the old pricing spec, now superseded
  @docs/POST_INCIDENT_FRAMEWORK.md    ← last night's incident register
  @src/lib/calculations/pricing.ts    ← READ ONLY, for the drift audit

SOURCE OF TRUTH
  @docs/_INBOX_MASTER_BACKLOG.md

That file is the complete MRC MASTER BACKLOG & PRICING CANON. Read it in
full before doing anything. It is the single source of truth for this
session — use nothing else, and do not infer beyond it. If something is
not in that file, it is a question for me, not an assumption for you.

═══════════════════════════════════════════════════════════
PART B — WRITE THE DOCS
═══════════════════════════════════════════════════════════

1. docs/MRC_MASTER_BACKLOG.md
   The document verbatim, as the permanent archived record. Do not
   summarise, reorder or reformat it. This is the thing every future
   session reads to understand where the project is.

2. docs/TODO.md — rewrite as the working tracker
   - Preserve the priority structure exactly: P0 / P1 Pricing /
     P1 Workflow / P2 Equipment / P2 Report / P2 CRM / P3 / Marketing /
     Infrastructure / Blocked / Shipped.
   - Every item keeps its stable ID (P0-0, P1-7, T9...). Sessions
     reference items by ID, never by description.
   - Add to every actionable row: [ ] checkbox · "Branch / Session"
     column · "Verified" column · "Ledger entry" column. All blank.
   - Keep the SHIPPED section. It stops closed work being relogged.
   - Header: "Last updated: <today>", plus one-line pointers to
     MRC_MASTER_BACKLOG.md, PRICING_CANON.md and BUG_LEDGER.md.

3. docs/PRICING_CANON.md
   - Four residential rate tables (Surface, Construction Site,
     Demolition, Subfloor), 2h-8h, verbatim.
   - Commercial table and the 25% surcharge rule.
   - Every pricing rule: nearest-row · discounts stop at 8h · multi-day =
     day-1 rate multiples with no step-down · same-day multi-tech = 8h x
     techs · mixed jobs = total hours at the highest category · minimums
     and premiums · fixed fees as separate line items · quote format.
   - Full real estate loyalty discount build spec.
   - A RESOLUTIONS section recording C1 ($119/$46) and C2 (standard rates
     permanently at #7) with the Slack evidence trail, so they cannot be
     reopened. C3 stays open — carry it verbatim, do not pick a side.
   - Mark demolition rows 3h/5h/6h/7h as INTERPOLATED, pending Clayton.

4. docs/BUG_LEDGER.md — NEW, this is the self-improving layer
   - Open with the BUG CLASSES section from the backlog document,
     verbatim. Classes go ABOVE individual entries — they are what gets
     read first.
   - Then the entry template, verbatim.
   - Then write the 16 seed entries (BUG-1 to BUG-16) from the table in
     the backlog. For each, fill in everything you can establish from
     the repo and from the backlog document. Where you cannot establish
     a field with evidence, write "UNKNOWN — needs Michael" rather than
     guessing. A wrong ledger entry is worse than a blank one.
   - The "Why it was hard to find" field is mandatory on every entry.
     That field is the entire point of the ledger.
   - End with THE RULE, stated plainly: no branch merges until its
     ledger entry is written, in the same commit as the fix.

5. Delete docs/_INBOX_MASTER_BACKLOG.md once step 1 is written and you
   have verified MRC_MASTER_BACKLOG.md is complete and byte-faithful.
   Two copies of the same document in docs/ will drift.

═══════════════════════════════════════════════════════════
PART B2 — DRIFT AUDIT (REPORT ONLY, NO FILES)
═══════════════════════════════════════════════════════════

Produce a markdown table in your response. Do NOT write it to a file.
Do NOT change any code.

For each item, state what pricing.ts does TODAY vs what
PRICING_CANON.md now says:
  - the four rate tables
  - dayRates arrays (canon retires them entirely)
  - mixed-job handling
  - subfloor in Option 1
  - equipment day rates
  - MAX_DISCOUNT / manual cap

Flag every mismatch. Estimate the blast radius of each. This is
reconnaissance for a much later session — do not act on it.

═══════════════════════════════════════════════════════════
PART C — ASK ME EVERYTHING
═══════════════════════════════════════════════════════════

Now that everything is written down, interrogate it. I would rather
answer twenty questions now than have you guess once later.

Go through docs/TODO.md item by item and ask about anything where:
  - the acceptance criteria are not obvious from the entry
  - two items could conflict when built (call out which pair)
  - the ordering matters and the document does not say so
  - an item is ambiguous enough that two reasonable devs would build it
    two different ways
  - you cannot tell whether something is already shipped

Also confirm with me:
  - Which items are genuinely P0 versus which are just loud
  - Whether any P1 should be promoted or demoted now that it is all
    written down in one place
  - Whether any two items should be merged, or one split in two
  - Anything in the backlog that looks like it contradicts the code you
    have read

Also ask me: is ~/okf/projects/mrc/ the right place for the session
log, bug history and decisions? See the KNOWLEDGE LAYER section.

Group the questions. Number them. Wait for my answers.

═══════════════════════════════════════════════════════════
PART D — PLAN, THEN STOP
═══════════════════════════════════════════════════════════

After I have answered:
  - Fold every answer back into docs/TODO.md
  - Show me the final diff of all four docs files
  - Give me a proposed session plan as a table:
      session letter | purpose | worktree | branch | files it OWNS |
      files it must NOT touch | can it run parallel with, and why
  - Confirm no two sessions in the plan own the same file
  - Then STOP.

STOP MEANS STOP.
Do not start a session from that plan. Do not fix anything from the
backlog. Do not act on the drift audit. Do not install the Codex plugin.

Every item in that plan is executed in a SEPARATE, FRESH Claude Code
session, one per worktree, each opened with the Session Handoff Prompt
plus its own brief. This session's only job was to write things down,
ask questions, and hand me a plan. That job is now finished.

If I ask you in this session to "just start the first one" — say no and
remind me of this instruction.

CONSTRAINTS
- Do NOT modify src/lib/calculations/pricing.ts
- Do NOT modify src/lib/statusFlow.ts or src/pages/LeadDetail.tsx
- Do NOT modify /src/auth/**, any migration, or any Edge Function
- Do NOT change application code of any kind
- Branch: docs/backlog-pricing-canon-and-ledger
- No git add -A. Explicit paths only. No AI attribution.
- Do not commit, push or merge. Michael runs those.
- Supabase MCP calls, if any, must pass project_id explicitly and be
  read-only.

DONE WHEN
- docs/MRC_MASTER_BACKLOG.md written verbatim
- docs/TODO.md rewritten, every item carries its stable ID and the four
  tracking columns
- docs/PRICING_CANON.md created with all tables, rules and UNRESOLVED
- docs/BUG_LEDGER.md created with classes, template and 16 seed entries
- The drift audit table is in your response, not in a file
- Your questions are asked, numbered and grouped
- Part A: Codex loop live, one review run logged, Target: line verified
- git status shows only the four docs files plus AGENTS.md,
  CLAUDE.md, docs/codex-review-log.md, and the deletion of
  docs/_INBOX_MASTER_BACKLOG.md
- npx tsc -p tsconfig.app.json --noEmit unchanged from this worktree's
  baseline
- You have STOPPED and are waiting for my answers
```

### After Session E, run this to push

```
cd ~/mrc-app-1
git status                       # confirm only the four docs files
git add docs/MRC_MASTER_BACKLOG.md docs/TODO.md docs/PRICING_CANON.md docs/BUG_LEDGER.md
git add AGENTS.md CLAUDE.md docs/codex-review-log.md
git commit -m "docs: master backlog, pricing canon, bug ledger and codex review loop"
git push origin docs/backlog-pricing-canon-and-ledger
```

Then merge to main when you're happy:

```
git checkout main
git merge --no-ff docs/backlog-pricing-canon-and-ledger
git push origin main
```

---

## ▶️ WHAT HAPPENS AFTER SESSION E

Session E ends with a proposed session plan. Once you approve it, **open a new
session per worktree** and paste the handoff prompt above plus that session's
brief.

Nothing in this document gets built until it's been saved, questioned and
answered. That's the whole point of the order.

# 📚 APPENDICES — FULL SOURCE MATERIAL

Everything below is reproduced so this document stands alone. No other file is
needed to work from it.

---

## APPENDIX A — TEAM, ROLES & THE PLAN

### A.1 Who does what

| Person | Role | Owns |
|---|---|---|
| **Glen Farolan** | Technician / Director (SE & East) | Inspections, reports, remediation, on-site client comms. Long-term heads the technician side. |
| **Clayton Jenkins** | Technician / Director (back end) | Inspections + reports, pricing decisions, scripts & training content, website/SEO with Michael. Long-term back end & sales. |
| **Vryan Lopez** | Head of Office / Admin | Bookings, client comms, invoicing, payment follow-ups, review requests. |
| **Michael Youssef** | IT (full-time from Step 3) | App development, automations, SEO, website. Admin support when needed. Deployment captain. |
| **Glanz** | Casual — office & site | Lead calling, ServiceM8→app sync, LinkedIn research/outreach, site labour. Available Wed/Fri/Sat (uni Mon/Tue/Thu). Sunday availability unconfirmed. |

Team comms: **Slack** — one task channel per person, anyone can add tasks,
thumbs-up = done. All meeting recordings and knowledge go into the one MRC Claude
project — no separate projects.

### A.2 The plan — four steps, in order

Each step unlocks the next. No skipping ahead.

1. **App live (from Mon 31 Aug).** Inspection reports, job reports, then invoicing
   + Xero through the MRC app. Kills ~10 min of formatting per report — about 2
   hours on a 10-report day. This is the productivity unlock everything else
   depends on.
2. **Warehouse + geolocation.** Funded by the incoming large project payment. A
   Google Business Profile map pin plus 121 five-star reviews (91 Google, 30
   hipages) should put MRC top 3–5 locally — currently invisible in the local pack
   and in AI search (Claude/Gemini/ChatGPT) with no locale. Then SEO push,
   LinkedIn, headshots, uniforms, fit-out.
3. **Michael full-time.** Team of five. Target before end of year.
4. **Technician #3, then rinse & repeat.** Decided on Sep/Oct trading. Each extra
   tech ≈ +$3–4k/week in costs ≈ needs +$40k/month revenue. Repeat until **6
   technicians + 3 office staff**, then pause and review everything.

### A.3 The funnel — every job, no exceptions

```
Lead received → Booked → Job done → Invoice sent → Review requested
```

### A.4 Who we target

**Go hard (Glanz drives via LinkedIn):**
- Demolition + drying jobs and make safes — the money-makers
- Property developers — start with Dominic (High End Developments) and his network
- Maintenance companies, schools, apartment building developers
- Insurance procurement / policy contacts — the people who pick trades

**Let it come to us — real estate:**
Real estate is cheap volume (a $1,400 day loses 50–70% to expenses and tax). MRC is
responsive, does good work, has short wait times — agencies will come as
competitors frustrate them. Canvass the existing list opportunistically in free
windows, especially heading into summer.

---

## APPENDIX B — PRICING LIST, 31 AUG 2026 (VERBATIM)

*Internal — team use. All prices ex GST unless stated.*

### B.1 Residential rates

Hours are total technician hours on site. Between 2 and 8 hours, price by the
**nearest row**. Beyond 8 hours see the rules — **discounts stop at 8 hours**.

| Hours | Surface (No Demo) | Construction Site | Subfloor |
|---|---|---|---|
| 2h | $635.27 | $695.39 | $1,195.84 |
| 3h | $785.45 | $878.39 | $1,562.68 |
| 4h | $994.53 | $1,135.74 | $2,074.75 |
| 5h | $1,107.50 | $1,272.91 | $2,349.24 |
| 6h | $1,220.30 | $1,410.61 | $2,624.46 |
| 7h | $1,332.95 | $1,548.94 | $2,900.98 |
| 8h | $1,445.33 | $1,685.91 | $3,175.21 |

**Bathroom condensation minimum: 1 hour — $450 + GST.** The first hour is priced
heavier than subsequent hours. Non-bathroom condensation jobs keep a 2-hour
minimum.

### B.2 Demolition (residential)

> *Residential demolition rates are still to be confirmed by Clayton. Working back
> from the commercial rates (÷ 1.25) implies approximately $795 / 2h · $1,275 / 4h
> · $1,876 / 8h. Until confirmed, flag demolition quotes for Clayton or Glen to
> review before sending.*

Interpolated table in use meantime:

| Hours | Demolition |
|---|---|
| 2h | $795.23 ← exact |
| 3h | $1,035.25 ← interpolated |
| 4h | $1,275.26 ← exact |
| 5h | $1,425.41 ← interpolated |
| 6h | $1,575.56 ← interpolated |
| 7h | $1,725.72 ← interpolated |
| 8h | $1,875.87 ← exact |

### B.3 Equipment & fixed fees

| Item | Rate |
|---|---|
| Paid inspection (no visible mould / due diligence) | **$385 + GST** |
| Weekend inspection callout | **$500** |
| Dehumidifier hire | **$119 per unit per day + GST** ✅ resolved — Glen, Slack 31 Aug |
| Air mover (blower) hire | **$46 per unit per day + GST** ✅ resolved — Glen, Slack 31 Aug |
| Equipment hire cap — residential | 4 days maximum (commercial negotiated separately) |
| Travel fee — beyond 50 km | $1.50 per km, quoted as its own line item |

### B.4 Commercial rates

Commercial work carries a **25% surcharge folded silently into the labour rate**.
It applies to Surface, Demolition and Subfloor — **never shown to the client as a
separate surcharge line**. The report front page property type (e.g. "House —
Commercial") drives it automatically in the app.

| | 2h | 4h | 8h |
|---|---|---|---|
| **Surface (No Demo)** | $794.09 | $1,243.16 | $1,806.66 |
| **Demolition** | $994.04 | $1,594.08 | $2,344.84 |
| **Subfloor** | $1,494.80 | $2,593.44 | $3,969.01 |

Construction-site work uses its own rate table and **does not** take the commercial
surcharge on top.

### B.5 Pricing rules (verbatim)

- **Discounts stop at 8 hours.** The 2–8 hour rows are the only scaled prices.
  Same-day multi-technician jobs are priced as the 8-hour rate × number of
  technicians (two techs all day = 2 × the 8h price). The old 16/24/32/40/48-hour
  block discounts no longer apply.
- **Multi-day jobs:** Clayton or Glen make the final call. Direction is *less*
  discounting, not more — our rates are still competitive for the industry.
  *(Handoff doc supersedes with the explicit rule: every day = day-1 8h rate, no
  step-down.)*
- **1-hour demolition jobs are charged at a premium.** Setup and pack-down run
  about 25 minutes each way; the client is paying for mobilisation, not just
  cutting time.
- **Mixed jobs** (e.g. surface + demo in one visit): total the hours and price the
  whole scope at the highest applicable category. Quote as a range on
  virtual/photo quotes.
- **Travel fees and paid inspections are separate line items.** Do not bake them
  into the job price any more.
- **Paid inspection credit:** the $385 is credited against the remediation quote
  if mould is confirmed and the client proceeds — except for long-distance travel,
  where it is non-refundable.
- **Real estate loyalty discounts** still apply on top of these rates: 10% (1st
  property) rising 2% per property to 20% (6th), resetting at the 7th. ⚠️ **superseded**
  — Glen confirmed 2 Sep: standard rates permanently at #7, no reset
- **Quote format:** always "$X,XXX.XX + GST". Keep the odd cents — they look
  generated, not made up.

### B.6 Explaining the price to clients (verbatim)

> Air filtration units run pre-filters ($30, replaced every job) and charcoal
> filters ($100, replaced every three jobs). Add chemicals, disposables, van
> insurance, diesel, BAS of roughly $20k a quarter, and WorkSafe premiums —
> expenses and tax take 50–70% of every job. Sell from strength: "If you'd like
> another quote, by all means do your due diligence." Our reports, turnaround and
> warranty are why they come back.

Sell from strength, never justification.

---

## APPENDIX C — REAL ESTATE LOYALTY DISCOUNT, FULL BUILD SPEC

- **Per agency**, counted **per property sent**, applied **automatically per job**
- Ladder: #1 → 10% · #2 → 12% · #3 → 14% · #4 → 16% · #5 → 18% · #6 → 20%
- **#7 onward → standard rates, permanently.** ✅ resolved 4 Sep. Onboarding
  incentive — the ladder does not restart.
- Ends **early** if an agency hits **10 properties in one month**
- **Labour only** — never off equipment hire or waste disposal
- **Forfeited** if the account goes to debt collection or credit default listing
- Every lead must be **tagged with its referring agency** — this also gives
  per-agency revenue tracking
- **Manual discount cap stays 13%.** The automatic loyalty engine may reach 20%.
  Above 13% manual = director override.

### Current agency stable

| Agency | Note |
|---|---|
| River Edge | Biggest |
| Peter Lee | |
| Elite | |
| C+M | |
| HNB | Great payer |
| O'Brien | |
| **Ace** | Relationship soured over ~$800 late fees on a ~$600 invoice. No work orders since. |

---

## APPENDIX D — OFFICE PLAYBOOK

### D.1 Time blocks

People actually answer 8–11:30 am and after 3 pm.

| Block | Focus |
|---|---|
| **8:00–11:30** | Calls — new leads first (cleared daily), then follow-ups. Email replies between calls. |
| **11:40–3:00** | Reports, quotes, bookings, admin — deep-work block. |
| **3:00 onward** | Follow-ups: old quotes, uncontacted leads, review requests, second call attempts. |

### D.2 Call rules

- Every unanswered call gets a **text** (name + company). Call twice in a day, then
  roll to tomorrow. **Leads always cleared same day.**
- **No technical talk in the office.** Push scope questions to Glen/Clayton — they
  return calls from the road. Booking anyway and handing off the questions is a
  win: *"Great questions — I'll have Glen or Clayton give you a bell."*
- **Exception — bathroom condensation:** spend the time, explain process + price,
  pre-approve on the call. Have them check **all windows** first. Bathroom mould =
  steam. Bedroom window/ceiling mould = house-wide humidity → book an inspection,
  not a same-day treatment.
- **Yapper deflection:** *"Easiest for both of us — I'll text you the details I
  need first, then call you back."* The text asks for job details + photos. Or send
  them to the website inquiry form.
- Before calling a lead, **pick the slot you want them in.** Cluster 5–10 km around
  existing jobs. **Furthest job first in the morning** (against traffic), work back
  toward base. Time allowances: subfloor inspection ~1h, bathroom quote ~30 min.

### D.3 Standards

- **Review requests: personal SMS from the phone after every invoice** — not just
  the automated email. Script pinned in Claude.
- Same-day inspection reports, MRC format, every time.
- Every job logged, every expense recorded, complete photos.
- Expectations for everyone: **personal initiative** (see it, do it or flag it),
  **more efficiency** (no double-handling), **optimal workflow** (everyone runs the
  funnel).

---

## APPENDIX E — THE APP: VISION & OFFICIAL FIX LIST

### E.1 Vision

ServiceM8 + FastField + Monday.com in one, with AI — job management, scheduling,
field data capture, automated invoicing and revenue tracking.

**Pipeline:**
```
New lead → Awaiting inspection → AI review → Approved → email sent
  → Awaiting jobs (unconverted quotes) → Booked
  → Scheduled (auto-scheduler recommends slots with travel-time estimates)
```

### E.2 Operating rules

- Reports on **tablet/laptop only** — phone PDF viewer unsupported
- **Everyone has both technician and admin access**
- Vryan works the app for reports
- ServiceM8 stays only for what's not in the app yet
- **Glanz mirrors every ServiceM8 booking into the app daily** from 31 Aug forward
  — no back-fill

### E.3 Official fix list, priority order (handoff §6)

| # | Item | Status |
|---|---|---|
| 1 | Report emailing bug | ✅ shipped |
| 2 | Unit numbers dropped from addresses | ✅ shipped |
| 3 | Repeat clients blocked from re-creation (C+M etc.) | ✅ shipped |
| 4 | Infrared observations must print below the infrared section in the PDF | → P2-6 |
| 5 | Moisture: plain number fields; comment/photo optional; no location on PDF | → P2-8 ⚠️ conflict C3 |
| 6 | Remove unused report pages (e.g. subfloor-only jobs) | → P2-9 |
| 7 | Technician cost-estimate view must match report pricing incl. overrides | → P1-11 |
| 8 | Load new pricing + residential/commercial property type + surcharge logic | → P1-1, P1-2 |
| 9 | Multi-day = day-rate multiples; mixed jobs = highest-category anchor; loyalty discount engine + agency tagging; lift auto-discount cap to 20%, keep manual at 13% | → P1-4, P1-5, P1-10 |
| 10 | Invoicing + Xero linking | → P3-1 |

### E.4 Handoff backlog — not now

- SMS quick-action from lead numbers
- In-app notifications (needs a native app)
- Photo-caption removal polish
- Dedicated end-of-day report send window

### E.5 Tracking — build into everything

- Revenue per job by client type and job type
- Fortnightly profit vs expenses (approximation over precision, Xero-integrated)
- Conversion rate per technician — bonuses for performers
- Cost per lead and per conversion, by channel

This is the data that decides channel pivots and hiring.

### E.6 V2

Current app (~250k lines) gets **buttoned up only** — no new feature sprawl. V2
rebuilds as an **AI-agent-first** system: talk to the agent, it runs the ecosystem.
Every v1 refinement feeds the v2 spec. If Claude usage limits throttle development,
MRC pays for the higher plan.

---

## APPENDIX F — GROWTH, HIRING & THE QUIET SEASON

- **Hire trigger:** hold 2–3 weeks of constant bookings in both calendars. When 3
  weeks is consistent, bring on tech #3. Office staff added when office workload
  overloads from added techs. End state 6 + 3, then full review.
- **Hire profile:** young, hungry, malleable, wants a career — not a set-in-his-ways
  journeyman. **Slow to hire, fast to fire.** Never send someone out under the MRC
  name before they're ready. A standout gets trained toward leading
  technician/manager (~$120k) so the directors can step back.
- **Economics:** each tech ≈ +$3–4k/week all-in (wages, super, BAS, WorkSafe,
  insurance) ≈ needs +$40k/month revenue. Decision comes from Sep/Oct trading.
  Counter-case: hire into the quiet season to train while it's slow.
- **Quiet season (Jan–Mar, sometimes April):** private market dies off, real estate
  and recurring clients carry it. Weather (La Niña, storms) sets the depth. Last
  summer burned savings ~$90k → ~$15k. This year's defence: app efficiency,
  geolocation + SEO, LinkedIn outreach, more recurring clients. Spare time =
  canvassing time.
- **Long game:** MRC funds MRC Systems. The software side scales without wage
  ceilings, payroll tax and vans. The businesses are one and the same.

---

## APPENDIX G — INDIVIDUAL TASK LISTS

**Glen** — LinkedIn profile · real estate canvassing in free windows · with Clayton,
final calls on big-job pricing overrides · keep feeding app faults to Michael
(logged centrally, not in chats) · confirm what the "Split" tab in splitracker is.

**Clayton** — full demolition hourly table to Michael (interim interpolation in use
until then) · Glanz's call script + mould-basics training module · LinkedIn profile
· website/SEO with Michael post-warehouse.

**Vryan** — reports through the app from Monday · run the time blocks · leads
cleared daily, text after every missed call · personal SMS review request after
every invoice · push technical calls to the techs, pre-approve bathrooms · LinkedIn
profile.

**Michael** — official fix list in order · pricing engine rebuild (multi-day, mixed,
loyalty, caps) · agency tagging · Xero/invoicing · then SEO + website rebuild with
Clayton. Full-time in Step 3.

**Glanz** — mirror ServiceM8 bookings into the app daily · call new leads (*"Hi,
it's Glanz from MRC, calling about your online inquiry…"*) · geographic clustering
when booking · LinkedIn research + outreach (High End Developments network first,
then maintenance companies, schools, apartment developers, insurance procurement) ·
keep recording meetings into Claude.

---

## APPENDIX H — SLACK BUG REPORTS, VERBATIM SOURCE

Every item traced to who raised it and when, so nothing gets attributed wrongly or
quietly dropped.

| Raised by | When | Item | Now |
|---|---|---|---|
| Vryan | 24 Aug | Photo captions — too many button presses | ✅ shipped |
| Clayton | 24 Aug | Photo flow — too many presses per area | ✅ shipped, confirm with Clayton |
| Vryan | 25 Aug | Scheduling — more specific time options | ✅ shipped |
| Vryan | 25 Aug | Address unit numbers dropped | ✅ shipped |
| Vryan | 25 Aug | Manual price adjust by technician | ✅ shipped |
| Vryan | 25 Aug | Attachments on the job file | → P1-17 |
| Glen | 25 Aug | Attachments on the job file (invoices, manual entries per client) | → P1-17 |
| Glen | 25 Aug | Job diary — ServiceM8-style comms log | → P2-13 |
| Glen | 25 Aug | Pricing visible only to Glen and Clayton | ⚠️ superseded — everyone is admin now |
| Clayton | 31 Aug | Tag people in internal job notes | ✅ shipped |
| Clayton | 31 Aug | "Recommend Dehumidifier Hire" toggle unclear, shows on surface jobs | → P1-21, investigate |
| Glen | 31 Aug | Industrial + Construction in Premises Type | → P1-3 |
| Glen | 31 Aug | Option 2 stacking on Option 1 | ✅ fixed, branch parked — needs rework per highest-category rule |
| Glen | 28 Aug | Two technicians on one job | → P2-4, blocked on 0b |
| Glen | 31 Aug | Equipment rates are $119 / $46, not $120 / $44 | ✅ **resolved** — $119/$46 stands |
| Glen/Vryan | 3 Sep | AI summary not visible on completed inspections | → **P0-0** |
| Glen/Vryan | 3 Sep | Customer A — no details, can't download report | → **P0-0** |
| Glen | 3 Sep | Only accounting for 50 leads, some don't register after inspection | → P0-2 |
| Michael | 3 Sep | Search leads by Lead ID | → P1-15 |
| Michael | 3 Sep | Equipment unit + days on job | → P2-3 |
| Michael | 3 Sep | Block out named empty calendar slots | → P2-1 |
| Michael | 3 Sep | Schedule equipment pickup against a job | → P2-2 |
| Michael | 3 Sep | Subfloor must be in both Option A and B | → P1-7 |
| Meeting | 28 Aug | Quote chasing — customers who ghost after the report | → P2-12 |
| Meeting | 28 Aug | Internal notes disappear on some lead statuses | → P1-14 ⚠️ possibly P0-0 |
| Meeting | 28 Aug | Expenses vs profits tracking | → P3-2 |
| Meeting | 28 Aug | Xero integration | → P3-1 |
| Meeting | 28 Aug | Admin + technician permissions for everyone | ✅ locked |
| Meeting | 28 Aug | Google review script — SMS, personalised | → P2-14 |
| Meeting | 28 Aug | Lead phone tap → message or call | → P2-15 |
| Meeting | 28 Aug | Website redesign, contact form with photo upload | → M1 |
| Meeting | 28 Aug | Website SEO + Google optimisation | → M2 |
| Meeting | 28 Aug | LinkedIn strategy | → M3 |
| Meeting | 28 Aug | Real estate marketing + outreach plan | → M4 |
| Michael | 4 Sep | Lead list count is fake — Load more inflates it, every tab affected | → **P0-2** |
| Michael | 4 Sep | Lead detail hides sections — every view must show everything | → **P0-0** |
| Michael | 4 Sep | Floating nav bar not locked to the bottom, strands mid-screen on scroll | → **P1-20** |
| Glen + Michael | 4 Sep | Mobile nav bar not locked to the bottom, floats mid-screen on scroll | → **P1-19b** |

---

## APPENDIX I — HARD OPERATING RULES (NEVER RELAX)

**Deployment**
- Michael is deployment captain. Claude Code writes code and never commits, pushes,
  merges or deploys.
- Auto mode (⏵⏵) must be killed with `Shift+Tab`. It self-enables.
- Migrations are **Studio-by-hand only**. `supabase db push` is permanently
  prohibited.
- Never `git add -A`. Always `--no-ff` merges. No AI attribution in commits.
- Verify by **content**, never by version number or a CLI success message.
- `npm run typecheck` is a no-op — root tsconfig has `"files": []`. Use
  `npx tsc -p tsconfig.app.json --noEmit`. Baseline varies per worktree (99 vs 122
  seen) — re-measure in the worktree you're in.

**Supabase**
- MCP defaults to PROD. **Every call must pass `project_id` explicitly.**
  PROD `ecyivrxjpsmjmexqatym` · DEV `ctppzqnysmzynkxjlzta`.
- `db query --linked` is blocked. It executed DDL when believed to be SELECT-only.
- No writes to the production database without Michael's explicit approval **in
  that session**. A comment in a `.sql` file is not approval.
- Storage does not overwrite same-named files — **delete, then re-upload**.

**PDF**
- The template is read at **runtime** from Storage at
  `pdf-templates/inspection-report-template-final.html`. **Repo edits are inert.**
- A blanket `@media print` rule strips backgrounds from every div — any new
  background needs an allow-list entry.

**Frozen surfaces — explicit approval required**
- `src/lib/calculations/pricing.ts`
- `src/lib/statusFlow.ts`
- `src/pages/LeadDetail.tsx` — `ALL_STATUSES`, lines 500–543
- `/src/auth/**`
- `supabase/migrations/**`
- `supabase/functions/**`

**Business rules**
- GST 10% on subtotal, always
- Equipment is **never** discounted
- Mobile-first 375px, 48px touch targets (field use with gloves)
- DD/MM/YYYY · $X,XXX.XX · en-AU · Australia/Melbourne
- Auto-save every 30s on forms. Zero data loss on navigation.
- Glen and Clayton consulted before architecture decisions

**Session hygiene**
- Every session tags line one `[SESSION X — NAME]`
- Anything Michael needs to run goes in its own clean copy-paste block
- Test on the **pinned commit-hash** Vercel URL, fresh Incognito, full service
  worker reset — never the branch-alias URL
- `/context` before starting · `/compact` at 50% · `/plan` before complex work

---

## APPENDIX J — OPEN QUESTIONS OUTSTANDING

| # | Question | Who |
|---|---|---|
| C3 | Moisture — remove comment/photo entirely, or keep in form and strip from PDF only? | Resolve during P2-8 investigation |
| — | Full residential demolition hourly table | **Clayton** |
| — | Glanz email + mobile | **Glen** |
| — | Glanz Sunday availability | **Glanz** |
| — | What the "Split" tab in splitracker does — unrelated to equipment | **Glen** |
| — | Pricing visibility now everyone is admin — drop it, per-user flag, or ask Glen? | **Glen** |
| — | Tech #3 timing | Sep/Oct trading numbers |
| — | Warehouse | Waiting on the large project payment |

---

## APPENDIX K — GLOSSARY

| Term | Means |
|---|---|
| **Area** | A room or zone in an inspection. Section 3 is repeatable — one entry per area. Hours are recorded per area. |
| **Option 1 / Option 2** | The two alternative quotes on every inspection. Option 1 = Surface Treatment (clean and treat). Option 2 = Comprehensive (includes demolition). **Alternatives, not cumulative.** |
| **Surface Treatment** | Clean and treat mould in place. Nothing removed. |
| **Demolition** | Cut out and dispose of affected material. Higher rate — includes mobilisation, setup and pack-down. |
| **Subfloor** | The crawl space under the floor. Highest rate — confined space, harder access. Appears in **both** options. |
| **Construction Site** | Its own rate table. Takes **no** commercial surcharge on top. |
| **Section 9** | The Cost Estimate section — the last of the 9 inspection form sections. Where hours become money. |
| **Equipment Days** | How many days dehumidifiers and air movers stay on site. Multiplies the per-unit-per-day rate. Capped at 4 days residential. |
| **Air mover / blower** | Same thing. Drying fan. |
| **Dehumidifier / dehu** | Drying unit, per-unit-per-day hire. |
| **Paid inspection** | $385 + GST when there's no visible mould or it's due diligence. Credited against the quote if they proceed — except long-distance travel, where it's non-refundable. |
| **Awaiting Job** | Pipeline status: inspection done, report approved and sent, customer said yes, remediation not yet booked. |
| **Awaiting Inspection** | Pipeline status: booked in, not yet attended. |
| **Job to Book** | Where a cancelled job returns to — not the top of the pipeline. |
| **Framer** | The marketing website. Public lead capture form posts into Supabase. |
| **ServiceM8** | The old field-service system being replaced. Still used for what the app doesn't cover yet. Glanz mirrors its bookings into the app daily. |
| **Vercel preview** | Every pushed branch builds a preview deploy. Always test on the **pinned commit-hash URL**, never the branch alias. |
| **Worktree** | A separate checkout of the repo on its own branch. 17 of them. One session per worktree. |
| **Frozen surface** | A file that cannot be edited without explicit approval in the session. Listed in Appendix I. |
| **Deployment captain** | Michael. The only person who commits, pushes, merges, deploys, migrates, or uploads to Storage. |
| **DEV / PROD** | Two Supabase projects. DEV `ctppzqnysmzynkxjlzta`, PROD `ecyivrxjpsmjmexqatym`. The MCP defaults to PROD — always pass `project_id`. |
| **EF** | Edge Function. 10 of them. Deno, deployed to Supabase. |
| **RLS** | Row Level Security. On all 22 tables. |
| **SW reset** | Service worker reset. Required before testing a preview, or you get a cached bundle and test the wrong code. |
| **Loyalty ladder** | Real estate agency discount: 10% on their first property, +2% per property, 20% at the sixth. |
| **13% cap** | The manual discount ceiling in `invoices.ts`. The automatic loyalty engine may exceed it up to 20%; manual above 13% needs a director override. |

---

## APPENDIX L — WHY THINGS ARE THE WAY THEY ARE

*Decisions already made, with the reasoning. Do not relitigate these — implement
them.*

**Why mixed jobs price at the highest category, not per area.**
The 2-hour rows have a mobilisation premium baked in — setup and pack-down run about
25 minutes each way. Pricing area-by-area charges that premium twice on a single
visit. Glen's ruling: total the hours, price at the highest category present.

**Why multi-day has no step-down.**
The old day-rate curve flattened to about 74% by day 5. Glen killed it: *"direction
is less discounting, not more — our rates are still competitive for the industry."*
Every day on site is that category's day-1 8-hour rate. Big-job exceptions are a
manual director override on the quote, never engine logic.

**Why equipment is never discounted.**
It's a hire cost with a real asset behind it — filters, servicing, replacement.
Discounting it eats margin that isn't labour.

**Why the manual cap stays at 13% while the auto engine goes to 20%.**
The loyalty ladder is a deliberate, rule-based onboarding incentive with a defined
end. A human typing a number into a box has no such guardrail. Two different risks,
two different ceilings.

**Why subfloor is in both options.**
The crawl space needs remediation regardless of whether the customer picks surface
treatment or demolition upstairs. Excluding it from Option 1 produced a quote the
technician couldn't actually deliver on.

**Why `pricing.ts` is frozen.**
It's live, it bills real customers, and a wrong number is a wrong invoice to a real
person. Every change goes through `pricing-guardian` and a full Vitest suite.

**Why `LeadDetail.tsx:500–543` is frozen.**
`ALL_STATUSES` ordering is load-bearing. Hardcoded index thresholds control the
nulling of customer financial data. Reordering the array silently wipes records.
This is also the suspected cause of P0-0.

**Why migrations are Studio-by-hand only.**
The migration history is forked — roughly 16 shared, 104 local-only, 102
remote-only. `db push` would attempt to reconcile that and could destroy production
schema. It's permanently banned and there's a Bash guard hook enforcing it.

**Why deploys are verified by content.**
An Edge Function deploy reported success and a bumped version while serving the old
code. The only trustworthy check is downloading the deployed source and diffing it.
Same for Storage — it silently refuses to overwrite same-named files, so a
"successful" upload can leave the old file in place.

**Why the technician gets a mobile-first form and the admin gets desktop.**
Technicians are in crawl spaces with gloves on. Admins are at a desk. Different
constraints, and the technician's are harder — so 375px is primary.

**Why offline sync exists.**
Basements and subfloors have no signal. A technician losing 40 minutes of form data
has actually happened. Dexie + auto-save every 30 seconds.

**Why real estate is "let it come to us".**
A $1,400 real estate day loses 50–70% to expenses and tax. It's cheap volume worth
having, not worth chasing hard. Sales effort goes to demolition, drying, make-safes
and developers.

**Why "everyone gets admin + technician".**
Five people. Role separation creates support friction with no security benefit at
this size. Reviewed if the team reaches the 6+3 end state.

**Why Session E saves before anything gets built.**
The moment a fix session starts, its own context becomes the source of truth and the
backlog stops being read. Save, question, answer — then build, in a separate
session.

**Why the Bug Ledger has a "why it was hard to find" field.**
The subfloor bug took 40 minutes to trace. The identical bug class had been fixed
before and the fix was described verbatim in a code comment nobody knew about.
Recording the misleading signal is what turns a changelog into a shortcut.

---

## APPENDIX M — ANSWERS TO QUESTIONS AGENTS ASK

**"Should I run the tests?"**
Yes. `npx vitest run` for the relevant directory. `src/lib/calculations` has the
pricing suite. Report the count before and after.

**"Should I fix the pre-existing TypeScript errors?"**
No. There are ~99. They're baseline. Your gate is *no new errors*, not zero errors.
Measure the baseline in your worktree first — it varies.

**"The user said X but the code does Y. Which wins?"**
Neither, yet. Report the discrepancy and stop. Michael decides. Several backlog
items exist precisely because code and intent diverged silently.

**"Can I refactor this while I'm in here?"**
No. One change per branch. A pricing fix with an opportunistic refactor attached is
unreviewable and unrevertable.

**"Should I create a migration for this?"**
Only if explicitly asked. Migrations are a frozen surface and are applied by hand in
Studio. If the task needs schema change, say so and stop.

**"The MCP call failed / returned nothing."**
Check you passed `project_id` explicitly. It defaults to PROD and may be blocked by
the guard hook. Never retry against PROD to "see if it works".

**"I can't reproduce it locally."**
Don't try. `.env` points at PROD, so a local login is a production query. Test on
the Vercel preview against DEV.

**"Is this file safe to edit?"**
Check the frozen list in Appendix I. If it's not on the list and it's not owned by
another concurrent session, yes.

**"Should I commit this?"**
No. Never. Michael commits, pushes, merges and deploys. Every time, no exceptions.

**"The task seems bigger than described."**
Say so before starting, not halfway through. Michael would rather re-scope than
receive a half-finished multi-file change.

**"There's a related bug I noticed."**
Report it. Don't fix it. It goes in the backlog with an ID and gets its own session.
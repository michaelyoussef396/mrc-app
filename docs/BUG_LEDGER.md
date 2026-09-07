# BUG LEDGER

Bug classes, the entry template, and the ledger rule.

**Read section 1 before starting any investigation.** Most time lost on this
project has gone to re-deriving a class that was already written down. The
individual entries in section 3 exist to give each class its instances; the
classes are the part that saves time.

Nothing here is inferred. Every claim cites the file that establishes it, and a
field that is not established says **UNKNOWN**. Do not fill an UNKNOWN with a
plausible cause — an invented mechanism is worse than an admitted gap, because
the next reader cannot tell them apart.

---

## 1. Bug classes

### C1 — A toggle hides the UI while the value keeps feeding downstream
**Shape.** Turning a section off unmounts it. The underlying quantity is still
read by pricing and still written on save. The screen is right and the invoice
is wrong.

**Instances (2):** BUG-1 equipment, BUG-2 subfloor.

**Check:** find every *read* site of the value, not the render site. A toggle
that only controls visibility is the defect. Zero on `=== false`, never on
`!== true` — legacy null rows must keep rendering (BUG-2's fix convention).

### C2 — Verification by proxy
**Shape.** A version number, an exit code, or a CLI success message is believed
over the content itself.

**Instances (4):** an Edge Function deploy reported success and a bumped version
while serving old code (Appendix L). A Storage upload reported success while the
same-named old file stayed in place, because Storage silently refuses the
overwrite (Appendix L). `npm run typecheck` exits 0 over **zero files** (BUG-8,
T7). `git push origin main` from the wrong directory succeeded and looked like a
merge; it had merged nothing (`docs/GIT_HABITS.md`, 2026-09-05).

**Check:** compare the artefact, not the report. `git hash-object` the deployed
file, list Storage object metadata (size + `updated_at`), count tsc error lines,
`git log origin/main`. *If you didn't look, it didn't happen.*

### C3 — A tool trusted by its name, not its behaviour
**Shape.** The name implies a safe operation. The behaviour is not that.

**Instances (2):** BUG-9 — `db query --linked` reads as read-only, executes
arbitrary SQL, and resolved PROD from a tracked `.temp/project-ref`. BUG-10 —
the Supabase MCP with no ref pinned defaults to **PROD**, and its success output
does not name the project it wrote to.

**Check:** what does it *do*, and what does it target when you don't say? An
implicit default target is the dangerous half.

### C4 — The runtime asset is not the repo asset
**Shape.** The thing that runs is loaded from somewhere other than git, so a
repo edit is inert while appearing to succeed.

**Instances (2):** BUG-3 — the inspection PDF template is read from the
`pdf-templates` Storage bucket, not from git (P2-17). Incident 2 — a guard hook
committed to the repo that never ran, because the registered copy was the
machine-local one.

**Check:** before editing, establish which copy is actually read at runtime.

### C5 — A count derived from loaded state
**Shape.** The count is computed from rows in memory, so it always agrees with
the screen and can never reveal what the screen is missing.

**Instance (1):** BUG-4 — "50 of 50" while ~80 leads sit uncontacted (P0-2).

**Check:** is this a server `COUNT`, or `array.length`?

### C6 — Status position gates data
**Shape.** Rendering or data-nulling is keyed to a value's *position in an
ordered array*. A status at an unexpected index — or absent from the array
entirely — silently changes what renders.

**Instances (2):** BUG-5 — `LeadDetail.tsx:500–543` uses hardcoded positions in
`ALL_STATUSES` to gate rendering and the nulling of customer financial data, so
two render paths exist for one status (P0-0). BUG-22 — four `lead_status` values
exist in the DB enum and in no TypeScript surface, so `ALL_STATUSES.indexOf()`
returns `-1` (P0-10).

**Check:** `ALL_STATUSES` ordering is load-bearing and reordering silently wipes
records (Appendix L). Treat any index arithmetic on it as a defect until proven
otherwise, and check the DB enum against the TS union.

**A worked example of a wrong hypothesis, kept deliberately.** BUG-22 was read as
the cause of BUG-5 for two days. It fit: same class, same file, and its
degrade-not-crash behaviour explains "renders 9 sections" better than any
alternative. A Studio count on 2026-09-06 returned **zero rows** across all four
orphaned statuses, which disproves it outright — Customer A's lead cannot be in a
status no lead occupies. **Both bugs are real; only the link between them was
invented.** Two instances of one class in one file is a strong prior and it was
still wrong. The cheap query that settled it should have been run before the
hypothesis was written into three documents. Ask what single observation would
falsify a mechanism, and get that observation, before building on it.

### C7 — `position: fixed` broken by a transformed ancestor
**Shape.** An ancestor with `transform`, `filter`, `backdrop-filter`,
`perspective`, `will-change` or `contain` creates a new containing block. Every
fixed descendant then resolves against that element instead of the viewport.

**Instance (1):** BUG-11 — the mobile nav bar floats mid-screen (P1-20).

**Check:** the fix is on the **ancestor**, never on the fixed element. The fixed
element itself always looks correct.

### C8 — A guard chained with `&&` or `;` instead of gated on its exit status
**Shape.** The guard runs, the guard fails, the guarded action runs anyway,
because the two were sequenced rather than the action being conditional on the
guard's exit status.

**Instances (3):** BUG-17 instance 1 — a verification assertion failed and the
`rm` that followed it in the same shell command deleted the inbox regardless.
BUG-17 instance 2 — Codex plugin #653: a bad `--base` exits 0, so the review runs
against the wrong target and widens scope silently. 2026-09-06 — `git clean` with
an absolute path into another worktree exits **128** and does nothing; a loop
without an exit-code check carried on and reported six worktrees as "did not come
clean" when the clean had never run (`docs/GIT_HABITS.md`).

**Check:** put the destructive step inside the same process as its check, after
the assertion. Never place it after a script whose failure does not stop the
shell. And when comparing counts, compare like with like — BUG-17's underlying
assertion failed because Python `splitlines()` and `wc -l` differ by one on a
file with no trailing newline.

### C9 — A check that keeps passing after the thing it checks is gone
**Shape.** The test cannot fail. It was written from the same mental model as the
code, so it certifies the blind spot instead of finding it.

**Instances (2):** `scripts/test-supabase-guard.sh` line 87 asserts
`"supabase --version; echo x"` → ALLOW, which **pins a bypass as correct
behaviour**; P0-9(d) requires it inverted, not deleted. Incident 3 was closed on
that suite as evidence — "a suite written from the same mental model as the code
under test inherits its blind spots and then certifies them" — and was reopened
2026-09-05 when adversarial input found three HIGH bypasses.

*A third instance, a `HOOK_PATH` default that made a check unfalsifiable, was
named from memory on 2026-09-06 but has* **UNKNOWN** *provenance — `HOOK_PATH`
has zero matches anywhere in this repo. Cite it or drop it; do not reconstruct
it.*

**Check:** a guard observed only through cases its author imagined is not
verified, it is *confirmed*. Adversarial input is what distinguishes the two.

### C10 — A subsystem shipped without a caller
**Shape.** A complete, tested, plausible-looking subsystem that nothing invokes.
The read side is wired into production UI; the write side has no callers, so
every consumer can only ever show an empty state.

**Instances (4), all verified by grep, 2026-09-05 and 2026-09-06:**
`SyncManager.saveDraft` — zero callers outside its definition and tests.
`queuePhotoOffline` (`photoUpload.ts:57`) — zero callers; its only other mentions
are a test comment and a type comment. `FormRecoveryToast` — **not mounted
anywhere** (`OFFLINE_INVESTIGATION.md:818`). `apiClient` — its only importer in
`src/` is its own test file.

**Dating, corrected 2026-09-06:** three of the four files were added Feb/Mar 2026
— `SyncManager.ts` 2026-02-10, `FormRecoveryToast.tsx` 2026-03-11, `apiClient.ts`
2026-03-11 — but `photoUpload.ts` was added **2025-11-18**. The often-repeated
"all four from Feb/Mar 2026" is wrong. When `queuePhotoOffline` itself was
introduced within that file is **UNKNOWN**.

**Check:** grep for callers before believing a subsystem works. A read path wired
into the UI proves nothing about the write path.

### C11 — A denylist over unparsed text
**Shape.** The guard decides what a command *does* by running regexes over the raw
command string. It never parses the command, so it matches text that resembles an
invocation rather than an invocation. Both failure directions follow from that one
cause: a spelling the regex does not recognise is allowed, and text that is not a
command at all is denied. They look like two separate problems and are one.

**Instance (1, carrying 101 confirmed defects):** the Supabase targeting guard,
`.claude/hooks/block-supabase-prod.sh`. A six-lens adversarial sweep with a
refute-by-default verifier confirmed **101 defects across 19 root causes — 37 HIGH
bypasses, 30 MEDIUM, 34 over-blocks** (`scripts/guard-fixtures/cases/confirmed.json`,
`docs/LANE_R_PLAN.md`). An explicit, named PROD schema push behind one wrapper word
was ALLOWED — the precise act the hook exists to stop — while the CLI's local-only
`start` and `status` subcommands, which reach no control plane, were DENIED.

**Check.** Ask what the guard does with the same command spelled differently:
behind a wrapper word, after `&&`, inside `if` or braces, with the binary name
quoted, or via a package runner. If the answers differ, it is matching text.
More patterns will not fix it — enumerating dangerous spellings is infinite, and
each widening makes the over-blocks worse. The fix inverts it: trigger broadly,
classify each command segment by its resolved `argv[0]`, deny what cannot be
resolved. Related: C3 (a tool trusted by its name) and C9 — the guard's own suite
reported `passed 24, failed 0` throughout.

### C12 — Detection short-circuits the check it gates
**Shape.** An absolute prohibition is written as one rule in a pipeline that opens
with "is this even our business?". The scoping test runs first, answers "not our
business" for an input the prohibition would have refused, and returns. The rule
reads as unconditional in the source and is conditional in effect. Nothing about
the rule itself is wrong; only its position is.

**Instance (1, 5 confirmed HIGH):** the same guard. Rule 1 — "the production ref is
never permitted from an agent session" — sat three lines BELOW
`[ "$IS_CLI" -eq 0 ] && [ "$IS_API" -eq 0 ] && exit 0`. Thirteen confirmed cases
named the PROD ref literally and were allowed, because one unrecognised wrapper
word, a scoped npm package spec, or a Python or Node interpreter left both
detectors at zero. Fixed by hoisting the check above all detection (R1).

**Check.** For every rule a guard describes as "never", find the earliest `exit 0`
or `return` above it and ask what reaches that line. A prohibition must never sit
downstream of a classifier that is allowed to decline to classify. Position is the
property under test, so the test has to be an input the classifier does **not**
recognise — a rule exercised only with well-formed input cannot reveal this, which
is why C9 and C12 travel together.

---

## 2. Entry template

Copy this. **"Why it was hard to find" is mandatory** — it is the entire point of
the ledger. An entry without it records that a bug existed; an entry with it
stops the next one.

```markdown
### BUG-n — one-line symptom, in the words someone would report it

- **Class:** C-n, or a new class if this is the first instance.
- **Mechanism:** what actually happens, with file:line.
- **Why it was hard to find:** the misleading signal. What looked correct,
  what confirmed the wrong hypothesis, how long it cost. MANDATORY.
  UNKNOWN is acceptable; omitting the field is not.
- **Fixed:** commit sha and date, or the tracking ID if still open.
- **Verified:** how, and by what evidence. A chat claim is not verification.
```

---

## 3. Entries

Seeded 2026-09-06 from `docs/okf-seed-2026-09-05.md` (which itself sources
`MRC_MASTER_BACKLOG.md`, `POST_INCIDENT_FRAMEWORK.md`, `GIT_HABITS.md` and a
grep at `ec5f9da`) and `docs/OFFLINE_INVESTIGATION.md`. UNKNOWNs are carried
through verbatim, not resolved.

| ID | Symptom | Class | Why it was hard to find | Status |
|---|---|---|---|---|
| **BUG-1** | Equipment toggle off, customer still billed for equipment | C1 | The section unmounted, so the screen looked right. The value lived on in pricing and in saves, out of sight | Fixed before Session D. Commit/date **UNKNOWN** |
| **BUG-2** | Subfloor toggle off, hours still in the quote | C1 | 40 minutes of tracing for a class already fixed once and described verbatim in a code comment nobody knew existed | Fixed `14b14f3` |
| **BUG-3** | PDF template edited in repo, output unchanged | C4 | The repo file is the obvious thing to edit and the edit "succeeds". Nothing links it to the copy that is read | Open — P2-17 |
| **BUG-4** | Lead list says "50 of 50", team thinks leads vanish | C5 | The count agrees with the screen, so it looks self-consistent. ~80 uncontacted leads read as an ops failure | Open — P0-2, gated on Vryan |
| **BUG-5** | Customer A's lead shows 9 sections, Customer B's shows everything | C6 | Presented as a data problem. P0-3 and P0-4 were the same bug reported twice | Open — P0-0 |
| **BUG-6** | Option 2 = Option 1 + demolition, stacked | Additive where exclusive intended | **UNKNOWN** — the backlog records Glen's 31 Aug complaint and the ruling, not the trace | Open — P1-5, P1-6 |
| **BUG-7** | "Report was NOT saved", but it had saved | Error surfaced from response size, not outcome | The error asserted the opposite of what happened, so the trace started from a false premise | Fixed. Commit/date **UNKNOWN**. Mechanism **UNKNOWN** beyond the class |
| **BUG-8** | `npm run typecheck` passes, code does not compile | C2 | A green run over zero files is indistinguishable from a green run over all files | Open — T7 |
| **BUG-9** | `db query --linked` executed DDL, believed read-only | C3 | The command named no project, so nothing looked dangerous, and "query" reads as read-only | Partial — Incident 1, T9 |
| **BUG-10** | Supabase MCP wrote to PROD during a test | C3 | The MCP's success output does not name the project, so the write looked like it hit DEV | Closed — P0-7, resolved by removal |
| **BUG-11** | Mobile nav bar floats mid-screen | C7 | The element still "works" — it anchors to the wrong thing. The fixed element itself looks correct | Open — P1-20 |
| **BUG-12** | PDF versions missing from the table but present in Storage | Function returns 200 on failure | The PDF exists and the function reported success. Only a health check comparing table to bucket found 12+ lost rows | Open — P0-A |
| **BUG-13** | Slack says "report sent", customer never received it | Function returns 200 on failure | Two downstream signals, `email_logs` and Slack, both confirmed success. At least three customers affected | Open — P0-B |
| **BUG-14** | Leads with no lat/lng, travel time silently wrong | Function returns 200 on failure | No error anywhere. A day of leads had no geocoding before anything noticed | Open — P0-E |
| **BUG-15** | Reminder emails fire twice, and for inspections already past | Scheduled function fires twice | Each run is individually correct. Only counting invocations against expected slots shows the doubling — and a fix had shipped while the symptom persisted | Open — P0-C |
| **BUG-16** | Failed logins not recorded since February | Audit trail stops silently | Six months passed. **Nothing alerts on absence** | Open — P0-D |
| **BUG-17** | An operation gated on a check ran anyway | C8 | The destructive step succeeded and printed nothing. The only sign was a traceback above it, from a check that looked unrelated to the deletion | Logged 2026-09-05 |
| **BUG-18** | The offline queue has a read side wired to production UI and a write side nothing calls | C10 | Every consumer is real, mounted and correct. They read a queue nothing writes to, so they can only ever render an empty state — which looks like "no pending work", not like a broken subsystem | Open — P1-22 |
| **BUG-19** | No `mrc_inspection_backup_*` key is ever written, on any inspection, at any wait | **UNKNOWN** | Eight mechanisms eliminated; **cause unidentified**. Needs console instrumentation before it can be scoped | Open — P1-22 defect 1 |
| **BUG-20** | The restore prompt crashes when it renders | **UNKNOWN** | Unreachable today only because BUG-19 starves it. It passes a plain object where React requires an element, and `Toaster` sits outside every error boundary | Open — P1-22 defect 2. Must land **before** BUG-19 |
| **BUG-21** | The auth gate blocks a cold-cache offline mount | **UNKNOWN** | `userRoles` is never persisted, so the form does not render offline unless three REST GETs are still cached. Stays invisible until BUG-19 and BUG-20 are fixed | Open — P1-22 defect 3. Touches `AuthContext.tsx` — needs explicit permission |
| **BUG-22** | Four `lead_status` values exist in the DB enum and in no TypeScript surface | C6 | One undefined lookup, **two different failure modes**: every render site is optional-chained so the status card degrades to grey and empty, while `LeadDetail.tsx:621` is unguarded and throws. So it presents as "renders fewer sections", not as an error — which is exactly why it looked like BUG-5's cause | Open — **P1** (was P0-10). **Latent: zero rows, verified 2026-09-06.** **NOT the cause of BUG-5 — disproven, see below** |
| **BUG-23** | A command explicitly naming the PROD project ran from an agent session | C12 | The rule was present, correctly written, and named PROD in its own comment — read top to bottom the file gives no hint it does not execute. `scripts/test-supabase-guard.sh` reported `passed 24, failed 0` throughout, including a case literally named "command naming the PROD ref" that passed, because that case was spelled in a way detection recognised. The suite proved the rule works for the inputs that reach it and said nothing about which inputs reach it | Fixed — R1. Verified: 16 cases in `scripts/guard-fixtures/cases/cases-r1.tsv` go ALLOW to DENY, run against the script through `run-cases.sh`; 5 ALLOW controls unchanged. **Round 2** closed a casing hole the round-1 corpus could not have caught — the match was `grep -qF`, so an uppercase ref inside a host still exited 0; the haystack is now case-folded, never the pattern. Two consequences recorded as **decisions, not defects** (LANE_R_PLAN ruling 5): the guard refuses any command naming the PROD ref or host, `grep` and commit messages included, so corpus cases `verify-api2.tsv` g1/g2 now assert an ALLOW the policy no longer grants and are deliberately left unedited; and the `Bash(*<prod-ref>*)` deny in `.claude/settings.json` was verified live to be case-**sensitive**, so for the uppercase spelling this hook is the only layer that refuses it |

---

## 4. The rule

**No branch merges until its ledger entry is written, in the same commit as the
fix.**

Not after. Not in a follow-up. The same commit.

Steps 8 and 9 of `docs/GIT_HABITS.md` — tick the item, write the ledger entry —
are the two that get skipped, and skipping them is why work gets re-logged and
why the same bug class has cost 40 minutes twice.

An entry whose **"Why it was hard to find"** field is missing does not satisfy
this rule. That field is the only part that makes the ledger worth keeping: the
mechanism tells you what broke, but the misleading signal is what cost the hours,
and it is the only thing that stops the next instance.

`n/a` is a valid entry for a feature with no bug behind it.

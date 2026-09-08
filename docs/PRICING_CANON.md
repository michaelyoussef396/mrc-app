# MRC Pricing Canon — effective 31 August 2026

Last updated: 2026-09-05. Source: the 31 Aug 2026 pricing list, Glen's Slack corrections of 31 Aug, and the handoff document of 2 Sep, as reconciled in `docs/MRC_MASTER_BACKLOG.md` (Canonical Pricing, Conflicts Resolved, Appendix B, Appendix C). Last correction: **2026-09-08** — the residential equipment hire cap is **5 days**, not the 4 this file carried from 2026-09-05 until then. See C4 in section 6.

This file is the single source of truth for rates and pricing rules. The code does not yet implement it: `src/lib/calculations/pricing.ts` still carries the pre-canon model, and the rebuild is P1 in `docs/TODO.md`. Where `docs/COST_CALCULATION_SYSTEM.md` or any older document disagrees with this file, this file wins. Rates change only when Glen or Clayton say so, and this file is updated before the code is.

All prices are **ex GST**. Quote format everywhere: `$X,XXX.XX + GST`. Keep the odd cents.

## 1. Residential rate tables

Hours are total technician hours on site. Between 2 and 8 hours, price by the **nearest row**.

| Hours | Surface (No Demo) | Construction Site | Demolition | Subfloor |
|---|---|---|---|---|
| 2h | $635.27 | $695.39 | $795.23 | $1,195.84 |
| 3h | $785.45 | $878.39 | $1,035.25 **INTERPOLATED** | $1,562.68 |
| 4h | $994.53 | $1,135.74 | $1,275.26 | $2,074.75 |
| 5h | $1,107.50 | $1,272.91 | $1,425.41 **INTERPOLATED** | $2,349.24 |
| 6h | $1,220.30 | $1,410.61 | $1,575.56 **INTERPOLATED** | $2,624.46 |
| 7h | $1,332.95 | $1,548.94 | $1,725.72 **INTERPOLATED** | $2,900.98 |
| 8h | $1,445.33 | $1,685.91 | $1,875.87 | $3,175.21 |

**Demolition is not yet confirmed.** Clayton owns the residential demolition table (B1 in `docs/TODO.md`). The 2h, 4h and 8h demolition rows are exact, derived from the confirmed commercial table divided by 1.25. The 3h, 5h, 6h and 7h rows are linear interpolation and are marked INTERPOLATED above. Until Clayton confirms, every demolition quote is flagged for Clayton or Glen to review before it is sent.

## 2. Commercial rates

Commercial work carries a **25% surcharge folded silently into the labour rate**. It applies to Surface, Demolition and Subfloor. It is **never shown to the client as a separate line**. The report front-page property type (for example "House — Commercial") drives it automatically. Construction Site uses its own table and takes **no** surcharge on top.

| | 2h | 4h | 8h |
|---|---|---|---|
| Surface (No Demo) | $794.09 | $1,243.16 | $1,806.66 |
| Demolition | $994.04 | $1,594.08 | $2,344.84 |
| Subfloor | $1,494.80 | $2,593.44 | $3,969.01 |

## 3. Pricing rules

Each rule is binding. None is engine-optional.

1. **Nearest row.** Between 2 and 8 hours, price by the nearest row of the table. No interpolation at quote time.
2. **Discounts stop at 8 hours.** The 2h to 8h rows are the only scaled prices. The old 16/24/32/40/48-hour block discounts are dead.
3. **Multi-day = day-1 rate multiples, no step-down.** Every day on site is that category's 8h rate. A 3-day subfloor job is 3 × $3,175.21. The old `dayRates` curves are retired entirely. Big-job exceptions are a manual director override on the quote, never engine logic.
4. **Same-day multi-technician = 8h rate × number of technicians.** Two technicians all day is 2 × the 8h price. Multi-tech across days multiplies: 2 techs × 3 days = 6 × the day rate.
5. **Mixed jobs = total hours at the highest category present.** Never per area, never stacked. 2h demolition + 2h surface = 4h at the demolition rate ($1,275.26). Pricing area by area double-charges the mobilisation premium built into the 2h rows. Virtual and photo quotes are presented as a range.
6. **Minimums and premiums.** Bathroom condensation: 1-hour minimum at $450 + GST, first hour priced heavier than subsequent hours. Non-bathroom condensation: 2-hour minimum. 1-hour demolition jobs are premium-priced, because setup and pack-down run about 25 minutes each way and the client is paying for mobilisation.
7. **Fixed fees are separate line items**, never baked into the job price:
   - Paid inspection (no visible mould, due diligence): $385 + GST. Credited against the remediation quote if mould is confirmed and the client proceeds. Non-refundable for long-distance travel.
   - Weekend inspection callout: $500.
   - Travel beyond 50 km: $1.50 per km, its own line item.
8. **Equipment is never discounted.** Dehumidifier $119 per unit per day + GST. Air mover (blower) $46 per unit per day + GST. Residential equipment hire cap: **5 days maximum** — corrected from 4 on 2026-09-08, see C4 in section 6. Commercial equipment hire is negotiated separately.
9. **Subfloor in both options.** Option 1 = surface + subfloor. Option 2 = demolition + subfloor. The current hardcoded `subfloorHours: 0` in Option 1 is a defect against this rule.
10. **Quote format.** `$X,XXX.XX + GST`, everywhere, keeping the odd cents. They look generated, not made up.

## 4. Discount caps

- **Manual discount cap: 13%** (0.87 multiplier). A hard invariant in code and in practice. Above 13% manual is a director override, never something the engine does on its own.
- **Automatic loyalty discount may reach 20%**, labour only, by the ladder in section 5. The two caps are different mechanisms and must not be conflated: 13% is the ceiling for a human entering a discount, 20% is the ceiling of the automatic real estate ladder.
- Equipment hire and waste disposal are never discounted by either mechanism.

## 5. Real estate loyalty discount — full build spec

- **Per agency**, counted **per property sent**, applied **automatically per job**.
- Ladder: #1 → 10% · #2 → 12% · #3 → 14% · #4 → 16% · #5 → 18% · #6 → 20%.
- **#7 onward → standard rates, permanently.** The ladder is an onboarding incentive and does not restart. Resolved 4 Sep; see C2 below.
- Ends **early** if an agency hits **10 properties in one month**.
- **Labour only.** Never off equipment hire or waste disposal.
- **Forfeited** if the account goes to debt collection or a credit default listing.
- Every lead must be **tagged with its referring agency**. This also gives per-agency revenue tracking.
- Manual discount cap stays 13%. The automatic engine may reach 20%. Above 13% manual is a director override.

Current agency stable, for tagging: River Edge (biggest), Peter Lee, Elite, C+M, HNB (great payer), O'Brien. Ace: relationship soured over roughly $800 in late fees on a roughly $600 invoice, no work orders since.

## 6. Resolutions — do not reopen

Glen answered all three conflicts by sending the handoff document on 2 Sep. The Slack DM history settles the two that looked contradictory. These are closed. C4 was added later, on 2026-09-08; it is not one of those three and did not come from the handoff document.

### C1 — Equipment day rates: $119 dehumidifier / $46 air mover. RESOLVED.

| When | What |
|---|---|
| 31 Aug 20:38 | Glen sends the pricing PDF: $120 / $44 |
| 31 Aug 20:38 | Glen, one minute later: "only one thing wrong with that is that its $119 and $46 for the dehumidifier and blower rental" |
| 31 Aug 20:48 | Michael: "I'll set them back to $119 and $46 — that's what the app was already running" |
| 2 Sep 19:51 | Handoff document says $120 / $44 |

The handoff document was compiled from the meeting recording plus the PDF and never saw the Slack correction. Glen's direct correction wins. **$119 / $46.** No app change needed; that is what the app already runs.

### C2 — Loyalty ladder at property #7: standard rates, permanently. RESOLVED.

Michael asked: "What resets at the 7th — back to 10%, or does it start over completely?" The handoff document answers directly: `#7 onward → standard rates, permanently — the ladder does not restart`, and adds a rule that appears nowhere in the PDF: it ends early if an agency hits 10 properties in one month. That extra condition only makes sense as a considered answer to the question, not as a copy-forward. **Standard rates permanently at #7. Early exit at 10 properties in a month.**

### Mixed jobs — total hours at the highest category. RESOLVED.

Michael gave Glen both numbers side by side: total at highest, about $1,275; per area added, about $1,351. The handoff document uses Michael's own example verbatim ("2h demo + 2h surface = 4h at the demolition rate ($1,275.26)") and adds the reasoning: never price area by area, it double-charges the mobilisation premium baked into the 2h rows. **Confirmed. Session C's per-area logic must be reworked (P1-5, P1-6).**

### C3 — Moisture comment / photo. STILL OPEN.

| Source | Rule |
|---|---|
| Handoff §6 item 5 | Plain number fields; **comment/photo optional**; no location on PDF |
| Michael, 3 Sep | Remove location **and** photo |

Reconcile during the P2-8 investigation. Low stakes either way. This file does not pick a side.

### C4 — Residential equipment hire cap: 5 days, not 4. CORRECTED 2026-09-08.

Rule 8 of section 3 read **4 days maximum** from 2026-09-05, when this file was written
(`b33e19e`), until 2026-09-08. That figure was wrong. Glen confirmed **5 days** in Slack on
2026-09-08. Unlike C1 above there is no timestamp table here: the confirmation reached this
file through Michael and the message itself is not transcribed, so nothing is quoted that
was not seen.

**The correction runs the opposite way to this file's usual direction, and that is the part
worth keeping.** The header makes the canon win wherever documents disagree, and P2-24 was
logged on exactly that basis: `supabase/functions/generate-inspection-pdf/index.ts:1917`
prints a hardcoded `'5 days'` into `{{equipment_max_days}}`, the canon said 4, so the report
was assumed to be the thing that was wrong. It was not. That line has been printing the
correct number on every customer-facing quote since it was written, and this file held the
error. Being the source of truth makes this document the first thing to check, not the thing
that is right by construction.

The 4 was never independently sourced twice. It entered `docs/PRICING_CANON.md` and the
`docs/MRC_MASTER_BACKLOG.md` glossary in the same commit, `b33e19e` on 2026-09-05, tracing
back to the 28 Aug 2026 meeting notes. Both are corrected as of 2026-09-08. The old figure is
recorded rather than quietly overwritten, so anyone who read 4 and acted on it can find out
what happened to it — the same discipline as the `MAX_QUOTABLE_EQUIPMENT_DAYS` retraction in
`src/lib/calculations/pricing.ts`.

**Unchanged by this correction: no cap is enforced anywhere.** Verified 2026-09-08 against
`origin/main` at `db21282` — nothing in `src/` or `supabase/functions/` bounds the equipment
day count at 4, at 5, or at any business figure. The only ceiling in the engine is
`MAX_QUOTABLE_EQUIPMENT_DAYS = 3650`, which carries its own retraction and is not this cap;
the only database constraint is `CHECK (equipment_days >= 1)`, a floor. 5 days is what we
print and what we have agreed. It is not what the engine applies. That gap is L1226, and
P2-24 carries it.

## 7. What this canon retires

- The `dayRates` arrays and every multi-day step-down.
- The 16/24/32/40/48-hour block discounts.
- Per-area pricing of mixed jobs (the Session C either/or logic).
- `subfloorHours: 0` hardcoded into Option 1.
- The $120 / $44 equipment figures in the handoff document.
- The 4-day residential equipment hire cap. The number is 5 (C4).
- The "ladder resets at #7" reading of the loyalty discount.

Whether the code still does any of these is the drift audit, a follow-on session that reports and does not change code. Nothing in `pricing.ts` changes before the P1 sessions, and no P1 session starts before Clayton's demolition table lands.

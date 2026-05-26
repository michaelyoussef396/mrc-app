# Source of Truth — Inspection MRC-2026-6382

**Date:** 14/05/2026
**Lead:** MRC-2026-6382 — TEST michael Test (35 wellington street, mernda VIC 3754)
**Session:** Session 1 Test 3 (inspection form walkthrough)

---

## Section 1 — Basic Information ✅

- **Lead Number:** MRC-2026-6382
- **Triage (Job Description):**
  > Hey, hoping you can help. Started noticing dark patches around the bathroom ceiling and behind the laundry door over the last couple of weeks. Since the weather's cooled down it seems to be spreading and there's a damp smell now in the hallway. We had some heavy rain a few weeks back and I'm wondering if there's a leak somewhere we missed. House is a 1990s build, single storey, no major ventilation issues that I'm aware of. Would love to get someone out for a proper inspection before it gets worse. Thanks!
- **Address:** 35 wellington street, mernda, VIC, 3754
- **Inspector:** michael youssef
- **Requested By:** michael Test
- **Attention To:** Michael Youssef
- **Inspection Date:** 14/05/2026

---

## Section 2 — Property Details

## Section 2 — Property Details ✅

**Read-only display (sourced from lead record):**

- Email: michaelyoussef396@gmail.com
- Address: 35 wellington street, mernda, VIC, 3754
- Scheduled: 15 May, 2:00 pm
- Internal Notes:
  - [14/05/2026 at 5:03 pm] Booking call done — confirmed Friday afternoon works. Reminded re: mother-in-law preference for arrival window. Clayton briefed on bathroom + laundry + roof void check scope. — michael youssef (booking call)
  - [14/05/2026 at 5:01 pm] Lead came in via Framer form this afternoon. Called Michael back same day — sounded relaxed, no real urgency but wants it sorted properly. Confirmed mould in bathroom ceiling + behind the laundry door + suspected spread into the hallway. Recent rain may have exposed an existing weak spot. 1990s single-storey build, no prior remediation. Sounds like a mid-range job — bathroom + laundry + possible roof void check. Mother-in-law living with them, afternoon bookings preferred. Booking in for Friday — sending Clayton out, he handles older clients well. — michael youssef

**User inputs:**

- Property Occupation: **Vacant**
- Dwelling Type: **Townhouse**

## Section 3 — Area Inspection

## Section 3 — Area Inspection

### Area 1 — Master bedroom

- **Area Name:** Master bedroom

**Visible Mould (checkbox state):**

- Ceiling: ☐ | Cornice: ☐
- Windows: ☐ | Window frames: ☐
- Furnishings: ☐ | Walls: ☐
- Skirting: ☐ | Flooring: ☐
- Wardrobe: ☐ | Cupboard: ☐
- Contents: ☐ | Grout/silicone: ☐
- No mould visible: ☐
- Custom location (if not listed): **"Under the ceiling"**

> **Test path note:** Visible Mould checkboxes intentionally left unchecked. This area is testing the **Custom location only** code path (`custom_mould_location` = "Under the ceiling", `visible_mould_locations` = empty). Audit hooks: DB row must show empty/null `visible_mould_locations` + populated `custom_mould_location`; LeadView and PDF must render mould location as **only** "Under the ceiling" with no false-positive checkbox entries leaking through.

**Comments for Report:**

> Active mould growth visible on the ceiling cornice, concentrated along the southern edge where condensation appears to have built up over time. Surface moisture readings elevated compared to surrounding wall sections. Paint blistering near the extraction fan suggests poor ventilation contributing to ongoing moisture retention. No structural softening detected on initial inspection. Recommend HEPA-vacuum + antimicrobial treatment + improved extraction airflow as part of the remediation scope.

**Environment:**

- Temp: 32°C
- Humidity: 23%
- Dew Point: 16.6°C _(auto-calc — see BUG-041 candidate flag)_

**Internal Moisture:** 45% — "Near the window"
**External Moisture:** 20% — "External wall of window"

**Internal Notes (not in report):** Customer was very concerned

**Extra Notes:**

> Adjacent ceiling and wall sections inspected — no visible mould present but moisture readings indicate elevated baseline humidity throughout the bathroom. Window seal showing minor wear on the lower edge, likely contributing to ongoing condensation pooling on the sill. Extraction fan is present but its effectiveness should be reviewed as part of the remediation plan.

**Infrared Observations:**

- No Active Water Intrusion Detected: ☐
- Active Water Infiltration: ☑
- Past Water Ingress (Dried): ☐
- Condensation Pattern: ☑
- Missing/Inadequate Insulation: ☐

**Time without Demolition:** 8 hrs
**Demolition Required:** ON ☑
**Demolition Time:** 13 hrs
**Demolition Description:**

> Removal of affected ceiling plasterboard (approx. 1.5m² around extraction fan and southern cornice), removal of damaged cornice and skirting on adjacent wall section, and careful extraction of contaminated insulation in the ceiling cavity above the affected zone. All demolition material to be double-bagged and disposed of as contaminated waste. Cavity to be inspected for further moisture ingress points before reinstatement.

### Area 2 — Kitchen

- **Area Name:** Kitchen

**Visible Mould (checkbox state):**

- Ceiling: ☐ | Cornice: ☐
- Windows: ☑ | Window frames: ☐
- Furnishings: ☐ | Walls: ☐
- Skirting: ☐ | Flooring: ☐
- Wardrobe: ☐ | Cupboard: ☐
- Contents: ☐ | Grout/silicone: ☐
- No mould visible: ☐
- Custom location (if not listed): **[NOT CAPTURED — confirm empty or filled]**

> **Test path note:** Area 2 tests the **single checkbox selection path** (Windows only). Combined with Area 1 (custom location only), the two areas cover both mould-location entry modes for save/render audit. PDF + LeadView for Kitchen must render mould location as **only** "Windows".

**Comments for Report:**

> Visible mould growth detected on the wall directly behind the kitchen sink, extending approximately 30cm above the splashback. Surface moisture readings consistent with an ongoing slow leak from the sink plumbing or seal degradation around the splashback edge. Cabinet base under the sink shows water staining and swelling of the particleboard. No visible mould on overhead cabinets or ceiling, but musty odour present in the under-sink cavity. Recommend HEPA-vacuum + [text cut off — confirm full text was entered]

**Environment:**

- Temp: 20°C
- Humidity: 34%
- Dew Point: 6.8°C _(auto-calc — BUG-041 candidate confirmed, see flag)_

**Internal Moisture:** 24% — "Wall near stove"
**External Moisture:** 12% — "Under the stove"

**Internal Notes (not in report):** Suspect ongoing slow leak — recommend plumbing trade to be quoted alongside remediation. Customer mentioned tap has been dripping intermittently.

**Extra Notes:**

> Surrounding kitchen surfaces inspected — overhead cabinets, ceiling, and adjacent walls show no visible mould but elevated humidity readings throughout the kitchen indicate the affected zone is impacting the wider space. Plumbing inspection recommended in parallel with remediation to address the underlying moisture source. Bench seal along the splashback edge should be replaced as part of reinstatement.

**Photo Gallery — Room View Photos:** counter shows **`8/4`** _(see flag — possible photo count bug)_

**Infrared Inspection:** OFF ⚪

> **Test path note:** Area 2 tests the **Infrared toggle OFF path** (Area 1 was ON with observations). PDF + LeadView must suppress the entire Infrared block for Kitchen — no phantom infrared observations should render.

**Time without Demolition:** 7 hrs
**Demolition Required:** ON ☑
**Demolition Time:** 9 hrs
**Demolition Description:**

> Removal of affected splashback section (approx. 0.5m² above and behind the sink), removal of contaminated plasterboard panel behind splashback to expose stud cavity, and removal of damaged under-sink cabinet base panel for full access to the moisture source. All demolition material double-bagged and disposed of as contaminated waste. Cavity and adjacent framing to be inspected and moisture-mapped before any reinstatement.

## Section 4 — Subfloor

## Section 4 — Subfloor

> **Context flag:** This section currently renders unconditionally because BUG-040 dropped `inspections.subfloor_required`. Filling as if property HAS a subfloor per handoff plan. Expected behaviour given current state — do NOT log Subfloor-always-renders as a separate bug in audit; it's a known BUG-040 consequence.

**Subfloor Observation:**

> Subfloor accessed via external hatch on the southern side. Crawlspace clearance approximately 600mm at the entry point, reducing toward the western edge. Soil floor with intermittent moisture patches visible, particularly under the bathroom plumbing zone. Several signs of past water tracking along joist edges. Two timber bearers show minor surface mould growth on the underside. Insulation between joists is dry but compressed in sections. Adequate cross-ventilation through perimeter vents — no obvious blockages.

**Subfloor Landscape:** flat block

**Subfloor Comments:**

> Overall subfloor condition consistent with property age. Moisture patches under the bathroom suggest ongoing minor leak or condensation drip from the floor waste above — recommend plumbing review alongside remediation. Bearer surface mould is superficial and can be treated as part of standard antimicrobial sweep. No structural concerns identified. Subfloor environment would benefit from improved sub-surface drainage to prevent recurrence post-remediation.

**Subfloor Moisture Readings:**
| # | Location | % |
|---|---|---|
| Reading 1 | Under kitchen area | 76 |
| Reading 2 | under sink | 98 |

**Subfloor Documentation Photos:** 20/20

**Treatment Details:**

- Subfloor Sanitation: ON ☑
- Treatment Time: 10 hrs

## Section 5 — Outdoor Info

## Section 5 — Outdoor Info

**Environment:**

- Temp: 47°C
- Humidity: 21%
- Dew Point: 31.2°C _(auto-calc — BUG-041 confirmed, see flag)_

**Outdoor Comments:**

> Property situated on a south-facing lot with moderate shade coverage from neighbouring trees. Ground levels around the perimeter generally adequate but the southern side shows slight soil build-up against the weep holes, restricting drainage flow. Downpipes appear functional but the eastern downpipe discharges directly onto a paved area with no apparent stormwater connection — water tracking visible toward the foundation. Recent rainfall residue still present in low points of the garden bed. Overall outdoor environment is contributing to elevated subfloor moisture and should be addressed as part of long-term mould prevention.

**Direction Photos toggle:** ON ☑ _(labelled "For technician reference")_

**Direction Photos uploaded (visible labels):**

- Front Door
- Front House
- [add more if uploaded below fold]

> **Read-only display at top of section:** Internal Notes block re-renders the same two timestamped entries from Section 2. Layer 2 audit hook: same string in both places, no drift.

## Section 6 — Waste Disposal

## Section 6 — Waste Disposal

> **Read-only display block:** Email, Address, Scheduled, Internal Notes — same content as Sections 2 and 5. Layer 2 audit hook: identical string output across all 3 render points (parser-driven `parseInternalNotesLog()` must produce the same result everywhere; any drift = parser bug).

**Waste Disposal Required:** ON ☑
**Waste Amount:** Medium

## Section 7 — Work Procedure

## Section 7 — Work Procedure

**Treatment Option:** **Both — Show Both Prices** (purple highlight) ⚪

> **Test path note:** "Both" is the **dual-calc path** — Section 9 must compute AND persist BOTH option totals. This is the highest-coverage test option (runs Option 1 + Option 2 calculations simultaneously and writes both to DB). Critical audit hook for post-submit Layer 1: `inspections.option_1_total_inc_gst` AND `inspections.option_2_total_inc_gst` must BOTH be populated and non-null. Either being null = dual-write regression.

**Treatment Methods (all ON):**

- HEPA Vacuuming: ☑
- Surface Remediation Treatment: ☑
- ULV Fogging - Property: ☑
- ULV Fogging - Subfloor: ☑
- Subfloor Remediation: ☑
- AFD Installation: ☑
- Drying Equipment: ☑
- Containment and Prep: ☑
- Material Demolition: ☑
- Cavity Treatment: ☑
- Debris Removal: ☑

> **Test path note:** All 11 treatment methods ON exercises the **full-procedure labour path**. Section 9 labour hours must reflect every method's contribution. If any method silently drops out of the hours calc, that's a method-to-labour-mapping bug.

**Drying Equipment Details:**
| Equipment | Toggle | Qty |
|---|---|---|
| Commercial Dehumidifier | ☑ | **2** |
| Air Movers | ☑ | **3** |
| RCD Box | ☑ | **1** |

> **Pricing-guardian audit hooks for Section 9:**
>
> - Equipment cost at locked rates: $132/day Dehumidifier, $46/day Air Mover, $5/day RCD
> - Equipment cost = (2 × $132 + 3 × $46 + 1 × $5) × **N days** = $287/day × N
> - **Equipment is NEVER discounted** — even if Section 9 applies a discount % to labour, equipment line items must show the same number under Option 1 and Option 2 breakdowns, and at zero discount.
> - Equipment days are NOT captured in Section 7 — must come from Section 8 Additional Equipment Comments or auto-derive. Watch for this in Section 8 capture.

## Section 8 — Job Summary

## Section 8 — Job Summary

**Recommend Dehumidifier Hire:** ON ☑
**Dehumidifier Size:** Medium

**Cause of Mould:**

> Combination of ongoing minor plumbing leak at the kitchen sink and elevated baseline humidity throughout the bathroom and laundry zones, exacerbated by inadequate ventilation and poor sub-surface drainage around the southern perimeter. Recent rainfall events have compounded existing moisture issues, with water tracking from the eastern downpipe into the foundation contributing to subfloor moisture. The combined effect has supported active mould growth across multiple wet-area surfaces and adjacent wall sections.

**Additional Info for Technician (Internal):**

> Treating techs — confirm plumbing leak under kitchen sink is rectified before final remediation pass; client has been advised but trade is booking separately. Mother-in-law on site during the day, prefers afternoon arrival. Customer keen on a single visit if possible, will accept staged work only if necessary. Clayton briefed on the access quirks (sticky front door, side gate latch).

**Additional Equipment Comments:**

> Recommend running dehumidifier across bathroom + laundry + hallway for full drying cycle (estimate 3 days based on current moisture readings). Two air movers — one bathroom, one laundry. RCD box required for safe operation on existing circuits.

**Parking Options:** Driveway

**Save state:** ✅ "Section 8 saved successfully" toast confirmed.

## Section 9 — Cost Estimate

[fill on save — CRITICAL: capture discount % display verbatim, capture all auto-calc totals before submit]

---

## Toggles ledger (track each one)

- [ ] Section 3 per-area: demolitionRequired (per area)
- [ ] Section 3 per-area: infraredEnabled (per area)
- [ ] Section 4: subfloorSanitation
- [ ] Section 5: directionPhotosEnabled
- [ ] Section 6: wasteDisposalEnabled
- [ ] Section 8: recommendDehumidifier
- [ ] Section 9: manualOverride
- [ ] Section 7: drying equipment qty (each: dehumidifier / air movers / RCD)

## Photos ledger

- [count + captions per area as you upload]

---

## Post-submit audit findings

[layer 1: DB row matches ledger]
[layer 2: LeadView renders match ledger]
[layer 3: PDF placeholder reads match ledger]
[any drift = BUG-040+]

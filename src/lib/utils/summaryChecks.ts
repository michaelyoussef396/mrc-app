// Render-time check that the AI narrative doesn't promise services the inspection never
// selected. Issue 18: a generated summary asserted an antimicrobial application (Surface
// Remediation Treatment was OFF) and "a final clearance air test" (not an MRC service at
// all, and not priced). Deterministic and read-only — it raises flags for admin review and
// never edits the narrative.

export type SummarySectionKey = 'whatWeFound' | 'detailedAnalysis' | 'whatWeWillDo' | 'demolitionDetails';

export interface SummaryFlag {
  label: string;
  section: SummarySectionKey;
}

interface SummaryRule {
  label: string;
  /**
   * Canonical work-procedure method names, mirroring SHARED_TREATMENT_METHODS and
   * OPTION_2_ONLY_METHODS in TechnicianInspectionForm. An empty list means nothing can
   * satisfy the rule, so it flags on every match.
   */
  methods: readonly string[];
  isSatisfiedByDemolition?: boolean;
  patterns: readonly RegExp[];
}

// Flag order follows this list, so it reads in the same order the admin reads the report.
const SECTION_ORDER: readonly SummarySectionKey[] = [
  'whatWeFound',
  'detailedAnalysis',
  'whatWeWillDo',
  'demolitionDetails',
];

// Patterns are deliberately narrow. "hepa", "subfloor" and "cavity" on their own are
// everyday cause-analysis vocabulary in these reports ("moisture in the wall cavity"), so
// matching the bare word would flag honest narratives and train admins to dismiss the
// banner unread.
//
// No rule for Drying Equipment: equipment selections are captured separately from the
// method toggles, and the TIMELINE section mentions drying on essentially every report —
// a rule there would be pure noise.
const SUMMARY_RULES: readonly SummaryRule[] = [
  {
    label: 'Surface Remediation Treatment',
    methods: ['Surface Remediation Treatment'],
    patterns: [/anti[\s-]?microbial/i, /biocid/i, /stain[\s-]?remov/i, /surface (remediation|treatment)/i],
  },
  {
    label: 'HEPA Vacuuming',
    methods: ['HEPA Vacuuming'],
    patterns: [/hepa[\s-]?vac/i],
  },
  {
    label: 'ULV Fogging',
    methods: ['ULV Fogging - Property', 'ULV Fogging - Subfloor'],
    patterns: [/\bfog(ging|ger|s)?\b/i, /\bULV\b/i],
  },
  {
    label: 'Subfloor Remediation',
    methods: ['Subfloor Remediation'],
    patterns: [/subfloor (remediation|treatment|sanitis|sanitiz|decontaminat)/i],
  },
  {
    label: 'HEPA Air Scrubber Installation',
    methods: ['HEPA Air Scrubber Installation'],
    patterns: [/air[\s-]?scrubber/i, /negative air (machine|unit)/i],
  },
  {
    label: 'Containment and Prep',
    methods: ['Containment and Prep'],
    patterns: [/containment/i, /negative[\s-]pressure/i, /plastic sheeting/i],
  },
  {
    label: 'Material Demolition',
    methods: ['Material Demolition', 'Debris Removal'],
    isSatisfiedByDemolition: true,
    patterns: [/demoli/i, /strip[\s-]?out/i, /debris removal/i],
  },
  {
    label: 'Cavity Treatment',
    methods: ['Cavity Treatment'],
    patterns: [/cavity treatment/i],
  },
  {
    // Anchored on "test"/"sampling"/"verification" rather than "air quality", because the
    // report template mandates the phrase "air quality restoration" — matching the bare
    // phrase would flag every report MRC sends.
    label: 'Clearance or air-quality testing (not an MRC service)',
    methods: [],
    patterns: [
      /clearance (air )?test/i,
      /air[\s-]?quality test/i,
      /air sampling/i,
      /post[\s-]?remediation verification/i,
    ],
  },
  {
    label: 'Unresolved data conflict',
    methods: [],
    patterns: [/DATA CONFLICT/i],
  },
];

/**
 * Find services the narrative claims but the inspection's work-procedure toggles don't
 * back. Returns at most one flag per rule per section, ordered by section then by rule.
 */
export function findSummaryFlags(
  sections: Partial<Record<SummarySectionKey, string>>,
  selectedMethods: string[],
  hasDemolition: boolean,
): SummaryFlag[] {
  const normalisedMethods = new Set(selectedMethods.map((method) => method.trim().toLowerCase()));
  const flags: SummaryFlag[] = [];

  for (const section of SECTION_ORDER) {
    const text = sections[section];
    if (!text) continue;

    for (const rule of SUMMARY_RULES) {
      if (isRuleSatisfied(rule, normalisedMethods, hasDemolition)) continue;
      // some() stops at the first hit, so repeated mentions in one section flag once.
      if (rule.patterns.some((pattern) => pattern.test(text))) {
        flags.push({ label: rule.label, section });
      }
    }
  }

  return flags;
}

function isRuleSatisfied(
  rule: SummaryRule,
  normalisedMethods: Set<string>,
  hasDemolition: boolean,
): boolean {
  if (rule.isSatisfiedByDemolition && hasDemolition) return true;
  return rule.methods.some((method) => normalisedMethods.has(method.toLowerCase()));
}

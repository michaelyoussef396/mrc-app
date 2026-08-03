/**
 * Compares the equipment and waste actuals recorded on a job completion against
 * the quote snapshot taken when the job was created.
 *
 * Invoicing is manual: an admin copies figures out of the Invoice Summary by
 * hand. This exists so divergence from the quote is visible at that moment
 * rather than discovered by the customer. It reports, it never gates.
 */

export interface QuoteVariance {
  label: string;
  quoted: string;
  actual: string;
}

/** Only the columns this comparison reads. Widened rows are accepted as-is. */
export interface QuoteVarianceInput {
  actual_dehumidifier_qty?: number | null;
  actual_dehumidifier_days?: number | null;
  actual_air_mover_qty?: number | null;
  actual_air_mover_days?: number | null;
  actual_afd_qty?: number | null;
  actual_afd_days?: number | null;
  actual_rcd_qty?: number | null;
  actual_rcd_days?: number | null;
  actual_waste_disposal_m3?: number | null;
  quoted_dehumidifier_qty?: number | null;
  quoted_air_mover_qty?: number | null;
  quoted_afd_qty?: number | null;
  quoted_afd_days?: number | null;
  quoted_rcd_qty?: number | null;
  quoted_equipment_days?: number | null;
  quoted_waste_disposal_m3?: number | null;
}

interface EquipmentLine {
  label: string;
  actualQty: number | null;
  actualDays: number | null;
  quotedQty: number | null;
  quotedDays: number | null;
}

const describe = (qty: number | null, days: number | null): string => {
  const q = qty ?? 0;
  if (q === 0) return 'none';
  if (days == null) return `${q}`;
  return `${q} × ${days} ${days === 1 ? 'day' : 'days'}`;
};

export function findQuoteVariances(jc: QuoteVarianceInput | null | undefined): QuoteVariance[] {
  if (!jc) return [];

  // `?? null` on qty but `|| null` on the shared days: legacy rows carry
  // quoted_equipment_days 0, which means "never quoted", not "quoted zero days".
  // Same treatment as JobCompletionSummary and the Section 7 cards.
  const sharedQuotedDays = jc.quoted_equipment_days || null;

  const lines: EquipmentLine[] = [
    {
      label: 'Dehumidifier',
      actualQty: jc.actual_dehumidifier_qty ?? null,
      actualDays: jc.actual_dehumidifier_days ?? null,
      quotedQty: jc.quoted_dehumidifier_qty ?? null,
      quotedDays: sharedQuotedDays,
    },
    {
      label: 'Air Mover',
      actualQty: jc.actual_air_mover_qty ?? null,
      actualDays: jc.actual_air_mover_days ?? null,
      quotedQty: jc.quoted_air_mover_qty ?? null,
      quotedDays: sharedQuotedDays,
    },
    {
      label: 'HEPA Air Scrubber',
      actualQty: jc.actual_afd_qty ?? null,
      actualDays: jc.actual_afd_days ?? null,
      quotedQty: jc.quoted_afd_qty ?? null,
      quotedDays: jc.quoted_afd_days ?? sharedQuotedDays,
    },
    {
      label: 'RCD',
      actualQty: jc.actual_rcd_qty ?? null,
      actualDays: jc.actual_rcd_days ?? null,
      quotedQty: jc.quoted_rcd_qty ?? null,
      quotedDays: sharedQuotedDays,
    },
  ];

  const variances: QuoteVariance[] = [];

  for (const line of lines) {
    // A null quoted qty means the job predates the snapshot, not that zero was
    // quoted. Claiming divergence against a quote that was never captured would
    // be worse than staying silent.
    if (line.quotedQty == null) continue;

    const actualQty = line.actualQty ?? 0;

    // Nothing hired on either side: the day counts are meaningless, and a
    // stored 0 days against a shared quote of 4 is not a divergence.
    if (actualQty === 0 && line.quotedQty === 0) continue;

    const qtyDiffers = actualQty !== line.quotedQty;
    const daysDiffer =
      line.quotedDays != null && (line.actualDays ?? 0) !== line.quotedDays;

    if (qtyDiffers || daysDiffer) {
      variances.push({
        label: line.label,
        quoted: describe(line.quotedQty, line.quotedDays),
        actual: describe(line.actualQty, line.actualDays),
      });
    }
  }

  const quotedWaste = jc.quoted_waste_disposal_m3;
  const actualWaste = jc.actual_waste_disposal_m3;
  if (quotedWaste != null && (actualWaste ?? 0) !== quotedWaste) {
    variances.push({
      label: 'Waste disposal',
      quoted: `${quotedWaste} m³`,
      actual: `${actualWaste ?? 0} m³`,
    });
  }

  return variances;
}

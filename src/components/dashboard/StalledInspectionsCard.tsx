import { AlertOctagon, FileClock } from 'lucide-react';
import StatsCard from '@/components/admin/StatsCard';
import { useStalledInspections } from '@/hooks/useStalledInspections';

// Lead numbers listed before the tile collapses to a bare count; keeps the card
// the same height as its neighbours at 375px.
const MAX_LEAD_NUMBERS_SHOWN = 3;

/**
 * Admin dashboard tile for inspections that stalled before producing a report.
 *
 * Three display states stay visually distinct: a verified zero (neutral), one
 * or more stalled (amber), and a read that failed (red, "Unavailable").
 * Collapsing the third into the first would reproduce the very defect this tile
 * exists to catch — a surface that stays quiet when something is wrong.
 */
export function StalledInspectionsCard() {
  const { data, isLoading, isError } = useStalledInspections();

  const leadNumbers = (data ?? [])
    .map((inspection) => inspection.leads?.lead_number)
    .filter((leadNumber): leadNumber is string => !!leadNumber);
  const overflowCount = leadNumbers.length - MAX_LEAD_NUMBERS_SHOWN;
  const subtitle = [
    leadNumbers.slice(0, MAX_LEAD_NUMBERS_SHOWN).join(', '),
    overflowCount > 0 ? `+${overflowCount} more` : '',
  ]
    .filter(Boolean)
    .join(' ');

  if (isError) {
    return (
      <StatsCard
        title="Stalled Inspections"
        value="Unavailable"
        change="Could not check for stalled inspections"
        icon={AlertOctagon}
        iconBg="bg-red-50"
        iconColor="text-[#FF3B30]"
        trend="down"
      />
    );
  }

  return (
    <StatsCard
      title="Stalled Inspections"
      value={isLoading ? '...' : leadNumbers.length}
      change={subtitle || undefined}
      icon={FileClock}
      iconBg={leadNumbers.length > 0 ? 'bg-amber-50' : 'bg-gray-100'}
      iconColor={leadNumbers.length > 0 ? 'text-[#FF9500]' : 'text-[#86868b]'}
    />
  );
}

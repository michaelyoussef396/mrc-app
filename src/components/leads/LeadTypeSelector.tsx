/**
 * LeadTypeSelector - Lead Type Selection Component
 *
 * Large, touch-friendly buttons for selecting lead type
 *
 * Features:
 * - Two buttons: HiPages Lead and Normal Lead
 * - Each button min-height: 120px (large touch targets)
 * - Visual differentiation with colors and icons
 * - Mobile: Stack vertically with gap-4
 * - Desktop: 2-column grid
 * - Hover effects with scale and color transitions
 * - Keyboard accessible (Tab, Enter)
 * - Clear field count badges
 */

import * as React from 'react';
import { Phone, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { LeadType } from '@/types/lead-creation.types';

// ============================================================================
// TYPES
// ============================================================================

interface LeadTypeSelectorProps {
  onSelect: (type: LeadType) => void;
}

interface LeadTypeButtonProps {
  type: LeadType;
  icon: React.ReactElement;
  title: string;
  description: string;
  fieldCount: string;
  colorClass: string;
  hoverClass: string;
  borderClass: string;
  onClick: () => void;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Individual lead type button
 * Reusable for both HiPages and Normal lead types
 */
function LeadTypeButton({
  type,
  icon,
  title,
  description,
  fieldCount,
  colorClass,
  hoverClass,
  borderClass,
  onClick,
}: LeadTypeButtonProps): React.ReactElement {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      className={`
        h-auto min-h-[120px] w-full
        flex flex-col items-center justify-center gap-3 p-6
        ${borderClass} border-2
        ${hoverClass}
        transition-all duration-200
        hover:scale-[1.02]
        focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        active:scale-[0.98]
      `}
      aria-label={`Create ${title} - ${description} - ${fieldCount}`}
    >
      {/* Icon */}
      <div className={`${colorClass} transition-colors`}>
        {React.cloneElement(icon, {
          className: 'h-12 w-12',
          strokeWidth: 1.5,
        })}
      </div>

      {/* Title */}
      <h3 className="text-xl font-semibold text-gray-900">{title}</h3>

      {/* Description */}
      <p className="text-sm text-gray-600 text-center">{description}</p>

      {/* Field count badge */}
      <Badge variant="secondary" className="mt-1">
        {fieldCount}
      </Badge>
    </Button>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function LeadTypeSelector({
  onSelect,
}: LeadTypeSelectorProps): React.ReactElement {
  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleHiPagesSelect = (): void => {
    onSelect('hipages');
  };

  const handleNormalSelect = (): void => {
    onSelect('normal');
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="w-full space-y-4 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-4">
      {/* HiPages Lead Button */}
      <LeadTypeButton
        type="hipages"
        icon={<Phone />}
        title="HiPages Lead"
        description="Quick entry from HiPages marketplace"
        fieldCount="4 fields"
        colorClass="text-purple-500"
        hoverClass="hover:bg-purple-50 hover:border-purple-400"
        borderClass="border-purple-300"
        onClick={handleHiPagesSelect}
      />

      {/* Normal Lead Button */}
      <LeadTypeButton
        type="normal"
        icon={<Globe />}
        title="Normal Lead"
        description="Complete lead information"
        fieldCount="8 fields"
        colorClass="text-blue-500"
        hoverClass="hover:bg-blue-50 hover:border-blue-400"
        borderClass="border-blue-300"
        onClick={handleNormalSelect}
      />
    </div>
  );
}

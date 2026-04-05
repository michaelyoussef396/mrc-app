'use client';

import type { JobCompletionFormData } from '@/types/jobCompletion';

// Daily equipment rates as per business rules (CLAUDE.md + PRD Section 7)
const EQUIPMENT_RATES = {
  dehumidifier: 132, // $132/day
  airMover: 46,      // $46/day
  afd: 75,           // $75/day (placeholder — confirm rate with Michael)
  rcd: 5,            // $5/day
} as const;

const AUD = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' });

function formatCurrency(value: number): string {
  return AUD.format(value);
}

interface SectionProps {
  formData: JobCompletionFormData;
  onChange: (field: keyof JobCompletionFormData, value: string | boolean | number | string[]) => void;
  isReadOnly?: boolean;
}

interface StepperProps {
  id: string;
  label: string;
  value: number;
  field: keyof JobCompletionFormData;
  onChange: SectionProps['onChange'];
  isReadOnly: boolean;
}

function Stepper({ id, label, value, field, onChange, isReadOnly }: StepperProps) {
  const decrement = () => onChange(field, Math.max(0, value - 1));
  const increment = () => onChange(field, value + 1);

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-[#86868b] uppercase tracking-wide">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={decrement}
          disabled={isReadOnly || value <= 0}
          aria-label={`Decrease ${label}`}
          className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-lg font-bold text-[#1d1d1f] disabled:opacity-40 active:bg-gray-200 transition-colors"
        >
          −
        </button>
        <input
          id={id}
          type="number"
          value={value}
          min={0}
          readOnly={isReadOnly}
          onChange={(e) => onChange(field, Math.max(0, parseInt(e.target.value, 10) || 0))}
          aria-label={label}
          className="w-16 h-10 text-center rounded-lg border border-gray-200 text-[15px] font-semibold text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent read-only:bg-gray-50 read-only:text-[#86868b]"
        />
        <button
          type="button"
          onClick={increment}
          disabled={isReadOnly}
          aria-label={`Increase ${label}`}
          className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-lg font-bold text-[#1d1d1f] disabled:opacity-40 active:bg-gray-200 transition-colors"
        >
          +
        </button>
      </div>
    </div>
  );
}

interface EquipmentCardProps {
  name: string;
  dailyRate: number;
  actualQty: number;
  actualDays: number;
  quotedQty: number;
  quotedDays: number;
  qtyField: keyof JobCompletionFormData;
  daysField: keyof JobCompletionFormData;
  onChange: SectionProps['onChange'];
  isReadOnly: boolean;
}

function EquipmentCard({
  name,
  dailyRate,
  actualQty,
  actualDays,
  quotedQty,
  quotedDays,
  qtyField,
  daysField,
  onChange,
  isReadOnly,
}: EquipmentCardProps) {
  const subtotal = actualQty * actualDays * dailyRate;
  const isOverQuoted = actualQty > quotedQty;

  return (
    <div className="bg-white rounded-xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-[16px] font-semibold text-[#1d1d1f]">{name}</h3>
          <p className="text-[13px] text-[#86868b] mt-0.5">
            {formatCurrency(dailyRate)} per day
          </p>
        </div>
        <div className="text-right">
          <p className="text-[13px] text-[#86868b]">Subtotal</p>
          <p className="text-[17px] font-bold text-[#1d1d1f]">{formatCurrency(subtotal)}</p>
        </div>
      </div>

      {/* Actual inputs */}
      <div className="flex gap-6">
        <Stepper
          id={`${qtyField}-qty`}
          label="Qty"
          value={actualQty}
          field={qtyField}
          onChange={onChange}
          isReadOnly={isReadOnly}
        />
        <Stepper
          id={`${daysField}-days`}
          label="Days"
          value={actualDays}
          field={daysField}
          onChange={onChange}
          isReadOnly={isReadOnly}
        />
      </div>

      {/* Quoted comparison */}
      <div className="pt-3 border-t border-gray-100 space-y-1">
        <p className="text-[13px] text-[#86868b]">
          Quoted: <span className="font-medium text-[#1d1d1f]">{quotedQty} unit{quotedQty !== 1 ? 's' : ''}</span>
          {' '}for <span className="font-medium text-[#1d1d1f]">{quotedDays} day{quotedDays !== 1 ? 's' : ''}</span>
        </p>
        {isOverQuoted && (
          <p
            role="alert"
            className="text-[13px] font-medium text-amber-600"
          >
            Actual quantity exceeds quoted amount
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Section7Equipment — Records actual equipment used vs quoted, with cost calculation.
 *
 * Displays 4 equipment cards (Dehumidifier, Air Mover, AFD, RCD). Each card has
 * stepper inputs for quantity and days, auto-calculates a subtotal at the daily
 * rate, and shows an amber warning when actual usage exceeds the quoted amount.
 * A running total of all equipment costs is shown at the bottom.
 *
 * NOTE: AFD daily rate ($75) is a placeholder. Confirm with Michael before going live.
 *
 * @param formData - Full job completion form state
 * @param onChange - Field update callback
 * @param isReadOnly - Disables all steppers when true
 */
export function Section7Equipment({ formData, onChange, isReadOnly = false }: SectionProps) {
  const dehumidifierSubtotal =
    formData.actualDehumidifierQty * formData.actualDehumidifierDays * EQUIPMENT_RATES.dehumidifier;
  const airMoverSubtotal =
    formData.actualAirMoverQty * formData.actualAirMoverDays * EQUIPMENT_RATES.airMover;
  const afdSubtotal =
    formData.actualAfdQty * formData.actualAfdDays * EQUIPMENT_RATES.afd;
  const rcdSubtotal =
    formData.actualRcdQty * formData.actualRcdDays * EQUIPMENT_RATES.rcd;
  const totalEquipmentCost = dehumidifierSubtotal + airMoverSubtotal + afdSubtotal + rcdSubtotal;

  return (
    <section aria-labelledby="equipment-heading">
      <h2
        id="equipment-heading"
        className="text-[17px] font-semibold text-[#1d1d1f] mb-4"
      >
        Equipment Used
      </h2>

      <div className="space-y-3">
        <EquipmentCard
          name="Dehumidifier"
          dailyRate={EQUIPMENT_RATES.dehumidifier}
          actualQty={formData.actualDehumidifierQty}
          actualDays={formData.actualDehumidifierDays}
          quotedQty={formData.quotedDehumidifierQty}
          quotedDays={formData.quotedEquipmentDays}
          qtyField="actualDehumidifierQty"
          daysField="actualDehumidifierDays"
          onChange={onChange}
          isReadOnly={isReadOnly}
        />

        <EquipmentCard
          name="Air Mover"
          dailyRate={EQUIPMENT_RATES.airMover}
          actualQty={formData.actualAirMoverQty}
          actualDays={formData.actualAirMoverDays}
          quotedQty={formData.quotedAirMoverQty}
          quotedDays={formData.quotedEquipmentDays}
          qtyField="actualAirMoverQty"
          daysField="actualAirMoverDays"
          onChange={onChange}
          isReadOnly={isReadOnly}
        />

        <EquipmentCard
          name="Air Filtration Device (AFD)"
          dailyRate={EQUIPMENT_RATES.afd}
          actualQty={formData.actualAfdQty}
          actualDays={formData.actualAfdDays}
          quotedQty={0}
          quotedDays={formData.quotedEquipmentDays}
          qtyField="actualAfdQty"
          daysField="actualAfdDays"
          onChange={onChange}
          isReadOnly={isReadOnly}
        />

        <EquipmentCard
          name="RCD Box"
          dailyRate={EQUIPMENT_RATES.rcd}
          actualQty={formData.actualRcdQty}
          actualDays={formData.actualRcdDays}
          quotedQty={formData.quotedRcdQty}
          quotedDays={formData.quotedEquipmentDays}
          qtyField="actualRcdQty"
          daysField="actualRcdDays"
          onChange={onChange}
          isReadOnly={isReadOnly}
        />

        {/* Total */}
        <div className="bg-white rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[15px] font-semibold text-[#1d1d1f]">Total Equipment Cost</p>
              <p className="text-[13px] text-[#86868b] mt-0.5">All prices exclude GST</p>
            </div>
            <p
              aria-live="polite"
              aria-atomic="true"
              className="text-[22px] font-bold text-[#1d1d1f]"
            >
              {formatCurrency(totalEquipmentCost)}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

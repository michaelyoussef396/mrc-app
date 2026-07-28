'use client';

import { useState } from 'react';

import {
  EQUIPMENT_RATES,
  calculateWasteDisposalCost,
  round2,
  formatCurrency,
} from '@/lib/calculations/pricing';

import type { JobCompletionFormData } from '@/types/jobCompletion';

// Waste m³ input bounds — mirrors the inspection form's Section 6 stepper
const WASTE_M3_STEP = 0.5;
const WASTE_M3_MAX = 50;

interface SectionProps {
  formData: JobCompletionFormData;
  onChange: (field: keyof JobCompletionFormData, value: string | boolean | number | string[] | null) => void;
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
  quotedQty: number | null;  // null = never quoted (legacy row) — renders an em-dash
  quotedDays: number | null;
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
  // No over-quote alert without quoted data — null means never quoted, not "quoted 0"
  const isOverQuoted = quotedQty !== null && actualQty > quotedQty;

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
          Quoted:{' '}
          <span className="font-medium text-[#1d1d1f]">
            {quotedQty !== null ? `${quotedQty} unit${quotedQty !== 1 ? 's' : ''}` : '—'}
          </span>
          {' '}for{' '}
          <span className="font-medium text-[#1d1d1f]">
            {quotedDays !== null ? `${quotedDays} day${quotedDays !== 1 ? 's' : ''}` : '—'}
          </span>
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

interface WasteCardProps {
  quotedM3: number | null;
  quotedCost: number | null;
  actualM3: number | null;
  actualCost: number | null;
  isOverridden: boolean;
  onChange: SectionProps['onChange'];
  isReadOnly: boolean;
}

function WasteCard({
  quotedM3,
  quotedCost,
  actualM3,
  actualCost,
  isOverridden,
  onChange,
  isReadOnly,
}: WasteCardProps) {
  const [isEditingOverride, setIsEditingOverride] = useState(false);
  const [overrideDraft, setOverrideDraft] = useState<number>(actualCost ?? 0);

  const m3 = actualM3 ?? 0;
  const displayCalculated = m3 > 0 ? calculateWasteDisposalCost(m3) : 0;

  // Any m³ change resets confirmation — a stale price can never survive an m³ edit.
  const applyM3 = (value: number) => {
    const next = Math.min(WASTE_M3_MAX, Math.max(0, round2(value)));
    onChange('actualWasteM3', next);
    onChange('actualWasteCost', null);
    onChange('actualWasteIsOverridden', false);
    setIsEditingOverride(false);
  };

  const stepM3 = (delta: number) => applyM3(m3 + delta);

  return (
    <div className="bg-white rounded-xl p-5 space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-[16px] font-semibold text-[#1d1d1f]">Waste Disposal</h3>
        <p className="text-[13px] text-[#86868b] mt-0.5">
          Priced per m³ — confirm before submitting
        </p>
      </div>

      {/* Actual m³ input */}
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-[#86868b] uppercase tracking-wide">
          Actual volume removed (m³)
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => stepM3(-WASTE_M3_STEP)}
            disabled={isReadOnly || m3 <= 0}
            aria-label="Decrease actual volume removed"
            className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-lg font-bold text-[#1d1d1f] disabled:opacity-40 active:bg-gray-200 transition-colors"
            style={{ minWidth: '48px', minHeight: '48px' }}
          >
            −
          </button>
          <input
            id="actualWasteM3"
            type="number"
            inputMode="decimal"
            value={m3 || ''}
            min={0}
            max={WASTE_M3_MAX}
            step={WASTE_M3_STEP}
            placeholder="0.0"
            readOnly={isReadOnly}
            onChange={(e) => applyM3(parseFloat(e.target.value) || 0)}
            aria-label="Actual volume removed (m³)"
            className="w-20 h-12 text-center rounded-lg border border-gray-200 text-[15px] font-semibold text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent read-only:bg-gray-50 read-only:text-[#86868b]"
          />
          <button
            type="button"
            onClick={() => stepM3(WASTE_M3_STEP)}
            disabled={isReadOnly}
            aria-label="Increase actual volume removed"
            className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-lg font-bold text-[#1d1d1f] disabled:opacity-40 active:bg-gray-200 transition-colors"
            style={{ minWidth: '48px', minHeight: '48px' }}
          >
            +
          </button>
        </div>
      </div>

      {/* Unconfirmed → require explicit confirmation */}
      {m3 > 0 && actualCost == null && (
        <div className="space-y-2">
          <span
            role="status"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium"
          >
            Price unconfirmed
          </span>
          {!isReadOnly && (
            <button
              type="button"
              onClick={() => onChange('actualWasteCost', displayCalculated)}
              className="w-full h-12 bg-[#007AFF] text-white font-semibold rounded-lg flex items-center justify-center"
              style={{ minHeight: '48px' }}
            >
              Confirm Price — {formatCurrency(displayCalculated)}
            </button>
          )}
        </div>
      )}

      {/* Confirmed / overridden state */}
      {m3 > 0 && actualCost != null && !isEditingOverride && (
        <div className="space-y-2">
          <span
            role="status"
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
              isOverridden ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'
            }`}
          >
            {isOverridden
              ? `✓ Overridden — ${formatCurrency(actualCost)}`
              : `✓ Confirmed — ${formatCurrency(actualCost)}`}
          </span>
          {!isReadOnly && (
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => {
                  setOverrideDraft(actualCost);
                  setIsEditingOverride(true);
                }}
                className="text-sm text-[#007AFF] font-medium py-2"
              >
                Override
              </button>
              {isOverridden && (
                <button
                  type="button"
                  onClick={() => {
                    onChange('actualWasteCost', displayCalculated);
                    onChange('actualWasteIsOverridden', false);
                  }}
                  className="text-sm text-[#86868b] py-2"
                >
                  Reset to calculated
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Inline override editor */}
      {m3 > 0 && actualCost != null && isEditingOverride && (
        <div className="space-y-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-[#86868b] uppercase tracking-wide">
              Override price (ex GST)
            </span>
            <div className="relative flex items-center">
              <span className="absolute left-4 text-[#86868b]">$</span>
              <input
                type="number"
                inputMode="decimal"
                value={overrideDraft || ''}
                onChange={(e) => setOverrideDraft(parseFloat(e.target.value) || 0)}
                min={0}
                step={0.01}
                className="w-full h-12 bg-white text-[#1d1d1f] text-base rounded-lg border border-gray-200 pl-8 pr-4 focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent"
                style={{ minHeight: '48px' }}
              />
            </div>
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onChange('actualWasteCost', round2(overrideDraft));
                onChange('actualWasteIsOverridden', true);
                setIsEditingOverride(false);
              }}
              className="flex-1 h-12 bg-[#007AFF] text-white font-semibold rounded-lg"
              style={{ minHeight: '48px' }}
            >
              Save Override
            </button>
            <button
              type="button"
              onClick={() => setIsEditingOverride(false)}
              className="h-12 px-4 bg-gray-100 text-[#1d1d1f] rounded-lg"
              style={{ minHeight: '48px' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Quoted comparison */}
      <div className="pt-3 border-t border-gray-100">
        <p className="text-[13px] text-[#86868b]">
          Quoted:{' '}
          <span className="font-medium text-[#1d1d1f]">
            {quotedM3 !== null ? `${quotedM3} m³` : '—'}
          </span>
          {' '}—{' '}
          <span className="font-medium text-[#1d1d1f]">
            {quotedCost !== null ? formatCurrency(quotedCost) : '—'}
          </span>
        </p>
      </div>
    </div>
  );
}

/**
 * Section7Equipment — Records actual equipment used vs quoted, with cost calculation.
 *
 * Displays 4 equipment cards (Dehumidifier, Air Mover, HEPA Air Scrubber, RCD). Each
 * card has stepper inputs for quantity and days, auto-calculates a subtotal at the daily
 * rate, and shows an amber warning when actual usage exceeds the quoted amount.
 * A waste-disposal card follows the equipment cards: the tech enters actual m³ removed
 * (re-priced via calculateWasteDisposalCost) and must explicitly confirm or override
 * the price. A running total of all equipment costs is shown at the bottom, with the
 * confirmed waste cost as a separate line (waste is never part of the equipment total).
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
  const hepaAirScrubberSubtotal =
    formData.actualHepaAirScrubberQty * formData.actualHepaAirScrubberDays * EQUIPMENT_RATES.hepaAirScrubber;
  const rcdSubtotal =
    formData.actualRcdQty * formData.actualRcdDays * EQUIPMENT_RATES.rcd;
  const totalEquipmentCost = dehumidifierSubtotal + airMoverSubtotal + hepaAirScrubberSubtotal + rcdSubtotal;

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
          name="HEPA Air Scrubber"
          dailyRate={EQUIPMENT_RATES.hepaAirScrubber}
          actualQty={formData.actualHepaAirScrubberQty}
          actualDays={formData.actualHepaAirScrubberDays}
          quotedQty={formData.quotedHepaAirScrubberQty}
          quotedDays={formData.quotedHepaAirScrubberDays ?? (formData.quotedEquipmentDays || null)}
          qtyField="actualHepaAirScrubberQty"
          daysField="actualHepaAirScrubberDays"
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

        <WasteCard
          quotedM3={formData.quotedWasteM3}
          quotedCost={formData.quotedWasteCost}
          actualM3={formData.actualWasteM3}
          actualCost={formData.actualWasteCost}
          isOverridden={formData.actualWasteIsOverridden}
          onChange={onChange}
          isReadOnly={isReadOnly}
        />

        {/* Total — equipment only; waste is a job-level pass-through, shown separately */}
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
          {formData.actualWasteCost != null && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
              <p className="text-[13px] text-[#86868b]">Waste disposal (ex GST)</p>
              <p className="text-[15px] font-semibold text-[#1d1d1f]">
                {formatCurrency(formData.actualWasteCost)}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

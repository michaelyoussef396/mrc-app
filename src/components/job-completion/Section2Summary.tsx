'use client';

import { useState } from 'react';
import { X, Plus } from 'lucide-react';

import type { JobCompletionFormData, PremisesType } from '@/types/jobCompletion';

interface SectionProps {
  formData: JobCompletionFormData;
  onChange: (field: keyof JobCompletionFormData, value: string | boolean | number | string[]) => void;
  isReadOnly?: boolean;
}

// NOTE: Inline toggle avoids importing a separate Toggle component and keeps this
// section self-contained, consistent with the toggle pattern used across the form.
interface ToggleRowProps {
  id: string;
  label: string;
  checked: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

function ToggleRow({ id, label, checked, onToggle, disabled = false }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-xl">
      <label htmlFor={id} className="text-[15px] font-medium text-[#1d1d1f] cursor-pointer">
        {label}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onToggle}
        disabled={disabled}
        className={`relative w-[51px] h-[31px] rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:ring-offset-2 disabled:opacity-50 ${
          checked ? 'bg-[#34C759]' : 'bg-gray-200'
        }`}
      >
        <span
          className={`absolute top-[2px] left-[2px] w-[27px] h-[27px] bg-white rounded-full shadow-sm transition-transform ${
            checked ? 'translate-x-[20px]' : ''
          }`}
          aria-hidden="true"
        />
        <span className="sr-only">{checked ? 'On' : 'Off'}</span>
      </button>
    </div>
  );
}

/**
 * Section2Summary — Overview of the completed remediation work.
 *
 * Collects the SWMS status, premises type, who did the work, completion
 * date, and which areas were treated. Areas are editable as removable
 * chips with an Add button.
 *
 * @param formData - Full job completion form state
 * @param onChange - Field update callback
 * @param isReadOnly - When true, all fields are locked
 */
export function Section2Summary({ formData, onChange, isReadOnly = false }: SectionProps) {
  const [newAreaInput, setNewAreaInput] = useState('');
  const today = new Date().toISOString().split('T')[0];

  function handleAddArea() {
    const trimmed = newAreaInput.trim();
    if (!trimmed || formData.areasTreated.includes(trimmed)) {
      setNewAreaInput('');
      return;
    }
    onChange('areasTreated', [...formData.areasTreated, trimmed]);
    setNewAreaInput('');
  }

  function handleRemoveArea(areaName: string) {
    onChange('areasTreated', formData.areasTreated.filter((a) => a !== areaName));
  }

  function handleAreaInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddArea();
    }
  }

  // Format ISO date to DD/MM/YYYY for display in the date input's label
  function formatDateDisplay(isoDate: string): string {
    if (!isoDate) return '';
    const [year, month, day] = isoDate.split('-');
    return `${day}/${month}/${year}`;
  }

  return (
    <section aria-labelledby="summary-heading" className="space-y-5">
      <h2
        id="summary-heading"
        className="text-[17px] font-semibold text-[#1d1d1f]"
      >
        Summary
      </h2>

      {/* SWMS Completed */}
      <ToggleRow
        id="swms-completed"
        label="SWMS Completed"
        checked={formData.swmsCompleted}
        onToggle={() => onChange('swmsCompleted', !formData.swmsCompleted)}
        disabled={isReadOnly}
      />

      {/* Premises Type */}
      <div>
        <label
          htmlFor="premises-type"
          className="block text-sm font-medium text-[#1d1d1f] mb-1.5"
        >
          Premises Type <span className="text-red-500" aria-hidden="true">*</span>
        </label>
        <select
          id="premises-type"
          value={formData.premisesType}
          onChange={(e) => onChange('premisesType', e.target.value as PremisesType)}
          disabled={isReadOnly}
          required
          aria-required="true"
          className="w-full h-12 px-3 rounded-lg border border-gray-200 text-[15px] text-[#1d1d1f] bg-white focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent disabled:bg-gray-50 disabled:text-[#86868b] appearance-none"
        >
          <option value="" disabled>Select premises type</option>
          <option value="residential">Residential</option>
          <option value="commercial">Commercial</option>
        </select>
      </div>

      {/* Remediation Completed By */}
      <div>
        <label
          htmlFor="remediation-completed-by"
          className="block text-sm font-medium text-[#1d1d1f] mb-1.5"
        >
          Remediation Completed By
        </label>
        <input
          id="remediation-completed-by"
          type="text"
          value={formData.remediationCompletedBy}
          onChange={(e) => onChange('remediationCompletedBy', e.target.value)}
          disabled={isReadOnly}
          placeholder="Name of the person who completed the work"
          className="w-full h-12 px-3 rounded-lg border border-gray-200 text-[15px] text-[#1d1d1f] bg-white focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent disabled:bg-gray-50 disabled:text-[#86868b]"
        />
        <p className="text-xs text-[#86868b] mt-1">
          Defaults to the logged-in user. Change if someone else did the work.
        </p>
      </div>

      {/* Completion Date */}
      <div>
        <label
          htmlFor="completion-date"
          className="block text-sm font-medium text-[#1d1d1f] mb-1.5"
        >
          Completion Date <span className="text-red-500" aria-hidden="true">*</span>
          {formData.completionDate && (
            <span className="ml-2 text-[#86868b] font-normal">
              ({formatDateDisplay(formData.completionDate)})
            </span>
          )}
        </label>
        <input
          id="completion-date"
          type="date"
          value={formData.completionDate}
          max={today}
          onChange={(e) => onChange('completionDate', e.target.value)}
          disabled={isReadOnly}
          required
          aria-required="true"
          className="w-full h-12 px-3 rounded-lg border border-gray-200 text-[15px] text-[#1d1d1f] bg-white focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent disabled:bg-gray-50 disabled:text-[#86868b]"
        />
      </div>

      {/* Areas Treated — editable chips */}
      <div>
        <p className="text-sm font-medium text-[#1d1d1f] mb-2">
          Areas Treated <span className="text-red-500" aria-hidden="true">*</span>
        </p>

        {/* Chips */}
        <div className="bg-white rounded-xl p-3 min-h-[56px] flex flex-wrap gap-2 border border-gray-200">
          {formData.areasTreated.length === 0 ? (
            <p className="text-sm text-[#86868b] italic self-center px-1">
              No areas yet. Add areas below.
            </p>
          ) : (
            formData.areasTreated.map((area) => (
              <span
                key={area}
                className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-full bg-[#007AFF]/10 text-[#007AFF] text-sm font-medium"
              >
                {area}
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={() => handleRemoveArea(area)}
                    aria-label={`Remove ${area}`}
                    className="w-5 h-5 rounded-full hover:bg-[#007AFF]/20 flex items-center justify-center"
                  >
                    <X className="w-3 h-3" aria-hidden="true" />
                  </button>
                )}
              </span>
            ))
          )}
        </div>

        {/* Add new area */}
        {!isReadOnly && (
          <div className="flex gap-2 mt-2">
            <input
              type="text"
              value={newAreaInput}
              onChange={(e) => setNewAreaInput(e.target.value)}
              onKeyDown={handleAreaInputKeyDown}
              placeholder="e.g. Bathroom, Bedroom 2..."
              className="flex-1 h-12 px-3 rounded-lg border border-gray-200 text-[15px] text-[#1d1d1f] bg-white focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent"
              aria-label="New area name"
            />
            <button
              type="button"
              onClick={handleAddArea}
              disabled={!newAreaInput.trim()}
              className="h-12 px-4 rounded-lg bg-[#007AFF] text-white text-sm font-semibold hover:bg-[#0062cc] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              Add Area
            </button>
          </div>
        )}

        <p className="text-xs text-[#86868b] mt-1.5">
          Pre-populated from the inspection. Tap the × to remove, or add new areas above.
        </p>
      </div>
    </section>
  );
}

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Clock } from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  DEFAULT_INTERVAL_MINUTES,
  MINUTES_PER_DAY,
  buildHourOptions,
  buildMinuteOptions,
  buildPeriodOptions,
  clampToRange,
  formatTimeLabel,
  fromMinutes,
  parseTimeOfDay,
  timeOfDayFromMinutes,
  timeOfDayToMinutes,
  toMinutes,
  type Period,
  type TimeOfDay,
} from '@/lib/utils/timeOfDay';

const DEFAULT_MIN_TIME = '07:00';
const DEFAULT_MAX_TIME = '19:00';

export interface TimePickerProps {
  /** `"HH:mm"` in 24-hour form. Empty string means nothing is chosen yet. */
  value: string;
  onChange: (value: string) => void;
  /**
   * Minute granularity. 1 — the default — makes every minute selectable;
   * raise it to coarsen the picker without touching any call site.
   */
  intervalMinutes?: number;
  minTime?: string;
  maxTime?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  'data-testid'?: string;
}

/**
 * Hour / minute / AM-PM picker for booking times.
 *
 * Deliberately does NOT use `<input type="time">`: iOS substitutes its own wheel
 * and ignores `step`, `min` and `max`, so field technicians get neither the
 * granularity nor the operating-hours bounds the business requires.
 */
export function TimePicker({
  value,
  onChange,
  intervalMinutes = DEFAULT_INTERVAL_MINUTES,
  minTime = DEFAULT_MIN_TIME,
  maxTime = DEFAULT_MAX_TIME,
  id,
  disabled = false,
  className,
  placeholder = 'Select time',
  'data-testid': testId,
}: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const generatedId = useId();
  const panelId = `${id ?? generatedId}-panel`;

  const minTotal = toMinutes(minTime) ?? 0;
  const maxTotal = Math.max(minTotal, toMinutes(maxTime) ?? MINUTES_PER_DAY - 1);

  const parsed = parseTimeOfDay(value);
  const draft = timeOfDayFromMinutes(
    clampToRange(
      parsed ? timeOfDayToMinutes(parsed) : minTotal,
      minTotal,
      maxTotal,
      intervalMinutes,
    ),
  );

  useEffect(() => {
    if (!isOpen) return;

    panelRef.current?.querySelectorAll<HTMLElement>('[aria-selected="true"]').forEach((option) => {
      // jsdom does not implement scrollIntoView, so guard rather than polyfill.
      if (typeof option.scrollIntoView === 'function') option.scrollIntoView({ block: 'center' });
    });
  }, [isOpen]);

  const commit = (patch: Partial<TimeOfDay>) => {
    const total = timeOfDayToMinutes({ ...draft, ...patch });
    onChange(fromMinutes(clampToRange(total, minTotal, maxTotal, intervalMinutes)));
  };

  const hourOptions = buildHourOptions(draft.period, minTotal, maxTotal, intervalMinutes).map(
    (hour12) => ({ key: String(hour12), label: String(hour12) }),
  );
  const minuteOptions = buildMinuteOptions(
    draft.hour12,
    draft.period,
    minTotal,
    maxTotal,
    intervalMinutes,
  ).map((minute) => ({ key: String(minute), label: String(minute).padStart(2, '0') }));
  const periodOptions = buildPeriodOptions(minTotal, maxTotal, intervalMinutes).map((period) => ({
    key: period,
    label: period,
  }));

  return (
    <div className={cn('space-y-2', className)}>
      <button
        type="button"
        id={id}
        data-testid={testId}
        disabled={disabled}
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen((open) => !open)}
        className={cn(
          'flex h-12 w-full items-center justify-between rounded-lg border border-input bg-background px-4 text-base',
          'focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
          !value && 'text-muted-foreground',
        )}
      >
        <span>{value ? formatTimeLabel(value) : placeholder}</span>
        <Clock className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          id={panelId}
          ref={panelRef}
          className="grid grid-cols-3 gap-2 rounded-xl border border-input bg-background p-2"
        >
          <TimeColumn
            label="Hour"
            options={hourOptions}
            selectedKey={String(draft.hour12)}
            onSelect={(key) => commit({ hour12: Number(key) })}
          />
          <TimeColumn
            label="Minute"
            options={minuteOptions}
            selectedKey={String(draft.minute)}
            onSelect={(key) => commit({ minute: Number(key) })}
          />
          <TimeColumn
            label="AM or PM"
            options={periodOptions}
            selectedKey={draft.period}
            onSelect={(key) => commit({ period: key as Period })}
          />
        </div>
      )}
    </div>
  );
}

interface TimeColumnOption {
  key: string;
  label: string;
}

interface TimeColumnProps {
  label: string;
  options: TimeColumnOption[];
  selectedKey: string;
  onSelect: (key: string) => void;
}

/**
 * One scrollable, snapped column. The listbox itself takes focus and tracks the
 * active option via `aria-activedescendant` — with 60 minute rows, a roving
 * tabindex would put 60 stops in the tab order.
 */
function TimeColumn({ label, options, selectedKey, onSelect }: TimeColumnProps) {
  const listId = useId();
  const optionId = (key: string) => `${listId}-${key}`;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = options.findIndex((option) => option.key === selectedKey);
    let nextIndex: number;

    if (event.key === 'ArrowDown') nextIndex = Math.min(options.length - 1, index + 1);
    else if (event.key === 'ArrowUp') nextIndex = Math.max(0, index - 1);
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = options.length - 1;
    else return;

    event.preventDefault();
    const next = options[nextIndex];
    if (next && next.key !== selectedKey) onSelect(next.key);
  };

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="px-1 text-xs font-medium text-muted-foreground">{label}</span>
      <div
        role="listbox"
        aria-label={label}
        aria-activedescendant={optionId(selectedKey)}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="max-h-60 snap-y snap-mandatory overflow-y-auto rounded-lg border border-input focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {options.map((option) => {
          const isSelected = option.key === selectedKey;
          return (
            <div
              key={option.key}
              id={optionId(option.key)}
              role="option"
              aria-selected={isSelected}
              onClick={() => onSelect(option.key)}
              className={cn(
                'flex h-12 cursor-pointer snap-center items-center justify-center text-base tabular-nums',
                isSelected ? 'bg-primary font-semibold text-primary-foreground' : 'text-foreground',
              )}
            >
              {option.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}

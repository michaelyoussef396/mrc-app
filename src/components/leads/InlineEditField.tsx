import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, Pencil, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type InlineEditVariant = "text" | "email" | "phone" | "textarea" | "select";

export interface InlineEditSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface InlineEditFieldProps {
  /** Label shown to the left of the value (e.g. "Phone"). */
  label: string;
  /** Current persisted value. null/empty renders the empty-state CTA. */
  value: string | null;
  variant: InlineEditVariant;
  /** Required when variant='select'. Sectioning is handled by the caller via group labels. */
  selectOptions?: InlineEditSelectOption[];
  /** Placeholder when the input is empty (edit mode). */
  placeholder?: string;
  /** Character cap. Drives a counter under textareas. */
  maxLength?: number;
  /** Inline validator. Returns an error string to display, or null when valid. */
  validate?: (val: string) => string | null;
  /** Called on Save with the trimmed new value. Return true on success. */
  onSave: (newValue: string) => Promise<boolean>;
  /** Optional read-mode renderer (e.g. wrap phone in a tel: link). Falls back to the raw value. */
  renderReadOnly?: (value: string) => ReactNode;
  /** Empty-state CTA label when value is null/empty (e.g. "Add phone"). */
  emptyLabel?: string;
  /** Format the draft value as the user types (e.g. phone-number formatter). */
  formatOnChange?: (val: string) => string;
  /** Hide the pencil affordance entirely (read-only field). */
  readOnly?: boolean;
}

/**
 * One-row field with a pencil affordance for inline editing.
 * Read mode → label + value/empty-CTA + pencil button.
 * Edit mode → label + Input/Textarea/Select + Save (✓) + Cancel (✗) buttons.
 *
 * Keyboard:
 *   Enter        → Save (text/email/phone variants only — Textarea preserves newlines).
 *   Escape       → Cancel (any variant).
 *
 * Save flow:
 *   - validate(draft) runs first. Error renders inline; Save is blocked.
 *   - draft === current value → treat as Cancel (no-op, no save).
 *   - onSave returns false → stay in edit mode (caller toasts the failure).
 *   - onSave returns true → return to read mode.
 *
 * Touch targets: pencil/save/cancel buttons are 48×48 minimum (h-12 w-12).
 */
export function InlineEditField({
  label,
  value,
  variant,
  selectOptions,
  placeholder,
  maxLength,
  validate,
  onSave,
  renderReadOnly,
  emptyLabel = "Add",
  formatOnChange,
  readOnly = false,
}: InlineEditFieldProps) {
  const [mode, setMode] = useState<"read" | "edit" | "saving">("read");
  const [draft, setDraft] = useState<string>(value ?? "");
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Sync draft when external value changes while NOT editing
  useEffect(() => {
    if (mode === "read") setDraft(value ?? "");
  }, [value, mode]);

  // Auto-focus the input on entering edit mode
  useEffect(() => {
    if (mode !== "edit") return;
    if (variant === "textarea") {
      textareaRef.current?.focus();
      // place caret at end
      const len = textareaRef.current?.value.length ?? 0;
      textareaRef.current?.setSelectionRange(len, len);
    } else if (variant !== "select") {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [mode, variant]);

  const enterEdit = () => {
    setDraft(value ?? "");
    setError(null);
    setMode("edit");
  };

  const cancel = () => {
    setDraft(value ?? "");
    setError(null);
    setMode("read");
  };

  const save = async () => {
    const trimmed = draft.trim();
    const validationError = validate?.(trimmed) ?? null;
    if (validationError) {
      setError(validationError);
      return;
    }
    // No-op if unchanged — silently return to read mode
    if (trimmed === (value ?? "").trim()) {
      setMode("read");
      return;
    }
    setMode("saving");
    const success = await onSave(trimmed);
    if (success) {
      setMode("read");
    } else {
      // Caller already showed a toast; stay in edit mode so user can retry
      setMode("edit");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      cancel();
      return;
    }
    // Enter saves on single-line variants (textarea preserves newlines)
    if (e.key === "Enter" && variant !== "textarea" && variant !== "select") {
      e.preventDefault();
      void save();
    }
  };

  const handleDraftChange = (raw: string) => {
    const next = formatOnChange ? formatOnChange(raw) : raw;
    setDraft(next);
    if (error) setError(null);
  };

  // ── READ MODE ───────────────────────────────────────────────────────────
  if (mode === "read") {
    const hasValue = value !== null && value !== "";
    return (
      <div className="flex items-start justify-between gap-2 group">
        <span className="text-sm text-gray-500 pt-2.5">{label}</span>
        <div className="flex items-center gap-1 min-w-0">
          {hasValue ? (
            <span className="text-sm font-medium text-right break-words py-2.5">
              {renderReadOnly ? renderReadOnly(value) : value}
            </span>
          ) : (
            <button
              type="button"
              onClick={readOnly ? undefined : enterEdit}
              disabled={readOnly}
              className="text-sm italic text-muted-foreground hover:text-foreground py-2.5 disabled:cursor-not-allowed"
            >
              {emptyLabel}
            </button>
          )}
          {!readOnly && (
            <button
              type="button"
              onClick={enterEdit}
              aria-label={`Edit ${label}`}
              className="h-12 w-12 flex items-center justify-center rounded-md text-muted-foreground hover:bg-slate-100 hover:text-foreground transition-colors flex-shrink-0"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── EDIT MODE ───────────────────────────────────────────────────────────
  const isSaving = mode === "saving";

  return (
    <div className="space-y-1.5">
      <div className="flex items-start gap-2">
        <span className="text-sm text-gray-500 pt-2.5 flex-shrink-0">{label}</span>
        <div className="flex-1 min-w-0">
          {variant === "textarea" ? (
            <Textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => handleDraftChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              maxLength={maxLength}
              disabled={isSaving}
              className="min-h-[100px]"
            />
          ) : variant === "select" ? (
            <Select
              value={draft}
              onValueChange={(v) => {
                setDraft(v);
                if (error) setError(null);
              }}
              disabled={isSaving}
            >
              <SelectTrigger className="h-12">
                <SelectValue placeholder={placeholder ?? "Select..."} />
              </SelectTrigger>
              <SelectContent>
                {selectOptions?.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} disabled={opt.disabled}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              ref={inputRef}
              type={variant === "email" ? "email" : variant === "phone" ? "tel" : "text"}
              value={draft}
              onChange={(e) => handleDraftChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              maxLength={maxLength}
              disabled={isSaving}
              className="h-12"
            />
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={() => void save()}
            disabled={isSaving}
            aria-label="Save"
            className="h-12 w-12 flex items-center justify-center rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={cancel}
            disabled={isSaving}
            aria-label="Cancel"
            className="h-12 w-12 flex items-center justify-center rounded-md text-muted-foreground hover:bg-slate-100 hover:text-foreground disabled:opacity-50 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Inline validation error */}
      {error && (
        <p className="text-xs text-destructive ml-[calc(theme(spacing.20)+theme(spacing.2))]">
          {error}
        </p>
      )}

      {/* Character counter for textarea */}
      {variant === "textarea" && maxLength !== undefined && (
        <p className="text-xs text-muted-foreground text-right">
          {draft.length}/{maxLength} characters
        </p>
      )}
    </div>
  );
}

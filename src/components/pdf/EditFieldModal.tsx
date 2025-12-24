// EditFieldModal Component
// Modal-based field editing for Smart Overlay PDF system
// Mobile-first design with 48px touch targets

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Loader2, Save, X } from 'lucide-react'
import { toast } from 'sonner'
import { updateFieldAndRegenerate } from '@/lib/api/pdfGeneration'

interface EditableField {
  field_key: string
  field_label: string
  field_type: 'text' | 'number' | 'currency' | 'date' | 'textarea'
  field_table?: string
  field_column?: string
  edit_icon_position?: {
    x: number
    y: number
    page: number
  }
  validation_rules?: {
    required?: boolean
    min?: number
    max?: number
    pattern?: string
    maxLength?: number
  }
}

interface EditFieldModalProps {
  /** The inspection ID */
  inspectionId: string
  /** The field metadata */
  field: EditableField | null
  /** Current value of the field */
  currentValue: string | number | null
  /** Whether the modal is open */
  isOpen: boolean
  /** Callback when modal closes */
  onClose: () => void
  /** Callback when field is successfully updated */
  onSuccess: () => void
}

export function EditFieldModal({
  inspectionId,
  field,
  currentValue,
  isOpen,
  onClose,
  onSuccess
}: EditFieldModalProps) {
  const [value, setValue] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset value when field changes
  useEffect(() => {
    if (field && currentValue !== null && currentValue !== undefined) {
      // Format value based on field type
      if (field.field_type === 'currency') {
        // Remove $ and commas for editing
        const numValue = String(currentValue).replace(/[$,]/g, '')
        setValue(numValue)
      } else if (field.field_type === 'date') {
        // Convert to YYYY-MM-DD for date input
        if (typeof currentValue === 'string' && currentValue.includes('/')) {
          const [day, month, year] = currentValue.split('/')
          setValue(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`)
        } else {
          setValue(String(currentValue))
        }
      } else {
        setValue(String(currentValue))
      }
    } else {
      setValue('')
    }
    setError(null)
  }, [field, currentValue])

  const validate = (): boolean => {
    if (!field) return false

    const rules = field.validation_rules || {}

    // Required check
    if (rules.required && !value.trim()) {
      setError('This field is required')
      return false
    }

    // Number/currency validation
    if (field.field_type === 'number' || field.field_type === 'currency') {
      const numValue = parseFloat(value)
      if (isNaN(numValue)) {
        setError('Please enter a valid number')
        return false
      }
      if (rules.min !== undefined && numValue < rules.min) {
        setError(`Value must be at least ${rules.min}`)
        return false
      }
      if (rules.max !== undefined && numValue > rules.max) {
        setError(`Value must be at most ${rules.max}`)
        return false
      }
    }

    // Max length check
    if (rules.maxLength && value.length > rules.maxLength) {
      setError(`Maximum ${rules.maxLength} characters allowed`)
      return false
    }

    // Pattern check
    if (rules.pattern) {
      const regex = new RegExp(rules.pattern)
      if (!regex.test(value)) {
        setError('Invalid format')
        return false
      }
    }

    setError(null)
    return true
  }

  const handleSave = async () => {
    if (!field || !validate()) return

    setSaving(true)
    toast.loading('Updating field...', { id: 'field-update' })

    try {
      // Convert value based on type
      let finalValue: string | number = value

      if (field.field_type === 'number' || field.field_type === 'currency') {
        finalValue = parseFloat(value)
      } else if (field.field_type === 'date') {
        // Convert back to DD/MM/YYYY for Australian format
        if (value.includes('-')) {
          const [year, month, day] = value.split('-')
          finalValue = `${day}/${month}/${year}`
        }
      }

      const result = await updateFieldAndRegenerate(
        inspectionId,
        field.field_key,
        finalValue
      )

      if (result.success) {
        toast.success('Field updated successfully!', { id: 'field-update' })
        onSuccess()
        onClose()
      } else {
        toast.error(result.error || 'Failed to update field', { id: 'field-update' })
        setError(result.error || 'Failed to update field')
      }
    } catch (err) {
      console.error('Save error:', err)
      toast.error('Failed to save changes', { id: 'field-update' })
      setError('An unexpected error occurred')
    } finally {
      setSaving(false)
    }
  }

  const renderInput = () => {
    if (!field) return null

    const commonClasses = "h-14 min-h-[56px] text-lg"

    switch (field.field_type) {
      case 'textarea':
        return (
          <Textarea
            id="field-value"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={`Enter ${field.field_label.toLowerCase()}`}
            className="min-h-[120px] text-lg resize-none"
            disabled={saving}
          />
        )

      case 'currency':
        return (
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-lg">
              $
            </span>
            <Input
              id="field-value"
              type="number"
              step="0.01"
              min="0"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="0.00"
              className={`${commonClasses} pl-8`}
              disabled={saving}
            />
          </div>
        )

      case 'number':
        return (
          <Input
            id="field-value"
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={`Enter ${field.field_label.toLowerCase()}`}
            className={commonClasses}
            disabled={saving}
          />
        )

      case 'date':
        return (
          <Input
            id="field-value"
            type="date"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className={commonClasses}
            disabled={saving}
          />
        )

      default:
        return (
          <Input
            id="field-value"
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={`Enter ${field.field_label.toLowerCase()}`}
            className={commonClasses}
            disabled={saving}
          />
        )
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Edit {field?.field_label || 'Field'}
          </DialogTitle>
          <DialogDescription>
            {field?.edit_icon_position?.page && `Page ${field.edit_icon_position.page}`}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Label htmlFor="field-value" className="text-base font-medium mb-2 block">
            {field?.field_label}
            {field?.validation_rules?.required && (
              <span className="text-red-500 ml-1">*</span>
            )}
          </Label>

          {renderInput()}

          {error && (
            <p className="text-red-500 text-sm mt-2">{error}</p>
          )}

          {field?.field_type === 'currency' && (
            <p className="text-gray-500 text-sm mt-2">
              Enter amount in AUD (excluding GST)
            </p>
          )}
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className="h-12 min-h-[48px] flex-1"
          >
            <X className="h-5 w-5 mr-2" />
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="h-12 min-h-[48px] flex-1 bg-orange-600 hover:bg-orange-700"
          >
            {saving ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-5 w-5 mr-2" />
                Save & Regenerate
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default EditFieldModal

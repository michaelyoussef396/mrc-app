// EditFieldsPanel Component
// Side panel showing all editable fields for Smart Overlay PDF editing
// Mobile-first design with 48px touch targets

import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger
} from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Edit,
  FileText,
  User,
  MapPin,
  Calendar,
  DollarSign,
  ThermometerSun,
  ClipboardList,
  Loader2
} from 'lucide-react'
import { EditFieldModal } from './EditFieldModal'

interface EditableField {
  field_key: string
  field_label: string
  field_type: 'text' | 'number' | 'currency' | 'date' | 'textarea'
  field_table: string
  field_column: string
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

interface FieldValue {
  key: string
  value: string | number | null
}

interface EditFieldsPanelProps {
  /** The inspection ID */
  inspectionId: string
  /** Callback when a field is updated */
  onFieldUpdated: () => void
  /** Whether panel is visible */
  isVisible: boolean
}

// Get page number from edit_icon_position
function getPageNumber(field: EditableField): number {
  return field.edit_icon_position?.page || 0
}

// Get icon for page number
function getPageIcon(pageNumber: number) {
  switch (pageNumber) {
    case 1:
      return <User className="h-4 w-4" />
    case 2:
      return <MapPin className="h-4 w-4" />
    case 3:
      return <ClipboardList className="h-4 w-4" />
    case 5:
      return <ThermometerSun className="h-4 w-4" />
    case 6:
      return <DollarSign className="h-4 w-4" />
    default:
      return <FileText className="h-4 w-4" />
  }
}

// Format value for display
function formatValue(value: string | number | null, fieldType: string): string {
  if (value === null || value === undefined || value === '') {
    return '(not set)'
  }

  if (fieldType === 'currency') {
    const num = typeof value === 'string' ? parseFloat(value) : value
    return `$${num.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  return String(value)
}

export function EditFieldsPanel({
  inspectionId,
  onFieldUpdated,
  isVisible
}: EditFieldsPanelProps) {
  const [fields, setFields] = useState<EditableField[]>([])
  const [fieldValues, setFieldValues] = useState<Record<string, string | number | null>>({})
  const [loading, setLoading] = useState(true)
  const [selectedField, setSelectedField] = useState<EditableField | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Load editable fields metadata
  useEffect(() => {
    loadFields()
  }, [])

  // Load field values when inspection ID changes
  useEffect(() => {
    if (inspectionId && fields.length > 0) {
      loadFieldValues()
    }
  }, [inspectionId, fields])

  async function loadFields() {
    try {
      const { data, error } = await supabase
        .from('editable_fields')
        .select('*')
        .eq('is_active', true)
        .order('page_number')
        .order('field_label')

      if (error) throw error

      setFields(data as EditableField[] || [])
    } catch (error) {
      console.error('Failed to load editable fields:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadFieldValues() {
    try {
      // Fetch inspection with lead data
      const { data: inspection, error } = await supabase
        .from('inspections')
        .select(`
          *,
          lead:leads(*)
        `)
        .eq('id', inspectionId)
        .single()

      if (error) throw error

      // Build field values map
      const values: Record<string, string | number | null> = {}

      fields.forEach((field) => {
        // Map field keys to actual data
        switch (field.field_key) {
          case 'client_name':
            values[field.field_key] = inspection.lead?.full_name || null
            break
          case 'property_address':
            values[field.field_key] = inspection.lead
              ? `${inspection.lead.property_address_street}, ${inspection.lead.property_address_suburb}`
              : null
            break
          case 'property_type':
            values[field.field_key] = inspection.lead?.property_type || null
            break
          case 'inspection_date':
            values[field.field_key] = inspection.inspection_date || null
            break
          case 'inspector_name':
            values[field.field_key] = inspection.inspector_name || null
            break
          case 'what_we_found':
            values[field.field_key] = inspection.what_we_found || null
            break
          case 'cause_of_mould':
            values[field.field_key] = inspection.cause_of_mould || null
            break
          case 'outdoor_temperature':
            values[field.field_key] = inspection.outdoor_temperature || null
            break
          case 'outdoor_humidity':
            values[field.field_key] = inspection.outdoor_humidity || null
            break
          case 'labor_cost':
            values[field.field_key] = inspection.labor_cost_ex_gst || null
            break
          case 'equipment_cost':
            values[field.field_key] = inspection.equipment_cost_ex_gst || null
            break
          case 'total_cost':
            values[field.field_key] = inspection.total_cost_ex_gst || null
            break
          default:
            // Try to get from inspection directly
            values[field.field_key] = (inspection as any)[field.field_key] || null
        }
      })

      setFieldValues(values)
    } catch (error) {
      console.error('Failed to load field values:', error)
    }
  }

  const handleEditField = (field: EditableField) => {
    setSelectedField(field)
    setIsModalOpen(true)
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setSelectedField(null)
  }

  const handleFieldUpdated = () => {
    loadFieldValues()
    onFieldUpdated()
  }

  // Group fields by page
  const fieldsByPage = fields.reduce((acc, field) => {
    const page = getPageNumber(field)
    if (!acc[page]) acc[page] = []
    acc[page].push(field)
    return acc
  }, {} as Record<number, EditableField[]>)

  if (!isVisible) return null

  return (
    <>
      <div className="bg-white border-l border-gray-200 w-full md:w-80 h-full flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Edit className="h-5 w-5 text-orange-600" />
            Edit Report Fields
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Click any field to edit and regenerate the PDF
          </p>
        </div>

        <ScrollArea className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
            </div>
          ) : (
            <div className="p-4 space-y-6">
              {Object.entries(fieldsByPage).map(([page, pageFields]) => (
                <div key={page}>
                  <div className="flex items-center gap-2 mb-3">
                    {getPageIcon(parseInt(page))}
                    <Badge variant="outline" className="font-medium">
                      Page {page}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    {pageFields.map((field) => (
                      <Card
                        key={field.field_key}
                        className="cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => handleEditField(field)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">
                                {field.field_label}
                              </p>
                              <p className="text-sm text-gray-600 truncate mt-0.5">
                                {formatValue(fieldValues[field.field_key], field.field_type)}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-10 w-10 min-h-[40px] min-w-[40px] shrink-0"
                            >
                              <Edit className="h-4 w-4 text-gray-500" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Edit Modal */}
      <EditFieldModal
        inspectionId={inspectionId}
        field={selectedField}
        currentValue={selectedField ? fieldValues[selectedField.field_key] : null}
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={handleFieldUpdated}
      />
    </>
  )
}

export default EditFieldsPanel

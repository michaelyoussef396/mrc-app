import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
  Camera,
  Loader2,
  Save,
  ImageIcon,
} from 'lucide-react'
import { uploadInspectionPhoto, deleteInspectionPhoto, getPhotoSignedUrl } from '@/lib/utils/photoUpload'
import { resizePhoto } from '@/lib/offline/photoResizer'
import { loadInspectionAreas } from '@/lib/api/inspections'

interface Page1EditSheetProps {
  inspectionId: string
  leadId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

interface FormData {
  requested_by: string
  attention_to: string
  inspection_date: string
  inspector_name: string
  dwelling_type: string
  property_address_street: string
  property_address_suburb: string
  property_address_state: string
  property_address_postcode: string
}

const DWELLING_TYPES = [
  { value: 'house', label: 'House' },
  { value: 'units', label: 'Units' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'duplex', label: 'Duplex' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'construction', label: 'Construction' },
  { value: 'industrial', label: 'Industrial' },
]

export function Page1EditSheet({
  inspectionId,
  leadId,
  open,
  onOpenChange,
  onSaved,
}: Page1EditSheetProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    requested_by: '',
    attention_to: '',
    inspection_date: '',
    inspector_name: '',
    dwelling_type: '',
    property_address_street: '',
    property_address_suburb: '',
    property_address_state: '',
    property_address_postcode: '',
  })
  const [coverPhotoUrl, setCoverPhotoUrl] = useState<string | null>(null)
  const [coverPhotoId, setCoverPhotoId] = useState<string | null>(null)
  const [examinedAreas, setExaminedAreas] = useState<string[]>([])
  const [hasSnapshot, setHasSnapshot] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open && inspectionId) {
      loadData()
    }
  }, [open, inspectionId])

  async function loadData() {
    setLoading(true)
    try {
      const [inspectionResult, areasData, photosResult] = await Promise.all([
        supabase
          .from('inspections')
          .select(`
            requested_by,
            attention_to,
            inspection_date,
            inspector_name,
            dwelling_type,
            property_address_snapshot,
            lead:leads(
              full_name,
              property_type,
              property_address_street,
              property_address_suburb,
              property_address_state,
              property_address_postcode
            )
          `)
          .eq('id', inspectionId)
          .single(),
        loadInspectionAreas(inspectionId),
        supabase
          .from('photos')
          .select('id, storage_path, caption, photo_type')
          .eq('inspection_id', inspectionId)
          .eq('photo_type', 'outdoor')
          .order('created_at', { ascending: false }),
      ])

      if (inspectionResult.error) throw inspectionResult.error

      const inspection = inspectionResult.data
      const lead = inspection.lead as Record<string, string> | null

      // Property type: leads.property_type first, fallback to inspections.dwelling_type
      const propertyType = lead?.property_type || inspection.dwelling_type || ''

      setFormData({
        requested_by: inspection.requested_by || lead?.full_name || '',
        attention_to: inspection.attention_to || lead?.full_name || '',
        inspection_date: inspection.inspection_date || '',
        inspector_name: inspection.inspector_name || '',
        dwelling_type: propertyType,
        property_address_street: lead?.property_address_street || '',
        property_address_suburb: lead?.property_address_suburb || '',
        property_address_state: lead?.property_address_state || 'VIC',
        property_address_postcode: lead?.property_address_postcode || '',
      })

      setHasSnapshot(!!inspection.property_address_snapshot)

      setExaminedAreas(areasData.map((a: { area_name: string }) => a.area_name))

      // Load cover photo - prioritize front_house caption
      const photos = photosResult.data || []
      const coverPhoto = photos.find((p: { caption: string | null }) => p.caption === 'front_house') || photos[0]
      if (coverPhoto) {
        setCoverPhotoId(coverPhoto.id)
        try {
          const url = await getPhotoSignedUrl(coverPhoto.storage_path)
          setCoverPhotoUrl(url)
        } catch {
          setCoverPhotoUrl(null)
        }
      } else {
        setCoverPhotoId(null)
        setCoverPhotoUrl(null)
      }
    } catch (error) {
      console.error('Failed to load Page 1 data:', error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const resizedBlob = await resizePhoto(file)
      const resizedFile = new File([resizedBlob], file.name, { type: 'image/jpeg' })

      // Delete existing cover photo if present
      if (coverPhotoId) {
        try {
          await deleteInspectionPhoto(coverPhotoId)
        } catch (error) {
          console.error('Failed to delete old cover photo:', error)
        }
      }

      const result = await uploadInspectionPhoto(resizedFile, {
        inspection_id: inspectionId,
        photo_type: 'outdoor',
        caption: 'front_house',
        order_index: 0,
      })

      setCoverPhotoId(result.photo_id)
      setCoverPhotoUrl(result.signed_url)
      toast.success('Cover photo updated')
    } catch (error) {
      console.error('Photo upload failed:', error)
      toast.error('Failed to upload photo')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      // 1. Address snapshot logic - only on first address edit
      if (!hasSnapshot) {
        const { data: currentLead } = await supabase
          .from('leads')
          .select('property_address_street, property_address_suburb, property_address_state, property_address_postcode')
          .eq('id', leadId)
          .single()

        if (currentLead) {
          const currentAddress = [
            currentLead.property_address_street,
            currentLead.property_address_suburb,
            currentLead.property_address_state,
            currentLead.property_address_postcode,
          ].filter(Boolean).join(', ')

          const newAddress = [
            formData.property_address_street,
            formData.property_address_suburb,
            formData.property_address_state,
            formData.property_address_postcode,
          ].filter(Boolean).join(', ')

          if (currentAddress !== newAddress) {
            await supabase
              .from('inspections')
              .update({ property_address_snapshot: currentAddress })
              .eq('id', inspectionId)
            setHasSnapshot(true)
          }
        }
      }

      // 2. Update leads table with address + property_type
      const { error: leadError } = await supabase
        .from('leads')
        .update({
          property_address_street: formData.property_address_street,
          property_address_suburb: formData.property_address_suburb,
          property_address_state: formData.property_address_state,
          property_address_postcode: formData.property_address_postcode,
          property_type: formData.dwelling_type || null,
        })
        .eq('id', leadId)

      if (leadError) throw leadError

      // 3. Update inspections table with report fields + dwelling_type
      const { error: inspError } = await supabase
        .from('inspections')
        .update({
          requested_by: formData.requested_by || null,
          attention_to: formData.attention_to || null,
          inspection_date: formData.inspection_date || null,
          inspector_name: formData.inspector_name || null,
          dwelling_type: formData.dwelling_type || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', inspectionId)

      if (inspError) throw inspError

      toast.success('Page 1 details saved')
      onSaved()
    } catch (error) {
      console.error('Save failed:', error)
      toast.error('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  function updateField(field: keyof FormData, value: string) {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 flex flex-col"
      >
        <SheetHeader className="p-4 pb-2 border-b">
          <SheetTitle>Edit Page 1</SheetTitle>
          <SheetDescription className="sr-only">
            Update cover page details for the inspection report
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                {/* 1. Ordered By */}
                <div>
                  <Label htmlFor="ordered_by" className="text-sm font-medium">Ordered By</Label>
                  <Input
                    id="ordered_by"
                    value={formData.requested_by}
                    onChange={(e) => updateField('requested_by', e.target.value)}
                    placeholder="Client name"
                    className="mt-1 h-12 min-h-[48px]"
                  />
                </div>

                {/* 2. Inspector */}
                <div>
                  <Label htmlFor="inspector" className="text-sm font-medium">Inspector</Label>
                  <Input
                    id="inspector"
                    value={formData.inspector_name}
                    onChange={(e) => updateField('inspector_name', e.target.value)}
                    placeholder="Inspector name"
                    className="mt-1 h-12 min-h-[48px]"
                  />
                </div>

                {/* 3. Date */}
                <div>
                  <Label htmlFor="inspection_date" className="text-sm font-medium">Date</Label>
                  <Input
                    id="inspection_date"
                    type="date"
                    value={formData.inspection_date}
                    onChange={(e) => updateField('inspection_date', e.target.value)}
                    className="mt-1 h-12 min-h-[48px]"
                  />
                </div>

                {/* 4. Directed To */}
                <div>
                  <Label htmlFor="directed_to" className="text-sm font-medium">Directed To</Label>
                  <Input
                    id="directed_to"
                    value={formData.attention_to}
                    onChange={(e) => updateField('attention_to', e.target.value)}
                    placeholder="Recipient name"
                    className="mt-1 h-12 min-h-[48px]"
                  />
                </div>

                {/* 5. Property Type */}
                <div>
                  <Label htmlFor="property_type" className="text-sm font-medium">Property Type</Label>
                  <Select
                    value={formData.dwelling_type}
                    onValueChange={(value) => updateField('dwelling_type', value)}
                  >
                    <SelectTrigger id="property_type" className="mt-1 h-12 min-h-[48px]">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {DWELLING_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 6. Examined Areas (read-only) */}
                <div>
                  <Label className="text-sm font-medium text-gray-500">Examined Areas (read-only)</Label>
                  <div className="mt-1 bg-gray-50 rounded-lg p-3 border">
                    {examinedAreas.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {examinedAreas.map((area) => (
                          <span
                            key={area}
                            className="px-2.5 py-1 bg-white border rounded-full text-sm text-gray-700"
                          >
                            {area}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No areas added yet</p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      Edit in Inspection Form
                    </p>
                  </div>
                </div>

                {/* 7. Address */}
                <div>
                  <Label className="text-sm font-medium">Address</Label>
                  <div className="mt-1 space-y-3">
                    <div>
                      <Label htmlFor="street" className="text-xs text-gray-500">Street</Label>
                      <Input
                        id="street"
                        value={formData.property_address_street}
                        onChange={(e) => updateField('property_address_street', e.target.value)}
                        placeholder="123 Example St"
                        className="h-12 min-h-[48px]"
                      />
                    </div>
                    <div>
                      <Label htmlFor="suburb" className="text-xs text-gray-500">Suburb</Label>
                      <Input
                        id="suburb"
                        value={formData.property_address_suburb}
                        onChange={(e) => updateField('property_address_suburb', e.target.value)}
                        placeholder="Melbourne"
                        className="h-12 min-h-[48px]"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="state" className="text-xs text-gray-500">State</Label>
                        <Input
                          id="state"
                          value={formData.property_address_state}
                          onChange={(e) => updateField('property_address_state', e.target.value)}
                          placeholder="VIC"
                          className="h-12 min-h-[48px]"
                        />
                      </div>
                      <div>
                        <Label htmlFor="postcode" className="text-xs text-gray-500">Postcode</Label>
                        <Input
                          id="postcode"
                          value={formData.property_address_postcode}
                          onChange={(e) => updateField('property_address_postcode', e.target.value)}
                          placeholder="3000"
                          className="h-12 min-h-[48px]"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 8. Front House Photo */}
                <div>
                  <Label className="text-sm font-medium">Front House Photo</Label>
                  <div className="mt-1 rounded-lg border overflow-hidden bg-gray-50">
                    {coverPhotoUrl ? (
                      <img
                        src={coverPhotoUrl}
                        alt="Front of house"
                        className="w-40 h-40 object-cover mx-auto"
                      />
                    ) : (
                      <div className="h-32 flex items-center justify-center">
                        <ImageIcon className="h-12 w-12 text-gray-300" />
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="w-full rounded-none border-x-0 border-b-0 h-12 min-h-[48px]"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Camera className="h-4 w-4 mr-2" />
                          {coverPhotoUrl ? 'Change Photo' : 'Add Photo'}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </ScrollArea>

            {/* Footer: Cancel + Save */}
            <div className="p-4 border-t bg-white flex gap-3">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1 h-12 min-h-[48px]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 h-12 min-h-[48px] bg-orange-600 hover:bg-orange-700 text-white"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save & Regen
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

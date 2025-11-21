import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, useLocation, useParams } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { calculateDewPoint, generateJobNumber, calculateJobCost, formatCurrency } from '@/lib/inspectionUtils'
import type { InspectionFormData, InspectionArea, MoistureReading, SubfloorReading, Photo } from '@/types/inspection'
import { TopNavbar } from '@/components/layout/TopNavbar'
import { uploadInspectionPhoto, uploadMultiplePhotos, getPhotoSignedUrl, loadInspectionPhotos } from '@/lib/utils/photoUpload'
import {
  createInspection,
  updateInspection,
  saveInspectionArea,
  deleteInspectionArea,
  getInspectionByLeadId,
  getInspection,
  type InspectionData,
  type InspectionAreaData
} from '@/lib/api/inspections'
import {
  Sparkles,
  FileText,
  Home,
  MapPin,
  ArrowDown,
  Cloud,
  Trash2,
  Wrench,
  ClipboardList,
  DollarSign,
  Save,
  X,
  Camera,
  Thermometer,
  Droplets
} from 'lucide-react'

const InspectionForm = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()
  const [searchParams] = useSearchParams()
  const { id: inspectionId } = useParams<{ id: string }>()
  const leadId = searchParams.get('leadId')
  const passedLead = location.state?.lead
  
  
  const [currentSection, setCurrentSection] = useState(0)
  const [lead, setLead] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [currentInspectionId, setCurrentInspectionId] = useState<string | null>(null)
  const [technicians, setTechnicians] = useState<Array<{ id: string; name: string }>>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // Map frontend area IDs to database area IDs
  // Key: frontend UUID (area.id), Value: database UUID (inspection_areas.id)
  const [areaIdMapping, setAreaIdMapping] = useState<Record<string, string>>({})
  
  const [formData, setFormData] = useState<InspectionFormData>({
    jobNumber: generateJobNumber(),
    triage: '',
    address: '',
    inspector: '',
    requestedBy: '',
    attentionTo: '',
    inspectionDate: new Date().toISOString().split('T')[0],
    propertyOccupation: '',
    dwellingType: '',
    areas: [{
      id: crypto.randomUUID(),
      areaName: '',
      mouldVisibility: [],
      commentsForReport: '',
      temperature: '',
      humidity: '',
      dewPoint: '',
      moistureReadingsEnabled: false,
      moistureReadings: [],
      internalNotes: '',
      roomViewPhotos: [],
      infraredEnabled: false,
      infraredPhoto: null,
      naturalInfraredPhoto: null,
      infraredObservations: [],
      timeWithoutDemo: 0,
      demolitionRequired: false,
      demolitionTime: 0,
      demolitionDescription: ''
    }],
    subfloorEnabled: false,
    subfloorObservations: '',
    subfloorLandscape: '',
    subfloorComments: '',
    subfloorReadings: [],
    subfloorPhotos: [],
    subfloorSanitation: false,
    subfloorRacking: false,
    subfloorTreatmentTime: 0,
    outdoorTemperature: '',
    outdoorHumidity: '',
    outdoorDewPoint: '',
    outdoorComments: '',
    frontDoorPhoto: null,
    frontHousePhoto: null,
    mailboxPhoto: null,
    streetPhoto: null,
    directionPhotosEnabled: false,
    directionPhoto: null,
    wasteDisposalEnabled: false,
    wasteDisposalAmount: '',
    hepaVac: false,
    antimicrobial: false,
    stainRemovingAntimicrobial: false,
    homeSanitationFogging: false,
    dryingEquipmentEnabled: false,
    commercialDehumidifierEnabled: false,
    commercialDehumidifierQty: 0,
    airMoversEnabled: false,
    airMoversQty: 0,
    rcdBoxEnabled: false,
    rcdBoxQty: 0,
    recommendDehumidifier: false,
    dehumidifierSize: '',
    causeOfMould: '',
    additionalInfoForTech: '',
    additionalEquipmentComments: '',
    parkingOptions: '',
    estimatedDays: 1,
    laborCost: 0,
    equipmentCost: 0,
    subtotal: 0,
    gst: 0,
    totalCost: 0
  })

  const sections = [
    { id: 0, title: 'Basic Information', icon: <FileText size={40} strokeWidth={2} /> },
    { id: 1, title: 'Property Details', icon: <Home size={40} strokeWidth={2} /> },
    { id: 2, title: 'Area Inspection', icon: <MapPin size={40} strokeWidth={2} /> },
    { id: 3, title: 'Subfloor', icon: <ArrowDown size={40} strokeWidth={2} /> },
    { id: 4, title: 'Outdoor Info', icon: <Cloud size={40} strokeWidth={2} /> },
    { id: 5, title: 'Waste Disposal', icon: <Trash2 size={40} strokeWidth={2} /> },
    { id: 6, title: 'Work Procedure', icon: <Wrench size={40} strokeWidth={2} /> },
    { id: 7, title: 'Job Summary', icon: <ClipboardList size={40} strokeWidth={2} /> },
    { id: 8, title: 'Cost Estimate', icon: <DollarSign size={40} strokeWidth={2} /> }
  ]

  // Load user and lead data on mount
  useEffect(() => {
    loadLeadData()
    loadCurrentUser()
  }, [leadId, inspectionId])

  // Load technicians only after currentUserId is available
  useEffect(() => {
    if (currentUserId) {
      loadTechnicians()
    }
  }, [currentUserId])

  useEffect(() => {
    // Auto-save 30 seconds after last change (debounced)
    // Only auto-save if we have an inspection ID (form has been saved at least once)
    if (!currentInspectionId) return

    const timeoutId = setTimeout(() => {
      autoSave()
    }, 30000) // 30 seconds

    return () => clearTimeout(timeoutId)
  }, [formData, currentInspectionId])

  useEffect(() => {
    // Recalculate cost whenever relevant fields change
    recalculateCost()
  }, [
    formData.areas,
    formData.subfloorEnabled,
    formData.subfloorTreatmentTime,
    formData.commercialDehumidifierQty,
    formData.airMoversQty,
    formData.rcdBoxQty,
    formData.estimatedDays
  ])

  const loadLeadData = async () => {
    setLoading(true)

    // MODE 1: Load existing inspection by ID (from URL path /inspection/:id)
    if (inspectionId) {
      try {
        console.log('📋 Loading existing inspection by ID:', inspectionId)
        const { data: inspection, error } = await supabase
          .from('inspections')
          .select('*')
          .eq('id', inspectionId)
          .maybeSingle()

        if (error) {
          console.error('❌ Query error:', error)
          throw error
        }

        if (!inspection) {
          throw new Error('Inspection not found or access denied')
        }

        if (inspection && inspection.lead_id) {
          console.log('✅ Found inspection, loading via lead ID:', inspection.lead_id)
          // Recursively use the existing leadId loading logic
          const { data: leadData, error: leadError } = await supabase
            .from('leads')
            .select('*')
            .eq('id', inspection.lead_id)
            .single()

          if (!leadError && leadData) {
            setLead(leadData)
            // Now proceed with the normal leadId flow below
            // by temporarily setting leadId context
            await loadInspectionFromLead(inspection.lead_id)
            setLoading(false)
            return
          }
        }

        throw new Error('Inspection has no associated lead')
      } catch (error: any) {
        console.error('❌ Failed to load inspection:', error)
        toast({
          title: "Error",
          description: "Failed to load inspection. " + (error.message || ''),
          variant: "destructive"
        })
        setLoading(false)
        return
      }
    }

    // MODE 2: Create new/load existing inspection from lead (existing behavior)
    if (leadId) {
      await loadInspectionFromLead(leadId)
      setLoading(false)
      return
    }

    // No lead ID or inspection ID - show error
    toast({
      title: "No inspection context",
      description: "Please select a lead to create an inspection",
      variant: "destructive"
    })
    setLoading(false)
  }

  const loadInspectionFromLead = async (lid: string) => {
    try {
      const existingInspection = await getInspectionByLeadId(lid)
      if (existingInspection) {
        console.log('✅ Found existing inspection, loading saved data:', existingInspection.id)

        // Set the inspection ID
        setCurrentInspectionId(existingInspection.id)

        // Load existing areas from database
        const { data: existingAreas, error: areasError } = await supabase
          .from('inspection_areas')
          .select('*')
          .eq('inspection_id', existingInspection.id)
          .order('area_order', { ascending: true })

        if (!areasError && existingAreas && existingAreas.length > 0) {
          // Create mapping of database area IDs to frontend area IDs
          const newMapping: Record<string, string> = {}
          existingAreas.forEach(dbArea => {
            // Use database ID as both key and value initially
            newMapping[dbArea.id] = dbArea.id
          })
          setAreaIdMapping(newMapping)

          console.log('✅ Loaded area ID mapping:', newMapping)

          // Load all photos for this inspection
          let photosWithUrls: any[] = []
          try {
            photosWithUrls = await loadInspectionPhotos(existingInspection.id)
            console.log('✅ Loaded photos from database:', photosWithUrls.length)
          } catch (error) {
            console.error('Failed to load photos:', error)
            // Continue without photos rather than failing completely
          }

          // Group photos by area_id for easy lookup
          const photosByArea: Record<string, any[]> = {}
          photosWithUrls.forEach(photo => {
            if (photo.area_id) {
              if (!photosByArea[photo.area_id]) {
                photosByArea[photo.area_id] = []
              }
              photosByArea[photo.area_id].push(photo)
            }
          })

          // Transform database areas to frontend format
          const transformedAreas: InspectionArea[] = await Promise.all(existingAreas.map(async (dbArea) => {
            // Transform mould visibility (12 booleans → array of strings)
            const mouldVisibility: string[] = []
            if (dbArea.mould_ceiling) mouldVisibility.push('Ceiling')
            if (dbArea.mould_cornice) mouldVisibility.push('Cornice')
            if (dbArea.mould_windows) mouldVisibility.push('Windows')
            if (dbArea.mould_window_furnishings) mouldVisibility.push('Window furnishings')
            if (dbArea.mould_walls) mouldVisibility.push('Walls')
            if (dbArea.mould_skirting) mouldVisibility.push('Skirting')
            if (dbArea.mould_flooring) mouldVisibility.push('Flooring')
            if (dbArea.mould_wardrobe) mouldVisibility.push('Wardrobe')
            if (dbArea.mould_cupboard) mouldVisibility.push('Cupboard')
            if (dbArea.mould_contents) mouldVisibility.push('Contents')
            if (dbArea.mould_grout_silicone) mouldVisibility.push('Grout/Silicone')
            if (dbArea.mould_none_visible) mouldVisibility.push('None visible')

            // Transform infrared observations (5 booleans → array of strings)
            const infraredObservations: string[] = []
            if (dbArea.infrared_observation_no_active) infraredObservations.push('No Active Water Intrusion Detected')
            if (dbArea.infrared_observation_water_infiltration) infraredObservations.push('Active Water Infiltration')
            if (dbArea.infrared_observation_past_ingress) infraredObservations.push('Past Water Ingress (Dried)')
            if (dbArea.infrared_observation_condensation) infraredObservations.push('Condensation Pattern')
            if (dbArea.infrared_observation_missing_insulation) infraredObservations.push('Missing/Inadequate Insulation')

            // Load photos for this area
            const areaPhotos = photosByArea[dbArea.id] || []
            const roomViewPhotos: Photo[] = []
            let infraredPhoto: Photo | null = null
            let naturalInfraredPhoto: Photo | null = null

            // Categorize photos by caption or default to room view
            areaPhotos.forEach(photo => {
              const photoObj: Photo = {
                id: photo.id,
                name: photo.file_name,
                url: photo.signed_url,
                timestamp: photo.created_at
              }

              // Categorize based on caption
              if (photo.caption === 'infrared') {
                infraredPhoto = photoObj
              } else if (photo.caption === 'natural_infrared') {
                naturalInfraredPhoto = photoObj
              } else {
                // Default to room view photos
                roomViewPhotos.push(photoObj)
              }
            })

            console.log(`✅ Loaded ${roomViewPhotos.length} photos for area "${dbArea.area_name}"`)

            // Load moisture readings for this area
            const { data: dbMoistureReadings, error: moistureError } = await supabase
              .from('moisture_readings')
              .select('*')
              .eq('area_id', dbArea.id)
              .order('reading_order', { ascending: true })

            if (moistureError) {
              console.error('Error loading moisture readings:', moistureError)
            }

            // Transform moisture readings to frontend format
            const moistureReadings: MoistureReading[] = (dbMoistureReadings || []).map(dbReading => {
              // Get single photo for THIS SPECIFIC moisture reading using moisture_reading_id
              const moisturePhoto = areaPhotos.find(p => p.moisture_reading_id === dbReading.id)

              console.log(`📸 LOADING PHOTO FOR READING "${dbReading.title || 'untitled'}":`, {
                readingId: dbReading.id,
                photoFound: !!moisturePhoto,
                photoId: moisturePhoto?.id || null
              })

              return {
                id: dbReading.id,
                title: dbReading.title || '',
                reading: dbReading.moisture_percentage?.toString() || '',
                photo: moisturePhoto ? {
                  id: moisturePhoto.id,
                  name: moisturePhoto.file_name,
                  url: moisturePhoto.signed_url,
                  timestamp: moisturePhoto.created_at
                } : null
              }
            })

            console.log(`✅ Loaded ${moistureReadings.length} moisture readings for area "${dbArea.area_name}"`)

            return {
              id: dbArea.id,
              areaName: dbArea.area_name,
              mouldVisibility,
              commentsForReport: dbArea.comments || '',
              temperature: dbArea.temperature?.toString() || '',
              humidity: dbArea.humidity?.toString() || '',
              dewPoint: dbArea.dew_point?.toString() || '',
              moistureReadingsEnabled: dbArea.moisture_readings_enabled || false,
              moistureReadings,
              internalNotes: dbArea.internal_office_notes || '',
              roomViewPhotos,
              infraredEnabled: dbArea.infrared_enabled || false,
              infraredPhoto,
              naturalInfraredPhoto,
              infraredObservations,
              timeWithoutDemo: dbArea.job_time_minutes || 0,
              demolitionRequired: dbArea.demolition_required || false,
              demolitionTime: dbArea.demolition_time_minutes || 0,
              demolitionDescription: dbArea.demolition_description || ''
            }
          }))

          console.log('✅ Transformed areas for UI:', transformedAreas)

          // Load subfloor data if it exists
          const { data: subfloorData, error: subfloorError } = await supabase
            .from('subfloor_data')
            .select('*')
            .eq('inspection_id', existingInspection.id)
            .maybeSingle()

          if (subfloorError && subfloorError.code !== 'PGRST116') {
            console.error('Error loading subfloor data:', subfloorError)
          }

          // Load subfloor readings if subfloor data exists
          let subfloorReadings: SubfloorReading[] = []
          if (subfloorData) {
            const { data: dbSubfloorReadings, error: readingsError } = await supabase
              .from('subfloor_readings')
              .select('*')
              .eq('subfloor_id', subfloorData.id)
              .order('reading_order', { ascending: true })

            if (readingsError) {
              console.error('Error loading subfloor readings:', readingsError)
            } else if (dbSubfloorReadings && dbSubfloorReadings.length > 0) {
              subfloorReadings = dbSubfloorReadings.map(dbReading => ({
                id: dbReading.id,
                reading: dbReading.moisture_percentage?.toString() || '',
                location: dbReading.location || ''
              }))
            }
          }

          // Load subfloor photos
          // Filter by subfloor_id (new photos) OR photo_type='subfloor' (legacy photos without subfloor_id)
          const subfloorPhotos: Photo[] = []
          const subfloorPhotoRecords = photosWithUrls.filter(p =>
            (p.subfloor_id === subfloorData?.id) ||
            (p.photo_type === 'subfloor' && p.subfloor_id === null)
          )
          subfloorPhotoRecords.forEach(photo => {
            subfloorPhotos.push({
              id: photo.id,
              name: photo.file_name,
              url: photo.signed_url,
              timestamp: photo.created_at
            })
          })

          console.log('✅ Loaded subfloor data:', {
            hasData: !!subfloorData,
            observations: subfloorData?.observations,
            comments: subfloorData?.comments,
            landscape: subfloorData?.landscape,
            readingsCount: subfloorReadings.length,
            photosCount: subfloorPhotos.length
          })

          if (subfloorPhotos.length > 0) {
            console.log(`✅ Loaded ${subfloorPhotos.length} subfloor photos`)
          }

          // Load outdoor photos
          const outdoorPhotoRecords = photosWithUrls.filter(p => p.photo_type === 'outdoor')
          let frontDoorPhoto: Photo | null = null
          let frontHousePhoto: Photo | null = null
          let mailboxPhoto: Photo | null = null
          let streetPhoto: Photo | null = null

          outdoorPhotoRecords.forEach(photo => {
            const photoObj: Photo = {
              id: photo.id,
              name: photo.file_name,
              url: photo.signed_url,
              timestamp: photo.created_at
            }

            // Match by caption to categorize outdoor photos
            if (photo.caption === 'front_door') {
              frontDoorPhoto = photoObj
            } else if (photo.caption === 'front_house') {
              frontHousePhoto = photoObj
            } else if (photo.caption === 'mailbox') {
              mailboxPhoto = photoObj
            } else if (photo.caption === 'street') {
              streetPhoto = photoObj
            }
          })

          // Load direction photo (single photo)
          let directionPhoto: Photo | null = null
          const directionPhotoRecord = outdoorPhotoRecords.find(p => p.caption === 'direction')
          if (directionPhotoRecord) {
            directionPhoto = {
              id: directionPhotoRecord.id,
              name: directionPhotoRecord.file_name,
              url: directionPhotoRecord.signed_url,
              timestamp: directionPhotoRecord.created_at
            }
          }

          console.log('✅ Loaded outdoor photos:', {
            count: outdoorPhotoRecords.length,
            frontDoor: !!frontDoorPhoto,
            frontHouse: !!frontHousePhoto,
            mailbox: !!mailboxPhoto,
            street: !!streetPhoto,
            direction: !!directionPhoto
          })

          // Populate ALL form fields with saved data including areas and subfloor
          setFormData(prev => ({
            ...prev,
            areas: transformedAreas,
            jobNumber: existingInspection.job_number || prev.jobNumber,
            triage: existingInspection.triage_description || prev.triage,
            inspector: existingInspection.inspector_id || prev.inspector,
            requestedBy: existingInspection.requested_by || prev.requestedBy,
            attentionTo: existingInspection.attention_to || prev.attentionTo,
            inspectionDate: existingInspection.inspection_date || prev.inspectionDate,
            dwellingType: existingInspection.dwelling_type || prev.dwellingType,
            propertyOccupation: existingInspection.property_occupation || prev.propertyOccupation,
            // Load subfloor fields from database
            subfloorEnabled: existingInspection.subfloor_required || prev.subfloorEnabled,
            subfloorObservations: subfloorData?.observations || prev.subfloorObservations,
            subfloorComments: subfloorData?.comments || prev.subfloorComments,
            subfloorLandscape: subfloorData?.landscape ? subfloorData.landscape.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) : prev.subfloorLandscape,
            subfloorSanitation: subfloorData?.sanitation_required || prev.subfloorSanitation,
            subfloorRacking: subfloorData?.racking_required || prev.subfloorRacking,
            subfloorTreatmentTime: subfloorData?.treatment_time_minutes || prev.subfloorTreatmentTime,
            subfloorReadings: subfloorReadings.length > 0 ? subfloorReadings : prev.subfloorReadings,
            subfloorPhotos: subfloorPhotos.length > 0 ? subfloorPhotos : prev.subfloorPhotos,
            // Load outdoor fields from database
            outdoorTemperature: existingInspection.outdoor_temperature?.toString() || prev.outdoorTemperature,
            outdoorHumidity: existingInspection.outdoor_humidity?.toString() || prev.outdoorHumidity,
            outdoorDewPoint: existingInspection.outdoor_dew_point?.toString() || prev.outdoorDewPoint,
            outdoorComments: existingInspection.outdoor_comments || prev.outdoorComments,
            // Load outdoor photos
            frontDoorPhoto: frontDoorPhoto || prev.frontDoorPhoto,
            frontHousePhoto: frontHousePhoto || prev.frontHousePhoto,
            mailboxPhoto: mailboxPhoto || prev.mailboxPhoto,
            streetPhoto: streetPhoto || prev.streetPhoto,
            // Load directional photo toggle and single photo
            directionPhotosEnabled: existingInspection.direction_photos_enabled || prev.directionPhotosEnabled,
            directionPhoto: directionPhoto || prev.directionPhoto,
          }))
        } else {
          // No areas in database, but still load subfloor data if it exists
          const { data: subfloorData, error: subfloorError } = await supabase
            .from('subfloor_data')
            .select('*')
            .eq('inspection_id', existingInspection.id)
            .maybeSingle()

          if (subfloorError && subfloorError.code !== 'PGRST116') {
            console.error('Error loading subfloor data:', subfloorError)
          }

          // Load subfloor readings if subfloor data exists
          let subfloorReadings: SubfloorReading[] = []
          if (subfloorData) {
            const { data: dbSubfloorReadings, error: readingsError } = await supabase
              .from('subfloor_readings')
              .select('*')
              .eq('subfloor_id', subfloorData.id)
              .order('reading_order', { ascending: true })

            if (readingsError) {
              console.error('Error loading subfloor readings:', readingsError)
            } else if (dbSubfloorReadings && dbSubfloorReadings.length > 0) {
              subfloorReadings = dbSubfloorReadings.map(dbReading => ({
                id: dbReading.id,
                reading: dbReading.moisture_percentage?.toString() || '',
                location: dbReading.location || ''
              }))
            }
          }

          // Load subfloor photos (need to load photos even without areas)
          // Filter by subfloor_id (new photos) OR photo_type='subfloor' (legacy photos without subfloor_id)
          let subfloorPhotos: Photo[] = []
          try {
            const photosWithUrls = await loadInspectionPhotos(existingInspection.id)
            const subfloorPhotoRecords = photosWithUrls.filter(p =>
              (p.subfloor_id === subfloorData?.id) ||
              (p.photo_type === 'subfloor' && p.subfloor_id === null)
            )
            subfloorPhotoRecords.forEach(photo => {
              subfloorPhotos.push({
                id: photo.id,
                name: photo.file_name,
                url: photo.signed_url,
                timestamp: photo.created_at
              })
            })
          } catch (error) {
            console.error('Failed to load photos:', error)
          }

          console.log('✅ Loaded subfloor data (no areas):', {
            hasData: !!subfloorData,
            readingsCount: subfloorReadings.length,
            photosCount: subfloorPhotos.length
          })

          if (subfloorPhotos.length > 0) {
            console.log(`✅ Loaded ${subfloorPhotos.length} subfloor photos (no areas path)`)
          }

          // Load outdoor photos (no areas path)
          const outdoorPhotoRecords = photosWithUrls.filter(p => p.photo_type === 'outdoor')
          let frontDoorPhoto: Photo | null = null
          let frontHousePhoto: Photo | null = null
          let mailboxPhoto: Photo | null = null
          let streetPhoto: Photo | null = null

          outdoorPhotoRecords.forEach(photo => {
            const photoObj: Photo = {
              id: photo.id,
              name: photo.file_name,
              url: photo.signed_url,
              timestamp: photo.created_at
            }

            // Match by caption to categorize outdoor photos
            if (photo.caption === 'front_door') {
              frontDoorPhoto = photoObj
            } else if (photo.caption === 'front_house') {
              frontHousePhoto = photoObj
            } else if (photo.caption === 'mailbox') {
              mailboxPhoto = photoObj
            } else if (photo.caption === 'street') {
              streetPhoto = photoObj
            }
          })

          console.log('✅ Loaded outdoor photos (no areas):', {
            count: outdoorPhotoRecords.length,
            frontDoor: !!frontDoorPhoto,
            frontHouse: !!frontHousePhoto,
            mailbox: !!mailboxPhoto,
            street: !!streetPhoto
          })

          // Populate other fields including subfloor
          setFormData(prev => ({
            ...prev,
            jobNumber: existingInspection.job_number || prev.jobNumber,
            triage: existingInspection.triage_description || prev.triage,
            inspector: existingInspection.inspector_id || prev.inspector,
            requestedBy: existingInspection.requested_by || prev.requestedBy,
            attentionTo: existingInspection.attention_to || prev.attentionTo,
            inspectionDate: existingInspection.inspection_date || prev.inspectionDate,
            dwellingType: existingInspection.dwelling_type || prev.dwellingType,
            propertyOccupation: existingInspection.property_occupation || prev.propertyOccupation,
            // Load subfloor fields from database
            subfloorEnabled: existingInspection.subfloor_required || prev.subfloorEnabled,
            subfloorObservations: subfloorData?.observations || prev.subfloorObservations,
            subfloorComments: subfloorData?.comments || prev.subfloorComments,
            subfloorLandscape: subfloorData?.landscape ? subfloorData.landscape.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) : prev.subfloorLandscape,
            subfloorSanitation: subfloorData?.sanitation_required || prev.subfloorSanitation,
            subfloorRacking: subfloorData?.racking_required || prev.subfloorRacking,
            subfloorTreatmentTime: subfloorData?.treatment_time_minutes || prev.subfloorTreatmentTime,
            subfloorReadings: subfloorReadings.length > 0 ? subfloorReadings : prev.subfloorReadings,
            subfloorPhotos: subfloorPhotos.length > 0 ? subfloorPhotos : prev.subfloorPhotos,
            // Load outdoor fields from database
            outdoorTemperature: existingInspection.outdoor_temperature?.toString() || prev.outdoorTemperature,
            outdoorHumidity: existingInspection.outdoor_humidity?.toString() || prev.outdoorHumidity,
            outdoorDewPoint: existingInspection.outdoor_dew_point?.toString() || prev.outdoorDewPoint,
            outdoorComments: existingInspection.outdoor_comments || prev.outdoorComments,
            // Load outdoor photos
            frontDoorPhoto: frontDoorPhoto || prev.frontDoorPhoto,
            frontHousePhoto: frontHousePhoto || prev.frontHousePhoto,
            mailboxPhoto: mailboxPhoto || prev.mailboxPhoto,
            streetPhoto: streetPhoto || prev.streetPhoto,
            // Load directional photo toggle and single photo
            directionPhotosEnabled: existingInspection.direction_photos_enabled || prev.directionPhotosEnabled,
            directionPhoto: directionPhoto || prev.directionPhoto,
          }))
        }

        console.log('✅ Loaded saved inspection data:', {
          attention_to: existingInspection.attention_to,
          dwelling_type: existingInspection.dwelling_type,
          property_occupation: existingInspection.property_occupation
        })
      }
    } catch (error) {
      console.error('Error loading existing inspection:', error)
      // Continue to load lead data even if inspection load fails
    }

    // Use passed lead data from SelectLead page if available
    if (passedLead) {
      const leadData = {
        id: passedLead.id,
        name: passedLead.customerName,
        email: passedLead.customerEmail,
        phone: passedLead.customerPhone,
        property: `${passedLead.propertyAddress}, ${passedLead.propertySuburb} VIC ${passedLead.propertyPostcode}`,
        issueDescription: passedLead.problemDescription,
        scheduledDate: `${passedLead.inspectionDate}T${passedLead.inspectionTime}:00`,
        affectedAreas: passedLead.affectedAreas,
        propertyType: passedLead.propertyType,
        urgency: passedLead.urgency
      }

      setLead(leadData)

      // Map propertyType to valid dwelling_type enum values
      const validDwellingTypes = ['house', 'units', 'apartment', 'duplex', 'townhouse', 'commercial', 'construction', 'industrial']
      const dwellingType = validDwellingTypes.includes(leadData.propertyType?.toLowerCase())
        ? leadData.propertyType.toLowerCase()
        : ''

      // ✅ FIX: Only populate lead data if not already set from existing inspection
      setFormData(prev => ({
        ...prev,
        triage: prev.triage || leadData.issueDescription,
        address: prev.address || leadData.property,
        requestedBy: prev.requestedBy || leadData.name,
        dwellingType: prev.dwellingType || dwellingType,
        // Pre-fill first area with affected areas from lead
        areas: leadData.affectedAreas && leadData.affectedAreas.length > 0
          ? [{
              id: crypto.randomUUID(),
              areaName: leadData.affectedAreas[0],
              mouldVisibility: [],
              commentsForReport: leadData.issueDescription,
              temperature: '',
              humidity: '',
              dewPoint: '',
              moistureReadingsEnabled: false,
              moistureReadings: [],
              internalNotes: '',
              roomViewPhotos: [],
              infraredEnabled: false,
              infraredPhoto: null,
              naturalInfraredPhoto: null,
              infraredObservations: [],
              timeWithoutDemo: 0,
              demolitionRequired: false,
              demolitionTime: 0,
              demolitionDescription: ''
            }]
          : prev.areas
      }))
      return
    }

    // Load from Supabase using leadId
    try {
      const { data: leadData, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', lid)
        .single()

      if (error) {
        console.error('❌ Error fetching lead:', error)
        toast({
          title: 'Error loading lead',
          description: error.message || 'Failed to load lead data',
          variant: 'destructive'
        })
        navigate('/inspection/select-lead')
        return
      }

      if (!leadData) {
        console.error('❌ Lead not found:', lid)
        toast({
          title: 'Lead not found',
          description: 'The lead you\'re trying to inspect doesn\'t exist.',
          variant: 'destructive'
        })
        navigate('/inspection/select-lead')
        return
      }

      console.log('✅ Lead data loaded for inspection:', {
        id: leadData.id,
        lead_number: leadData.lead_number,
        full_name: leadData.full_name,
        suburb: leadData.property_address_suburb,
        status: leadData.status,
      })

      // Format lead data for inspection form
      const formattedLead = {
        id: leadData.id,
        name: leadData.full_name,
        email: leadData.email,
        phone: leadData.phone,
        property: [
          leadData.property_address_street,
          leadData.property_address_suburb,
          'VIC',
          leadData.property_address_postcode
        ].filter(Boolean).join(', '),
        issueDescription: leadData.issue_description || 'No issue description provided',
        scheduledDate: leadData.inspection_scheduled_date || new Date().toISOString().split('T')[0],
        propertyType: leadData.property_type,
        urgency: leadData.urgency
      }

      setLead(formattedLead)

      // ✅ FIX: Only populate lead data if there's NO existing inspection
      // Otherwise, we'll overwrite the saved inspection data
      setFormData(prev => ({
        ...prev,
        triage: prev.triage || formattedLead.issueDescription,
        address: prev.address || formattedLead.property,
        requestedBy: prev.requestedBy || formattedLead.name,
        // Only set dwelling type from lead if not already set from inspection
        dwellingType: prev.dwellingType || formattedLead.propertyType || ''
      }))

      console.log('🎉 Inspection form populated with real lead data:', formattedLead.name)
    } catch (error) {
      console.error('❌ Exception loading lead:', error)
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive'
      })
      navigate('/inspection/select-lead')
      return
    }
  }

  const loadTechnicians = async () => {
    try {
      // For now, use hardcoded list of known users
      // TODO: Create a public view or RPC function to query auth.users
      const knownUsers = [
        {
          id: 'bef0e406-68bd-4c31-a504-dbfc68069c71',
          name: 'Michael Youssef'
        },
        {
          id: '651622a1-2faa-421b-b639-942b27e1cd70',
          name: 'System Administrator'
        }
      ]

      setTechnicians(knownUsers)

      // Also add current user if not in the list
      if (currentUserId && !knownUsers.find(u => u.id === currentUserId)) {
        const { data: user } = await supabase.auth.getUser()
        const fullName = user?.user?.user_metadata?.full_name || user?.user?.email?.split('@')[0] || 'Current User'
        setTechnicians([
          ...knownUsers,
          { id: currentUserId, name: fullName }
        ])
      }
    } catch (error) {
      console.error('Exception loading users:', error)
      // Fallback: use current user
      if (currentUserId) {
        const { data: user } = await supabase.auth.getUser()
        const fullName = user?.user?.user_metadata?.full_name || user?.user?.email?.split('@')[0] || 'Current User'
        setTechnicians([
          { id: currentUserId, name: fullName }
        ])
      }
    }
  }

  const loadCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
      }
    } catch (error) {
      console.error('Failed to get current user:', error)
    }
  }

  const checkExistingInspection = async () => {
    if (!leadId) return

    try {
      const inspection = await getInspectionByLeadId(leadId)
      if (inspection) {
        setCurrentInspectionId(inspection.id)
        console.log('📋 Found existing inspection:', inspection.job_number)
        // TODO: Optionally load inspection data into form
      }
    } catch (error) {
      console.error('Error checking existing inspection:', error)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    // DEBUG: Log all subfloor field changes
    if (field.startsWith('subfloor')) {
      console.log(`🔍 DEBUG - handleInputChange: ${field} =`, value)
    }
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleAreaChange = (areaId: string, field: keyof InspectionArea, value: any) => {
    setFormData(prev => ({
      ...prev,
      areas: prev.areas.map(area => 
        area.id === areaId ? { ...area, [field]: value } : area
      )
    }))
  }

  const handleAreaArrayToggle = (areaId: string, field: 'mouldVisibility' | 'infraredObservations', value: string) => {
    setFormData(prev => ({
      ...prev,
      areas: prev.areas.map(area => {
        if (area.id !== areaId) return area
        const array = area[field] as string[]
        return {
          ...area,
          [field]: array.includes(value)
            ? array.filter(item => item !== value)
            : [...array, value]
        }
      })
    }))
  }

  const addArea = () => {
    const newArea: InspectionArea = {
      id: crypto.randomUUID(),
      areaName: '',
      mouldVisibility: [],
      commentsForReport: '',
      temperature: '',
      humidity: '',
      dewPoint: '',
      moistureReadingsEnabled: false,
      moistureReadings: [],
      internalNotes: '',
      roomViewPhotos: [],
      infraredEnabled: false,
      infraredPhoto: null,
      naturalInfraredPhoto: null,
      infraredObservations: [],
      timeWithoutDemo: 0,
      demolitionRequired: false,
      demolitionTime: 0,
      demolitionDescription: ''
    }
    setFormData(prev => ({ ...prev, areas: [...prev.areas, newArea] }))
    toast({ title: 'Area added', description: 'New inspection area created' })
  }

  const removeArea = async (areaId: string) => {
    // Validation: Require at least one area
    if (formData.areas.length === 1) {
      toast({
        title: 'Cannot remove',
        description: 'At least one area is required',
        variant: 'destructive'
      })
      return
    }

    try {
      // Get the database ID from the mapping (if area was saved to DB)
      const dbAreaId = areaIdMapping[areaId]

      // If area exists in database, delete it
      if (dbAreaId) {
        console.log(`Deleting area from database: ${dbAreaId}`)
        await deleteInspectionArea(dbAreaId)

        // Remove from mapping
        setAreaIdMapping(prev => {
          const newMapping = { ...prev }
          delete newMapping[areaId]
          return newMapping
        })

        console.log(`Successfully deleted area ${dbAreaId} from database`)
      } else {
        console.log(`Area ${areaId} not yet saved to database, only removing from local state`)
      }

      // Update local state (remove area from UI)
      setFormData(prev => ({
        ...prev,
        areas: prev.areas.filter(area => area.id !== areaId)
      }))

      toast({
        title: 'Area removed',
        description: dbAreaId
          ? 'Area and related data deleted successfully'
          : 'Area removed from form'
      })
    } catch (error) {
      console.error('Failed to delete area:', error)
      toast({
        title: 'Error deleting area',
        description: error instanceof Error ? error.message : 'Failed to delete area from database',
        variant: 'destructive'
      })
    }
  }

  const addMoistureReading = (areaId: string) => {
    setFormData(prev => ({
      ...prev,
      areas: prev.areas.map(area => {
        if (area.id !== areaId) return area
        const newReading: MoistureReading = {
          id: crypto.randomUUID(),
          title: '',
          reading: '',
          photo: null
        }
        return {
          ...area,
          moistureReadings: [...area.moistureReadings, newReading]
        }
      })
    }))
  }

  const removeMoistureReading = (areaId: string, readingId: string) => {
    setFormData(prev => ({
      ...prev,
      areas: prev.areas.map(area => {
        if (area.id !== areaId) return area
        return {
          ...area,
          moistureReadings: area.moistureReadings.filter(r => r.id !== readingId)
        }
      })
    }))
  }

  const updateMoistureReading = (areaId: string, readingId: string, field: keyof MoistureReading, value: any) => {
    if (field === 'photo') {
      console.log('🔍 DEBUG - updateMoistureReading called for photo:', {
        areaId,
        readingId,
        photoId: value?.id || null
      })
    }

    setFormData(prev => ({
      ...prev,
      areas: prev.areas.map(area => {
        if (area.id !== areaId) return area
        return {
          ...area,
          moistureReadings: area.moistureReadings.map(r => {
            if (r.id === readingId) {
              const updated = { ...r, [field]: value }
              if (field === 'photo') {
                console.log('🔍 DEBUG - Updated reading state:', {
                  readingId: r.id,
                  readingTitle: r.title,
                  oldPhotoId: r.photo?.id || null,
                  newPhotoId: updated.photo?.id || null
                })
              }
              return updated
            }
            return r
          })
        }
      })
    }))
  }

  const addSubfloorReading = () => {
    const newReading: SubfloorReading = {
      id: crypto.randomUUID(),
      reading: '',
      location: ''
    }
    setFormData(prev => ({
      ...prev,
      subfloorReadings: [...prev.subfloorReadings, newReading]
    }))
  }

  const removeSubfloorReading = (readingId: string) => {
    setFormData(prev => ({
      ...prev,
      subfloorReadings: prev.subfloorReadings.filter(r => r.id !== readingId)
    }))
  }

  const updateSubfloorReading = (readingId: string, field: keyof SubfloorReading, value: string) => {
    setFormData(prev => ({
      ...prev,
      subfloorReadings: prev.subfloorReadings.map(r =>
        r.id === readingId ? { ...r, [field]: value } : r
      )
    }))
  }

  const handlePhotoCapture = async (type: string, areaId?: string, readingId?: string) => {
    // Ensure inspection exists before uploading photos
    if (!currentInspectionId) {
      toast({
        title: 'Saving inspection first...',
        description: 'Please wait while we prepare to upload photos',
        variant: 'default'
      })

      try {
        await createOrLoadInspection()
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to create inspection. Please try again.',
          variant: 'destructive'
        })
        return
      }
    }

    // Get database area_id for uploading
    let dbAreaId: string | undefined = areaId ? areaIdMapping[areaId] : undefined

    console.log('🔍 DEBUG handlePhotoCapture:', {
      areaId,
      readingId,
      type,
      dbAreaId,
      currentMapping: areaIdMapping,
      hasDbAreaId: !!dbAreaId
    })

    // If uploading to a specific area, ensure area is saved to database first
    if (areaId && !dbAreaId) {
      console.log('⚠️ Area not saved yet - triggering save first')

      toast({
        title: 'Saving area first...',
        description: 'Please wait while we save the area before uploading photos',
        variant: 'default'
      })

      try {
        // Trigger a save to ensure area is in database
        const newMappings = await handleSave()
        console.log('✅ Save complete, new mappings:', newMappings)

        // Get the database area_id from the returned mappings
        dbAreaId = newMappings[areaId]
        console.log('📌 dbAreaId from mappings:', dbAreaId)

        // Double-check that the area was saved and mapped
        if (!dbAreaId) {
          console.error('❌ Area was not saved to database - no mapping found')
          throw new Error('Area was not saved to database')
        }

        console.log('✅ Area saved successfully, dbAreaId:', dbAreaId)
      } catch (error) {
        console.error('❌ Failed to save area before photo upload:', error)
        toast({
          title: 'Error',
          description: 'Failed to save area. Please try again.',
          variant: 'destructive'
        })
        return
      }
    } else if (areaId && dbAreaId) {
      console.log('✅ Using existing dbAreaId from mapping:', dbAreaId)
    } else {
      console.log('ℹ️ No areaId provided - uploading general photo')
    }

    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.multiple = type !== 'single'

    input.onchange = async (e: any) => {
      const files = Array.from(e.target.files) as File[]

      if (files.length === 0) return

      // Show uploading toast
      toast({
        title: 'Uploading photos...',
        description: `Uploading ${files.length} photo(s) to secure storage`
      })

      try {
        // Determine photo type and metadata
        let photoType: 'area' | 'subfloor' | 'general' | 'outdoor' = 'general'
        let caption: string | undefined = undefined

        if (areaId) photoType = 'area'
        else if (type === 'subfloor') photoType = 'subfloor'
        else if (type === 'frontDoor' || type === 'frontHouse' || type === 'mailbox' || type === 'street') {
          photoType = 'outdoor'
        }

        // Determine caption based on photo type for categorization
        if (type === 'roomView') {
          caption = 'room_view'
        } else if (areaId && readingId) {
          caption = 'moisture'
        } else if (type === 'infrared') {
          caption = 'infrared'
        } else if (type === 'naturalInfrared') {
          caption = 'natural_infrared'
        } else if (type === 'frontDoor') {
          caption = 'front_door'
        } else if (type === 'frontHouse') {
          caption = 'front_house'
        } else if (type === 'mailbox') {
          caption = 'mailbox'
        } else if (type === 'street') {
          caption = 'street'
        } else if (type === 'direction') {
          caption = 'direction'
        }

        // Upload photos to Storage and get signed URLs
        // dbAreaId is already set above (either from mapping or from save)

        // Fetch subfloor_id if this is a subfloor photo
        let subfloorId: string | null = null
        if (photoType === 'subfloor') {
          // First, try to fetch existing subfloor_data
          const { data: existingSubfloor, error: fetchError } = await supabase
            .from('subfloor_data')
            .select('id')
            .eq('inspection_id', currentInspectionId!)
            .maybeSingle()

          if (existingSubfloor) {
            // Subfloor data already exists
            subfloorId = existingSubfloor.id
            console.log('✅ Found existing subfloor_id for photo upload:', subfloorId)
          } else if (!fetchError || fetchError.code === 'PGRST116') {
            // Subfloor data doesn't exist yet - create it now
            console.log('⚠️ Subfloor data not found, creating placeholder record for photo upload')

            const { data: newSubfloor, error: insertError } = await supabase
              .from('subfloor_data')
              .insert({
                inspection_id: currentInspectionId!,
                observations: formData.subfloorObservations || null,
                comments: formData.subfloorComments || null,
                landscape: formData.subfloorLandscape ? formData.subfloorLandscape.toLowerCase().replace(/\s+/g, '_') : null,
                sanitation_required: formData.subfloorSanitation || false,
                racking_required: formData.subfloorRacking || false,
                treatment_time_minutes: formData.subfloorTreatmentTime || 0
              })
              .select('id')
              .single()

            if (insertError) {
              console.error('❌ Error creating subfloor data for photo upload:', insertError)
            } else if (newSubfloor) {
              subfloorId = newSubfloor.id
              console.log('✅ Created subfloor_data record with id:', subfloorId)
            }
          } else {
            console.error('❌ Error fetching subfloor_id for photo upload:', fetchError)
          }
        }

        const uploadMetadata = {
          inspection_id: currentInspectionId!,
          area_id: dbAreaId,  // Use database area_id instead of frontend area.id
          subfloor_id: subfloorId,  // Add subfloor_id for subfloor photos
          photo_type: photoType,
          caption: caption  // Add caption for photo categorization
        }

        console.log('📸 Uploading photos with metadata:', uploadMetadata)
        console.log('📸 Number of files:', files.length)

        const uploadResults = await uploadMultiplePhotos(files, uploadMetadata)

        console.log('🔍 DEBUG - Upload results from uploadMultiplePhotos:', {
          resultsCount: uploadResults.length,
          photoIds: uploadResults.map(r => r.photo_id)
        })

        // Create Photo objects with signed URLs
        const newPhotos: Photo[] = uploadResults.map((result, index) => ({
          id: result.photo_id,
          name: files[index].name,
          url: result.signed_url,
          timestamp: new Date().toISOString()
        }))

        console.log('🔍 DEBUG - newPhotos array created:', {
          photosCount: newPhotos.length,
          photoIds: newPhotos.map(p => p.id),
          areaId,
          readingId,
          isForMoistureReading: !!(areaId && readingId)
        })

        // Update form state based on photo type
        if (areaId && readingId) {
          // Moisture reading photo (single photo only)
          console.log('🔍 DEBUG - Setting moisture reading photo:', {
            areaId,
            readingId,
            photoId: newPhotos[0]?.id
          })

          updateMoistureReading(areaId, readingId, 'photo', newPhotos[0])
        } else if (areaId && type === 'roomView') {
          // Room view photos (limit 3)
          const currentArea = formData.areas.find(a => a.id === areaId)
          const currentPhotos = currentArea?.roomViewPhotos || []
          if (currentPhotos.length + newPhotos.length > 3) {
            toast({ title: 'Photo limit', description: 'Room view limited to 3 photos', variant: 'destructive' })
            return
          }
          handleAreaChange(areaId, 'roomViewPhotos', [...currentPhotos, ...newPhotos])
        } else if (areaId && type === 'infrared') {
          handleAreaChange(areaId, 'infraredPhoto', newPhotos[0])
        } else if (areaId && type === 'naturalInfrared') {
          handleAreaChange(areaId, 'naturalInfraredPhoto', newPhotos[0])
        } else if (type === 'subfloor') {
          setFormData(prev => ({
            ...prev,
            subfloorPhotos: [...prev.subfloorPhotos, ...newPhotos]
          }))
        } else if (type === 'direction') {
          setFormData(prev => ({
            ...prev,
            directionPhoto: newPhotos[0]
          }))
        } else if (type === 'frontDoor' || type === 'frontHouse' || type === 'mailbox' || type === 'street') {
          setFormData(prev => ({
            ...prev,
            [`${type}Photo`]: newPhotos[0]
          }))
        }

        toast({
          title: 'Photos uploaded successfully!',
          description: `${files.length} photo(s) saved to secure storage`,
          variant: 'default'
        })
      } catch (error: any) {
        console.error('Photo upload error:', error)

        // Provide specific error messages based on error type
        let errorTitle = 'Upload failed'
        let errorMessage = 'Failed to upload photos. Please try again.'

        const errorMsg = error.message?.toLowerCase() || ''

        if (errorMsg.includes('already exists') || errorMsg.includes('duplicate')) {
          errorTitle = 'Duplicate file detected'
          errorMessage = 'Some photos may have duplicate names. Please try uploading again.'
        } else if (errorMsg.includes('failed to fetch') || errorMsg.includes('network')) {
          errorTitle = 'Network error'
          errorMessage = 'Unable to reach server. Please check your internet connection and try again.'
        } else if (errorMsg.includes('http2') || errorMsg.includes('protocol')) {
          errorTitle = 'Too many photos'
          errorMessage = 'Please try uploading fewer photos at once (3-5 at a time works best).'
        } else if (errorMsg.includes('size') || errorMsg.includes('too large')) {
          errorTitle = 'File too large'
          errorMessage = 'One or more photos are too large. Please compress them and try again.'
        } else if (errorMsg.includes('authenticated') || errorMsg.includes('permission')) {
          errorTitle = 'Authentication error'
          errorMessage = 'Your session may have expired. Please refresh the page and try again.'
        } else if (errorMsg.includes('all') && errorMsg.includes('failed')) {
          errorTitle = 'All uploads failed'
          errorMessage = error.message || 'Unable to upload any photos. Check your connection and try again.'
        }

        toast({
          title: errorTitle,
          description: errorMessage,
          variant: 'destructive'
        })
      }
    }

    input.click()
  }

  const removePhoto = (type: string, photoId: string, areaId?: string, readingId?: string) => {
    if (areaId && readingId) {
      const area = formData.areas.find(a => a.id === areaId)
      const reading = area?.moistureReadings.find(r => r.id === readingId)
      if (reading && reading.photo?.id === photoId) {
        updateMoistureReading(areaId, readingId, 'photo', null)
      }
    } else if (areaId && type === 'roomView') {
      const area = formData.areas.find(a => a.id === areaId)
      if (area) {
        handleAreaChange(areaId, 'roomViewPhotos', area.roomViewPhotos.filter(p => p.id !== photoId))
      }
    } else if (type === 'subfloor') {
      setFormData(prev => ({
        ...prev,
        subfloorPhotos: prev.subfloorPhotos.filter(p => p.id !== photoId)
      }))
    } else if (type === 'direction') {
      setFormData(prev => ({
        ...prev,
        directionPhoto: null
      }))
    }
  }

  const calculateAreaDewPoint = (areaId: string) => {
    const area = formData.areas.find(a => a.id === areaId)
    if (area && area.temperature && area.humidity) {
      const temp = parseFloat(area.temperature)
      const hum = parseFloat(area.humidity)
      const dewPoint = calculateDewPoint(temp, hum)
      handleAreaChange(areaId, 'dewPoint', dewPoint.toString())
    }
  }

  const calculateOutdoorDewPoint = () => {
    if (formData.outdoorTemperature && formData.outdoorHumidity) {
      const temp = parseFloat(formData.outdoorTemperature)
      const hum = parseFloat(formData.outdoorHumidity)
      const dewPoint = calculateDewPoint(temp, hum)
      handleInputChange('outdoorDewPoint', dewPoint.toString())
    }
  }

  const recalculateCost = () => {
    const costResult = calculateJobCost({
      areas: formData.areas.map(a => ({
        timeWithoutDemo: a.timeWithoutDemo,
        demolitionTime: a.demolitionTime,
        demolitionRequired: a.demolitionRequired
      })),
      subfloorTime: formData.subfloorTreatmentTime,
      hasSubfloor: formData.subfloorEnabled,
      dehumidifierQty: formData.commercialDehumidifierQty,
      airMoverQty: formData.airMoversQty,
      rcdQty: formData.rcdBoxQty,
      estimatedDays: formData.estimatedDays
    })

    setFormData(prev => ({
      ...prev,
      laborCost: costResult.laborCost,
      equipmentCost: costResult.equipmentCost,
      subtotal: costResult.subtotal,
      gst: costResult.gst,
      totalCost: costResult.total
    }))
  }

  const generateWithAI = async (type: string, areaId?: string) => {
    toast({ title: 'AI Generation', description: 'Coming soon! This will generate professional text based on your inspection data.' })
    // TODO: Implement AI generation using Lovable AI
  }

  const createOrLoadInspection = async (): Promise<string> => {
    if (currentInspectionId) {
      return currentInspectionId
    }

    if (!leadId || !currentUserId) {
      throw new Error('Missing required data (leadId or userId)')
    }

    try {
      // Check if inspection already exists for this lead
      const existing = await getInspectionByLeadId(leadId)
      if (existing) {
        setCurrentInspectionId(existing.id)
        return existing.id
      }

      // Create new inspection
      const inspectionData: InspectionData = {
        lead_id: leadId,
        inspector_id: formData.inspector || currentUserId,
        inspection_date: formData.inspectionDate,
        job_number: formData.jobNumber
      }

      const inspection = await createInspection(inspectionData)
      setCurrentInspectionId(inspection.id)
      console.log('✅ Created inspection:', inspection.job_number)
      return inspection.id
    } catch (error) {
      console.error('Failed to create inspection:', error)
      throw error
    }
  }

  // Sanitize enum values to match database enum types
  const sanitizeEnumValue = (value: string, enumType: 'dwelling_type' | 'property_occupation'): string | undefined => {
    if (!value) return undefined

    const validDwellingTypes = ['house', 'units', 'apartment', 'duplex', 'townhouse', 'commercial', 'construction', 'industrial']
    const validPropertyOccupation = ['tenanted', 'vacant', 'owner_occupied', 'tenants_vacating']

    // Convert to lowercase and replace spaces with underscores
    const normalized = value.toLowerCase().replace(/\s+/g, '_')

    if (enumType === 'dwelling_type') {
      return validDwellingTypes.includes(normalized) ? normalized : undefined
    } else if (enumType === 'property_occupation') {
      return validPropertyOccupation.includes(normalized) ? normalized : undefined
    }

    return undefined
  }

  const autoSave = async (): Promise<Record<string, string> | void> => {
    // Allow save if we have either a leadId (new inspection) OR currentInspectionId (existing inspection)
    if ((!leadId && !currentInspectionId) || !currentUserId) return

    setSaving(true)

    try {
      // Create or get inspection ID
      const inspectionId = await createOrLoadInspection()

      // Track new area ID mappings from this save
      const newMappings: Record<string, string> = {}

      // Sanitize enum values before saving
      const sanitizedPropertyOccupation = sanitizeEnumValue(formData.propertyOccupation, 'property_occupation')
      const sanitizedDwellingType = sanitizeEnumValue(formData.dwellingType, 'dwelling_type')

      // Save inspection metadata
      await updateInspection(inspectionId, {
        // Only include lead_id if it's defined (for new inspections from leads)
        ...(leadId ? { lead_id: leadId } : {}),
        inspector_id: formData.inspector || currentUserId,
        inspection_date: formData.inspectionDate,
        inspection_start_time: new Date().toTimeString().split(' ')[0],
        triage_description: formData.triage,
        requested_by: formData.requestedBy,
        attention_to: formData.attentionTo,
        property_occupation: sanitizedPropertyOccupation,
        dwelling_type: sanitizedDwellingType,
        outdoor_temperature: parseFloat(formData.outdoorTemperature) || undefined,
        outdoor_humidity: parseFloat(formData.outdoorHumidity) || undefined,
        outdoor_dew_point: parseFloat(formData.outdoorDewPoint) || undefined,
        outdoor_comments: formData.outdoorComments,
        direction_photos_enabled: formData.directionPhotosEnabled || false,
        subfloor_required: formData.subfloorEnabled,
        waste_disposal_required: formData.wasteDisposalEnabled,
        total_time_minutes: formData.areas.reduce(
          (sum, a) => sum + a.timeWithoutDemo + (a.demolitionRequired ? a.demolitionTime : 0),
          0
        ) + (formData.subfloorEnabled ? formData.subfloorTreatmentTime : 0),
        estimated_cost_ex_gst: formData.subtotal,
        estimated_cost_inc_gst: formData.totalCost,
        equipment_cost_ex_gst: formData.equipmentCost,
        recommended_dehumidifier: formData.dehumidifierSize,
        cause_of_mould: formData.causeOfMould,
        additional_info_technician: formData.additionalInfoForTech,
        additional_equipment_comments: formData.additionalEquipmentComments,
        parking_option: formData.parkingOptions
      })

      // Save all inspection areas
      for (let i = 0; i < formData.areas.length; i++) {
        const area = formData.areas[i]

        const areaData: InspectionAreaData = {
          inspection_id: inspectionId,
          area_order: i,
          area_name: area.areaName,
          // Map mould visibility array to boolean fields
          mould_ceiling: area.mouldVisibility.includes('Ceiling'),
          mould_cornice: area.mouldVisibility.includes('Cornice'),
          mould_windows: area.mouldVisibility.includes('Windows'),
          mould_window_furnishings: area.mouldVisibility.includes('Window furnishings'),
          mould_walls: area.mouldVisibility.includes('Walls'),
          mould_skirting: area.mouldVisibility.includes('Skirting'),
          mould_flooring: area.mouldVisibility.includes('Flooring'),
          mould_wardrobe: area.mouldVisibility.includes('Wardrobe'),
          mould_cupboard: area.mouldVisibility.includes('Cupboard'),
          mould_contents: area.mouldVisibility.includes('Contents'),
          mould_grout_silicone: area.mouldVisibility.includes('Grout/Silicone'),
          mould_none_visible: area.mouldVisibility.includes('None visible'),
          comments: area.commentsForReport,
          temperature: parseFloat(area.temperature) || undefined,
          humidity: parseFloat(area.humidity) || undefined,
          dew_point: parseFloat(area.dewPoint) || undefined,
          internal_office_notes: area.internalNotes,
          moisture_readings_enabled: area.moistureReadingsEnabled,
          infrared_enabled: area.infraredEnabled,
          // Map infrared observations to boolean fields
          infrared_observation_no_active: area.infraredObservations.includes('No Active Water Intrusion Detected'),
          infrared_observation_water_infiltration: area.infraredObservations.includes('Active Water Infiltration'),
          infrared_observation_past_ingress: area.infraredObservations.includes('Past Water Ingress (Dried)'),
          infrared_observation_condensation: area.infraredObservations.includes('Condensation Pattern'),
          infrared_observation_missing_insulation: area.infraredObservations.includes('Missing/Inadequate Insulation'),
          job_time_minutes: area.timeWithoutDemo,
          demolition_required: area.demolitionRequired,
          demolition_time_minutes: area.demolitionTime,
          demolition_description: area.demolitionDescription
        }

        // Save area and get database area_id
        const dbAreaId = await saveInspectionArea(areaData)

        // Track this mapping for return value
        newMappings[area.id] = dbAreaId

        // Map frontend area.id to database area_id for photo uploads
        setAreaIdMapping(prev => ({
          ...prev,
          [area.id]: dbAreaId
        }))

        // Save moisture readings for this area
        console.log(`🔍 DEBUG: Checking moisture readings for area "${area.areaName}":`, {
          moistureReadingsEnabled: area.moistureReadingsEnabled,
          moistureReadingsLength: area.moistureReadings.length,
          moistureReadings: area.moistureReadings
        })

        if (area.moistureReadingsEnabled && area.moistureReadings.length > 0) {
          console.log(`✅ SAVING ${area.moistureReadings.length} moisture readings for area "${area.areaName}"`)
          // UPSERT moisture readings to preserve IDs (critical for photo linking)
          for (let j = 0; j < area.moistureReadings.length; j++) {
            const reading = area.moistureReadings[j]

            // Determine moisture status based on percentage
            // Valid enum values: 'dry', 'elevated', 'wet', 'very_wet'
            const percentage = parseFloat(reading.reading) || 0
            let status: 'dry' | 'elevated' | 'wet' | 'very_wet' = 'dry'
            if (percentage >= 40) {
              status = 'very_wet'
            } else if (percentage >= 25) {
              status = 'wet'
            } else if (percentage >= 15) {
              status = 'elevated'
            }

            // Query for existing reading by business key (area_id + reading_order)
            // This avoids the bug where frontend UUIDs and database UUIDs have the same format
            const { data: existingReading, error: fetchError } = await supabase
              .from('moisture_readings')
              .select('id')
              .eq('area_id', dbAreaId)
              .eq('reading_order', j)
              .maybeSingle()

            if (fetchError) {
              console.error(`Error checking existing moisture reading ${j + 1}:`, fetchError)
              continue
            }

            let insertedReading: any

            if (existingReading) {
              // UPDATE existing moisture reading using database ID
              const { data, error: updateError } = await supabase
                .from('moisture_readings')
                .update({
                  reading_order: j,
                  title: reading.title || '',
                  moisture_percentage: percentage || null,
                  moisture_status: status
                })
                .eq('id', existingReading.id)
                .select()
                .single()

              if (updateError) {
                console.error(`❌ Error updating moisture reading ${j + 1}:`, updateError)
                toast({
                  title: 'Error saving moisture reading',
                  description: `Failed to update "${reading.title}"`,
                  variant: 'destructive'
                })
                continue
              }
              insertedReading = data
              console.log(`✅ Updated moisture reading ${j + 1} "${reading.title}" (ID: ${data.id})`)
            } else {
              // INSERT new moisture reading
              const { data, error: insertError } = await supabase
                .from('moisture_readings')
                .insert({
                  area_id: dbAreaId,
                  reading_order: j,
                  title: reading.title || '',
                  moisture_percentage: percentage || null,
                  moisture_status: status
                })
                .select()
                .single()

              if (insertError) {
                console.error(`❌ Error inserting moisture reading ${j + 1}:`, insertError)
                toast({
                  title: 'Error saving moisture reading',
                  description: `Failed to save "${reading.title}"`,
                  variant: 'destructive'
                })
                continue
              }
              insertedReading = data
              console.log(`✅ Inserted moisture reading ${j + 1} "${reading.title}" (ID: ${data.id})`)
            }

            // Update photo to link it to this moisture reading
            console.log(`DEBUG: Moisture reading ${j + 1} "${reading.title}":`, {
              hasReading: !!insertedReading,
              readingId: insertedReading?.id,
              hasPhoto: !!reading.photo,
              photoId: reading.photo?.id || null
            })

            if (insertedReading && reading.photo) {
              const photoId = reading.photo.id
              console.log(`🔗 ATTEMPTING TO LINK PHOTO:`, {
                readingId: insertedReading.id,
                readingTitle: reading.title,
                photoId: photoId
              })

              const { data: updateData, error: updateError } = await supabase
                .from('photos')
                .update({ moisture_reading_id: insertedReading.id })
                .eq('id', photoId)
                .select()

              if (updateError) {
                console.error(`❌ ERROR LINKING PHOTO:`, {
                  error: updateError,
                  photoId: photoId,
                  readingId: insertedReading.id
                })
              } else {
                console.log(`✅ UPDATE QUERY SUCCESSFUL:`, {
                  rowsReturned: updateData?.length || 0,
                  updatedPhoto: updateData
                })

                // VERIFICATION: Query the database to confirm the update
                const { data: verifyData, error: verifyError } = await supabase
                  .from('photos')
                  .select('id, file_name, moisture_reading_id')
                  .eq('id', photoId)
                  .single()

                if (verifyError) {
                  console.error(`❌ VERIFICATION QUERY FAILED:`, verifyError)
                } else {
                  console.log(`🔍 VERIFICATION QUERY RESULT:`, verifyData)
                  if (verifyData.moisture_reading_id === insertedReading.id) {
                    console.log(`✅ CONFIRMED: Photo linked to moisture reading "${reading.title}"`)
                  } else {
                    console.error(`❌ VERIFICATION FAILED: Photo not properly linked!`, {
                      expected: insertedReading.id,
                      actual: verifyData.moisture_reading_id
                    })
                  }
                }
              }
            } else {
              console.warn(`⚠️ Skipping photo linking for reading ${j + 1} - no photo or reading not inserted`)
            }
          }

          console.log(`✅ Saved ${area.moistureReadings.length} moisture readings for area "${area.areaName}"`)
        } else {
          console.log(`⚠️ SKIPPING moisture readings for area "${area.areaName}": moistureReadingsEnabled=${area.moistureReadingsEnabled}, length=${area.moistureReadings.length}`)
        }
      }

      // Save subfloor data if enabled
      if (formData.subfloorEnabled) {
        // DEBUG: Log all subfloor form values before save
        console.log('🔍 DEBUG - Subfloor formData values:', {
          subfloorEnabled: formData.subfloorEnabled,
          subfloorObservations: formData.subfloorObservations,
          subfloorComments: formData.subfloorComments,
          subfloorLandscape: formData.subfloorLandscape,
          subfloorSanitation: formData.subfloorSanitation,
          subfloorRacking: formData.subfloorRacking,
          subfloorTreatmentTime: formData.subfloorTreatmentTime
        })

        // Use UPSERT to insert or update subfloor data (preserves existing ID if record exists)
        const { data: subfloorData, error: upsertError } = await supabase
          .from('subfloor_data')
          .upsert({
            inspection_id: inspectionId,
            observations: formData.subfloorObservations || null,
            comments: formData.subfloorComments || null,
            // Transform "Sloping Block" to "sloping_block" for database enum
            landscape: formData.subfloorLandscape ? formData.subfloorLandscape.toLowerCase().replace(/\s+/g, '_') : null,
            sanitation_required: formData.subfloorSanitation || false,
            racking_required: formData.subfloorRacking || false,
            treatment_time_minutes: formData.subfloorTreatmentTime || 0
          }, {
            onConflict: 'inspection_id'
          })
          .select()
          .single()

        if (upsertError) {
          console.error('Error saving subfloor data:', upsertError)
        } else {
          console.log('✅ Saved subfloor data (upsert)')

          // Save subfloor moisture readings if there are any
          if (subfloorData && formData.subfloorReadings && formData.subfloorReadings.length > 0) {
            // First, delete existing readings for this subfloor
            const { error: deleteReadingsError } = await supabase
              .from('subfloor_readings')
              .delete()
              .eq('subfloor_id', subfloorData.id)

            if (deleteReadingsError && deleteReadingsError.code !== 'PGRST116') {
              console.error('Error deleting old subfloor readings:', deleteReadingsError)
            }

            // Then insert new readings
            for (let i = 0; i < formData.subfloorReadings.length; i++) {
              const reading = formData.subfloorReadings[i]

              // Parse the moisture reading value
              const moistureValue = parseFloat(reading.reading)

              const { error: readingInsertError } = await supabase
                .from('subfloor_readings')
                .insert({
                  subfloor_id: subfloorData.id,
                  reading_order: i,
                  moisture_percentage: !isNaN(moistureValue) ? moistureValue : null,
                  location: reading.location || ''
                })

              if (readingInsertError) {
                console.error(`Error saving subfloor reading ${i}:`, readingInsertError)
              }
            }

            console.log(`✅ Saved ${formData.subfloorReadings.length} subfloor moisture readings`)
          }
        }
      }

      console.log('✅ Auto-saved inspection:', inspectionId)

      // Return the new mappings so photo upload can use them immediately
      return newMappings
    } catch (error) {
      console.error('Auto-save failed:', error)
      toast({
        title: 'Auto-save failed',
        description: 'Will retry in 30 seconds',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  // Wrapper for manual save that returns mapping
  const handleSave = async (): Promise<Record<string, string>> => {
    const mappings = await autoSave()

    // Show success toast if save completed without errors
    if (mappings) {
      toast({
        title: '✅ Saved successfully',
        description: 'All changes have been saved',
        variant: 'default'
      })
    }

    return mappings || {}
  }

  const handleNext = async () => {
    // Save before navigating to next section
    await autoSave()

    if (currentSection < sections.length - 1) {
      setCurrentSection(currentSection + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handlePrevious = async () => {
    // Save before navigating to previous section
    await autoSave()

    if (currentSection > 0) {
      setCurrentSection(currentSection - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleSubmit = async () => {
    // Validation
    if (!formData.inspector) {
      toast({ title: 'Required field', description: 'Inspector name is required', variant: 'destructive' })
      setCurrentSection(0)
      return
    }

    if (formData.areas.length === 0 || !formData.areas[0].areaName) {
      toast({ title: 'Required field', description: 'At least one inspection area is required', variant: 'destructive' })
      setCurrentSection(2) // Go to Area Inspection section
      return
    }

    setSaving(true)

    try {
      // Perform final save
      await autoSave()

      toast({
        title: 'Inspection completed!',
        description: 'Inspection saved successfully. Redirecting to dashboard...'
      })

      // Wait a moment for user to see the message
      await new Promise(resolve => setTimeout(resolve, 1500))

      navigate('/dashboard')
    } catch (error: any) {
      console.error('Failed to submit inspection:', error)
      toast({
        title: 'Submission failed',
        description: error.message || 'Failed to save inspection. Please try again.',
        variant: 'destructive'
      })
      setSaving(false)
    }
  }

  const calculateProgress = () => {
    return Math.round((currentSection / (sections.length - 1)) * 100)
  }

  if (loading) {
    return (
      <div className="inspection-form-page">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading inspection form...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <TopNavbar />
      <div className="inspection-form-page">
        <div className="inspection-background">
          <div className="gradient-orb orb-1"></div>
          <div className="gradient-orb orb-2"></div>
        </div>

        {/* Sticky Navigation */}
        <nav className="inspection-nav">
        <div className="nav-container">
          <button 
            type="button"
            className="back-btn"
            onClick={() => {
              if (window.confirm('Are you sure? Unsaved changes will be lost.')) {
                navigate('/inspection/select-lead')
              }
            }}
          >
            <span className="back-arrow">←</span>
            <span>Exit</span>
          </button>
          
          <div className="nav-info">
            <span className="nav-title">{formData.jobNumber}</span>
            {saving && (
              <span className="save-indicator">
                <Save size={16} strokeWidth={2} />
                Saving...
              </span>
            )}
          </div>
        </div>
        
        <div className="progress-container">
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${calculateProgress()}%` }}
            />
          </div>
          <span className="progress-text">
            {calculateProgress()}% Complete • Section {currentSection + 1} of {sections.length}
          </span>
        </div>
      </nav>

      {/* Main Content */}
      <main className="inspection-main">
        <div className="inspection-container">
          {/* Section Header */}
          <div className="section-header-card">
            <div className="section-icon-large">
              {sections[currentSection].icon}
            </div>
            <h1 className="section-title">{sections[currentSection].title}</h1>
            <p className="section-subtitle">
              Section {currentSection + 1} of {sections.length}
            </p>
          </div>

          {/* Lead Summary Card */}
          {lead && (
            <div className="lead-summary-card">
              <h3 className="summary-title">Customer & Property Information</h3>
              <div className="summary-grid">
                <div className="summary-item">
                  <span className="summary-label">Customer</span>
                  <span className="summary-value">{lead.name}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Phone</span>
                  <span className="summary-value">{lead.phone}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Email</span>
                  <span className="summary-value">{lead.email}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Property</span>
                  <span className="summary-value">{lead.property}</span>
                </div>
                {lead.urgency && (
                  <div className="summary-item">
                    <span className="summary-label">Urgency</span>
                    <span className={`urgency-badge-mini ${lead.urgency.toLowerCase()}`}>
                      {lead.urgency}
                    </span>
                  </div>
                )}
                {lead.scheduledDate && (
                  <div className="summary-item">
                    <span className="summary-label">Scheduled</span>
                    <span className="summary-value">
                      {new Date(lead.scheduledDate).toLocaleString('en-AU', { 
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Dynamic Section Content */}
          <div className="form-content">
            
            {/* SECTION 1: BASIC INFORMATION */}
            {currentSection === 0 && (
              <div className="form-section">
                <h2 className="subsection-title">Basic Information</h2>
                
                <div className="form-group">
                  <label className="form-label">Job Number</label>
                  <input
                    type="text"
                    value={formData.jobNumber}
                    className="form-input"
                    readOnly
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Triage (Job Description)</label>
                  <textarea
                    value={formData.triage}
                    className="form-textarea"
                    rows={3}
                    readOnly
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    className="form-input"
                    readOnly
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Inspector *</label>
                  <select
                    value={formData.inspector}
                    onChange={(e) => handleInputChange('inspector', e.target.value)}
                    className="form-select"
                  >
                    <option value="">Select inspector...</option>
                    {technicians.map(tech => (
                      <option key={tech.id} value={tech.id}>{tech.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Requested By</label>
                  <input
                    type="text"
                    value={formData.requestedBy}
                    className="form-input"
                    readOnly
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Attention To</label>
                  <input
                    type="text"
                    value={formData.attentionTo}
                    onChange={(e) => handleInputChange('attentionTo', e.target.value)}
                    placeholder="Company or person name"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Inspection Date *</label>
                  <input
                    type="date"
                    value={formData.inspectionDate}
                    onChange={(e) => handleInputChange('inspectionDate', e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>
            )}

            {/* SECTION 2: PROPERTY DETAILS */}
            {currentSection === 1 && (
              <div className="form-section">
                <h2 className="subsection-title">Property Details</h2>
                
                <div className="form-group">
                  <label className="form-label">Property Occupation *</label>
                  <select
                    value={formData.propertyOccupation}
                    onChange={(e) => handleInputChange('propertyOccupation', e.target.value)}
                    className="form-select"
                  >
                    <option value="">Select occupation type...</option>
                    <option value="tenanted">Tenanted</option>
                    <option value="vacant">Vacant</option>
                    <option value="owner_occupied">Owner Occupied</option>
                    <option value="tenants_vacating">Tenants Vacating</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Dwelling Type *</label>
                  <select
                    value={formData.dwellingType}
                    onChange={(e) => handleInputChange('dwellingType', e.target.value)}
                    className="form-select"
                  >
                    <option value="">Select dwelling type...</option>
                    <option value="house">House</option>
                    <option value="units">Units</option>
                    <option value="apartment">Apartment</option>
                    <option value="duplex">Duplex</option>
                    <option value="townhouse">Townhouse</option>
                    <option value="commercial">Commercial</option>
                    <option value="construction">Construction</option>
                    <option value="industrial">Industrial</option>
                  </select>
                </div>
              </div>
            )}

            {/* SECTION 3: AREA INSPECTION (REPEATABLE) */}
            {currentSection === 2 && (
              <div className="form-section">
                <h2 className="subsection-title">Area Inspection</h2>
                <p className="field-hint">Inspect each area/room and record findings. You can add multiple areas.</p>

                {formData.areas.map((area, areaIndex) => (
                  <div key={area.id} className="area-inspection-card">
                    <div className="area-header">
                      <span className="area-number">Area {areaIndex + 1}</span>
                      {formData.areas.length > 1 && (
                        <button
                          type="button"
                          className="btn-remove-area"
                          onClick={() => removeArea(area.id)}
                        >
                          <X size={16} strokeWidth={2} />
                          Remove Area
                        </button>
                      )}
                    </div>

                    {/* Area Name */}
                    <div className="form-group">
                      <label className="form-label">Area Name *</label>
                      <input
                        type="text"
                        value={area.areaName}
                        onChange={(e) => handleAreaChange(area.id, 'areaName', e.target.value)}
                        placeholder="e.g., Master Bedroom, Bathroom, Living Room"
                        className="form-input"
                      />
                    </div>

                    {/* Mould Visibility */}
                    <div className="form-group">
                      <label className="form-label">Mould Visibility (select all that apply)</label>
                      <div className="checkbox-grid">
                        {[
                          'Ceiling', 'Cornice', 'Windows', 'Window Furnishings',
                          'Walls', 'Skirting', 'Flooring', 'Wardrobe',
                          'Cupboard', 'Contents', 'Grout/Silicone', 'No Mould Visible'
                        ].map(option => (
                          <label key={option} className="checkbox-option">
                            <input
                              type="checkbox"
                              checked={area.mouldVisibility.includes(option)}
                              onChange={() => handleAreaArrayToggle(area.id, 'mouldVisibility', option)}
                            />
                            <span className="checkbox-custom"></span>
                            <span className="checkbox-label">{option}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Comments Shown in Report */}
                    <div className="form-group">
                      <label className="form-label">Comments/Findings</label>
                      <textarea
                        value={area.commentsForReport}
                        onChange={(e) => handleAreaChange(area.id, 'commentsForReport', e.target.value)}
                        placeholder="Enter your findings and observations for this area..."
                        className="form-textarea"
                        rows={4}
                      />
                    </div>

                    {/* Temperature, Humidity, Dew Point */}
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Temperature (°C)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={area.temperature}
                          onChange={(e) => {
                            handleAreaChange(area.id, 'temperature', e.target.value)
                            calculateAreaDewPoint(area.id)
                          }}
                          className="form-input"
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Humidity (%)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={area.humidity}
                          onChange={(e) => {
                            handleAreaChange(area.id, 'humidity', e.target.value)
                            calculateAreaDewPoint(area.id)
                          }}
                          className="form-input"
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Dew Point (°C)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={area.dewPoint}
                          className="form-input"
                          readOnly
                        />
                      </div>
                    </div>

                    {/* Moisture Readings Toggle */}
                    <div className="form-group">
                      <div className="toggle-section-header">
                        <label className="form-label">Moisture Readings</label>
                        <button
                          type="button"
                          className={`toggle-switch ${area.moistureReadingsEnabled ? 'active' : ''}`}
                          onClick={() => handleAreaChange(area.id, 'moistureReadingsEnabled', !area.moistureReadingsEnabled)}
                        >
                          <span className="toggle-label">
                            {area.moistureReadingsEnabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </button>
                      </div>

                      {area.moistureReadingsEnabled && (
                        <div className="moisture-readings-section">
                          <p className="field-hint">Minimum 2 moisture reading photos required *</p>
                          {area.moistureReadings.map((reading, idx) => (
                            <div key={reading.id} className="reading-item">
                              <div className="reading-header">
                                <span className="reading-number">Reading {idx + 1}</span>
                                <button
                                  type="button"
                                  className="btn-remove"
                                  onClick={() => removeMoistureReading(area.id, reading.id)}
                                >
                                  <X size={16} strokeWidth={2} />
                                </button>
                              </div>

                              <div className="reading-inputs">
                                <input
                                  type="text"
                                  placeholder="Location (e.g., Wall behind shower)"
                                  value={reading.title}
                                  onChange={(e) => updateMoistureReading(area.id, reading.id, 'title', e.target.value)}
                                  className="form-input"
                                />

                                <input
                                  type="text"
                                  placeholder="Reading value"
                                  value={reading.reading}
                                  onChange={(e) => updateMoistureReading(area.id, reading.id, 'reading', e.target.value)}
                                  className="form-input"
                                />

                                {!reading.photo ? (
                                  <button
                                    type="button"
                                    className="btn-photo-small"
                                    onClick={() => handlePhotoCapture('moistureReading', area.id, reading.id)}
                                  >
                                    📷 Add Photo
                                  </button>
                                ) : (
                                  <div className="photo-item-small">
                                    <img src={reading.photo.url} alt="Moisture reading" />
                                    <button
                                      type="button"
                                      className="photo-remove-small"
                                      onClick={() => removePhoto('moistureReading', reading.photo!.id, area.id, reading.id)}
                                    >
                                      <X size={14} strokeWidth={2} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}

                          <button
                            type="button"
                            className="btn-secondary btn-add"
                            onClick={() => addMoistureReading(area.id)}
                          >
                            <span>+</span>
                            <span>Add Moisture Reading</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Internal Office Notes */}
                    <div className="form-group">
                      <label className="form-label">Internal Office Notes</label>
                      <p className="field-hint internal-note">⚠️ These notes are ONLY for admin - not shown in report</p>
                      <textarea
                        value={area.internalNotes}
                        onChange={(e) => handleAreaChange(area.id, 'internalNotes', e.target.value)}
                        placeholder="Private notes for technicians and office staff only..."
                        className="form-textarea internal-notes"
                        rows={3}
                      />
                    </div>

                    {/* Room View Photos (4 required) */}
                    <div className="form-group">
                      <label className="form-label">Room View Photos (4 required) *</label>
                      <p className="field-hint">Upload exactly 4 photos showing the room from different angles</p>
                      <button
                        type="button"
                        className="btn-photo"
                        onClick={() => handlePhotoCapture('roomView', area.id)}
                        disabled={area.roomViewPhotos.length >= 4}
                      >
                        <span>📷</span>
                        <span>Attach from Photo Library</span>
                      </button>

                      {area.roomViewPhotos.length > 0 && (
                        <div className="photo-grid">
                          {area.roomViewPhotos.map(photo => (
                            <div key={photo.id} className="photo-item">
                              <img src={photo.url} alt="Room view" />
                              <button
                                type="button"
                                className="photo-remove"
                                onClick={() => removePhoto('roomView', photo.id, area.id)}
                              >
                                <X size={16} strokeWidth={2} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <p className="photo-count">{area.roomViewPhotos.length} / 4 photos</p>
                    </div>

                    {/* Infrared View Toggle */}
                    <div className="form-group">
                      <div className="toggle-section-header">
                        <label className="form-label">Infrared View</label>
                        <button
                          type="button"
                          className={`toggle-switch ${area.infraredEnabled ? 'active' : ''}`}
                          onClick={() => handleAreaChange(area.id, 'infraredEnabled', !area.infraredEnabled)}
                        >
                          <span className="toggle-label">
                            {area.infraredEnabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </button>
                      </div>

                      {area.infraredEnabled && (
                        <div className="infrared-section">
                          <p className="field-hint">2 infrared photos required (Infrared View + Natural Infrared View) *</p>
                          <div className="form-group">
                            <label className="form-label">Infrared View Photo *</label>
                            <button
                              type="button"
                              className="btn-photo"
                              onClick={() => handlePhotoCapture('infrared', area.id)}
                            >
                              <span>📷</span>
                              <span>Upload Infrared Photo</span>
                            </button>
                            {area.infraredPhoto && (
                              <div className="single-photo">
                                <img src={area.infraredPhoto.url} alt="Infrared" />
                              </div>
                            )}
                          </div>

                          <div className="form-group">
                            <label className="form-label">Natural Infrared View Photo *</label>
                            <button
                              type="button"
                              className="btn-photo"
                              onClick={() => handlePhotoCapture('naturalInfrared', area.id)}
                            >
                              <span>📷</span>
                              <span>Upload Natural Infrared Photo</span>
                            </button>
                            {area.naturalInfraredPhoto && (
                              <div className="single-photo">
                                <img src={area.naturalInfraredPhoto.url} alt="Natural infrared" />
                              </div>
                            )}
                          </div>

                          <div className="form-group">
                            <label className="form-label">Infrared Observations</label>
                            <div className="checkbox-grid">
                              {[
                                'No Active Water Intrusion Detected',
                                'Active Water Infiltration',
                                'Past Water Ingress (Dried)',
                                'Condensation Pattern',
                                'Missing/Inadequate Insulation'
                              ].map(option => (
                                <label key={option} className="checkbox-option">
                                  <input
                                    type="checkbox"
                                    checked={area.infraredObservations.includes(option)}
                                    onChange={() => handleAreaArrayToggle(area.id, 'infraredObservations', option)}
                                  />
                                  <span className="checkbox-custom"></span>
                                  <span className="checkbox-label">{option}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Time for Job (Without Demolition) */}
                    <div className="form-group">
                      <label className="form-label">Time for Job (Without Demolition) - Minutes *</label>
                      <input
                        type="number"
                        min="0"
                        value={area.timeWithoutDemo}
                        onChange={(e) => handleAreaChange(area.id, 'timeWithoutDemo', parseInt(e.target.value) || 0)}
                        className="form-input"
                        placeholder="Enter time in minutes"
                      />
                    </div>

                    {/* Demolition Required Toggle */}
                    <div className="form-group">
                      <div className="toggle-section-header">
                        <label className="form-label">Is Demolition Required?</label>
                        <button
                          type="button"
                          className={`toggle-switch ${area.demolitionRequired ? 'active' : ''}`}
                          onClick={() => handleAreaChange(area.id, 'demolitionRequired', !area.demolitionRequired)}
                        >
                          <span className="toggle-label">
                            {area.demolitionRequired ? 'Yes' : 'No'}
                          </span>
                        </button>
                      </div>

                      {area.demolitionRequired && (
                        <div className="demolition-section">
                          <div className="form-group">
                            <label className="form-label">Time for Demolition - Minutes *</label>
                            <input
                              type="number"
                              min="0"
                              value={area.demolitionTime}
                              onChange={(e) => handleAreaChange(area.id, 'demolitionTime', parseInt(e.target.value) || 0)}
                              className="form-input"
                              placeholder="Enter demolition time in minutes"
                            />
                          </div>

                          <div className="form-group">
                            <label className="form-label">Demolition List</label>
                            <textarea
                              value={area.demolitionDescription}
                              onChange={(e) => handleAreaChange(area.id, 'demolitionDescription', e.target.value)}
                              placeholder="Enter demolition requirements (e.g., Removal of damaged drywall, Removal of carpet and underlay, Removal of wet insulation)"
                              className="form-textarea"
                              rows={4}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Add Another Area */}
                <button
                  type="button"
                  className="btn-primary btn-add-area"
                  onClick={addArea}
                >
                  <span>+</span>
                  <span>Add Another Area</span>
                </button>
              </div>
            )}

            {/* SECTION 4: SUBFLOOR */}
            {currentSection === 3 && (
              <div className="form-section">
                <h2 className="subsection-title">Subfloor</h2>

                <div className="toggle-section-main">
                  <div className="toggle-section-header">
                    <label className="form-label">Enable Subfloor Section</label>
                    <button
                      type="button"
                      className={`toggle-switch ${formData.subfloorEnabled ? 'active' : ''}`}
                      onClick={() => handleInputChange('subfloorEnabled', !formData.subfloorEnabled)}
                    >
                      <span className="toggle-label">
                        {formData.subfloorEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </button>
                  </div>

                  {formData.subfloorEnabled && (
                    <div className="subfloor-content">
                      <div className="form-group">
                        <label className="form-label">Subfloor Observations</label>
                        <p className="field-hint">Raw notes - will be used to generate professional report text</p>
                        <textarea
                          value={formData.subfloorObservations}
                          onChange={(e) => handleInputChange('subfloorObservations', e.target.value)}
                          placeholder="Note any observations about subfloor condition, moisture, ventilation..."
                          className="form-textarea"
                          rows={4}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Subfloor Landscape</label>
                        <div className="toggle-group">
                          {['Flat Block', 'Sloping Block'].map(option => (
                            <button
                              key={option}
                              type="button"
                              className={`toggle-btn ${formData.subfloorLandscape === option ? 'active' : ''}`}
                              onClick={() => handleInputChange('subfloorLandscape', option)}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Subfloor Comments</label>
                        <textarea
                          value={formData.subfloorComments}
                          onChange={(e) => handleInputChange('subfloorComments', e.target.value)}
                          placeholder="Enter your observations and findings about the subfloor area..."
                          className="form-textarea"
                          rows={4}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Subfloor Moisture Readings</label>
                        {formData.subfloorReadings.map((reading, idx) => (
                          <div key={reading.id} className="reading-item">
                            <div className="reading-header">
                              <span className="reading-number">Reading {idx + 1}</span>
                              <button
                                type="button"
                                className="btn-remove"
                                onClick={() => removeSubfloorReading(reading.id)}
                              >
                                <X size={16} strokeWidth={2} />
                              </button>
                            </div>

                            <div className="reading-inputs">
                              <input
                                type="text"
                                placeholder="Reading value"
                                value={reading.reading}
                                onChange={(e) => updateSubfloorReading(reading.id, 'reading', e.target.value)}
                                className="form-input"
                              />

                              <input
                                type="text"
                                placeholder="Location"
                                value={reading.location}
                                onChange={(e) => updateSubfloorReading(reading.id, 'location', e.target.value)}
                                className="form-input"
                              />
                            </div>
                          </div>
                        ))}

                        <button
                          type="button"
                          className="btn-secondary btn-add"
                          onClick={addSubfloorReading}
                        >
                          <span>+</span>
                          <span>Add Subfloor Reading</span>
                        </button>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Subfloor Photos (up to 20)</label>
                        <button
                          type="button"
                          className="btn-photo"
                          onClick={() => handlePhotoCapture('subfloor')}
                        >
                          <span>📷</span>
                          <span>Attach from Photo Library</span>
                        </button>

                        {formData.subfloorPhotos.length > 0 && (
                          <div className="photo-grid">
                            {formData.subfloorPhotos.map(photo => (
                              <div key={photo.id} className="photo-item">
                                <img src={photo.url} alt="Subfloor" />
                                <button
                                  type="button"
                                  className="photo-remove"
                                  onClick={() => removePhoto('subfloor', photo.id)}
                                >
                                  <X size={16} strokeWidth={2} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        <p className="photo-count">{formData.subfloorPhotos.length} / 20 photos</p>
                      </div>

                      <div className="form-group">
                        <div className="toggle-section-header">
                          <label className="form-label">Subfloor Sanitation</label>
                          <button
                            type="button"
                            className={`toggle-switch ${formData.subfloorSanitation ? 'active' : ''}`}
                            onClick={() => handleInputChange('subfloorSanitation', !formData.subfloorSanitation)}
                          >
                            <span className="toggle-label">
                              {formData.subfloorSanitation ? 'Yes' : 'No'}
                            </span>
                          </button>
                        </div>
                        {formData.subfloorSanitation && (
                          <p className="field-hint">✓ Pre-made sanitation page will be added to PDF report</p>
                        )}
                      </div>

                      {formData.subfloorSanitation && (
                        <div className="form-group">
                          <div className="toggle-section-header">
                            <label className="form-label">Subfloor Racking</label>
                            <button
                              type="button"
                              className={`toggle-switch ${formData.subfloorRacking ? 'active' : ''}`}
                              onClick={() => handleInputChange('subfloorRacking', !formData.subfloorRacking)}
                            >
                              <span className="toggle-label">
                                {formData.subfloorRacking ? 'Yes' : 'No'}
                              </span>
                            </button>
                          </div>
                          {formData.subfloorRacking && (
                            <p className="field-hint">✓ Pre-made racking page will be added to PDF report</p>
                          )}
                        </div>
                      )}

                      <div className="form-group">
                        <label className="form-label">Subfloor Treatment Time (Minutes)</label>
                        <input
                          type="number"
                          min="0"
                          value={formData.subfloorTreatmentTime}
                          onChange={(e) => handleInputChange('subfloorTreatmentTime', parseInt(e.target.value) || 0)}
                          className="form-input"
                          placeholder="Enter time in minutes"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SECTION 5: OUTDOOR INFORMATION */}
            {currentSection === 4 && (
              <div className="form-section">
                <h2 className="subsection-title">Outdoor Information</h2>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Temperature (°C)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.outdoorTemperature}
                      onChange={(e) => {
                        handleInputChange('outdoorTemperature', e.target.value)
                        calculateOutdoorDewPoint()
                      }}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Humidity (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.outdoorHumidity}
                      onChange={(e) => {
                        handleInputChange('outdoorHumidity', e.target.value)
                        calculateOutdoorDewPoint()
                      }}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Dew Point (°C)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.outdoorDewPoint}
                      className="form-input"
                      readOnly
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Outdoor Comments</label>
                  <textarea
                    value={formData.outdoorComments}
                    onChange={(e) => handleInputChange('outdoorComments', e.target.value)}
                    placeholder="General outdoor observations..."
                    className="form-textarea"
                    rows={3}
                  />
                </div>

                <div className="outdoor-photos-grid">
                  <div className="form-group">
                    <label className="form-label">Front Door Photo</label>
                    <button
                      type="button"
                      className="btn-photo"
                      onClick={() => handlePhotoCapture('frontDoor')}
                    >
                      <span>📷</span>
                      <span>Capture Front Door</span>
                    </button>
                    {formData.frontDoorPhoto && (
                      <div className="single-photo">
                        <img src={formData.frontDoorPhoto.url} alt="Front door" />
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Front of House Photo</label>
                    <button
                      type="button"
                      className="btn-photo"
                      onClick={() => handlePhotoCapture('frontHouse')}
                    >
                      <span>📷</span>
                      <span>Capture Front House</span>
                    </button>
                    {formData.frontHousePhoto && (
                      <div className="single-photo">
                        <img src={formData.frontHousePhoto.url} alt="Front house" />
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Mailbox Photo</label>
                    <button
                      type="button"
                      className="btn-photo"
                      onClick={() => handlePhotoCapture('mailbox')}
                    >
                      <span>📷</span>
                      <span>Capture Mailbox</span>
                    </button>
                    {formData.mailboxPhoto && (
                      <div className="single-photo">
                        <img src={formData.mailboxPhoto.url} alt="Mailbox" />
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Street Photo</label>
                    <button
                      type="button"
                      className="btn-photo"
                      onClick={() => handlePhotoCapture('street')}
                    >
                      <span>📷</span>
                      <span>Capture Street View</span>
                    </button>
                    {formData.streetPhoto && (
                      <div className="single-photo">
                        <img src={formData.streetPhoto.url} alt="Street" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <div className="toggle-section-header">
                    <label className="form-label">Direction Photos (for navigation)</label>
                    <button
                      type="button"
                      className={`toggle-switch ${formData.directionPhotosEnabled ? 'active' : ''}`}
                      onClick={() => handleInputChange('directionPhotosEnabled', !formData.directionPhotosEnabled)}
                    >
                      <span className="toggle-label">
                        {formData.directionPhotosEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </button>
                  </div>
                  <p className="field-hint">For technicians to find the house again</p>

                  {formData.directionPhotosEnabled && (
                    <>
                      <button
                        type="button"
                        className="btn-photo"
                        onClick={() => handlePhotoCapture('direction')}
                      >
                        <span>📷</span>
                        <span>Add Direction Photo</span>
                      </button>

                      {formData.directionPhoto && (
                        <div className="single-photo">
                          <img src={formData.directionPhoto.url} alt="Direction" />
                          <button
                            type="button"
                            className="photo-remove"
                            onClick={() => removePhoto('direction', formData.directionPhoto!.id)}
                          >
                            <X size={16} strokeWidth={2} />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* SECTION 6: WASTE DISPOSAL */}
            {currentSection === 5 && (
              <div className="form-section">
                <h2 className="subsection-title">Waste Disposal</h2>

                <div className="toggle-section-main">
                  <div className="toggle-section-header">
                    <label className="form-label">Enable Waste Disposal</label>
                    <button
                      type="button"
                      className={`toggle-switch ${formData.wasteDisposalEnabled ? 'active' : ''}`}
                      onClick={() => handleInputChange('wasteDisposalEnabled', !formData.wasteDisposalEnabled)}
                    >
                      <span className="toggle-label">
                        {formData.wasteDisposalEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </button>
                  </div>

                  {formData.wasteDisposalEnabled && (
                    <div className="form-group">
                      <label className="form-label">Waste Disposal Amount *</label>
                      <select
                        value={formData.wasteDisposalAmount}
                        onChange={(e) => handleInputChange('wasteDisposalAmount', e.target.value)}
                        className="form-select"
                      >
                        <option value="">Select amount...</option>
                        <option value="Small (Disposal Bags)">Small (Disposal Bags)</option>
                        <option value="Medium (Fill Van)">Medium (Fill Van)</option>
                        <option value="Large (Fill 2 Vans)">Large (Fill 2 Vans)</option>
                        <option value="Extra Large (Fill Skip)">Extra Large (Fill Skip)</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SECTION 7: WORK PROCEDURE */}
            {currentSection === 6 && (
              <div className="form-section">
                <h2 className="subsection-title">Work Procedure</h2>

                <div className="procedures-list">
                  <div className="procedure-item">
                    <div className="toggle-section-header">
                      <label className="form-label">HEPA VAC</label>
                      <button
                        type="button"
                        className={`toggle-switch ${formData.hepaVac ? 'active' : ''}`}
                        onClick={() => handleInputChange('hepaVac', !formData.hepaVac)}
                      >
                        <span className="toggle-slider"></span>
                      </button>
                    </div>
                  </div>

                  <div className="procedure-item">
                    <div className="toggle-section-header">
                      <label className="form-label">Antimicrobial</label>
                      <button
                        type="button"
                        className={`toggle-switch ${formData.antimicrobial ? 'active' : ''}`}
                        onClick={() => handleInputChange('antimicrobial', !formData.antimicrobial)}
                      >
                        <span className="toggle-slider"></span>
                      </button>
                    </div>
                  </div>

                  <div className="procedure-item">
                    <div className="toggle-section-header">
                      <label className="form-label">Stain Removing Antimicrobial</label>
                      <button
                        type="button"
                        className={`toggle-switch ${formData.stainRemovingAntimicrobial ? 'active' : ''}`}
                        onClick={() => handleInputChange('stainRemovingAntimicrobial', !formData.stainRemovingAntimicrobial)}
                      >
                        <span className="toggle-slider"></span>
                      </button>
                    </div>
                  </div>

                  <div className="procedure-item">
                    <div className="toggle-section-header">
                      <label className="form-label">Home Sanitation and Fogging</label>
                      <button
                        type="button"
                        className={`toggle-switch ${formData.homeSanitationFogging ? 'active' : ''}`}
                        onClick={() => handleInputChange('homeSanitationFogging', !formData.homeSanitationFogging)}
                      >
                        <span className="toggle-slider"></span>
                      </button>
                    </div>
                  </div>

                  <div className="procedure-item">
                    <div className="toggle-section-header">
                      <label className="form-label">Drying Equipment</label>
                      <button
                        type="button"
                        className={`toggle-switch ${formData.dryingEquipmentEnabled ? 'active' : ''}`}
                        onClick={() => handleInputChange('dryingEquipmentEnabled', !formData.dryingEquipmentEnabled)}
                      >
                        <span className="toggle-label">
                          {formData.dryingEquipmentEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </button>
                    </div>

                    {formData.dryingEquipmentEnabled && (
                      <div className="equipment-details">
                        <div className="equipment-item">
                          <div className="toggle-section-header">
                            <label className="form-label">Commercial Dehumidifier</label>
                            <button
                              type="button"
                              className={`toggle-switch ${formData.commercialDehumidifierEnabled ? 'active' : ''}`}
                              onClick={() => handleInputChange('commercialDehumidifierEnabled', !formData.commercialDehumidifierEnabled)}
                            >
                              <span className="toggle-slider"></span>
                            </button>
                          </div>
                          {formData.commercialDehumidifierEnabled && (
                            <input
                              type="number"
                              min="0"
                              value={formData.commercialDehumidifierQty}
                              onChange={(e) => handleInputChange('commercialDehumidifierQty', parseInt(e.target.value) || 0)}
                              placeholder="Quantity"
                              className="form-input"
                            />
                          )}
                        </div>

                        <div className="equipment-item">
                          <div className="toggle-section-header">
                            <label className="form-label">Air Movers</label>
                            <button
                              type="button"
                              className={`toggle-switch ${formData.airMoversEnabled ? 'active' : ''}`}
                              onClick={() => handleInputChange('airMoversEnabled', !formData.airMoversEnabled)}
                            >
                              <span className="toggle-slider"></span>
                            </button>
                          </div>
                          {formData.airMoversEnabled && (
                            <input
                              type="number"
                              min="0"
                              value={formData.airMoversQty}
                              onChange={(e) => handleInputChange('airMoversQty', parseInt(e.target.value) || 0)}
                              placeholder="Quantity"
                              className="form-input"
                            />
                          )}
                        </div>

                        <div className="equipment-item">
                          <div className="toggle-section-header">
                            <label className="form-label">RCD Box</label>
                            <button
                              type="button"
                              className={`toggle-switch ${formData.rcdBoxEnabled ? 'active' : ''}`}
                              onClick={() => handleInputChange('rcdBoxEnabled', !formData.rcdBoxEnabled)}
                            >
                              <span className="toggle-slider"></span>
                            </button>
                          </div>
                          {formData.rcdBoxEnabled && (
                            <input
                              type="number"
                              min="0"
                              value={formData.rcdBoxQty}
                              onChange={(e) => handleInputChange('rcdBoxQty', parseInt(e.target.value) || 0)}
                              placeholder="Quantity"
                              className="form-input"
                            />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 8: JOB SUMMARY */}
            {currentSection === 7 && (
              <div className="form-section">
                <h2 className="subsection-title">Job Summary</h2>

                <div className="form-group">
                  <div className="toggle-section-header">
                    <label className="form-label">Recommend Dehumidifier?</label>
                    <button
                      type="button"
                      className={`toggle-switch ${formData.recommendDehumidifier ? 'active' : ''}`}
                      onClick={() => handleInputChange('recommendDehumidifier', !formData.recommendDehumidifier)}
                    >
                      <span className="toggle-label">
                        {formData.recommendDehumidifier ? 'Yes' : 'No'}
                      </span>
                    </button>
                  </div>

                  {formData.recommendDehumidifier && (
                    <select
                      value={formData.dehumidifierSize}
                      onChange={(e) => handleInputChange('dehumidifierSize', e.target.value)}
                      className="form-select"
                    >
                      <option value="">Select size...</option>
                      <option value="Small (1 Dehumidifier)">Small (1 Dehumidifier)</option>
                      <option value="Medium (2 Dehumidifiers)">Medium (2 Dehumidifiers)</option>
                      <option value="Large (Home Built-in Dehumidifier)">Large (Home Built-in Dehumidifier)</option>
                    </select>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Cause of Mould</label>
                  <textarea
                    value={formData.causeOfMould}
                    onChange={(e) => handleInputChange('causeOfMould', e.target.value)}
                    placeholder="Describe the cause of mould (e.g., water leak, poor ventilation, condensation)"
                    className="form-textarea"
                    rows={4}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Additional Information for Technician</label>
                  <textarea
                    value={formData.additionalInfoForTech}
                    onChange={(e) => handleInputChange('additionalInfoForTech', e.target.value)}
                    placeholder="Internal notes for job execution..."
                    className="form-textarea"
                    rows={3}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Additional Equipment Comments for Technicians</label>
                  <textarea
                    value={formData.additionalEquipmentComments}
                    onChange={(e) => handleInputChange('additionalEquipmentComments', e.target.value)}
                    placeholder="Equipment-specific notes..."
                    className="form-textarea"
                    rows={3}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Parking Options</label>
                  <select
                    value={formData.parkingOptions}
                    onChange={(e) => handleInputChange('parkingOptions', e.target.value)}
                    className="form-select"
                  >
                    <option value="">Select parking option...</option>
                    <option value="Driveway">Driveway</option>
                    <option value="Street">Street</option>
                    <option value="Carpark">Carpark</option>
                    <option value="Visitor Carpark">Visitor Carpark</option>
                    <option value="No Nearby Parking">No Nearby Parking</option>
                  </select>
                </div>
              </div>
            )}

            {/* SECTION 9: COST ESTIMATE */}
            {currentSection === 8 && (
              <div className="form-section">
                <h2 className="subsection-title">Cost Estimate</h2>

                <div className="form-group">
                  <label className="form-label">Estimated Days for Equipment Hire</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.estimatedDays}
                    onChange={(e) => handleInputChange('estimatedDays', parseInt(e.target.value) || 1)}
                    className="form-input"
                    placeholder="Number of days"
                  />
                </div>

                <div className="cost-summary-card">
                  <h3 className="cost-title">Cost Breakdown</h3>

                  <div className="cost-row">
                    <span className="cost-label">Labor Cost:</span>
                    <span className="cost-value">{formatCurrency(formData.laborCost)}</span>
                  </div>

                  <div className="cost-row">
                    <span className="cost-label">Equipment Hire:</span>
                    <span className="cost-value">{formatCurrency(formData.equipmentCost)}</span>
                  </div>

                  <div className="cost-row subtotal">
                    <span className="cost-label">Subtotal (Ex GST):</span>
                    <span className="cost-value">{formatCurrency(formData.subtotal)}</span>
                  </div>

                  <div className="cost-row">
                    <span className="cost-label">GST (10%):</span>
                    <span className="cost-value">{formatCurrency(formData.gst)}</span>
                  </div>

                  <div className="cost-row total">
                    <span className="cost-label">TOTAL (Inc GST):</span>
                    <span className="cost-value">{formatCurrency(formData.totalCost)}</span>
                  </div>
                </div>

                <div className="cost-note">
                  <p>💡 This is an automated calculation based on your inspection data. The cost updates in real-time as you fill in the form.</p>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="form-navigation">
            {currentSection > 0 && (
              <button
                type="button"
                className="btn-nav btn-previous"
                onClick={handlePrevious}
              >
                <span>←</span>
                <span>Previous</span>
              </button>
            )}

            {/* Save Button - Always visible */}
            <button
              type="button"
              className="btn-primary"
              onClick={handleSave}
              disabled={saving}
              style={{
                minWidth: '120px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {saving ? (
                <>
                  <span className="loading-spinner-small"></span>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span>💾</span>
                  <span>Save</span>
                </>
              )}
            </button>

            {currentSection < sections.length - 1 ? (
              <button
                type="button"
                className="btn-nav btn-next"
                onClick={handleNext}
              >
                <span>Next</span>
                <span>→</span>
              </button>
            ) : (
              <button 
                type="button"
                className="btn-primary btn-submit"
                onClick={handleSubmit}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <span className="loading-spinner-small"></span>
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <span>✓</span>
                    <span>Complete Inspection</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Quick Section Navigation */}
          <div className="section-dots">
            {sections.map((section, index) => (
              <button
                key={section.id}
                type="button"
                className={`section-dot ${index === currentSection ? 'active' : ''} ${index < currentSection ? 'completed' : ''}`}
                onClick={() => setCurrentSection(index)}
                title={section.title}
              >
                <span className="dot-icon">{section.icon}</span>
                <span className="dot-label">{section.title}</span>
              </button>
            ))}
          </div>
        </div>
      </main>
      </div>
    </>
  )
}

export default InspectionForm

import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { calculateDewPoint, generateJobNumber, calculateJobCost, formatCurrency } from '@/lib/inspectionUtils'
import type { InspectionFormData, InspectionArea, MoistureReading, SubfloorReading, Photo } from '@/types/inspection'
import { TopNavbar } from '@/components/layout/TopNavbar'
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
  const leadId = searchParams.get('leadId')
  const passedLead = location.state?.lead
  
  
  const [currentSection, setCurrentSection] = useState(0)
  const [lead, setLead] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
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
    directionPhotos: [],
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

  useEffect(() => {
    loadLeadData()
  }, [leadId])

  useEffect(() => {
    // Auto-save every 30 seconds
    const interval = setInterval(() => {
      autoSave()
    }, 30000)
    return () => clearInterval(interval)
  }, [formData])

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
    if (!leadId && !passedLead) {
      navigate('/inspection/select-lead')
      return
    }

    setLoading(true)
    
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
      setFormData(prev => ({
        ...prev,
        triage: leadData.issueDescription,
        address: leadData.property,
        requestedBy: leadData.name,
        dwellingType: leadData.propertyType,
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
      setLoading(false)
      return
    }
    
    // Load from Supabase using leadId
    try {
      const { data: leadData, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
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
        console.error('❌ Lead not found:', leadId)
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
      setFormData(prev => ({
        ...prev,
        triage: formattedLead.issueDescription,
        address: formattedLead.property,
        requestedBy: formattedLead.name,
        dwellingType: formattedLead.propertyType || ''
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

    setLoading(false)
  }

  const handleInputChange = (field: string, value: any) => {
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

  const removeArea = (areaId: string) => {
    if (formData.areas.length === 1) {
      toast({ title: 'Cannot remove', description: 'At least one area is required', variant: 'destructive' })
      return
    }
    setFormData(prev => ({
      ...prev,
      areas: prev.areas.filter(area => area.id !== areaId)
    }))
    toast({ title: 'Area removed' })
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
          images: []
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
    setFormData(prev => ({
      ...prev,
      areas: prev.areas.map(area => {
        if (area.id !== areaId) return area
        return {
          ...area,
          moistureReadings: area.moistureReadings.map(r =>
            r.id === readingId ? { ...r, [field]: value } : r
          )
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
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.multiple = type !== 'single'
    
    input.onchange = async (e: any) => {
      const files = Array.from(e.target.files) as File[]
      const newPhotos: Photo[] = files.map(f => ({
        id: crypto.randomUUID(),
        name: f.name,
        url: URL.createObjectURL(f),
        timestamp: new Date().toISOString()
      }))
      
      if (areaId && readingId) {
        // Moisture reading photos
        updateMoistureReading(areaId, readingId, 'images', [
          ...(formData.areas.find(a => a.id === areaId)?.moistureReadings.find(r => r.id === readingId)?.images || []),
          ...newPhotos
        ])
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
          directionPhotos: [...prev.directionPhotos, ...newPhotos]
        }))
      } else if (type === 'frontDoor' || type === 'frontHouse' || type === 'mailbox' || type === 'street') {
        setFormData(prev => ({
          ...prev,
          [`${type}Photo`]: newPhotos[0]
        }))
      }
      
      toast({ title: 'Photos added', description: `${files.length} photo(s) uploaded` })
    }
    
    input.click()
  }

  const removePhoto = (type: string, photoId: string, areaId?: string, readingId?: string) => {
    if (areaId && readingId) {
      const area = formData.areas.find(a => a.id === areaId)
      const reading = area?.moistureReadings.find(r => r.id === readingId)
      if (reading) {
        updateMoistureReading(areaId, readingId, 'images', reading.images.filter(p => p.id !== photoId))
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
        directionPhotos: prev.directionPhotos.filter(p => p.id !== photoId)
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

  const autoSave = () => {
    setSaving(true)
    // TODO: Save to Supabase
    setTimeout(() => setSaving(false), 1000)
  }

  const handleNext = () => {
    if (currentSection < sections.length - 1) {
      setCurrentSection(currentSection + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handlePrevious = () => {
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

    setSaving(true)
    
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    toast({
      title: 'Inspection completed!',
      description: 'Report is being generated...'
    })
    
    navigate('/dashboard')
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
                    <option value="Tech 1">Technician 1</option>
                    <option value="Tech 2">Technician 2</option>
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
                    <option value="Tenanted">Tenanted</option>
                    <option value="Vacant">Vacant</option>
                    <option value="Owner Occupied">Owner Occupied</option>
                    <option value="Tenants Vacating">Tenants Vacating</option>
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
                    <option value="House">House</option>
                    <option value="Units">Units</option>
                    <option value="Apartment">Apartment</option>
                    <option value="Duplex">Duplex</option>
                    <option value="Townhouse">Townhouse</option>
                    <option value="Commercial">Commercial</option>
                    <option value="Construction">Construction</option>
                    <option value="Industrial">Industrial</option>
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
                      <label className="form-label">Comments Shown in Report</label>
                      <textarea
                        value={area.commentsForReport}
                        onChange={(e) => handleAreaChange(area.id, 'commentsForReport', e.target.value)}
                        placeholder="Professional paragraph describing mould conditions..."
                        className="form-textarea"
                        rows={4}
                      />
                      <button
                        type="button"
                        className="btn-ai"
                        onClick={() => generateWithAI('areaComments', area.id)}
                      >
                        <Sparkles size={16} />
                        <span>Generate with AI</span>
                      </button>
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

                                <button
                                  type="button"
                                  className="btn-photo-small"
                                  onClick={() => handlePhotoCapture('moistureReading', area.id, reading.id)}
                                >
                                  📷 Add Photos
                                </button>

                                {reading.images.length > 0 && (
                                  <div className="photo-grid-small">
                                    {reading.images.map(photo => (
                                      <div key={photo.id} className="photo-item-small">
                                        <img src={photo.url} alt="Moisture reading" />
                                        <button
                                          type="button"
                                          className="photo-remove-small"
                                          onClick={() => removePhoto('moistureReading', photo.id, area.id, reading.id)}
                                        >
                                          <X size={14} strokeWidth={2} />
                                        </button>
                                      </div>
                                    ))}
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

                    {/* Room View Photos (3 required) */}
                    <div className="form-group">
                      <label className="form-label">Room View Photos (3 required) *</label>
                      <p className="field-hint">Upload exactly 3 photos showing the room from different angles</p>
                      <button
                        type="button"
                        className="btn-photo"
                        onClick={() => handlePhotoCapture('roomView', area.id)}
                        disabled={area.roomViewPhotos.length >= 3}
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
                      <p className="photo-count">{area.roomViewPhotos.length} / 3 photos</p>
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
                          <div className="form-group">
                            <label className="form-label">Infrared View Photo</label>
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
                            <label className="form-label">Natural Infrared View Photo</label>
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
                                'Evidence of Water Infiltration Present',
                                'Indications of Past Water Ingress',
                                'Possible Condensation-Related Thermal Variations',
                                'Suspected Missing Insulation Detected'
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
                            <label className="form-label">What Demolition Would You Like to Do?</label>
                            <textarea
                              value={area.demolitionDescription}
                              onChange={(e) => handleAreaChange(area.id, 'demolitionDescription', e.target.value)}
                              placeholder="• Removal of damaged drywall&#10;• Removal of carpet and underlay&#10;• Removal of wet insulation"
                              className="form-textarea"
                              rows={4}
                            />
                            <button
                              type="button"
                              className="btn-ai"
                              onClick={() => generateWithAI('demolition', area.id)}
                            >
                              <Sparkles size={16} />
                              <span>Generate Demolition List with AI</span>
                            </button>
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
                        <label className="form-label">Subfloor Comments (for report)</label>
                        <textarea
                          value={formData.subfloorComments}
                          onChange={(e) => handleInputChange('subfloorComments', e.target.value)}
                          placeholder="Professional paragraph for report..."
                          className="form-textarea"
                          rows={4}
                        />
                        <button
                          type="button"
                          className="btn-ai"
                          onClick={() => generateWithAI('subfloorComments')}
                        >
                          <Sparkles size={16} />
                          <span>Generate with AI</span>
                        </button>
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
                        <span>Add Direction Photos</span>
                      </button>

                      {formData.directionPhotos.length > 0 && (
                        <div className="photo-grid">
                          {formData.directionPhotos.map(photo => (
                            <div key={photo.id} className="photo-item">
                              <img src={photo.url} alt="Direction" />
                              <button
                                type="button"
                                className="photo-remove"
                                onClick={() => removePhoto('direction', photo.id)}
                              >
                                <X size={16} strokeWidth={2} />
                              </button>
                            </div>
                          ))}
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
                    placeholder="Professional description of what caused the mould..."
                    className="form-textarea"
                    rows={4}
                  />
                  <button
                    type="button"
                    className="btn-ai"
                    onClick={() => generateWithAI('causeOfMould')}
                  >
                    <Sparkles size={16} />
                    <span>Generate with AI</span>
                  </button>
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

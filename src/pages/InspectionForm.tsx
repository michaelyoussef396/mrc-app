import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

const InspectionForm = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [searchParams] = useSearchParams()
  const leadId = searchParams.get('leadId')
  
  const [currentSection, setCurrentSection] = useState(0)
  const [lead, setLead] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [formData, setFormData] = useState({
    leadId: leadId,
    clientName: '',
    propertyAddress: '',
    inspectionDate: new Date().toISOString().split('T')[0],
    technicianName: '',
    propertyAccess: '',
    accessNotes: '',
    propertyOccupied: '',
    occupantsPresentDuringInspection: '',
    propertySize: '',
    numberOfLevels: '',
    propertyAge: '',
    photos: [] as any[],
    affectedAreas: [] as string[],
    primaryConcernArea: '',
    affectedAreaPhotos: [] as any[],
    moistureReadings: [] as any[],
    moistureMeterType: '',
    moisturePhotos: [] as any[],
    mouldType: '',
    mouldSeverity: '',
    mouldColor: [] as string[],
    mouldPattern: '',
    affectedMaterials: [] as string[],
    mouldPhotos: [] as any[],
    ventilationAdequate: '',
    exhaustFans: [] as string[],
    windowsOperable: '',
    airflow: '',
    ventilationPhotos: [] as any[],
    waterSources: [] as string[],
    activeLeaks: '',
    leakLocations: '',
    plumbingIssues: [] as string[],
    waterSourcePhotos: [] as any[],
    hvacType: '',
    hvacCondition: '',
    hvacLastServiced: '',
    ductworkCondition: '',
    hvacPhotos: [] as any[],
    roofCondition: '',
    guttersCondition: '',
    windowsCondition: '',
    doorsCondition: '',
    foundationCondition: '',
    envelopePhotos: [] as any[],
    thermalImagingUsed: '',
    thermalFindings: '',
    thermalPhotos: [] as any[],
    mustyOdor: '',
    odorSeverity: '',
    visibleCondensation: '',
    airQualityNotes: '',
    healthSymptoms: [] as string[],
    symptomsNotes: '',
    vulnerableOccupants: '',
    previousRemediation: '',
    remediationDate: '',
    remediationDetails: '',
    remediationEffective: '',
    immediateActions: [] as string[],
    longTermActions: [] as string[],
    professionalReferrals: [] as string[],
    urgencyLevel: '',
    estimatedCost: 0,
    equipmentNeeded: [] as string[],
    laborHours: 0,
    materialsCost: 0,
    additionalNotes: '',
    followUpRequired: '',
    followUpDate: '',
    inspectionSummary: ''
  })

  const sections = [
    { id: 0, title: 'Lead Information', icon: '👤' },
    { id: 1, title: 'Property Access', icon: '🏠' },
    { id: 2, title: 'Affected Areas', icon: '📍' },
    { id: 3, title: 'Moisture Detection', icon: '💧' },
    { id: 4, title: 'Mould Assessment', icon: '🔬' },
    { id: 5, title: 'Ventilation', icon: '💨' },
    { id: 6, title: 'Water Sources', icon: '🚿' },
    { id: 7, title: 'HVAC System', icon: '❄️' },
    { id: 8, title: 'Building Envelope', icon: '🏗️' },
    { id: 9, title: 'Thermal Imaging', icon: '🌡️' },
    { id: 10, title: 'Air Quality', icon: '🌫️' },
    { id: 11, title: 'Health Concerns', icon: '🏥' },
    { id: 12, title: 'Previous Work', icon: '🔧' },
    { id: 13, title: 'Recommendations', icon: '📋' },
    { id: 14, title: 'Cost Estimate', icon: '💰' },
    { id: 15, title: 'Final Notes', icon: '📝' }
  ]

  useEffect(() => {
    loadLeadData()
  }, [leadId])

  const loadLeadData = async () => {
    if (!leadId) {
      navigate('/inspection/select-lead')
      return
    }

    setLoading(true)
    const mockLead = {
      id: leadId,
      name: 'John Doe',
      email: 'john@email.com',
      phone: '0412 345 678',
      property: '123 Smith Street, Melbourne VIC 3000',
      scheduledDate: '2025-01-29T14:00:00'
    }
    
    setLead(mockLead)
    setFormData(prev => ({
      ...prev,
      clientName: mockLead.name,
      propertyAddress: mockLead.property
    }))
    setLoading(false)
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    autoSave()
  }

  const handleArrayToggle = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field as keyof typeof prev] as string[]).includes(value)
        ? (prev[field as keyof typeof prev] as string[]).filter(item => item !== value)
        : [...(prev[field as keyof typeof prev] as string[]), value]
    }))
    autoSave()
  }

  const handlePhotoCapture = async (field: string) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.multiple = true
    
    input.onchange = async (e: any) => {
      const files = Array.from(e.target.files) as File[]
      
      const newPhotos = files.map(f => ({
        name: f.name,
        url: URL.createObjectURL(f),
        timestamp: new Date().toISOString()
      }))
      
      setFormData(prev => ({
        ...prev,
        [field]: [...(prev[field as keyof typeof prev] as any[]), ...newPhotos]
      }))
      
      toast({
        title: 'Photos added',
        description: `${files.length} photo(s) captured successfully`
      })
    }
    
    input.click()
  }

  const autoSave = () => {
    setSaving(true)
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
    <div className="inspection-form-page">
      <div className="inspection-background">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
      </div>

      <nav className="inspection-nav">
        <div className="nav-container">
          <button 
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
            <span className="nav-title">Inspection</span>
            {saving && <span className="save-indicator">💾 Saving...</span>}
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

      <main className="inspection-main">
        <div className="inspection-container">
          <div className="section-header-card">
            <div className="section-icon-large">
              {sections[currentSection].icon}
            </div>
            <h1 className="section-title">{sections[currentSection].title}</h1>
            <p className="section-subtitle">
              Section {currentSection + 1} of {sections.length}
            </p>
          </div>

          <div className="form-content">
            {currentSection === 0 && (
              <div className="form-section">
                <h2 className="subsection-title">Lead Information</h2>
                
                <div className="form-group">
                  <label className="form-label">Client Name</label>
                  <input
                    type="text"
                    value={formData.clientName}
                    onChange={(e) => handleInputChange('clientName', e.target.value)}
                    className="form-input"
                    readOnly
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Property Address</label>
                  <input
                    type="text"
                    value={formData.propertyAddress}
                    onChange={(e) => handleInputChange('propertyAddress', e.target.value)}
                    className="form-input"
                    readOnly
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

                <div className="form-group">
                  <label className="form-label">Technician Name *</label>
                  <input
                    type="text"
                    value={formData.technicianName}
                    onChange={(e) => handleInputChange('technicianName', e.target.value)}
                    placeholder="Your name"
                    className="form-input"
                  />
                </div>
              </div>
            )}

            {currentSection === 1 && (
              <div className="form-section">
                <h2 className="subsection-title">Property Access & Overview</h2>
                
                <div className="form-group">
                  <label className="form-label">Property Access *</label>
                  <div className="radio-group">
                    {['Full Access', 'Limited Access', 'Restricted Areas'].map(option => (
                      <label key={option} className="radio-option">
                        <input
                          type="radio"
                          name="propertyAccess"
                          value={option}
                          checked={formData.propertyAccess === option}
                          onChange={(e) => handleInputChange('propertyAccess', e.target.value)}
                        />
                        <span className="radio-custom"></span>
                        <span className="radio-label">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Access Notes</label>
                  <textarea
                    value={formData.accessNotes}
                    onChange={(e) => handleInputChange('accessNotes', e.target.value)}
                    placeholder="Any special notes about property access..."
                    className="form-textarea"
                    rows={3}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Property Occupied? *</label>
                  <div className="toggle-group">
                    {['Yes', 'No', 'Vacant'].map(option => (
                      <button
                        key={option}
                        type="button"
                        className={`toggle-btn ${formData.propertyOccupied === option ? 'active' : ''}`}
                        onClick={() => handleInputChange('propertyOccupied', option)}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                {formData.propertyOccupied === 'Yes' && (
                  <div className="form-group">
                    <label className="form-label">Occupants Present During Inspection?</label>
                    <div className="toggle-group">
                      {['Yes', 'No', 'Partial'].map(option => (
                        <button
                          key={option}
                          type="button"
                          className={`toggle-btn ${formData.occupantsPresentDuringInspection === option ? 'active' : ''}`}
                          onClick={() => handleInputChange('occupantsPresentDuringInspection', option)}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Property Size (approx.)</label>
                  <select
                    value={formData.propertySize}
                    onChange={(e) => handleInputChange('propertySize', e.target.value)}
                    className="form-select"
                  >
                    <option value="">Select size...</option>
                    <option value="Small (<100 sqm)">Small (&lt;100 sqm)</option>
                    <option value="Medium (100-200 sqm)">Medium (100-200 sqm)</option>
                    <option value="Large (200-300 sqm)">Large (200-300 sqm)</option>
                    <option value="Very Large (>300 sqm)">Very Large (&gt;300 sqm)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Number of Levels</label>
                  <div className="toggle-group">
                    {['Single Story', 'Two Story', 'Multi-Level'].map(option => (
                      <button
                        key={option}
                        type="button"
                        className={`toggle-btn ${formData.numberOfLevels === option ? 'active' : ''}`}
                        onClick={() => handleInputChange('numberOfLevels', option)}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Property Age (approx.)</label>
                  <select
                    value={formData.propertyAge}
                    onChange={(e) => handleInputChange('propertyAge', e.target.value)}
                    className="form-select"
                  >
                    <option value="">Select age...</option>
                    <option value="<5 years">&lt;5 years</option>
                    <option value="5-10 years">5-10 years</option>
                    <option value="10-20 years">10-20 years</option>
                    <option value="20-50 years">20-50 years</option>
                    <option value=">50 years">&gt;50 years</option>
                  </select>
                </div>

                <div className="photo-section">
                  <label className="form-label">Property Overview Photos</label>
                  <button 
                    type="button"
                    className="btn-photo"
                    onClick={() => handlePhotoCapture('photos')}
                  >
                    <span>📷</span>
                    <span>Take Photos</span>
                  </button>
                  
                  {formData.photos.length > 0 && (
                    <div className="photo-grid">
                      {formData.photos.map((photo, index) => (
                        <div key={index} className="photo-item">
                          <img src={photo.url} alt={`Photo ${index + 1}`} />
                          <button 
                            type="button"
                            className="photo-remove"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                photos: prev.photos.filter((_, i) => i !== index)
                              }))
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentSection === 2 && (
              <div className="form-section">
                <h2 className="subsection-title">Affected Areas Identification</h2>
                
                <div className="form-group">
                  <label className="form-label">Select All Affected Areas *</label>
                  <div className="checkbox-grid">
                    {[
                      'Bathroom', 'Kitchen', 'Laundry', 'Bedroom', 
                      'Living Room', 'Basement', 'Attic', 'Garage',
                      'Exterior Walls', 'Roof Space', 'Crawl Space', 'Other'
                    ].map(area => (
                      <label key={area} className="checkbox-option">
                        <input
                          type="checkbox"
                          checked={formData.affectedAreas.includes(area)}
                          onChange={() => handleArrayToggle('affectedAreas', area)}
                        />
                        <span className="checkbox-custom"></span>
                        <span className="checkbox-label">{area}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Primary Concern Area *</label>
                  <select
                    value={formData.primaryConcernArea}
                    onChange={(e) => handleInputChange('primaryConcernArea', e.target.value)}
                    className="form-select"
                  >
                    <option value="">Select primary area...</option>
                    {formData.affectedAreas.map(area => (
                      <option key={area} value={area}>{area}</option>
                    ))}
                  </select>
                </div>

                <div className="photo-section">
                  <label className="form-label">Affected Areas Photos *</label>
                  <p className="field-hint">Take photos of each affected area</p>
                  <button 
                    type="button"
                    className="btn-photo"
                    onClick={() => handlePhotoCapture('affectedAreaPhotos')}
                  >
                    <span>📷</span>
                    <span>Take Photos</span>
                  </button>
                  
                  {formData.affectedAreaPhotos.length > 0 && (
                    <div className="photo-grid">
                      {formData.affectedAreaPhotos.map((photo, index) => (
                        <div key={index} className="photo-item">
                          <img src={photo.url} alt={`Affected area ${index + 1}`} />
                          <button 
                            type="button"
                            className="photo-remove"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                affectedAreaPhotos: prev.affectedAreaPhotos.filter((_, i) => i !== index)
                              }))
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentSection === 3 && (
              <div className="form-section">
                <h2 className="subsection-title">Moisture Detection</h2>
                
                <div className="form-group">
                  <label className="form-label">Moisture Meter Type</label>
                  <select
                    value={formData.moistureMeterType}
                    onChange={(e) => handleInputChange('moistureMeterType', e.target.value)}
                    className="form-select"
                  >
                    <option value="">Select meter type...</option>
                    <option value="Pin-type">Pin-type</option>
                    <option value="Pinless">Pinless</option>
                    <option value="Both">Both</option>
                    <option value="None Used">None Used</option>
                  </select>
                </div>

                <div className="readings-section">
                  <label className="form-label">Moisture Readings</label>
                  <p className="field-hint">Add moisture readings for each affected area</p>
                  
                  <button 
                    type="button"
                    className="btn-secondary btn-add"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        moistureReadings: [
                          ...prev.moistureReadings,
                          { location: '', reading: '', material: '', timestamp: new Date().toISOString() }
                        ]
                      }))
                    }}
                  >
                    <span>+</span>
                    <span>Add Reading</span>
                  </button>

                  {formData.moistureReadings.map((reading, index) => (
                    <div key={index} className="reading-item">
                      <div className="reading-header">
                        <span className="reading-number">Reading {index + 1}</span>
                        <button 
                          type="button"
                          className="btn-remove"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              moistureReadings: prev.moistureReadings.filter((_, i) => i !== index)
                            }))
                          }}
                        >
                          ✕
                        </button>
                      </div>
                      
                      <div className="reading-inputs">
                        <input
                          type="text"
                          placeholder="Location (e.g., Bathroom wall)"
                          value={reading.location}
                          onChange={(e) => {
                            const newReadings = [...formData.moistureReadings]
                            newReadings[index].location = e.target.value
                            setFormData(prev => ({ ...prev, moistureReadings: newReadings }))
                          }}
                          className="form-input"
                        />
                        
                        <input
                          type="text"
                          placeholder="Reading (%)"
                          value={reading.reading}
                          onChange={(e) => {
                            const newReadings = [...formData.moistureReadings]
                            newReadings[index].reading = e.target.value
                            setFormData(prev => ({ ...prev, moistureReadings: newReadings }))
                          }}
                          className="form-input"
                        />
                        
                        <select
                          value={reading.material}
                          onChange={(e) => {
                            const newReadings = [...formData.moistureReadings]
                            newReadings[index].material = e.target.value
                            setFormData(prev => ({ ...prev, moistureReadings: newReadings }))
                          }}
                          className="form-select"
                        >
                          <option value="">Material type...</option>
                          <option value="Drywall">Drywall</option>
                          <option value="Wood">Wood</option>
                          <option value="Concrete">Concrete</option>
                          <option value="Tile">Tile</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="photo-section">
                  <label className="form-label">Moisture Detection Photos</label>
                  <button 
                    type="button"
                    className="btn-photo"
                    onClick={() => handlePhotoCapture('moisturePhotos')}
                  >
                    <span>📷</span>
                    <span>Take Photos</span>
                  </button>
                  
                  {formData.moisturePhotos.length > 0 && (
                    <div className="photo-grid">
                      {formData.moisturePhotos.map((photo, index) => (
                        <div key={index} className="photo-item">
                          <img src={photo.url} alt={`Moisture ${index + 1}`} />
                          <button 
                            type="button"
                            className="photo-remove"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                moisturePhotos: prev.moisturePhotos.filter((_, i) => i !== index)
                              }))
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentSection === 4 && (
              <div className="form-section">
                <h2 className="subsection-title">Visual Mould Assessment</h2>
                
                <div className="form-group">
                  <label className="form-label">Mould Type (if identifiable)</label>
                  <select
                    value={formData.mouldType}
                    onChange={(e) => handleInputChange('mouldType', e.target.value)}
                    className="form-select"
                  >
                    <option value="">Select type...</option>
                    <option value="Appears to be surface mould">Appears to be surface mould</option>
                    <option value="Penetrating mould">Penetrating mould</option>
                    <option value="Mixed/Unknown">Mixed/Unknown</option>
                    <option value="Requires lab testing">Requires lab testing</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Mould Severity *</label>
                  <div className="severity-scale">
                    {[
                      { value: 'Minor', label: 'Minor', color: '#10b981', desc: '<10 sqft' },
                      { value: 'Moderate', label: 'Moderate', color: '#f59e0b', desc: '10-100 sqft' },
                      { value: 'Extensive', label: 'Extensive', color: '#ef4444', desc: '>100 sqft' }
                    ].map(option => (
                      <button
                        key={option.value}
                        type="button"
                        className={`severity-btn ${formData.mouldSeverity === option.value ? 'active' : ''}`}
                        onClick={() => handleInputChange('mouldSeverity', option.value)}
                        style={{
                          borderColor: formData.mouldSeverity === option.value ? option.color : 'transparent'
                        }}
                      >
                        <span className="severity-label">{option.label}</span>
                        <span className="severity-desc">{option.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Mould Color(s)</label>
                  <div className="checkbox-grid">
                    {['Black', 'Green', 'White', 'Brown', 'Yellow', 'Orange'].map(color => (
                      <label key={color} className="checkbox-option">
                        <input
                          type="checkbox"
                          checked={formData.mouldColor.includes(color)}
                          onChange={() => handleArrayToggle('mouldColor', color)}
                        />
                        <span className="checkbox-custom"></span>
                        <span className="checkbox-label">{color}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Growth Pattern</label>
                  <div className="toggle-group">
                    {['Patchy', 'Widespread', 'Concentrated', 'Linear'].map(option => (
                      <button
                        key={option}
                        type="button"
                        className={`toggle-btn ${formData.mouldPattern === option ? 'active' : ''}`}
                        onClick={() => handleInputChange('mouldPattern', option)}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Affected Materials</label>
                  <div className="checkbox-grid">
                    {[
                      'Drywall', 'Wood', 'Ceiling', 'Carpet', 
                      'Tile Grout', 'Paint', 'Wallpaper', 'Insulation'
                    ].map(material => (
                      <label key={material} className="checkbox-option">
                        <input
                          type="checkbox"
                          checked={formData.affectedMaterials.includes(material)}
                          onChange={() => handleArrayToggle('affectedMaterials', material)}
                        />
                        <span className="checkbox-custom"></span>
                        <span className="checkbox-label">{material}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="photo-section">
                  <label className="form-label">Mould Photos *</label>
                  <p className="field-hint">Take close-up photos of mould growth</p>
                  <button 
                    type="button"
                    className="btn-photo"
                    onClick={() => handlePhotoCapture('mouldPhotos')}
                  >
                    <span>📷</span>
                    <span>Take Photos</span>
                  </button>
                  
                  {formData.mouldPhotos.length > 0 && (
                    <div className="photo-grid">
                      {formData.mouldPhotos.map((photo, index) => (
                        <div key={index} className="photo-item">
                          <img src={photo.url} alt={`Mould ${index + 1}`} />
                          <button 
                            type="button"
                            className="photo-remove"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                mouldPhotos: prev.mouldPhotos.filter((_, i) => i !== index)
                              }))
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentSection === 14 && (
              <div className="form-section">
                <h2 className="subsection-title">Cost Estimate</h2>
                
                <div className="cost-summary-card">
                  <div className="cost-item">
                    <span className="cost-label">Labor Hours</span>
                    <input
                      type="number"
                      value={formData.laborHours}
                      onChange={(e) => handleInputChange('laborHours', parseFloat(e.target.value) || 0)}
                      className="cost-input"
                      min="0"
                      step="0.5"
                    />
                  </div>

                  <div className="cost-item">
                    <span className="cost-label">Materials Cost</span>
                    <input
                      type="number"
                      value={formData.materialsCost}
                      onChange={(e) => handleInputChange('materialsCost', parseFloat(e.target.value) || 0)}
                      className="cost-input"
                      min="0"
                      step="10"
                    />
                  </div>

                  <div className="cost-total">
                    <span className="cost-label">Estimated Total</span>
                    <span className="cost-value">
                      ${(formData.laborHours * 120 + formData.materialsCost).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Equipment Needed</label>
                  <div className="checkbox-grid">
                    {[
                      'Dehumidifier', 'Air Scrubber', 'HEPA Vacuum',
                      'Containment Barriers', 'PPE Equipment', 'Moisture Meter'
                    ].map(equipment => (
                      <label key={equipment} className="checkbox-option">
                        <input
                          type="checkbox"
                          checked={formData.equipmentNeeded.includes(equipment)}
                          onChange={() => handleArrayToggle('equipmentNeeded', equipment)}
                        />
                        <span className="checkbox-custom"></span>
                        <span className="checkbox-label">{equipment}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {currentSection === 15 && (
              <div className="form-section">
                <h2 className="subsection-title">Final Notes & Summary</h2>
                
                <div className="form-group">
                  <label className="form-label">Additional Notes</label>
                  <textarea
                    value={formData.additionalNotes}
                    onChange={(e) => handleInputChange('additionalNotes', e.target.value)}
                    placeholder="Any additional observations, concerns, or recommendations..."
                    className="form-textarea"
                    rows={5}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Inspection Summary *</label>
                  <textarea
                    value={formData.inspectionSummary}
                    onChange={(e) => handleInputChange('inspectionSummary', e.target.value)}
                    placeholder="Brief summary of findings and recommended next steps..."
                    className="form-textarea"
                    rows={6}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Follow-up Required?</label>
                  <div className="toggle-group">
                    {['Yes', 'No', 'Maybe'].map(option => (
                      <button
                        key={option}
                        type="button"
                        className={`toggle-btn ${formData.followUpRequired === option ? 'active' : ''}`}
                        onClick={() => handleInputChange('followUpRequired', option)}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                {formData.followUpRequired === 'Yes' && (
                  <div className="form-group">
                    <label className="form-label">Follow-up Date</label>
                    <input
                      type="date"
                      value={formData.followUpDate}
                      onChange={(e) => handleInputChange('followUpDate', e.target.value)}
                      className="form-input"
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                )}
              </div>
            )}

            {(currentSection >= 5 && currentSection <= 13) && (
              <div className="form-section">
                <h2 className="subsection-title">{sections[currentSection].title}</h2>
                <div className="placeholder-section">
                  <div className="placeholder-icon">{sections[currentSection].icon}</div>
                  <p className="placeholder-text">
                    This section is under development.
                  </p>
                  <p className="placeholder-hint">
                    Continue to the next section to complete your inspection.
                  </p>
                </div>
              </div>
            )}
          </div>

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
  )
}

export default InspectionForm

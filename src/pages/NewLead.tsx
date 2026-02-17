import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { 
  ArrowLeft, ArrowRight, Check, User, Mail, Phone, MapPin, 
  Home, Calendar, Clock, Camera, FileText, Building
} from 'lucide-react';

const NewLead = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const totalSteps = 4;

  // Form data state
  const [formData, setFormData] = useState({
    // Customer Information
    customerFirstName: '',
    customerLastName: '',
    customerEmail: '',
    customerPhone: '',
    
    // Property Information
    propertyAddress: '',
    propertySuburb: '',
    propertyPostcode: '',
    propertyState: 'VIC',
    propertyType: 'Residential',
    
    // Inspection Details
    inspectionDate: '',
    inspectionTime: '',
    urgency: 'Normal',
    source: '',
    
    // Problem Description
    problemDescription: '',
    affectedAreas: [] as string[],
    visibleMould: 'No',
    waterDamage: 'No',
    
    // Additional Notes
    additionalNotes: '',
    accessInstructions: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [uploadedPhotos, setUploadedPhotos] = useState<Array<{ id: number; file: File; preview: string; name: string }>>([]);

  // Validation for each step
  const validateStep = (step: number) => {
    const errors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.customerFirstName.trim()) {
        errors.customerFirstName = 'First name is required';
      }
      if (!formData.customerLastName.trim()) {
        errors.customerLastName = 'Last name is required';
      }
      if (!formData.customerEmail.trim()) {
        errors.customerEmail = 'Email is required';
      } else if (!/\S+@\S+\.\S+/.test(formData.customerEmail)) {
        errors.customerEmail = 'Email is invalid';
      }
      if (!formData.customerPhone.trim()) {
        errors.customerPhone = 'Phone is required';
      } else if (!/^04\d{8}$/.test(formData.customerPhone.replace(/\s/g, ''))) {
        errors.customerPhone = 'Invalid Australian mobile (04XX XXX XXX)';
      }
    }

    if (step === 2) {
      if (!formData.propertyAddress.trim()) {
        errors.propertyAddress = 'Property address is required';
      }
      if (!formData.propertySuburb.trim()) {
        errors.propertySuburb = 'Suburb is required';
      }
      if (!formData.propertyPostcode.trim()) {
        errors.propertyPostcode = 'Postcode is required';
      } else if (!/^\d{4}$/.test(formData.propertyPostcode)) {
        errors.propertyPostcode = 'Invalid postcode (4 digits)';
      }
    }

    if (step === 3) {
      if (!formData.inspectionDate) {
        errors.inspectionDate = 'Inspection date is required';
      }
      if (!formData.inspectionTime) {
        errors.inspectionTime = 'Inspection time is required';
      }
      if (!formData.source) {
        errors.source = 'Please select lead source';
      }
    }

    if (step === 4) {
      if (!formData.problemDescription.trim()) {
        errors.problemDescription = 'Problem description is required';
      }
      if (formData.affectedAreas.length === 0) {
        errors.affectedAreas = 'Please select at least one affected area';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        handleSubmit();
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    
    try {
      // TODO: Save to Supabase
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      navigate('/leads', { 
        state: { 
          message: 'Lead created successfully!',
          leadName: `${formData.customerFirstName} ${formData.customerLastName}`
        } 
      });
    } catch (error) {
      console.error('Error creating lead:', error);
      alert('Failed to create lead. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleAffectedArea = (area: string) => {
    const areas = [...formData.affectedAreas];
    const index = areas.indexOf(area);
    
    if (index > -1) {
      areas.splice(index, 1);
    } else {
      areas.push(area);
    }
    
    setFormData({ ...formData, affectedAreas: areas });
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newPhotos = files.map(file => ({
      id: Date.now() + Math.random(),
      file: file,
      preview: URL.createObjectURL(file),
      name: file.name,
    }));
    setUploadedPhotos([...uploadedPhotos, ...newPhotos]);
  };

  const removePhoto = (photoId: number) => {
    setUploadedPhotos(uploadedPhotos.filter(p => p.id !== photoId));
  };

  const affectedAreaOptions = [
    'Bathroom', 'Kitchen', 'Bedroom', 'Living Room', 
    'Laundry', 'Basement', 'Attic', 'Ceiling', 
    'Walls', 'Floors', 'Windows', 'Other'
  ];

  return (
    <div className="new-lead-wizard">
      {/* Header */}
      <div className="wizard-header">
        <button className="wizard-back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <div className="wizard-header-info">
          <h1 className="wizard-title">New Lead/Inspection</h1>
          <p className="wizard-subtitle">Step {currentStep} of {totalSteps}</p>
        </div>
        <div style={{ width: 40 }}></div>
      </div>

      {/* Progress Bar */}
      <div className="wizard-progress-section">
        <div className="wizard-progress-bar">
          <div 
            className="wizard-progress-fill" 
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
        <div className="wizard-step-indicators">
          {[1, 2, 3, 4].map(step => (
            <div 
              key={step}
              className={`wizard-step-indicator ${currentStep >= step ? 'active' : ''} ${currentStep > step ? 'completed' : ''}`}
            >
              {currentStep > step ? <Check size={16} strokeWidth={3} /> : <span>{step}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <div className="wizard-content">
        {/* STEP 1: Customer Information */}
        {currentStep === 1 && (
          <div className="wizard-step">
            <div className="wizard-step-header">
              <div className="wizard-step-icon customer">
                <User size={28} />
              </div>
              <div>
                <h2 className="wizard-step-title">Customer Information</h2>
                <p className="wizard-step-description">Enter the customer's contact details</p>
              </div>
            </div>

            <div className="wizard-form-section">
              <div className="wizard-form-row">
                <div className="wizard-form-field">
                  <label className="wizard-label">First Name *</label>
                  <input
                    type="text"
                    className={`wizard-input ${formErrors.customerFirstName ? 'error' : ''}`}
                    placeholder="John"
                    value={formData.customerFirstName}
                    onChange={(e) => setFormData({ ...formData, customerFirstName: e.target.value })}
                  />
                  {formErrors.customerFirstName && (
                    <span className="wizard-error">{formErrors.customerFirstName}</span>
                  )}
                </div>

                <div className="wizard-form-field">
                  <label className="wizard-label">Last Name *</label>
                  <input
                    type="text"
                    className={`wizard-input ${formErrors.customerLastName ? 'error' : ''}`}
                    placeholder="Smith"
                    value={formData.customerLastName}
                    onChange={(e) => setFormData({ ...formData, customerLastName: e.target.value })}
                  />
                  {formErrors.customerLastName && (
                    <span className="wizard-error">{formErrors.customerLastName}</span>
                  )}
                </div>
              </div>

              <div className="wizard-form-field">
                <label className="wizard-label">Email Address *</label>
                <div className="wizard-input-with-icon">
                  <Mail size={20} className="wizard-input-icon" />
                  <input
                    type="email"
                    className={`wizard-input with-icon ${formErrors.customerEmail ? 'error' : ''}`}
                    placeholder="john.smith@email.com"
                    value={formData.customerEmail}
                    onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                  />
                </div>
                {formErrors.customerEmail && (
                  <span className="wizard-error">{formErrors.customerEmail}</span>
                )}
              </div>

              <div className="wizard-form-field">
                <label className="wizard-label">Phone Number *</label>
                <div className="wizard-input-with-icon">
                  <Phone size={20} className="wizard-input-icon" />
                  <input
                    type="tel"
                    className={`wizard-input with-icon ${formErrors.customerPhone ? 'error' : ''}`}
                    placeholder="0400 000 000"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                  />
                </div>
                {formErrors.customerPhone && (
                  <span className="wizard-error">{formErrors.customerPhone}</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Property Information */}
        {currentStep === 2 && (
          <div className="wizard-step">
            <div className="wizard-step-header">
              <div className="wizard-step-icon property">
                <Home size={28} />
              </div>
              <div>
                <h2 className="wizard-step-title">Property Information</h2>
                <p className="wizard-step-description">Enter the property address and details</p>
              </div>
            </div>

            <div className="wizard-form-section">
              <div className="wizard-form-field">
                <label className="wizard-label">Property Type</label>
                <select
                  className="wizard-select"
                  value={formData.propertyType}
                  onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })}
                >
                  <option>Residential</option>
                  <option>Commercial</option>
                  <option>Industrial</option>
                  <option>Rental Property</option>
                </select>
              </div>

              <div className="wizard-form-field">
                <label className="wizard-label">Street Address *</label>
                <div className="wizard-input-with-icon">
                  <MapPin size={20} className="wizard-input-icon" />
                  <input
                    type="text"
                    className={`wizard-input with-icon ${formErrors.propertyAddress ? 'error' : ''}`}
                    placeholder="45 High Street"
                    value={formData.propertyAddress}
                    onChange={(e) => setFormData({ ...formData, propertyAddress: e.target.value })}
                  />
                </div>
                {formErrors.propertyAddress && (
                  <span className="wizard-error">{formErrors.propertyAddress}</span>
                )}
              </div>

              <div className="wizard-form-row">
                <div className="wizard-form-field">
                  <label className="wizard-label">Suburb *</label>
                  <input
                    type="text"
                    className={`wizard-input ${formErrors.propertySuburb ? 'error' : ''}`}
                    placeholder="Croydon"
                    value={formData.propertySuburb}
                    onChange={(e) => setFormData({ ...formData, propertySuburb: e.target.value })}
                  />
                  {formErrors.propertySuburb && (
                    <span className="wizard-error">{formErrors.propertySuburb}</span>
                  )}
                </div>

                <div className="wizard-form-field">
                  <label className="wizard-label">State</label>
                  <select
                    className="wizard-select"
                    value={formData.propertyState}
                    onChange={(e) => setFormData({ ...formData, propertyState: e.target.value })}
                  >
                    <option>VIC</option>
                    <option>NSW</option>
                    <option>QLD</option>
                    <option>SA</option>
                    <option>WA</option>
                    <option>TAS</option>
                    <option>NT</option>
                    <option>ACT</option>
                  </select>
                </div>
              </div>

              <div className="wizard-form-field">
                <label className="wizard-label">Postcode *</label>
                <input
                  type="text"
                  className={`wizard-input ${formErrors.propertyPostcode ? 'error' : ''}`}
                  placeholder="3136"
                  maxLength={4}
                  value={formData.propertyPostcode}
                  onChange={(e) => setFormData({ ...formData, propertyPostcode: e.target.value })}
                />
                {formErrors.propertyPostcode && (
                  <span className="wizard-error">{formErrors.propertyPostcode}</span>
                )}
              </div>

              <div className="wizard-form-field">
                <label className="wizard-label">Access Instructions</label>
                <textarea
                  className="wizard-textarea"
                  placeholder="e.g., Gate code is 1234, Park in driveway..."
                  rows={3}
                  value={formData.accessInstructions}
                  onChange={(e) => setFormData({ ...formData, accessInstructions: e.target.value })}
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Inspection Scheduling */}
        {currentStep === 3 && (
          <div className="wizard-step">
            <div className="wizard-step-header">
              <div className="wizard-step-icon schedule">
                <Calendar size={28} />
              </div>
              <div>
                <h2 className="wizard-step-title">Inspection Scheduling</h2>
                <p className="wizard-step-description">Schedule the inspection date and time</p>
              </div>
            </div>

            <div className="wizard-form-section">
              <div className="wizard-form-field">
                <label className="wizard-label">Lead Source *</label>
                <select
                  className={`wizard-select ${formErrors.source ? 'error' : ''}`}
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                >
                  <option value="">Select source...</option>
                  <option value="Google Ads">Google Ads</option>
                  <option value="Facebook">Facebook</option>
                  <option value="Instagram">Instagram</option>
                  <option value="Referral">Referral</option>
                  <option value="Website">Website</option>
                  <option value="Direct">Direct Call</option>
                  <option value="Email">Email</option>
                </select>
                {formErrors.source && (
                  <span className="wizard-error">{formErrors.source}</span>
                )}
              </div>

              <div className="wizard-form-field">
                <label className="wizard-label">Urgency Level</label>
                <div className="wizard-urgency-selector">
                  {['Normal', 'Urgent', 'Emergency'].map(level => (
                    <label 
                      key={level}
                      className={`wizard-urgency-option ${formData.urgency === level ? 'selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name="urgency"
                        value={level}
                        checked={formData.urgency === level}
                        onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
                      />
                      <span>{level}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="wizard-form-row">
                <div className="wizard-form-field">
                  <label className="wizard-label">Inspection Date *</label>
                  <div className="wizard-input-with-icon">
                    <Calendar size={20} className="wizard-input-icon" />
                    <input
                      type="date"
                      className={`wizard-input with-icon ${formErrors.inspectionDate ? 'error' : ''}`}
                      value={formData.inspectionDate}
                      onChange={(e) => setFormData({ ...formData, inspectionDate: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  {formErrors.inspectionDate && (
                    <span className="wizard-error">{formErrors.inspectionDate}</span>
                  )}
                </div>

                <div className="wizard-form-field">
                  <label className="wizard-label">Inspection Time *</label>
                  <div className="wizard-input-with-icon">
                    <Clock size={20} className="wizard-input-icon" />
                    <input
                      type="time"
                      className={`wizard-input with-icon ${formErrors.inspectionTime ? 'error' : ''}`}
                      value={formData.inspectionTime}
                      onChange={(e) => setFormData({ ...formData, inspectionTime: e.target.value })}
                    />
                  </div>
                  {formErrors.inspectionTime && (
                    <span className="wizard-error">{formErrors.inspectionTime}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Problem Details */}
        {currentStep === 4 && (
          <div className="wizard-step">
            <div className="wizard-step-header">
              <div className="wizard-step-icon details">
                <FileText size={28} />
              </div>
              <div>
                <h2 className="wizard-step-title">Problem Details</h2>
                <p className="wizard-step-description">Describe the mould/water damage issue</p>
              </div>
            </div>

            <div className="wizard-form-section">
              <div className="wizard-form-field">
                <label className="wizard-label">Problem Description *</label>
                <textarea
                  className={`wizard-textarea ${formErrors.problemDescription ? 'error' : ''}`}
                  placeholder="Describe the mould or water damage issue in detail..."
                  rows={4}
                  value={formData.problemDescription}
                  onChange={(e) => setFormData({ ...formData, problemDescription: e.target.value })}
                />
                {formErrors.problemDescription && (
                  <span className="wizard-error">{formErrors.problemDescription}</span>
                )}
              </div>

              <div className="wizard-form-field">
                <label className="wizard-label">Affected Areas *</label>
                <div className="wizard-checkbox-grid">
                  {affectedAreaOptions.map(area => (
                    <label key={area} className="wizard-checkbox-item">
                      <input
                        type="checkbox"
                        checked={formData.affectedAreas.includes(area)}
                        onChange={() => toggleAffectedArea(area)}
                      />
                      <span>{area}</span>
                    </label>
                  ))}
                </div>
                {formErrors.affectedAreas && (
                  <span className="wizard-error">{formErrors.affectedAreas}</span>
                )}
              </div>

              <div className="wizard-form-field">
                <label className="wizard-label">Quick Assessment</label>
                <div className="wizard-assessment-grid">
                  <div className="wizard-assessment-item">
                    <span className="wizard-assessment-label">Visible Mould?</span>
                    <div className="wizard-toggle-buttons">
                      <button
                        type="button"
                        className={`wizard-toggle-btn ${formData.visibleMould === 'Yes' ? 'active yes' : ''}`}
                        onClick={() => setFormData({ ...formData, visibleMould: 'Yes' })}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        className={`wizard-toggle-btn ${formData.visibleMould === 'No' ? 'active no' : ''}`}
                        onClick={() => setFormData({ ...formData, visibleMould: 'No' })}
                      >
                        No
                      </button>
                    </div>
                  </div>

                  <div className="wizard-assessment-item">
                    <span className="wizard-assessment-label">Water Damage?</span>
                    <div className="wizard-toggle-buttons">
                      <button
                        type="button"
                        className={`wizard-toggle-btn ${formData.waterDamage === 'Yes' ? 'active yes' : ''}`}
                        onClick={() => setFormData({ ...formData, waterDamage: 'Yes' })}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        className={`wizard-toggle-btn ${formData.waterDamage === 'No' ? 'active no' : ''}`}
                        onClick={() => setFormData({ ...formData, waterDamage: 'No' })}
                      >
                        No
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="wizard-form-field">
                <label className="wizard-label">Upload Photos (Optional)</label>
                <div className="wizard-photo-upload-section">
                  <label className="wizard-upload-btn">
                    <Camera size={24} />
                    <span>Add Photos</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoUpload}
                      style={{ display: 'none' }}
                    />
                  </label>
                  
                  {uploadedPhotos.length > 0 && (
                    <div className="wizard-photo-grid">
                      {uploadedPhotos.map(photo => (
                        <div key={photo.id} className="wizard-photo-item">
                          <img src={photo.preview} alt={photo.name} />
                          <button
                            type="button"
                            className="wizard-remove-photo"
                            onClick={() => removePhoto(photo.id)}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="wizard-form-field">
                <label className="wizard-label">Additional Notes</label>
                <textarea
                  className="wizard-textarea"
                  placeholder="Any additional information or special requirements..."
                  rows={3}
                  value={formData.additionalNotes}
                  onChange={(e) => setFormData({ ...formData, additionalNotes: e.target.value })}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="wizard-navigation">
        {currentStep > 1 && (
          <button className="wizard-nav-btn back" onClick={handleBack} disabled={loading}>
            <ArrowLeft size={20} />
            Back
          </button>
        )}
        
        <button className="wizard-nav-btn next" onClick={handleNext} disabled={loading}>
          {loading ? (
            <span>Processing...</span>
          ) : currentStep === totalSteps ? (
            <>
              <Check size={20} />
              Create Lead
            </>
          ) : (
            <>
              Next
              <ArrowRight size={20} />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default NewLead;
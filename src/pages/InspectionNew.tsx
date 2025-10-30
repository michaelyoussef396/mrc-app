import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  ArrowRight,
  Check,
  Camera,
  MapPin,
  User,
  Home,
  Droplets,
  Wind,
  Thermometer,
  AlertTriangle,
  FileText,
  Clock,
  Calendar,
  Cloud,
  CloudRain,
  CloudSnow,
  Sun,
  Plus,
  X,
  Save,
  Eye,
  Ruler,
  Activity,
  Zap,
  Shield,
  CheckCircle,
  TrendingUp,
  DollarSign,
  MessageSquare,
  Image as ImageIcon
} from 'lucide-react';

export const InspectionNew = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 6;

  const [formData, setFormData] = useState({
    inspectionDate: new Date().toISOString().split('T')[0],
    inspectionStartTime: new Date().toTimeString().slice(0, 5),
    technician: 'Admin User',
    weather: 'Clear',
    temperature: '',
    humidity: '',
    propertyType: 'Residential',
    propertyAge: '',
    propertyCondition: 'Good',
    propertyOccupied: true,
    customerPresent: true,
    accessNotes: '',
    mouldPresent: false,
    mouldSeverity: 'Low',
    mouldColors: [],
    mouldLocations: [],
    estimatedArea: '',
    waterDamagePresent: false,
    waterSource: '',
    moistureReading: '',
    structuralDamage: false,
    structuralNotes: '',
    airQuality: '',
    ventilationRating: 'Good',
    odorPresent: false,
    odorType: '',
    visibleStaining: false,
    rooms: [],
    findingsSummary: '',
    immediateActions: '',
    treatmentRecommendations: '',
    preventiveMeasures: '',
    estimatedCost: '',
    urgencyLevel: 'Normal',
    followUpRequired: false,
    followUpDate: '',
    additionalNotes: '',
  });

  const [photos, setPhotos] = useState<any[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const weatherOptions = [
    { value: 'Clear', icon: Sun, color: '#f59e0b' },
    { value: 'Cloudy', icon: Cloud, color: '#6b7280' },
    { value: 'Rainy', icon: CloudRain, color: '#3b82f6' },
    { value: 'Stormy', icon: CloudSnow, color: '#8b5cf6' },
  ];

  const mouldColorOptions = [
    'Black', 'Green', 'White', 'Brown', 'Yellow', 'Pink', 'Orange', 'Grey'
  ];

  const locationOptions = [
    'Bathroom', 'Kitchen', 'Bedroom', 'Living Room', 'Dining Room',
    'Laundry', 'Basement', 'Attic', 'Garage', 'Ceiling', 'Walls', 'Floor'
  ];

  const validateStep = (step: number) => {
    const newErrors: Record<string, string> = {};
    
    if (step === 1) {
      if (!formData.temperature) newErrors.temperature = 'Required';
      if (!formData.humidity) newErrors.humidity = 'Required';
    }
    
    if (step === 3) {
      if (formData.mouldPresent && formData.mouldLocations.length === 0) {
        newErrors.mouldLocations = 'Select at least one location';
      }
    }
    
    if (step === 6) {
      if (!formData.findingsSummary.trim()) newErrors.findingsSummary = 'Required';
      if (!formData.treatmentRecommendations.trim()) newErrors.treatmentRecommendations = 'Required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1);
        window.scrollTo(0, 0);
      } else {
        handleSubmit();
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo(0, 0);
    }
  };

  const handleSubmit = () => {
    console.log('Inspection submitted:', formData);
    alert('Inspection completed successfully!');
    navigate('/dashboard');
  };

  const toggleArrayItem = (array, item) => {
    const arr = [...formData[array]];
    const index = arr.indexOf(item);
    if (index > -1) {
      arr.splice(index, 1);
    } else {
      arr.push(item);
    }
    setFormData({ ...formData, [array]: arr });
  };

  const addRoom = () => {
    setFormData({
      ...formData,
      rooms: [
        ...formData.rooms,
        {
          name: '',
          mouldLevel: 'None',
          moistureReading: '',
          condition: 'Good',
          notes: ''
        }
      ]
    });
  };

  const updateRoom = (index, field, value) => {
    const rooms = [...formData.rooms];
    rooms[index][field] = value;
    setFormData({ ...formData, rooms });
  };

  const removeRoom = (index) => {
    const rooms = [...formData.rooms];
    rooms.splice(index, 1);
    setFormData({ ...formData, rooms });
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    const newPhotos = files.map(file => ({
      id: Date.now() + Math.random(),
      file,
      preview: URL.createObjectURL(file),
      caption: '',
      location: ''
    }));
    setPhotos([...photos, ...newPhotos]);
  };

  const removePhoto = (id) => {
    setPhotos(photos.filter(p => p.id !== id));
  };

  const updatePhotoCaption = (id, caption) => {
    setPhotos(photos.map(p => p.id === id ? { ...p, caption } : p));
  };

  return (
    <div className="inspection-new-page">
      
      <div className="inspection-header">
        <button className="header-back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={22} strokeWidth={2} />
        </button>
        <div className="header-content">
          <h1 className="header-title">New Inspection</h1>
          <p className="header-subtitle">Step {currentStep} of {totalSteps}</p>
        </div>
        <button className="header-save-btn" title="Save Draft">
          <Save size={20} strokeWidth={2} />
        </button>
      </div>

      <div className="progress-container">
        <div className="progress-track">
          <div 
            className="progress-bar" 
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
        <div className="progress-steps">
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map(step => (
            <div 
              key={step}
              className={`progress-step ${currentStep >= step ? 'active' : ''} ${currentStep > step ? 'completed' : ''}`}
            >
              {currentStep > step ? (
                <Check size={14} strokeWidth={3} />
              ) : (
                <span>{step}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="form-wrapper">

        {currentStep === 1 && (
          <div className="form-step animate-in">
            
            <div className="step-header-card">
              <div className="step-icon-container blue">
                <FileText size={32} strokeWidth={2} />
              </div>
              <div className="step-header-content">
                <h2 className="step-title">Basic Information</h2>
                <p className="step-description">Inspection date, time, and conditions</p>
              </div>
            </div>

            <div className="form-card">
              <h3 className="card-title">Date & Time</h3>
              
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">
                    <Calendar size={16} strokeWidth={2} />
                    Inspection Date
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.inspectionDate}
                    onChange={(e) => setFormData({ ...formData, inspectionDate: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <Clock size={16} strokeWidth={2} />
                    Start Time
                  </label>
                  <input
                    type="time"
                    className="form-input"
                    value={formData.inspectionStartTime}
                    onChange={(e) => setFormData({ ...formData, inspectionStartTime: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="form-card">
              <h3 className="card-title">Weather Conditions</h3>
              
              <div className="form-group">
                <label className="form-label">Current Weather</label>
                <div className="weather-options">
                  {weatherOptions.map(option => {
                    const IconComponent = option.icon;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        className={`weather-option ${formData.weather === option.value ? 'selected' : ''}`}
                        onClick={() => setFormData({ ...formData, weather: option.value })}
                      >
                        <IconComponent 
                          size={28} 
                          strokeWidth={2} 
                          style={{ color: formData.weather === option.value ? option.color : '#9ca3af' }}
                        />
                        <span>{option.value}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">
                    <Thermometer size={16} strokeWidth={2} />
                    Temperature (°C) *
                  </label>
                  <input
                    type="number"
                    className={`form-input ${errors.temperature ? 'error' : ''}`}
                    placeholder="22"
                    value={formData.temperature}
                    onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
                  />
                  {errors.temperature && <span className="error-message">{errors.temperature}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <Droplets size={16} strokeWidth={2} />
                    Humidity (%) *
                  </label>
                  <input
                    type="number"
                    className={`form-input ${errors.humidity ? 'error' : ''}`}
                    placeholder="65"
                    min="0"
                    max="100"
                    value={formData.humidity}
                    onChange={(e) => setFormData({ ...formData, humidity: e.target.value })}
                  />
                  {errors.humidity && <span className="error-message">{errors.humidity}</span>}
                </div>
              </div>
            </div>

          </div>
        )}

        {currentStep === 2 && (
          <div className="form-step animate-in">
            
            <div className="step-header-card">
              <div className="step-icon-container green">
                <Home size={32} strokeWidth={2} />
              </div>
              <div className="step-header-content">
                <h2 className="step-title">Property Details</h2>
                <p className="step-description">Property information and access</p>
              </div>
            </div>

            <div className="form-card">
              <h3 className="card-title">Property Information</h3>
              
              <div className="form-group">
                <label className="form-label">Property Type</label>
                <select
                  className="form-select"
                  value={formData.propertyType}
                  onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })}
                >
                  <option>Residential</option>
                  <option>Commercial</option>
                  <option>Industrial</option>
                  <option>Rental Property</option>
                </select>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Property Age (years)</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="15"
                    value={formData.propertyAge}
                    onChange={(e) => setFormData({ ...formData, propertyAge: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Overall Condition</label>
                  <select
                    className="form-select"
                    value={formData.propertyCondition}
                    onChange={(e) => setFormData({ ...formData, propertyCondition: e.target.value })}
                  >
                    <option>Excellent</option>
                    <option>Good</option>
                    <option>Fair</option>
                    <option>Poor</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="form-card">
              <h3 className="card-title">Access & Occupancy</h3>
              
              <div className="toggle-group">
                <div className="toggle-item">
                  <div className="toggle-content">
                    <User size={20} strokeWidth={2} className="toggle-icon" />
                    <div>
                      <h4 className="toggle-title">Customer Present</h4>
                      <p className="toggle-desc">Customer was on-site during inspection</p>
                    </div>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={formData.customerPresent}
                      onChange={(e) => setFormData({ ...formData, customerPresent: e.target.checked })}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="toggle-item">
                  <div className="toggle-content">
                    <Home size={20} strokeWidth={2} className="toggle-icon" />
                    <div>
                      <h4 className="toggle-title">Property Occupied</h4>
                      <p className="toggle-desc">Property is currently occupied</p>
                    </div>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={formData.propertyOccupied}
                      onChange={(e) => setFormData({ ...formData, propertyOccupied: e.target.checked })}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <MessageSquare size={16} strokeWidth={2} />
                  Access Notes
                </label>
                <textarea
                  className="form-textarea"
                  placeholder="Gate code, special instructions, safety concerns..."
                  rows={3}
                  value={formData.accessNotes}
                  onChange={(e) => setFormData({ ...formData, accessNotes: e.target.value })}
                />
              </div>
            </div>

          </div>
        )}

        {currentStep === 3 && (
          <div className="form-step animate-in">
            
            <div className="step-header-card">
              <div className="step-icon-container orange">
                <Eye size={32} strokeWidth={2} />
              </div>
              <div className="step-header-content">
                <h2 className="step-title">Visual Assessment</h2>
                <p className="step-description">Mould and damage evaluation</p>
              </div>
            </div>

            <div className="form-card">
              <div className="card-header-toggle">
                <h3 className="card-title">
                  <AlertTriangle size={20} strokeWidth={2} />
                  Mould Assessment
                </h3>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={formData.mouldPresent}
                    onChange={(e) => setFormData({ ...formData, mouldPresent: e.target.checked })}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              {formData.mouldPresent && (
                <>
                  <div className="form-group">
                    <label className="form-label">Severity Level</label>
                    <div className="severity-options">
                      {['Low', 'Medium', 'High', 'Severe'].map(level => (
                        <button
                          key={level}
                          type="button"
                          className={`severity-option ${level.toLowerCase()} ${formData.mouldSeverity === level ? 'selected' : ''}`}
                          onClick={() => setFormData({ ...formData, mouldSeverity: level })}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Mould Colors *</label>
                    <div className="checkbox-pills">
                      {mouldColorOptions.map(color => (
                        <label 
                          key={color}
                          className={`checkbox-pill ${formData.mouldColors.includes(color) ? 'selected' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={formData.mouldColors.includes(color)}
                            onChange={() => toggleArrayItem('mouldColors', color)}
                          />
                          <span>{color}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Affected Locations *</label>
                    <div className="checkbox-pills">
                      {locationOptions.map(location => (
                        <label 
                          key={location}
                          className={`checkbox-pill ${formData.mouldLocations.includes(location) ? 'selected' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={formData.mouldLocations.includes(location)}
                            onChange={() => toggleArrayItem('mouldLocations', location)}
                          />
                          <span>{location}</span>
                        </label>
                      ))}
                    </div>
                    {errors.mouldLocations && (
                      <span className="error-message">{errors.mouldLocations}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <Ruler size={16} strokeWidth={2} />
                      Estimated Area (m²)
                    </label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="5.5"
                      step="0.1"
                      value={formData.estimatedArea}
                      onChange={(e) => setFormData({ ...formData, estimatedArea: e.target.value })}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="form-card">
              <div className="card-header-toggle">
                <h3 className="card-title">
                  <Droplets size={20} strokeWidth={2} />
                  Water Damage
                </h3>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={formData.waterDamagePresent}
                    onChange={(e) => setFormData({ ...formData, waterDamagePresent: e.target.checked })}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              {formData.waterDamagePresent && (
                <>
                  <div className="form-group">
                    <label className="form-label">Water Source</label>
                    <select
                      className="form-select"
                      value={formData.waterSource}
                      onChange={(e) => setFormData({ ...formData, waterSource: e.target.value })}
                    >
                      <option value="">Select source...</option>
                      <option>Roof Leak</option>
                      <option>Plumbing Leak</option>
                      <option>Flooding</option>
                      <option>Condensation</option>
                      <option>Rising Damp</option>
                      <option>Storm Damage</option>
                      <option>Other</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <Activity size={16} strokeWidth={2} />
                      Moisture Reading (%)
                    </label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="75"
                      min="0"
                      max="100"
                      value={formData.moistureReading}
                      onChange={(e) => setFormData({ ...formData, moistureReading: e.target.value })}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="form-card">
              <div className="card-header-toggle">
                <h3 className="card-title">
                  <Shield size={20} strokeWidth={2} />
                  Structural Damage
                </h3>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={formData.structuralDamage}
                    onChange={(e) => setFormData({ ...formData, structuralDamage: e.target.checked })}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              {formData.structuralDamage && (
                <div className="form-group">
                  <label className="form-label">Structural Notes</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Describe structural damage observed..."
                    rows={3}
                    value={formData.structuralNotes}
                    onChange={(e) => setFormData({ ...formData, structuralNotes: e.target.value })}
                  />
                </div>
              )}
            </div>

          </div>
        )}

        {currentStep === 4 && (
          <div className="form-step animate-in">
            
            <div className="step-header-card">
              <div className="step-icon-container purple">
                <Wind size={32} strokeWidth={2} />
              </div>
              <div className="step-header-content">
                <h2 className="step-title">Environmental Readings</h2>
                <p className="step-description">Air quality and ventilation</p>
              </div>
            </div>

            <div className="form-card">
              <h3 className="card-title">Air Quality & Ventilation</h3>
              
              <div className="form-group">
                <label className="form-label">
                  <Activity size={16} strokeWidth={2} />
                  Air Quality Reading
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Good / Fair / Poor"
                  value={formData.airQuality}
                  onChange={(e) => setFormData({ ...formData, airQuality: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <Wind size={16} strokeWidth={2} />
                  Ventilation Rating
                </label>
                <select
                  className="form-select"
                  value={formData.ventilationRating}
                  onChange={(e) => setFormData({ ...formData, ventilationRating: e.target.value })}
                >
                  <option>Excellent</option>
                  <option>Good</option>
                  <option>Fair</option>
                  <option>Poor</option>
                  <option>Very Poor</option>
                </select>
              </div>

              <div className="toggle-item">
                <div className="toggle-content">
                  <AlertTriangle size={20} strokeWidth={2} className="toggle-icon" />
                  <div>
                    <h4 className="toggle-title">Unusual Odor Detected</h4>
                    <p className="toggle-desc">Musty, mouldy, or chemical smell present</p>
                  </div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={formData.odorPresent}
                    onChange={(e) => setFormData({ ...formData, odorPresent: e.target.checked })}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              {formData.odorPresent && (
                <div className="form-group">
                  <label className="form-label">Odor Type</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Describe the odor..."
                    value={formData.odorType}
                    onChange={(e) => setFormData({ ...formData, odorType: e.target.value })}
                  />
                </div>
              )}

              <div className="toggle-item">
                <div className="toggle-content">
                  <Eye size={20} strokeWidth={2} className="toggle-icon" />
                  <div>
                    <h4 className="toggle-title">Visible Staining</h4>
                    <p className="toggle-desc">Water stains or discoloration visible</p>
                  </div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={formData.visibleStaining}
                    onChange={(e) => setFormData({ ...formData, visibleStaining: e.target.checked })}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>

          </div>
        )}

        {currentStep === 5 && (
          <div className="form-step animate-in">
            
            <div className="step-header-card">
              <div className="step-icon-container teal">
                <MapPin size={32} strokeWidth={2} />
              </div>
              <div className="step-header-content">
                <h2 className="step-title">Room Assessments</h2>
                <p className="step-description">Detailed room-by-room evaluation</p>
              </div>
            </div>

            {formData.rooms.map((room, index) => (
              <div key={index} className="form-card room-card">
                <div className="room-card-header">
                  <h3 className="card-title">Room {index + 1}</h3>
                  <button
                    type="button"
                    className="remove-room-btn"
                    onClick={() => removeRoom(index)}
                  >
                    <X size={18} strokeWidth={2} />
                  </button>
                </div>

                <div className="form-group">
                  <label className="form-label">Room Name</label>
                  <select
                    className="form-select"
                    value={room.name}
                    onChange={(e) => updateRoom(index, 'name', e.target.value)}
                  >
                    <option value="">Select room...</option>
                    {locationOptions.map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Mould Level</label>
                    <select
                      className="form-select"
                      value={room.mouldLevel}
                      onChange={(e) => updateRoom(index, 'mouldLevel', e.target.value)}
                    >
                      <option>None</option>
                      <option>Low</option>
                      <option>Medium</option>
                      <option>High</option>
                      <option>Severe</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Moisture (%)</label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="65"
                      value={room.moistureReading}
                      onChange={(e) => updateRoom(index, 'moistureReading', e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Condition</label>
                  <select
                    className="form-select"
                    value={room.condition}
                    onChange={(e) => updateRoom(index, 'condition', e.target.value)}
                  >
                    <option>Excellent</option>
                    <option>Good</option>
                    <option>Fair</option>
                    <option>Poor</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Room-specific observations..."
                    rows={2}
                    value={room.notes}
                    onChange={(e) => updateRoom(index, 'notes', e.target.value)}
                  />
                </div>
              </div>
            ))}

            <button
              type="button"
              className="add-room-button"
              onClick={addRoom}
            >
              <Plus size={20} strokeWidth={2} />
              Add Room Assessment
            </button>

            <div className="form-card">
              <h3 className="card-title">
                <Camera size={20} strokeWidth={2} />
                Photo Documentation
              </h3>
              
              <label className="upload-zone">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  capture="environment"
                  onChange={handlePhotoUpload}
                  style={{ display: 'none' }}
                />
                <Camera size={40} strokeWidth={1.5} />
                <h4>Take or Upload Photos</h4>
                <p>Capture evidence of affected areas</p>
              </label>

              {photos.length > 0 && (
                <div className="photo-grid">
                  {photos.map(photo => (
                    <div key={photo.id} className="photo-item">
                      <div className="photo-preview">
                        <img src={photo.preview} alt="Inspection" />
                        <button
                          type="button"
                          className="photo-remove"
                          onClick={() => removePhoto(photo.id)}
                        >
                          <X size={16} strokeWidth={2} />
                        </button>
                      </div>
                      <input
                        type="text"
                        className="photo-caption"
                        placeholder="Add caption..."
                        value={photo.caption}
                        onChange={(e) => updatePhotoCaption(photo.id, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              )}

              {photos.length > 0 && (
                <div className="photo-count">
                  <ImageIcon size={16} strokeWidth={2} />
                  {photos.length} photo{photos.length !== 1 ? 's' : ''} attached
                </div>
              )}
            </div>

          </div>
        )}

        {currentStep === 6 && (
          <div className="form-step animate-in">
            
            <div className="step-header-card">
              <div className="step-icon-container red">
                <CheckCircle size={32} strokeWidth={2} />
              </div>
              <div className="step-header-content">
                <h2 className="step-title">Findings & Recommendations</h2>
                <p className="step-description">Summary and action plan</p>
              </div>
            </div>

            <div className="form-card">
              <h3 className="card-title">Inspection Summary</h3>
              
              <div className="form-group">
                <label className="form-label">
                  <FileText size={16} strokeWidth={2} />
                  Findings Summary *
                </label>
                <textarea
                  className={`form-textarea ${errors.findingsSummary ? 'error' : ''}`}
                  placeholder="Summarize key findings from the inspection..."
                  rows={4}
                  value={formData.findingsSummary}
                  onChange={(e) => setFormData({ ...formData, findingsSummary: e.target.value })}
                />
                {errors.findingsSummary && (
                  <span className="error-message">{errors.findingsSummary}</span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">
                  <Zap size={16} strokeWidth={2} />
                  Immediate Actions
                </label>
                <textarea
                  className="form-textarea"
                  placeholder="Actions that need to be taken immediately..."
                  rows={3}
                  value={formData.immediateActions}
                  onChange={(e) => setFormData({ ...formData, immediateActions: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <TrendingUp size={16} strokeWidth={2} />
                  Treatment Recommendations *
                </label>
                <textarea
                  className={`form-textarea ${errors.treatmentRecommendations ? 'error' : ''}`}
                  placeholder="Recommended treatment plan and procedures..."
                  rows={4}
                  value={formData.treatmentRecommendations}
                  onChange={(e) => setFormData({ ...formData, treatmentRecommendations: e.target.value })}
                />
                {errors.treatmentRecommendations && (
                  <span className="error-message">{errors.treatmentRecommendations}</span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">
                  <Shield size={16} strokeWidth={2} />
                  Preventive Measures
                </label>
                <textarea
                  className="form-textarea"
                  placeholder="Steps to prevent future issues..."
                  rows={3}
                  value={formData.preventiveMeasures}
                  onChange={(e) => setFormData({ ...formData, preventiveMeasures: e.target.value })}
                />
              </div>
            </div>

            <div className="form-card">
              <h3 className="card-title">Cost & Urgency</h3>
              
              <div className="form-group">
                <label className="form-label">
                  <DollarSign size={16} strokeWidth={2} />
                  Estimated Cost (AUD)
                </label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="2500"
                  step="100"
                  value={formData.estimatedCost}
                  onChange={(e) => setFormData({ ...formData, estimatedCost: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <AlertTriangle size={16} strokeWidth={2} />
                  Urgency Level
                </label>
                <div className="urgency-selector">
                  {['Normal', 'Urgent', 'Emergency'].map(level => (
                    <button
                      key={level}
                      type="button"
                      className={`urgency-btn ${level.toLowerCase()} ${formData.urgencyLevel === level ? 'selected' : ''}`}
                      onClick={() => setFormData({ ...formData, urgencyLevel: level })}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              <div className="toggle-item">
                <div className="toggle-content">
                  <Calendar size={20} strokeWidth={2} className="toggle-icon" />
                  <div>
                    <h4 className="toggle-title">Follow-up Required</h4>
                    <p className="toggle-desc">Schedule a follow-up inspection</p>
                  </div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={formData.followUpRequired}
                    onChange={(e) => setFormData({ ...formData, followUpRequired: e.target.checked })}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              {formData.followUpRequired && (
                <div className="form-group">
                  <label className="form-label">Follow-up Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.followUpDate}
                    onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              )}
            </div>

            <div className="form-card">
              <h3 className="card-title">Additional Notes</h3>
              <div className="form-group">
                <textarea
                  className="form-textarea"
                  placeholder="Any additional observations or notes..."
                  rows={4}
                  value={formData.additionalNotes}
                  onChange={(e) => setFormData({ ...formData, additionalNotes: e.target.value })}
                />
              </div>
            </div>

          </div>
        )}

      </div>

      <div className="nav-footer">
        <div className="nav-container">
          {currentStep > 1 && (
            <button 
              type="button"
              className="nav-button back"
              onClick={handleBack}
            >
              <ArrowLeft size={20} strokeWidth={2} />
              <span>Back</span>
            </button>
          )}
          
          <button 
            type="button"
            className="nav-button next"
            onClick={handleNext}
          >
            {currentStep === totalSteps ? (
              <>
                <Check size={20} strokeWidth={2} />
                <span>Complete Inspection</span>
              </>
            ) : (
              <>
                <span>Next Step</span>
                <ArrowRight size={20} strokeWidth={2} />
              </>
            )}
          </button>
        </div>
      </div>

    </div>
  );
};

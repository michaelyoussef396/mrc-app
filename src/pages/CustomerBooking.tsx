import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Calendar } from '@/components/ui/calendar';
import { format, addDays, isAfter, isBefore, startOfDay } from 'date-fns';
import Logo from '@/components/Logo';
import { supabase } from '@/integrations/supabase/client';

// Mock data for demo mode
const MOCK_DATA = {
  clientName: 'John Smith',
  email: 'john.smith@email.com',
  phone: '0412 345 678',
  address: '45 High St, Croydon VIC 3136',
  reportNumber: 'MRC-2025-0042',
  inspector: 'Sarah Martinez',
  inspectionDate: '14 March 2025',
  estimatedDays: 1,
  jobDuration: '1 day (8 hours)',
  equipmentRequired: '3-5 days',
  totalTimeline: '4 days',
  quoteAmount: 4500,
  includedServices: [
    'Complete mould assessment and testing',
    'Professional mould removal and treatment',
    'HEPA air filtration during work',
    'Safe disposal of contaminated materials',
    'Post-treatment verification testing',
    '12-month warranty on treated areas'
  ]
};

const CustomerBooking = () => {
  const { token } = useParams();
  const isDemoMode = token === 'demo' || !token;
  
  const [showBookingFlow, setShowBookingFlow] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(!isDemoMode);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState('');
  const [bookingData, setBookingData] = useState<any>(isDemoMode ? MOCK_DATA : null);
  
  // Client details
  const [clientDetails, setClientDetails] = useState({
    name: MOCK_DATA.clientName,
    email: MOCK_DATA.email,
    phone: MOCK_DATA.phone,
    address: MOCK_DATA.address
  });
  
  // Form validation errors
  const [errors, setErrors] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });

  useEffect(() => {
    if (!isDemoMode && token) {
      loadBookingData(token);
    }
  }, [token, isDemoMode]);

  const loadBookingData = async (token: string) => {
    try {
      const { data: tokenData, error: tokenError } = await supabase
        .from('booking_tokens')
        .select('*, leads(*)')
        .eq('token', token)
        .single();

      if (tokenError || !tokenData) {
        setLoading(false);
        return;
      }

      if (new Date(tokenData.expires_at) < new Date() || tokenData.used) {
        setLoading(false);
        return;
      }

      const bookingInfo = {
        leadId: tokenData.lead_id,
        tokenId: tokenData.id,
        clientName: tokenData.leads.full_name,
        email: tokenData.leads.email,
        phone: tokenData.leads.phone,
        address: `${tokenData.leads.property_address_street}, ${tokenData.leads.property_address_suburb} VIC ${tokenData.leads.property_address_postcode}`,
        reportNumber: 'MRC-2025-0042',
        inspector: 'Sarah Martinez',
        inspectionDate: format(new Date(), 'dd MMMM yyyy'),
        estimatedDays: 1,
        jobDuration: '1 day (8 hours)',
        equipmentRequired: '3-5 days',
        totalTimeline: '4 days',
        quoteAmount: tokenData.leads.quoted_amount || 4500,
        includedServices: MOCK_DATA.includedServices
      };
      
      setBookingData(bookingInfo);
      setClientDetails({
        name: bookingInfo.clientName,
        email: bookingInfo.email,
        phone: bookingInfo.phone,
        address: bookingInfo.address
      });
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading booking data:', error);
      setLoading(false);
    }
  };

  // Validation function
  const validateDetails = () => {
    const newErrors = {
      name: '',
      email: '',
      phone: '',
      address: ''
    };

    if (!clientDetails.name.trim()) {
      newErrors.name = 'Please enter your full name';
    }

    if (!clientDetails.email.trim()) {
      newErrors.email = 'Please enter a valid email address';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientDetails.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!clientDetails.phone.trim()) {
      newErrors.phone = 'Please enter a valid phone number';
    } else if (!/^04\d{2}\s?\d{3}\s?\d{3}$/.test(clientDetails.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Please enter a valid Australian mobile number';
    }

    if (!clientDetails.address.trim()) {
      newErrors.address = 'Please enter the property address';
    }

    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error !== '');
  };

  // Save details handler
  const handleSaveDetails = () => {
    if (!validateDetails()) {
      return;
    }

    setIsSaving(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsSaving(false);
      setShowSuccess(true);
      setIsEditMode(false);
      
      // Hide success message and move to step 2
      setTimeout(() => {
        setShowSuccess(false);
        setStep(2);
      }, 1500);
    }, 1000);
  };

  // Time slots with availability
  const timeSlots = [
    { time: '7:00 AM', available: true },
    { time: '8:00 AM', available: true },
    { time: '9:00 AM', available: false },
    { time: '10:00 AM', available: true },
    { time: '11:00 AM', available: true },
    { time: '12:00 PM', available: true },
    { time: '1:00 PM', available: false },
    { time: '2:00 PM', available: true },
    { time: '3:00 PM', available: true },
    { time: '4:00 PM', available: true },
    { time: '5:00 PM', available: true },
    { time: '6:00 PM', available: true }
  ];

  if (loading) {
    return (
      <div className="customer-booking-page">
        <div className="booking-loading">
          <div className="loading-spinner"></div>
          <p>Loading booking information...</p>
        </div>
      </div>
    );
  }

  if (!isDemoMode && !bookingData) {
    return (
      <div className="customer-booking-page">
        <div className="booking-error">
          <div className="error-icon">⚠️</div>
          <h2>Invalid Booking Link</h2>
          <p>This booking link is invalid, expired, or has already been used.</p>
          <p>Please contact us directly to schedule your service:</p>
          <a href="tel:1300665673" className="btn-primary">
            📞 Call 1300 665 673
          </a>
        </div>
      </div>
    );
  }

  // Show error page first in demo mode
  if (isDemoMode && !showBookingFlow) {
    return (
      <div className="customer-booking-page">
        <div className="booking-error">
          <div className="error-icon">⚠️</div>
          <h2>Booking Link Expired</h2>
          <p>This booking link has expired or has already been used.</p>
          <p>Please contact us directly to schedule your service:</p>
          <a href="tel:1300665673" className="btn-primary">
            📞 Call 1300 665 673
          </a>
          
          {/* Demo Access Button */}
          <div className="demo-access">
            <p className="demo-label">DEMO MODE</p>
            <button
              className="btn-demo"
              onClick={() => setShowBookingFlow(true)}
            >
              🎨 View Booking Flow Design
            </button>
          </div>
        </div>
      </div>
    );
  }

  const data = bookingData || MOCK_DATA;

  return (
    <div className="customer-booking-page">
      {/* Header */}
      <header className="booking-header">
        <div className="company-logo">
          <Logo size="medium" />
          <div className="logo-text">
            <h1>Mould & Restoration Co.</h1>
            <p>Professional Mould Remediation</p>
          </div>
        </div>
        <a href="tel:1300665673" className="btn-call-header">
          📞 1300 665 673
        </a>
      </header>

      {/* Progress Header */}
      <div className="booking-progress-header">
        <div className="booking-container">
          <div className="booking-progress">
            <div className={`progress-step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
              <div className="step-number">{step > 1 ? '✓' : '1'}</div>
              <div className="step-label">Confirm Details</div>
            </div>
            <div className="progress-line"></div>
            <div className={`progress-step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
              <div className="step-number">{step > 2 ? '✓' : '2'}</div>
              <div className="step-label">Review Report</div>
            </div>
            <div className="progress-line"></div>
            <div className={`progress-step ${step >= 3 ? 'active' : ''} ${step > 3 ? 'completed' : ''}`}>
              <div className="step-number">{step > 3 ? '✓' : '3'}</div>
              <div className="step-label">Select Date</div>
            </div>
            <div className="progress-line"></div>
            <div className={`progress-step ${step >= 4 ? 'active' : ''} ${step > 4 ? 'completed' : ''}`}>
              <div className="step-number">{step > 4 ? '✓' : '4'}</div>
              <div className="step-label">Select Time</div>
            </div>
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="booking-content">
        <div className="booking-container">

          {/* STEP 1: CONFIRM DETAILS */}
          {step === 1 && (
            <div className="step-card">
              <div className="step-header">
                <h1 className="step-title">Confirm Your Details</h1>
                <p className="step-subtitle">Please verify your information is correct before booking</p>
              </div>

              <div className="details-card">
                {!isEditMode ? (
                  // VIEW MODE
                  <>
                    <div className="detail-item">
                      <div className="detail-icon" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' }}>
                        👤
                      </div>
                      <div className="detail-content">
                        <label>FULL NAME</label>
                        <div className="detail-value">{clientDetails.name}</div>
                      </div>
                    </div>

                    <div className="detail-item">
                      <div className="detail-icon" style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' }}>
                        📧
                      </div>
                      <div className="detail-content">
                        <label>EMAIL ADDRESS</label>
                        <div className="detail-value">{clientDetails.email}</div>
                      </div>
                    </div>

                    <div className="detail-item">
                      <div className="detail-icon" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
                        📱
                      </div>
                      <div className="detail-content">
                        <label>PHONE NUMBER</label>
                        <div className="detail-value">{clientDetails.phone}</div>
                      </div>
                    </div>

                    <div className="detail-item">
                      <div className="detail-icon" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}>
                        🏠
                      </div>
                      <div className="detail-content">
                        <label>PROPERTY ADDRESS</label>
                        <div className="detail-value">{clientDetails.address}</div>
                      </div>
                    </div>

                    <div className="details-question">
                      <p>Are these details correct?</p>
                    </div>

                    <div className="details-buttons">
                      <button 
                        className="btn-yes"
                        onClick={() => setStep(2)}
                      >
                        <span className="btn-icon">✓</span>
                        Yes, Details are Correct
                      </button>
                      
                      <button 
                        className="btn-no"
                        onClick={() => setIsEditMode(true)}
                      >
                        <span className="btn-icon">✏️</span>
                        No, I Need to Update Details
                      </button>
                    </div>
                  </>
                ) : (
                  // EDIT MODE
                  <div className="edit-form">
                    <div className="form-group">
                      <label>FULL NAME</label>
                      <input
                        type="text"
                        className={`form-input ${errors.name ? 'error' : ''}`}
                        value={clientDetails.name}
                        onChange={(e) => {
                          setClientDetails({...clientDetails, name: e.target.value});
                          setErrors({...errors, name: ''});
                        }}
                        placeholder="Enter your full name"
                      />
                      {errors.name && <div className="error-message">{errors.name}</div>}
                    </div>

                    <div className="form-group">
                      <label>EMAIL ADDRESS</label>
                      <input
                        type="email"
                        className={`form-input ${errors.email ? 'error' : ''}`}
                        value={clientDetails.email}
                        onChange={(e) => {
                          setClientDetails({...clientDetails, email: e.target.value});
                          setErrors({...errors, email: ''});
                        }}
                        placeholder="your.email@example.com"
                      />
                      {errors.email && <div className="error-message">{errors.email}</div>}
                    </div>

                    <div className="form-group">
                      <label>PHONE NUMBER</label>
                      <input
                        type="tel"
                        className={`form-input ${errors.phone ? 'error' : ''}`}
                        value={clientDetails.phone}
                        onChange={(e) => {
                          setClientDetails({...clientDetails, phone: e.target.value});
                          setErrors({...errors, phone: ''});
                        }}
                        placeholder="0412 345 678"
                      />
                      {errors.phone && <div className="error-message">{errors.phone}</div>}
                    </div>

                    <div className="form-group">
                      <label>PROPERTY ADDRESS</label>
                      <textarea
                        className={`form-input ${errors.address ? 'error' : ''}`}
                        rows={2}
                        value={clientDetails.address}
                        onChange={(e) => {
                          setClientDetails({...clientDetails, address: e.target.value});
                          setErrors({...errors, address: ''});
                        }}
                        placeholder="45 High St, Croydon VIC 3136"
                      />
                      {errors.address && <div className="error-message">{errors.address}</div>}
                    </div>

                    <div className="form-actions">
                      <button 
                        className="btn-cancel"
                        onClick={() => {
                          setIsEditMode(false);
                          setErrors({ name: '', email: '', phone: '', address: '' });
                        }}
                      >
                        Cancel
                      </button>
                      <button 
                        className="btn-save"
                        onClick={handleSaveDetails}
                      >
                        Save & Continue
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Loading Overlay */}
              {isSaving && (
                <div className="loading-overlay">
                  <div className="loading-content">
                    <div className="loading-spinner"></div>
                    <p>Saving your details...</p>
                  </div>
                </div>
              )}

              {/* Success Message */}
              {showSuccess && (
                <div className="success-overlay">
                  <div className="success-content">
                    <div className="success-checkmark">✓</div>
                    <p>Details updated successfully!</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: REVIEW REPORT */}
          {step === 2 && (
            <div className="step-card">
              <div className="step-header">
                <h1 className="step-title">Your Inspection Report</h1>
                <p className="step-subtitle">Review the details before selecting your booking date</p>
              </div>

              <div className="report-summary-grid">
                {/* Report Information */}
                <div className="summary-card">
                  <div className="card-header">
                    <h3>📋 Report Information</h3>
                  </div>
                  <div className="card-content">
                    <div className="info-row">
                      <span className="info-label">Report Number</span>
                      <span className="info-value">{data.reportNumber}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Inspector</span>
                      <span className="info-value">{data.inspector}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Inspection Date</span>
                      <span className="info-value">{data.inspectionDate}</span>
                    </div>
                  </div>
                </div>

                {/* Client & Property Details */}
                <div className="summary-card">
                  <div className="card-header">
                    <h3>🏠 Client & Property Details</h3>
                  </div>
                  <div className="card-content">
                    <div className="info-row">
                      <span className="info-label">Client Name</span>
                      <span className="info-value">{clientDetails.name}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Phone</span>
                      <span className="info-value">{clientDetails.phone}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Property</span>
                      <span className="info-value">{clientDetails.address}</span>
                    </div>
                  </div>
                </div>

                {/* Quote Summary */}
                <div className="summary-card highlight-card">
                  <div className="card-header">
                    <h3>💰 Quote Summary</h3>
                  </div>
                  <div className="card-content">
                    <div className="info-row">
                      <span className="info-label">Job Duration</span>
                      <span className="info-value">{data.jobDuration}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Equipment Required</span>
                      <span className="info-value">{data.equipmentRequired}</span>
                    </div>
                    <div className="info-row total-row">
                      <span className="info-label">Total Timeline</span>
                      <span className="info-value">{data.totalTimeline}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Services Included */}
              <div className="services-included-card">
                <h3>What's Included</h3>
                <ul className="services-list">
                  {data.includedServices.map((service: string, index: number) => (
                    <li key={index}>
                      <span className="check-icon">✓</span>
                      {service}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="step-actions">
                <button className="btn-back" onClick={() => setStep(1)}>
                  ← Back
                </button>
                <button className="btn-continue" onClick={() => setStep(3)}>
                  Continue to Calendar
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M7.5 15l5-5-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: SELECT DATE */}
          {step === 3 && (
            <div className="step-card">
              <div className="step-header">
                <h1 className="step-title">Select Your Date</h1>
                <p className="step-subtitle">Choose a convenient date for your remediation work</p>
              </div>

              <div className="calendar-section">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => {
                    const today = startOfDay(new Date());
                    return isBefore(date, today) || isAfter(date, addDays(today, 60));
                  }}
                  className="booking-calendar"
                />

                {selectedDate && (
                  <div className="selected-date-preview">
                    <div className="preview-icon">📅</div>
                    <div className="preview-content">
                      <div className="preview-label">Selected Date</div>
                      <div className="preview-value">{format(selectedDate, 'EEEE, MMMM d, yyyy')}</div>
                    </div>
                  </div>
                )}
              </div>

              <div className="step-actions">
                <button className="btn-back" onClick={() => setStep(2)}>
                  ← Back to Report
                </button>
                <button 
                  className="btn-continue" 
                  onClick={() => setStep(4)}
                  disabled={!selectedDate}
                >
                  {selectedDate ? 'Continue to Time Selection' : 'Please select a date'}
                  {selectedDate && (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M7.5 15l5-5-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: SELECT TIME */}
          {step === 4 && (
            <div className="step-card">
              <div className="step-header">
                <h1 className="step-title">Select Your Time</h1>
                <p className="step-subtitle">Choose your preferred start time</p>
              </div>

              {selectedDate && (
                <div className="selected-date-reminder">
                  <span className="reminder-icon">📅</span>
                  <span className="reminder-text">
                    Booking for: <strong>{format(selectedDate, 'EEEE, MMMM d, yyyy')}</strong>
                  </span>
                </div>
              )}

              <div className="timeslots-grid">
                {timeSlots.map((slot) => (
                  <button
                    key={slot.time}
                    className={`timeslot-btn ${!slot.available ? 'unavailable' : ''} ${selectedTime === slot.time ? 'selected' : ''}`}
                    onClick={() => slot.available && setSelectedTime(slot.time)}
                    disabled={!slot.available}
                  >
                    <div className="time-icon">🕐</div>
                    <div className="time-label">{slot.time}</div>
                    {!slot.available && <div className="booked-badge">Booked</div>}
                    {selectedTime === slot.time && <div className="selected-badge">✓</div>}
                  </button>
                ))}
              </div>

              <div className="step-actions">
                <button className="btn-back" onClick={() => setStep(3)}>
                  ← Back to Calendar
                </button>
                <button 
                  className={`btn-confirm ${selectedTime ? 'enabled' : ''}`}
                  disabled={!selectedTime}
                  onClick={() => {
                    // Show success state
                    alert(`Booking confirmed for ${format(selectedDate!, 'EEEE, MMMM d, yyyy')} at ${selectedTime}`);
                  }}
                >
                  {selectedTime ? (
                    <>
                      <span>✓</span> Confirm Booking
                    </>
                  ) : (
                    'Please select a time'
                  )}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default CustomerBooking;

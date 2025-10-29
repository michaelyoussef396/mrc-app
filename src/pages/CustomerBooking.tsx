import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Calendar } from '@/components/ui/calendar';
import { format, addDays } from 'date-fns';
import Logo from '@/components/Logo';

const CustomerBooking = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [bookingData, setBookingData] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [accessInstructions, setAccessInstructions] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [detailsConfirmed, setDetailsConfirmed] = useState(false);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Editable client details
  const [editedDetails, setEditedDetails] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });

  useEffect(() => {
    if (token) {
      loadBookingData(token);
    } else {
      setLoading(false);
    }
  }, [token]);

  const loadBookingData = async (token: string) => {
    try {
      // Verify token and get lead data
      const { data: tokenData, error: tokenError } = await supabase
        .from('booking_tokens')
        .select('*, leads(*)')
        .eq('token', token)
        .single();

      if (tokenError || !tokenData) {
        console.error('Invalid or expired token');
        setLoading(false);
        return;
      }

      // Check if token is expired or used
      if (new Date(tokenData.expires_at) < new Date() || tokenData.used) {
        console.error('Token expired or already used');
        setLoading(false);
        return;
      }

      const bookingInfo = {
        leadId: tokenData.lead_id,
        tokenId: tokenData.id,
        clientName: tokenData.leads.full_name,
        email: tokenData.leads.email,
        phone: tokenData.leads.phone,
        property: tokenData.leads.property_address_street,
        suburb: tokenData.leads.property_address_suburb,
        postcode: tokenData.leads.property_address_postcode,
        quoteAmount: tokenData.leads.quoted_amount || 0,
        estimatedDays: 3, // TODO: Calculate from inspection data
        workDescription: tokenData.leads.issue_description,
        includedServices: [
          'Complete mould assessment and testing',
          'Professional mould removal and treatment',
          'HEPA air filtration during work',
          'Safe disposal of contaminated materials',
          'Post-treatment verification testing',
          '12-month warranty on treated areas'
        ]
      };
      
      setBookingData(bookingInfo);
      setEditedDetails({
        name: tokenData.leads.full_name || '',
        email: tokenData.leads.email || '',
        phone: tokenData.leads.phone || '',
        address: `${tokenData.leads.property_address_street}, ${tokenData.leads.property_address_suburb} VIC ${tokenData.leads.property_address_postcode}`
      });
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading booking data:', error);
      setLoading(false);
    }
  };

  const handleSubmitBooking = async () => {
    if (!selectedDate || !selectedTimeSlot || !accessInstructions || !agreeToTerms) {
      alert('Please fill in all required fields');
      return;
    }

    setSubmitting(true);

    try {
      // Generate scheduled dates array (consecutive days)
      const scheduledDates = [];
      for (let i = 0; i < bookingData.estimatedDays; i++) {
        scheduledDates.push(format(addDays(selectedDate, i), 'yyyy-MM-dd'));
      }

      // Update lead with booking information
      const { error: updateError } = await supabase
        .from('leads')
        .update({
          status: 'job_completed', // Status for "Job Booked"
          scheduled_dates: scheduledDates,
          scheduled_time: selectedTimeSlot,
          access_instructions: accessInstructions,
          special_requests: specialRequests,
          booked_at: new Date().toISOString()
        })
        .eq('id', bookingData.leadId);

      if (updateError) throw updateError;

      // Mark token as used
      await supabase
        .from('booking_tokens')
        .update({
          used: true,
          used_at: new Date().toISOString()
        })
        .eq('id', bookingData.tokenId);

      // Create notifications for all technicians
      const { data: technicians } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('is_active', true);

      if (technicians) {
        for (const tech of technicians) {
          await supabase.from('notifications').insert({
            user_id: tech.id,
            type: 'job-booked',
            title: 'New Job Booked! 🎉',
            message: `${bookingData.clientName} booked service for ${format(selectedDate, 'PPP')} at ${selectedTimeSlot}`,
            action_url: `/client/${bookingData.leadId}`,
            priority: 'high'
          });
        }
      }

      setStep(5); // Success screen
    } catch (error) {
      console.error('Error submitting booking:', error);
      alert('There was an error processing your booking. Please try again or call us.');
    } finally {
      setSubmitting(false);
    }
  };

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

  if (!token || !bookingData) {
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

  const timeSlots = [
    '7:00 AM',
    '9:00 AM',
    '11:00 AM',
    '1:00 PM',
    '3:00 PM',
    '5:00 PM'
  ];

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

      {/* Progress Indicator - 4 Steps */}
      <div className="booking-progress-header">
        <div className="booking-container">
          <div className="booking-progress">
            <div className={`progress-step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
              <div className="step-number">{step > 1 ? '✓' : '1'}</div>
              <div className="step-label">Your Details</div>
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

      {/* Step 1: Confirm Your Details */}
      {step === 1 && (
        <div className="step-content">
          <h2 className="step-title">Confirm Your Details</h2>
          <p className="step-subtitle">Please verify your information is correct before booking</p>

          <div className="details-card">
            {!isEditingDetails ? (
              <>
                <div className="detail-item">
                  <div className="detail-icon">👤</div>
                  <div className="detail-content">
                    <label>Full Name</label>
                    <div className="detail-value">{editedDetails.name}</div>
                  </div>
                </div>

                <div className="detail-item">
                  <div className="detail-icon">📧</div>
                  <div className="detail-content">
                    <label>Email Address</label>
                    <div className="detail-value">{editedDetails.email}</div>
                  </div>
                </div>

                <div className="detail-item">
                  <div className="detail-icon">📱</div>
                  <div className="detail-content">
                    <label>Phone Number</label>
                    <div className="detail-value">{editedDetails.phone}</div>
                  </div>
                </div>

                <div className="detail-item">
                  <div className="detail-icon">🏠</div>
                  <div className="detail-content">
                    <label>Property Address</label>
                    <div className="detail-value">{editedDetails.address}</div>
                  </div>
                </div>

                <button 
                  className="btn-edit-details"
                  onClick={() => setIsEditingDetails(true)}
                >
                  <span>✏️</span> Edit Details
                </button>
              </>
            ) : (
              <div className="edit-form">
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editedDetails.name}
                    onChange={(e) => setEditedDetails({...editedDetails, name: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    className="form-input"
                    value={editedDetails.email}
                    onChange={(e) => setEditedDetails({...editedDetails, email: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    className="form-input"
                    value={editedDetails.phone}
                    onChange={(e) => setEditedDetails({...editedDetails, phone: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label>Property Address</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editedDetails.address}
                    onChange={(e) => setEditedDetails({...editedDetails, address: e.target.value})}
                  />
                </div>

                <div className="form-actions">
                  <button 
                    className="btn-secondary"
                    onClick={() => setIsEditingDetails(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    className="btn-primary"
                    onClick={() => setIsEditingDetails(false)}
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            )}
          </div>

          {!isEditingDetails && (
            <div className="step-actions">
              <button 
                className="btn-continue"
                onClick={() => setStep(2)}
              >
                Details are Correct - Continue
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M7.5 15l5-5-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Review Inspection Report */}
      {step === 2 && (
        <div className="step-content">
          <h2 className="step-title">Your Inspection Report</h2>
          <p className="step-subtitle">Review the details before selecting your booking date</p>

          <div className="report-summary-grid">
            {/* Report Info Card */}
            <div className="summary-card">
              <div className="card-header">
                <h3>Report Information</h3>
              </div>
              <div className="card-content">
                <div className="info-row">
                  <span className="info-label">Client Name</span>
                  <span className="info-value">{bookingData.clientName}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Property Type</span>
                  <span className="info-value">Residential</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Contact</span>
                  <span className="info-value">{bookingData.phone}</span>
                </div>
              </div>
            </div>

            {/* Property Card */}
            <div className="summary-card">
              <div className="card-header">
                <h3>Property Details</h3>
              </div>
              <div className="card-content">
                <div className="info-row">
                  <span className="info-label">Address</span>
                  <span className="info-value">{bookingData.property}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Suburb</span>
                  <span className="info-value">{bookingData.suburb} VIC</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Postcode</span>
                  <span className="info-value">{bookingData.postcode}</span>
                </div>
              </div>
            </div>

            {/* Quote Summary Card */}
            <div className="summary-card highlight-card">
              <div className="card-header">
                <h3>Quote Summary</h3>
              </div>
              <div className="card-content">
                <div className="info-row">
                  <span className="info-label">Job Duration</span>
                  <span className="info-value">{bookingData.estimatedDays} days</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Equipment Required</span>
                  <span className="info-value">3-5 days</span>
                </div>
                <div className="info-row total-row">
                  <span className="info-label">Total Investment</span>
                  <span className="info-value">${bookingData.quoteAmount.toLocaleString()} INC GST</span>
                </div>
              </div>
            </div>
          </div>

          {/* Services Included */}
          <div className="services-included-card">
            <h3 className="section-title">What's Included</h3>
            <ul className="services-list">
              {bookingData.includedServices.map((service: string, index: number) => (
                <li key={index}>
                  <span className="check-icon">✓</span>
                  {service}
                </li>
              ))}
            </ul>
          </div>

          <div className="step-actions">
            <button 
              className="btn-back"
              onClick={() => setStep(1)}
            >
              ← Back
            </button>
            <button 
              className="btn-continue"
              onClick={() => setStep(3)}
            >
              Continue to Calendar
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M7.5 15l5-5-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Select Date */}
      {step === 3 && (
        <div className="step-content">
          <h2 className="step-title">Select Your Date</h2>
          <p className="step-subtitle">Choose a convenient date for your remediation work (requires {bookingData.estimatedDays} consecutive business days)</p>

          <div className="calendar-section">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={(date) => 
                date < new Date() || date.getDay() === 0 || date.getDay() === 6
              }
              className="booking-calendar"
            />
            {selectedDate && (
              <div className="selected-dates-preview">
                <h4>Your scheduled days:</h4>
                {Array.from({ length: bookingData.estimatedDays }).map((_, i) => (
                  <div key={i} className="scheduled-day">
                    📅 Day {i + 1}: {format(addDays(selectedDate, i), 'EEEE, MMMM d, yyyy')}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="step-actions">
            <button 
              className="btn-back"
              onClick={() => setStep(2)}
            >
              ← Back
            </button>
            <button 
              className="btn-continue"
              onClick={() => setStep(4)}
              disabled={!selectedDate}
            >
              Continue to Time Selection
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M7.5 15l5-5-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Select Time & Confirm */}
      {step === 4 && (
        <div className="step-content">
          <h2 className="step-title">Select Your Time & Confirm</h2>
          <p className="step-subtitle">Choose your preferred start time and provide access details</p>
          
          {/* TIME SLOTS */}
          <div className="timeslots-section">
            <h3 className="section-title">Select Start Time</h3>
            <div className="timeslots-grid">
              {timeSlots.map((slot) => (
                <button
                  key={slot}
                  className={`timeslot-btn ${selectedTimeSlot === slot ? 'selected' : ''}`}
                  onClick={() => setSelectedTimeSlot(slot)}
                >
                  <span className="time-icon">🕐</span>
                  <span className="time-label">{slot}</span>
                </button>
              ))}
            </div>
          </div>

          {/* BOOKING SUMMARY */}
          {selectedTimeSlot && (
            <div className="booking-summary">
              <h3 className="section-title">Booking Summary</h3>
              <div className="summary-grid">
                <div className="summary-item">
                  <div className="summary-label">Property</div>
                  <div className="summary-value">
                    {bookingData.property}, {bookingData.suburb}
                  </div>
                </div>
                <div className="summary-item">
                  <div className="summary-label">Start Date</div>
                  <div className="summary-value">
                    {selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy')}
                  </div>
                </div>
                <div className="summary-item">
                  <div className="summary-label">Start Time</div>
                  <div className="summary-value">{selectedTimeSlot}</div>
                </div>
                <div className="summary-item">
                  <div className="summary-label">Duration</div>
                  <div className="summary-value">{bookingData.estimatedDays} days</div>
                </div>
                <div className="summary-item">
                  <div className="summary-label">Total</div>
                  <div className="summary-value summary-amount">
                    ${bookingData.quoteAmount.toLocaleString()} INC GST
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Access Instructions */}
          <div className="form-section access-card">
            <h3>🔑 Access Instructions</h3>
            <p className="card-subtitle">
              How should our technicians access your property on service day?
            </p>
            <textarea
              className="form-textarea"
              placeholder="Examples:
• Key under doormat
• Ring doorbell - someone will be home
• Gate code: 1234
• Park on street, side entrance
• Lockbox code: 5678"
              value={accessInstructions}
              onChange={(e) => setAccessInstructions(e.target.value)}
              rows={5}
              required
            />
            <p className="field-hint">
              ⚠️ Required - Our technicians need to know how to enter the property
            </p>
          </div>

          {/* Special Requests */}
          <div className="form-section requests-card">
            <h3>💬 Special Requests (Optional)</h3>
            <p className="card-subtitle">
              Any specific requirements or important information?
            </p>
            <textarea
              className="form-textarea"
              placeholder="Examples:
• Please park on street (driveway blocked)
• Dog on property (friendly, secure in backyard)
• Call 10 minutes before arriving
• Use side entrance, front door broken
• Allergies to certain cleaning products"
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              rows={5}
            />
          </div>

          {/* Terms & Conditions */}
          <div className="terms-section terms-card">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={agreeToTerms}
                onChange={(e) => setAgreeToTerms(e.target.checked)}
                required
              />
              <span className="checkbox-custom"></span>
              <span className="checkbox-text">
                I agree to the <a href="/terms" target="_blank">Terms & Conditions</a> and understand that:
              </span>
            </label>
            <ul className="terms-list">
              <li>Payment is due upon completion of work (Net 30 days)</li>
              <li>All work comes with a 12-month warranty</li>
              <li>Access to the property must be provided as scheduled</li>
              <li>Cancellations require 48 hours notice</li>
            </ul>
          </div>

          <div className="step-actions">
            <button 
              className="btn-back"
              onClick={() => setStep(3)}
            >
              ← Back
            </button>
            <button 
              className="btn-confirm"
              onClick={handleSubmitBooking}
              disabled={!selectedTimeSlot || !accessInstructions || !agreeToTerms || submitting}
            >
              {submitting ? 'Processing...' : (
                <>
                  Confirm Booking
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M16.7 4.7l-9.4 9.4-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </>
              )}
            </button>
          </div>

          <p className="help-text">
            Need help? Call us at <a href="tel:1300665673">1300 665 673</a>
          </p>
        </div>
      )}

      {/* Step 5: Success */}
      {step === 5 && (
        <div className="step-content success-content">
          <div className="success-animation">
            <div className="success-checkmark">✓</div>
          </div>
          
          <h2 className="success-title">Booking Confirmed! 🎉</h2>
          <p className="success-subtitle">Thank you, {bookingData.clientName}!</p>

          <div className="confirmation-card">
            <h3 className="section-title">Your Booking Details</h3>
            
            <div className="confirmation-details">
              <div className="detail-row">
                <span className="detail-icon">📍</span>
                <div>
                  <div className="detail-label">Property</div>
                  <div className="detail-value">
                    {bookingData.property}, {bookingData.suburb}
                  </div>
                </div>
              </div>

              <div className="detail-row">
                <span className="detail-icon">📅</span>
                <div>
                  <div className="detail-label">Start Date</div>
                  <div className="detail-value">
                    {selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy')}
                  </div>
                </div>
              </div>

              <div className="detail-row">
                <span className="detail-icon">🕐</span>
                <div>
                  <div className="detail-label">Start Time</div>
                  <div className="detail-value">{selectedTimeSlot}</div>
                </div>
              </div>

              <div className="detail-row">
                <span className="detail-icon">⏱️</span>
                <div>
                  <div className="detail-label">Duration</div>
                  <div className="detail-value">{bookingData.estimatedDays} consecutive days</div>
                </div>
              </div>
            </div>
          </div>

          <div className="next-steps-card">
            <h3 className="section-title">What Happens Next?</h3>
            <div className="steps-list">
              <div className="next-step">
                <span className="step-number">1</span>
                <div>
                  <div className="step-title">Confirmation Email</div>
                  <div className="step-desc">You'll receive a confirmation email with all booking details</div>
                </div>
              </div>
              <div className="next-step">
                <span className="step-number">2</span>
                <div>
                  <div className="step-title">24-Hour Reminder</div>
                  <div className="step-desc">We'll send you a reminder the day before your service</div>
                </div>
              </div>
              <div className="next-step">
                <span className="step-number">3</span>
                <div>
                  <div className="step-title">Service Day</div>
                  <div className="step-desc">Our technician will arrive at your scheduled time</div>
                </div>
              </div>
            </div>
          </div>

          <div className="contact-card">
            <p className="contact-text">Questions about your booking?</p>
            <a href="tel:1300665673" className="btn-primary">
              📞 Call Us: 1300 665 673
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerBooking;

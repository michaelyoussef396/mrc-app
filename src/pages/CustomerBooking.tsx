import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Calendar } from '@/components/ui/calendar';
import { format, addDays } from 'date-fns';

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
  const [submitting, setSubmitting] = useState(false);

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

      setBookingData({
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

      setStep(4); // Success screen
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
          <span className="logo-icon">🏠</span>
          <div className="logo-text">
            <h1>Mould & Restoration Co.</h1>
            <p>Professional Mould Remediation</p>
          </div>
        </div>
        <a href="tel:1300665673" className="btn-call-header">
          📞 1300 665 673
        </a>
      </header>

      {/* Progress Indicator */}
      <div className="booking-progress">
        <div className={`progress-step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
          <div className="step-number">{step > 1 ? '✓' : '1'}</div>
          <div className="step-label">Review</div>
        </div>
        <div className="progress-line"></div>
        <div className={`progress-step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
          <div className="step-number">{step > 2 ? '✓' : '2'}</div>
          <div className="step-label">Date & Time</div>
        </div>
        <div className="progress-line"></div>
        <div className={`progress-step ${step >= 3 ? 'active' : ''} ${step > 3 ? 'completed' : ''}`}>
          <div className="step-number">{step > 3 ? '✓' : '3'}</div>
          <div className="step-label">Confirm</div>
        </div>
      </div>

      {/* Step 1: Review Quote */}
      {step === 1 && (
        <div className="step-content">
          <h2 className="step-title">Review Your Quote</h2>
          <p className="step-subtitle">Please review the details of your mould remediation service</p>

          <div className="quote-card">
            {/* Client Info */}
            <div className="quote-section">
              <h3 className="section-title">Client Information</h3>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-icon">👤</span>
                  <div>
                    <div className="info-label">Name</div>
                    <div className="info-value">{bookingData.clientName}</div>
                  </div>
                </div>
                <div className="info-item">
                  <span className="info-icon">📞</span>
                  <div>
                    <div className="info-label">Phone</div>
                    <div className="info-value">{bookingData.phone}</div>
                  </div>
                </div>
                <div className="info-item">
                  <span className="info-icon">📧</span>
                  <div>
                    <div className="info-label">Email</div>
                    <div className="info-value">{bookingData.email}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Property Info */}
            <div className="quote-section">
              <h3 className="section-title">Property</h3>
              <div className="property-address">
                <span className="address-icon">📍</span>
                <div>
                  <div className="address-text">{bookingData.property}</div>
                  <div className="address-text">{bookingData.suburb}, VIC {bookingData.postcode}</div>
                </div>
              </div>
            </div>

            {/* Work Description */}
            <div className="quote-section">
              <h3 className="section-title">Issue Description</h3>
              <p className="work-description">{bookingData.workDescription}</p>
            </div>

            {/* Services Included */}
            <div className="quote-section">
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

            {/* Totals */}
            <div className="quote-totals">
              <div className="total-row">
                <span>Estimated Duration</span>
                <span className="total-value">{bookingData.estimatedDays} days</span>
              </div>
              <div className="total-row total-amount">
                <span>Total Investment</span>
                <span className="amount-value">${bookingData.quoteAmount.toLocaleString()} INC GST</span>
              </div>
            </div>
          </div>

          <button 
            className="btn-primary btn-large"
            onClick={() => setStep(2)}
          >
            Continue to Schedule →
          </button>
        </div>
      )}

      {/* Step 2: Select Date & Time */}
      {step === 2 && (
        <div className="step-content">
          <h2 className="step-title">Select Your Preferred Date</h2>
          <p className="step-subtitle">This job requires {bookingData.estimatedDays} consecutive business days</p>

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

          {selectedDate && (
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
          )}

          <div className="step-actions">
            <button 
              className="btn-secondary"
              onClick={() => setStep(1)}
            >
              ← Back
            </button>
            <button 
              className="btn-primary"
              onClick={() => setStep(3)}
              disabled={!selectedDate || !selectedTimeSlot}
            >
              Continue to Confirm →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Confirm & Details */}
      {step === 3 && (
        <div className="step-content">
          <h2 className="step-title">Final Details</h2>
          <p className="step-subtitle">Please provide access information and confirm your booking</p>

          {/* Booking Summary */}
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

          {/* Access Instructions */}
          <div className="form-section">
            <label className="form-label">
              Access Instructions <span className="required">*</span>
            </label>
            <textarea
              className="form-textarea"
              placeholder="Please provide details on how our team can access your property (e.g., key location, gate code, pet information, parking instructions)"
              value={accessInstructions}
              onChange={(e) => setAccessInstructions(e.target.value)}
              rows={4}
              required
            />
          </div>

          {/* Special Requests */}
          <div className="form-section">
            <label className="form-label">
              Special Requests <span className="optional">(Optional)</span>
            </label>
            <textarea
              className="form-textarea"
              placeholder="Any special requirements or requests for our technicians?"
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              rows={3}
            />
          </div>

          {/* Terms & Conditions */}
          <div className="terms-section">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={agreeToTerms}
                onChange={(e) => setAgreeToTerms(e.target.checked)}
                required
              />
              <span>
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
              className="btn-secondary"
              onClick={() => setStep(2)}
            >
              ← Back
            </button>
            <button 
              className="btn-primary btn-confirm"
              onClick={handleSubmitBooking}
              disabled={!accessInstructions || !agreeToTerms || submitting}
            >
              {submitting ? 'Processing...' : '✓ Confirm Booking'}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Success */}
      {step === 4 && (
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

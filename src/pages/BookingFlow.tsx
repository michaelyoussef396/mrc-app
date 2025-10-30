import { useState } from 'react';
import Logo from '@/components/Logo';

export const BookingFlow = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isEditMode, setIsEditMode] = useState(false);
  const [clientDetails, setClientDetails] = useState({
    name: 'John Smith',
    email: 'john.smith@email.com',
    phone: '0412 345 678',
    address: '45 High St, Croydon VIC 3136'
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  return (
    <div className="booking-page">
      {/* PROGRESS BAR */}
      <div className="progress-header">
        <div className="progress-container">
          <Logo size="small" />
          <div className="progress-steps">
            {[1, 2, 3, 4].map((step) => (
              <div 
                key={step}
                className={`progress-step ${
                  currentStep === step ? 'active' : ''
                } ${currentStep > step ? 'completed' : ''}`}
              >
                <div className="step-circle">
                  {currentStep > step ? '✓' : step}
                </div>
                <span className="step-label">
                  {step === 1 && 'Confirm Details'}
                  {step === 2 && 'Review Report'}
                  {step === 3 && 'Select Date'}
                  {step === 4 && 'Select Time'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="booking-content">
        {/* STEP 1: CONFIRM DETAILS */}
        {currentStep === 1 && (
          <div className="step-card">
            <h1 className="step-title">Confirm Your Details</h1>
            <p className="step-subtitle">
              Please verify your information before booking
            </p>

            <div className="details-card">
              {!isEditMode ? (
                // VIEW MODE
                <>
                  <div className="detail-row">
                    <div className="detail-icon blue-gradient">👤</div>
                    <div className="detail-content">
                      <span className="detail-label">Full Name</span>
                      <span className="detail-value">{clientDetails.name}</span>
                    </div>
                  </div>

                  <div className="detail-row">
                    <div className="detail-icon purple-gradient">📧</div>
                    <div className="detail-content">
                      <span className="detail-label">Email Address</span>
                      <span className="detail-value">{clientDetails.email}</span>
                    </div>
                  </div>

                  <div className="detail-row">
                    <div className="detail-icon green-gradient">📱</div>
                    <div className="detail-content">
                      <span className="detail-label">Phone Number</span>
                      <span className="detail-value">{clientDetails.phone}</span>
                    </div>
                  </div>

                  <div className="detail-row">
                    <div className="detail-icon orange-gradient">🏠</div>
                    <div className="detail-content">
                      <span className="detail-label">Property Address</span>
                      <span className="detail-value">{clientDetails.address}</span>
                    </div>
                  </div>

                  <div className="confirmation-section">
                    <p className="confirmation-question">
                      Are these details correct?
                    </p>
                    
                    <button 
                      className="btn-confirm-yes"
                      onClick={() => setCurrentStep(2)}
                    >
                      ✓ Yes, Details are Correct
                    </button>
                    
                    <button 
                      className="btn-need-update"
                      onClick={() => setIsEditMode(true)}
                    >
                      ✏️ No, I Need to Update Details
                    </button>
                  </div>
                </>
              ) : (
                // EDIT MODE
                <div className="edit-form">
                  <div className="form-group">
                    <label>Full Name</label>
                    <input
                      type="text"
                      value={clientDetails.name}
                      onChange={(e) => setClientDetails({...clientDetails, name: e.target.value})}
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div className="form-group">
                    <label>Email Address</label>
                    <input
                      type="email"
                      value={clientDetails.email}
                      onChange={(e) => setClientDetails({...clientDetails, email: e.target.value})}
                      placeholder="your@email.com"
                    />
                  </div>

                  <div className="form-group">
                    <label>Phone Number</label>
                    <input
                      type="tel"
                      value={clientDetails.phone}
                      onChange={(e) => setClientDetails({...clientDetails, phone: e.target.value})}
                      placeholder="0400 000 000"
                    />
                  </div>

                  <div className="form-group">
                    <label>Property Address</label>
                    <textarea
                      rows={2}
                      value={clientDetails.address}
                      onChange={(e) => setClientDetails({...clientDetails, address: e.target.value})}
                      placeholder="Enter property address"
                    />
                  </div>

                  <div className="form-actions">
                    <button 
                      className="btn-cancel"
                      onClick={() => setIsEditMode(false)}
                    >
                      Cancel
                    </button>
                    <button 
                      className="btn-save"
                      onClick={() => setIsEditMode(false)}
                    >
                      Save & Continue
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: REVIEW REPORT */}
        {currentStep === 2 && (
          <div className="step-card">
            <h1 className="step-title">Your Inspection Report</h1>
            <p className="step-subtitle">
              Review the details before selecting your booking date
            </p>

            <div className="report-grid">
              <div className="info-card">
                <h3>Report Information</h3>
                <div className="info-row">
                  <span className="label">Report Number</span>
                  <span className="value">MRC-2025-0042</span>
                </div>
                <div className="info-row">
                  <span className="label">Inspector</span>
                  <span className="value">Sarah Martinez</span>
                </div>
                <div className="info-row">
                  <span className="label">Inspection Date</span>
                  <span className="value">14 March 2025</span>
                </div>
              </div>

              <div className="info-card">
                <h3>Client & Property</h3>
                <div className="info-row">
                  <span className="label">Client</span>
                  <span className="value">{clientDetails.name}</span>
                </div>
                <div className="info-row">
                  <span className="label">Phone</span>
                  <span className="value">{clientDetails.phone}</span>
                </div>
                <div className="info-row">
                  <span className="label">Email</span>
                  <span className="value">{clientDetails.email}</span>
                </div>
                <div className="info-row">
                  <span className="label">Address</span>
                  <span className="value">{clientDetails.address}</span>
                </div>
              </div>

              <div className="info-card highlight">
                <h3>Quote Summary</h3>
                <div className="info-row">
                  <span className="label">Job Duration</span>
                  <span className="value">1 day (8 hours)</span>
                </div>
                <div className="info-row">
                  <span className="label">Equipment</span>
                  <span className="value">3-5 days</span>
                </div>
                <div className="info-row total">
                  <span className="label">Total Timeline</span>
                  <span className="value">4 days</span>
                </div>
              </div>
            </div>

            {/* View Full Report Button */}
            <div className="flex justify-center my-8">
              <button
                onClick={() => window.open('/inspection-report/MRC-2025-0042', '_blank')}
                className="bg-white border-2 border-[#121D73] text-[#121D73] font-semibold px-8 py-4 rounded-xl hover:bg-[#121D73] hover:text-white transition-all duration-300 hover:-translate-y-0.5 shadow-md hover:shadow-lg"
              >
                📄 View Full Inspection Report
              </button>
            </div>

            <div className="step-actions">
              <button 
                className="btn-back"
                onClick={() => setCurrentStep(1)}
              >
                ← Back
              </button>
              <button 
                className="btn-continue"
                onClick={() => setCurrentStep(3)}
              >
                Continue to Calendar →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: SELECT DATE */}
        {currentStep === 3 && (
          <div className="step-card">
            <h1 className="step-title">Select Your Date</h1>
            <p className="step-subtitle">
              Choose a convenient date for your remediation work
            </p>

            {/* Interactive Calendar */}
            <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg p-6">
              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-6">
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <span className="text-xl">←</span>
                </button>
                <h3 className="text-xl font-bold text-gray-800">March 2025</h3>
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <span className="text-xl">→</span>
                </button>
              </div>

              {/* Days of Week */}
              <div className="grid grid-cols-7 gap-2 mb-3">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                  <div key={day} className="text-center text-xs font-semibold text-gray-500">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-2">
                {/* Empty cells for days before month starts */}
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={`empty-${i}`} className="h-12 md:h-12"></div>
                ))}
                
                {/* March dates 1-31 */}
                {Array.from({ length: 31 }, (_, i) => i + 1).map((date) => {
                  const isPast = date < 15;
                  const isSelected = selectedDate === `March ${date}, 2025`;
                  
                  return (
                    <button
                      key={date}
                      onClick={() => !isPast && setSelectedDate(`March ${date}, 2025`)}
                      disabled={isPast}
                      className={`
                        h-12 w-full rounded-xl text-sm font-semibold transition-all duration-200
                        ${isPast 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : isSelected
                            ? 'bg-[#121D73] text-white shadow-lg scale-105'
                            : 'bg-white hover:bg-blue-50 hover:border-2 hover:border-[#121D73] text-gray-700'
                        }
                      `}
                    >
                      {date}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Date Banner */}
            {selectedDate && (
              <div className="mt-6 text-center">
                <div className="inline-block bg-green-50 border-2 border-green-500 rounded-xl px-6 py-3">
                  <span className="text-green-700 font-semibold">
                    📅 Selected: {selectedDate}
                  </span>
                </div>
              </div>
            )}

            <div className="step-actions">
              <button 
                className="btn-back"
                onClick={() => setCurrentStep(2)}
              >
                ← Back
              </button>
              <button 
                className="btn-continue"
                onClick={() => setCurrentStep(4)}
                disabled={!selectedDate}
              >
                Continue to Time →
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: SELECT TIME */}
        {currentStep === 4 && (
          <div className="step-card">
            <h1 className="step-title">Select Your Time</h1>
            <p className="step-subtitle">Choose your preferred start time</p>

            {selectedDate && (
              <div className="selected-date-banner">
                📅 Booking for: {selectedDate}
              </div>
            )}

            <div className="time-grid">
              {['7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM'].map((time) => (
                <button
                  key={time}
                  onClick={() => setSelectedTime(time)}
                  className={`time-slot ${selectedTime === time ? 'selected' : ''}`}
                >
                  {selectedTime === time && '✓ '}
                  {time}
                </button>
              ))}
            </div>

            <div className="step-actions">
              <button 
                className="btn-back"
                onClick={() => setCurrentStep(3)}
              >
                ← Back
              </button>
              <button 
                className="btn-confirm"
                disabled={!selectedTime}
              >
                ✓ Confirm Booking
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

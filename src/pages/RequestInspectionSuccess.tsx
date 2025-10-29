import { useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'

const RequestInspectionSuccess = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [submissionData, setSubmissionData] = useState<any>(null)

  useEffect(() => {
    // Get submission data from navigation state
    if (location.state?.submissionData) {
      setSubmissionData(location.state.submissionData)
    } else {
      // If no data, show placeholder data
      setSubmissionData({
        name: 'John Smith',
        email: 'john@email.com',
        phone: '0412 345 678',
        property: '123 Main Street',
        suburb: 'Melbourne',
        state: 'VIC',
        postcode: '3000',
        confirmationNumber: 'INS-' + Math.random().toString(36).substr(2, 9).toUpperCase()
      })
    }
  }, [location, navigate])

  if (!submissionData) {
    return null
  }

  return (
    <div className="success-page">
      
      {/* Header */}
      <header className="success-header">
        <div className="header-container">
          <div className="logo">
            <span className="logo-icon">🏠</span>
            <span className="logo-text">MRC</span>
          </div>
          <a href="tel:1300123456" className="header-phone">
            <span className="phone-icon">📞</span>
            <span className="phone-text">1300 123 456</span>
          </a>
        </div>
      </header>

      {/* Main Success Content */}
      <main className="success-main">
        <div className="success-container">
          
          {/* Success Icon & Title */}
          <div className="success-hero">
            <div className="success-icon-wrapper">
              <div className="success-icon">✓</div>
            </div>
            <h1 className="success-title">Request Received!</h1>
            <p className="success-subtitle">
              Thank you for contacting Mould & Restoration Co. We've received your inspection request.
            </p>
          </div>

          {/* Confirmation Details */}
          <div className="confirmation-card">
            <div className="confirmation-header">
              <h2 className="confirmation-title">Booking Confirmation</h2>
              <div className="confirmation-number">
                <span className="number-label">Reference Number</span>
                <span className="number-value">{submissionData.confirmationNumber}</span>
              </div>
            </div>

            <div className="confirmation-details">
              <div className="detail-section">
                <h3 className="detail-section-title">Contact Information</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-icon">👤</span>
                    <div className="detail-content">
                      <span className="detail-label">Name</span>
                      <span className="detail-value">{submissionData.name}</span>
                    </div>
                  </div>
                  <div className="detail-item">
                    <span className="detail-icon">📧</span>
                    <div className="detail-content">
                      <span className="detail-label">Email</span>
                      <span className="detail-value">{submissionData.email}</span>
                    </div>
                  </div>
                  <div className="detail-item">
                    <span className="detail-icon">📱</span>
                    <div className="detail-content">
                      <span className="detail-label">Phone</span>
                      <span className="detail-value">{submissionData.phone}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h3 className="detail-section-title">Property Address</h3>
                <div className="detail-grid">
                  <div className="detail-item full-width">
                    <span className="detail-icon">📍</span>
                    <div className="detail-content">
                      <span className="detail-label">Address</span>
                      <span className="detail-value">
                        {submissionData.property}, {submissionData.suburb} {submissionData.state} {submissionData.postcode}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* What Happens Next */}
          <div className="next-steps-card">
            <h2 className="next-steps-title">What Happens Next?</h2>
            <div className="steps-timeline">
              <div className="timeline-step">
                <div className="step-number">1</div>
                <div className="step-content">
                  <h3 className="step-title">We Review Your Request</h3>
                  <p className="step-description">
                    Our team will review your inspection request and assess the urgency of your situation.
                  </p>
                  <span className="step-time">Within 2 hours</span>
                </div>
              </div>

              <div className="timeline-step">
                <div className="step-number">2</div>
                <div className="step-content">
                  <h3 className="step-title">We Contact You</h3>
                  <p className="step-description">
                    A team member will call you to confirm details and schedule your free inspection.
                  </p>
                  <span className="step-time">Within 24 hours</span>
                </div>
              </div>

              <div className="timeline-step">
                <div className="step-number">3</div>
                <div className="step-content">
                  <h3 className="step-title">Professional Inspection</h3>
                  <p className="step-description">
                    Our certified technician visits your property for a thorough mould inspection.
                  </p>
                  <span className="step-time">At scheduled time</span>
                </div>
              </div>

              <div className="timeline-step">
                <div className="step-number">4</div>
                <div className="step-content">
                  <h3 className="step-title">Detailed Quote</h3>
                  <p className="step-description">
                    Receive a comprehensive report and transparent quote for any required work.
                  </p>
                  <span className="step-time">Same day as inspection</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="actions-card">
            <h2 className="actions-title">Need Immediate Assistance?</h2>
            <div className="actions-grid">
              <a href="tel:1300123456" className="action-button primary">
                <span className="action-icon">📞</span>
                <div className="action-content">
                  <span className="action-label">Call Us Now</span>
                  <span className="action-value">1300 123 456</span>
                </div>
              </a>

              <a href="mailto:info@mouldrestoration.com.au" className="action-button">
                <span className="action-icon">📧</span>
                <div className="action-content">
                  <span className="action-label">Email Us</span>
                  <span className="action-value">info@mouldrestoration.com.au</span>
                </div>
              </a>
            </div>
          </div>

          {/* Navigation Actions */}
          <div className="navigation-actions">
            <button 
              className="btn-secondary btn-large"
              onClick={() => navigate('/request-inspection')}
            >
              ← Submit Another Request
            </button>
            <button 
              className="btn-text"
              onClick={() => window.print()}
            >
              🖨️ Print Confirmation
            </button>
          </div>

          {/* Email Confirmation Notice */}
          <div className="email-notice">
            <div className="notice-icon">📬</div>
            <div className="notice-content">
              <h3 className="notice-title">Check Your Email</h3>
              <p className="notice-text">
                We've sent a confirmation email to <strong>{submissionData.email}</strong> with your booking details and reference number.
              </p>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="success-footer">
        <div className="footer-container">
          <div className="footer-content">
            <div className="footer-section">
              <h4 className="footer-title">Mould & Restoration Co.</h4>
              <p className="footer-text">Melbourne's trusted mould specialists</p>
              <p className="footer-text">ABN: 12 345 678 901</p>
            </div>
            <div className="footer-section">
              <h4 className="footer-title">Contact</h4>
              <p className="footer-text">Phone: 1300 123 456</p>
              <p className="footer-text">Email: info@mouldrestoration.com.au</p>
            </div>
            <div className="footer-section">
              <h4 className="footer-title">Service Hours</h4>
              <p className="footer-text">Monday - Sunday</p>
              <p className="footer-text">7:00 AM - 7:00 PM</p>
              <p className="footer-text-small">Emergency service available 24/7</p>
            </div>
          </div>
          <div className="footer-bottom">
            <p className="footer-copyright">
              © 2025 Mould & Restoration Co. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

    </div>
  )
}

export default RequestInspectionSuccess

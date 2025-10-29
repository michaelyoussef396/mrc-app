import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const RequestInspection = () => {
  const navigate = useNavigate()
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    property: '',
    suburb: '',
    state: 'VIC',
    postcode: '',
    issueDescription: '',
    urgency: 'medium',
    preferredDate: '',
    preferredTime: '',
    source: 'Website'
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) newErrors.name = 'Name is required'
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid'
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone is required'
    } else if (!/^04\d{8}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Phone must be a valid Australian mobile (04XX XXX XXX)'
    }
    if (!formData.property.trim()) newErrors.property = 'Address is required'
    if (!formData.suburb.trim()) newErrors.suburb = 'Suburb is required'
    if (!formData.postcode.trim()) {
      newErrors.postcode = 'Postcode is required'
    } else if (!/^\d{4}$/.test(formData.postcode)) {
      newErrors.postcode = 'Postcode must be 4 digits'
    }
    if (!formData.issueDescription.trim()) {
      newErrors.issueDescription = 'Please describe the issue'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      // Scroll to first error
      const firstError = document.querySelector('.form-error')
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      return
    }

    setSubmitting(true)

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500))

    // TODO: Save to Supabase
    console.log('Submitting inspection request:', formData)

    setSubmitting(false)
    setSubmitted(true)

    // Scroll to success message
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (submitted) {
    return (
      <div className="request-inspection-page">
        <div className="success-container">
          <div className="success-content">
            <div className="success-icon">✓</div>
            <h1 className="success-title">Request Received!</h1>
            <p className="success-message">
              Thank you for contacting Mould & Restoration Co. We've received your inspection request and will be in touch within 24 hours.
            </p>
            <div className="success-details">
              <div className="detail-row">
                <span className="detail-label">Name:</span>
                <span className="detail-value">{formData.name}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Email:</span>
                <span className="detail-value">{formData.email}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Phone:</span>
                <span className="detail-value">{formData.phone}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Property:</span>
                <span className="detail-value">{formData.property}, {formData.suburb} {formData.state} {formData.postcode}</span>
              </div>
            </div>
            <div className="success-actions">
              <button 
                className="btn-primary btn-large"
                onClick={() => {
                  setSubmitted(false)
                  setFormData({
                    name: '',
                    email: '',
                    phone: '',
                    property: '',
                    suburb: '',
                    state: 'VIC',
                    postcode: '',
                    issueDescription: '',
                    urgency: 'medium',
                    preferredDate: '',
                    preferredTime: '',
                    source: 'Website'
                  })
                }}
              >
                Submit Another Request
              </button>
              <button 
                className="btn-secondary btn-large"
                onClick={() => navigate('/')}
              >
                Return to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="request-inspection-page">
      
      {/* Header */}
      <header className="inspection-header">
        <div className="header-container">
          <div className="logo">
            <span className="logo-icon">🏠</span>
            <span className="logo-text">MRC</span>
          </div>
          <div className="header-contact">
            <a href="tel:1300123456" className="contact-link">
              <span className="contact-icon">📞</span>
              <span className="contact-text">1300 123 456</span>
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-container">
          <div className="hero-content">
            <div className="hero-badge">
              <span className="badge-icon">⚡</span>
              <span className="badge-text">24 Hour Response Time</span>
            </div>
            <h1 className="hero-title">
              Professional Mould Inspection & Restoration
            </h1>
            <p className="hero-subtitle">
              Melbourne's trusted mould specialists. Book your free inspection today and protect your home from harmful mould.
            </p>
            <div className="hero-features">
              <div className="feature-item">
                <span className="feature-icon">✓</span>
                <span className="feature-text">Free Inspection</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">✓</span>
                <span className="feature-text">Licensed & Insured</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">✓</span>
                <span className="feature-text">Same Day Service</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Form Section */}
      <section className="form-section">
        <div className="form-container">
          
          <div className="form-header">
            <h2 className="form-title">Request Your Free Inspection</h2>
            <p className="form-subtitle">Fill out the form below and we'll contact you within 24 hours</p>
          </div>

          <form onSubmit={handleSubmit} className="inspection-form">
            
            {/* Personal Information */}
            <div className="form-section-group">
              <h3 className="section-group-title">Your Information</h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={`form-input ${errors.name ? 'error' : ''}`}
                    placeholder="John Smith"
                  />
                  {errors.name && <span className="form-error">{errors.name}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`form-input ${errors.email ? 'error' : ''}`}
                    placeholder="john@email.com"
                  />
                  {errors.email && <span className="form-error">{errors.email}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className={`form-input ${errors.phone ? 'error' : ''}`}
                    placeholder="04XX XXX XXX"
                  />
                  {errors.phone && <span className="form-error">{errors.phone}</span>}
                </div>
              </div>
            </div>

            {/* Property Information */}
            <div className="form-section-group">
              <h3 className="section-group-title">Property Details</h3>
              
              <div className="form-row">
                <div className="form-group full-width">
                  <label className="form-label">
                    Street Address *
                  </label>
                  <input
                    type="text"
                    name="property"
                    value={formData.property}
                    onChange={handleChange}
                    className={`form-input ${errors.property ? 'error' : ''}`}
                    placeholder="123 Main Street"
                  />
                  {errors.property && <span className="form-error">{errors.property}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">
                    Suburb *
                  </label>
                  <input
                    type="text"
                    name="suburb"
                    value={formData.suburb}
                    onChange={handleChange}
                    className={`form-input ${errors.suburb ? 'error' : ''}`}
                    placeholder="Melbourne"
                  />
                  {errors.suburb && <span className="form-error">{errors.suburb}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">
                    State *
                  </label>
                  <select
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    className="form-select"
                  >
                    <option value="VIC">VIC</option>
                    <option value="NSW">NSW</option>
                    <option value="QLD">QLD</option>
                    <option value="SA">SA</option>
                    <option value="WA">WA</option>
                    <option value="TAS">TAS</option>
                    <option value="NT">NT</option>
                    <option value="ACT">ACT</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Postcode *
                  </label>
                  <input
                    type="text"
                    name="postcode"
                    value={formData.postcode}
                    onChange={handleChange}
                    className={`form-input ${errors.postcode ? 'error' : ''}`}
                    placeholder="3000"
                    maxLength={4}
                  />
                  {errors.postcode && <span className="form-error">{errors.postcode}</span>}
                </div>
              </div>
            </div>

            {/* Issue Information */}
            <div className="form-section-group">
              <h3 className="section-group-title">Tell Us About Your Issue</h3>
              
              <div className="form-row">
                <div className="form-group full-width">
                  <label className="form-label">
                    Issue Description *
                  </label>
                  <textarea
                    name="issueDescription"
                    value={formData.issueDescription}
                    onChange={handleChange}
                    className={`form-textarea ${errors.issueDescription ? 'error' : ''}`}
                    placeholder="Please describe where you've noticed mould, how long it's been present, any water damage, etc."
                    rows={5}
                  />
                  {errors.issueDescription && <span className="form-error">{errors.issueDescription}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">
                    Urgency Level
                  </label>
                  <select
                    name="urgency"
                    value={formData.urgency}
                    onChange={handleChange}
                    className="form-select"
                  >
                    <option value="low">Low - Can wait a few days</option>
                    <option value="medium">Medium - Within a week</option>
                    <option value="high">High - As soon as possible</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Scheduling Preferences */}
            <div className="form-section-group">
              <h3 className="section-group-title">Scheduling Preferences (Optional)</h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">
                    Preferred Date
                  </label>
                  <input
                    type="date"
                    name="preferredDate"
                    value={formData.preferredDate}
                    onChange={handleChange}
                    className="form-input"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Preferred Time
                  </label>
                  <select
                    name="preferredTime"
                    value={formData.preferredTime}
                    onChange={handleChange}
                    className="form-select"
                  >
                    <option value="">Any time</option>
                    <option value="morning">Morning (7am - 12pm)</option>
                    <option value="afternoon">Afternoon (12pm - 5pm)</option>
                    <option value="evening">Evening (5pm - 7pm)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="form-actions">
              <button 
                type="submit" 
                className="btn-submit"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <div className="btn-spinner"></div>
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <span>📋</span>
                    <span>Request Free Inspection</span>
                  </>
                )}
              </button>
              <p className="form-disclaimer">
                By submitting this form, you agree to be contacted by Mould & Restoration Co. regarding your inspection request.
              </p>
            </div>

          </form>

        </div>
      </section>

      {/* Trust Section */}
      <section className="trust-section">
        <div className="trust-container">
          <h3 className="trust-title">Why Choose Us?</h3>
          <div className="trust-grid">
            <div className="trust-card">
              <div className="trust-icon">🏆</div>
              <h4 className="trust-card-title">10+ Years Experience</h4>
              <p className="trust-card-text">Trusted by thousands of Melbourne homeowners</p>
            </div>
            <div className="trust-card">
              <div className="trust-icon">⚡</div>
              <h4 className="trust-card-title">Fast Response</h4>
              <p className="trust-card-text">24-hour response time guaranteed</p>
            </div>
            <div className="trust-card">
              <div className="trust-icon">✅</div>
              <h4 className="trust-card-title">Licensed & Insured</h4>
              <p className="trust-card-text">Fully certified mould remediation specialists</p>
            </div>
            <div className="trust-card">
              <div className="trust-icon">💯</div>
              <h4 className="trust-card-title">100% Satisfaction</h4>
              <p className="trust-card-text">Money-back guarantee on all services</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="inspection-footer">
        <div className="footer-container">
          <div className="footer-content">
            <div className="footer-section">
              <h4 className="footer-title">Mould & Restoration Co.</h4>
              <p className="footer-text">Melbourne's trusted mould specialists</p>
            </div>
            <div className="footer-section">
              <h4 className="footer-title">Contact</h4>
              <p className="footer-text">Phone: 1300 123 456</p>
              <p className="footer-text">Email: info@mouldrestoration.com.au</p>
            </div>
            <div className="footer-section">
              <h4 className="footer-title">Hours</h4>
              <p className="footer-text">Mon-Sun: 7:00 AM - 7:00 PM</p>
              <p className="footer-text">Emergency service available</p>
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

export default RequestInspection

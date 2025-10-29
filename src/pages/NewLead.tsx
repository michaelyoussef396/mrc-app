import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const NewLead = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [formData, setFormData] = useState({
    // Client Information
    name: '',
    email: '',
    phone: '',
    
    // Property Details
    propertyAddress: '',
    suburb: '',
    postcode: '',
    propertyType: 'residential',
    
    // Lead Details
    source: '',
    issueDescription: '',
    urgency: 'medium',
    
    // Assignment
    assignedTo: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Auto-format phone number
    if (name === 'phone') {
      const formatted = formatPhoneNumber(value);
      setFormData(prev => ({ ...prev, [name]: formatted }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // Format as Australian mobile: 0412 345 678
    if (digits.length <= 4) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 10)}`;
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    // Client Information
    if (!formData.name.trim()) {
      newErrors.name = 'Client name is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (formData.phone.replace(/\D/g, '').length !== 10) {
      newErrors.phone = 'Please enter a valid 10-digit Australian phone number';
    }
    
    // Property Details
    if (!formData.propertyAddress.trim()) {
      newErrors.propertyAddress = 'Property address is required';
    }
    
    if (!formData.suburb.trim()) {
      newErrors.suburb = 'Suburb is required';
    }
    
    if (!formData.postcode.trim()) {
      newErrors.postcode = 'Postcode is required';
    } else if (!/^\d{4}$/.test(formData.postcode)) {
      newErrors.postcode = 'Please enter a valid 4-digit postcode';
    }
    
    // Lead Details
    if (!formData.source) {
      newErrors.source = 'Please select a lead source';
    }
    
    if (!formData.issueDescription.trim()) {
      newErrors.issueDescription = 'Please describe the issue';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      // Scroll to first error
      const firstError = document.querySelector('.form-error');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    
    setLoading(true);
    
    try {
      // TODO: Save to Supabase
      // const { data, error } = await supabase
      //   .from('leads')
      //   .insert([{
      //     ...formData,
      //     status: 'new',
      //     date_created: new Date().toISOString()
      //   }])
      
      // For now, simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Success! Navigate to leads page or show success
      navigate('/leads', { 
        state: { 
          message: 'Lead created successfully!',
          leadName: formData.name 
        } 
      });
    } catch (error) {
      console.error('Error creating lead:', error);
      alert('Failed to create lead. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="new-lead-page">
      {/* Subtle Background */}
      <div className="new-lead-background">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
      </div>

      {/* Top Navigation */}
      <nav className="new-lead-nav">
        <div className="nav-container">
          <button 
            className="back-btn" 
            onClick={() => navigate('/dashboard')}
          >
            <span className="back-arrow">←</span>
            <span>Back to Dashboard</span>
          </button>
          
          <div className="nav-title">
            <span className="nav-icon">➕</span>
            <span>Create New Lead</span>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="new-lead-main">
        <div className="new-lead-container">
          {/* Header */}
          <div className="form-header">
            <div className="form-icon">
              <span>📋</span>
            </div>
            <h1 className="form-title">New Lead Information</h1>
            <p className="form-subtitle">
              Fill out the details below to create a new lead in the system
            </p>
          </div>

          {/* Form */}
          <form className="lead-form" onSubmit={handleSubmit}>
            {/* Client Information Section */}
            <div className="form-section">
              <div className="section-header">
                <div className="section-number">1</div>
                <div className="section-info">
                  <h2 className="section-title">Client Information</h2>
                  <p className="section-subtitle">Basic contact details</p>
                </div>
              </div>

              <div className="form-grid">
                {/* Full Name */}
                <div className="form-group full-width">
                  <label className="form-label">
                    Full Name <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="John Smith"
                    className={`form-input ${errors.name ? 'error' : ''}`}
                  />
                  {errors.name && (
                    <p className="form-error">{errors.name}</p>
                  )}
                </div>

                {/* Email */}
                <div className="form-group">
                  <label className="form-label">
                    Email Address <span className="required">*</span>
                  </label>
                  <div className="input-with-icon">
                    <span className="input-icon">📧</span>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="john.smith@email.com"
                      className={`form-input ${errors.email ? 'error' : ''}`}
                    />
                  </div>
                  {errors.email && (
                    <p className="form-error">{errors.email}</p>
                  )}
                </div>

                {/* Phone */}
                <div className="form-group">
                  <label className="form-label">
                    Phone Number <span className="required">*</span>
                  </label>
                  <div className="input-with-icon">
                    <span className="input-icon">📱</span>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="0412 345 678"
                      className={`form-input ${errors.phone ? 'error' : ''}`}
                      maxLength={12}
                    />
                  </div>
                  {errors.phone && (
                    <p className="form-error">{errors.phone}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Property Details Section */}
            <div className="form-section">
              <div className="section-header">
                <div className="section-number">2</div>
                <div className="section-info">
                  <h2 className="section-title">Property Details</h2>
                  <p className="section-subtitle">Location and property information</p>
                </div>
              </div>

              <div className="form-grid">
                {/* Property Address */}
                <div className="form-group full-width">
                  <label className="form-label">
                    Property Address <span className="required">*</span>
                  </label>
                  <div className="input-with-icon">
                    <span className="input-icon">📍</span>
                    <input
                      type="text"
                      name="propertyAddress"
                      value={formData.propertyAddress}
                      onChange={handleChange}
                      placeholder="123 Smith Street"
                      className={`form-input ${errors.propertyAddress ? 'error' : ''}`}
                    />
                  </div>
                  {errors.propertyAddress && (
                    <p className="form-error">{errors.propertyAddress}</p>
                  )}
                </div>

                {/* Suburb */}
                <div className="form-group">
                  <label className="form-label">
                    Suburb <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    name="suburb"
                    value={formData.suburb}
                    onChange={handleChange}
                    placeholder="Melbourne"
                    className={`form-input ${errors.suburb ? 'error' : ''}`}
                  />
                  {errors.suburb && (
                    <p className="form-error">{errors.suburb}</p>
                  )}
                </div>

                {/* Postcode */}
                <div className="form-group">
                  <label className="form-label">
                    Postcode <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    name="postcode"
                    value={formData.postcode}
                    onChange={handleChange}
                    placeholder="3000"
                    className={`form-input ${errors.postcode ? 'error' : ''}`}
                    maxLength={4}
                  />
                  {errors.postcode && (
                    <p className="form-error">{errors.postcode}</p>
                  )}
                </div>

                {/* Property Type */}
                <div className="form-group full-width">
                  <label className="form-label">Property Type</label>
                  <div className="radio-group">
                    <label className="radio-option">
                      <input
                        type="radio"
                        name="propertyType"
                        value="residential"
                        checked={formData.propertyType === 'residential'}
                        onChange={handleChange}
                      />
                      <span className="radio-custom"></span>
                      <span className="radio-label">
                        <span className="radio-icon">🏠</span>
                        <span>Residential</span>
                      </span>
                    </label>

                    <label className="radio-option">
                      <input
                        type="radio"
                        name="propertyType"
                        value="commercial"
                        checked={formData.propertyType === 'commercial'}
                        onChange={handleChange}
                      />
                      <span className="radio-custom"></span>
                      <span className="radio-label">
                        <span className="radio-icon">🏢</span>
                        <span>Commercial</span>
                      </span>
                    </label>

                    <label className="radio-option">
                      <input
                        type="radio"
                        name="propertyType"
                        value="industrial"
                        checked={formData.propertyType === 'industrial'}
                        onChange={handleChange}
                      />
                      <span className="radio-custom"></span>
                      <span className="radio-label">
                        <span className="radio-icon">🏭</span>
                        <span>Industrial</span>
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Lead Details Section */}
            <div className="form-section">
              <div className="section-header">
                <div className="section-number">3</div>
                <div className="section-info">
                  <h2 className="section-title">Lead Details</h2>
                  <p className="section-subtitle">Source and issue information</p>
                </div>
              </div>

              <div className="form-grid">
                {/* Lead Source */}
                <div className="form-group">
                  <label className="form-label">
                    Lead Source <span className="required">*</span>
                  </label>
                  <select
                    name="source"
                    value={formData.source}
                    onChange={handleChange}
                    className={`form-select ${errors.source ? 'error' : ''}`}
                  >
                    <option value="">Select source...</option>
                    <option value="Google Ads">🔴 Google Ads</option>
                    <option value="Facebook">🔵 Facebook</option>
                    <option value="Instagram">🟣 Instagram</option>
                    <option value="Referral">🟢 Referral</option>
                    <option value="Website">🟡 Website</option>
                    <option value="Direct">⚪ Direct Call</option>
                    <option value="Email">📧 Email</option>
                  </select>
                  {errors.source && (
                    <p className="form-error">{errors.source}</p>
                  )}
                </div>

                {/* Urgency */}
                <div className="form-group">
                  <label className="form-label">Urgency Level</label>
                  <select
                    name="urgency"
                    value={formData.urgency}
                    onChange={handleChange}
                    className="form-select"
                  >
                    <option value="low">🟢 Low</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="high">🔴 High</option>
                  </select>
                </div>

                {/* Issue Description */}
                <div className="form-group full-width">
                  <label className="form-label">
                    Issue Description <span className="required">*</span>
                  </label>
                  <textarea
                    name="issueDescription"
                    value={formData.issueDescription}
                    onChange={handleChange}
                    placeholder="Describe the mould issue, affected areas, and any other relevant details..."
                    className={`form-textarea ${errors.issueDescription ? 'error' : ''}`}
                    rows={5}
                  />
                  {errors.issueDescription && (
                    <p className="form-error">{errors.issueDescription}</p>
                  )}
                </div>

                {/* Assigned To */}
                <div className="form-group full-width">
                  <label className="form-label">Assign to Technician</label>
                  <select
                    name="assignedTo"
                    value={formData.assignedTo}
                    onChange={handleChange}
                    className="form-select"
                  >
                    <option value="">Unassigned</option>
                    <option value="tech1">👤 Technician 1</option>
                    <option value="tech2">👤 Technician 2</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="form-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => navigate('/dashboard')}
                disabled={loading}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="btn-primary btn-submit"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="loading-spinner"></span>
                    <span>Creating Lead...</span>
                  </>
                ) : (
                  <>
                    <span>✓</span>
                    <span>Create Lead</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default NewLead;

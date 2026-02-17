import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import logoMRC from '@/assets/logoMRC.png';
import { createPublicLead, URGENCY_OPTIONS, type BookingUrgency } from '@/lib/api/public-leads';

// Validation schema
const inspectionSchema = z.object({
  name: z.string().trim()
    .min(1, 'Please enter your full name')
    .refine((val) => val.split(' ').length >= 2, 'Please enter your full name (first and last)'),
  phone: z.string().trim()
    .min(1, 'Please enter a valid Australian phone number')
    .regex(/^(04\d{8}|1[38]00\d{6}|\(0[2-9]\) \d{4} \d{4})$/, 'Please enter a valid Australian phone number (e.g. 04XX XXX XXX)'),
  email: z.string().trim()
    .min(1, 'Please enter a valid email address')
    .email('Please enter a valid email address'),
  streetAddress: z.string().trim().min(1, 'Please enter your street address'),
  suburb: z.string().trim().min(1, 'Please enter your suburb'),
  postcode: z.string().trim()
    .regex(/^3\d{3}$/, 'Please enter a valid Melbourne postcode (3XXX)'),
  urgency: z.enum(['ASAP', 'within_week', 'couple_weeks', 'within_month', 'couple_months'], {
    errorMap: () => ({ message: 'Please select when you need the inspection' })
  }),
  description: z.string().trim()
    .min(20, 'Please describe the mould issue (minimum 20 characters)')
    .max(1000, 'Description is too long (maximum 1000 characters)'),
});

type InspectionFormData = z.infer<typeof inspectionSchema>;

const RequestInspection = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    streetAddress: '',
    suburb: '',
    postcode: '',
    urgency: '' as BookingUrgency | '',
    description: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Format phone number as user types
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
    setFormData(prev => ({ ...prev, phone: value }));
    if (errors.phone) setErrors(prev => ({ ...prev, phone: '' }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    if (submitError) setSubmitError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSubmitError(null);

    try {
      // Validate form data
      const validatedData = inspectionSchema.parse(formData);

      setSubmitting(true);

      // Create lead in database
      const lead = await createPublicLead({
        full_name: validatedData.name,
        email: validatedData.email,
        phone: validatedData.phone,
        property_address_street: validatedData.streetAddress,
        property_address_suburb: validatedData.suburb,
        property_address_postcode: validatedData.postcode,
        issue_description: validatedData.description,
        urgency: validatedData.urgency,
      });

      // TODO: Send confirmation email here
      // await sendNewLeadEmail({ ... });

      // Navigate to success page with query params
      const firstName = validatedData.name.split(' ')[0];
      navigate(`/request-inspection/success?submitted=true&name=${encodeURIComponent(firstName)}&ref=${encodeURIComponent(lead.lead_number || lead.lead_id.substring(0, 8))}`);

    } catch (error) {
      if (error instanceof z.ZodError) {
        // Validation errors
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach(err => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);

        // Scroll to first error
        const firstErrorField = Object.keys(fieldErrors)[0];
        const element = document.getElementsByName(firstErrorField)[0];
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        // Database or API errors
        console.error('❌ Form submission error:', error);
        const errorMessage = error instanceof Error
          ? error.message
          : 'Failed to submit your request. Please try again or call us at 1800 954 117.';
        setSubmitError(errorMessage);

        // Scroll to top to show error message
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen"
      style={{
        background: 'linear-gradient(to bottom, #EFF6FF 0%, #DBEAFE 50%, #FFFFFF 100%)'
      }}
    >
      {/* Header with Logo */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="text-center mb-8">
          <img
            src={logoMRC}
            alt="Mould & Restoration Co."
            className="h-16 md:h-20 mx-auto mb-6"
          />
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Request Your Free Mould Inspection
          </h1>
          <p className="text-lg text-gray-600">
            Professional assessment with comprehensive report
          </p>
        </div>

        {/* Global Error Message */}
        {submitError && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded mb-6">
            <div className="flex items-start">
              <svg className="h-5 w-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-medium text-red-800">{submitError}</p>
                <p className="text-xs text-red-600 mt-1">
                  If the problem persists, please call us at{' '}
                  <a href="tel:1800954117" className="underline font-semibold">1800 954 117</a>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Form Container */}
        <div
          className="bg-white rounded-xl p-6 md:p-10 mb-8"
          style={{
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-8">

            {/* Section 1: Your Details */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-blue-100">
                Your Details
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Full Name <span className="text-blue-600">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="John Smith"
                    className={`w-full h-12 px-4 border-2 rounded-lg text-base transition-all ${
                      errors.name ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                    }`}
                  />
                  {errors.name && <p className="text-red-500 text-sm mt-1 flex items-center"><span className="mr-1">⚠️</span>{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Phone Number <span className="text-blue-600">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    placeholder="04XX XXX XXX"
                    className={`w-full h-12 px-4 border-2 rounded-lg text-base transition-all ${
                      errors.phone ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                    }`}
                  />
                  {errors.phone && <p className="text-red-500 text-sm mt-1 flex items-center"><span className="mr-1">⚠️</span>{errors.phone}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Address <span className="text-blue-600">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="john@example.com"
                    className={`w-full h-12 px-4 border-2 rounded-lg text-base transition-all ${
                      errors.email ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                    }`}
                  />
                  {errors.email && <p className="text-red-500 text-sm mt-1 flex items-center"><span className="mr-1">⚠️</span>{errors.email}</p>}
                </div>
              </div>
            </div>

            {/* Section 2: Property Location */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-blue-100">
                Property Location
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Street Address <span className="text-blue-600">*</span>
                  </label>
                  <input
                    type="text"
                    name="streetAddress"
                    value={formData.streetAddress}
                    onChange={handleChange}
                    placeholder="47 Brighton Road"
                    className={`w-full h-12 px-4 border-2 rounded-lg text-base transition-all ${
                      errors.streetAddress ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                    }`}
                  />
                  {errors.streetAddress && <p className="text-red-500 text-sm mt-1 flex items-center"><span className="mr-1">⚠️</span>{errors.streetAddress}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Suburb <span className="text-blue-600">*</span>
                    </label>
                    <input
                      type="text"
                      name="suburb"
                      value={formData.suburb}
                      onChange={handleChange}
                      placeholder="Elwood"
                      className={`w-full h-12 px-4 border-2 rounded-lg text-base transition-all ${
                        errors.suburb ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                      }`}
                    />
                    {errors.suburb && <p className="text-red-500 text-sm mt-1 flex items-center"><span className="mr-1">⚠️</span>{errors.suburb}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Postcode <span className="text-blue-600">*</span>
                    </label>
                    <input
                      type="text"
                      name="postcode"
                      value={formData.postcode}
                      onChange={handleChange}
                      placeholder="3184"
                      maxLength={4}
                      className={`w-full h-12 px-4 border-2 rounded-lg text-base transition-all ${
                        errors.postcode ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                      }`}
                    />
                    {errors.postcode && <p className="text-red-500 text-sm mt-1 flex items-center"><span className="mr-1">⚠️</span>{errors.postcode}</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Inspection Details */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-blue-100">
                Inspection Details
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    When do you need the inspection? <span className="text-blue-600">*</span>
                  </label>
                  <select
                    name="urgency"
                    value={formData.urgency}
                    onChange={handleChange}
                    className={`w-full h-12 px-4 border-2 rounded-lg text-base transition-all ${
                      errors.urgency ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                    }`}
                  >
                    <option value="">Select urgency...</option>
                    {URGENCY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors.urgency && <p className="text-red-500 text-sm mt-1 flex items-center"><span className="mr-1">⚠️</span>{errors.urgency}</p>}
                  <p className="text-xs text-gray-500 mt-1">
                    💡 We'll contact you to schedule a convenient time based on your urgency
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description of the Issue <span className="text-blue-600">*</span>
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={5}
                    placeholder="Please describe the mould problem you're experiencing. Example: Mould growth visible on bathroom ceiling and walls. Recent leak from upstairs unit may be the cause."
                    className={`w-full px-4 py-3 border-2 rounded-lg text-base transition-all ${
                      errors.description ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                    }`}
                  />
                  {errors.description && <p className="text-red-500 text-sm mt-1 flex items-center"><span className="mr-1">⚠️</span>{errors.description}</p>}
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.description.length}/1000 characters {formData.description.length < 20 && `(minimum 20 required)`}
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              style={{ minHeight: '48px' }}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold text-lg rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {submitting ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting Request...
                </span>
              ) : (
                'Request Free Inspection'
              )}
            </button>

            <p className="text-center text-sm text-gray-500">
              By submitting this form, you consent to be contacted by Mould & Restoration Co. regarding your inspection request.
            </p>
          </form>
        </div>

        {/* What's Included Section */}
        <div className="bg-white rounded-xl p-6 md:p-8 mb-8" style={{ boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)' }}>
          <h3 className="text-xl font-bold text-gray-900 mb-4">What's Included</h3>
          <div className="space-y-3">
            {[
              { text: 'Free comprehensive inspection', sub: 'No obligation, no hidden fees' },
              { text: 'Detailed report', sub: 'Complete findings and moisture readings' },
              { text: 'Before photos', sub: 'Full documentation of affected areas' },
              { text: 'Transparent pricing', sub: 'Clear treatment options with exact costs' },
              { text: 'Prevention advice', sub: 'Expert recommendations to stop recurrence' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-blue-600 font-bold text-lg">✓</span>
                <div>
                  <p className="font-semibold text-gray-900">{item.text}</p>
                  <p className="text-sm text-gray-600">{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Why Choose MRC */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { icon: '🏆', title: '5+ Years Experience', desc: '100+ Melbourne properties restored' },
            { icon: '⭐', title: '5.0/5 Star Rating', desc: 'Trusted by homeowners and businesses' },
            { icon: '🎓', title: 'IICRC Certified', desc: 'Industry-leading standards and protocols' },
            { icon: '📅', title: '7 Days a Week', desc: 'Monday to Sunday, 7am-7pm service' },
          ].map((item, i) => (
            <div key={i} className="bg-white rounded-xl p-6 text-center" style={{ boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)' }}>
              <div className="text-4xl mb-3">{item.icon}</div>
              <h4 className="font-bold text-gray-900 mb-1">{item.title}</h4>
              <p className="text-sm text-gray-600">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Contact Banner */}
        <div className="bg-blue-500 text-white rounded-xl p-6 text-center mb-8 shadow-lg">
          <p className="text-lg font-semibold">
            Questions? Call us now: <a href="tel:1800954117" className="underline hover:text-blue-100 transition">📞 1800 954 117</a>
          </p>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-600 text-sm">
          <p className="font-semibold text-gray-900 mb-1">Mould & Restoration Co.</p>
          <p>Servicing Melbourne Metro</p>
          <p>ABN 47 683 089 652</p>
        </div>
      </div>
    </div>
  );
};

export default RequestInspection;

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { z } from 'zod';

// Validation schema
const inspectionSchema = z.object({
  name: z.string().trim()
    .min(1, 'Please enter your full name')
    .refine((val) => val.split(' ').length >= 2, 'Please enter your full name (first and last)'),
  phone: z.string().trim()
    .min(1, 'Please enter a valid Australian phone number')
    .regex(/^(04\d{8}|1[38]00\d{6})$/, 'Please enter a valid Australian phone number'),
  email: z.string().trim()
    .min(1, 'Please enter a valid email address')
    .email('Please enter a valid email address'),
  streetAddress: z.string().trim().min(1, 'Please enter your street address'),
  suburb: z.string().trim().min(1, 'Please select a suburb'),
  dates: z.array(z.date()).min(1, 'Please select at least one preferred date'),
  description: z.string().trim()
    .min(20, 'Please describe the mould issue (minimum 20 characters)')
    .max(1000),
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
    dates: [null, null, null, null, null] as (Date | null)[],
    description: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Format phone number as user types
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
    setFormData(prev => ({ ...prev, phone: value }));
    if (errors.phone) setErrors(prev => ({ ...prev, phone: '' }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleDateChange = (date: Date | null, index: number) => {
    const newDates = [...formData.dates];
    newDates[index] = date;
    setFormData(prev => ({ ...prev, dates: newDates }));
    if (errors.dates) setErrors(prev => ({ ...prev, dates: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      // Filter out null dates
      const selectedDates = formData.dates.filter((date): date is Date => date !== null);
      
      const validatedData = inspectionSchema.parse({
        ...formData,
        dates: selectedDates,
      });

      setSubmitting(true);
      
      // Generate reference number
      const refNumber = `MRC${Date.now()}`;
      
      // Navigate to success page with data
      navigate('/request-inspection/success', {
        state: {
          name: validatedData.name,
          address: `${validatedData.streetAddress}, ${validatedData.suburb}`,
          dates: validatedData.dates,
          description: validatedData.description,
          refNumber,
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach(err => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
      }
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
            src="/src/assets/logoMRC.png" 
            alt="MRC Logo" 
            className="h-16 mx-auto mb-6"
          />
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Request Your Free Mould Inspection
          </h1>
          <p className="text-lg text-gray-600">
            Professional assessment with comprehensive report
          </p>
        </div>

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
                      errors.name ? 'border-red-500' : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                    }`}
                  />
                  {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
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
                      errors.phone ? 'border-red-500' : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                    }`}
                  />
                  {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
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
                      errors.email ? 'border-red-500' : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                    }`}
                  />
                  {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
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
                    Street Number and Address <span className="text-blue-600">*</span>
                  </label>
                  <input
                    type="text"
                    name="streetAddress"
                    value={formData.streetAddress}
                    onChange={handleChange}
                    placeholder="47 Brighton Road"
                    className={`w-full h-12 px-4 border-2 rounded-lg text-base transition-all ${
                      errors.streetAddress ? 'border-red-500' : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                    }`}
                  />
                  {errors.streetAddress && <p className="text-red-500 text-sm mt-1">{errors.streetAddress}</p>}
                </div>

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
                      errors.suburb ? 'border-red-500' : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                    }`}
                  />
                  {errors.suburb && <p className="text-red-500 text-sm mt-1">{errors.suburb}</p>}
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
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Select up to 5 preferred dates for your inspection <span className="text-blue-600">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {formData.dates.map((date, index) => (
                      <DatePicker
                        key={index}
                        selected={date}
                        onChange={(date: Date | null) => handleDateChange(date, index)}
                        minDate={new Date()}
                        placeholderText={`Date ${index + 1}${index === 0 ? ' (required)' : ''}`}
                        dateFormat="dd/MM/yyyy"
                        className="w-full h-12 px-4 border-2 border-gray-200 rounded-lg text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      />
                    ))}
                  </div>
                  {errors.dates && <p className="text-red-500 text-sm mt-1">{errors.dates}</p>}
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
                      errors.description ? 'border-red-500' : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                    }`}
                  />
                  {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              style={{ minHeight: '48px' }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-lg rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : 'Request Free Inspection'}
            </button>
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
        <div className="bg-blue-600 text-white rounded-xl p-6 text-center mb-8">
          <p className="text-lg font-semibold">
            Questions? Call us now: <a href="tel:1800954117" className="underline">📞 1800 954 117</a>
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

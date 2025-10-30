import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PublicNav from '@/components/PublicNav';
import { z } from 'zod';

const inspectionSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().trim().email('Invalid email address').max(255),
  phone: z.string().trim().min(1, 'Phone is required'),
  address: z.string().trim().min(1, 'Address is required').max(200),
  propertyType: z.string().min(1, 'Property type is required'),
  preferredDate: z.string().optional(),
  description: z.string().trim().max(1000).optional(),
  urgency: z.string().min(1, 'Please select urgency level'),
});

type InspectionFormData = z.infer<typeof inspectionSchema>;

const RequestInspection = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<InspectionFormData>({
    name: '',
    email: '',
    phone: '',
    address: '',
    propertyType: '',
    preferredDate: '',
    description: '',
    urgency: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof InspectionFormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof InspectionFormData]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      inspectionSchema.parse(formData);
      setSubmitting(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // TODO: Save to Supabase
      console.log('Form submitted:', formData);
      
      navigate('/request-inspection/success');
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Partial<Record<keyof InspectionFormData, string>> = {};
        error.errors.forEach(err => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as keyof InspectionFormData] = err.message;
          }
        });
        setErrors(fieldErrors);
      }
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNav />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 to-purple-600 text-white py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h1 className="text-3xl md:text-5xl font-bold mb-4">
            Get Your Free Mould Inspection
          </h1>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Expert assessment • Same-day response • No obligation quote
          </p>
          
          {/* Trust indicators */}
          <div className="flex flex-wrap justify-center gap-4 text-sm font-medium">
            <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
              ✓ 500+ Homes Inspected
            </div>
            <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
              ✓ Licensed & Insured
            </div>
            <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
              ✓ 24/7 Emergency Service
            </div>
          </div>
        </div>
      </section>

      {/* Form Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-[2fr_1fr] gap-8">
            
            {/* Form Card */}
            <div className="bg-white rounded-2xl shadow-xl p-6 md:p-12">
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Request Your Inspection</h2>
                <p className="text-gray-600">
                  Fill out the form below and we'll contact you within 2 hours during business hours
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                
                {/* Personal Information Section */}
                <div>
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b-2">
                    <span className="text-2xl">👤</span>
                    <h3 className="text-xl font-bold">Your Information</h3>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className={`w-full h-12 px-4 border-2 rounded-xl text-base transition-all ${
                          errors.name ? 'border-red-500' : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500'
                        }`}
                        placeholder="John Smith"
                      />
                      {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Email Address <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          className={`w-full h-12 px-4 border-2 rounded-xl text-base transition-all ${
                            errors.email ? 'border-red-500' : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500'
                          }`}
                          placeholder="john@email.com"
                        />
                        {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Phone Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          className={`w-full h-12 px-4 border-2 rounded-xl text-base transition-all ${
                            errors.phone ? 'border-red-500' : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500'
                          }`}
                          placeholder="0400 000 000"
                        />
                        {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Property Information Section */}
                <div>
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b-2">
                    <span className="text-2xl">🏠</span>
                    <h3 className="text-xl font-bold">Property Details</h3>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Property Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        className={`w-full h-12 px-4 border-2 rounded-xl text-base transition-all ${
                          errors.address ? 'border-red-500' : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500'
                        }`}
                        placeholder="45 High St, Croydon VIC 3136"
                      />
                      {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address}</p>}
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Property Type <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="propertyType"
                          value={formData.propertyType}
                          onChange={handleChange}
                          className={`w-full h-12 px-4 border-2 rounded-xl text-base transition-all ${
                            errors.propertyType ? 'border-red-500' : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500'
                          }`}
                        >
                          <option value="">Select type...</option>
                          <option value="house">House</option>
                          <option value="apartment">Apartment</option>
                          <option value="townhouse">Townhouse</option>
                          <option value="commercial">Commercial</option>
                        </select>
                        {errors.propertyType && <p className="text-red-500 text-sm mt-1">{errors.propertyType}</p>}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Preferred Inspection Date
                        </label>
                        <input
                          type="date"
                          name="preferredDate"
                          value={formData.preferredDate}
                          onChange={handleChange}
                          className="w-full h-12 px-4 border-2 border-gray-200 rounded-xl text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Issue Description Section */}
                <div>
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b-2">
                    <span className="text-2xl">📝</span>
                    <h3 className="text-xl font-bold">Describe the Issue</h3>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Tell us about your mould concerns
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows={4}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition-all"
                      placeholder="Describe the location, size, and any visible mould growth..."
                    />
                  </div>
                </div>

                {/* Urgency Level */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-4">
                    Urgency Level <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { value: 'low', icon: '🟢', label: 'Low', desc: 'Can wait a week' },
                      { value: 'medium', icon: '🟡', label: 'Medium', desc: 'Within 2-3 days' },
                      { value: 'high', icon: '🔴', label: 'Urgent', desc: 'ASAP / Emergency' }
                    ].map((option) => (
                      <label
                        key={option.value}
                        className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${
                          formData.urgency === option.value
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-500'
                        }`}
                      >
                        <input
                          type="radio"
                          name="urgency"
                          value={option.value}
                          checked={formData.urgency === option.value}
                          onChange={handleChange}
                          className="sr-only"
                        />
                        <div className="text-center">
                          <span className="text-3xl block mb-2">{option.icon}</span>
                          <span className="font-bold block mb-1">{option.label}</span>
                          <span className="text-sm text-gray-600">{option.desc}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                  {errors.urgency && <p className="text-red-500 text-sm mt-1">{errors.urgency}</p>}
                </div>

                {/* Submit Button */}
                <div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-14 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-lg rounded-xl hover:scale-105 transform transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <span>Request Free Inspection</span>
                        <span>→</span>
                      </>
                    )}
                  </button>
                  
                  <p className="text-center text-sm text-gray-500 mt-4">
                    🔒 Your information is secure and will never be shared
                  </p>
                </div>

              </form>
            </div>

            {/* Side Benefits Card */}
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-2xl p-8 sticky top-24 h-fit">
              <h3 className="text-2xl font-bold mb-6">What Happens Next?</h3>
              
              <div className="space-y-6">
                {[
                  { num: 1, title: 'We Review Your Request', desc: 'Our team reviews your submission within 2 hours' },
                  { num: 2, title: 'Schedule Inspection', desc: "We'll call to schedule a convenient time" },
                  { num: 3, title: 'Expert Assessment', desc: 'Licensed inspector visits your property' },
                  { num: 4, title: 'Detailed Report', desc: 'Receive comprehensive findings and quote' }
                ].map((step) => (
                  <div key={step.num} className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white text-blue-600 font-bold flex items-center justify-center">
                      {step.num}
                    </div>
                    <div>
                      <h4 className="font-bold mb-1">{step.title}</h4>
                      <p className="text-sm text-blue-100">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
};

export default RequestInspection;

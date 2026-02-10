/**
 * Help & Support Page
 * Contact information for developer support
 */

import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Mail, Headphones, MessageCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { MobileBottomNav } from '@/components/dashboard/MobileBottomNav';
import TechnicianBottomNav from '@/components/technician/TechnicianBottomNav';

// Developer contact details (HARDCODED)
const DEVELOPER_PHONE = '0433880403';
const DEVELOPER_PHONE_DISPLAY = '0433 880 403';
const DEVELOPER_EMAIL = 'michaelyoussef396@gmail.com';

export default function HelpSupport() {
  const navigate = useNavigate();
  const { currentRole } = useAuth();
  const isTechnician = currentRole === 'technician';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <button
          className="w-12 h-12 rounded-xl bg-gray-100 border-0 text-gray-700 flex items-center justify-center cursor-pointer transition-all hover:bg-gray-200 hover:text-gray-900"
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          <ArrowLeft size={22} strokeWidth={2} />
        </button>
        <h1 className="text-xl font-bold text-gray-900 m-0">Help & Support</h1>
        <div className="w-12"></div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-5 py-8">
        {/* Main Support Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          {/* Icon */}
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
            <Headphones size={36} className="text-blue-600" />
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Need Help?</h2>

          {/* Description */}
          <p className="text-gray-600 mb-8">
            Having trouble or need assistance? Contact the developer directly and we'll help you out.
          </p>

          {/* Contact Buttons */}
          <div className="space-y-3">
            {/* Call Button */}
            <a
              href={`tel:${DEVELOPER_PHONE}`}
              className="flex items-center justify-center gap-3 w-full h-14 px-6 rounded-xl bg-blue-600 text-white text-base font-semibold hover:bg-blue-700 transition-colors shadow-md"
            >
              <Phone size={20} strokeWidth={2} />
              Call {DEVELOPER_PHONE_DISPLAY}
            </a>

            {/* Email Button */}
            <a
              href={`mailto:${DEVELOPER_EMAIL}?subject=MRC App Support Request`}
              className="flex items-center justify-center gap-3 w-full h-14 px-6 rounded-xl border-2 border-gray-200 bg-white text-gray-700 text-base font-semibold hover:bg-gray-50 hover:border-gray-300 transition-colors"
            >
              <Mail size={20} strokeWidth={2} />
              Send Email
            </a>
          </div>

          {/* Response Time Note */}
          <p className="text-sm text-gray-500 mt-6">
            Usually responds within 24 hours
          </p>
        </div>

        {/* Additional Info Card */}
        <div className="bg-white rounded-2xl shadow-md p-6 mt-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MessageCircle size={18} className="text-blue-600" />
            Quick Tips
          </h3>
          <ul className="space-y-3 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">•</span>
              <span>For urgent issues, calling is the fastest way to get help</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">•</span>
              <span>Include screenshots when reporting bugs via email</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">•</span>
              <span>Describe what you were doing when the issue occurred</span>
            </li>
          </ul>
        </div>

        {/* Footer */}
        <div className="text-center py-8">
          <p className="text-sm text-gray-500">
            MRC Lead Management System
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Built with care in Melbourne
          </p>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      {isTechnician ? <TechnicianBottomNav /> : <MobileBottomNav />}
    </div>
  );
}

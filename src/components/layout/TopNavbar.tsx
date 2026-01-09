import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Home,
  ClipboardList,
  Calendar as CalendarIcon,
  BarChart,
  User,
  Settings as SettingsIcon,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import Logo from '@/components/Logo';
import { NotificationBell } from '@/components/layout/NotificationBell';

/**
 * TopNavbar Component
 *
 * Shared top navigation bar with:
 * - Logo
 * - Notifications bell
 * - Profile menu with user avatar
 * - Logout functionality
 *
 * Uses user_metadata for profile information (first_name, last_name)
 */
export function TopNavbar() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [initials, setInitials] = useState('');

  // Get profile data from user_metadata
  useEffect(() => {
    const loadProfile = () => {
      if (!user) return;

      const meta = user.user_metadata || {};

      // Get first_name and last_name from metadata
      let firstName = meta.first_name || '';
      let lastName = meta.last_name || '';

      // Fallback: if no first/last name in metadata, try to parse from full_name
      if (!firstName && !lastName && meta.full_name) {
        const nameParts = meta.full_name.trim().split(' ');
        firstName = nameParts[0] || '';
        lastName = nameParts.slice(1).join(' ') || '';
      }

      // Fallback to email if no name
      if (!firstName && !lastName) {
        firstName = user.email?.split('@')[0] || 'User';
      }

      const fullName = `${firstName} ${lastName}`.trim();
      setDisplayName(fullName || 'User');

      // Get initials
      const firstInitial = firstName?.charAt(0) || '';
      const lastInitial = lastName?.charAt(0) || '';
      setInitials((firstInitial + lastInitial).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U');
    };

    loadProfile();
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <nav className="sticky top-0 z-50 bg-gradient-to-r from-blue-900 to-blue-800 border-b border-white/10 shadow-md">
      <div className="max-w-full px-6 py-3 flex justify-between items-center">

        {/* Left Section: Logo + Notifications */}
        <div className="flex items-center gap-4">
          <Logo size="small" />
          <NotificationBell />
        </div>

        {/* Right Section: Profile + Menu */}
        <div className="flex items-center gap-3">

          {/* Profile Button */}
          <div className="relative">
            <button
              className="flex items-center gap-2.5 py-1.5 pr-3 pl-1.5 bg-white/10 border border-white/20 rounded-full cursor-pointer transition-all hover:bg-white/15 text-white"
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-base font-bold text-white">
                {initials || 'U'}
              </div>
              <span className="text-sm font-medium">{displayName || 'User'}</span>
              <ChevronDown
                size={16}
                strokeWidth={2.5}
                className={`transition-transform ${profileMenuOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Profile Dropdown Menu */}
            {profileMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setProfileMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden z-50">

                  {/* User Info Header */}
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {displayName || 'User'}
                    </p>
                  </div>

                  {/* Menu Items */}
                  <div className="py-1">
                    <button
                      onClick={() => {
                        navigate('/dashboard');
                        setProfileMenuOpen(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3 transition-colors"
                    >
                      <Home size={16} strokeWidth={2} />
                      Dashboard
                    </button>

                    <button
                      onClick={() => {
                        navigate('/leads');
                        setProfileMenuOpen(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3 transition-colors"
                    >
                      <ClipboardList size={16} strokeWidth={2} />
                      Leads Management
                    </button>

                    <button
                      onClick={() => {
                        navigate('/calendar');
                        setProfileMenuOpen(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3 transition-colors"
                    >
                      <CalendarIcon size={16} strokeWidth={2} />
                      Calendar
                    </button>

                    <button
                      onClick={() => {
                        navigate('/reports');
                        setProfileMenuOpen(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3 transition-colors"
                    >
                      <BarChart size={16} strokeWidth={2} />
                      Reports
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-gray-200" />

                  {/* Account Settings */}
                  <div className="py-1">
                    <button
                      onClick={() => {
                        navigate('/profile');
                        setProfileMenuOpen(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3 transition-colors"
                    >
                      <User size={16} strokeWidth={2} />
                      My Profile
                    </button>

                    <button
                      onClick={() => {
                        navigate('/settings');
                        setProfileMenuOpen(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3 transition-colors"
                    >
                      <SettingsIcon size={16} strokeWidth={2} />
                      Settings
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-gray-200" />

                  {/* Logout */}
                  <div className="py-1">
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors font-medium"
                    >
                      <LogOut size={16} strokeWidth={2} />
                      Logout
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

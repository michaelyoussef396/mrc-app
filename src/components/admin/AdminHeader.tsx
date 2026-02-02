import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import AdminSearchBar from './AdminSearchBar';

interface AdminHeaderProps {
  userName?: string;
  onMenuClick?: () => void;
}

export default function AdminHeader({ userName = 'Admin', onMenuClick }: AdminHeaderProps) {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Close notification dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  // Get first initial for avatar
  const initial = userName.charAt(0).toUpperCase();

  return (
    <header className="flex items-center justify-between mb-6 lg:mb-8">
      {/* Left Section - Menu button (mobile) + Welcome */}
      <div className="flex items-center gap-3">
        {/* Hamburger menu - visible on mobile/tablet */}
        <button
          onClick={onMenuClick}
          className="lg:hidden w-12 h-12 rounded-xl bg-white flex items-center justify-center hover:bg-gray-50 transition-all"
          style={{ border: '1px solid #e5e5e5' }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: '24px', color: '#1d1d1f' }}
          >
            menu
          </span>
        </button>

        {/* Welcome Section */}
        <div>
          {/* Desktop: Full greeting */}
          <h1
            className="hidden md:block text-xl lg:text-2xl font-bold"
            style={{ color: '#1d1d1f' }}
          >
            Good {getTimeOfDay()}, {userName}
          </h1>
          {/* Mobile: Short title */}
          <h1
            className="md:hidden text-lg font-bold"
            style={{ color: '#1d1d1f' }}
          >
            Dashboard
          </h1>
          <p
            className="hidden md:block text-xs lg:text-sm mt-1"
            style={{ color: '#86868b' }}
          >
            Here's what's happening with your team today
          </p>
        </div>
      </div>

      {/* Right Section - Search & Profile */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* Desktop Search - hidden on mobile */}
        <div className="hidden md:block">
          <AdminSearchBar />
        </div>

        {/* Mobile Search Button */}
        <button
          onClick={() => setShowMobileSearch(!showMobileSearch)}
          className="md:hidden relative w-11 h-11 rounded-xl bg-white flex items-center justify-center hover:bg-gray-50 transition-all"
          style={{ border: '1px solid #e5e5e5' }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: '22px', color: '#86868b' }}
          >
            search
          </span>
        </button>

        {/* Notifications */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative w-11 h-11 rounded-xl bg-white flex items-center justify-center hover:bg-gray-50 transition-all"
            style={{ border: '1px solid #e5e5e5' }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '22px', color: '#86868b' }}
            >
              notifications
            </span>
            {/* Notification dot */}
            <span
              className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: '#FF3B30' }}
            />
          </button>

          {/* Notifications Dropdown - Coming Soon */}
          {showNotifications && (
            <div
              className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-lg overflow-hidden z-50"
              style={{ border: '1px solid #e5e5e5' }}
            >
              {/* Header */}
              <div
                className="px-4 py-3 flex items-center justify-between"
                style={{ borderBottom: '1px solid #f0f0f0' }}
              >
                <h3 className="font-semibold" style={{ color: '#1d1d1f' }}>
                  Notifications
                </h3>
                <span className="text-xs" style={{ color: '#86868b' }}>
                  Coming Soon
                </span>
              </div>

              {/* Content */}
              <div className="p-6 text-center">
                <div
                  className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(0, 122, 255, 0.1)' }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: '24px', color: '#007AFF' }}
                  >
                    notifications_active
                  </span>
                </div>
                <h4 className="font-semibold mb-1" style={{ color: '#1d1d1f' }}>
                  Feature Coming Soon
                </h4>
                <p className="text-sm leading-relaxed" style={{ color: '#86868b' }}>
                  Real-time notifications for new leads, inspection updates, and team activity will be available here.
                </p>
              </div>

              {/* Footer */}
              <div
                className="px-4 py-3 text-center"
                style={{ backgroundColor: '#f5f7f8', borderTop: '1px solid #f0f0f0' }}
              >
                <p className="text-xs" style={{ color: '#86868b' }}>
                  Stay tuned for updates!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Profile - Desktop shows full, mobile shows avatar only */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 md:gap-3 px-2 md:px-3 py-2 rounded-xl bg-white hover:bg-gray-50 transition-all"
            style={{ border: '1px solid #e5e5e5' }}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm"
              style={{ backgroundColor: '#007AFF' }}
            >
              {initial}
            </div>
            {/* Hide name on mobile */}
            <span
              className="hidden md:block text-sm font-medium"
              style={{ color: '#1d1d1f' }}
            >
              {userName}
            </span>
            <span
              className="hidden md:block material-symbols-outlined"
              style={{ fontSize: '18px', color: '#86868b' }}
            >
              expand_more
            </span>
          </button>

          {/* Profile Dropdown */}
          {showProfileMenu && (
            <div
              className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg py-2 z-50"
              style={{ border: '1px solid #e5e5e5' }}
            >
              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  navigate('/profile');
                }}
                className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 flex items-center gap-2 min-h-[48px]"
                style={{ color: '#1d1d1f' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  person
                </span>
                Profile
              </button>
              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  navigate('/settings');
                }}
                className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 flex items-center gap-2 min-h-[48px]"
                style={{ color: '#1d1d1f' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  settings
                </span>
                Settings
              </button>
              <hr className="my-2 border-gray-100" />
              <button
                onClick={handleSignOut}
                className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 flex items-center gap-2 min-h-[48px]"
                style={{ color: '#FF3B30' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  logout
                </span>
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Search Overlay */}
      {showMobileSearch && (
        <div className="md:hidden fixed inset-x-0 top-0 bg-white p-4 z-50 shadow-lg">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowMobileSearch(false)}
              className="w-12 h-12 rounded-full flex items-center justify-center hover:bg-gray-100 flex-shrink-0"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#86868b' }}>
                arrow_back
              </span>
            </button>
            <AdminSearchBar compact onClose={() => setShowMobileSearch(false)} />
          </div>
        </div>
      )}
    </header>
  );
}

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

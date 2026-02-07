import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface NavItem {
  icon: string;
  label: string;
  path: string;
  badge?: boolean;
  isProfile?: boolean;
}

const navItems: NavItem[] = [
  { icon: 'home', label: 'Home', path: '/technician' },
  { icon: 'assignment', label: 'My Jobs', path: '/technician/jobs' },
  { icon: 'notifications', label: 'Alerts', path: '/technician/alerts', badge: true },
  { icon: 'person', label: 'Profile', path: '/technician/profile', isProfile: true },
];

export default function TechnicianBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isActive = (path: string) => {
    if (path === '/technician') {
      return location.pathname === '/technician';
    }
    return location.pathname.startsWith(path);
  };

  const handleNavClick = (item: NavItem) => {
    if (item.isProfile) {
      setShowProfileMenu(!showProfileMenu);
    } else {
      setShowProfileMenu(false);
      navigate(item.path);
    }
  };

  const handleSignOut = async () => {
    setShowProfileMenu(false);
    await signOut();
    navigate('/');
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white pt-2 pb-safe"
      style={{
        borderTop: '1px solid #e5e5e5',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.03)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 8px)',
      }}
    >
      {/* Profile Dropdown Menu */}
      {showProfileMenu && (
        <div
          ref={menuRef}
          className="absolute bottom-full right-4 mb-2 bg-white rounded-xl shadow-lg overflow-hidden z-50 min-w-[180px]"
          style={{ border: '1px solid #e5e5e5' }}
        >
          {/* Profile Option */}
          <button
            onClick={() => {
              setShowProfileMenu(false);
              navigate('/technician/profile');
            }}
            className="w-full px-4 py-3 text-left text-sm font-medium hover:bg-gray-50 flex items-center gap-3 active:bg-gray-100"
            style={{ color: '#1d1d1f', minHeight: '48px' }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '20px', color: '#86868b' }}
            >
              person
            </span>
            My Profile
          </button>

          {/* Divider */}
          <div style={{ borderTop: '1px solid #f0f0f0' }} />

          {/* Settings Option */}
          <button
            onClick={() => {
              setShowProfileMenu(false);
              navigate('/settings');
            }}
            className="w-full px-4 py-3 text-left text-sm font-medium hover:bg-gray-50 flex items-center gap-3 active:bg-gray-100"
            style={{ color: '#1d1d1f', minHeight: '48px' }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '20px', color: '#86868b' }}
            >
              settings
            </span>
            Settings
          </button>

          {/* Divider */}
          <div style={{ borderTop: '1px solid #f0f0f0' }} />

          {/* Log Out Option */}
          <button
            onClick={handleSignOut}
            className="w-full px-4 py-3 text-left text-sm font-medium hover:bg-gray-50 flex items-center gap-3 active:bg-gray-100"
            style={{ color: '#FF3B30', minHeight: '48px' }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '20px' }}
            >
              logout
            </span>
            Log Out
          </button>
        </div>
      )}

      <div className="flex justify-around items-end h-[60px] pb-2 max-w-lg mx-auto">
        {navItems.map((item) => {
          const active = item.isProfile ? showProfileMenu : isActive(item.path);

          return (
            <button
              key={item.path}
              onClick={() => handleNavClick(item)}
              className={`flex flex-col items-center gap-1 w-full transition-colors group`}
              style={{
                color: active ? '#007AFF' : '#86868b',
                minHeight: '48px',
              }}
            >
              <div className="relative w-10 h-8 rounded-full flex items-center justify-center">
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: '24px',
                    fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0",
                  }}
                >
                  {item.icon}
                </span>

                {/* Badge/Notification Dot */}
                {item.badge && (
                  <span
                    className="absolute top-0 right-0 w-2 h-2 rounded-full"
                    style={{ backgroundColor: '#FF3B30', border: '1px solid white' }}
                  />
                )}
              </div>
              <span
                className={`text-[10px] ${active ? 'font-bold' : 'font-medium'}`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

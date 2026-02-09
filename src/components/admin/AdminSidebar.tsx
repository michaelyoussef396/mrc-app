import { useNavigate, useLocation } from 'react-router-dom';
import logoLarge from '@/assets/logo-large.png';

interface NavItem {
  icon: string;
  label: string;
  path: string;
  badge?: number;
}

const navItems: NavItem[] = [
  { icon: 'dashboard', label: 'Dashboard', path: '/admin' },
  { icon: 'inbox', label: 'Leads', path: '/admin/leads', badge: 12 },
  { icon: 'calendar_month', label: 'Schedule', path: '/admin/schedule' },
  { icon: 'groups', label: 'Technicians', path: '/admin/technicians' },
  { icon: 'assessment', label: 'Reports', path: '/reports' },
  { icon: 'settings', label: 'Settings', path: '/settings' },
];

interface AdminSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function AdminSidebar({ isOpen = false, onClose }: AdminSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(path);
  };

  const handleNavClick = (path: string) => {
    navigate(path);
    // Close sidebar on mobile after navigation
    if (onClose) {
      onClose();
    }
  };

  const SidebarContent = () => (
    <>
      {/* Logo Section */}
      <div className="p-6 flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center p-1"
          style={{ backgroundColor: '#007AFF' }}
        >
          <img
            src={logoLarge}
            alt="MRC"
            className="w-10 h-10 object-contain"
          />
        </div>
        <div>
          <p className="text-white font-bold text-lg">MRC Admin</p>
          <p className="text-white/60 text-xs">Management Portal</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.path}>
              <button
                onClick={() => handleNavClick(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all min-h-[48px] ${
                  isActive(item.path)
                    ? 'bg-white/15 text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: '22px',
                    fontVariationSettings: isActive(item.path)
                      ? "'FILL' 1"
                      : "'FILL' 0",
                  }}
                >
                  {item.icon}
                </span>
                <span className="font-medium text-[15px]">{item.label}</span>
                {item.badge && (
                  <span
                    className="ml-auto px-2 py-0.5 rounded-full text-xs font-semibold"
                    style={{
                      backgroundColor: '#007AFF',
                      color: 'white',
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Bottom Section - Help */}
      <div className="p-4 border-t border-white/10">
        <button
          onClick={() => handleNavClick('/help')}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/70 hover:bg-white/10 hover:text-white transition-all min-h-[48px]"
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: '22px' }}
          >
            help
          </span>
          <span className="font-medium text-[15px]">Help & Support</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar - Always visible on lg+ screens */}
      <aside
        className="hidden lg:flex fixed left-0 top-0 h-screen w-[260px] flex-col z-40"
        style={{ backgroundColor: '#1a365d' }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile/Tablet Sidebar - Drawer */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={onClose}
          />

          {/* Drawer */}
          <aside
            className="fixed inset-y-0 left-0 w-[260px] flex flex-col z-50 lg:hidden transform transition-transform duration-300"
            style={{ backgroundColor: '#1a365d' }}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-all"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>
                close
              </span>
            </button>

            <SidebarContent />
          </aside>
        </>
      )}
    </>
  );
}

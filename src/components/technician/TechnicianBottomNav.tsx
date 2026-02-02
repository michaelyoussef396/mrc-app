import { useNavigate, useLocation } from 'react-router-dom';

interface NavItem {
  icon: string;
  label: string;
  path: string;
  badge?: boolean;
}

const navItems: NavItem[] = [
  { icon: 'home', label: 'Home', path: '/technician' },
  { icon: 'assignment', label: 'My Jobs', path: '/technician/jobs' },
  { icon: 'notifications', label: 'Alerts', path: '/technician/alerts', badge: true },
  { icon: 'person', label: 'Profile', path: '/profile' },
];

export default function TechnicianBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/technician') {
      return location.pathname === '/technician';
    }
    return location.pathname.startsWith(path);
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
      <div className="flex justify-around items-end h-[60px] pb-2 max-w-lg mx-auto">
        {navItems.map((item) => {
          const active = isActive(item.path);

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
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

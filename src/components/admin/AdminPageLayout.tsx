import { useState, type ReactNode } from 'react';
import AdminSidebar from './AdminSidebar';

interface AdminPageLayoutProps {
  title: string;
  subtitle?: string;
  icon?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export default function AdminPageLayout({
  title,
  subtitle,
  icon,
  actions,
  children,
}: AdminPageLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: '#f5f7f8',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <AdminSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="ml-0 lg:ml-[260px] min-h-screen">
        {/* Sticky Header */}
        <header
          className="bg-white sticky top-0 z-30"
          style={{ borderBottom: '1px solid #e5e5e5' }}
        >
          <div className="flex items-center px-4 md:px-6 lg:px-8 py-4 justify-between">
            {/* Mobile menu button */}
            <button
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors mr-3"
              onClick={() => setSidebarOpen(true)}
            >
              <span className="material-symbols-outlined" style={{ color: '#1d1d1f' }}>
                menu
              </span>
            </button>

            {/* Title Section */}
            <div className="flex items-center gap-4 flex-1">
              {icon && (
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(0, 122, 255, 0.1)' }}
                >
                  <span className="material-symbols-outlined" style={{ color: '#007AFF' }}>
                    {icon}
                  </span>
                </div>
              )}
              <div>
                <h1
                  className="text-xl font-bold leading-tight"
                  style={{ color: '#1d1d1f' }}
                >
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-sm" style={{ color: '#617589' }}>
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            {/* Actions (right side) */}
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        </header>

        {/* Page Content */}
        <div className="p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, ClipboardList, Calendar, Settings } from "lucide-react";

export function BottomNavbar() {
  const [showQuickActions, setShowQuickActions] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const toggleQuickActions = () => {
    setShowQuickActions(!showQuickActions);
    // Add haptic feedback on mobile
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  };

  const closeQuickActions = () => {
    setShowQuickActions(false);
  };

  const handleQuickAction = (action: string) => {
    // Add haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
    
    closeQuickActions();
    
    switch (action) {
      case 'new_lead':
        navigate('/leads', { state: { openNewLeadModal: true } });
        break;
      case 'book_inspection':
        navigate('/leads');
        break;
      case 'add_event':
        navigate('/calendar', { state: { openNewEventModal: true } });
        break;
      case 'start_inspection':
        navigate('/inspection');
        break;
    }
  };

  // Close menu on escape key & manage body scroll
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeQuickActions();
      }
    };

    if (showQuickActions) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';

      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = '';  // Reset to default (empty string, NOT 'auto')
      };
    }

    // When showQuickActions is false, only set up escape listener, do NOT touch body overflow
    return undefined;
  }, [showQuickActions]);

  const navItems = [
    { path: '/dashboard', label: 'Home', icon: Home },
    { path: '/leads', label: 'Leads', icon: ClipboardList },
  ];

  const rightNavItems = [
    { path: '/calendar', label: 'Calendar', icon: Calendar },
    { path: '/settings', label: 'More', icon: Settings },
  ];

  return (
    <>
      <nav className="bottom-navbar">
        {/* Left Side */}
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`nav-item ${active ? 'active' : ''}`}
            >
              <Icon className="nav-icon" />
              <span className="nav-label">{item.label}</span>
            </button>
          );
        })}
        
        {/* Center FAB (Floating Action Button) */}
        <button 
          className={`fab-button ${showQuickActions ? 'active' : ''}`}
          onClick={toggleQuickActions}
        >
          <div className="fab-icon">
            <svg className="plus-icon" viewBox="0 0 24 24" fill="none">
              <path 
                d="M12 5v14M5 12h14" 
                stroke="currentColor" 
                strokeWidth="2.5" 
                strokeLinecap="round"
              />
            </svg>
          </div>
          <span className="nav-label">Add</span>
        </button>
        
        {/* Right Side */}
        {rightNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`nav-item ${active ? 'active' : ''}`}
            >
              <Icon className="nav-icon" />
              <span className="nav-label">{item.label}</span>
            </button>
          );
        })}
      </nav>
      
      {/* Quick Actions Menu */}
      {showQuickActions && (
        <>
          <div className="fab-backdrop" onClick={closeQuickActions} />
          <div className="quick-actions-menu">
            <button 
              className="quick-action-item" 
              onClick={() => handleQuickAction('new_lead')}
            >
              <div 
                className="action-icon" 
                style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
              >
                <span className="action-emoji">👤</span>
              </div>
              <span className="action-label">New Lead</span>
            </button>
            
            <button 
              className="quick-action-item" 
              onClick={() => handleQuickAction('book_inspection')}
            >
              <div 
                className="action-icon" 
                style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}
              >
                <span className="action-emoji">📋</span>
              </div>
              <span className="action-label">Book Inspection</span>
            </button>
            
            <button 
              className="quick-action-item" 
              onClick={() => handleQuickAction('add_event')}
            >
              <div 
                className="action-icon" 
                style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}
              >
                <span className="action-emoji">📅</span>
              </div>
              <span className="action-label">Add Event</span>
            </button>
            
            <button 
              className="quick-action-item" 
              onClick={() => handleQuickAction('start_inspection')}
            >
              <div 
                className="action-icon" 
                style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}
              >
                <span className="action-emoji">🔬</span>
              </div>
              <span className="action-label">Start Inspection</span>
            </button>
          </div>
        </>
      )}
    </>
  );
}

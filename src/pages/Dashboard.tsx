import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Bell, Menu, X, ChevronDown, CheckCircle, AlertCircle, Info } from 'lucide-react';
import Logo from '@/components/Logo';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState({
    totalLeads: 0,
    activeJobs: 0,
    completedToday: 0,
    revenue: 0
  });

  // Mock notifications data
  const notifications = [
    {
      id: 1,
      type: 'success',
      icon: CheckCircle,
      text: 'Inspection completed for 45 High St, Croydon',
      time: '2 hours ago',
      unread: true
    },
    {
      id: 2,
      type: 'info',
      icon: Info,
      text: 'New lead assigned: 78 Smith Road, Richmond',
      time: '5 hours ago',
      unread: true
    },
    {
      id: 3,
      type: 'alert',
      icon: AlertCircle,
      text: 'Urgent: Follow-up needed for job #MRC-2025-0042',
      time: '1 day ago',
      unread: false
    }
  ];

  const notificationCount = notifications.filter(n => n.unread).length;

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    // TODO: Load real data from Supabase
    // For now, mock data
    setStats({
      totalLeads: 47,
      activeJobs: 12,
      completedToday: 3,
      revenue: 24500
    });
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 pb-20">
      {/* Subtle Background */}
      <div className="dashboard-background">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
      </div>

      {/* Dashboard Header Section */}
      <div className="flex justify-between items-center px-6 py-5 mb-6">
        
        {/* Left: Logo */}
        <div>
          <Logo size="medium" />
        </div>

        {/* Right: Notifications + Profile + Menu */}
        <div className="flex items-center gap-3">
          
          {/* Notifications Button */}
          <div className="relative">
            <button 
              className="relative w-11 h-11 rounded-xl bg-white border border-gray-200 text-gray-700 flex items-center justify-center cursor-pointer transition-all hover:bg-gray-50"
              onClick={() => {
                setNotificationsOpen(!notificationsOpen);
                setProfileMenuOpen(false);
              }}
            >
              <Bell size={20} strokeWidth={2} />
              {notificationCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 bg-red-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center px-1.5">
                  {notificationCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {notificationsOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40"
                  onClick={() => setNotificationsOpen(false)}
                />
                <div className="absolute top-14 right-0 w-80 sm:w-96 max-h-[480px] bg-white rounded-2xl shadow-2xl z-50 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-base font-bold text-gray-900">Notifications</h3>
                    <button className="text-sm text-blue-600 font-semibold hover:text-blue-700">
                      Mark all read
                    </button>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.map((notification) => {
                      const IconComponent = notification.icon;
                      return (
                        <div 
                          key={notification.id}
                          className={`flex gap-3 px-5 py-4 border-b border-gray-100 cursor-pointer transition-colors hover:bg-gray-50 ${
                            notification.unread ? 'bg-blue-50' : ''
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            notification.type === 'success' ? 'bg-green-100 text-green-600' :
                            notification.type === 'alert' ? 'bg-red-100 text-red-600' :
                            'bg-blue-100 text-blue-600'
                          }`}>
                            <IconComponent size={20} strokeWidth={2} />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-gray-700 leading-relaxed mb-1">
                              {notification.text}
                            </p>
                            <span className="text-xs text-gray-500">{notification.time}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="px-5 py-3 border-t border-gray-200 text-center">
                    <button className="text-sm text-blue-600 font-semibold hover:text-blue-700">
                      View all notifications
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
          
          {/* Profile Button */}
          <div className="relative">
            <button 
              className="flex items-center gap-2.5 py-1.5 pr-3 pl-1.5 bg-white border border-gray-200 rounded-full cursor-pointer transition-all hover:bg-gray-50"
              onClick={() => {
                setProfileMenuOpen(!profileMenuOpen);
                setNotificationsOpen(false);
              }}
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-base font-bold text-white">
                {user?.email?.charAt(0).toUpperCase() || 'A'}
              </div>
              <span className="hidden md:inline text-sm font-semibold text-gray-900">
                {user?.email?.split('@')[0] || 'admin'}
              </span>
              <ChevronDown size={16} strokeWidth={2} className="text-gray-500" />
            </button>

            {/* Profile Dropdown */}
            {profileMenuOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40"
                  onClick={() => setProfileMenuOpen(false)}
                />
                <div className="absolute top-14 right-0 w-56 bg-white rounded-2xl shadow-2xl z-50 overflow-hidden border border-gray-200">
                  <div className="py-2">
                    <button 
                      className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                      onClick={() => {
                        navigate('/profile');
                        setProfileMenuOpen(false);
                      }}
                    >
                      Profile Settings
                    </button>
                    <button 
                      className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                      onClick={() => {
                        navigate('/settings');
                        setProfileMenuOpen(false);
                      }}
                    >
                      System Settings
                    </button>
                    <div className="my-2 border-t border-gray-200"></div>
                    <button 
                      className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 font-semibold transition-colors"
                      onClick={handleLogout}
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
          
          {/* Menu Toggle Button */}
          <button 
            className="w-11 h-11 rounded-xl bg-white border border-gray-200 text-gray-700 flex items-center justify-center cursor-pointer transition-all hover:bg-gray-50"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? (
              <X size={24} strokeWidth={2} />
            ) : (
              <Menu size={24} strokeWidth={2} />
            )}
          </button>
          
        </div>
      </div>

      {/* Main Content */}
      <main className="dashboard-main">
        <div className="dashboard-container">
          {/* Header */}
          <div className="dashboard-header">
            <div>
              <h1 className="page-title">Welcome back! 👋</h1>
              <p className="page-subtitle">Here's what's happening with your leads today</p>
            </div>
            
            <button 
              className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-[15px] font-semibold rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
              onClick={() => navigate('/lead/new')}
            >
              <Plus size={20} strokeWidth={2.5} />
              <span>New Inspection/Lead</span>
            </button>
          </div>

          {/* Stats Grid */}
          <div className="stats-grid">
            <div className="stat-card blue">
              <div className="stat-icon">📋</div>
              <div className="stat-content">
                <p className="stat-label">Total Leads</p>
                <h3 className="stat-value">{stats.totalLeads}</h3>
                <p className="stat-change positive">↑ 12% from last month</p>
              </div>
            </div>

            <div className="stat-card green">
              <div className="stat-icon">⚡</div>
              <div className="stat-content">
                <p className="stat-label">Active Jobs</p>
                <h3 className="stat-value">{stats.activeJobs}</h3>
                <p className="stat-change positive">↑ 3 new today</p>
              </div>
            </div>

            <div className="stat-card purple">
              <div className="stat-icon">✓</div>
              <div className="stat-content">
                <p className="stat-label">Completed Today</p>
                <h3 className="stat-value">{stats.completedToday}</h3>
                <p className="stat-change neutral">On track</p>
              </div>
            </div>

            <div className="stat-card orange">
              <div className="stat-icon">💰</div>
              <div className="stat-content">
                <p className="stat-label">Monthly Revenue</p>
                <h3 className="stat-value">${stats.revenue.toLocaleString()}</h3>
                <p className="stat-change positive">↑ 8% from last month</p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="quick-actions-section">
            <h2 className="section-title">Quick Actions</h2>
            
            <div className="quick-actions-grid">
              <button className="action-card action-card-blue" onClick={() => navigate('/inspection/select-lead')}>
                <div className="action-icon-wrapper blue">
                  <svg className="action-icon-svg" viewBox="0 0 24 24" fill="none">
                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="action-content">
                  <h3 className="action-title">Start Inspection</h3>
                  <p className="action-description">Create new mould inspection</p>
                </div>
              </button>

              <button className="action-card action-card-green" onClick={() => navigate('/leads')}>
                <div className="action-icon-wrapper green">
                  <svg className="action-icon-svg" viewBox="0 0 24 24" fill="none">
                    <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="action-content">
                  <h3 className="action-title">View All Leads</h3>
                  <p className="action-description">Manage lead pipeline</p>
                </div>
              </button>

              <button className="action-card action-card-purple" onClick={() => navigate('/calendar')}>
                <div className="action-icon-wrapper purple">
                  <svg className="action-icon-svg" viewBox="0 0 24 24" fill="none">
                    <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="action-content">
                  <h3 className="action-title">Calendar</h3>
                  <p className="action-description">View scheduled jobs</p>
                </div>
              </button>

              <button className="action-card action-card-orange" onClick={() => navigate('/reports')}>
                <div className="action-icon-wrapper orange">
                  <svg className="action-icon-svg" viewBox="0 0 24 24" fill="none">
                    <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="action-content">
                  <h3 className="action-title">Reports</h3>
                  <p className="action-description">View analytics</p>
                </div>
              </button>
            </div>
          </div>

          {/* Recent Leads */}
          <div className="recent-leads-section">
            <div className="section-header">
              <h2 className="section-title">Recent Leads</h2>
              <button className="btn-link" onClick={() => navigate('/leads')}>
                View All →
              </button>
            </div>

            <div className="leads-table-card">
              <table className="leads-table">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Property</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Value</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <div className="client-cell">
                        <div className="client-avatar">JD</div>
                        <div>
                          <p className="client-name">John Doe</p>
                          <p className="client-email">john@email.com</p>
                        </div>
                      </div>
                    </td>
                    <td>123 Smith St, Melbourne</td>
                    <td>
                      <span className="status-badge new">New</span>
                    </td>
                    <td>Today, 10:30 AM</td>
                    <td className="value-cell">$2,400</td>
                    <td>
                      <button className="btn-action" onClick={() => navigate('/client/1')}>View</button>
                    </td>
                  </tr>

                  <tr>
                    <td>
                      <div className="client-cell">
                        <div className="client-avatar">SM</div>
                        <div>
                          <p className="client-name">Sarah Miller</p>
                          <p className="client-email">sarah@email.com</p>
                        </div>
                      </div>
                    </td>
                    <td>45 Queen St, Richmond</td>
                    <td>
                      <span className="status-badge inprogress">In Progress</span>
                    </td>
                    <td>Yesterday, 2:15 PM</td>
                    <td className="value-cell">$3,200</td>
                    <td>
                      <button className="btn-action" onClick={() => navigate('/client/2')}>View</button>
                    </td>
                  </tr>

                  <tr>
                    <td>
                      <div className="client-cell">
                        <div className="client-avatar">RJ</div>
                        <div>
                          <p className="client-name">Robert Jones</p>
                          <p className="client-email">robert@email.com</p>
                        </div>
                      </div>
                    </td>
                    <td>78 Collins St, Melbourne CBD</td>
                    <td>
                      <span className="status-badge completed">Completed</span>
                    </td>
                    <td>Oct 27, 11:00 AM</td>
                    <td className="value-cell">$4,500</td>
                    <td>
                      <button className="btn-action" onClick={() => navigate('/client/3')}>View</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

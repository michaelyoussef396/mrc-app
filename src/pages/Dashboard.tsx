import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Bell, Menu, X, ChevronDown, Home, ClipboardList, Calendar as CalendarIcon, FileText, BarChart, TrendingUp, User, Settings as SettingsIcon, LogOut, ChevronRight, Users, Briefcase, CheckCircle, DollarSign } from 'lucide-react';
import Logo from '@/components/Logo';
import { NewLeadDialog } from '@/components/leads/NewLeadDialog';
import { StatCard } from '@/components/dashboard/StatCard';
import { RecentLeads } from '@/components/dashboard/RecentLeads';
import { useDashboardStats } from '@/hooks/useDashboardStats';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [newLeadDialogOpen, setNewLeadDialogOpen] = useState(false);

  // Fetch dashboard statistics using React Query hooks
  const {
    totalLeadsThisMonth,
    activeJobs,
    completedToday,
    monthlyRevenue,
    isLoading: statsLoading,
  } = useDashboardStats();

  // Mock notifications data (recent)
  const recentNotifications = [
    { id: 1, title: 'Inspection completed for 45 High St, Croydon', time: '2 hours ago', unread: true },
    { id: 2, title: 'New lead assigned: 78 Smith Road, Richmond', time: '5 hours ago', unread: true },
    { id: 3, title: 'Urgent: Follow-up needed for job #MRC-2025-0042', time: '1 day ago', unread: false },
  ];

  const notificationCount = recentNotifications.filter(n => n.unread).length;

  const handleLeadCreated = () => {
    // Close dialog - React Query will auto-refetch
    setNewLeadDialogOpen(false);
  };

  // Format currency (Australian dollars)
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format percentage
  const formatPercentage = (value: number): string => {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  // Format number change
  const formatChange = (value: number): string => {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value}`;
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="dashboard-page">
      {/* Subtle Background */}
      <div className="dashboard-background">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
      </div>

      {/* Top Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-gradient-to-r from-blue-900 to-blue-800 border-b border-white/10 shadow-md">
        <div className="max-w-full px-6 py-3 flex justify-between items-center">
          
          {/* Left Section: Logo + Notifications */}
          <div className="flex items-center gap-4">
            <Logo size="small" />
            
            {/* Notifications Button */}
            <div className="relative">
              <button 
                className="relative w-11 h-11 rounded-xl bg-white/10 border-0 text-white flex items-center justify-center cursor-pointer transition-all hover:bg-white/20"
                onClick={() => {
                  setNotificationsOpen(!notificationsOpen);
                  setProfileMenuOpen(false);
                }}
              >
                <Bell size={20} strokeWidth={2} />
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-5 h-5 bg-red-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center px-1.5 border-2 border-blue-900">
                    {notificationCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {notificationsOpen && (
                <>
                  {/* Backdrop */}
                  <div 
                    className="fixed inset-0 z-40"
                    onClick={() => setNotificationsOpen(false)}
                  />
                  
                  {/* Dropdown Panel */}
                  <div className="absolute top-14 -left-20 w-80 sm:w-96 max-h-[480px] bg-white rounded-2xl shadow-2xl z-50 overflow-hidden">
                    {/* Header */}
                    <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center">
                      <h3 className="text-base font-bold text-gray-900">Notifications</h3>
                      <button className="text-sm text-blue-600 font-semibold hover:text-blue-700">
                        Mark all read
                      </button>
                    </div>
                    
                    {/* Notifications List */}
                    <div className="max-h-96 overflow-y-auto">
                      {recentNotifications.map((notification) => (
                        <div 
                          key={notification.id}
                          className={`flex gap-3 px-5 py-4 border-b border-gray-100 cursor-pointer transition-colors hover:bg-gray-50 ${
                            notification.unread ? 'bg-blue-50' : ''
                          }`}
                          onClick={() => setNotificationsOpen(false)}
                        >
                          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                            <Bell size={20} strokeWidth={2} />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-gray-900 font-medium mb-1">
                              {notification.title}
                            </p>
                            <span className="text-xs text-gray-500">{notification.time}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Footer */}
                    <div className="px-5 py-3 border-t border-gray-200 text-center">
                      <button 
                        className="text-sm text-blue-600 font-semibold hover:text-blue-700"
                        onClick={() => {
                          navigate('/notifications');
                          setNotificationsOpen(false);
                        }}
                      >
                        View all notifications
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right Section: Profile + Menu */}
          <div className="flex items-center gap-3">
            
            {/* Profile Button */}
            <div className="relative">
              <button 
                className="flex items-center gap-2.5 py-1.5 pr-3 pl-1.5 bg-white/10 border border-white/20 rounded-full cursor-pointer transition-all hover:bg-white/15 text-white"
                onClick={() => {
                  setProfileMenuOpen(!profileMenuOpen);
                  setNotificationsOpen(false);
                }}
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-base font-bold text-white">
                  {user?.email?.charAt(0).toUpperCase() || 'A'}
                </div>
                <div className="hidden md:flex flex-col items-start gap-0.5">
                  <span className="text-sm font-semibold leading-none">
                    {user?.email?.split('@')[0] || 'admin'}
                  </span>
                  <span className="text-xs opacity-80 leading-none">Administrator</span>
                </div>
                <ChevronDown size={16} strokeWidth={2} className="opacity-70" />
              </button>

              {/* Profile Dropdown */}
              {profileMenuOpen && (
                <>
                  {/* Backdrop */}
                  <div 
                    className="fixed inset-0 z-40"
                    onClick={() => setProfileMenuOpen(false)}
                  />
                  
                  {/* Dropdown Menu */}
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
              className="w-11 h-11 rounded-xl bg-white/10 border-0 text-white flex items-center justify-center cursor-pointer transition-all hover:bg-white/20"
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
      </nav>

      {/* Sidebar Menu */}
      {sidebarOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 z-[95] animate-fade-in"
            onClick={() => setSidebarOpen(false)}
          />
          
          {/* Sidebar Panel */}
          <div className="fixed top-0 right-0 w-80 max-w-[85vw] h-screen bg-white shadow-2xl z-[100] overflow-y-auto animate-slide-in-right">
            
            {/* Sidebar Header */}
            <div className="px-5 py-5 flex justify-end border-b border-gray-200">
              <button 
                className="w-10 h-10 rounded-xl bg-gray-100 border-0 text-gray-700 flex items-center justify-center cursor-pointer transition-all hover:bg-gray-200"
                onClick={() => setSidebarOpen(false)}
              >
                <X size={24} strokeWidth={2} />
              </button>
            </div>
            
            {/* Profile Section */}
            <div className="px-6 py-8 text-center border-b border-gray-200">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-3xl font-bold">
                {user?.email?.charAt(0).toUpperCase() || 'A'}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">
                {user?.email?.split('@')[0] || 'admin'}
              </h3>
              <p className="text-sm text-gray-600 mb-1">Administrator</p>
              <p className="text-xs text-gray-500">{user?.email || 'admin@mrc.com.au'}</p>
            </div>
            
            {/* Navigation Menu */}
            <nav className="py-4">
              <button 
                className="w-full flex items-center gap-3 px-6 py-3.5 bg-transparent border-0 text-gray-700 text-[15px] font-medium cursor-pointer transition-all hover:bg-gray-50"
                onClick={() => {
                  navigate('/dashboard');
                  setSidebarOpen(false);
                }}
              >
                <Home size={20} strokeWidth={2} />
                <span className="flex-1 text-left">Home</span>
                <ChevronRight size={16} strokeWidth={2} className="opacity-30" />
              </button>
              
              <button 
                className="w-full flex items-center gap-3 px-6 py-3.5 bg-transparent border-0 text-gray-700 text-[15px] font-medium cursor-pointer transition-all hover:bg-gray-50"
                onClick={() => {
                  navigate('/leads');
                  setSidebarOpen(false);
                }}
              >
                <ClipboardList size={20} strokeWidth={2} />
                <span className="flex-1 text-left">Leads</span>
                <ChevronRight size={16} strokeWidth={2} className="opacity-30" />
              </button>
              
              <button 
                className="w-full flex items-center gap-3 px-6 py-3.5 bg-transparent border-0 text-gray-700 text-[15px] font-medium cursor-pointer transition-all hover:bg-gray-50"
                onClick={() => {
                  navigate('/calendar');
                  setSidebarOpen(false);
                }}
              >
                <CalendarIcon size={20} strokeWidth={2} />
                <span className="flex-1 text-left">Calendar</span>
                <ChevronRight size={16} strokeWidth={2} className="opacity-30" />
              </button>
              
              <button 
                className="w-full flex items-center gap-3 px-6 py-3.5 bg-transparent border-0 text-gray-700 text-[15px] font-medium cursor-pointer transition-all hover:bg-gray-50"
                onClick={() => {
                  navigate('/inspection/select-lead');
                  setSidebarOpen(false);
                }}
              >
                <FileText size={20} strokeWidth={2} />
                <span className="flex-1 text-left">Inspections</span>
                <ChevronRight size={16} strokeWidth={2} className="opacity-30" />
              </button>
              
              <button 
                className="w-full flex items-center gap-3 px-6 py-3.5 bg-transparent border-0 text-gray-700 text-[15px] font-medium cursor-pointer transition-all hover:bg-gray-50"
                onClick={() => {
                  navigate('/reports');
                  setSidebarOpen(false);
                }}
              >
                <BarChart size={20} strokeWidth={2} />
                <span className="flex-1 text-left">Reports</span>
                <ChevronRight size={16} strokeWidth={2} className="opacity-30" />
              </button>
              
              <button 
                className="w-full flex items-center gap-3 px-6 py-3.5 bg-transparent border-0 text-gray-700 text-[15px] font-medium cursor-pointer transition-all hover:bg-gray-50"
                onClick={() => {
                  navigate('/analytics');
                  setSidebarOpen(false);
                }}
              >
                <TrendingUp size={20} strokeWidth={2} />
                <span className="flex-1 text-left">Analytics</span>
                <ChevronRight size={16} strokeWidth={2} className="opacity-30" />
              </button>
            </nav>
            
            {/* Divider */}
            <div className="h-px bg-gray-200 my-4"></div>
            
            {/* Account Actions */}
            <div className="pb-6">
              <button 
                className="w-full flex items-center gap-3 px-6 py-3.5 bg-transparent border-0 text-gray-700 text-[15px] font-medium cursor-pointer transition-all hover:bg-gray-50"
                onClick={() => {
                  navigate('/profile');
                  setSidebarOpen(false);
                }}
              >
                <User size={20} strokeWidth={2} />
                <span className="flex-1 text-left">My Profile</span>
              </button>
              
              <button 
                className="w-full flex items-center gap-3 px-6 py-3.5 bg-transparent border-0 text-gray-700 text-[15px] font-medium cursor-pointer transition-all hover:bg-gray-50"
                onClick={() => {
                  navigate('/settings');
                  setSidebarOpen(false);
                }}
              >
                <SettingsIcon size={20} strokeWidth={2} />
                <span className="flex-1 text-left">Settings</span>
              </button>
              
              <button 
                className="w-full flex items-center gap-3 px-6 py-3.5 bg-transparent border-0 text-red-600 text-[15px] font-semibold cursor-pointer transition-all hover:bg-red-50"
                onClick={() => {
                  handleLogout();
                  setSidebarOpen(false);
                }}
              >
                <LogOut size={20} strokeWidth={2} />
                <span className="flex-1 text-left">Sign Out</span>
              </button>
            </div>
            
          </div>
        </>
      )}

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
              onClick={() => setNewLeadDialogOpen(true)}
            >
              <Plus size={20} strokeWidth={2.5} />
              <span>New Lead</span>
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Total Leads This Month */}
            <StatCard
              title="Total Leads This Month"
              value={totalLeadsThisMonth.data?.count ?? 0}
              trend={totalLeadsThisMonth.data?.trend}
              trendValue={formatPercentage(totalLeadsThisMonth.data?.percentageChange ?? 0)}
              trendLabel="vs last month"
              icon={Users}
              iconColor="text-blue-600"
              loading={totalLeadsThisMonth.isLoading}
            />

            {/* Active Jobs */}
            <StatCard
              title="Active Jobs"
              value={activeJobs.data?.count ?? 0}
              trend={activeJobs.data?.trend}
              trendValue={formatChange(activeJobs.data?.change ?? 0)}
              trendLabel="vs last week"
              icon={Briefcase}
              iconColor="text-orange-600"
              loading={activeJobs.isLoading}
            />

            {/* Completed Today */}
            <StatCard
              title="Completed Today"
              value={completedToday.data?.count ?? 0}
              trend={completedToday.data?.trend}
              trendValue={formatChange(completedToday.data?.change ?? 0)}
              trendLabel="vs yesterday"
              icon={CheckCircle}
              iconColor="text-green-600"
              loading={completedToday.isLoading}
            />

            {/* Monthly Revenue */}
            <StatCard
              title="Monthly Revenue"
              value={formatCurrency(monthlyRevenue.data?.amount ?? 0)}
              trend={monthlyRevenue.data?.trend}
              trendValue={formatPercentage(monthlyRevenue.data?.percentageChange ?? 0)}
              trendLabel="vs last month"
              icon={DollarSign}
              iconColor="text-emerald-600"
              loading={monthlyRevenue.isLoading}
            />
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
          <div className="mb-6">
            <RecentLeads />
          </div>
        </div>
      </main>

      {/* New Lead Dialog */}
      <NewLeadDialog
        open={newLeadDialogOpen}
        onClose={() => setNewLeadDialogOpen(false)}
        onSuccess={handleLeadCreated}
      />
    </div>
  );
}

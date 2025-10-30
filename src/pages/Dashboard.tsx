import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalLeads: 0,
    activeJobs: 0,
    completedToday: 0,
    revenue: 0
  });

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
    <div className="dashboard-page">
      {/* Subtle Background */}
      <div className="dashboard-background">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
      </div>

      {/* Top Navigation Bar */}
      <nav className="dashboard-nav">
        <div className="nav-container">
          <div className="nav-left">
            <div className="logo-section">
              <div className="logo-icon">🔧</div>
              <span className="logo-text">MRC Dashboard</span>
            </div>
          </div>

          <div className="nav-right">
            <button className="nav-icon-btn">
              <span className="icon">🔔</span>
              <span className="notification-badge">3</span>
            </button>
            
            <div className="user-menu">
              <button className="user-menu-btn">
                <div className="user-avatar">
                  {user?.email?.charAt(0).toUpperCase()}
                </div>
                <span className="user-name">{user?.email?.split('@')[0]}</span>
              </button>
              
              <div className="user-dropdown">
                <button onClick={() => navigate('/profile')}>Profile</button>
                <button onClick={() => navigate('/settings')}>Settings</button>
                <button onClick={handleLogout}>Sign Out</button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="dashboard-main">
        <div className="dashboard-container">
          {/* Header */}
          <div className="dashboard-header">
            <div>
              <h1 className="page-title">Welcome back! 👋</h1>
              <p className="page-subtitle">Here's what's happening with your leads today</p>
            </div>
            
            <button className="btn-primary btn-new-lead" onClick={() => navigate('/lead/new')}>
              <span>➕</span>
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

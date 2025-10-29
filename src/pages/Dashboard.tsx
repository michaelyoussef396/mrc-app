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
              <span>New Lead</span>
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
              <button className="action-card" onClick={() => navigate('/inspection/select-lead')}>
                <div className="action-icon blue">📝</div>
                <div className="action-content">
                  <h3 className="action-title">Start Inspection</h3>
                  <p className="action-description">Create new mould inspection</p>
                </div>
              </button>

              <button className="action-card" onClick={() => navigate('/leads')}>
                <div className="action-icon green">👥</div>
                <div className="action-content">
                  <h3 className="action-title">View All Leads</h3>
                  <p className="action-description">Manage lead pipeline</p>
                </div>
              </button>

              <button className="action-card" onClick={() => navigate('/calendar')}>
                <div className="action-icon purple">📅</div>
                <div className="action-content">
                  <h3 className="action-title">Calendar</h3>
                  <p className="action-description">View scheduled jobs</p>
                </div>
              </button>

              <button className="action-card" onClick={() => navigate('/reports')}>
                <div className="action-icon orange">📊</div>
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

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const Settings = () => {
  const navigate = useNavigate()
  
  const [activeTab, setActiveTab] = useState('profile')
  const [saving, setSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  // Profile settings
  const [profile, setProfile] = useState({
    name: 'John Smith',
    email: 'john@mouldrestoration.com.au',
    phone: '0412 345 678',
    role: 'Technician',
    avatar: null
  })

  // Business settings
  const [business, setBusiness] = useState({
    companyName: 'Mould & Restoration Co.',
    abn: '12 345 678 901',
    address: '123 Business St, Melbourne VIC 3000',
    phone: '1300 123 456',
    email: 'info@mouldrestoration.com.au',
    website: 'www.mouldrestoration.com.au',
    operatingHours: '7:00 AM - 7:00 PM',
    serviceArea: 'Melbourne Metro'
  })

  // Notification settings
  const [notifications, setNotifications] = useState({
    emailNewLead: true,
    emailJobBooked: true,
    emailJobComplete: false,
    smsNewLead: true,
    smsJobBooked: true,
    smsJobComplete: false,
    pushNewLead: true,
    pushJobBooked: true,
    pushJobComplete: true,
    pushReminders: true
  })

  // Team settings
  const [team, setTeam] = useState([
    {
      id: 1,
      name: 'Tech 1',
      email: 'tech1@mouldrestoration.com.au',
      phone: '0400 111 222',
      role: 'Lead Technician',
      active: true
    },
    {
      id: 2,
      name: 'Tech 2',
      email: 'tech2@mouldrestoration.com.au',
      phone: '0400 333 444',
      role: 'Technician',
      active: true
    }
  ])

  // Integration settings
  const [integrations, setIntegrations] = useState({
    googleCalendar: false,
    outlookCalendar: false,
    xero: false,
    quickbooks: false,
    stripe: false
  })

  const handleSave = async () => {
    setSaving(true)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // TODO: Save to Supabase
    console.log('Saving settings:', { profile, business, notifications, team, integrations })
    
    setSaving(false)
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 3000)
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'business', label: 'Business', icon: '🏢' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'team', label: 'Team', icon: '👥' },
    { id: 'integrations', label: 'Integrations', icon: '🔗' },
    { id: 'account', label: 'Account', icon: '⚙️' }
  ]

  return (
    <div className="settings-page">
      
      {/* Navigation */}
      <nav className="settings-nav">
        <div className="nav-container">
          <button className="back-btn" onClick={() => navigate('/dashboard')}>
            <span className="back-arrow">←</span>
            <span>Dashboard</span>
          </button>
          
          <div className="nav-title">
            <span className="nav-icon">⚙️</span>
            <span>Settings</span>
          </div>
          
          <button 
            className="btn-save"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <>
                <div className="btn-spinner"></div>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <span>✓</span>
                <span>Save</span>
              </>
            )}
          </button>
        </div>
      </nav>

      {/* Success Message */}
      {showSuccess && (
        <div className="success-banner">
          <span className="success-icon">✓</span>
          <span className="success-text">Settings saved successfully!</span>
        </div>
      )}

      {/* Main Content */}
      <main className="settings-main">
        <div className="settings-container">
          
          {/* Sidebar Tabs */}
          <div className="settings-sidebar">
            <div className="sidebar-tabs">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  className={`sidebar-tab ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <span className="tab-icon">{tab.icon}</span>
                  <span className="tab-label">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Content Area */}
          <div className="settings-content">
            
            {/* PROFILE TAB */}
            {activeTab === 'profile' && (
              <div className="settings-section">
                <div className="section-header">
                  <h2 className="section-title">Profile Settings</h2>
                  <p className="section-subtitle">Manage your personal information</p>
                </div>

                <div className="settings-card">
                  <div className="avatar-section">
                    <div className="avatar-preview">
                      {profile.avatar ? (
                        <img src={profile.avatar} alt="Profile" />
                      ) : (
                        <div className="avatar-placeholder">
                          {profile.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="avatar-actions">
                      <button className="btn-upload">
                        <span>📸</span>
                        <span>Upload Photo</span>
                      </button>
                      <button className="btn-remove">Remove</button>
                    </div>
                  </div>

                  <div className="form-grid">
                    <div className="form-group full-width">
                      <label className="form-label">Full Name *</label>
                      <input
                        type="text"
                        value={profile.name}
                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                        className="form-input"
                        placeholder="John Smith"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Email Address *</label>
                      <input
                        type="email"
                        value={profile.email}
                        onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                        className="form-input"
                        placeholder="john@email.com"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Phone Number *</label>
                      <input
                        type="tel"
                        value={profile.phone}
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                        className="form-input"
                        placeholder="04XX XXX XXX"
                      />
                    </div>

                    <div className="form-group full-width">
                      <label className="form-label">Role</label>
                      <select
                        value={profile.role}
                        onChange={(e) => setProfile({ ...profile, role: e.target.value })}
                        className="form-select"
                      >
                        <option value="Owner">Owner</option>
                        <option value="Lead Technician">Lead Technician</option>
                        <option value="Technician">Technician</option>
                        <option value="Admin">Admin</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="settings-card">
                  <h3 className="card-title">Change Password</h3>
                  <div className="form-grid">
                    <div className="form-group full-width">
                      <label className="form-label">Current Password</label>
                      <input
                        type="password"
                        className="form-input"
                        placeholder="Enter current password"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">New Password</label>
                      <input
                        type="password"
                        className="form-input"
                        placeholder="Enter new password"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Confirm New Password</label>
                      <input
                        type="password"
                        className="form-input"
                        placeholder="Confirm new password"
                      />
                    </div>
                  </div>
                  <button className="btn-secondary">
                    Update Password
                  </button>
                </div>
              </div>
            )}

            {/* BUSINESS TAB */}
            {activeTab === 'business' && (
              <div className="settings-section">
                <div className="section-header">
                  <h2 className="section-title">Business Information</h2>
                  <p className="section-subtitle">Manage your company details</p>
                </div>

                <div className="settings-card">
                  <div className="form-grid">
                    <div className="form-group full-width">
                      <label className="form-label">Company Name *</label>
                      <input
                        type="text"
                        value={business.companyName}
                        onChange={(e) => setBusiness({ ...business, companyName: e.target.value })}
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">ABN *</label>
                      <input
                        type="text"
                        value={business.abn}
                        onChange={(e) => setBusiness({ ...business, abn: e.target.value })}
                        className="form-input"
                        placeholder="12 345 678 901"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Business Phone *</label>
                      <input
                        type="tel"
                        value={business.phone}
                        onChange={(e) => setBusiness({ ...business, phone: e.target.value })}
                        className="form-input"
                        placeholder="1300 XXX XXX"
                      />
                    </div>

                    <div className="form-group full-width">
                      <label className="form-label">Business Address *</label>
                      <input
                        type="text"
                        value={business.address}
                        onChange={(e) => setBusiness({ ...business, address: e.target.value })}
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Email Address *</label>
                      <input
                        type="email"
                        value={business.email}
                        onChange={(e) => setBusiness({ ...business, email: e.target.value })}
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Website</label>
                      <input
                        type="text"
                        value={business.website}
                        onChange={(e) => setBusiness({ ...business, website: e.target.value })}
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Operating Hours</label>
                      <input
                        type="text"
                        value={business.operatingHours}
                        onChange={(e) => setBusiness({ ...business, operatingHours: e.target.value })}
                        className="form-input"
                        placeholder="7:00 AM - 7:00 PM"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Service Area</label>
                      <input
                        type="text"
                        value={business.serviceArea}
                        onChange={(e) => setBusiness({ ...business, serviceArea: e.target.value })}
                        className="form-input"
                        placeholder="Melbourne Metro"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* NOTIFICATIONS TAB */}
            {activeTab === 'notifications' && (
              <div className="settings-section">
                <div className="section-header">
                  <h2 className="section-title">Notification Preferences</h2>
                  <p className="section-subtitle">Choose how you want to be notified</p>
                </div>

                <div className="settings-card">
                  <h3 className="card-title">Email Notifications</h3>
                  <div className="toggle-list">
                    <div className="toggle-item">
                      <div className="toggle-info">
                        <h4 className="toggle-title">New Lead</h4>
                        <p className="toggle-description">Receive email when a new lead is created</p>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={notifications.emailNewLead}
                          onChange={(e) => setNotifications({ ...notifications, emailNewLead: e.target.checked })}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>

                    <div className="toggle-item">
                      <div className="toggle-info">
                        <h4 className="toggle-title">Job Booked</h4>
                        <p className="toggle-description">Receive email when a job is booked</p>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={notifications.emailJobBooked}
                          onChange={(e) => setNotifications({ ...notifications, emailJobBooked: e.target.checked })}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>

                    <div className="toggle-item">
                      <div className="toggle-info">
                        <h4 className="toggle-title">Job Complete</h4>
                        <p className="toggle-description">Receive email when a job is completed</p>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={notifications.emailJobComplete}
                          onChange={(e) => setNotifications({ ...notifications, emailJobComplete: e.target.checked })}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="settings-card">
                  <h3 className="card-title">SMS Notifications</h3>
                  <div className="toggle-list">
                    <div className="toggle-item">
                      <div className="toggle-info">
                        <h4 className="toggle-title">New Lead</h4>
                        <p className="toggle-description">Receive SMS for new leads</p>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={notifications.smsNewLead}
                          onChange={(e) => setNotifications({ ...notifications, smsNewLead: e.target.checked })}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>

                    <div className="toggle-item">
                      <div className="toggle-info">
                        <h4 className="toggle-title">Job Booked</h4>
                        <p className="toggle-description">Receive SMS when job is booked</p>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={notifications.smsJobBooked}
                          onChange={(e) => setNotifications({ ...notifications, smsJobBooked: e.target.checked })}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="settings-card">
                  <h3 className="card-title">Push Notifications</h3>
                  <div className="toggle-list">
                    <div className="toggle-item">
                      <div className="toggle-info">
                        <h4 className="toggle-title">New Lead</h4>
                        <p className="toggle-description">In-app notifications for new leads</p>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={notifications.pushNewLead}
                          onChange={(e) => setNotifications({ ...notifications, pushNewLead: e.target.checked })}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>

                    <div className="toggle-item">
                      <div className="toggle-info">
                        <h4 className="toggle-title">Job Booked</h4>
                        <p className="toggle-description">In-app notifications for bookings</p>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={notifications.pushJobBooked}
                          onChange={(e) => setNotifications({ ...notifications, pushJobBooked: e.target.checked })}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>

                    <div className="toggle-item">
                      <div className="toggle-info">
                        <h4 className="toggle-title">Reminders</h4>
                        <p className="toggle-description">Appointment and task reminders</p>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={notifications.pushReminders}
                          onChange={(e) => setNotifications({ ...notifications, pushReminders: e.target.checked })}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TEAM TAB */}
            {activeTab === 'team' && (
              <div className="settings-section">
                <div className="section-header">
                  <h2 className="section-title">Team Management</h2>
                  <p className="section-subtitle">Manage team members and permissions</p>
                </div>

                <div className="settings-card">
                  <div className="card-header-actions">
                    <h3 className="card-title">Team Members</h3>
                    <button className="btn-primary btn-sm">
                      <span>+</span>
                      <span>Add Member</span>
                    </button>
                  </div>

                  <div className="team-list">
                    {team.map(member => (
                      <div key={member.id} className="team-member-card">
                        <div className="member-avatar">
                          {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </div>
                        <div className="member-info">
                          <h4 className="member-name">{member.name}</h4>
                          <p className="member-role">{member.role}</p>
                          <p className="member-contact">
                            {member.email} • {member.phone}
                          </p>
                        </div>
                        <div className="member-actions">
                          <span className={`status-badge ${member.active ? 'active' : 'inactive'}`}>
                            {member.active ? '✓ Active' : '✕ Inactive'}
                          </span>
                          <button className="btn-icon" title="Edit">
                            ✏️
                          </button>
                          <button className="btn-icon" title="Remove">
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* INTEGRATIONS TAB */}
            {activeTab === 'integrations' && (
              <div className="settings-section">
                <div className="section-header">
                  <h2 className="section-title">Integrations</h2>
                  <p className="section-subtitle">Connect with external services</p>
                </div>

                <div className="integration-grid">
                  <div className="integration-card">
                    <div className="integration-icon">📅</div>
                    <div className="integration-info">
                      <h3 className="integration-name">Google Calendar</h3>
                      <p className="integration-description">Sync jobs with Google Calendar</p>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={integrations.googleCalendar}
                        onChange={(e) => setIntegrations({ ...integrations, googleCalendar: e.target.checked })}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  <div className="integration-card">
                    <div className="integration-icon">📆</div>
                    <div className="integration-info">
                      <h3 className="integration-name">Outlook Calendar</h3>
                      <p className="integration-description">Sync with Outlook Calendar</p>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={integrations.outlookCalendar}
                        onChange={(e) => setIntegrations({ ...integrations, outlookCalendar: e.target.checked })}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  <div className="integration-card">
                    <div className="integration-icon">💰</div>
                    <div className="integration-info">
                      <h3 className="integration-name">Xero</h3>
                      <p className="integration-description">Accounting integration</p>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={integrations.xero}
                        onChange={(e) => setIntegrations({ ...integrations, xero: e.target.checked })}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  <div className="integration-card">
                    <div className="integration-icon">📊</div>
                    <div className="integration-info">
                      <h3 className="integration-name">QuickBooks</h3>
                      <p className="integration-description">Accounting and invoicing</p>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={integrations.quickbooks}
                        onChange={(e) => setIntegrations({ ...integrations, quickbooks: e.target.checked })}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  <div className="integration-card">
                    <div className="integration-icon">💳</div>
                    <div className="integration-info">
                      <h3 className="integration-name">Stripe</h3>
                      <p className="integration-description">Payment processing</p>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={integrations.stripe}
                        onChange={(e) => setIntegrations({ ...integrations, stripe: e.target.checked })}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* ACCOUNT TAB */}
            {activeTab === 'account' && (
              <div className="settings-section">
                <div className="section-header">
                  <h2 className="section-title">Account Settings</h2>
                  <p className="section-subtitle">Manage your account and data</p>
                </div>

                <div className="settings-card">
                  <h3 className="card-title">Plan & Billing</h3>
                  <div className="plan-info">
                    <div className="plan-badge">Professional Plan</div>
                    <p className="plan-price">$99/month</p>
                    <p className="plan-description">
                      Unlimited leads, 2 team members, all integrations
                    </p>
                    <button className="btn-secondary">Manage Subscription</button>
                  </div>
                </div>

                <div className="settings-card">
                  <h3 className="card-title">Data & Privacy</h3>
                  <div className="action-list">
                    <button className="action-item">
                      <span className="action-icon">📥</span>
                      <div className="action-info">
                        <h4 className="action-title">Export Data</h4>
                        <p className="action-description">Download all your data</p>
                      </div>
                      <span className="action-arrow">→</span>
                    </button>

                    <button className="action-item">
                      <span className="action-icon">🔒</span>
                      <div className="action-info">
                        <h4 className="action-title">Privacy Settings</h4>
                        <p className="action-description">Manage data privacy</p>
                      </div>
                      <span className="action-arrow">→</span>
                    </button>
                  </div>
                </div>

                <div className="settings-card danger-card">
                  <h3 className="card-title">Danger Zone</h3>
                  <div className="action-list">
                    <button className="action-item danger">
                      <span className="action-icon">⚠️</span>
                      <div className="action-info">
                        <h4 className="action-title">Delete Account</h4>
                        <p className="action-description">Permanently delete your account and all data</p>
                      </div>
                      <span className="action-arrow">→</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>
      </main>
    </div>
  )
}

export default Settings

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Download, Share2, Calendar, TrendingUp, TrendingDown, DollarSign,
  CheckCircle, Users, BarChart2, PieChart, MapPin, Clock, AlertTriangle,
  FileText, Eye, RefreshCw, ChevronRight, Mail, Phone, Home, Search, X,
  Printer, Activity, Target, Sparkles, Package, Award, Lightbulb, ArrowUp, ArrowDown, Minus
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import './ReportsPage.css';

export const ReportsPage = () => {
  const navigate = useNavigate();
  const [dateFrom, setDateFrom] = useState('2025-10-01');
  const [dateTo, setDateTo] = useState('2025-10-30');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [showReportModal, setShowReportModal] = useState(false);

  // Mock Data
  const kpiData = {
    totalRevenue: { value: 42580, change: 18, trend: 'up' },
    jobsCompleted: { value: 186, change: 12, trend: 'up', completionRate: 94 },
    avgJobValue: { value: 229, change: -3, trend: 'down', benchmark: 250 },
    revenueGrowth: { value: 18, trend: 'up' }
  };

  const leadSources = [
    { name: 'Google Search', count: 124, percentage: 42, revenue: 18560, color: '#007AFF' },
    { name: 'Referrals', count: 83, percentage: 28, revenue: 12340, color: '#34C759' },
    { name: 'Repeat Customers', count: 53, percentage: 18, revenue: 8920, color: '#FF9500' },
    { name: 'Facebook Ads', count: 24, percentage: 8, revenue: 2160, color: '#AF52DE' },
    { name: 'Direct/Walk-in', count: 12, percentage: 4, revenue: 600, color: '#FF3B30' }
  ];

  const topSuburbs = [
    { name: 'Toorak', jobs: 42, revenue: 9680, rank: 1 },
    { name: 'Brighton', jobs: 38, revenue: 8540, rank: 2 },
    { name: 'Kew', jobs: 34, revenue: 7890, rank: 3 },
    { name: 'South Yarra', jobs: 28, revenue: 6440, rank: 4 },
    { name: 'Richmond', jobs: 24, revenue: 5280, rank: 5 }
  ];

  const serviceTypes = [
    { name: 'Mould Inspection', count: 124, percentage: 45, revenue: 18600, avgDuration: 2.5, color: '#007AFF' },
    { name: 'Mould Remediation', count: 86, percentage: 31, revenue: 19780, avgDuration: 6.8, color: '#34C759' },
    { name: 'Water Damage', count: 42, percentage: 15, revenue: 6300, avgDuration: 4.2, color: '#FF9500' },
    { name: 'Follow-up Inspection', count: 34, percentage: 9, revenue: 2720, avgDuration: 1.5, color: '#AF52DE' }
  ];

  const outstandingInvoices = [
    { invoice: 'INS-2025-038', client: 'Lisa Brown', amount: 3200, days: 45, status: 'overdue' },
    { invoice: 'INS-2025-041', client: 'Tom Anderson', amount: 2450, days: 32, status: 'overdue' },
    { invoice: 'INS-2025-043', client: 'Sarah Lee', amount: 2770, days: 28, status: 'due-soon' },
    { invoice: 'INS-2025-045', client: 'Mike Davis', amount: 3100, days: 15, status: 'recent' },
  ];

  const monthlyPerformance = [
    { month: 'Sep', revenue: 95000, jobs: 32 },
    { month: 'Oct', revenue: 108000, jobs: 35 },
    { month: 'Nov', revenue: 121000, jobs: 38 },
    { month: 'Dec', revenue: 135000, jobs: 41 },
    { month: 'Jan', revenue: 142000, jobs: 43 },
    { month: 'Feb', revenue: 127000, jobs: 38 },
    { month: 'Mar', revenue: 156432, jobs: 45 },
  ];

  const profitAnalysis = {
    revenue: 156432,
    costs: {
      labor: 62573,
      equipment: 8450,
      materials: 11520,
      overhead: 15643,
      marketing: 4693,
    },
    netProfit: 53553,
    profitMargin: 34,
  };

  const equipment = [
    { name: 'Dehumidifiers', units: 4, usage: 87, revenue: 10296, inUse: 2, available: 2 },
    { name: 'Air Movers', units: 8, usage: 74, revenue: 8096, inUse: 5, available: 3 },
    { name: 'RCD Boxes', units: 6, usage: 65, revenue: 600, inUse: 4, available: 2 },
  ];

  const technicians = [
    { name: 'Sarah Martinez', jobs: 25, revenue: 87450, avg: 3498, rating: 4.9 },
    { name: 'Michael Chen', jobs: 20, revenue: 68982, avg: 3449, rating: 4.8 },
  ];

  const completedJobs = [
    {
      id: 'INS-2025-1234',
      customer: { name: 'John Doe', email: 'john@email.com', phone: '0412 345 678', initials: 'JD' },
      property: { address: '123 Smith Street', suburb: 'Toorak', postcode: '3000' },
      inspection: { date: '2025-10-28', time: '10:30 AM', duration: 2.5, technician: 'Admin User', weather: 'Clear', temperature: 22, humidity: 65 },
      service: { type: 'Mould Inspection', severity: 'Medium', affectedAreas: ['Bathroom', 'Kitchen', 'Bedroom 1'] },
      financial: { labour: 200, equipment: 150, materials: 100, subtotal: 450, gst: 45, total: 495 },
      findings: 'Moderate mould growth observed in bathroom ceiling and kitchen backsplash. Evidence of water damage from roof leak.',
      recommendations: 'Complete mould removal and treatment, repair roof leak, improve ventilation in bathroom.',
      photos: [{ id: 1, caption: 'Bathroom ceiling mould' }, { id: 2, caption: 'Kitchen backsplash' }],
      status: 'Completed',
      paymentStatus: 'Paid'
    },
    {
      id: 'INS-2025-1235',
      customer: { name: 'Sarah Smith', email: 'sarah@email.com', phone: '0423 456 789', initials: 'SS' },
      property: { address: '456 Beach Road', suburb: 'Brighton', postcode: '3186' },
      inspection: { date: '2025-10-27', time: '2:00 PM', duration: 3.0, technician: 'Admin User', weather: 'Cloudy', temperature: 19, humidity: 72 },
      service: { type: 'Mould Remediation', severity: 'High', affectedAreas: ['Living Room', 'Master Bedroom'] },
      financial: { labour: 480, equipment: 220, materials: 180, subtotal: 880, gst: 88, total: 968 },
      findings: 'Extensive mould growth due to burst pipe.',
      recommendations: 'Full remediation including drywall removal and structural treatment.',
      photos: [],
      status: 'Completed',
      paymentStatus: 'Paid'
    }
  ];

  const filteredJobs = completedJobs.filter(job => 
    job.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.property.suburb.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.service.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="reports-page">
      
      {/* Header */}
      <div className="reports-header">
        <div className="header-container">
          <div className="header-top">
            <div className="header-left">
              <button className="back-btn" onClick={() => navigate(-1)}>
                <ArrowLeft size={20} strokeWidth={2} />
              </button>
              <div className="header-titles">
                <h1 className="page-title">Reports & Analytics</h1>
                <p className="page-subtitle">Business insights and performance metrics</p>
              </div>
            </div>
            <div className="header-actions">
              <button className="header-btn secondary">
                <Printer size={18} strokeWidth={2} />
                <span>Print</span>
              </button>
              <button className="header-btn secondary">
                <Share2 size={18} strokeWidth={2} />
                <span>Share</span>
              </button>
              <button className="header-btn primary">
                <Download size={18} strokeWidth={2} />
                <span>Export PDF</span>
              </button>
            </div>
          </div>

          <div className="filters-section">
            <div className="date-range">
              <div className="date-input-group">
                <Calendar size={16} strokeWidth={2} className="input-icon" />
                <input type="date" className="date-input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <span className="date-separator">to</span>
              <div className="date-input-group">
                <Calendar size={16} strokeWidth={2} className="input-icon" />
                <input type="date" className="date-input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
            </div>
            <button className="refresh-btn"><RefreshCw size={18} strokeWidth={2} /></button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-section">
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-header">
              <div className="kpi-label">
                <span className="kpi-title">Total Revenue</span>
                <span className="kpi-period">Last 30 days</span>
              </div>
              <div className="kpi-icon blue"><DollarSign size={24} strokeWidth={2} /></div>
            </div>
            <div className="kpi-value">${kpiData.totalRevenue.value.toLocaleString()}</div>
            <div className="kpi-footer">
              <div className={`kpi-change ${kpiData.totalRevenue.trend}`}>
                <TrendingUp size={16} strokeWidth={2} />
                <span>{kpiData.totalRevenue.change}% from last period</span>
              </div>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-header">
              <div className="kpi-label">
                <span className="kpi-title">Jobs Completed</span>
                <span className="kpi-period">Last 30 days</span>
              </div>
              <div className="kpi-icon green"><CheckCircle size={24} strokeWidth={2} /></div>
            </div>
            <div className="kpi-value">{kpiData.jobsCompleted.value}</div>
            <div className="kpi-footer">
              <div className={`kpi-change ${kpiData.jobsCompleted.trend}`}>
                <TrendingUp size={16} strokeWidth={2} />
                <span>{kpiData.jobsCompleted.change}% increase</span>
              </div>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-header">
              <div className="kpi-label">
                <span className="kpi-title">Avg Job Value</span>
                <span className="kpi-period">Last 30 days</span>
              </div>
              <div className="kpi-icon orange"><Target size={24} strokeWidth={2} /></div>
            </div>
            <div className="kpi-value">${kpiData.avgJobValue.value}</div>
            <div className="kpi-footer">
              <div className={`kpi-change ${kpiData.avgJobValue.trend}`}>
                <TrendingDown size={16} strokeWidth={2} />
                <span>{Math.abs(kpiData.avgJobValue.change)}% from last period</span>
              </div>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-header">
              <div className="kpi-label">
                <span className="kpi-title">Revenue Growth</span>
                <span className="kpi-period">Month over month</span>
              </div>
              <div className="kpi-icon purple"><TrendingUp size={24} strokeWidth={2} /></div>
            </div>
            <div className="kpi-value">{kpiData.revenueGrowth.value}%</div>
            <div className="kpi-footer">
              <div className={`kpi-change ${kpiData.revenueGrowth.trend}`}>
                <Sparkles size={16} strokeWidth={2} />
                <span>Strong upward trend</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Tabs */}
      <div className="analytics-section">
        <Tabs defaultValue="overview" className="analytics-tabs">
          <TabsList className="tabs-list">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
            <TabsTrigger value="operations">Operations</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="tab-content">
            <div className="analytics-grid">

              <div className="analytics-card full-width">
                <div className="card-header">
                  <div className="card-title">
                    <TrendingUp size={22} strokeWidth={2} />
                    <span>Monthly Performance</span>
                  </div>
                </div>
                <div className="monthly-chart">
                  <div className="chart-bars">
                    {monthlyPerformance.map((month) => (
                      <div key={month.month} className="chart-bar-col">
                        <div className="bar-label-top">{month.jobs}</div>
                        <div 
                          className="bar-fill" 
                          style={{ height: `${(month.revenue / Math.max(...monthlyPerformance.map(m => m.revenue))) * 100}%` }}
                        ></div>
                        <div className="bar-label">{month.month}</div>
                        <div className="bar-value">${(month.revenue / 1000).toFixed(0)}k</div>
                      </div>
                    ))}
                  </div>
                  <div className="chart-insights">
                    <div className="insight-item">
                      <span className="insight-label">Trend</span>
                      <div className="insight-value positive">
                        <TrendingUp size={14} strokeWidth={2} />
                        Growth trajectory positive
                      </div>
                    </div>
                    <div className="insight-item">
                      <span className="insight-label">Best Month</span>
                      <span className="insight-value">March 2025 ($156,432)</span>
                    </div>
                    <div className="insight-item">
                      <span className="insight-label">Avg Monthly</span>
                      <span className="insight-value">$126,285</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="analytics-card">
                <div className="card-header">
                  <div className="card-title">
                    <PieChart size={22} strokeWidth={2} />
                    <span>Lead Sources</span>
                  </div>
                </div>
                <div className="lead-sources">
                  {leadSources.map((source, idx) => (
                    <div key={idx} className="lead-source-item">
                      <div className="source-left">
                        <div className="source-indicator" style={{ backgroundColor: source.color }}></div>
                        <div className="source-info">
                          <span className="source-name">{source.name}</span>
                          <span className="source-count">{source.count} leads</span>
                        </div>
                      </div>
                      <div className="source-right">
                        <span className="source-percentage">{source.percentage}%</span>
                        <span className="source-revenue">${source.revenue.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="insight-box">
                  <Sparkles size={16} strokeWidth={2} />
                  <span>Google Search generates highest quality leads</span>
                </div>
              </div>

              <div className="analytics-card">
                <div className="card-header">
                  <div className="card-title">
                    <MapPin size={22} strokeWidth={2} />
                    <span>Top Suburbs</span>
                  </div>
                </div>
                <div className="suburbs-list">
                  {topSuburbs.map((suburb, idx) => (
                    <div key={idx} className="suburb-item">
                      <div className="suburb-rank">{suburb.rank === 1 ? '🏆' : suburb.rank === 2 ? '🥈' : suburb.rank === 3 ? '🥉' : suburb.rank}</div>
                      <div className="suburb-info">
                        <span className="suburb-name">{suburb.name}</span>
                        <span className="suburb-jobs">{suburb.jobs} jobs</span>
                      </div>
                      <div className="suburb-revenue">${suburb.revenue.toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="analytics-card">
                <div className="card-header">
                  <div className="card-title">
                    <Activity size={22} strokeWidth={2} />
                    <span>Service Types</span>
                  </div>
                </div>
                <div className="services-list">
                  {serviceTypes.map((service, idx) => (
                    <div key={idx} className="service-item">
                      <div className="service-header">
                        <div className="service-info">
                          <span className="service-name">{service.name}</span>
                          <span className="service-stats">{service.count} jobs • {service.percentage}%</span>
                        </div>
                        <span className="service-revenue">${service.revenue.toLocaleString()}</span>
                      </div>
                      <div className="service-bar">
                        <div className="service-bar-fill" style={{ width: `${service.percentage}%`, backgroundColor: service.color }}></div>
                      </div>
                      <div className="service-meta">
                        <Clock size={12} strokeWidth={2} />
                        <span>Avg {service.avgDuration} hours</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="financial" className="tab-content">
            <div className="analytics-grid">
              <div className="analytics-card">
                <div className="card-header">
                  <div className="card-title">
                    <AlertTriangle size={22} strokeWidth={2} />
                    <span>Outstanding Invoices</span>
                  </div>
                </div>
                <div className="invoices-list">
                  {outstandingInvoices.map((invoice, idx) => (
                    <div key={idx} className={`invoice-item ${invoice.status}`}>
                      <div className="invoice-left">
                        <div className="invoice-id">{invoice.invoice}</div>
                        <div className="invoice-client">{invoice.client}</div>
                      </div>
                      <div className="invoice-right">
                        <div className="invoice-amount">${invoice.amount.toLocaleString()}</div>
                        <div className="invoice-days">{invoice.days} days</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="analytics-card">
                <div className="card-header">
                  <div className="card-title">
                    <DollarSign size={22} strokeWidth={2} />
                    <span>Profit Analysis</span>
                  </div>
                </div>
                <div className="profit-breakdown">
                  <div className="profit-row">
                    <span className="profit-label">Total Revenue</span>
                    <span className="profit-value">${profitAnalysis.revenue.toLocaleString()}</span>
                  </div>
                  <div className="profit-section">
                    <div className="profit-row sub">
                      <span className="profit-label">Labor</span>
                      <span className="profit-value">${profitAnalysis.costs.labor.toLocaleString()}</span>
                    </div>
                    <div className="profit-row sub">
                      <span className="profit-label">Equipment</span>
                      <span className="profit-value">${profitAnalysis.costs.equipment.toLocaleString()}</span>
                    </div>
                    <div className="profit-row sub">
                      <span className="profit-label">Materials</span>
                      <span className="profit-value">${profitAnalysis.costs.materials.toLocaleString()}</span>
                    </div>
                    <div className="profit-row sub">
                      <span className="profit-label">Overhead</span>
                      <span className="profit-value">${profitAnalysis.costs.overhead.toLocaleString()}</span>
                    </div>
                    <div className="profit-row sub">
                      <span className="profit-label">Marketing</span>
                      <span className="profit-value">${profitAnalysis.costs.marketing.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="profit-row total">
                    <span className="profit-label">Net Profit</span>
                    <span className="profit-value">${profitAnalysis.netProfit.toLocaleString()}</span>
                  </div>
                  <div className="profit-margin">
                    <span className="margin-label">Profit Margin</span>
                    <span className="margin-value">{profitAnalysis.profitMargin}%</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="operations" className="tab-content">
            <div className="analytics-grid">
              <div className="analytics-card">
                <div className="card-header">
                  <div className="card-title">
                    <Package size={22} strokeWidth={2} />
                    <span>Equipment Utilization</span>
                  </div>
                </div>
                <div className="equipment-list">
                  {equipment.map((item, idx) => (
                    <div key={idx} className="equipment-item">
                      <div className="equipment-header">
                        <span className="equipment-name">{item.name}</span>
                        <span className="equipment-units">{item.inUse} / {item.units} in use</span>
                      </div>
                      <Progress value={item.usage} className="equipment-progress" />
                      <div className="equipment-footer">
                        <span className="equipment-usage">{item.usage}% utilization</span>
                        <span className="equipment-revenue">${item.revenue.toLocaleString()} revenue</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="analytics-card">
                <div className="card-header">
                  <div className="card-title">
                    <Lightbulb size={22} strokeWidth={2} />
                    <span>Insights & Recommendations</span>
                  </div>
                </div>
                <div className="insights-section">
                  <div className="insight-group">
                    <h4 className="insight-group-title positive">
                      <CheckCircle size={18} strokeWidth={2} />
                      Strong Performance
                    </h4>
                    <ul className="insight-list">
                      <li>Revenue up 23% month-over-month</li>
                      <li>Profit margin improved to 34%</li>
                      <li>Conversion rate above industry average</li>
                      <li>High equipment utilization (87%)</li>
                    </ul>
                  </div>
                  <div className="insight-group">
                    <h4 className="insight-group-title warning">
                      <AlertTriangle size={18} strokeWidth={2} />
                      Areas for Attention
                    </h4>
                    <ul className="insight-list">
                      <li>7 invoices overdue (total $8,420)</li>
                      <li>Equipment demand exceeding supply</li>
                      <li>Follow-up on outstanding payments</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="team" className="tab-content">
            <div className="analytics-grid">
              <div className="analytics-card full-width">
                <div className="card-header">
                  <div className="card-title">
                    <Award size={22} strokeWidth={2} />
                    <span>Technician Performance</span>
                  </div>
                </div>
                <div className="technicians-list">
                  {technicians.map((tech, idx) => (
                    <div key={idx} className="technician-item">
                      <div className="tech-avatar">{tech.name.split(' ').map(n => n[0]).join('')}</div>
                      <div className="tech-info">
                        <div className="tech-name">{tech.name}</div>
                        <div className="tech-stats">
                          <span>{tech.jobs} jobs</span>
                          <span>•</span>
                          <span>${tech.revenue.toLocaleString()} revenue</span>
                          <span>•</span>
                          <span>${tech.avg} avg</span>
                        </div>
                      </div>
                      <div className="tech-rating">
                        <Award size={16} strokeWidth={2} />
                        <span>{tech.rating}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Completed Jobs */}
      <div className="completed-jobs-section">
        <div className="section-header">
          <div className="section-title">
            <FileText size={24} strokeWidth={2} />
            <div>
              <h2>Completed Jobs</h2>
              <p>Click any job to view full inspection report</p>
            </div>
          </div>
          <div className="section-meta">Showing {filteredJobs.length} of {completedJobs.length} jobs</div>
        </div>

        <div className="jobs-search">
          <Search size={18} strokeWidth={2} className="search-icon" />
          <input 
            type="text" 
            className="search-input" 
            placeholder="Search by customer, suburb, or service..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && <button className="clear-search" onClick={() => setSearchQuery('')}><X size={16} strokeWidth={2} /></button>}
        </div>

        <div className="jobs-grid">
          {filteredJobs.map((job) => (
            <div key={job.id} className="job-card" onClick={() => { setSelectedJob(job); setShowReportModal(true); }}>
              <div className="job-card-header">
                <div className="customer-avatar">{job.customer.initials}</div>
                <div className="customer-info">
                  <span className="customer-name">{job.customer.name}</span>
                  <span className="customer-contact">
                    <Mail size={12} strokeWidth={2} />
                    {job.customer.email}
                  </span>
                </div>
              </div>
              <div className="job-card-body">
                <div className="job-detail">
                  <MapPin size={16} strokeWidth={2} />
                  <span>{job.property.address}, {job.property.suburb}</span>
                </div>
                <div className="job-detail">
                  <Calendar size={16} strokeWidth={2} />
                  <span>{job.inspection.date}</span>
                  <span className="detail-separator">•</span>
                  <Clock size={16} strokeWidth={2} />
                  <span>{job.inspection.time}</span>
                </div>
                <div className="job-detail">
                  <Activity size={16} strokeWidth={2} />
                  <span>{job.service.type}</span>
                </div>
                <div className="job-severity">
                  <AlertTriangle size={14} strokeWidth={2} />
                  <span>{job.service.severity} Severity</span>
                </div>
              </div>
              <div className="job-card-footer">
                <div className="job-revenue">
                  <DollarSign size={18} strokeWidth={2} />
                  <span>${job.financial.total.toLocaleString()}</span>
                </div>
                <button className="view-report-btn">
                  View Report
                  <ChevronRight size={16} strokeWidth={2} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Report Modal */}
      {showReportModal && selectedJob && (
        <div className="modal-overlay" onClick={() => setShowReportModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <button className="modal-back" onClick={() => setShowReportModal(false)}>
                <ArrowLeft size={20} strokeWidth={2} />
                <span>Back to Reports</span>
              </button>
              <button className="modal-download">
                <Download size={18} strokeWidth={2} />
                <span>Download PDF</span>
              </button>
            </div>

            <div className="modal-body">
              <div className="report-title-section">
                <h1 className="report-title">Inspection Report</h1>
                <span className="report-id">{selectedJob.id}</span>
              </div>

              <div className="report-section">
                <h3 className="section-heading">
                  <Users size={20} strokeWidth={2} />
                  Customer Information
                </h3>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Name</span>
                    <span className="info-value">{selectedJob.customer.name}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Email</span>
                    <span className="info-value">
                      <Mail size={14} strokeWidth={2} />
                      {selectedJob.customer.email}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Phone</span>
                    <span className="info-value">
                      <Phone size={14} strokeWidth={2} />
                      {selectedJob.customer.phone}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Property</span>
                    <span className="info-value">
                      <Home size={14} strokeWidth={2} />
                      {selectedJob.property.address}, {selectedJob.property.suburb}
                    </span>
                  </div>
                </div>
              </div>

              <div className="report-section">
                <h3 className="section-heading">
                  <FileText size={20} strokeWidth={2} />
                  Findings Summary
                </h3>
                <p className="findings-text">{selectedJob.findings}</p>
              </div>

              <div className="report-section">
                <h3 className="section-heading">
                  <Sparkles size={20} strokeWidth={2} />
                  Recommendations
                </h3>
                <p className="recommendations-text">{selectedJob.recommendations}</p>
              </div>

              <div className="report-section">
                <h3 className="section-heading">
                  <DollarSign size={20} strokeWidth={2} />
                  Cost Breakdown
                </h3>
                <div className="cost-table">
                  <div className="cost-row">
                    <span className="cost-label">Labour ({selectedJob.inspection.duration} hours)</span>
                    <span className="cost-value">${selectedJob.financial.labour}</span>
                  </div>
                  <div className="cost-row">
                    <span className="cost-label">Equipment</span>
                    <span className="cost-value">${selectedJob.financial.equipment}</span>
                  </div>
                  <div className="cost-row">
                    <span className="cost-label">Materials</span>
                    <span className="cost-value">${selectedJob.financial.materials}</span>
                  </div>
                  <div className="cost-row subtotal">
                    <span className="cost-label">Subtotal</span>
                    <span className="cost-value">${selectedJob.financial.subtotal}</span>
                  </div>
                  <div className="cost-row">
                    <span className="cost-label">GST (10%)</span>
                    <span className="cost-value">${selectedJob.financial.gst}</span>
                  </div>
                  <div className="cost-row total">
                    <span className="cost-label">TOTAL</span>
                    <span className="cost-value">${selectedJob.financial.total}</span>
                  </div>
                </div>
              </div>

              <div className="report-actions">
                <button className="action-btn secondary">
                  <Mail size={18} strokeWidth={2} />
                  Email Report
                </button>
                <button className="action-btn secondary">
                  <Printer size={18} strokeWidth={2} />
                  Print
                </button>
                <button className="action-btn primary">
                  <FileText size={18} strokeWidth={2} />
                  Generate Quote
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

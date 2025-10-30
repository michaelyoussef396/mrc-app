import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  Search,
  Filter,
  Calendar,
  Clock,
  MapPin,
  User,
  Phone,
  Mail,
  Home,
  AlertCircle,
  ChevronRight,
  CheckCircle,
  XCircle,
  Zap,
  ChevronDown
} from 'lucide-react';

export const SelectLead = () => {
  const navigate = useNavigate();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [statusOpen, setStatusOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  
  const statusRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  // Mock leads data
  const [leads] = useState([
    {
      id: 1,
      customerName: 'John Smith',
      customerEmail: 'john.smith@email.com',
      customerPhone: '0400 123 456',
      propertyAddress: '45 High Street',
      propertySuburb: 'Croydon',
      propertyPostcode: '3136',
      inspectionDate: '2025-10-31',
      inspectionTime: '09:00',
      urgency: 'Normal',
      status: 'Scheduled',
      problemDescription: 'Visible mould in bathroom ceiling and walls',
      propertyType: 'Residential',
      affectedAreas: ['Bathroom', 'Ceiling'],
    },
    {
      id: 2,
      customerName: 'Sarah Johnson',
      customerEmail: 'sarah.j@email.com',
      customerPhone: '0400 234 567',
      propertyAddress: '123 Main Road',
      propertySuburb: 'Richmond',
      propertyPostcode: '3121',
      inspectionDate: '2025-10-31',
      inspectionTime: '11:30',
      urgency: 'Urgent',
      status: 'Scheduled',
      problemDescription: 'Water damage in kitchen after pipe burst',
      propertyType: 'Residential',
      affectedAreas: ['Kitchen', 'Walls', 'Floors'],
    },
    {
      id: 3,
      customerName: 'Michael Brown',
      customerEmail: 'mbrown@business.com',
      customerPhone: '0400 345 678',
      propertyAddress: '78 Business Park Drive',
      propertySuburb: 'Clayton',
      propertyPostcode: '3168',
      inspectionDate: '2025-11-01',
      inspectionTime: '10:00',
      urgency: 'Emergency',
      status: 'Scheduled',
      problemDescription: 'Major mould outbreak in office building',
      propertyType: 'Commercial',
      affectedAreas: ['Office', 'Ceiling', 'Walls', 'HVAC'],
    },
    {
      id: 4,
      customerName: 'Emma Wilson',
      customerEmail: 'emma.wilson@email.com',
      customerPhone: '0400 456 789',
      propertyAddress: '56 Park Avenue',
      propertySuburb: 'Brighton',
      propertyPostcode: '3186',
      inspectionDate: '2025-11-01',
      inspectionTime: '14:00',
      urgency: 'Normal',
      status: 'Scheduled',
      problemDescription: 'Musty smell in basement, no visible mould yet',
      propertyType: 'Residential',
      affectedAreas: ['Basement'],
    },
  ]);

  // Filter and search leads
  const filteredLeads = leads.filter(lead => {
    // Search filter
    const matchesSearch = 
      lead.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.propertyAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.propertySuburb.toLowerCase().includes(searchQuery.toLowerCase());

    // Status filter
    const matchesStatus = 
      filterStatus === 'all' || 
      lead.status.toLowerCase() === filterStatus.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  // Sort leads
  const sortedLeads = [...filteredLeads].sort((a, b) => {
    if (sortBy === 'date') {
      const dateA = new Date(`${a.inspectionDate} ${a.inspectionTime}`);
      const dateB = new Date(`${b.inspectionDate} ${b.inspectionTime}`);
      return dateA.getTime() - dateB.getTime();
    }
    if (sortBy === 'urgency') {
      const urgencyOrder: Record<string, number> = { 'Emergency': 0, 'Urgent': 1, 'Normal': 2 };
      return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    }
    if (sortBy === 'suburb') {
      return a.propertySuburb.localeCompare(b.propertySuburb);
    }
    return 0;
  });

  // Click outside handler to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(event.target as Node)) {
        setStatusOpen(false);
      }
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setSortOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectLead = (leadId: number) => {
    navigate(`/inspection/${leadId}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-AU', { 
        weekday: 'short', 
        day: 'numeric', 
        month: 'short' 
      });
    }
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return (
    <div className="select-lead-page">
      
      {/* Header */}
      <div className="page-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          <ArrowLeft size={22} strokeWidth={2} />
        </button>
        <div className="header-info">
          <h1 className="page-title">Select Lead</h1>
          <p className="page-subtitle">{sortedLeads.length} inspections available</p>
        </div>
        <div className="header-spacer"></div>
      </div>

      {/* Search and Filter Bar */}
      <div className="search-filter-section">
        
        {/* Search Bar */}
        <div className="search-bar">
          <Search size={20} strokeWidth={2} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search by name, address, or suburb..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button 
              className="clear-search"
              onClick={() => setSearchQuery('')}
            >
              <XCircle size={18} strokeWidth={2} />
            </button>
          )}
        </div>

        {/* Filter and Sort */}
        <div className="filter-sort-row">
          
          {/* Status Filter */}
          <div className="filter-group">
            <label className="filter-label">STATUS</label>
            <div className="custom-dropdown" ref={statusRef}>
              <button 
                className="dropdown-trigger"
                onClick={() => setStatusOpen(!statusOpen)}
                type="button"
              >
                <span>
                  {filterStatus === 'all' && 'All Leads'}
                  {filterStatus === 'scheduled' && 'Scheduled'}
                  {filterStatus === 'pending' && 'Pending'}
                  {filterStatus === 'urgent' && 'Urgent Only'}
                </span>
                <ChevronDown size={16} className={`dropdown-icon ${statusOpen ? 'open' : ''}`} />
              </button>
              
              {statusOpen && (
                <div className="dropdown-menu">
                  <button 
                    className={`dropdown-item ${filterStatus === 'all' ? 'active' : ''}`}
                    onClick={() => {
                      setFilterStatus('all');
                      setStatusOpen(false);
                    }}
                    type="button"
                  >
                    All Leads
                  </button>
                  <button 
                    className={`dropdown-item ${filterStatus === 'scheduled' ? 'active' : ''}`}
                    onClick={() => {
                      setFilterStatus('scheduled');
                      setStatusOpen(false);
                    }}
                    type="button"
                  >
                    Scheduled
                  </button>
                  <button 
                    className={`dropdown-item ${filterStatus === 'pending' ? 'active' : ''}`}
                    onClick={() => {
                      setFilterStatus('pending');
                      setStatusOpen(false);
                    }}
                    type="button"
                  >
                    Pending
                  </button>
                  <button 
                    className={`dropdown-item ${filterStatus === 'urgent' ? 'active' : ''}`}
                    onClick={() => {
                      setFilterStatus('urgent');
                      setStatusOpen(false);
                    }}
                    type="button"
                  >
                    Urgent Only
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Sort By */}
          <div className="filter-group">
            <label className="filter-label">SORT BY</label>
            <div className="custom-dropdown" ref={sortRef}>
              <button 
                className="dropdown-trigger"
                onClick={() => setSortOpen(!sortOpen)}
                type="button"
              >
                <span>
                  {sortBy === 'date' && 'Date & Time'}
                  {sortBy === 'urgency' && 'Urgency Level'}
                  {sortBy === 'suburb' && 'Suburb'}
                </span>
                <ChevronDown size={16} className={`dropdown-icon ${sortOpen ? 'open' : ''}`} />
              </button>
              
              {sortOpen && (
                <div className="dropdown-menu">
                  <button 
                    className={`dropdown-item ${sortBy === 'date' ? 'active' : ''}`}
                    onClick={() => {
                      setSortBy('date');
                      setSortOpen(false);
                    }}
                    type="button"
                  >
                    Date & Time
                  </button>
                  <button 
                    className={`dropdown-item ${sortBy === 'urgency' ? 'active' : ''}`}
                    onClick={() => {
                      setSortBy('urgency');
                      setSortOpen(false);
                    }}
                    type="button"
                  >
                    Urgency Level
                  </button>
                  <button 
                    className={`dropdown-item ${sortBy === 'suburb' ? 'active' : ''}`}
                    onClick={() => {
                      setSortBy('suburb');
                      setSortOpen(false);
                    }}
                    type="button"
                  >
                    Suburb
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Leads List */}
      <div className="leads-container">
        
        {sortedLeads.length === 0 ? (
          <div className="empty-state">
            <AlertCircle size={48} strokeWidth={1.5} />
            <h3>No Leads Found</h3>
            <p>Try adjusting your search or filter criteria</p>
          </div>
        ) : (
          <div className="leads-list">
            {sortedLeads.map(lead => (
              <div 
                key={lead.id} 
                className="lead-card"
                onClick={() => handleSelectLead(lead.id)}
              >
                
                {/* Card Header */}
                <div className="card-header">
                  <div className="customer-info">
                    <div className="customer-avatar">
                      {lead.customerName.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="customer-details">
                      <h3 className="customer-name">{lead.customerName}</h3>
                      <div className="property-type-badge">
                        <Home size={12} strokeWidth={2} />
                        {lead.propertyType}
                      </div>
                    </div>
                  </div>
                  
                  {/* Urgency Badge */}
                  <div className={`urgency-badge ${lead.urgency.toLowerCase()}`}>
                    {lead.urgency === 'Emergency' && <Zap size={12} strokeWidth={2.5} />}
                    {lead.urgency === 'Urgent' && <AlertCircle size={12} strokeWidth={2.5} />}
                    <span className="urgency-text">{lead.urgency}</span>
                  </div>
                </div>

                {/* Property Address */}
                <div className="property-section">
                  <div className="section-icon">
                    <MapPin size={18} strokeWidth={2} />
                  </div>
                  <div className="section-content">
                    <div className="address-line">{lead.propertyAddress}</div>
                    <div className="suburb-line">
                      {lead.propertySuburb}, VIC {lead.propertyPostcode}
                    </div>
                  </div>
                </div>

                {/* Inspection DateTime */}
                <div className="datetime-section">
                  <div className="datetime-item">
                    <Calendar size={16} strokeWidth={2} />
                    <span>{formatDate(lead.inspectionDate)}</span>
                  </div>
                  <div className="datetime-separator">•</div>
                  <div className="datetime-item">
                    <Clock size={16} strokeWidth={2} />
                    <span>{formatTime(lead.inspectionTime)}</span>
                  </div>
                </div>

                {/* Problem Description */}
                <div className="problem-section">
                  <p className="problem-text">{lead.problemDescription}</p>
                </div>

                {/* Affected Areas */}
                {lead.affectedAreas && lead.affectedAreas.length > 0 && (
                  <div className="areas-section">
                    {lead.affectedAreas.map((area, index) => (
                      <span key={index} className="area-tag">
                        {area}
                      </span>
                    ))}
                  </div>
                )}

                {/* Contact Info */}
                <div className="contact-section">
                  <div className="contact-item">
                    <Phone size={14} strokeWidth={2} />
                    <span>{lead.customerPhone}</span>
                  </div>
                  <div className="contact-item">
                    <Mail size={14} strokeWidth={2} />
                    <span>{lead.customerEmail}</span>
                  </div>
                </div>

                {/* Select Button */}
                <button className="select-button">
                  <span>Start Inspection</span>
                  <ChevronRight size={20} strokeWidth={2} />
                </button>

              </div>
            ))}
          </div>
        )}

      </div>

    </div>
  );
};

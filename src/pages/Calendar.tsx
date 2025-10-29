import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const Calendar = () => {
  const navigate = useNavigate()
  
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [view, setView] = useState('month') // 'day', 'week', 'month'
  const [showEventModal, setShowEventModal] = useState(false)
  const [events, setEvents] = useState([])
  const [selectedEvent, setSelectedEvent] = useState(null)

  useEffect(() => {
    loadEvents()
  }, [currentDate])

  const loadEvents = () => {
    // TODO: Load from Supabase
    const mockEvents = [
      {
        id: 1,
        title: 'Mould Inspection - Smith Residence',
        date: '2025-10-30',
        time: '9:00 AM',
        duration: '2 hours',
        type: 'inspection',
        status: 'scheduled',
        leadId: 123,
        client: 'John Smith',
        address: '123 Smith St, Melbourne',
        technician: 'Tech 1',
        color: '#3b82f6'
      },
      {
        id: 2,
        title: 'Job Day 1 - Johnson Property',
        date: '2025-10-31',
        time: '7:00 AM',
        duration: '8 hours',
        type: 'job',
        status: 'in-progress',
        leadId: 124,
        client: 'Sarah Johnson',
        address: '456 Main Rd, Glen Waverley',
        technician: 'Tech 2',
        color: '#f97316'
      },
      {
        id: 3,
        title: 'Follow-up Inspection - Lee House',
        date: '2025-11-01',
        time: '2:00 PM',
        duration: '1 hour',
        type: 'follow-up',
        status: 'scheduled',
        leadId: 125,
        client: 'Michelle Lee',
        address: '789 Park Ave, Richmond',
        technician: 'Tech 1',
        color: '#8b5cf6'
      }
    ]
    setEvents(mockEvents)
  }

  // Calendar helpers
  const getDaysInMonth = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()
    
    return { daysInMonth, startingDayOfWeek }
  }

  const getEventsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0]
    return events.filter(event => event.date === dateStr)
  }

  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate)
    newDate.setMonth(currentDate.getMonth() + direction)
    setCurrentDate(newDate)
  }

  const isToday = (date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isSameDate = (date1, date2) => {
    return date1.toDateString() === date2.toDateString()
  }

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate)
  const monthName = currentDate.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })

  // Generate calendar days
  const calendarDays = []
  
  // Add empty cells for days before month starts
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push({ date: null, events: [] })
  }
  
  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    const dayEvents = getEventsForDate(date)
    calendarDays.push({ date, events: dayEvents })
  }

  return (
    <div className="calendar-page">
      
      {/* Navigation */}
      <nav className="calendar-nav">
        <div className="nav-container">
          <button className="back-btn" onClick={() => navigate('/dashboard')}>
            <span className="back-arrow">←</span>
            <span>Dashboard</span>
          </button>
          
          <div className="nav-title">
            <span className="nav-icon">📅</span>
            <span>Calendar</span>
          </div>
          
          <button className="btn-new-event" onClick={() => setShowEventModal(true)}>
            <span>+</span>
            <span>New Event</span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="calendar-main">
        <div className="calendar-container">
          
          {/* Calendar Header */}
          <div className="calendar-header">
            <div className="header-left">
              <h1 className="month-title">{monthName}</h1>
              <button 
                className="btn-today"
                onClick={() => {
                  setCurrentDate(new Date())
                  setSelectedDate(new Date())
                }}
              >
                Today
              </button>
            </div>

            <div className="header-center">
              <button 
                className="month-nav-btn"
                onClick={() => navigateMonth(-1)}
              >
                <span>←</span>
              </button>
              <button 
                className="month-nav-btn"
                onClick={() => navigateMonth(1)}
              >
                <span>→</span>
              </button>
            </div>

            <div className="header-right">
              <div className="view-toggle">
                <button 
                  className={`view-btn ${view === 'day' ? 'active' : ''}`}
                  onClick={() => setView('day')}
                >
                  Day
                </button>
                <button 
                  className={`view-btn ${view === 'week' ? 'active' : ''}`}
                  onClick={() => setView('week')}
                >
                  Week
                </button>
                <button 
                  className={`view-btn ${view === 'month' ? 'active' : ''}`}
                  onClick={() => setView('month')}
                >
                  Month
                </button>
              </div>
            </div>
          </div>

          <div className="calendar-body">
            
            {/* Calendar Grid */}
            <div className="calendar-grid-section">
              
              {/* Day of week headers */}
              <div className="calendar-weekdays">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="weekday-header">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar days grid */}
              <div className="calendar-days-grid">
                {calendarDays.map((day, index) => {
                  if (!day.date) {
                    return <div key={index} className="calendar-day empty" />
                  }

                  const isCurrentDay = isToday(day.date)
                  const isSelected = isSameDate(day.date, selectedDate)
                  const hasEvents = day.events.length > 0

                  return (
                    <div
                      key={index}
                      className={`calendar-day ${isCurrentDay ? 'today' : ''} ${isSelected ? 'selected' : ''} ${hasEvents ? 'has-events' : ''}`}
                      onClick={() => setSelectedDate(day.date)}
                    >
                      <div className="day-number">
                        {day.date.getDate()}
                      </div>
                      
                      {hasEvents && (
                        <div className="day-events">
                          {day.events.slice(0, 2).map(event => (
                            <div
                              key={event.id}
                              className="day-event-dot"
                              style={{ backgroundColor: event.color }}
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedEvent(event)
                              }}
                            />
                          ))}
                          {day.events.length > 2 && (
                            <span className="more-events">+{day.events.length - 2}</span>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Upcoming Events Sidebar */}
            <div className="upcoming-events-section">
              <div className="upcoming-header">
                <h2 className="upcoming-title">
                  {selectedDate.toLocaleDateString('en-AU', { 
                    weekday: 'long',
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </h2>
                {getEventsForDate(selectedDate).length > 0 && (
                  <span className="event-count">
                    {getEventsForDate(selectedDate).length} event{getEventsForDate(selectedDate).length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              <div className="events-list">
                {getEventsForDate(selectedDate).length === 0 ? (
                  <div className="no-events">
                    <div className="no-events-icon">📭</div>
                    <p className="no-events-text">No events scheduled</p>
                    <button 
                      className="btn-add-event"
                      onClick={() => setShowEventModal(true)}
                    >
                      + Add Event
                    </button>
                  </div>
                ) : (
                  getEventsForDate(selectedDate).map(event => (
                    <div 
                      key={event.id} 
                      className="event-card"
                      onClick={() => setSelectedEvent(event)}
                    >
                      <div 
                        className="event-color-bar"
                        style={{ backgroundColor: event.color }}
                      />
                      <div className="event-content">
                        <div className="event-header">
                          <h3 className="event-title">{event.title}</h3>
                          <span className={`event-status ${event.status}`}>
                            {event.status === 'scheduled' && '📅 Scheduled'}
                            {event.status === 'in-progress' && '🔧 In Progress'}
                            {event.status === 'completed' && '✅ Completed'}
                          </span>
                        </div>
                        
                        <div className="event-details">
                          <div className="event-detail">
                            <span className="detail-icon">🕐</span>
                            <span className="detail-text">{event.time} • {event.duration}</span>
                          </div>
                          <div className="event-detail">
                            <span className="detail-icon">👤</span>
                            <span className="detail-text">{event.client}</span>
                          </div>
                          <div className="event-detail">
                            <span className="detail-icon">📍</span>
                            <span className="detail-text">{event.address}</span>
                          </div>
                          <div className="event-detail">
                            <span className="detail-icon">👷</span>
                            <span className="detail-text">{event.technician}</span>
                          </div>
                        </div>

                        <div className="event-actions">
                          <button 
                            className="event-action-btn"
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate(`/client/${event.leadId}`)
                            }}
                          >
                            <span>👁️</span>
                            <span>View Lead</span>
                          </button>
                          <button 
                            className="event-action-btn"
                            onClick={(e) => {
                              e.stopPropagation()
                              window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address)}`, '_blank')
                            }}
                          >
                            <span>🗺️</span>
                            <span>Directions</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Legend */}
              <div className="calendar-legend">
                <h3 className="legend-title">Event Types</h3>
                <div className="legend-items">
                  <div className="legend-item">
                    <div className="legend-dot" style={{ backgroundColor: '#3b82f6' }} />
                    <span className="legend-label">Inspection</span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-dot" style={{ backgroundColor: '#f97316' }} />
                    <span className="legend-label">Job</span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-dot" style={{ backgroundColor: '#8b5cf6' }} />
                    <span className="legend-label">Follow-up</span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-dot" style={{ backgroundColor: '#10b981' }} />
                    <span className="legend-label">Other</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="modal-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="modal-content event-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedEvent(null)}>
              ✕
            </button>
            
            <div 
              className="event-modal-header"
              style={{ 
                background: `linear-gradient(135deg, ${selectedEvent.color}15 0%, ${selectedEvent.color}05 100%)`,
                borderBottom: `3px solid ${selectedEvent.color}`
              }}
            >
              <h2 className="event-modal-title">{selectedEvent.title}</h2>
              <span className={`event-status-badge ${selectedEvent.status}`}>
                {selectedEvent.status === 'scheduled' && '📅 Scheduled'}
                {selectedEvent.status === 'in-progress' && '🔧 In Progress'}
                {selectedEvent.status === 'completed' && '✅ Completed'}
              </span>
            </div>

            <div className="event-modal-body">
              <div className="modal-info-grid">
                <div className="modal-info-item">
                  <span className="modal-info-label">Date</span>
                  <span className="modal-info-value">
                    {new Date(selectedEvent.date).toLocaleDateString('en-AU', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>

                <div className="modal-info-item">
                  <span className="modal-info-label">Time</span>
                  <span className="modal-info-value">{selectedEvent.time}</span>
                </div>

                <div className="modal-info-item">
                  <span className="modal-info-label">Duration</span>
                  <span className="modal-info-value">{selectedEvent.duration}</span>
                </div>

                <div className="modal-info-item">
                  <span className="modal-info-label">Client</span>
                  <span className="modal-info-value">{selectedEvent.client}</span>
                </div>

                <div className="modal-info-item full-width">
                  <span className="modal-info-label">Address</span>
                  <span className="modal-info-value">{selectedEvent.address}</span>
                </div>

                <div className="modal-info-item">
                  <span className="modal-info-label">Technician</span>
                  <span className="modal-info-value">{selectedEvent.technician}</span>
                </div>

                <div className="modal-info-item">
                  <span className="modal-info-label">Event Type</span>
                  <span className="modal-info-value">{selectedEvent.type}</span>
                </div>
              </div>

              <div className="modal-actions">
                <button 
                  className="btn-primary"
                  onClick={() => navigate(`/client/${selectedEvent.leadId}`)}
                >
                  <span>👁️</span>
                  <span>View Full Lead</span>
                </button>
                <button 
                  className="btn-secondary"
                  onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedEvent.address)}`, '_blank')}
                >
                  <span>🗺️</span>
                  <span>Get Directions</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default Calendar

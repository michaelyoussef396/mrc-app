import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TechnicianCard } from '../TechnicianCard'
import type { TechnicianWithStats } from '@/hooks/useTechnicianStats'

// The card used to render an active-lead count under the label "Inspections",
// so a technician who had carried out an inspection but held no open leads
// showed 0. The two numbers are now separate stats.
const clayton: TechnicianWithStats = {
  id: 'tech-1',
  email: 'clayton@example.com',
  firstName: 'Clayton',
  lastName: 'Jenkins',
  fullName: 'Clayton Jenkins',
  phone: null,
  homeSuburb: null,
  lastSignInAt: null,
  activeLeads: 0,
  inspectionsTotal: 1,
  revenueThisMonth: 11029.77,
  upcomingCount: 2,
  initials: 'CJ',
  color: '#007AFF',
}

function renderCard(technician: TechnicianWithStats) {
  return render(
    <MemoryRouter>
      <TechnicianCard technician={technician} />
    </MemoryRouter>
  )
}

/** The number rendered beneath a stat label. */
function statValue(label: string): string {
  const labelNode = screen.getByText(label)
  return labelNode.parentElement?.querySelector('span:last-child')?.textContent ?? ''
}

describe('TechnicianCard', () => {
  it('should show the inspection count a technician actually carried out', () => {
    renderCard(clayton)
    expect(statValue('Inspections')).toBe('1')
  })

  it('should show an open-lead count of zero without hiding the inspection', () => {
    renderCard(clayton)
    expect(statValue('Active Leads')).toBe('0')
  })

  it('should label the open-lead count as leads, not inspections', () => {
    renderCard(clayton)
    expect(screen.getByText('Active Leads')).toBeInTheDocument()
  })

  it('should show revenue formatted in thousands', () => {
    renderCard(clayton)
    expect(statValue('Revenue')).toBe('$11.0k')
  })

  it('should show the count of upcoming engagements', () => {
    renderCard(clayton)
    expect(statValue('Upcoming')).toBe('2')
  })

  it('should state the period the revenue figure covers', () => {
    renderCard(clayton)
    expect(screen.getByText(/revenue: this month/i)).toBeInTheDocument()
  })

  it('should state that the inspection count is all time', () => {
    renderCard(clayton)
    expect(screen.getByText(/inspections: all time/i)).toBeInTheDocument()
  })
})

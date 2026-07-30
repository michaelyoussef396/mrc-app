import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WorkloadBreakdown } from '../WorkloadBreakdown'

// A technician with no leads in the last 30 days produces all-zero counts. The
// percentage helper divides by the total, so this is the division-by-zero path.
describe('WorkloadBreakdown with no workload', () => {
  const allZero = { scheduled: 0, inProgress: 0, completed: 0, notLanded: 0 }

  it('should render the empty state instead of a bar', () => {
    render(<WorkloadBreakdown {...allZero} />)
    expect(screen.getByText('No workload data available')).toBeInTheDocument()
  })

  it('should not render NaN from dividing by a zero total', () => {
    const { container } = render(<WorkloadBreakdown {...allZero} />)
    expect(container.textContent).not.toMatch(/NaN|undefined|Infinity/)
  })

  it('should not render any percentage figures', () => {
    const { container } = render(<WorkloadBreakdown {...allZero} />)
    expect(container.textContent).not.toMatch(/%/)
  })
})

describe('WorkloadBreakdown with a single lead', () => {
  it('should attribute the whole bar to that bucket', () => {
    render(<WorkloadBreakdown scheduled={1} inProgress={0} completed={0} notLanded={0} />)
    expect(screen.getByText('(100%)')).toBeInTheDocument()
  })

  it('should show zero-count buckets as 0%, not NaN', () => {
    const { container } = render(
      <WorkloadBreakdown scheduled={1} inProgress={0} completed={0} notLanded={0} />
    )
    expect(container.textContent).not.toMatch(/NaN/)
  })

  it('should label the lost bucket as Not Landed', () => {
    render(<WorkloadBreakdown scheduled={1} inProgress={0} completed={0} notLanded={0} />)
    expect(screen.getByText('Not Landed')).toBeInTheDocument()
  })
})

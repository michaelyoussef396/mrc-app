import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'

import OfflineBanner from '../OfflineBanner'
import { useOfflineSync } from '@/lib/offline/useOfflineSync'

// Mock useOfflineSync (read-only dependency — pendingCount/syncState display)
vi.mock('@/lib/offline/useOfflineSync', () => ({
  useOfflineSync: vi.fn().mockReturnValue({
    syncState: 'offline',
    pendingCount: 0,
    syncNow: vi.fn(),
    lastSyncError: null,
  }),
}))

const POLL_MS = 3000

function setNavigatorOnLine(value: boolean) {
  Object.defineProperty(window.navigator, 'onLine', {
    value,
    writable: true,
    configurable: true,
  })
}

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms))

describe('OfflineBanner', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.mocked(useOfflineSync).mockReturnValue({
      syncState: 'offline',
      pendingCount: 0,
      syncNow: vi.fn(),
      lastSyncError: null,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    setNavigatorOnLine(true)
  })

  it('is hidden when online', () => {
    setNavigatorOnLine(true)
    const { container } = render(<OfflineBanner />)
    expect(container.innerHTML).toBe('')
  })

  it('shows amber banner when offline at mount', () => {
    setNavigatorOnLine(false)
    render(<OfflineBanner />)
    const banner = screen.getByText(/offline/i).closest('div')
    expect(banner?.parentElement).toHaveClass('bg-amber-500')
  })

  it('appears when the offline event fires', () => {
    setNavigatorOnLine(true)
    render(<OfflineBanner />)
    setNavigatorOnLine(false)
    act(() => {
      fireEvent(window, new Event('offline'))
    })
    expect(screen.getByText(/offline/i)).toBeInTheDocument()
  })

  it('appears via the poll when navigator.onLine flips without any event (iOS quirk)', () => {
    setNavigatorOnLine(true)
    render(<OfflineBanner />)
    setNavigatorOnLine(false)
    advance(POLL_MS + 100)
    expect(screen.getByText(/offline/i)).toBeInTheDocument()
  })

  it('hides via the poll when connectivity returns without any event', () => {
    setNavigatorOnLine(false)
    render(<OfflineBanner />)
    setNavigatorOnLine(true)
    advance(POLL_MS + 100)
    expect(screen.queryByText(/offline/i)).not.toBeInTheDocument()
  })

  it('re-checks connectivity on visibilitychange without waiting for the poll', () => {
    setNavigatorOnLine(true)
    render(<OfflineBanner />)
    setNavigatorOnLine(false)
    act(() => {
      fireEvent(document, new Event('visibilitychange'))
    })
    expect(screen.getByText(/offline/i)).toBeInTheDocument()
  })

  it('re-checks connectivity on window focus without waiting for the poll', () => {
    setNavigatorOnLine(true)
    render(<OfflineBanner />)
    setNavigatorOnLine(false)
    act(() => {
      fireEvent(window, new Event('focus'))
    })
    expect(screen.getByText(/offline/i)).toBeInTheDocument()
  })

  it('dismiss button hides banner', () => {
    setNavigatorOnLine(false)
    render(<OfflineBanner />)
    fireEvent.click(screen.getByLabelText('Dismiss'))
    expect(screen.queryByText(/offline/i)).not.toBeInTheDocument()
  })

  it('poll does not resurrect a dismissed banner during the same offline spell', () => {
    setNavigatorOnLine(false)
    render(<OfflineBanner />)
    fireEvent.click(screen.getByLabelText('Dismiss'))
    advance(POLL_MS * 3)
    expect(screen.queryByText(/offline/i)).not.toBeInTheDocument()
  })

  it('dismissal resets on the next offline transition', () => {
    setNavigatorOnLine(false)
    render(<OfflineBanner />)
    fireEvent.click(screen.getByLabelText('Dismiss'))
    setNavigatorOnLine(true)
    advance(POLL_MS + 100)
    setNavigatorOnLine(false)
    advance(POLL_MS + 100)
    expect(screen.getByText(/offline/i)).toBeInTheDocument()
  })

  it('shows pending count when there are pending changes', () => {
    setNavigatorOnLine(false)
    vi.mocked(useOfflineSync).mockReturnValue({
      syncState: 'offline',
      pendingCount: 3,
      syncNow: vi.fn(),
      lastSyncError: null,
    })
    render(<OfflineBanner />)
    expect(screen.getByText(/3 changes pending/i)).toBeInTheDocument()
  })

  it('states that new changes stay on this device when nothing is pending', () => {
    setNavigatorOnLine(false)
    render(<OfflineBanner />)
    expect(
      screen.getByText(/new changes stay on this device until you're back online/i),
    ).toBeInTheDocument()
  })

  it('dismiss button has 48px touch target', () => {
    setNavigatorOnLine(false)
    render(<OfflineBanner />)
    expect(screen.getByLabelText('Dismiss')).toHaveStyle({ minWidth: '48px', minHeight: '48px' })
  })
})

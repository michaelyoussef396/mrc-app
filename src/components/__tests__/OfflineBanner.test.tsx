import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// Mock useOfflineSync
vi.mock('@/lib/offline/useOfflineSync', () => ({
  useOfflineSync: vi.fn().mockReturnValue({
    syncState: 'offline',
    pendingCount: 0,
    syncNow: vi.fn(),
    lastSyncError: null,
  }),
}))

describe('OfflineBanner', () => {
  let originalOnLine: boolean

  beforeEach(() => {
    originalOnLine = navigator.onLine
    vi.resetModules()
  })

  afterEach(() => {
    Object.defineProperty(navigator, 'onLine', { value: originalOnLine, writable: true })
  })

  it('is hidden when online', async () => {
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true })

    const { default: OfflineBanner } = await import('../OfflineBanner')

    const { container } = render(<OfflineBanner />)
    expect(container.innerHTML).toBe('')
  })

  it('shows amber banner when offline', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true })

    const { default: OfflineBanner } = await import('../OfflineBanner')

    render(<OfflineBanner />)
    const banner = screen.getByText(/offline/i).closest('div')
    expect(banner?.parentElement).toHaveClass('bg-amber-500')
  })

  it('shows offline message text', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true })

    const { default: OfflineBanner } = await import('../OfflineBanner')

    render(<OfflineBanner />)
    expect(screen.getByText(/offline/i)).toBeInTheDocument()
  })

  it('shows pending count when there are pending changes', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true })

    const { useOfflineSync } = await import('@/lib/offline/useOfflineSync')
    vi.mocked(useOfflineSync).mockReturnValue({
      syncState: 'offline',
      pendingCount: 3,
      syncNow: vi.fn(),
      lastSyncError: null,
    })

    const { default: OfflineBanner } = await import('../OfflineBanner')

    render(<OfflineBanner />)
    expect(screen.getByText(/3 changes pending/i)).toBeInTheDocument()
  })

  it('dismiss button hides banner', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true })

    const { default: OfflineBanner } = await import('../OfflineBanner')

    render(<OfflineBanner />)

    const dismissBtn = screen.getByLabelText('Dismiss')
    fireEvent.click(dismissBtn)

    expect(screen.queryByText(/offline/i)).not.toBeInTheDocument()
  })

  it('dismiss button has 48px touch target', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true })

    const { default: OfflineBanner } = await import('../OfflineBanner')

    render(<OfflineBanner />)

    const dismissBtn = screen.getByLabelText('Dismiss')
    expect(dismissBtn).toHaveStyle({ minWidth: '48px', minHeight: '48px' })
  })
})

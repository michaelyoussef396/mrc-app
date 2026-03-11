import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RetryButton from '../ui/RetryButton'

describe('RetryButton', () => {
  it('displays error message', () => {
    render(<RetryButton onRetry={async () => {}} error="Something failed" />)
    expect(screen.getByText('Something failed')).toBeInTheDocument()
  })

  it('shows Retry button', () => {
    render(<RetryButton onRetry={async () => {}} error="Error" />)
    expect(screen.getByText('Retry')).toBeInTheDocument()
  })

  it('retry button has 48px min height', () => {
    render(<RetryButton onRetry={async () => {}} error="Error" />)
    const btn = screen.getByText('Retry')
    expect(btn).toHaveStyle({ minHeight: '48px' })
  })

  it('calls onRetry when clicked', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn().mockResolvedValue(undefined)

    render(<RetryButton onRetry={onRetry} error="Error" />)
    await user.click(screen.getByText('Retry'))

    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('shows attempt count after first retry', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn().mockResolvedValue(undefined)

    render(<RetryButton onRetry={onRetry} error="Error" maxAttempts={3} />)
    await user.click(screen.getByText('Retry'))

    await waitFor(() => {
      expect(screen.getByText('Retry (1/3)')).toBeInTheDocument()
    })
  })

  it('shows max retries message when exhausted', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn().mockResolvedValue(undefined)

    render(<RetryButton onRetry={onRetry} error="Error" maxAttempts={1} />)
    await user.click(screen.getByText('Retry'))

    await waitFor(() => {
      expect(screen.getByText(/Max retries reached/i)).toBeInTheDocument()
      expect(screen.getByText(/1800 954 117/i)).toBeInTheDocument()
    })
  })

  it('disables button while retrying', async () => {
    let resolveRetry: () => void
    const onRetry = vi.fn().mockImplementation(
      () => new Promise<void>(resolve => { resolveRetry = resolve })
    )

    render(<RetryButton onRetry={onRetry} error="Error" />)

    const user = userEvent.setup()
    await user.click(screen.getByText('Retry'))

    expect(screen.getByText('Retrying...')).toBeDisabled()

    resolveRetry!()
  })
})

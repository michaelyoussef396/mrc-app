import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TimePicker, type TimePickerProps } from '../TimePicker';

function renderPicker(overrides: Partial<TimePickerProps> = {}) {
  const onChange = vi.fn();
  render(<TimePicker value="09:07" onChange={onChange} {...overrides} />);
  return { onChange, user: userEvent.setup() };
}

async function openPanel(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button'));
}

function column(name: 'Hour' | 'Minute' | 'AM or PM') {
  return within(screen.getByRole('listbox', { name }));
}

describe('TimePicker trigger', () => {
  it('should render the current value as a twelve-hour label', () => {
    renderPicker({ value: '09:07' });

    expect(screen.getByRole('button')).toHaveTextContent('9:07 AM');
  });

  it('should render the placeholder when no value is set', () => {
    renderPicker({ value: '', placeholder: 'Select time slot' });

    expect(screen.getByRole('button')).toHaveTextContent('Select time slot');
  });

  it('should not render a native time input', () => {
    const { container } = render(<TimePicker value="09:07" onChange={vi.fn()} />);

    expect(container.querySelector('input[type="time"]')).toBeNull();
  });
});

describe('TimePicker value round-trip', () => {
  it('should mark the hour matching the incoming value as selected', async () => {
    const { user } = renderPicker({ value: '09:07' });
    await openPanel(user);

    expect(column('Hour').getByRole('option', { selected: true })).toHaveTextContent('9');
  });

  it('should mark the minute matching the incoming value as selected', async () => {
    const { user } = renderPicker({ value: '09:07' });
    await openPanel(user);

    expect(column('Minute').getByRole('option', { selected: true })).toHaveTextContent('07');
  });

  it('should emit HH:mm in twenty-four-hour form when a minute is chosen', async () => {
    const { onChange, user } = renderPicker({ value: '14:00' });
    await openPanel(user);

    await user.click(column('Minute').getByRole('option', { name: '23' }));

    expect(onChange).toHaveBeenCalledWith('14:23');
  });

  it('should emit an afternoon time when the period is switched to PM', async () => {
    const { onChange, user } = renderPicker({ value: '09:07', maxTime: '23:59' });
    await openPanel(user);

    await user.click(column('AM or PM').getByRole('option', { name: 'PM' }));

    expect(onChange).toHaveBeenCalledWith('21:07');
  });
});

describe('TimePicker interval', () => {
  it('should offer every minute at the default interval', async () => {
    const { user } = renderPicker();
    await openPanel(user);

    expect(column('Minute').getAllByRole('option')).toHaveLength(60);
  });

  it('should offer four minute options at a fifteen-minute interval', async () => {
    const { user } = renderPicker({ intervalMinutes: 15, value: '09:00' });
    await openPanel(user);

    expect(column('Minute').getAllByRole('option')).toHaveLength(4);
  });

  it('should still offer every minute of the hour at the default interval when late in the day', async () => {
    const { user } = renderPicker({ value: '17:43' });
    await openPanel(user);

    expect(column('Minute').getAllByRole('option')).toHaveLength(60);
  });
});

describe('TimePicker range clamping', () => {
  it('should not offer morning hours before the opening bound', async () => {
    const { user } = renderPicker({ value: '09:07', minTime: '07:00' });
    await openPanel(user);

    expect(column('Hour').queryByRole('option', { name: '6' })).toBeNull();
  });

  it('should offer the opening hour itself', async () => {
    const { user } = renderPicker({ value: '09:07', minTime: '07:00' });
    await openPanel(user);

    expect(column('Hour').getByRole('option', { name: '7' })).toBeInTheDocument();
  });

  it('should offer only the top of the hour at the closing bound', async () => {
    const { user } = renderPicker({ value: '19:00', maxTime: '19:00' });
    await openPanel(user);

    expect(column('Minute').getAllByRole('option')).toHaveLength(1);
  });

  it('should clamp to the closing bound when a period switch overshoots it', async () => {
    const { onChange, user } = renderPicker({ value: '07:30', maxTime: '19:00' });
    await openPanel(user);

    await user.click(column('AM or PM').getByRole('option', { name: 'PM' }));

    expect(onChange).toHaveBeenCalledWith('19:00');
  });
});

describe('TimePicker keyboard navigation', () => {
  it('should advance to the next minute on ArrowDown', async () => {
    const { onChange, user } = renderPicker({ value: '09:07' });
    await openPanel(user);

    screen.getByRole('listbox', { name: 'Minute' }).focus();
    await user.keyboard('{ArrowDown}');

    expect(onChange).toHaveBeenCalledWith('09:08');
  });

  it('should step back to the previous minute on ArrowUp', async () => {
    const { onChange, user } = renderPicker({ value: '09:07' });
    await openPanel(user);

    screen.getByRole('listbox', { name: 'Minute' }).focus();
    await user.keyboard('{ArrowUp}');

    expect(onChange).toHaveBeenCalledWith('09:06');
  });

  it('should jump to the first hour of the period on Home', async () => {
    const { onChange, user } = renderPicker({ value: '09:07', minTime: '07:00' });
    await openPanel(user);

    screen.getByRole('listbox', { name: 'Hour' }).focus();
    await user.keyboard('{Home}');

    expect(onChange).toHaveBeenCalledWith('07:07');
  });
});

export type BookingType = 'inspection' | 'job';

export function toBookingType(eventType: string): BookingType {
  return eventType === 'job' ? 'job' : 'inspection';
}

// Inline-style bundle (schedule calendar grid + daily cards)
export const bookingTypeHex: Record<BookingType, { bg: string; border: string; text: string }> = {
  inspection: { bg: 'rgba(19, 127, 236, 0.1)', border: '#137fec', text: '#137fec' },
  job:        { bg: 'rgba(249, 115, 22, 0.1)', border: '#f97316', text: '#c2410c' },
};

// Bordered type pill (EventDetailsPanel)
export const bookingTypePillClasses: Record<BookingType, string> = {
  inspection: 'bg-blue-50 text-blue-700 border-blue-200',
  job:        'bg-orange-50 text-orange-700 border-orange-200',
};

// Badge bundle incl. dark variants (UpcomingBookingCard via useTechnicianDetail)
export const bookingTypeBadgeClasses: Record<BookingType, { bg: string; text: string; border: string }> = {
  inspection: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-100 dark:border-blue-800' },
  job:        { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-100 dark:border-orange-800' },
};

// Left-border accent stripe
export const bookingTypeAccentClass: Record<BookingType, string> = {
  inspection: 'bg-[#137fec]',
  job:        'bg-orange-500',
};

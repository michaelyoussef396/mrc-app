// Utility functions for lead management

/**
 * Format Australian phone number
 * Converts: 0412345678 → 0412 345 678
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 10) {
    // Mobile: 04XX XXX XXX
    if (cleaned.startsWith('04')) {
      return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
    }
    // Landline: 0X XXXX XXXX
    return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 6)} ${cleaned.slice(6)}`;
  }
  
  return phone;
}

/**
 * Strip formatting from phone number for storage
 */
export function cleanPhoneNumber(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Calculate property zone from suburb
 * Zone 1: Inner Melbourne
 * Zone 2: Middle Melbourne
 * Zone 3: Outer Melbourne
 * Zone 4: Extended areas
 */
export function calculatePropertyZone(suburb: string): number {
  const lowerSuburb = suburb.toLowerCase().trim();
  
  const zone1Suburbs = [
    'melbourne', 'carlton', 'fitzroy', 'richmond', 'south yarra', 'prahran',
    'st kilda', 'port melbourne', 'docklands', 'southbank', 'collingwood',
    'north melbourne', 'parkville', 'east melbourne'
  ];
  
  const zone3Suburbs = [
    'frankston', 'dandenong', 'cranbourne', 'pakenham', 'berwick', 
    'narre warren', 'werribee', 'sunbury', 'melton', 'epping'
  ];
  
  const zone4Suburbs = [
    'geelong', 'ballarat', 'bendigo', 'mornington', 'traralgon', 
    'warragul', 'wodonga', 'shepparton'
  ];
  
  if (zone1Suburbs.includes(lowerSuburb)) return 1;
  if (zone3Suburbs.includes(lowerSuburb)) return 3;
  if (zone4Suburbs.includes(lowerSuburb)) return 4;
  
  return 2; // Default to Zone 2 (Middle Melbourne)
}

/**
 * Format time ago (e.g., "2 hours ago", "1 day ago")
 */
export function formatTimeAgo(date: Date | string): string {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 60) {
    return diffMins <= 1 ? 'Just now' : `${diffMins} minutes ago`;
  } else if (diffHours < 24) {
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
  } else if (diffDays < 7) {
    return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
  } else {
    return past.toLocaleDateString('en-AU');
  }
}

/**
 * Check if lead is urgent (uncontacted for >4 hours)
 */
export function isLeadUrgent(createdAt: Date | string, status: string): boolean {
  if (status !== 'new_lead') return false;
  
  const now = new Date();
  const created = new Date(createdAt);
  const diffHours = (now.getTime() - created.getTime()) / 3600000;
  
  return diffHours > 4;
}

/**
 * Lead source options organized by category
 */
export const leadSourceOptions = [
  { label: '── DIGITAL ──', value: '', disabled: true },
  { label: 'Website Form', value: 'Website Form' },
  { label: 'Google Search (Organic)', value: 'Google Search (Organic)' },
  { label: 'Google Ads', value: 'Google Ads' },
  { label: 'Facebook/Instagram', value: 'Facebook/Instagram' },
  { label: 'LinkedIn', value: 'LinkedIn' },
  { label: 'Other Social Media', value: 'Other Social Media' },
  { label: '── REFERRAL ──', value: '', disabled: true },
  { label: 'Customer Referral', value: 'Customer Referral' },
  { label: 'Real Estate Agent', value: 'Real Estate Agent' },
  { label: 'Property Manager', value: 'Property Manager' },
  { label: 'Strata Manager', value: 'Strata Manager' },
  { label: 'Insurance Company', value: 'Insurance Company' },
  { label: '── TRADITIONAL ──', value: '', disabled: true },
  { label: 'Phone Call (Direct)', value: 'Phone Call (Direct)' },
  { label: 'Email Inquiry', value: 'Email Inquiry' },
  { label: 'Walk-in', value: 'Walk-in' },
  { label: '── OTHER ──', value: '', disabled: true },
  { label: 'Repeat Customer', value: 'Repeat Customer' },
  { label: 'Trade Show/Event', value: 'Trade Show/Event' },
  { label: 'Other', value: 'Other' },
];

/**
 * Property type options
 */
export const propertyTypeOptions = [
  { label: 'Select property type...', value: '' },
  { label: 'Residential House', value: 'residential_house' },
  { label: 'Residential Apartment', value: 'residential_apartment' },
  { label: 'Commercial Office', value: 'commercial_office' },
  { label: 'Commercial Retail', value: 'commercial_retail' },
  { label: 'Commercial Industrial', value: 'commercial_industrial' },
  { label: 'Strata', value: 'strata' },
];

/**
 * Urgency level options
 */
export const urgencyOptions = [
  { label: 'Select urgency...', value: '' },
  { label: 'Low (Can wait weeks)', value: 'low' },
  { label: 'Medium (Within days)', value: 'medium' },
  { label: 'High (ASAP)', value: 'high' },
  { label: 'Emergency (Same day)', value: 'emergency' },
];

/**
 * Australian states
 */
export const stateOptions = [
  { label: 'VIC', value: 'VIC' },
  { label: 'NSW', value: 'NSW' },
  { label: 'QLD', value: 'QLD' },
  { label: 'SA', value: 'SA' },
  { label: 'WA', value: 'WA' },
  { label: 'TAS', value: 'TAS' },
  { label: 'NT', value: 'NT' },
  { label: 'ACT', value: 'ACT' },
];

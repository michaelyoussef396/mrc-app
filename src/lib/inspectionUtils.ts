// Utility functions for inspection form

/**
 * Calculate dew point from temperature and humidity
 * Formula: Td ≈ T - ((100 - RH)/5)
 */
export const calculateDewPoint = (temperature: number, humidity: number): number => {
  if (!temperature || !humidity) return 0;
  const dewPoint = temperature - ((100 - humidity) / 5);
  return Math.round(dewPoint * 10) / 10;
};

/**
 * Generate unique job number
 * Format: MRC-YYYY-XXXX
 */
export const generateJobNumber = (): string => {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 9999) + 1;
  return `MRC-${year}-${String(random).padStart(4, '0')}`;
};

/**
 * Calculate job cost based on hours and job type
 */
export const calculateJobCost = (params: {
  areas: Array<{
    timeWithoutDemo: number;
    demolitionTime: number;
    demolitionRequired: boolean;
  }>;
  subfloorTime: number;
  hasSubfloor: boolean;
  dehumidifierQty: number;
  airMoverQty: number;
  rcdQty: number;
  estimatedDays: number;
}): {
  laborCost: number;
  equipmentCost: number;
  subtotal: number;
  gst: number;
  total: number;
  breakdown: string;
} => {
  // ANCHOR RATES (excluding GST)
  const rates = {
    surface: { hourly: 152.12 },
    demolition: { hourly: 224.86 },
    construction: { hourly: 188.49 },
    subfloor: { hourly: 291.84 }
  };

  const equipmentRates = {
    dehumidifier: 132,
    airMover: 46,
    rcd: 5
  };

  // Calculate total hours
  let totalHours = 0;
  let hasDemolition = false;

  params.areas.forEach(area => {
    totalHours += area.timeWithoutDemo / 60; // Convert minutes to hours
    if (area.demolitionRequired && area.demolitionTime > 0) {
      totalHours += area.demolitionTime / 60;
      hasDemolition = true;
    }
  });

  if (params.hasSubfloor) {
    totalHours += params.subfloorTime / 60;
  }

  // Determine job type and rate
  let hourlyRate = rates.surface.hourly;
  let jobType = 'Surface Treatment';
  
  if (params.hasSubfloor) {
    hourlyRate = rates.subfloor.hourly;
    jobType = 'Subfloor Treatment';
  } else if (hasDemolition) {
    hourlyRate = rates.demolition.hourly;
    jobType = 'With Demolition';
  }

  // Calculate base labor cost
  let laborCost = totalHours * hourlyRate;

  // Apply discount based on total days
  const totalDays = Math.ceil(totalHours / 8);
  let discountMultiplier = 1.0;
  let discountText = '';

  if (totalDays >= 4) {
    discountMultiplier = 0.87; // 13% discount (max)
    discountText = '13% Multi-day Discount';
  } else if (totalDays === 3) {
    discountMultiplier = 0.90; // 10% discount
    discountText = '10% Multi-day Discount';
  } else if (totalDays === 2) {
    discountMultiplier = 0.925; // 7.5% discount
    discountText = '7.5% Multi-day Discount';
  }

  laborCost = laborCost * discountMultiplier;

  // Calculate equipment hire
  const equipmentCost = 
    (params.dehumidifierQty * equipmentRates.dehumidifier * params.estimatedDays) +
    (params.airMoverQty * equipmentRates.airMover * params.estimatedDays) +
    (params.rcdQty * equipmentRates.rcd * params.estimatedDays);

  // Calculate totals
  const subtotal = laborCost + equipmentCost;
  const gst = subtotal * 0.1;
  const total = subtotal + gst;

  // Build breakdown string
  const breakdown = [
    `Job Type: ${jobType}`,
    `Total Hours: ${totalHours.toFixed(1)}h`,
    `Days: ${totalDays}`,
    discountText ? discountText : ''
  ].filter(Boolean).join(' • ');

  return {
    laborCost: Math.round(laborCost * 100) / 100,
    equipmentCost: Math.round(equipmentCost * 100) / 100,
    subtotal: Math.round(subtotal * 100) / 100,
    gst: Math.round(gst * 100) / 100,
    total: Math.round(total * 100) / 100,
    breakdown
  };
};

/**
 * Format currency for display
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

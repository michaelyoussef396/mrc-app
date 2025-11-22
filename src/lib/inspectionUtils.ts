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
 * Uses base anchor model: 2h minimum and 8h full day rates
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
  discountPercent: number;
} => {
  // BASE ANCHOR RATES (excluding GST)
  // Each job type has 2h minimum and 8h full day rate
  const BASE_RATES = {
    no_demolition: { base2h: 612.00, full8h: 1216.99 },
    demolition: { base2h: 711.90, full8h: 1798.90 },
    construction: { base2h: 661.96, full8h: 1507.95 },
    subfloor: { base2h: 900.00, full8h: 2334.69 }
  };

  const EQUIPMENT_RATES = {
    dehumidifier: 132,
    airMover: 46,
    rcd: 5
  };

  // Calculate hourly rate from base anchors
  const getHourlyRate = (rate: { base2h: number; full8h: number }) => {
    return (rate.full8h - rate.base2h) / 6;
  };

  // Calculate labor for a job type based on hours
  const calculateLaborForJobType = (hours: number, rate: { base2h: number; full8h: number }): number => {
    if (hours <= 0) return 0;

    if (hours <= 2) {
      // Minimum charge: 2h base rate
      return rate.base2h;
    } else if (hours <= 8) {
      // Between 2h and 8h: base + extra hours at hourly rate
      const hourlyRate = getHourlyRate(rate);
      return rate.base2h + ((hours - 2) * hourlyRate);
    } else {
      // Over 8h: 8h rate × number of days
      const days = hours / 8;
      return rate.full8h * days;
    }
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

  // Determine job type and calculate labor cost
  let laborCost = 0;
  let jobType = 'Surface Treatment';

  if (params.hasSubfloor) {
    laborCost = calculateLaborForJobType(totalHours, BASE_RATES.subfloor);
    jobType = 'Subfloor Treatment';
  } else if (hasDemolition) {
    laborCost = calculateLaborForJobType(totalHours, BASE_RATES.demolition);
    jobType = 'With Demolition';
  } else {
    laborCost = calculateLaborForJobType(totalHours, BASE_RATES.no_demolition);
    jobType = 'No Demolition';
  }

  // Apply discount based on HOURS (not days)
  // Hours-based discount tiers
  let discountMultiplier = 1.0;
  let discountPercent = 0;
  let discountText = '';

  if (totalHours <= 8) {
    // 1-8 hours (1 day): 0% discount
    discountMultiplier = 1.00;
    discountPercent = 0;
  } else if (totalHours <= 16) {
    // 9-16 hours (2 days): 7.5% discount
    discountMultiplier = 0.925;
    discountPercent = 7.5;
    discountText = '7.5% Multi-day Discount';
  } else if (totalHours <= 24) {
    // 17-24 hours (3 days): 10% discount
    discountMultiplier = 0.90;
    discountPercent = 10;
    discountText = '10% Multi-day Discount';
  } else if (totalHours <= 32) {
    // 25-32 hours (4 days): 12% discount
    discountMultiplier = 0.88;
    discountPercent = 12;
    discountText = '12% Multi-day Discount';
  } else {
    // 33+ hours (5+ days): 13% discount CAP - NEVER EXCEED
    discountMultiplier = 0.87;
    discountPercent = 13;
    discountText = '13% Multi-day Discount (CAP)';
  }

  // Apply discount to labor (NOT equipment)
  const laborBeforeDiscount = laborCost;
  laborCost = laborCost * discountMultiplier;

  // Calculate equipment hire (NO DISCOUNT)
  const equipmentCost =
    (params.dehumidifierQty * EQUIPMENT_RATES.dehumidifier * params.estimatedDays) +
    (params.airMoverQty * EQUIPMENT_RATES.airMover * params.estimatedDays) +
    (params.rcdQty * EQUIPMENT_RATES.rcd * params.estimatedDays);

  // Calculate totals
  const subtotal = laborCost + equipmentCost;
  const gst = subtotal * 0.1; // GST always 10%
  const total = subtotal + gst;

  // Build breakdown string
  const totalDays = Math.ceil(totalHours / 8);
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
    breakdown,
    discountPercent
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

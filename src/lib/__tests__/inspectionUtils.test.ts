import { describe, it, expect } from 'vitest'
import { calculateJobCost, calculateDewPoint, formatCurrency } from '../inspectionUtils'

describe('calculateJobCost', () => {
  // Base test parameters
  const baseParams = {
    areas: [{ timeWithoutDemo: 120, demolitionTime: 0, demolitionRequired: false }],
    subfloorTime: 0,
    hasSubfloor: false,
    dehumidifierQty: 0,
    airMoverQty: 0,
    rcdQty: 0,
    estimatedDays: 1,
  }

  describe('Discount Cap Enforcement (CRITICAL - 13% MAX)', () => {
    it('should never exceed 13% discount for 33+ hours', () => {
      // 33 hours = 13% cap
      const result = calculateJobCost({
        ...baseParams,
        areas: [{ timeWithoutDemo: 1980, demolitionTime: 0, demolitionRequired: false }], // 33h in minutes
      })
      expect(result.discountPercent).toBe(13)
    })

    it('should never exceed 13% discount for 100 hours', () => {
      const result = calculateJobCost({
        ...baseParams,
        areas: [{ timeWithoutDemo: 6000, demolitionTime: 0, demolitionRequired: false }], // 100h
      })
      expect(result.discountPercent).toBe(13)
      expect(result.discountPercent).toBeLessThanOrEqual(13)
    })

    it('should never exceed 13% discount for extreme hours (1000h)', () => {
      const result = calculateJobCost({
        ...baseParams,
        areas: [{ timeWithoutDemo: 60000, demolitionTime: 0, demolitionRequired: false }], // 1000h
      })
      expect(result.discountPercent).toBe(13)
      expect(result.discountPercent).toBeLessThanOrEqual(13)
    })
  })

  describe('Discount Tiers', () => {
    it('should apply 0% discount for 1-8 hours', () => {
      const result = calculateJobCost({
        ...baseParams,
        areas: [{ timeWithoutDemo: 480, demolitionTime: 0, demolitionRequired: false }], // 8h
      })
      expect(result.discountPercent).toBe(0)
    })

    it('should apply 7.5% discount for 9-16 hours', () => {
      const result = calculateJobCost({
        ...baseParams,
        areas: [{ timeWithoutDemo: 540, demolitionTime: 0, demolitionRequired: false }], // 9h
      })
      expect(result.discountPercent).toBe(7.5)
    })

    it('should apply 7.5% discount for exactly 16 hours', () => {
      const result = calculateJobCost({
        ...baseParams,
        areas: [{ timeWithoutDemo: 960, demolitionTime: 0, demolitionRequired: false }], // 16h
      })
      expect(result.discountPercent).toBe(7.5)
    })

    it('should apply 10% discount for 17-24 hours', () => {
      const result = calculateJobCost({
        ...baseParams,
        areas: [{ timeWithoutDemo: 1020, demolitionTime: 0, demolitionRequired: false }], // 17h
      })
      expect(result.discountPercent).toBe(10)
    })

    it('should apply 10% discount for exactly 24 hours', () => {
      const result = calculateJobCost({
        ...baseParams,
        areas: [{ timeWithoutDemo: 1440, demolitionTime: 0, demolitionRequired: false }], // 24h
      })
      expect(result.discountPercent).toBe(10)
    })

    it('should apply 12% discount for 25-32 hours', () => {
      const result = calculateJobCost({
        ...baseParams,
        areas: [{ timeWithoutDemo: 1500, demolitionTime: 0, demolitionRequired: false }], // 25h
      })
      expect(result.discountPercent).toBe(12)
    })

    it('should apply 12% discount for exactly 32 hours', () => {
      const result = calculateJobCost({
        ...baseParams,
        areas: [{ timeWithoutDemo: 1920, demolitionTime: 0, demolitionRequired: false }], // 32h
      })
      expect(result.discountPercent).toBe(12)
    })

    it('should apply 13% discount cap for 33+ hours', () => {
      const result = calculateJobCost({
        ...baseParams,
        areas: [{ timeWithoutDemo: 1980, demolitionTime: 0, demolitionRequired: false }], // 33h
      })
      expect(result.discountPercent).toBe(13)
    })
  })

  describe('Equipment Costs', () => {
    it('should calculate dehumidifier cost correctly ($132/day)', () => {
      const result = calculateJobCost({
        ...baseParams,
        dehumidifierQty: 2,
        estimatedDays: 3,
      })
      // 2 dehu × $132 × 3 days = $792
      expect(result.equipmentCost).toBe(792)
    })

    it('should calculate air mover cost correctly ($46/day)', () => {
      const result = calculateJobCost({
        ...baseParams,
        airMoverQty: 4,
        estimatedDays: 2,
      })
      // 4 air × $46 × 2 days = $368
      expect(result.equipmentCost).toBe(368)
    })

    it('should calculate RCD cost correctly ($5/day)', () => {
      const result = calculateJobCost({
        ...baseParams,
        rcdQty: 1,
        estimatedDays: 5,
      })
      // 1 RCD × $5 × 5 days = $25
      expect(result.equipmentCost).toBe(25)
    })

    it('should calculate combined equipment cost correctly', () => {
      const result = calculateJobCost({
        ...baseParams,
        dehumidifierQty: 2,
        airMoverQty: 3,
        rcdQty: 1,
        estimatedDays: 2,
      })
      // (2 × $132 + 3 × $46 + 1 × $5) × 2 = (264 + 138 + 5) × 2 = 814
      expect(result.equipmentCost).toBe(814)
    })

    it('should NOT apply discount to equipment costs', () => {
      // 17 hours = 10% discount on labor only
      const resultWithDiscount = calculateJobCost({
        ...baseParams,
        areas: [{ timeWithoutDemo: 1020, demolitionTime: 0, demolitionRequired: false }], // 17h
        dehumidifierQty: 1,
        estimatedDays: 3,
      })
      // Equipment should be $132 × 3 = $396 (no discount)
      expect(resultWithDiscount.equipmentCost).toBe(396)
    })
  })

  describe('GST Calculations', () => {
    it('should always apply 10% GST on subtotal', () => {
      const result = calculateJobCost({
        ...baseParams,
        areas: [{ timeWithoutDemo: 120, demolitionTime: 0, demolitionRequired: false }], // 2h
      })
      expect(result.gst).toBeCloseTo(result.subtotal * 0.1, 2)
    })

    it('should calculate total as subtotal + GST', () => {
      const result = calculateJobCost({
        ...baseParams,
        areas: [{ timeWithoutDemo: 240, demolitionTime: 0, demolitionRequired: false }], // 4h
      })
      expect(result.total).toBeCloseTo(result.subtotal + result.gst, 2)
    })
  })

  describe('Job Type Determination', () => {
    it('should identify no demolition job type', () => {
      const result = calculateJobCost({
        ...baseParams,
        areas: [{ timeWithoutDemo: 120, demolitionTime: 0, demolitionRequired: false }],
      })
      expect(result.breakdown).toContain('No Demolition')
    })

    it('should identify demolition job type', () => {
      const result = calculateJobCost({
        ...baseParams,
        areas: [{ timeWithoutDemo: 120, demolitionTime: 60, demolitionRequired: true }],
      })
      expect(result.breakdown).toContain('Demolition')
    })

    it('should identify subfloor job type (takes priority)', () => {
      const result = calculateJobCost({
        ...baseParams,
        areas: [{ timeWithoutDemo: 120, demolitionTime: 60, demolitionRequired: true }],
        hasSubfloor: true,
        subfloorTime: 60,
      })
      expect(result.breakdown).toContain('Subfloor')
    })
  })

  describe('Labor Cost Calculations', () => {
    it('should apply 2h minimum rate for jobs under 2 hours', () => {
      const result1h = calculateJobCost({
        ...baseParams,
        areas: [{ timeWithoutDemo: 60, demolitionTime: 0, demolitionRequired: false }], // 1h
      })
      const result2h = calculateJobCost({
        ...baseParams,
        areas: [{ timeWithoutDemo: 120, demolitionTime: 0, demolitionRequired: false }], // 2h
      })
      // Both should have the same base rate (2h minimum)
      expect(result1h.laborCost).toBe(result2h.laborCost)
      expect(result1h.laborCost).toBe(612) // BASE_RATES.no_demolition.base2h
    })

    it('should calculate hourly rate between 2-8 hours', () => {
      const result4h = calculateJobCost({
        ...baseParams,
        areas: [{ timeWithoutDemo: 240, demolitionTime: 0, demolitionRequired: false }], // 4h
      })
      // 2h base + 2h at hourly rate
      // hourlyRate = (1216.99 - 612) / 6 = 100.8316...
      // 4h = 612 + (2 × 100.8316) = 813.66
      expect(result4h.laborCost).toBeGreaterThan(612)
      expect(result4h.laborCost).toBeLessThan(1216.99)
    })

    it('should apply 8h rate for exactly 8 hours', () => {
      const result = calculateJobCost({
        ...baseParams,
        areas: [{ timeWithoutDemo: 480, demolitionTime: 0, demolitionRequired: false }], // 8h
      })
      // 2h base + 6h at hourly rate = 8h full rate
      expect(result.laborCost).toBeCloseTo(1216.99, 2)
    })
  })

  describe('Boundary Values', () => {
    it('should handle 0 hours (edge case)', () => {
      const result = calculateJobCost({
        ...baseParams,
        areas: [{ timeWithoutDemo: 0, demolitionTime: 0, demolitionRequired: false }],
      })
      expect(result.laborCost).toBe(0)
    })

    it('should handle exactly 8h (boundary)', () => {
      const result = calculateJobCost({
        ...baseParams,
        areas: [{ timeWithoutDemo: 480, demolitionTime: 0, demolitionRequired: false }],
      })
      expect(result.discountPercent).toBe(0)
    })

    it('should handle exactly 8h + 1 minute (boundary)', () => {
      const result = calculateJobCost({
        ...baseParams,
        areas: [{ timeWithoutDemo: 481, demolitionTime: 0, demolitionRequired: false }],
      })
      // 481 min = 8.016h which is > 8h, so 7.5% discount applies
      expect(result.discountPercent).toBe(7.5)
    })

    it('should handle exactly 9h (boundary)', () => {
      const result = calculateJobCost({
        ...baseParams,
        areas: [{ timeWithoutDemo: 540, demolitionTime: 0, demolitionRequired: false }],
      })
      expect(result.discountPercent).toBe(7.5) // Now 7.5%
    })

    it('should handle exactly 16h (boundary)', () => {
      const result = calculateJobCost({
        ...baseParams,
        areas: [{ timeWithoutDemo: 960, demolitionTime: 0, demolitionRequired: false }],
      })
      expect(result.discountPercent).toBe(7.5)
    })

    it('should handle exactly 17h (boundary)', () => {
      const result = calculateJobCost({
        ...baseParams,
        areas: [{ timeWithoutDemo: 1020, demolitionTime: 0, demolitionRequired: false }],
      })
      expect(result.discountPercent).toBe(10) // Now 10%
    })

    it('should handle exactly 24h (boundary)', () => {
      const result = calculateJobCost({
        ...baseParams,
        areas: [{ timeWithoutDemo: 1440, demolitionTime: 0, demolitionRequired: false }],
      })
      expect(result.discountPercent).toBe(10)
    })

    it('should handle exactly 25h (boundary)', () => {
      const result = calculateJobCost({
        ...baseParams,
        areas: [{ timeWithoutDemo: 1500, demolitionTime: 0, demolitionRequired: false }],
      })
      expect(result.discountPercent).toBe(12) // Now 12%
    })

    it('should handle exactly 32h (boundary)', () => {
      const result = calculateJobCost({
        ...baseParams,
        areas: [{ timeWithoutDemo: 1920, demolitionTime: 0, demolitionRequired: false }],
      })
      expect(result.discountPercent).toBe(12)
    })

    it('should handle exactly 33h (boundary - CAP)', () => {
      const result = calculateJobCost({
        ...baseParams,
        areas: [{ timeWithoutDemo: 1980, demolitionTime: 0, demolitionRequired: false }],
      })
      expect(result.discountPercent).toBe(13) // CAP
    })
  })

  describe('Real-World Scenarios', () => {
    it('should calculate typical 2-day job correctly', () => {
      // 16 hours (2 days), 2 dehu, 4 air movers, 1 RCD
      const result = calculateJobCost({
        areas: [{ timeWithoutDemo: 960, demolitionTime: 0, demolitionRequired: false }],
        subfloorTime: 0,
        hasSubfloor: false,
        dehumidifierQty: 2,
        airMoverQty: 4,
        rcdQty: 1,
        estimatedDays: 2,
      })

      // 7.5% discount on labor
      expect(result.discountPercent).toBe(7.5)

      // Equipment: (2×132 + 4×46 + 1×5) × 2 = (264 + 184 + 5) × 2 = 906
      expect(result.equipmentCost).toBe(906)

      // All values should be rounded to 2 decimal places
      expect(Number.isFinite(result.laborCost)).toBe(true)
      expect(Number.isFinite(result.subtotal)).toBe(true)
      expect(Number.isFinite(result.gst)).toBe(true)
      expect(Number.isFinite(result.total)).toBe(true)
    })

    it('should calculate large commercial job correctly', () => {
      // 40 hours (5 days), demolition required
      // 4 dehu, 8 air movers, 2 RCDs
      const result = calculateJobCost({
        areas: [{ timeWithoutDemo: 1800, demolitionTime: 600, demolitionRequired: true }],
        subfloorTime: 0,
        hasSubfloor: false,
        dehumidifierQty: 4,
        airMoverQty: 8,
        rcdQty: 2,
        estimatedDays: 5,
      })

      // 13% discount cap (40h > 33h)
      expect(result.discountPercent).toBe(13)
      expect(result.discountPercent).toBeLessThanOrEqual(13)

      // Equipment: (4×132 + 8×46 + 2×5) × 5 = (528 + 368 + 10) × 5 = 4530
      expect(result.equipmentCost).toBe(4530)
    })
  })
})

describe('calculateDewPoint', () => {
  it('should calculate dew point correctly', () => {
    // Formula: Td ≈ T - ((100 - RH)/5)
    // Example: 25°C, 60% humidity
    // Td = 25 - ((100-60)/5) = 25 - 8 = 17
    const result = calculateDewPoint(25, 60)
    expect(result).toBe(17)
  })

  it('should return 0 for missing temperature', () => {
    expect(calculateDewPoint(0, 60)).toBe(0)
  })

  it('should return 0 for missing humidity', () => {
    expect(calculateDewPoint(25, 0)).toBe(0)
  })

  it('should round to 1 decimal place', () => {
    const result = calculateDewPoint(23, 55)
    // Td = 23 - ((100-55)/5) = 23 - 9 = 14
    expect(result).toBe(14)
  })
})

describe('formatCurrency', () => {
  it('should format Australian currency correctly', () => {
    const result = formatCurrency(1234.56)
    expect(result).toContain('1,234.56')
    expect(result).toContain('$')
  })

  it('should format large amounts with comma separators', () => {
    const result = formatCurrency(12345678.90)
    expect(result).toContain('12,345,678.90')
  })

  it('should format zero correctly', () => {
    const result = formatCurrency(0)
    expect(result).toContain('0.00')
  })

  it('should format negative amounts correctly', () => {
    const result = formatCurrency(-500.25)
    expect(result).toContain('500.25')
    // Note: negative format may vary by locale
  })
})

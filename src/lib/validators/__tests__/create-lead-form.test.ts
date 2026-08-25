import { describe, expect, it } from 'vitest'

import {
  toNullableField,
  validateCreateLeadForm,
  type CreateLeadFormValues,
} from '../create-lead-form'

const MIN_DATE = '2026-09-01'

const validValues: CreateLeadFormValues = {
  fullName: 'Jane Citizen',
  phone: '0412 345 678',
  email: 'jane@example.com',
  propertyAddress: '12 Example Street',
  suburb: 'Brunswick',
  postcode: '3056',
  preferredDate: '2026-09-10',
  preferredTime: '09:00',
  issueDescription: 'Black mould spreading across the bathroom ceiling.',
  source: 'website',
}

describe('validateCreateLeadForm — preferred date/time are optional', () => {
  it('should return no errors when preferred date and time are empty', () => {
    const errors = validateCreateLeadForm(
      { ...validValues, preferredDate: '', preferredTime: '' },
      MIN_DATE,
    )

    expect(errors).toEqual({})
  })

  it('should return no errors when only preferred date is supplied', () => {
    const errors = validateCreateLeadForm({ ...validValues, preferredTime: '' }, MIN_DATE)

    expect(errors).toEqual({})
  })

  it('should return no errors when only preferred time is supplied', () => {
    const errors = validateCreateLeadForm({ ...validValues, preferredDate: '' }, MIN_DATE)

    expect(errors).toEqual({})
  })

  it('should still reject a preferred date in the past', () => {
    const errors = validateCreateLeadForm({ ...validValues, preferredDate: '2026-08-01' }, MIN_DATE)

    expect(errors.preferredDate).toBe('Date must be in the future')
  })

  it('should accept a preferred date on the minimum date', () => {
    const errors = validateCreateLeadForm({ ...validValues, preferredDate: MIN_DATE }, MIN_DATE)

    expect(errors.preferredDate).toBeUndefined()
  })
})

describe('validateCreateLeadForm — required fields are unchanged', () => {
  it('should require full name', () => {
    const errors = validateCreateLeadForm({ ...validValues, fullName: '  ' }, MIN_DATE)

    expect(errors.fullName).toBe('Full name is required')
  })

  it('should require a 10-digit phone number', () => {
    const errors = validateCreateLeadForm({ ...validValues, phone: '0412 345' }, MIN_DATE)

    expect(errors.phone).toBe('Please enter a valid Australian phone number')
  })

  it('should require a valid email', () => {
    const errors = validateCreateLeadForm({ ...validValues, email: 'not-an-email' }, MIN_DATE)

    expect(errors.email).toBe('Please enter a valid email address')
  })

  it('should require a Victorian postcode', () => {
    const errors = validateCreateLeadForm({ ...validValues, postcode: '2000' }, MIN_DATE)

    expect(errors.postcode).toBe('Must be a 4-digit Victorian postcode (3XXX)')
  })

  it('should require at least 20 characters of issue description', () => {
    const errors = validateCreateLeadForm({ ...validValues, issueDescription: 'Mould' }, MIN_DATE)

    expect(errors.issueDescription).toBe('Please provide more detail (at least 20 characters)')
  })

  it('should require a lead source', () => {
    const errors = validateCreateLeadForm({ ...validValues, source: '' }, MIN_DATE)

    expect(errors.source).toBe('Lead source is required')
  })
})

describe('toNullableField', () => {
  it('should return null for an empty string', () => {
    expect(toNullableField('')).toBeNull()
  })

  it('should return null for whitespace only', () => {
    expect(toNullableField('   ')).toBeNull()
  })

  it('should return the trimmed value when present', () => {
    expect(toNullableField(' 2026-09-10 ')).toBe('2026-09-10')
  })

  it('should pass a time value through unchanged', () => {
    expect(toNullableField('09:30')).toBe('09:30')
  })
})

/**
 * Zod Validation Schemas for Lead Creation
 *
 * Provides runtime validation for:
 * - HiPages quick lead entry (4 required fields)
 * - Normal lead entry (8 required fields)
 * - Australian phone numbers
 * - Melbourne/Victorian postcodes
 * - Email addresses
 */

import { z } from 'zod';

// ============================================================================
// REGEX PATTERNS
// ============================================================================

/**
 * Australian mobile phone number patterns
 * Accepts: 04XX XXX XXX, 04XXXXXXXX, +614XX XXX XXX, +614XXXXXXXX
 */
const AUSTRALIAN_MOBILE_REGEX = /^(\+?61|0)4\d{8}$/;

/**
 * Victorian postcode pattern
 * Accepts: 3XXX (3000-3999)
 */
const VICTORIAN_POSTCODE_REGEX = /^3\d{3}$/;

/**
 * Email validation (RFC 5322 compliant)
 */
const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$/;

// ============================================================================
// REUSABLE FIELD VALIDATORS
// ============================================================================

/**
 * Australian mobile phone number validator
 * Accepts formats: 0412345678, 0412 345 678, +61412345678
 */
export const australianPhoneSchema = z
  .string()
  .min(1, 'Phone number is required')
  .transform((val) => val.replace(/\s+/g, '')) // Remove spaces
  .refine(
    (val) => AUSTRALIAN_MOBILE_REGEX.test(val),
    'Must be a valid Australian mobile number (e.g., 0412 345 678)'
  );

/**
 * Victorian postcode validator
 * Accepts: 3000-3999 (Melbourne metro and regional Victoria)
 */
export const victorianPostcodeSchema = z
  .string()
  .min(1, 'Postcode is required')
  .length(4, 'Postcode must be 4 digits')
  .refine(
    (val) => VICTORIAN_POSTCODE_REGEX.test(val),
    'Must be a Victorian postcode (3XXX)'
  );

/**
 * Email address validator
 */
export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Must be a valid email address')
  .refine(
    (val) => EMAIL_REGEX.test(val),
    'Email format is invalid'
  )
  .transform((val) => val.toLowerCase().trim());

/**
 * Suburb name validator
 * Melbourne suburb names (e.g., 'Melbourne', 'Carlton', 'Richmond')
 */
export const suburbSchema = z
  .string()
  .min(1, 'Suburb is required')
  .min(2, 'Suburb must be at least 2 characters')
  .max(100, 'Suburb must be less than 100 characters')
  .transform((val) =>
    val
      .trim()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  );

/**
 * Full name validator
 */
export const fullNameSchema = z
  .string()
  .min(1, 'Full name is required')
  .min(2, 'Name must be at least 2 characters')
  .max(255, 'Name must be less than 255 characters')
  .refine(
    (val) => val.trim().split(/\s+/).length >= 1,
    'Please enter a full name'
  );

/**
 * Street address validator
 */
export const streetAddressSchema = z
  .string()
  .min(1, 'Street address is required')
  .min(5, 'Street address must be at least 5 characters')
  .max(255, 'Street address must be less than 255 characters');

/**
 * Issue description validator
 * Used for Normal lead entry to describe mould problem
 */
export const issueDescriptionSchema = z
  .string()
  .min(1, 'Issue description is required')
  .min(20, 'Please provide at least 20 characters describing the issue')
  .max(1000, 'Description must be less than 1000 characters');

/**
 * Notes validator (optional field)
 */
export const notesSchema = z
  .string()
  .max(2000, 'Notes must be less than 2000 characters')
  .optional();

/**
 * Booking urgency validator
 */
export const bookingUrgencySchema = z.enum([
  'ASAP',
  'within_week',
  'couple_weeks',
  'within_month',
  'couple_months',
], {
  errorMap: () => ({ message: 'Please select an urgency level' }),
});

/**
 * Property type validator (optional)
 */
export const propertyTypeSchema = z
  .enum([
    'house',
    'unit',
    'apartment',
    'townhouse',
    'duplex',
    'commercial',
    'other',
  ])
  .optional();

/**
 * Lead source validator (optional, with default)
 */
export const leadSourceSchema = z
  .enum([
    'website',
    'hipages',
    'google',
    'referral',
    'repeat',
    'facebook',
    'instagram',
    'other',
  ])
  .default('website');

// ============================================================================
// HIPAGES LEAD SCHEMA (QUICK ENTRY)
// ============================================================================

/**
 * Validation schema for HiPages quick lead entry
 *
 * Required fields:
 * - suburb: Melbourne suburb name
 * - postcode: Victorian postcode (3XXX)
 * - phone: Australian mobile number
 * - email: Valid email address
 *
 * Optional fields:
 * - full_name: Customer name
 * - notes: Quick notes
 */
export const hiPagesLeadSchema = z.object({
  // Required fields
  suburb: suburbSchema,
  postcode: victorianPostcodeSchema,
  phone: australianPhoneSchema,
  email: emailSchema,

  // Optional fields
  full_name: fullNameSchema.optional(),
  notes: notesSchema,
});

/**
 * TypeScript type inferred from hiPagesLeadSchema
 */
export type HiPagesLeadSchemaType = z.infer<typeof hiPagesLeadSchema>;

// ============================================================================
// NORMAL LEAD SCHEMA (FULL ENTRY)
// ============================================================================

/**
 * Validation schema for Normal lead entry
 *
 * Required fields:
 * - full_name: Customer full name
 * - email: Email address
 * - phone: Australian mobile number
 * - street: Street address
 * - suburb: Melbourne suburb
 * - postcode: Victorian postcode (3XXX)
 * - urgency: Booking urgency level
 * - issue_description: Detailed problem description (20-1000 chars)
 *
 * Optional fields:
 * - property_type: Type of property
 * - notes: Internal notes
 * - lead_source: Where lead came from (default: 'website')
 */
export const normalLeadSchema = z.object({
  // Customer details
  full_name: fullNameSchema,
  email: emailSchema,
  phone: australianPhoneSchema,

  // Property address
  street: streetAddressSchema,
  suburb: suburbSchema,
  postcode: victorianPostcodeSchema,

  // Issue details
  urgency: bookingUrgencySchema,
  issue_description: issueDescriptionSchema,

  // Optional fields
  property_type: propertyTypeSchema,
  notes: notesSchema,
  lead_source: leadSourceSchema,
});

/**
 * TypeScript type inferred from normalLeadSchema
 */
export type NormalLeadSchemaType = z.infer<typeof normalLeadSchema>;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format Australian phone number for display
 * Converts: 0412345678 → 0412 345 678
 * Converts: +61412345678 → +61 412 345 678
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');

  // Handle international format (+61)
  if (cleaned.startsWith('+61')) {
    const digits = cleaned.slice(3); // Remove +61
    return `+61 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }

  // Handle local format (04XX XXX XXX)
  if (cleaned.startsWith('04') && cleaned.length === 10) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }

  // Return as-is if format is unexpected
  return phone;
}

/**
 * Normalize Australian phone number for storage
 * Converts: 0412 345 678 → 0412345678
 * Converts: +61 412 345 678 → +61412345678
 */
export function normalizePhoneNumber(phone: string): string {
  return phone.replace(/\s+/g, '');
}

/**
 * Format suburb name for display and storage
 * Converts: 'melbourne' → 'Melbourne'
 * Converts: 'PORT MELBOURNE' → 'Port Melbourne'
 */
export function formatSuburbName(suburb: string): string {
  return suburb
    .trim()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Validate if postcode matches suburb
 * Uses suburb_zones lookup table
 *
 * @param suburb - Suburb name
 * @param postcode - Postcode to validate
 * @returns true if valid, false otherwise
 */
export function validateSuburbPostcode(suburb: string, postcode: string): boolean {
  // This function would query suburb_zones table
  // For now, just validate format
  return VICTORIAN_POSTCODE_REGEX.test(postcode);
}

/**
 * Parse validation errors into user-friendly messages
 *
 * @param error - Zod validation error
 * @returns Object with field names as keys and error messages as values
 */
export function parseValidationErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};

  error.errors.forEach((err) => {
    const field = err.path.join('.');
    errors[field] = err.message;
  });

  return errors;
}

/**
 * Safe parse with validation error handling
 *
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Parsed data or validation errors
 */
export function safeValidate<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; errors: Record<string, string> } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, errors: parseValidationErrors(result.error) };
  }
}

// ============================================================================
// FIELD-SPECIFIC VALIDATION HELPERS
// ============================================================================

/**
 * Validate email format (client-side)
 */
export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

/**
 * Validate Australian phone format (client-side)
 */
export function isValidAustralianPhone(phone: string): boolean {
  const normalized = phone.replace(/\s+/g, '');
  return AUSTRALIAN_MOBILE_REGEX.test(normalized);
}

/**
 * Validate Victorian postcode (client-side)
 */
export function isValidVictorianPostcode(postcode: string): boolean {
  return VICTORIAN_POSTCODE_REGEX.test(postcode);
}

/**
 * Check if field is empty or whitespace only
 */
export function isEmpty(value: string | undefined | null): boolean {
  return !value || value.trim().length === 0;
}

// ============================================================================
// REAL-TIME VALIDATION HELPERS
// ============================================================================

/**
 * Validate single field in real-time
 * Used for inline validation as user types
 *
 * @param fieldName - Name of the field to validate
 * @param value - Value to validate
 * @param schema - Zod schema for the form
 * @returns Error message or null if valid
 */
export function validateField<T extends z.ZodTypeAny>(
  fieldName: string,
  value: unknown,
  schema: T
): string | null {
  try {
    // Extract field schema
    if (schema instanceof z.ZodObject) {
      const fieldSchema = schema.shape[fieldName];
      if (fieldSchema) {
        fieldSchema.parse(value);
        return null;
      }
    }
    return null;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return error.errors[0]?.message || 'Invalid value';
    }
    return 'Validation error';
  }
}

/**
 * Check if form data has any validation errors
 *
 * @param schema - Zod schema to validate against
 * @param data - Form data to validate
 * @returns true if valid, false if has errors
 */
export function isFormValid<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
): boolean {
  const result = schema.safeParse(data);
  return result.success;
}

/**
 * Type Definitions for Dual-Path Lead Creation Feature
 *
 * Supports two lead creation workflows:
 * 1. HiPages Quick Entry - Minimal fields (suburb, postcode, phone, email)
 * 2. Normal Lead Entry - Full details (name, address, urgency, description)
 */

import type { Database } from './database.types';

// ============================================================================
// DATABASE TYPES
// ============================================================================

type LeadStatus = Database['public']['Enums']['lead_status'];
type LeadInsert = Database['public']['Tables']['leads']['Insert'];
type LeadRow = Database['public']['Tables']['leads']['Row'];

// ============================================================================
// BOOKING URGENCY
// ============================================================================

/**
 * Booking urgency levels for Normal Lead workflow
 */
export type BookingUrgency =
  | 'ASAP'              // Urgent - need help immediately
  | 'within_week'       // Need service in next 7 days
  | 'couple_weeks'      // Flexible - within 2 weeks
  | 'within_month'      // Not urgent - within 30 days
  | 'couple_months';    // Planning ahead - 2-3 months

/**
 * Urgency option for dropdown display
 */
export interface UrgencyOption {
  value: BookingUrgency;
  label: string;
  description: string;
  color?: 'red' | 'orange' | 'yellow' | 'green' | 'blue';
}

// ============================================================================
// HIPAGES LEAD (QUICK ENTRY)
// ============================================================================

/**
 * Input data for HiPages quick lead entry
 * Minimal fields for fast data entry from HiPages marketplace
 */
export interface HiPagesLeadInput {
  // Required fields
  suburb: string;                          // Melbourne suburb name
  postcode: string;                        // Victorian postcode (3XXX)
  phone: string;                           // Australian mobile (04XX XXX XXX)
  email: string;                           // Customer email

  // Optional fields
  full_name?: string;                      // Customer name (if provided)
  notes?: string;                          // Quick notes about the lead
}

/**
 * Formatted HiPages lead ready for database insertion
 */
export interface HiPagesLeadData extends LeadInsert {
  // Mapped from input
  property_address_suburb: string;         // From: suburb
  property_address_postcode: string;       // From: postcode
  phone: string;                           // From: phone (formatted)
  email: string;                           // From: email (normalized)
  full_name: string;                       // From: full_name or 'HiPages Lead'

  // Auto-populated
  lead_source: 'hipages';                  // Always 'hipages'
  status: LeadStatus;                      // 'hipages_lead' or 'new_lead'
  property_address_state: 'VIC';           // Always Victoria
  property_address_street: string;         // Default: 'To be confirmed'

  // Optional from input
  notes?: string;                          // From: notes
  property_zone?: number;                  // Auto-calculated from suburb_zones
}

// ============================================================================
// NORMAL LEAD (FULL ENTRY)
// ============================================================================

/**
 * Input data for Normal lead entry
 * Complete lead information for standard workflow
 */
export interface NormalLeadInput {
  // Customer details
  full_name: string;                       // Full name (required)
  email: string;                           // Email address
  phone: string;                           // Phone number (04XX XXX XXX)

  // Property address
  street: string;                          // Street address
  suburb: string;                          // Melbourne suburb
  postcode: string;                        // Victorian postcode (3XXX)
  property_type?: string;                  // Type: house, unit, apartment, etc.

  // Issue details
  urgency: BookingUrgency;                 // How urgent is the service?
  issue_description: string;               // Detailed description (20-1000 chars)

  // Additional info
  notes?: string;                          // Internal notes
  lead_source?: string;                    // Source: 'website', 'referral', 'google', etc.
}

/**
 * Formatted Normal lead ready for database insertion
 */
export interface NormalLeadData extends LeadInsert {
  // Mapped from input
  full_name: string;                       // From: full_name
  email: string;                           // From: email (normalized)
  phone: string;                           // From: phone (formatted)
  property_address_street: string;         // From: street
  property_address_suburb: string;         // From: suburb
  property_address_postcode: string;       // From: postcode
  urgency: string;                         // From: urgency
  issue_description: string;               // From: issue_description

  // Auto-populated
  status: 'new_lead';                      // Always 'new_lead' for normal leads
  property_address_state: 'VIC';           // Always Victoria
  lead_source: string;                     // From: lead_source or 'website'

  // Optional from input
  property_type?: string;                  // From: property_type
  notes?: string;                          // From: notes
  property_zone?: number;                  // Auto-calculated from suburb_zones
}

// ============================================================================
// LEAD CREATION RESPONSE
// ============================================================================

/**
 * Response after successfully creating a lead
 */
export interface LeadCreationResponse {
  success: true;
  lead: {
    id: string;                            // UUID
    lead_number: string | null;            // Auto-generated (L-042) or null
    full_name: string;                     // Customer name
    email: string;                         // Customer email
    phone: string;                         // Customer phone
    suburb: string;                        // Property suburb
    postcode: string;                      // Property postcode
    status: LeadStatus;                    // Current status
    lead_source: string;                   // Lead source
    created_at: string;                    // ISO timestamp
  };
  message: string;                         // Success message for user
}

/**
 * Error response when lead creation fails
 */
export interface LeadCreationError {
  success: false;
  error: string;                           // Error message
  code?: string;                           // Error code (e.g., 'DUPLICATE_LEAD')
  details?: Record<string, string>;        // Field-specific errors
}

/**
 * Combined lead creation result
 */
export type LeadCreationResult = LeadCreationResponse | LeadCreationError;

// ============================================================================
// FORM STATE
// ============================================================================

/**
 * Form state for HiPages lead entry
 */
export interface HiPagesLeadFormState {
  // Form data
  data: HiPagesLeadInput;

  // Form state
  isSubmitting: boolean;
  isValid: boolean;
  errors: Partial<Record<keyof HiPagesLeadInput, string>>;

  // Submission result
  result?: LeadCreationResult;
}

/**
 * Form state for Normal lead entry
 */
export interface NormalLeadFormState {
  // Form data
  data: NormalLeadInput;

  // Form state
  isSubmitting: boolean;
  isValid: boolean;
  errors: Partial<Record<keyof NormalLeadInput, string>>;

  // Submission result
  result?: LeadCreationResult;
}

// ============================================================================
// LEAD TYPE SELECTOR
// ============================================================================

/**
 * Lead type for dual-path selection
 */
export type LeadType = 'hipages' | 'normal';

/**
 * Lead type option for UI selection
 */
export interface LeadTypeOption {
  type: LeadType;
  label: string;
  description: string;
  icon: string;                            // Icon name or emoji
  color: 'orange' | 'blue' | 'green';     // Theme color
  fields: string[];                        // Field names shown in this type
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Suburb lookup result from suburb_zones table
 */
export interface SuburbZone {
  suburb: string;
  postcode: string;
  zone: 1 | 2 | 3 | 4;                     // Travel zone (1=closest, 4=furthest)
  region: string | null;                   // Region name
}

/**
 * Duplicate lead detection result
 */
export interface DuplicateLeadCheck {
  isDuplicate: boolean;
  existingLead?: {
    id: string;
    lead_number: string | null;
    full_name: string;
    email: string;
    phone: string;
    status: LeadStatus;
    created_at: string;
  };
  message?: string;                        // Message to show user
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Urgency options for dropdown
 */
export const URGENCY_OPTIONS: UrgencyOption[] = [
  {
    value: 'ASAP',
    label: 'ASAP - As soon as possible',
    description: 'Urgent - need help immediately',
    color: 'red',
  },
  {
    value: 'within_week',
    label: 'Within a week',
    description: 'Need service in the next 7 days',
    color: 'orange',
  },
  {
    value: 'couple_weeks',
    label: 'Next couple of weeks',
    description: 'Flexible - within 2 weeks',
    color: 'yellow',
  },
  {
    value: 'within_month',
    label: 'Within a month',
    description: 'Not urgent - within 30 days',
    color: 'green',
  },
  {
    value: 'couple_months',
    label: 'Next couple of months',
    description: 'Planning ahead - 2-3 months',
    color: 'blue',
  },
];

/**
 * Lead type options for selector
 */
export const LEAD_TYPE_OPTIONS: LeadTypeOption[] = [
  {
    type: 'hipages',
    label: 'HiPages Lead',
    description: 'Quick entry - suburb, postcode, phone, email',
    icon: '⚡',
    color: 'orange',
    fields: ['suburb', 'postcode', 'phone', 'email'],
  },
  {
    type: 'normal',
    label: 'Normal Lead',
    description: 'Full entry - complete customer and property details',
    icon: '📋',
    color: 'blue',
    fields: [
      'full_name',
      'email',
      'phone',
      'street',
      'suburb',
      'postcode',
      'urgency',
      'issue_description',
    ],
  },
];

/**
 * Property type options
 */
export const PROPERTY_TYPE_OPTIONS = [
  { value: 'house', label: 'House' },
  { value: 'unit', label: 'Unit' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'duplex', label: 'Duplex' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'other', label: 'Other' },
] as const;

/**
 * Lead source options
 */
export const LEAD_SOURCE_OPTIONS = [
  { value: 'website', label: 'Website' },
  { value: 'hipages', label: 'HiPages' },
  { value: 'google', label: 'Google Search' },
  { value: 'referral', label: 'Referral' },
  { value: 'repeat', label: 'Repeat Customer' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'other', label: 'Other' },
] as const;

/**
 * Pure validation for the admin Create New Lead form (CreateNewLeadModal).
 *
 * Kept outside the component so the rules can be unit-tested without
 * rendering. Preferred date/time are advisory-only and optional — both
 * `customer_preferred_*` columns are nullable and write-once at creation.
 */

import { isValidVictorianPostcode } from './lead-creation.schemas';

export interface CreateLeadFormValues {
  fullName: string;
  phone: string;
  email: string;
  propertyAddress: string;
  suburb: string;
  postcode: string;
  preferredDate: string;
  preferredTime: string;
  issueDescription: string;
  source: string;
}

export type CreateLeadFormErrors = Partial<Record<keyof CreateLeadFormValues, string>>;

const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 255;
const MIN_PHONE_DIGITS = 10;
const MIN_ADDRESS_LENGTH = 5;
const MIN_DESCRIPTION_LENGTH = 20;
const MAX_DESCRIPTION_LENGTH = 1000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateCreateLeadForm(
  values: CreateLeadFormValues,
  minPreferredDate: string,
): CreateLeadFormErrors {
  const errors: CreateLeadFormErrors = {};

  const fullName = values.fullName.trim();
  if (!fullName) {
    errors.fullName = 'Full name is required';
  } else if (fullName.length < MIN_NAME_LENGTH) {
    errors.fullName = 'Name must be at least 2 characters';
  } else if (fullName.length > MAX_NAME_LENGTH) {
    errors.fullName = 'Name must be less than 255 characters';
  }

  const phoneDigits = values.phone.replace(/\D/g, '');
  if (!phoneDigits) {
    errors.phone = 'Phone number is required';
  } else if (phoneDigits.length < MIN_PHONE_DIGITS) {
    errors.phone = 'Please enter a valid Australian phone number';
  }

  if (!values.email.trim()) {
    errors.email = 'Email is required';
  } else if (!EMAIL_PATTERN.test(values.email)) {
    errors.email = 'Please enter a valid email address';
  }

  const propertyAddress = values.propertyAddress.trim();
  if (!propertyAddress) {
    errors.propertyAddress = 'Street address is required';
  } else if (propertyAddress.length < MIN_ADDRESS_LENGTH) {
    errors.propertyAddress = 'Please enter a complete address';
  }

  if (!values.suburb.trim()) {
    errors.suburb = 'Suburb is required';
  }

  if (!values.postcode.trim()) {
    errors.postcode = 'Postcode is required';
  } else if (!isValidVictorianPostcode(values.postcode)) {
    errors.postcode = 'Must be a 4-digit Victorian postcode (3XXX)';
  }

  if (values.preferredDate && values.preferredDate < minPreferredDate) {
    errors.preferredDate = 'Date must be in the future';
  }

  const issueDescription = values.issueDescription.trim();
  if (!issueDescription) {
    errors.issueDescription = 'Brief description is required';
  } else if (issueDescription.length < MIN_DESCRIPTION_LENGTH) {
    errors.issueDescription = 'Please provide more detail (at least 20 characters)';
  } else if (issueDescription.length > MAX_DESCRIPTION_LENGTH) {
    errors.issueDescription = 'Description must be less than 1000 characters';
  }

  if (!values.source) {
    errors.source = 'Lead source is required';
  }

  return errors;
}

/** Empty form inputs must reach nullable DB columns as NULL, never ''. */
export function toNullableField(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

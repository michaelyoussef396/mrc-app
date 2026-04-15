/**
 * Centralised test credentials + IDs. Read from env so nothing sensitive
 * ships in the repo. Non-auth values have safe defaults for local dev.
 */

function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `Missing env var ${name}. Set it in .env.test or your shell before running Playwright.`,
    );
  }
  return v;
}

export const credentials = {
  admin: {
    email: process.env.ADMIN_EMAIL ?? '',
    password: process.env.ADMIN_PASSWORD ?? '',
  },
  technician: {
    email: process.env.TECH_EMAIL ?? '',
    password: process.env.TECH_PASSWORD ?? '',
  },
};

export function requireAdmin() {
  return {
    email: required('ADMIN_EMAIL'),
    password: required('ADMIN_PASSWORD'),
  };
}

export function requireTech() {
  return {
    email: required('TECH_EMAIL'),
    password: required('TECH_PASSWORD'),
  };
}

export const fixtures = {
  leadId: process.env.TEST_LEAD_ID ?? '',
  inspectionId: process.env.TEST_INSPECTION_ID ?? '',
};

/** Generate a unique string for test data (new leads etc.) */
export function uniqueSuffix(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export const sampleLead = {
  fullName: () => `PW Test ${uniqueSuffix()}`,
  phone: '0400000000',
  email: () => `pwtest+${uniqueSuffix()}@mouldandrestoration.com.au`,
  street: '1 Test Street',
  suburb: 'Melbourne',
  postcode: '3000',
  state: 'VIC',
};

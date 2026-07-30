/**
 * Fixture IDs for the pre-merge breadth run.
 *
 * Defaults are the DEV rows staged by the HEPA/waste session and recorded in
 * docs/PRE_MERGE_TESTING_CHECKLIST.md §3. DEV was restored from PROD, so the
 * same ids exist in both. Override via env when running elsewhere.
 *
 * These are row identifiers only — no credentials. Credentials come from
 * ADMIN_EMAIL / ADMIN_PASSWORD / TECH_EMAIL / TECH_PASSWORD via
 * tests/e2e/helpers/test-data.ts and are never committed.
 */

/**
 * Lead behind job completion JOB-2026-2237
 * (job_completion id 1b81f7e7-c094-43f0-9321-7424042433c5).
 *
 * IMPORTANT: /technician/job-completion/:leadId takes the LEAD id, not the
 * job-completion id. Passing 1b81f7e7… would 404.
 */
export const JOB_COMPLETION_LEAD_ID =
  process.env.PRE_MERGE_JOB_LEAD_ID ?? '24422eb2-053b-4450-af8b-8ee36aba622e';

/**
 * Lead behind inspection fc568a31-f9f3-44b3-9915-0173abd617ff — Both-options
 * mode, HEPA 2 units x 3 days, waste 6 m3 / $550, 5 treatment methods.
 */
export const INSPECTION_LEAD_ID =
  process.env.PRE_MERGE_INSPECTION_LEAD_ID ?? '8f49753a-6901-44e1-9c12-4d548597ad63';

/** Any lead reachable by an admin — used for the invoice helper route. */
export const INVOICE_LEAD_ID =
  process.env.PRE_MERGE_INVOICE_LEAD_ID ?? INSPECTION_LEAD_ID;

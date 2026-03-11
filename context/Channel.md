# Handoff to Claude Code: Security Remediation & Compliance Roadmap (2026)

**ROLE:** Security Engineer / Full-Stack Developer (Claude Code)
**TASK:** Execute the prioritized remediation plan for the MRC application based on the Deep Research Audit.
**CONTEXT:**

- `security_audit_report.md` (Main findings & roadmap)
- Supabase Project (Auth, DB, Storage)
- Vercel Deployment

**REASONING:** The application is currently vulnerable to React2Shell (RCE), SSRF in PDF generation, and RLS bypasses. Furthermore, it lacks mandatory Australian 2026 privacy compliance features (AI transparency, immutable audit logs).

**REMEDIATION STEPS:**

1. **Infrastructure & Patching:** Upgrade React to `19.2.1+` and sanitize all inputs using `DOMPurify`.
2. **SSRF Prevention:** Implement `dssrf` deterministic blocking for all Edge Functions that generate PDFs or reach out to external URLs.
3. **Database Hardening:**
   - Audit all RLS policies for `auth.uid()` enforcement.
   - Implement an append-only `audit_logs` system with row-level hashing.
4. **Compliance Features:**
   - Update `PrivacyPolicy` and UI with AI disclosures (required Dec 2026).
   - Implement `IICRC S520` documentation standards (tamper-proof trails).
5. **Rate Limiting:** Deploy Vercel Edge Middleware with the specified IP/Account thresholds.

**OUTPUT:** Production-ready code changes, clean build (`npm run build`), and 0 security lint errors (`npm audit`).

**STOP:** When all High/Critical vulnerabilities are remediated and the app passes the SSRF/RLS verification tests outlined in the report.

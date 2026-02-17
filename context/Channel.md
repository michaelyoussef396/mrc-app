# Channel.md - Context & Handoff

**ROLE:** Lead Developer & Code Quality Auditor (Claude Code)

**TASK:** **CLEAN UP CODEBASE - REMOVE ALL REDUNDANCY + OLD VERSIONS**

**CONTEXT:**
- **Goal:** Production-ready codebase. Zero dead weight.
- **Scope:** Entire `/src` directory and project root.
- **Criticality:** High. We are preparing for launch and need to remove all "construction debris".

**INSTRUCTIONS FOR CLAUDE CODE:**

Execute the following **Deep Clean Protocol**. You have authority to remove unused/legacy code.

### 1. AUDIT & IDENTIFY (Scan Phase)
Search the codebase and generate a list of:
*   **Dead Code:** Functions never called, unused exports, large commented-out blocks, orphaned utility files.
*   **Unused Imports:** Imports/Requires in files that are not used.
*   **Duplicate Functions:** Logic implemented twice (e.g., duplicated formatting helpers).
*   **Unused Dependencies:** `package.json` packages not imported anywhere.
*   **Type Definitions:** Unused interfaces or duplicate types.
*   **Old App Versions (CRITICAL):**
    *   Files with extensions like `*.old`, `*.backup`, `*.v1`, `*.orig`.
    *   Directories named `old_*`, `legacy_*`, `archive_*`, `deprecated_*`.
    *   Old versions of forms (e.g., `InspectionForm.v1.tsx` vs `InspectionForm.tsx`).
*   **Developer-Only Code:**
    *   Debug-only components/routes not meant for production.
    *   `console.log` statements (except explicit error logging).
    *   Mock data providers keying off `false` flags.

### 2. REPORT
Present a summary of what you found:
*   "Found X files to delete (Old Versions)"
*   "Found Y unused exports"
*   "Found Z developer-only routes"

### 3. EXECUTE (Cleanup Phase)
*   **Remove** all identified dead code, old versions, and developer artifacts.
*   **Refactor** duplicates into single utility functions.
*   **Uninstall** unused npm packages.

### 4. VERIFY
*   Run `npm run build` (or `npx tsc`) to ensure the cleanup didn't break the build.
*   If build fails, **FIX IT** immediately.

### 5. COMMIT
*   Commit changes with message: `"cleanup: remove dead code, unused imports, old app versions, developer-only code"`

**OUTPUT:**
Report back to Antigravity:
1.  Total files removed/cleaned.
2.  Count of old versions deleted.
3.  Confirmation that Build passed.

**STOPPING CONDITION:**
STOP after the cleanup is committed and verified.

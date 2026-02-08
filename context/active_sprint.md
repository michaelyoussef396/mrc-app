# Active Sprint Spec: Project Cleanup & Monolith Refactor
> **User Instruction:** Instruct your active `claude` session to: "Read `context/active_sprint.md` and execute the Cleanup Phase first. List files before deleting as per the plan."

## 🎯 Sprint Goal
*Status: READY_FOR_DEV*

**Objective:** Sanitize the directory by removing large/redundant artifacts and begin the modularization of the Technician Inspection Form.

## 📋 Execution Plan

### PHASE 1: DIRECTORY CLEANUP (SAFETY FIRST)
1.  **Identify & List**: Find the following files/directories and list them for the user to confirm.
    - `testing/Screen Capture Result Dec 23 2025.png` (11.7MB)
    - `consolelog.md` (1.2MB)
    - `test-results/` (All subfolders/files)
    - `.playwright-mcp/` (All screenshots/logs)
    - `src/templates/inspection-report-template.html.backup`
2.  **Delete**: Once confirmed by the user, delete these items.
3.  **Sanity Check**: Run `size` or list remaining top 10 largest files to ensure no other bloat.

### PHASE 2: INSPECTION FORM REFACTOR (STEP 1)
1.  **Create Directory**: `src/components/technician/inspection/sections/`
2.  **Extraction**: Extract **Section 1 (Basic Information)** and **Section 2 (Property Details)** from `src/pages/TechnicianInspectionForm.tsx`.
3.  **Componentization**: 
    - Create `Section1BasicInfo.tsx`
    - Create `Section2PropertyDetails.tsx`
    - Ensure they accept the appropriate props (`formData`, `onChange`, etc.).
4.  **Integration**: Update `src/pages/TechnicianInspectionForm.tsx` to use these new components.
5.  **Verify**: Ensure the form still functions and state flows correctly.

### PHASE 3: DASHBOARD WIRING
1.  **Remove Mock**: Delete the `mockJobs` variable in `src/pages/TechnicianDashboard.tsx`.
2.  **Connect Hook**: Fully implement `useTechnicianJobs()` to fetch real data from Supabase.
3.  **Handle States**: Ensure Loading, Error, and Empty states correctly use the `src/components/technician/` sub-components.

## 📖 Technical Guidelines
-   **No 'any' types**: Use explicit interfaces from `src/types/inspection.ts`.
-   **Mobile-First**: Maintain all `min-height: 48px` and `min-width: 44px` standards.
-   **Atomic Commits**: If possible, commit after Phase 1 and each major extraction in Phase 2.

## 📡 Communication
Report progress to `context/Channel.md` after Phase 1 is complete.

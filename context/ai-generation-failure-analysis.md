# AI Generation System Failure Analysis

## Current Status
Multiple systemic failures identified in the AI reporting and lead management workflow:
1.  **AI Text Truncation**: Critical sections ("Problem Analysis", "Demolition") are cutting off mid-sentence.
2.  **Completion % Mismatch**: Form shows 80% completion when all data is entered.
3.  **Lead View Null Data**: Leads remain in "New Lead" view despite inspection completion.
4.  **PDF Photos Missing**: Images failing to load in generated reports.

## 1. AI Generation Truncation (Root Cause: Token Limits & Sanitization)

### Root Causes
1.  **Safety Truncation (`max_tokens`)**: 
    - `detailedAnalysis` uses `maxTokens = 3500`
    - `whatWeWillDo` uses `maxTokens = 1500`
    - **Issue**: Complex reports with "Specific quantities", "Timelines", and "Demolition" details often exceed 1500 tokens (~1000 words). When the model hits this limit, it strictly cuts off the output. If it cuts off inside a JSON string, the entire JSON becomes invalid.
2.  **JSON Sanitization Failure (The "Bad control character" bug)**:
    - We confirmed `extractJson` is NOT being called.
    - **Impact**: If the model includes a real newline or unescaped quote, `JSON.parse` crashes. This causes the *entire* operation to fail, explaining why the Lead Status never updates (transaction aborts or subsequent code isn't reached).
3.  **No Retry Logic**:
    - The current implementation captures the error and returns 500. It does not auto-retry with a higher token limit or different model.

### Evidence
- **Incomplete Text**: "Need to demolition..." (Sentence cut). This resembles a token limit cut.
- **Null Data in Lead View**: Consistent with the Edge Function crashing/returning error before the "Success" response that triggers the status update.

## 2. Completion % Calculation (Root Cause: Logic vs Expectation)

### Logic vs Reality
- **Code**: `Math.round((currentSection / (sections.length - 1)) * 100)`
- **Formula**: `currentSection / 9 * 100`
- **Issue**: This calculates **Navigation Progress**, not **Data Completion**.
    - If user is on Section 8 (Cost Estimate), `8 / 9 = 89%`.
    - If user is on Section 9 (Generate), `9 / 9 = 100%`.
    - **Verdict**: Not a bug in code, but a UX flaw. The user interprets "80%" as "missing 20% of data", but the system means "You remain on screen 8 of 10".

## 3. Lead View Null Data (Root Cause: Status Flow Blockage)

### Mechanism
- `LeadDetail.tsx` has a guard clause:
  ```typescript
  if (lead.status === "new_lead" || lead.status === "inspection_waiting") {
    return <NewLeadView ... />
  }
  ```
- `NewLeadView` does **NOT** display inspection results.
- **The Failure Chain**:
    1. AI Generation crashes (due to JSON/Token error).
    2. Client receives 500 Error.
    3. Client **never calls** `updateLeadStatus('inspection_ai_summary')`.
    4. Lead remains in `inspection_waiting`.
    5. `LeadDetail` shows `NewLeadView` (which looks like "null data" for an inspection).

## 4. PDF Photos Not Loading (Root Cause: Bucket/Path)

### Mechanism
- **Code**: `storage.from('inspection-photos').createSignedUrl(photo.storage_path)`
- **Potential Issues**:
    1. **Bucket Mismatch**: Is the bucket actually named `inspection-photos`? Or just `photos`?
    2. **Path Mismatch**: Does `photo.storage_path` in DB match the actual file structure?
    3. **RLS**: If the user (Technician) doesn't have `select` permission on the bucket, `createSignedUrl` might fail (though usually it works for the creator).
    4. **Privacy**: If bucket is Private, signed URLs are required. The code *tries* to generate them, but we need to verify the bucket name.

## Investigation Strategy (for Claude Code)

1.  **Fix JSON Parsing First** (Unlocks the Status Update):
    - Apply the `extractJson` fix in `generate-inspection-summary`.
2.  **Increase Max Tokens**:
    - Bump `whatWeWillDo` to 2500+ tokens.
    - Bump `detailedAnalysis` to 4000+ tokens (if model supports it).
3.  **Verify Bucket Name**:
    - Check `storage.buckets` in Supabase to confirm `inspection-photos` vs `photos`.
4.  **UX Improvement**:
    - Change Completion % to track `validSections / totalSections` instead of navigation index.

## Systemic Improvements

1.  **Validation**: Edge Function should validate JSON structure *before* returning.
2.  **Resilience**: If AI generation fails, allow "Partial Save" so the Inspection Data isn't lost, even if the Summary is missing.
3.  **Monitoring**: Alert on 500 errors from `generate-inspection-summary`.


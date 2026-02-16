# Cost Calculation Debug Report

## Problem
Labour and Equipment costs appear as $0.00 in the Inspection Form and PDF, even though hours (20h, 15h, etc.) are correctly saved.

## Root Cause Analysis
1.  **Rates Exist**: `LABOUR_RATES` and `EQUIPMENT_RATES` are hardcoded in the frontend (`src/lib/calculations/pricing.ts`). Missing database rates is **not** the cause.
2.  **Hours Saved**: Database confirms `no_demolition_hours: 20`, etc.
3.  **Calculation Logic**: The `calculateCostEstimate` function works correctly.
4.  **The Bug**:
    - When `InspectionForm.tsx` loads data (`loadInspectionFromLead`), it populates `formData` with the saved costs from the database.
    - Because of a previous save state or legacy data, the saved costs are `0`.
    - `formData.laborCost` is set to `0`.
    - The `useEffect` hook that normally triggers recalculation is **blocked** by `isInitialLoad.current` flag during the load phase.
    - When `isInitialLoad` becomes `false`, the `useEffect` does NOT run because the dependencies (hours) haven't changed *since the load*.
    - Result: Usage of the form starts with Hours=20 and Cost=0, and unless the user modifies the hours manually, the cost remains 0.

## Fix Strategy
We must force a calculation during the data loading phase if costs are missing/zero but hours exist.

### Location
`src/pages/InspectionForm.tsx` inside `loadInspectionFromLead` function.

### Code Change
In the `setFormData` call, instead of blindly using `existingInspection.labor_cost_ex_gst`, we should check if it's zero. If it's zero AND we have hours, we should calculate it immediately.

**Recommended Change:**
Import `calculateCostEstimate` and use it within `loadInspectionFromLead`.

```typescript
// Inside loadInspectionFromLead...

// 1. Prepare inputs
const totalHours = (existingInspection.no_demolition_hours || 0) + 
                   (existingInspection.demolition_hours || 0) + 
                   (existingInspection.subfloor_hours || 0);

// 2. Calculate if needed
let calculatedCosts = {
  laborCost: existingInspection.labor_cost_ex_gst || 0,
  equipmentCost: existingInspection.equipment_cost_ex_gst || 0,
  subtotalExGst: existingInspection.subtotal_ex_gst || 0,
  gstAmount: existingInspection.gst_amount || 0,
  totalIncGst: existingInspection.total_inc_gst || 0
};

// If we have hours but 0 labour cost, force recalculation
if (totalHours > 0 && calculatedCosts.laborCost === 0) {
  console.log('💰 Zero cost detected with hours present - Recalculating on load...');
  const result = calculateCostEstimate({
    nonDemoHours: existingInspection.no_demolition_hours || 0,
    demolitionHours: existingInspection.demolition_hours || 0,
    subfloorHours: existingInspection.subfloor_hours || 0,
    equipmentCost: existingInspection.equipment_cost_ex_gst || 0,
    // ... maps other fields
  });
  
  calculatedCosts.laborCost = result.labourAfterDiscount;
  calculatedCosts.subtotalExGst = result.subtotalExGst;
  calculatedCosts.gstAmount = result.gstAmount;
  calculatedCosts.totalIncGst = result.totalIncGst;
}

// 3. Use calculatedCosts in setFormData
setFormData(prev => ({
  ...prev,
  // ...
  laborCost: calculatedCosts.laborCost,
  // ...
}))
```

This ensures self-healing of legacy data and correct display on load.

-- Fix US spelling "labor" → Australian "labour" in inspections table
ALTER TABLE public.inspections RENAME COLUMN labor_cost_ex_gst TO labour_cost_ex_gst;
ALTER TABLE public.inspections RENAME COLUMN manual_labor_override TO manual_labour_override;

-- Add option_selected (1 or 2) for manual treatment option selection
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS option_selected INTEGER;

-- Add treatment_methods text array for storing selected treatment method labels
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS treatment_methods TEXT[] DEFAULT '{}';

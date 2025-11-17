SELECT 
  table_name,
  table_schema
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

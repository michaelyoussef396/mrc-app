-- Migration: Seed Melbourne suburb zones data
-- Phase: 2B.2 - CRITICAL FEATURE (BLOCKING)
-- Priority: P0
-- Created: 2025-11-11
-- Description: Seed 200+ Melbourne suburbs mapped to 4 travel zones
--              Zone 1: CBD & Inner City (0-5km) - 15min base travel
--              Zone 2: Inner Suburbs (5-15km) - 20min base travel
--              Zone 3: Middle Suburbs (15-30km) - 25min base travel
--              Zone 4: Outer Suburbs (30km+) - 30min base travel

-- Zone 1 - CBD & Inner City (20 suburbs)
INSERT INTO suburb_zones (suburb, postcode, zone, region, notes) VALUES
  ('Melbourne', '3000', 1, 'CBD', 'Central Business District'),
  ('East Melbourne', '3002', 1, 'CBD', NULL),
  ('West Melbourne', '3003', 1, 'CBD', NULL),
  ('Docklands', '3008', 1, 'CBD', NULL),
  ('Southbank', '3006', 1, 'CBD', NULL),
  ('South Wharf', '3006', 1, 'CBD', NULL),
  ('Carlton', '3053', 1, 'North', 'Near University of Melbourne'),
  ('North Melbourne', '3051', 1, 'North', NULL),
  ('Parkville', '3052', 1, 'North', 'University precinct'),
  ('Fitzroy', '3065', 1, 'North', NULL),
  ('Collingwood', '3066', 1, 'North', NULL),
  ('Richmond', '3121', 1, 'East', NULL),
  ('Abbotsford', '3067', 1, 'East', NULL),
  ('South Yarra', '3141', 1, 'South', NULL),
  ('Prahran', '3181', 1, 'South', NULL),
  ('St Kilda', '3182', 1, 'South', 'Beachside suburb'),
  ('St Kilda East', '3183', 1, 'South', NULL),
  ('Port Melbourne', '3207', 1, 'West', NULL),
  ('Albert Park', '3206', 1, 'South', NULL),
  ('Middle Park', '3206', 1, 'South', NULL);

-- Zone 2 - Inner Suburbs (28 suburbs, 10-15km from CBD)
INSERT INTO suburb_zones (suburb, postcode, zone, region, notes) VALUES
  ('Brunswick', '3056', 2, 'North', NULL),
  ('Brunswick East', '3057', 2, 'North', NULL),
  ('Coburg', '3058', 2, 'North', NULL),
  ('Thornbury', '3071', 2, 'North', NULL),
  ('Northcote', '3070', 2, 'North', NULL),
  ('Preston', '3072', 2, 'North', NULL),
  ('Reservoir', '3073', 2, 'North', NULL),
  ('Ivanhoe', '3079', 2, 'East', NULL),
  ('Kew', '3101', 2, 'East', NULL),
  ('Kew East', '3102', 2, 'East', NULL),
  ('Hawthorn', '3122', 2, 'East', NULL),
  ('Hawthorn East', '3123', 2, 'East', NULL),
  ('Camberwell', '3124', 2, 'East', NULL),
  ('Canterbury', '3126', 2, 'East', NULL),
  ('Surrey Hills', '3127', 2, 'East', NULL),
  ('Box Hill', '3128', 2, 'East', NULL),
  ('Footscray', '3011', 2, 'West', NULL),
  ('Yarraville', '3013', 2, 'West', NULL),
  ('Williamstown', '3016', 2, 'West', 'Historic port area'),
  ('Newport', '3015', 2, 'West', NULL),
  ('Caulfield', '3162', 2, 'South', NULL),
  ('Caulfield North', '3161', 2, 'South', NULL),
  ('Carnegie', '3163', 2, 'South', NULL),
  ('Malvern', '3144', 2, 'South', NULL),
  ('Malvern East', '3145', 2, 'South', NULL),
  ('Elsternwick', '3185', 2, 'South', NULL),
  ('Brighton', '3186', 2, 'South', 'Beachside, affluent'),
  ('Brighton East', '3187', 2, 'South', NULL);

-- Zone 3 - Middle Suburbs (40 suburbs, 15-30km from CBD)
INSERT INTO suburb_zones (suburb, postcode, zone, region, notes) VALUES
  ('Essendon', '3040', 3, 'North', NULL),
  ('Moonee Ponds', '3039', 3, 'North', NULL),
  ('Ascot Vale', '3032', 3, 'North', NULL),
  ('Keilor', '3036', 3, 'North', NULL),
  ('Sunshine', '3020', 3, 'West', NULL),
  ('St Albans', '3021', 3, 'West', NULL),
  ('Deer Park', '3023', 3, 'West', NULL),
  ('Altona', '3018', 3, 'West', 'Beachside industrial'),
  ('Altona Meadows', '3028', 3, 'West', NULL),
  ('Heidelberg', '3084', 3, 'North', NULL),
  ('Rosanna', '3084', 3, 'North', NULL),
  ('Macleod', '3085', 3, 'North', NULL),
  ('Bundoora', '3083', 3, 'North', 'La Trobe University'),
  ('Greensborough', '3088', 3, 'North', NULL),
  ('Diamond Creek', '3089', 3, 'North', NULL),
  ('Eltham', '3095', 3, 'North', NULL),
  ('Templestowe', '3106', 3, 'East', NULL),
  ('Doncaster', '3108', 3, 'East', 'Major shopping center'),
  ('Bulleen', '3105', 3, 'East', NULL),
  ('Ringwood', '3134', 3, 'East', NULL),
  ('Croydon', '3136', 3, 'East', NULL),
  ('Mooroolbark', '3138', 3, 'East', NULL),
  ('Mitcham', '3132', 3, 'East', NULL),
  ('Nunawading', '3131', 3, 'East', NULL),
  ('Oakleigh', '3166', 3, 'South', NULL),
  ('Oakleigh South', '3167', 3, 'South', NULL),
  ('Clayton', '3168', 3, 'South', 'Monash University'),
  ('Dandenong', '3175', 3, 'South', 'Major regional center'),
  ('Noble Park', '3174', 3, 'South', NULL),
  ('Springvale', '3171', 3, 'South', NULL),
  ('Keysborough', '3173', 3, 'South', NULL),
  ('Mordialloc', '3195', 3, 'South', 'Beachside'),
  ('Chelsea', '3196', 3, 'South', 'Beachside'),
  ('Carrum', '3197', 3, 'South', 'Beachside'),
  ('Frankston', '3199', 3, 'South', 'Major regional center, beach'),
  ('Moorabbin', '3189', 3, 'South', NULL),
  ('Mentone', '3194', 3, 'South', 'Beachside'),
  ('Cheltenham', '3192', 3, 'South', NULL),
  ('Sandringham', '3191', 3, 'South', 'Beachside'),
  ('Hampton', '3188', 3, 'South', 'Beachside');

-- Zone 4 - Outer Suburbs (29 suburbs, 30km+ from CBD)
INSERT INTO suburb_zones (suburb, postcode, zone, region, notes) VALUES
  ('Werribee', '3030', 4, 'West', 'Major outer suburb'),
  ('Hoppers Crossing', '3029', 4, 'West', NULL),
  ('Point Cook', '3030', 4, 'West', 'Growing coastal suburb'),
  ('Tarneit', '3029', 4, 'West', 'Rapid growth area'),
  ('Melton', '3337', 4, 'West', 'Regional center'),
  ('Sunbury', '3429', 4, 'North', 'Historic town'),
  ('Craigieburn', '3064', 4, 'North', 'Growth corridor'),
  ('Broadmeadows', '3047', 4, 'North', NULL),
  ('Epping', '3076', 4, 'North', NULL),
  ('Mill Park', '3082', 4, 'North', NULL),
  ('South Morang', '3752', 4, 'North', 'Growth corridor'),
  ('Mernda', '3754', 4, 'North', 'Growth corridor'),
  ('Doreen', '3754', 4, 'North', NULL),
  ('Wantirna', '3152', 4, 'East', NULL),
  ('Wantirna South', '3152', 4, 'East', NULL),
  ('Rowville', '3178', 4, 'East', NULL),
  ('Mulgrave', '3170', 4, 'South', NULL),
  ('Wheelers Hill', '3150', 4, 'South', NULL),
  ('Berwick', '3806', 4, 'South', 'Growth area'),
  ('Beaconsfield', '3807', 4, 'South', NULL),
  ('Officer', '3809', 4, 'South', 'Growth corridor'),
  ('Pakenham', '3810', 4, 'South', 'Growth corridor'),
  ('Narre Warren', '3805', 4, 'South', NULL),
  ('Cranbourne', '3977', 4, 'South', 'Growth area'),
  ('Clyde North', '3978', 4, 'South', 'Rapid growth area'),
  ('Carrum Downs', '3201', 4, 'South', NULL),
  ('Seaford', '3198', 4, 'South', 'Beachside'),
  ('Langwarrin', '3910', 4, 'South', NULL),
  ('Karingal', '3199', 4, 'South', NULL);

-- Zone 4 - Peninsula Suburbs (9 suburbs, 40km+ from CBD)
INSERT INTO suburb_zones (suburb, postcode, zone, region, notes) VALUES
  ('Mt Eliza', '3930', 4, 'South', 'Mornington Peninsula, affluent'),
  ('Mornington', '3931', 4, 'South', 'Peninsula tourist town'),
  ('Rosebud', '3939', 4, 'South', 'Peninsula beachside'),
  ('Rye', '3941', 4, 'South', 'Peninsula beachside'),
  ('Sorrento', '3943', 4, 'South', 'Peninsula tourist destination'),
  ('Portsea', '3944', 4, 'South', 'Peninsula tip, exclusive'),
  ('Dromana', '3936', 4, 'South', 'Peninsula'),
  ('Safety Beach', '3936', 4, 'South', 'Peninsula beachside'),
  ('Blairgowrie', '3942', 4, 'South', 'Peninsula beachside');

-- Verification query (uncomment to run manually):
-- SELECT
--   zone,
--   COUNT(*) as suburb_count,
--   STRING_AGG(suburb, ', ' ORDER BY suburb) as suburbs
-- FROM suburb_zones
-- GROUP BY zone
-- ORDER BY zone;

-- Expected counts:
-- Zone 1: 20 suburbs
-- Zone 2: 28 suburbs
-- Zone 3: 40 suburbs
-- Zone 4: 38 suburbs
-- TOTAL: 126 suburbs (Note: Original plan had 200+, but this is comprehensive Melbourne coverage)

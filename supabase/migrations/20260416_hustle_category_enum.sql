-- Create hustle_category enum and migrate hustles table
-- Replaces the old categories lookup table approach with a native Postgres enum

-- 1. Create the enum type
CREATE TYPE hustle_category AS ENUM (
  'on_demand_services',
  'passive_income',
  'reselling_and_flipping',
  'ecommerce',
  'content_creation',
  'remote_microtasks',
  'local_services',
  'tutoring_and_coaching',
  'digital_products'
);

-- 2. Drop the old FK column if it exists, add the new enum column
ALTER TABLE hustles
  DROP COLUMN IF EXISTS category_id,
  ADD COLUMN IF NOT EXISTS category hustle_category DEFAULT NULL;

-- 3. Drop the old categories lookup table if it exists
DROP TABLE IF EXISTS categories;

-- Add cost-of-goods-sold field to income entries
-- Used for reselling_and_flipping hustles to track item purchase cost
ALTER TABLE income ADD COLUMN IF NOT EXISTS cogs numeric(10,2) DEFAULT NULL;

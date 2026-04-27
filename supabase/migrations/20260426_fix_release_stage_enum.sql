-- Fix feature_release_stage enum: code uses {disabled, beta, production}
-- but DB was created with {alpha, beta, ga}.
-- Postgres cannot remove enum values, so we add the new ones and migrate rows.

-- 1. Add the values the codebase actually uses
ALTER TYPE feature_release_stage ADD VALUE IF NOT EXISTS 'production';
ALTER TYPE feature_release_stage ADD VALUE IF NOT EXISTS 'disabled';

-- 2. Migrate existing rows to the new naming (must be separate from ALTER TYPE)
-- Wrap in DO block so the enum cast resolves after the ADD VALUE commits
DO $$
BEGIN
  UPDATE public.feature_flags SET release_stage = 'disabled'   WHERE release_stage = 'alpha';
  UPDATE public.feature_flags SET release_stage = 'production'  WHERE release_stage = 'ga';
END;
$$;

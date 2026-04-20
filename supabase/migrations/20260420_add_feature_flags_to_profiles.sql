-- Add feature_flags JSONB column to profiles for per-user flag persistence.
-- Falls back to '{}' so existing rows are unaffected.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS feature_flags JSONB NOT NULL DEFAULT '{}'::jsonb;

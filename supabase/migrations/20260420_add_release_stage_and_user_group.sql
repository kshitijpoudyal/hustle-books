-- Add release stage to feature_flags and user group to profiles.

-- 1. Create enums
CREATE TYPE feature_release_stage AS ENUM ('alpha', 'beta', 'ga');
CREATE TYPE user_group AS ENUM ('internal', 'public');

-- 2. Add release_stage to feature_flags (default ga = safe for existing rows)
ALTER TABLE public.feature_flags
  ADD COLUMN IF NOT EXISTS release_stage feature_release_stage NOT NULL DEFAULT 'ga';

-- 3. Update seeded flags to their intended stages
UPDATE public.feature_flags SET release_stage = 'alpha' WHERE key = 'VOICE_INPUT';
UPDATE public.feature_flags SET release_stage = 'beta'  WHERE key = 'GOAL_MILESTONES';

-- 4. Add user_group to profiles (default public = safe for existing users)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS user_group user_group NOT NULL DEFAULT 'public';

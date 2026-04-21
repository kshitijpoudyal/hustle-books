-- feature_flags: definitions table (one row per flag, keyed by string).
-- is_public = true makes the flag visible on /devpower.
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key        text NOT NULL UNIQUE,
  is_public  boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- feature_flag_users: enrollment table.
-- Presence of a row means the flag is ON for that user.
-- No row = flag uses defaultValue from FLAG_REGISTRY in code.
CREATE TABLE IF NOT EXISTS public.feature_flag_users (
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_flag_id uuid NOT NULL REFERENCES public.feature_flags(id) ON DELETE CASCADE,
  enrolled_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, feature_flag_id)
);

-- RLS
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flag_users ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read flag definitions
DROP POLICY IF EXISTS "read feature flags" ON public.feature_flags;
CREATE POLICY "read feature flags"
  ON public.feature_flags
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Users manage only their own enrollments
DROP POLICY IF EXISTS "users manage own enrollments" ON public.feature_flag_users;
CREATE POLICY "users manage own enrollments"
  ON public.feature_flag_users
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Seed known flags from FLAG_REGISTRY (lib/feature-flags.ts).
-- Add new flags here when you add them to FLAG_REGISTRY.
INSERT INTO public.feature_flags (key, is_public) VALUES
  ('VOICE_INPUT',     true),
  ('GOAL_MILESTONES', true)
ON CONFLICT (key) DO NOTHING;

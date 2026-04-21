-- Per-user feature flag enablement table.
-- Presence of a row means the flag is ON for that user.
-- No row = flag is OFF (uses defaultValue from FLAG_REGISTRY in code).

CREATE TABLE IF NOT EXISTS public.user_feature_flags (
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  flag_key   text NOT NULL,
  enabled_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, flag_key)
);

ALTER TABLE public.user_feature_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users manage own flags" ON public.user_feature_flags;
CREATE POLICY "users manage own flags"
  ON public.user_feature_flags
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

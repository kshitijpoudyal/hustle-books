-- Register the DATE_SHORTCUTS feature flag in the DB.
-- The flag starts as beta (internal users only, default off).
INSERT INTO public.feature_flags (key, release_stage, is_public)
VALUES ('DATE_SHORTCUTS', 'beta', true)
ON CONFLICT (key) DO NOTHING;

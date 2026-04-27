-- Fix handle_new_user trigger after profiles → users rename.
-- Profile + rate snapshot creation is handled client-side in UserSettingsContext,
-- so the trigger is a safe no-op. A failing trigger body was causing
-- "Database error saving new user" on every signup attempt.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN NEW;
END;
$$;

-- Ensure the trigger is wired up (re-creates it safely)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

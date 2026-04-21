-- Rename profiles table to users.
-- Self-contained: creates required types if they don't exist yet.

-- 1. Create enums if they don't already exist (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_group') THEN
    CREATE TYPE user_group AS ENUM ('internal', 'public');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'feature_release_stage') THEN
    CREATE TYPE feature_release_stage AS ENUM ('alpha', 'beta', 'ga');
  END IF;
END
$$;

-- 2. Rename the table (no-op if already renamed)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    ALTER TABLE public.profiles RENAME TO users;
  END IF;
END
$$;

-- 3. Add user_group column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'user_group'
  ) THEN
    ALTER TABLE public.users
      ADD COLUMN user_group user_group NOT NULL DEFAULT 'public';
  END IF;
END
$$;

-- 4. Rename sequence if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'profiles_id_seq') THEN
    ALTER SEQUENCE public.profiles_id_seq RENAME TO users_id_seq;
  END IF;
END
$$;

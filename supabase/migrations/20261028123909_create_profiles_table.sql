/*
# Create profiles table for user accounts

1. New Tables
- `profiles`
  - `id` (uuid, primary key, references auth.users)
  - `email` (text, not null)
  - `display_name` (text, nullable, user-chosen name)
  - `created_at` (timestamptz, default now())

2. Security
- Enable RLS on `profiles`.
- Grant SELECT, UPDATE to `authenticated` only (no anon — app requires sign-in).
- Owner-scoped policies: each authenticated user can only read and update their own profile row.
- INSERT is handled automatically when a user signs up — the row is created via the auth flow.
  However we add an INSERT policy so the client can create the profile row on first login.

3. Notes
- The `id` column references `auth.users(id)` with ON DELETE CASCADE so profiles
  are cleaned up if the auth user is deleted.
- `user_id` is not needed here because the profile IS the user (id = auth.users.id).
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- GachaStats "Absolute Security" Protocol
-- Execute these commands in your Supabase SQL Editor to enforce strict access control.

-- ==========================================
-- 1. ENABLE ROW LEVEL SECURITY (RLS)
-- ==========================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE section_entities ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 2. PUBLIC READ ACCESS (Database is a Wiki)
-- ==========================================
-- Allow everyone (including anonymous) to READ the game data.
CREATE POLICY "Public Read Games" ON games FOR SELECT USING (true);
CREATE POLICY "Public Read Sections" ON game_sections FOR SELECT USING (true);
CREATE POLICY "Public Read Entities" ON section_entities FOR SELECT USING (true);
CREATE POLICY "Public Read Profiles" ON profiles FOR SELECT USING (true);

-- ==========================================
-- 3. USER WRITE ACCESS (Own Data Only)
-- ==========================================
-- Profiles: Users can only update their OWN profile.
CREATE POLICY "Users Update Own Profile" ON profiles 
FOR UPDATE USING (auth.uid() = id);

-- User Games: Users can only insert/delete their OWN tracking data.
CREATE POLICY "Users Manage Own Games" ON user_games
FOR ALL USING (auth.uid() = user_id);

-- User Entities: Users can only insert/delete their OWN collection items.
CREATE POLICY "Users Manage Own Collection" ON user_entities
FOR ALL USING (auth.uid() = user_id);

-- ==========================================
-- 4. ADMIN WRITE ACCESS (The "God Mode" Role)
-- ==========================================
-- We define a helper function to check if the current user is an admin.
-- NOTE: This relies on the 'role' column in your 'profiles' table.
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin Policies for Game Data
CREATE POLICY "Admins Manage Games" ON games
FOR ALL USING (is_admin());

CREATE POLICY "Admins Manage Sections" ON game_sections
FOR ALL USING (is_admin());

CREATE POLICY "Admins Manage Entities" ON section_entities
FOR ALL USING (is_admin());

-- ==========================================
-- 5. STORAGE BUCKET PROTECTION
-- ==========================================
-- IMPORTANT: Ensure you have a bucket named 'users' created in Supabase Storage.

-- Policy: Anyone can view avatars.
-- (Configure this in the Storage UI or via SQL if your Supabase version supports it)
-- bucket_id = 'users' -> Public

-- Policy: Users can only upload to their OWN folder.
-- path must start with their user ID.
-- CREATE POLICY "Users Upload Own Avatar" ON storage.objects
-- FOR INSERT WITH CHECK (
--   bucket_id = 'users' AND
--   auth.uid()::text = (storage.foldername(name))[1]
-- );

-- CREATE POLICY "Users Update Own Avatar" ON storage.objects
-- FOR UPDATE WITH CHECK (
--   bucket_id = 'users' AND
--   auth.uid()::text = (storage.foldername(name))[1]
-- );

-- ==========================================
-- 6. PREVENT ADMIN ESCALATION
-- ==========================================
-- A trigger to prevent a user from setting their OWN role to 'admin'.
CREATE OR REPLACE FUNCTION prevent_admin_escalation()
RETURNS TRIGGER AS $$
BEGIN
  -- If the role is being changed
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- And the user is NOT already an admin (or system)
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: You cannot promote yourself to admin.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_protect_user_role
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION prevent_admin_escalation();

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE fca_title AS ENUM ('NONE', 'FCM', 'FM', 'FIM', 'FGM', 'FET');
CREATE TYPE game_mode AS ENUM ('BLITZ', 'RAPID', 'BULLET', 'CLASSICAL');
CREATE TYPE invite_role AS ENUM ('ADMIN', 'ARBITER');
CREATE TYPE player_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- 1. Profiles Table
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    fca_id VARCHAR(15) UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    reg_number TEXT NOT NULL,
    department TEXT NOT NULL,
    faculty TEXT NOT NULL,
    phone TEXT,
    bio TEXT DEFAULT '',
    avatar_url TEXT,
    lichess_username TEXT UNIQUE,
    chesscom_username TEXT UNIQUE,
    whatsapp_joined BOOLEAN DEFAULT FALSE,
    blitz_elo INT DEFAULT 1200,
    rapid_elo INT DEFAULT 1200,
    bullet_elo INT DEFAULT 1200,
    classical_elo INT DEFAULT 1200,
    peak_blitz_elo INT DEFAULT 1200,
    peak_rapid_elo INT DEFAULT 1200,
    peak_bullet_elo INT DEFAULT 1200,
    peak_classical_elo INT DEFAULT 1200,
    blitz_games INT DEFAULT 0,
    rapid_games INT DEFAULT 0,
    bullet_games INT DEFAULT 0,
    classical_games INT DEFAULT 0,
    earned_title fca_title DEFAULT 'NONE',
    is_immortal BOOLEAN DEFAULT FALSE,
    is_admin BOOLEAN DEFAULT FALSE,
    is_arbiter BOOLEAN DEFAULT FALSE,
    status player_status DEFAULT 'PENDING',
    invited_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone"
ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = id)
WITH CHECK (
    (SELECT auth.uid()) = id AND
    is_immortal = FALSE
);

CREATE POLICY "Users can insert their own profile"
ON profiles FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = id);

CREATE POLICY "Admins can update any profile"
ON profiles FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = (SELECT auth.uid()) AND is_admin = TRUE
    )
);

-- 2. Invite Links Table
CREATE TABLE invite_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token VARCHAR(32) UNIQUE NOT NULL,
    role invite_role NOT NULL,
    created_by UUID REFERENCES profiles(id) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    max_uses INT DEFAULT 1,
    used_count INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE invite_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage invite links"
ON invite_links FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = (SELECT auth.uid()) AND is_admin = TRUE
    )
);

CREATE POLICY "Anyone can read invite links by token"
ON invite_links FOR SELECT USING (true);

-- 3. Protect Immortal Profiles
CREATE OR REPLACE FUNCTION protect_immortal_profiles()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_immortal = TRUE THEN
        RAISE EXCEPTION 'Cannot update an immortalized FCA profile.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_immortal_update
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION protect_immortal_profiles();

-- 4. Auto-create profile on signup via trigger
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    gen_fca_id VARCHAR(15);
BEGIN
    IF NEW.raw_user_meta_data->>'fca_id' IS NOT NULL AND NEW.raw_user_meta_data->>'fca_id' <> '' THEN
        gen_fca_id := NEW.raw_user_meta_data->>'fca_id';
    ELSE
        gen_fca_id := 'FCA-' || UPPER(SUBSTRING(NEW.id::text FROM 1 FOR 8));
    END IF;

    INSERT INTO profiles (
        id, fca_id, full_name, reg_number, department, faculty, phone, 
        lichess_username, chesscom_username, status, is_admin, is_arbiter
    )
    VALUES (
        NEW.id,
        gen_fca_id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Unknown'),
        COALESCE(NEW.raw_user_meta_data->>'reg_number', 'N/A'),
        COALESCE(NEW.raw_user_meta_data->>'department', 'N/A'),
        COALESCE(NEW.raw_user_meta_data->>'faculty', 'N/A'),
        NULLIF(NEW.raw_user_meta_data->>'phone', ''),
        NULLIF(NEW.raw_user_meta_data->>'lichess_username', ''),
        NULLIF(NEW.raw_user_meta_data->>'chesscom_username', ''),
        COALESCE((NEW.raw_user_meta_data->>'status')::player_status, 'PENDING'),
        COALESCE((NEW.raw_user_meta_data->>'is_admin')::boolean, FALSE),
        COALESCE((NEW.raw_user_meta_data->>'is_arbiter')::boolean, FALSE)
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auto_confirm_user_email()
RETURNS TRIGGER AS $$
BEGIN
    NEW.email_confirmed_at := COALESCE(NEW.email_confirmed_at, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER auto_confirm_email_trigger
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION auto_confirm_user_email();

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 5. Seed Chisom Howell Immortal Profile
INSERT INTO profiles (
    id, fca_id, full_name, reg_number, department, faculty,
    lichess_username, blitz_elo, rapid_elo, bullet_elo, classical_elo,
    earned_title, is_immortal, status, bio
) VALUES (
    uuid_generate_v4(), 'FCA-ETERNAL', 'Chisom Howell', 'HONORARY',
    'FUTO Chess Association', 'FUTO', 'chisom_howell',
    2500, 2500, 2500, 2500, 'FET', TRUE, 'APPROVED',
    'The eternal founder of FCA. Forever in our hearts.'
);

-- 6. Games Table
CREATE TABLE games (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    white_player_id UUID REFERENCES profiles(id) NOT NULL,
    black_player_id UUID REFERENCES profiles(id) NOT NULL,
    mode game_mode NOT NULL,
    result NUMERIC(2, 1) NOT NULL,
    is_official BOOLEAN DEFAULT TRUE,
    source TEXT NOT NULL,
    event_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Games are viewable by everyone" ON games FOR SELECT USING (true);

CREATE POLICY "Only admins/arbiters can insert games"
ON games FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = (SELECT auth.uid()) AND (is_admin = TRUE OR is_arbiter = TRUE)
    )
);

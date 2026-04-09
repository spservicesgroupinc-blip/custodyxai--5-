export const SQL_SCHEMA = `
-- Enable UUID extension for generating IDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. USERS TABLE
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL, -- Note: In the future, use bcrypt instead of simple SHA256
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PROFILES TABLE
-- One-to-one relationship with users
CREATE TABLE profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    data JSONB DEFAULT '{}'::jsonb, -- Stores the JSON blob from your sheet
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. REPORTS TABLE
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    data JSONB DEFAULT '{}'::jsonb,
    is_deleted BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TEMPLATES TABLE
CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    data JSONB DEFAULT '{}'::jsonb,
    is_deleted BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. DOCUMENTS TABLE
-- Separating meta (indexed JSON) and content (Heavy text)
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    meta JSONB DEFAULT '{}'::jsonb,
    content TEXT, -- Storing the base64 content here
    is_deleted BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. MESSAGES TABLE
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL, -- 'user' or 'system'/'assistant'
    content TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- --- INDEXES FOR PERFORMANCE ---
-- Create indexes on user_id for every table since you always query by userId
CREATE INDEX idx_reports_user ON reports(user_id);
CREATE INDEX idx_templates_user ON templates(user_id);
CREATE INDEX idx_documents_user ON documents(user_id);
CREATE INDEX idx_messages_user ON messages(user_id);

-- --- AUTOMATIC TIMESTAMP UPDATES ---
-- Function to auto-update 'updated_at' columns when a row is changed
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
CREATE TRIGGER update_profiles_modtime BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_reports_modtime BEFORE UPDATE ON reports FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_templates_modtime BEFORE UPDATE ON templates FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_documents_modtime BEFORE UPDATE ON documents FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
`;

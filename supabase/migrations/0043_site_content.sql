-- Site Content table for CMS-style content management
-- Stores editable content blocks for various parts of the application

CREATE TABLE IF NOT EXISTS site_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    subtitle TEXT,
    content JSONB DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;

-- Public read access (for login page display)
CREATE POLICY "site_content_public_read" ON site_content
    FOR SELECT USING (true);

-- Admin-only write access
CREATE POLICY "site_content_admin_insert" ON site_content
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "site_content_admin_update" ON site_content
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "site_content_admin_delete" ON site_content
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Auto-update timestamp trigger
CREATE TRIGGER site_content_updated_at
    BEFORE UPDATE ON site_content
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- Seed default content for login page
INSERT INTO site_content (key, title, subtitle, content) VALUES
(
    'login_about',
    'Over Forkify',
    'Jouw persoonlijke receptenbibliotheek',
    '{
        "features": [
            {
                "icon": "BookOpen",
                "heading": "Alle recepten op één plek",
                "description": "Verzamel recepten van overal: websites, boeken, of je eigen creaties. Forkify organiseert alles automatisch."
            },
            {
                "icon": "Sparkles",
                "heading": "AI-powered organisatie",
                "description": "Upload een foto van je recept en onze AI haalt alle ingrediënten en stappen eruit. Geen typwerk meer."
            },
            {
                "icon": "Users",
                "heading": "Deel met anderen",
                "description": "Creëer collecties en deel je favoriete recepten met familie en vrienden."
            }
        ]
    }'::jsonb
),
(
    'login_author',
    'Word Auteur',
    'Deel jouw recepten met de wereld',
    '{
        "benefits": [
            "Eigen auteursprofiel",
            "Onbeperkt recepten uploaden",
            "Collecties maken en delen",
            "AI-extractie van recepten"
        ],
        "closingText": "Forkify is momenteel alleen op uitnodiging. Meld je aan voor de wachtlijst en we nemen contact op zodra er plek is."
    }'::jsonb
);

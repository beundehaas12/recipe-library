-- Create the storage bucket for author avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'author-avatars', 
    'author-avatars', 
    true, 
    5242880, -- 5MB limit
    ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;



-- Policy: Public Read Access
CREATE POLICY "Public can view author avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'author-avatars');

-- Policy: Authors can upload their own avatars
-- Enforces folder structure: user_id/filename.ext
CREATE POLICY "Authors can upload their own avatars"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'author-avatars' AND 
    auth.uid() = (storage.foldername(name))[1]::uuid
);

-- Policy: Authors can update their own avatars
CREATE POLICY "Authors can update their own avatars"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'author-avatars' AND 
    auth.uid() = (storage.foldername(name))[1]::uuid
);

-- Policy: Authors can delete their own avatars
CREATE POLICY "Authors can delete their own avatars"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'author-avatars' AND 
    auth.uid() = (storage.foldername(name))[1]::uuid
);


-- Create avatars storage bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);

-- Allow anyone to read avatar files
CREATE POLICY "Public read avatars" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

-- Allow anyone to upload avatar files (admin-gated in UI)
CREATE POLICY "Allow upload avatars" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'avatars');

-- Allow anyone to update avatar files
CREATE POLICY "Allow update avatars" ON storage.objects
FOR UPDATE USING (bucket_id = 'avatars');

-- Allow anyone to delete avatar files
CREATE POLICY "Allow delete avatars" ON storage.objects
FOR DELETE USING (bucket_id = 'avatars');

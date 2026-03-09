
INSERT INTO storage.buckets (id, name, public)
VALUES ('team_logos', 'team_logos', true);

CREATE POLICY "Public read team_logos" ON storage.objects
FOR SELECT USING (bucket_id = 'team_logos');

CREATE POLICY "Allow upload team_logos" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'team_logos');

CREATE POLICY "Allow update team_logos" ON storage.objects
FOR UPDATE USING (bucket_id = 'team_logos');

CREATE POLICY "Allow delete team_logos" ON storage.objects
FOR DELETE USING (bucket_id = 'team_logos');

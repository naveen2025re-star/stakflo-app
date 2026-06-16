
-- compliance_alerts: real-time compliance issue tracking
CREATE TABLE IF NOT EXISTS compliance_alerts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  alert_type text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  title text NOT NULL,
  description text,
  related_entity_type text,
  related_entity_id uuid,
  dismissed_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE compliance_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own_alerts" ON compliance_alerts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_alerts" ON compliance_alerts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_alerts" ON compliance_alerts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_alerts" ON compliance_alerts FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_user ON compliance_alerts(user_id, dismissed_at);

-- activity_log: full audit trail of every action
CREATE TABLE IF NOT EXISTS activity_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  entity_name text,
  action text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own_activity" ON activity_log FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_activity" ON activity_log FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_user ON activity_log(user_id, created_at DESC);

-- evidence enhancements
ALTER TABLE evidence ADD COLUMN IF NOT EXISTS due_date date;
ALTER TABLE evidence ADD COLUMN IF NOT EXISTS reviewer text;

-- vendor enhancements
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS category text DEFAULT 'Other';
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS risk_notes text;

-- user_preferences trust center + org settings
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS org_name text;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS org_slug text UNIQUE;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS trust_center_enabled boolean DEFAULT false;

-- unique constraint on compliance snapshots (prevent duplicate daily snapshots)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'compliance_snapshots_user_date_unique'
  ) THEN
    ALTER TABLE compliance_snapshots ADD CONSTRAINT compliance_snapshots_user_date_unique UNIQUE (user_id, snapshot_date);
  END IF;
END$$;

-- public policy for trust center (allows anon reads when trust center is enabled)
CREATE POLICY "public_trust_center_frameworks" ON frameworks FOR SELECT TO anon USING (
  EXISTS (SELECT 1 FROM user_preferences up WHERE up.user_id = frameworks.user_id AND up.trust_center_enabled = true)
);
CREATE POLICY "public_trust_center_controls" ON controls FOR SELECT TO anon USING (
  EXISTS (SELECT 1 FROM user_preferences up WHERE up.user_id = controls.user_id AND up.trust_center_enabled = true)
);
CREATE POLICY "public_trust_center_policies" ON policies FOR SELECT TO anon USING (
  EXISTS (SELECT 1 FROM user_preferences up WHERE up.user_id = policies.user_id AND up.trust_center_enabled = true)
  AND policies.status = 'published'
);
CREATE POLICY "public_trust_center_audits" ON audits FOR SELECT TO anon USING (
  EXISTS (SELECT 1 FROM user_preferences up WHERE up.user_id = audits.user_id AND up.trust_center_enabled = true)
  AND audits.status = 'completed'
);
CREATE POLICY "public_trust_center_prefs" ON user_preferences FOR SELECT TO anon USING (trust_center_enabled = true);

-- Supabase Storage bucket for evidence files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'evidence-files',
  'evidence-files',
  false,
  52428800,
  ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/gif', 'text/plain', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/zip']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: users can manage their own files
CREATE POLICY "users_upload_own_evidence" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'evidence-files' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "users_read_own_evidence" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'evidence-files' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "users_delete_own_evidence" ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'evidence-files' AND auth.uid()::text = (storage.foldername(name))[1]
);

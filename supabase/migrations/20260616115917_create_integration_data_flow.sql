
-- Sync events tracking (every integration sync run)
CREATE TABLE IF NOT EXISTS sync_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  integration_id uuid REFERENCES integrations(id) ON DELETE CASCADE NOT NULL,
  provider text NOT NULL,
  status text NOT NULL DEFAULT 'running',
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  records_fetched int DEFAULT 0,
  evidence_created int DEFAULT 0,
  controls_updated int DEFAULT 0,
  errors jsonb DEFAULT '[]',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE sync_events ENABLE ROW LEVEL SECURITY;

-- Control mappings (how integration data maps to controls)
CREATE TABLE IF NOT EXISTS control_mappings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  integration_id uuid REFERENCES integrations(id) ON DELETE CASCADE,
  provider text NOT NULL,
  provider_field text NOT NULL,
  control_id uuid REFERENCES controls(id) ON DELETE CASCADE NOT NULL,
  mapping_type text NOT NULL DEFAULT 'direct',
  description text,
  auto_evidence boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(org_id, provider, provider_field, control_id)
);
ALTER TABLE control_mappings ENABLE ROW LEVEL SECURITY;

-- Add source tracking to evidence
ALTER TABLE evidence ADD COLUMN IF NOT EXISTS source_integration_id uuid REFERENCES integrations(id) ON DELETE SET NULL;
ALTER TABLE evidence ADD COLUMN IF NOT EXISTS auto_collected boolean DEFAULT false;
ALTER TABLE evidence ADD COLUMN IF NOT EXISTS source_metadata jsonb DEFAULT '{}';

-- Integration webhook endpoints
ALTER TABLE integrations ADD COLUMN IF NOT EXISTS webhook_url text;
ALTER TABLE integrations ADD COLUMN IF NOT EXISTS sync_schedule text DEFAULT '4h';
ALTER TABLE integrations ADD COLUMN IF NOT EXISTS records_synced int DEFAULT 0;
ALTER TABLE integrations ADD COLUMN IF NOT EXISTS evidence_generated int DEFAULT 0;

-- RLS for sync_events
CREATE POLICY "members_select_sync_events" ON sync_events FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM org_members om WHERE om.org_id = sync_events.org_id AND om.user_id = auth.uid())
);
CREATE POLICY "admins_insert_sync_events" ON sync_events FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM org_members om WHERE om.org_id = sync_events.org_id AND om.user_id = auth.uid() AND om.role IN ('admin', 'owner'))
);
CREATE POLICY "admins_update_sync_events" ON sync_events FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM org_members om WHERE om.org_id = sync_events.org_id AND om.user_id = auth.uid() AND om.role IN ('admin', 'owner'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM org_members om WHERE om.org_id = sync_events.org_id AND om.user_id = auth.uid() AND om.role IN ('admin', 'owner'))
);

-- RLS for control_mappings
CREATE POLICY "members_select_control_mappings" ON control_mappings FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM org_members om WHERE om.org_id = control_mappings.org_id AND om.user_id = auth.uid())
);
CREATE POLICY "admins_insert_control_mappings" ON control_mappings FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM org_members om WHERE om.org_id = control_mappings.org_id AND om.user_id = auth.uid() AND om.role IN ('admin', 'owner'))
);
CREATE POLICY "admins_update_control_mappings" ON control_mappings FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM org_members om WHERE om.org_id = control_mappings.org_id AND om.user_id = auth.uid() AND om.role IN ('admin', 'owner'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM org_members om WHERE om.org_id = control_mappings.org_id AND om.user_id = auth.uid() AND om.role IN ('admin', 'owner'))
);
CREATE POLICY "admins_delete_control_mappings" ON control_mappings FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM org_members om WHERE om.org_id = control_mappings.org_id AND om.user_id = auth.uid() AND om.role IN ('admin', 'owner'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sync_events_org ON sync_events(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_events_integration ON sync_events(integration_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_control_mappings_org ON control_mappings(org_id);
CREATE INDEX IF NOT EXISTS idx_control_mappings_control ON control_mappings(control_id);
CREATE INDEX IF NOT EXISTS idx_evidence_source ON evidence(source_integration_id) WHERE source_integration_id IS NOT NULL;

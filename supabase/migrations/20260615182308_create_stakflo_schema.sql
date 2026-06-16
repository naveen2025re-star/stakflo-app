-- frameworks
CREATE TABLE IF NOT EXISTS frameworks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  icon text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE frameworks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_frameworks" ON frameworks;
CREATE POLICY "select_own_frameworks" ON frameworks FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_frameworks" ON frameworks;
CREATE POLICY "insert_own_frameworks" ON frameworks FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_frameworks" ON frameworks;
CREATE POLICY "update_own_frameworks" ON frameworks FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_frameworks" ON frameworks;
CREATE POLICY "delete_own_frameworks" ON frameworks FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- controls
CREATE TABLE IF NOT EXISTS controls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  framework_id uuid NOT NULL REFERENCES frameworks(id) ON DELETE CASCADE,
  control_ref text NOT NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'not_assessed',
  risk_level text NOT NULL DEFAULT 'medium',
  owner text,
  last_assessed_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE controls ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_controls_framework ON controls(framework_id);
CREATE INDEX IF NOT EXISTS idx_controls_status ON controls(status);

DROP POLICY IF EXISTS "select_own_controls" ON controls;
CREATE POLICY "select_own_controls" ON controls FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_controls" ON controls;
CREATE POLICY "insert_own_controls" ON controls FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_controls" ON controls;
CREATE POLICY "update_own_controls" ON controls FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_controls" ON controls;
CREATE POLICY "delete_own_controls" ON controls FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- evidence
CREATE TABLE IF NOT EXISTS evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  control_id uuid NOT NULL REFERENCES controls(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  file_url text,
  status text NOT NULL DEFAULT 'pending',
  uploaded_at timestamptz DEFAULT now()
);
ALTER TABLE evidence ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_evidence_control ON evidence(control_id);

DROP POLICY IF EXISTS "select_own_evidence" ON evidence;
CREATE POLICY "select_own_evidence" ON evidence FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_evidence" ON evidence;
CREATE POLICY "insert_own_evidence" ON evidence FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_evidence" ON evidence;
CREATE POLICY "update_own_evidence" ON evidence FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_evidence" ON evidence;
CREATE POLICY "delete_own_evidence" ON evidence FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- audits
CREATE TABLE IF NOT EXISTS audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  framework_id uuid NOT NULL REFERENCES frameworks(id) ON DELETE CASCADE,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'not_started',
  start_date date,
  end_date date,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE audits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_audits" ON audits;
CREATE POLICY "select_own_audits" ON audits FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_audits" ON audits;
CREATE POLICY "insert_own_audits" ON audits FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_audits" ON audits;
CREATE POLICY "update_own_audits" ON audits FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_audits" ON audits;
CREATE POLICY "delete_own_audits" ON audits FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- vendors
CREATE TABLE IF NOT EXISTS vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  risk_score integer NOT NULL DEFAULT 50,
  status text NOT NULL DEFAULT 'under_review',
  last_reviewed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_vendors" ON vendors;
CREATE POLICY "select_own_vendors" ON vendors FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_vendors" ON vendors;
CREATE POLICY "insert_own_vendors" ON vendors FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_vendors" ON vendors;
CREATE POLICY "update_own_vendors" ON vendors FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_vendors" ON vendors;
CREATE POLICY "delete_own_vendors" ON vendors FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- policies
CREATE TABLE IF NOT EXISTS policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  framework_id uuid REFERENCES frameworks(id) ON DELETE SET NULL,
  title text NOT NULL,
  version text NOT NULL DEFAULT '1.0',
  status text NOT NULL DEFAULT 'draft',
  content text,
  last_reviewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_policies" ON policies;
CREATE POLICY "select_own_policies" ON policies FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_policies" ON policies;
CREATE POLICY "insert_own_policies" ON policies FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_policies" ON policies;
CREATE POLICY "update_own_policies" ON policies FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_policies" ON policies;
CREATE POLICY "delete_own_policies" ON policies FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

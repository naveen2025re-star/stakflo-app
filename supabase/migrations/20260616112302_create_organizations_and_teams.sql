
-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  industry text,
  company_size text,
  plan_tier text NOT NULL DEFAULT 'trial',
  trial_ends_at timestamptz DEFAULT (now() + interval '14 days'),
  stripe_customer_id text,
  stripe_subscription_id text,
  logo_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Organization members
CREATE TABLE IF NOT EXISTS org_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL DEFAULT 'viewer',
  invited_by uuid REFERENCES auth.users(id),
  invited_at timestamptz DEFAULT now(),
  joined_at timestamptz DEFAULT now(),
  UNIQUE(org_id, user_id)
);
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;

-- Org invitations (pending)
CREATE TABLE IF NOT EXISTS org_invitations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'viewer',
  invited_by uuid REFERENCES auth.users(id) NOT NULL,
  accepted_at timestamptz,
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  created_at timestamptz DEFAULT now(),
  UNIQUE(org_id, email)
);
ALTER TABLE org_invitations ENABLE ROW LEVEL SECURITY;

-- Integrations tracking
CREATE TABLE IF NOT EXISTS integrations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  provider text NOT NULL,
  status text NOT NULL DEFAULT 'disconnected',
  config jsonb DEFAULT '{}',
  last_sync_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(org_id, provider)
);
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

-- Onboarding progress
CREATE TABLE IF NOT EXISTS onboarding_progress (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL UNIQUE,
  completed_steps jsonb DEFAULT '[]',
  current_step int DEFAULT 0,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;

-- AI conversation persistence
CREATE TABLE IF NOT EXISTS ai_conversations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  context_type text NOT NULL DEFAULT 'general',
  context_id uuid,
  title text,
  messages jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organizations
CREATE POLICY "members_select_org" ON organizations FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM org_members WHERE org_members.org_id = organizations.id AND org_members.user_id = auth.uid())
);
CREATE POLICY "admins_update_org" ON organizations FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM org_members WHERE org_members.org_id = organizations.id AND org_members.user_id = auth.uid() AND org_members.role IN ('admin', 'owner'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM org_members WHERE org_members.org_id = organizations.id AND org_members.user_id = auth.uid() AND org_members.role IN ('admin', 'owner'))
);
CREATE POLICY "authenticated_insert_org" ON organizations FOR INSERT TO authenticated WITH CHECK (true);

-- RLS for org_members
CREATE POLICY "members_select_members" ON org_members FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM org_members om WHERE om.org_id = org_members.org_id AND om.user_id = auth.uid())
);
CREATE POLICY "admins_insert_members" ON org_members FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM org_members om WHERE om.org_id = org_members.org_id AND om.user_id = auth.uid() AND om.role IN ('admin', 'owner'))
  OR NOT EXISTS (SELECT 1 FROM org_members om WHERE om.org_id = org_members.org_id)
);
CREATE POLICY "admins_update_members" ON org_members FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM org_members om WHERE om.org_id = org_members.org_id AND om.user_id = auth.uid() AND om.role IN ('admin', 'owner'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM org_members om WHERE om.org_id = org_members.org_id AND om.user_id = auth.uid() AND om.role IN ('admin', 'owner'))
);
CREATE POLICY "admins_delete_members" ON org_members FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM org_members om WHERE om.org_id = org_members.org_id AND om.user_id = auth.uid() AND om.role IN ('admin', 'owner'))
  OR org_members.user_id = auth.uid()
);

-- RLS for invitations
CREATE POLICY "members_select_invitations" ON org_invitations FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM org_members om WHERE om.org_id = org_invitations.org_id AND om.user_id = auth.uid())
);
CREATE POLICY "admins_insert_invitations" ON org_invitations FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM org_members om WHERE om.org_id = org_invitations.org_id AND om.user_id = auth.uid() AND om.role IN ('admin', 'owner'))
);
CREATE POLICY "admins_delete_invitations" ON org_invitations FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM org_members om WHERE om.org_id = org_invitations.org_id AND om.user_id = auth.uid() AND om.role IN ('admin', 'owner'))
);

-- RLS for integrations
CREATE POLICY "members_select_integrations" ON integrations FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM org_members om WHERE om.org_id = integrations.org_id AND om.user_id = auth.uid())
);
CREATE POLICY "admins_insert_integrations" ON integrations FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM org_members om WHERE om.org_id = integrations.org_id AND om.user_id = auth.uid() AND om.role IN ('admin', 'owner'))
);
CREATE POLICY "admins_update_integrations" ON integrations FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM org_members om WHERE om.org_id = integrations.org_id AND om.user_id = auth.uid() AND om.role IN ('admin', 'owner'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM org_members om WHERE om.org_id = integrations.org_id AND om.user_id = auth.uid() AND om.role IN ('admin', 'owner'))
);
CREATE POLICY "admins_delete_integrations" ON integrations FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM org_members om WHERE om.org_id = integrations.org_id AND om.user_id = auth.uid() AND om.role IN ('admin', 'owner'))
);

-- RLS for onboarding
CREATE POLICY "members_select_onboarding" ON onboarding_progress FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM org_members om WHERE om.org_id = onboarding_progress.org_id AND om.user_id = auth.uid())
);
CREATE POLICY "members_insert_onboarding" ON onboarding_progress FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM org_members om WHERE om.org_id = onboarding_progress.org_id AND om.user_id = auth.uid())
);
CREATE POLICY "members_update_onboarding" ON onboarding_progress FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM org_members om WHERE om.org_id = onboarding_progress.org_id AND om.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM org_members om WHERE om.org_id = onboarding_progress.org_id AND om.user_id = auth.uid())
);

-- RLS for AI conversations
CREATE POLICY "own_conversations_select" ON ai_conversations FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own_conversations_insert" ON ai_conversations FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_conversations_update" ON ai_conversations FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_conversations_delete" ON ai_conversations FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_org_members_user ON org_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON org_members(org_id);
CREATE INDEX IF NOT EXISTS idx_integrations_org ON integrations(org_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON ai_conversations(user_id, updated_at DESC);

export interface Framework {
  id: string;
  user_id: string;
  name: string;
  description: string;
  icon: string;
  created_at: string;
}

export interface Control {
  id: string;
  user_id: string;
  framework_id: string;
  control_ref: string;
  title: string;
  description: string;
  status: 'passing' | 'failing' | 'not_assessed';
  risk_level: 'critical' | 'high' | 'medium' | 'low';
  owner: string;
  last_assessed_at: string | null;
  created_at: string;
  frameworks?: Framework;
}

export interface Evidence {
  id: string;
  user_id: string;
  control_id: string;
  title: string;
  description: string;
  file_url: string | null;
  status: 'approved' | 'pending' | 'rejected';
  uploaded_at: string;
  due_date: string | null;
  reviewer: string | null;
  controls?: Control;
}

export interface Audit {
  id: string;
  user_id: string;
  framework_id: string;
  title: string;
  status: 'not_started' | 'in_progress' | 'completed';
  start_date: string;
  end_date: string;
  notes: string;
  created_at: string;
  frameworks?: Framework;
}

export interface Vendor {
  id: string;
  user_id: string;
  name: string;
  risk_score: number;
  status: 'approved' | 'under_review' | 'flagged';
  last_reviewed_at: string | null;
  notes: string;
  category: string;
  risk_notes: string | null;
  created_at: string;
}

export interface Policy {
  id: string;
  user_id: string;
  framework_id: string | null;
  title: string;
  version: string;
  status: 'draft' | 'in_review' | 'published' | 'archived';
  content: string;
  last_reviewed_at: string | null;
  created_at: string;
  frameworks?: Framework;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface AIConversation {
  id: string;
  user_id: string;
  context_type: string;
  context_id: string | null;
  title: string | null;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}

export interface RemediationPlan {
  id: string;
  user_id: string;
  control_id: string;
  title: string;
  ai_generated: boolean;
  steps: RemediationStep[];
  status: 'draft' | 'in_progress' | 'completed';
  priority: string;
  due_date: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  controls?: Control;
}

export interface RemediationStep {
  step: number;
  title: string;
  description: string;
  completed: boolean;
}

export interface ComplianceSnapshot {
  id: string;
  user_id: string;
  snapshot_date: string;
  total_controls: number;
  passing_controls: number;
  failing_controls: number;
  not_assessed_controls: number;
  compliance_score: number;
  framework_scores: Record<string, number>;
  created_at: string;
}

export interface ComplianceAlert {
  id: string;
  user_id: string;
  alert_type: 'missing_evidence' | 'policy_overdue' | 'vendor_review_due' | 'audit_approaching' | 'critical_control' | 'custom';
  severity: 'critical' | 'high' | 'medium' | 'info';
  title: string;
  description: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  dismissed_at: string | null;
  created_at: string;
}

export interface ActivityLogEntry {
  id: string;
  user_id: string;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  theme: 'light' | 'dark';
  density: 'comfortable' | 'compact';
  org_name: string | null;
  org_slug: string | null;
  trust_center_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export type OrgRole = 'owner' | 'admin' | 'compliance_lead' | 'auditor' | 'viewer';
export type PlanTier = 'trial' | 'starter' | 'pro' | 'enterprise';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  company_size: string | null;
  plan_tier: PlanTier;
  trial_ends_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrgMember {
  id: string;
  org_id: string;
  user_id: string;
  role: OrgRole;
  invited_by: string | null;
  invited_at: string;
  joined_at: string;
}

export interface OrgInvitation {
  id: string;
  org_id: string;
  email: string;
  role: OrgRole;
  invited_by: string;
  accepted_at: string | null;
  expires_at: string;
  created_at: string;
}

export interface Integration {
  id: string;
  org_id: string;
  provider: string;
  status: 'connected' | 'disconnected' | 'error' | 'syncing';
  config: Record<string, unknown>;
  last_sync_at: string | null;
  error_message: string | null;
  records_synced: number;
  evidence_generated: number;
  webhook_url: string | null;
  sync_schedule: string | null;
  created_at: string;
  updated_at: string;
}

export interface OnboardingProgress {
  id: string;
  org_id: string;
  completed_steps: string[];
  current_step: number;
  completed_at: string | null;
  created_at: string;
}

export interface IntegrationProvider {
  id: string;
  name: string;
  description: string;
  category: 'cloud' | 'identity' | 'code' | 'hr' | 'monitoring' | 'ticketing';
  icon: string;
  features: string[];
  tier: PlanTier;
}

import type { IntegrationProvider } from './types';

export interface ControlMappingDef {
  providerField: string;
  controlRef: string;
  framework: string;
  description: string;
  evidenceType: string;
}

export interface SyncResult {
  recordsFetched: number;
  evidenceCreated: number;
  controlsUpdated: number;
  errors: string[];
  duration: number;
}

export const PROVIDER_CONTROL_MAPPINGS: Record<string, ControlMappingDef[]> = {
  'aws': [
    { providerField: 'securityhub.findings', controlRef: 'CC6.1', framework: 'SOC 2', description: 'AWS Security Hub findings map to access control', evidenceType: 'Security scan report' },
    { providerField: 'config.compliance', controlRef: 'CC7.2', framework: 'SOC 2', description: 'AWS Config compliance rules verify system monitoring', evidenceType: 'Configuration compliance report' },
    { providerField: 'guardduty.findings', controlRef: 'CC6.8', framework: 'SOC 2', description: 'GuardDuty threat detection maps to malicious software prevention', evidenceType: 'Threat detection log' },
    { providerField: 'iam.mfa', controlRef: 'A.9.4.2', framework: 'ISO 27001', description: 'IAM MFA status maps to secure log-on procedures', evidenceType: 'MFA enrollment report' },
    { providerField: 'cloudtrail.logs', controlRef: 'CC4.1', framework: 'SOC 2', description: 'CloudTrail logging satisfies monitoring control', evidenceType: 'Audit trail export' },
  ],
  'gcp': [
    { providerField: 'scc.findings', controlRef: 'CC6.1', framework: 'SOC 2', description: 'SCC findings map to access security', evidenceType: 'Security findings report' },
    { providerField: 'asset_inventory', controlRef: 'A.8.1', framework: 'ISO 27001', description: 'Asset inventory maps to asset management', evidenceType: 'Cloud asset inventory' },
    { providerField: 'iam.policies', controlRef: 'CC6.3', framework: 'SOC 2', description: 'IAM policies map to role-based access', evidenceType: 'IAM policy export' },
  ],
  'azure': [
    { providerField: 'defender.recommendations', controlRef: 'CC6.1', framework: 'SOC 2', description: 'Defender recommendations map to access controls', evidenceType: 'Security recommendation report' },
    { providerField: 'compliance.score', controlRef: 'CC1.1', framework: 'SOC 2', description: 'Regulatory compliance score maps to control environment', evidenceType: 'Azure compliance score' },
    { providerField: 'sentinel.alerts', controlRef: 'CC7.3', framework: 'SOC 2', description: 'Sentinel alerts map to security event detection', evidenceType: 'SIEM alert summary' },
  ],
  'github': [
    { providerField: 'branch_protection', controlRef: 'CC8.1', framework: 'SOC 2', description: 'Branch protection rules verify change management', evidenceType: 'Branch protection config' },
    { providerField: 'pr_reviews', controlRef: 'CC8.1', framework: 'SOC 2', description: 'PR review requirements verify code review process', evidenceType: 'Pull request review log' },
    { providerField: 'dependabot.alerts', controlRef: 'CC6.8', framework: 'SOC 2', description: 'Dependabot alerts track vulnerability management', evidenceType: 'Dependency vulnerability report' },
    { providerField: 'secret_scanning', controlRef: 'CC6.7', framework: 'SOC 2', description: 'Secret scanning prevents credential exposure', evidenceType: 'Secret scanning status' },
    { providerField: 'codeowners', controlRef: 'A.9.2.3', framework: 'ISO 27001', description: 'CODEOWNERS file maps to access rights management', evidenceType: 'Code ownership config' },
  ],
  'gitlab': [
    { providerField: 'merge_request_approvals', controlRef: 'CC8.1', framework: 'SOC 2', description: 'MR approvals map to change management', evidenceType: 'Merge approval policy' },
    { providerField: 'sast_results', controlRef: 'CC6.8', framework: 'SOC 2', description: 'SAST scans detect application vulnerabilities', evidenceType: 'SAST scan report' },
    { providerField: 'pipeline_security', controlRef: 'CC7.1', framework: 'SOC 2', description: 'Pipeline security scans verify deployment safety', evidenceType: 'CI/CD security log' },
  ],
  'okta': [
    { providerField: 'mfa.enrollment', controlRef: 'CC6.6', framework: 'SOC 2', description: 'MFA enrollment status verifies authentication controls', evidenceType: 'MFA enrollment report' },
    { providerField: 'user.directory', controlRef: 'CC6.2', framework: 'SOC 2', description: 'User directory maps to user provisioning', evidenceType: 'User directory export' },
    { providerField: 'password.policies', controlRef: 'A.9.4.3', framework: 'ISO 27001', description: 'Password policies map to password management', evidenceType: 'Password policy config' },
    { providerField: 'session.policies', controlRef: 'CC6.1', framework: 'SOC 2', description: 'Session timeout policies verify access control', evidenceType: 'Session policy config' },
  ],
  'google-workspace': [
    { providerField: 'user.accounts', controlRef: 'CC6.2', framework: 'SOC 2', description: 'User accounts map to access provisioning', evidenceType: 'User account export' },
    { providerField: 'security.settings', controlRef: 'CC6.6', framework: 'SOC 2', description: 'Security settings verify authentication controls', evidenceType: 'Security settings report' },
    { providerField: 'admin.audit_log', controlRef: 'CC4.1', framework: 'SOC 2', description: 'Admin audit logs satisfy monitoring requirements', evidenceType: 'Admin audit log export' },
  ],
  'jira': [
    { providerField: 'security.tickets', controlRef: 'CC7.4', framework: 'SOC 2', description: 'Security tickets track incident response', evidenceType: 'Security ticket summary' },
    { providerField: 'change.requests', controlRef: 'CC8.1', framework: 'SOC 2', description: 'Change requests verify change management', evidenceType: 'Change request log' },
    { providerField: 'sla.metrics', controlRef: 'A1.2', framework: 'SOC 2', description: 'SLA metrics map to availability monitoring', evidenceType: 'SLA performance report' },
  ],
  'datadog': [
    { providerField: 'monitors.status', controlRef: 'A1.2', framework: 'SOC 2', description: 'Monitor status maps to availability controls', evidenceType: 'Monitor status report' },
    { providerField: 'incident.history', controlRef: 'CC7.4', framework: 'SOC 2', description: 'Incident history maps to incident response', evidenceType: 'Incident timeline export' },
    { providerField: 'apm.latency', controlRef: 'A1.1', framework: 'SOC 2', description: 'APM metrics verify performance baselines', evidenceType: 'Performance metrics report' },
  ],
  'crowdstrike': [
    { providerField: 'endpoint.coverage', controlRef: 'CC6.8', framework: 'SOC 2', description: 'Endpoint coverage maps to malicious software prevention', evidenceType: 'Endpoint protection report' },
    { providerField: 'detection.events', controlRef: 'CC7.2', framework: 'SOC 2', description: 'Detection events map to anomaly detection', evidenceType: 'Detection event log' },
    { providerField: 'vulnerability.scan', controlRef: 'CC3.2', framework: 'SOC 2', description: 'Vulnerability scans map to risk identification', evidenceType: 'Vulnerability scan report' },
  ],
  'snyk': [
    { providerField: 'vulnerability.results', controlRef: 'CC6.8', framework: 'SOC 2', description: 'Vulnerability results track code security', evidenceType: 'Code vulnerability report' },
    { providerField: 'license.compliance', controlRef: 'CC3.1', framework: 'SOC 2', description: 'License compliance tracks third-party risk', evidenceType: 'License compliance report' },
  ],
  'slack': [
    { providerField: 'retention.policies', controlRef: 'CC1.2', framework: 'SOC 2', description: 'Retention policies map to communication governance', evidenceType: 'Retention policy config' },
    { providerField: 'dlp.alerts', controlRef: 'C1.1', framework: 'SOC 2', description: 'DLP alerts track data leakage prevention', evidenceType: 'DLP alert summary' },
  ],
  'bamboohr': [
    { providerField: 'onboarding.records', controlRef: 'CC1.4', framework: 'SOC 2', description: 'Onboarding records verify hiring procedures', evidenceType: 'Onboarding completion report' },
    { providerField: 'offboarding.records', controlRef: 'CC6.2', framework: 'SOC 2', description: 'Offboarding records verify access revocation', evidenceType: 'Offboarding completion report' },
    { providerField: 'training.completion', controlRef: 'CC1.4', framework: 'SOC 2', description: 'Training records verify security awareness', evidenceType: 'Training completion report' },
    { providerField: 'background.checks', controlRef: 'A.7.1.1', framework: 'ISO 27001', description: 'Background checks map to screening requirements', evidenceType: 'Background check confirmation' },
  ],
};

export const INTEGRATION_PROVIDERS: IntegrationProvider[] = [
  // Cloud Security
  { id: 'aws', name: 'AWS Security Hub', description: 'Import findings, Config compliance rules, and GuardDuty threats for automated evidence.', category: 'cloud', icon: 'status-positive', features: ['Security findings', 'Config compliance', 'GuardDuty threats', 'IAM audit', 'CloudTrail logs'], tier: 'pro' },
  { id: 'gcp', name: 'Google Cloud SCC', description: 'Security Command Center findings, asset inventory, and IAM policy analysis.', category: 'cloud', icon: 'status-positive', features: ['Security findings', 'Asset inventory', 'IAM analysis', 'Compliance reports'], tier: 'pro' },
  { id: 'azure', name: 'Microsoft Defender', description: 'Defender recommendations, compliance scores, and Sentinel SIEM alerts.', category: 'cloud', icon: 'status-positive', features: ['Security recommendations', 'Compliance score', 'Sentinel alerts', 'Regulatory compliance'], tier: 'enterprise' },
  { id: 'cloudflare', name: 'Cloudflare', description: 'WAF events, DDoS mitigation logs, and zero-trust access policies.', category: 'cloud', icon: 'security', features: ['WAF events', 'DDoS logs', 'Zero Trust policies', 'DNS audit'], tier: 'pro' },
  { id: 'vercel', name: 'Vercel', description: 'Deployment audit logs, environment variable management, and access controls.', category: 'cloud', icon: 'status-positive', features: ['Deploy audit logs', 'Env var management', 'Team access'], tier: 'starter' },
  { id: 'terraform', name: 'Terraform Cloud', description: 'Infrastructure-as-code state, drift detection, and policy-as-code enforcement.', category: 'cloud', icon: 'script', features: ['State tracking', 'Drift detection', 'Policy enforcement', 'Run audit'], tier: 'pro' },

  // Code & DevOps
  { id: 'github', name: 'GitHub', description: 'Branch protection, PR reviews, Dependabot alerts, secret scanning, and CODEOWNERS.', category: 'code', icon: 'script', features: ['Branch protection', 'PR reviews', 'Dependabot alerts', 'Secret scanning', 'CODEOWNERS'], tier: 'pro' },
  { id: 'gitlab', name: 'GitLab', description: 'Merge request approvals, SAST/DAST results, pipeline security, and compliance dashboard.', category: 'code', icon: 'script', features: ['MR approvals', 'SAST/DAST', 'Pipeline security', 'Compliance dashboard'], tier: 'pro' },
  { id: 'bitbucket', name: 'Bitbucket', description: 'Pull request approvals, pipeline status, and branch restriction policies.', category: 'code', icon: 'script', features: ['PR approvals', 'Pipeline status', 'Branch restrictions'], tier: 'pro' },
  { id: 'circleci', name: 'CircleCI', description: 'Pipeline execution logs, security orbs, and deployment audit trails.', category: 'code', icon: 'status-in-progress', features: ['Pipeline logs', 'Security orbs', 'Deploy audit'], tier: 'pro' },
  { id: 'snyk', name: 'Snyk', description: 'Vulnerability scanning results, license compliance, and container security.', category: 'code', icon: 'security', features: ['Vulnerability scans', 'License compliance', 'Container security', 'IaC scanning'], tier: 'pro' },
  { id: 'sonarqube', name: 'SonarQube', description: 'Code quality gates, security hotspots, and technical debt tracking.', category: 'code', icon: 'status-warning', features: ['Quality gates', 'Security hotspots', 'Tech debt tracking'], tier: 'pro' },

  // Identity & Access
  { id: 'okta', name: 'Okta', description: 'MFA enrollment, user directory, password policies, session controls, and SSO status.', category: 'identity', icon: 'user-profile', features: ['MFA enrollment', 'User directory', 'Password policies', 'Session controls', 'SSO apps'], tier: 'pro' },
  { id: 'google-workspace', name: 'Google Workspace', description: 'User accounts, security settings, admin audit logs, and Drive sharing policies.', category: 'identity', icon: 'group', features: ['User accounts', 'Security settings', 'Admin logs', 'Drive policies'], tier: 'starter' },
  { id: 'azure-ad', name: 'Azure AD / Entra ID', description: 'Conditional access policies, risky sign-ins, and privileged identity management.', category: 'identity', icon: 'user-profile', features: ['Conditional access', 'Risky sign-ins', 'PIM', 'Access reviews'], tier: 'enterprise' },
  { id: 'auth0', name: 'Auth0', description: 'Authentication policies, anomaly detection, and brute-force protection status.', category: 'identity', icon: 'lock-private', features: ['Auth policies', 'Anomaly detection', 'Brute-force protection'], tier: 'pro' },
  { id: 'jumpcloud', name: 'JumpCloud', description: 'Device management, directory policies, and conditional access configuration.', category: 'identity', icon: 'key', features: ['Device management', 'Directory policies', 'Conditional access'], tier: 'pro' },
  { id: '1password', name: '1Password Business', description: 'Vault access audit, Watchtower alerts, and team credential hygiene scores.', category: 'identity', icon: 'lock-private', features: ['Vault audit', 'Watchtower alerts', 'Credential hygiene'], tier: 'pro' },

  // HR & People
  { id: 'bamboohr', name: 'BambooHR', description: 'Onboarding/offboarding records, background checks, and security training completion.', category: 'hr', icon: 'group', features: ['Onboarding records', 'Offboarding records', 'Background checks', 'Training logs'], tier: 'enterprise' },
  { id: 'rippling', name: 'Rippling', description: 'Employee lifecycle events, device management, and app provisioning automation.', category: 'hr', icon: 'group', features: ['Employee lifecycle', 'Device management', 'App provisioning'], tier: 'enterprise' },
  { id: 'gusto', name: 'Gusto', description: 'Employee onboarding events, policy acknowledgment tracking, and team directory.', category: 'hr', icon: 'group', features: ['Onboarding events', 'Policy acknowledgment', 'Team directory'], tier: 'pro' },

  // Monitoring & Security
  { id: 'datadog', name: 'Datadog', description: 'Monitor configurations, incident response timelines, SLA metrics, and APM performance.', category: 'monitoring', icon: 'status-in-progress', features: ['Monitor status', 'Incident timelines', 'SLA metrics', 'APM data'], tier: 'pro' },
  { id: 'crowdstrike', name: 'CrowdStrike', description: 'Endpoint protection coverage, detection events, and vulnerability assessments.', category: 'monitoring', icon: 'security', features: ['Endpoint coverage', 'Detection events', 'Vulnerability scans', 'Asset inventory'], tier: 'enterprise' },
  { id: 'sentinelone', name: 'SentinelOne', description: 'Endpoint detection and response, threat intelligence, and device compliance.', category: 'monitoring', icon: 'security', features: ['EDR status', 'Threat intelligence', 'Device compliance'], tier: 'enterprise' },
  { id: 'wiz', name: 'Wiz', description: 'Cloud security posture, attack path analysis, and infrastructure scanning.', category: 'monitoring', icon: 'security', features: ['CSPM findings', 'Attack paths', 'Infrastructure scans', 'Container security'], tier: 'enterprise' },
  { id: 'pagerduty', name: 'PagerDuty', description: 'Incident response metrics, on-call schedules, and escalation policy compliance.', category: 'monitoring', icon: 'notification', features: ['Incident metrics', 'On-call schedules', 'Escalation policies', 'MTTR tracking'], tier: 'pro' },

  // Ticketing & Comms
  { id: 'jira', name: 'Jira', description: 'Security tickets, change requests, SLA tracking, and vulnerability remediation workflows.', category: 'ticketing', icon: 'ticket', features: ['Security tickets', 'Change requests', 'SLA tracking', 'Remediation workflows'], tier: 'pro' },
  { id: 'linear', name: 'Linear', description: 'Issue tracking, security label filtering, and sprint-based remediation tracking.', category: 'ticketing', icon: 'ticket', features: ['Issue tracking', 'Security labels', 'Sprint tracking'], tier: 'pro' },
  { id: 'slack', name: 'Slack', description: 'Compliance alerts, evidence request notifications, DLP monitoring, and audit reminders.', category: 'ticketing', icon: 'notification', features: ['Alert notifications', 'Evidence requests', 'DLP monitoring', 'Audit reminders'], tier: 'starter' },
  { id: 'teams', name: 'Microsoft Teams', description: 'Compliance notifications, approval workflows, and DLP policy alerts.', category: 'ticketing', icon: 'notification', features: ['Notifications', 'Approval workflows', 'DLP alerts'], tier: 'pro' },
];

export const CATEGORIES = [
  { id: 'all', label: 'All Integrations', count: INTEGRATION_PROVIDERS.length },
  { id: 'cloud', label: 'Cloud Security', count: INTEGRATION_PROVIDERS.filter(p => p.category === 'cloud').length },
  { id: 'code', label: 'Code & DevOps', count: INTEGRATION_PROVIDERS.filter(p => p.category === 'code').length },
  { id: 'identity', label: 'Identity & Access', count: INTEGRATION_PROVIDERS.filter(p => p.category === 'identity').length },
  { id: 'monitoring', label: 'Monitoring & Security', count: INTEGRATION_PROVIDERS.filter(p => p.category === 'monitoring').length },
  { id: 'hr', label: 'HR & People', count: INTEGRATION_PROVIDERS.filter(p => p.category === 'hr').length },
  { id: 'ticketing', label: 'Ticketing & Comms', count: INTEGRATION_PROVIDERS.filter(p => p.category === 'ticketing').length },
];

export function getProviderMappings(providerId: string): ControlMappingDef[] {
  return PROVIDER_CONTROL_MAPPINGS[providerId] || [];
}

export function getControlsCoveredByProvider(providerId: string): string[] {
  const mappings = getProviderMappings(providerId);
  return [...new Set(mappings.map(m => m.controlRef))];
}

export function getEvidenceTypesForProvider(providerId: string): string[] {
  const mappings = getProviderMappings(providerId);
  return [...new Set(mappings.map(m => m.evidenceType))];
}

export function computeIntegrationCoverage(connectedProviders: string[]): {
  totalMappings: number;
  uniqueControls: number;
  frameworks: string[];
} {
  const allMappings = connectedProviders.flatMap(p => getProviderMappings(p));
  const uniqueControls = [...new Set(allMappings.map(m => m.controlRef))];
  const frameworks = [...new Set(allMappings.map(m => m.framework))];
  return {
    totalMappings: allMappings.length,
    uniqueControls: uniqueControls.length,
    frameworks,
  };
}

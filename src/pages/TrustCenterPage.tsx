import { useEffect, useState } from 'react';
import MarkdownContent from '../components/MarkdownContent';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import ColumnLayout from '@cloudscape-design/components/column-layout';
import Container from '@cloudscape-design/components/container';
import Header from '@cloudscape-design/components/header';
import Icon from '@cloudscape-design/components/icon';
import Input from '@cloudscape-design/components/input';
import Toggle from '@cloudscape-design/components/toggle';
import ProgressBar from '@cloudscape-design/components/progress-bar';
import SpaceBetween from '@cloudscape-design/components/space-between';
import StatusIndicator from '@cloudscape-design/components/status-indicator';
import Spinner from '@cloudscape-design/components/spinner';
import Table from '@cloudscape-design/components/table';
import Tabs from '@cloudscape-design/components/tabs';
import Badge from '@cloudscape-design/components/badge';
import Alert from '@cloudscape-design/components/alert';
import Modal from '@cloudscape-design/components/modal';
import FormField from '@cloudscape-design/components/form-field';
import Avatar from '@cloudscape-design/chat-components/avatar';
import ChatBubble from '@cloudscape-design/chat-components/chat-bubble';
import * as awsui from '@cloudscape-design/design-tokens';
import { supabase } from '../lib/supabase';
import { useAI } from '../lib/useAI';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import type { Framework, Control, Policy, Audit, Vendor, Evidence } from '../lib/types';

interface TrustData {
  frameworks: Framework[];
  controls: Control[];
  policies: Policy[];
  audits: Audit[];
  vendors: Vendor[];
  evidence: Evidence[];
}

function CoverageRing({ value, label }: { value: number; label: string }) {
  const color = value >= 80 ? awsui.colorTextStatusSuccess : value >= 50 ? awsui.colorTextStatusWarning : awsui.colorTextStatusError;
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: 80, height: 80, borderRadius: '50%', margin: '0 auto',
        border: `4px solid ${color}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Box variant="h2" color="inherit">{value}%</Box>
      </div>
      <Box variant="small" color="text-body-secondary" padding={{ top: 'xxs' }}>{label}</Box>
    </div>
  );
}

export default function TrustCenterPage() {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const [data, setData] = useState<TrustData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [executiveSummary, setExecutiveSummary] = useState<string | null>(null);
  const [validationReport, setValidationReport] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [orgSlug, setOrgSlug] = useState('');
  const [orgName, setOrgName] = useState('');
  const [trustEnabled, setTrustEnabled] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  const { sendMessage, clearMessages } = useAI({
    systemPrompt: `You are Stakflo AI, an expert in compliance communications. You write professional, trust-building summaries of an organization's security and compliance posture for external stakeholders, prospects, and auditors. Be specific with data but maintain a confident, reassuring tone.`,
  });

  useEffect(() => {
    async function load() {
      const [fRes, cRes, pRes, aRes, vRes, prefRes, eRes] = await Promise.all([
        supabase.from('frameworks').select('*').order('name'),
        supabase.from('controls').select('*, frameworks(name)'),
        supabase.from('policies').select('*, frameworks(name)').eq('status', 'published'),
        supabase.from('audits').select('*, frameworks(name)').order('created_at', { ascending: false }),
        supabase.from('vendors').select('*'),
        supabase.from('user_preferences').select('org_slug, org_name, trust_center_enabled').maybeSingle(),
        supabase.from('evidence').select('*, controls(control_ref, title, framework_id)'),
      ]);
      setData({
        frameworks: fRes.data || [],
        controls: cRes.data || [],
        policies: pRes.data || [],
        audits: aRes.data || [],
        vendors: vRes.data || [],
        evidence: eRes.data || [],
      });
      if (prefRes.data) {
        setOrgSlug(prefRes.data.org_slug || '');
        setOrgName(prefRes.data.org_name || '');
        setTrustEnabled(prefRes.data.trust_center_enabled || false);
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading || !data) return <Box textAlign="center" padding="xxl"><Spinner size="large" /></Box>;

  const totalControls = data.controls.length;
  const passingControls = data.controls.filter(c => c.status === 'passing').length;
  const overallScore = totalControls > 0 ? Math.round((passingControls / totalControls) * 100) : 0;
  const completedAudits = data.audits.filter(a => a.status === 'completed');
  const approvedVendors = data.vendors.filter(v => v.status === 'approved').length;

  const frameworkDetails = data.frameworks.map(fw => {
    const fwControls = data.controls.filter(c => c.framework_id === fw.id);
    const passing = fwControls.filter(c => c.status === 'passing').length;
    const total = fwControls.length;
    const pct = total > 0 ? Math.round((passing / total) * 100) : 0;
    const fwPolicies = data.policies.filter(p => p.framework_id === fw.id);
    const fwAudits = data.audits.filter(a => a.framework_id === fw.id);
    return { ...fw, passing, total, pct, policies: fwPolicies, audits: fwAudits };
  });

  const generateSummary = async () => {
    setGeneratingSummary(true);
    setExecutiveSummary(null);
    clearMessages();
    try {
      const fwSummary = frameworkDetails.map(fw => `${fw.name}: ${fw.pct}% coverage (${fw.passing}/${fw.total} controls)`).join('\n');
      const result = await sendMessage(
        `Generate a professional executive summary for our Trust Center page that external stakeholders and prospective customers will see. Use the following real compliance data:\n\nOverall Compliance Score: ${overallScore}%\nTotal Controls: ${totalControls} (${passingControls} passing)\nPublished Policies: ${data.policies.length}\nCompleted Audits: ${completedAudits.length}\nApproved Vendors: ${approvedVendors}/${data.vendors.length}\n\nFramework Coverage:\n${fwSummary}\n\nWrite a 3-4 paragraph executive summary covering:\n1. Our commitment to security and compliance\n2. Current compliance posture with specific metrics\n3. Frameworks we support and their status\n4. Our continuous monitoring and improvement approach\n\nKeep it professional, confident, and data-driven. This will be shown to customers evaluating our security posture.`
      );
      setExecutiveSummary(result);
    } catch {
      setExecutiveSummary('Failed to generate summary. Please check that the OpenRouter API key is configured.');
    } finally {
      setGeneratingSummary(false);
    }
  };

  const validateClaims = async () => {
    if (!data) return;
    setValidating(true);
    setValidationReport(null);
    clearMessages();
    try {
      const approvedEvidence = data.evidence.filter(e => e.status === 'approved');
      const pendingEvidence = data.evidence.filter(e => e.status === 'pending');
      const missingCoverage = data.controls.filter(c =>
        c.status === 'passing' && !approvedEvidence.some(e => e.control_id === c.id)
      );

      const fwDetails = data.frameworks.map(fw => {
        const fwC = data.controls.filter(c => c.framework_id === fw.id);
        const passing = fwC.filter(c => c.status === 'passing').length;
        const pct = fwC.length > 0 ? Math.round((passing / fwC.length) * 100) : 0;
        const evidenceCount = approvedEvidence.filter(e => {
          const ctrl = data.controls.find(c => c.id === e.control_id);
          return ctrl?.framework_id === fw.id;
        }).length;
        return `${fw.name}: ${pct}% passing (${passing}/${fwC.length} controls), ${evidenceCount} approved evidence items, ${data.policies.filter(p => p.framework_id === fw.id).length} published policies`;
      }).join('\n');
      const totalControls = data.controls.length;
      const passingCount = data.controls.filter(c => c.status === 'passing').length;
      const overallPct = totalControls > 0 ? Math.round((passingCount / totalControls) * 100) : 0;
      const completedAuditCount = data.audits.filter(a => a.status === 'completed').length;
      const approvedVendorCount = data.vendors.filter(v => v.status === 'approved').length;

      const result = await sendMessage(
        `Perform an automated Trust Center claim validation. Your job is to verify that the compliance claims we make publicly are backed by real evidence in our system.\n\n**Overall Compliance Score Claim: ${overallPct}%**\nTotal Controls: ${totalControls} (${passingCount} marked passing)\nApproved Evidence Items: ${approvedEvidence.length}\nPending Evidence Items: ${pendingEvidence.length}\nPublished Policies: ${data.policies.length}\nCompleted Audits: ${completedAuditCount}\nApproved Vendors: ${approvedVendorCount}/${data.vendors.length}\n\nFramework Claims:\n${fwDetails}\n\nPotentially Unverified Controls (passing but no approved evidence):\n${missingCoverage.slice(0, 15).map(c => `- ${c.control_ref}: ${c.title} [${c.risk_level}]`).join('\n') || '- None identified'}\n\nProduce a **Trust Center Claim Validation Report** with:\n\n## Validation Summary\nOverall confidence score (High/Medium/Low) and key finding.\n\n## Verified Claims\nList claims that are well-supported by the evidence on record.\n\n## Unverified or Weak Claims\nList claims that cannot be fully backed by current evidence. For each: the claim, why it's weak, and what evidence would verify it.\n\n## Evidence Gaps\nIdentify controls claiming to pass that lack approved evidence (top 10 most critical).\n\n## Risk to Trust Center Credibility\nWhat is the reputational/legal risk if a customer or auditor challenges these claims?\n\n## Recommended Actions Before Publishing\nNumbered list of specific actions to strengthen claims before making the Trust Center public.\n\nBe direct and rigorous. This is an internal validation, not marketing copy.`
      );
      setValidationReport(result);
    } catch {
      setValidationReport('Failed to run validation. Please check that the OpenRouter API key is configured.');
    } finally {
      setValidating(false);
    }
  };

  const saveSettings = async () => {
    if (!orgSlug.trim()) {
      addNotification('error', 'Slug is required to enable the public trust center');
      return;
    }
    setSavingSettings(true);
    const { error } = await supabase.from('user_preferences').upsert({
      user_id: user!.id,
      org_slug: orgSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      org_name: orgName.trim(),
      trust_center_enabled: trustEnabled,
    }, { onConflict: 'user_id' });
    setSavingSettings(false);
    if (error) addNotification('error', error.message);
    else addNotification('success', trustEnabled ? 'Trust Center is now public' : 'Settings saved');
  };

  const publicUrl = orgSlug ? `${window.location.origin}/trust/${orgSlug.toLowerCase().replace(/[^a-z0-9-]/g, '-')}` : '';

  return (
    <SpaceBetween size="l">
      <Header
        variant="h1"
        description="Shareable compliance posture for customers, auditors, and stakeholders"
        actions={
          <SpaceBetween direction="horizontal" size="xs">
            <Button iconName="gen-ai" loading={generatingSummary} onClick={generateSummary}>Generate AI Summary</Button>
            <Button variant="primary" iconName="external" onClick={() => setShowPreview(true)}>Preview Trust Center</Button>
          </SpaceBetween>
        }
      >
        Trust Center
      </Header>

      <Container header={<Header variant="h2">Public Trust Center Settings</Header>}>
        <SpaceBetween size="m">
          <ColumnLayout columns={2}>
            <FormField label="Organization name" description="Displayed on the public trust center page">
              <Input value={orgName} onChange={({ detail }) => setOrgName(detail.value)} placeholder="Acme Corp" />
            </FormField>
            <FormField
              label="Public URL slug"
              description="Unique identifier for your trust center URL"
              constraintText="Only lowercase letters, numbers, and hyphens"
            >
              <Input
                value={orgSlug}
                onChange={({ detail }) => setOrgSlug(detail.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                placeholder="acme-corp"
              />
            </FormField>
          </ColumnLayout>
          <Toggle checked={trustEnabled} onChange={({ detail }) => setTrustEnabled(detail.checked)}>
            {trustEnabled ? 'Public trust center is enabled' : 'Enable public trust center'}
          </Toggle>
          {trustEnabled && publicUrl && (
            <SpaceBetween direction="horizontal" size="xs" alignItems="center">
              <Box variant="code">{publicUrl}</Box>
              <Button
                iconName="copy"
                variant="icon"
                ariaLabel="Copy URL"
                onClick={() => { navigator.clipboard.writeText(publicUrl); addNotification('success', 'URL copied'); }}
              />
              <Button iconName="external" variant="icon" ariaLabel="Open" href={publicUrl} target="_blank" />
            </SpaceBetween>
          )}
          <Button variant="primary" loading={savingSettings} onClick={saveSettings}>Save settings</Button>
        </SpaceBetween>
      </Container>

      <ColumnLayout columns={4} variant="text-grid">
        <Container>
          <SpaceBetween size="xxs">
            <Box variant="awsui-key-label">Overall Compliance</Box>
            <Box variant="h1" fontSize="display-l" color={overallScore >= 80 ? 'text-status-success' : 'text-status-warning'}>{overallScore}%</Box>
          </SpaceBetween>
        </Container>
        <Container>
          <SpaceBetween size="xxs">
            <Box variant="awsui-key-label">Frameworks Active</Box>
            <Box variant="h1" fontSize="display-l">{data.frameworks.length}</Box>
          </SpaceBetween>
        </Container>
        <Container>
          <SpaceBetween size="xxs">
            <Box variant="awsui-key-label">Published Policies</Box>
            <Box variant="h1" fontSize="display-l">{data.policies.length}</Box>
          </SpaceBetween>
        </Container>
        <Container>
          <SpaceBetween size="xxs">
            <Box variant="awsui-key-label">Completed Audits</Box>
            <Box variant="h1" fontSize="display-l">{completedAudits.length}</Box>
          </SpaceBetween>
        </Container>
      </ColumnLayout>

      {executiveSummary && (
        <Container header={<Header variant="h2" actions={<Badge color="blue">AI Generated</Badge>}>Executive Summary</Header>}>
          <ChatBubble type="incoming" ariaLabel="AI executive summary" avatar={<Avatar color="gen-ai" iconName="gen-ai" ariaLabel="Stakflo AI" />}>
            <MarkdownContent content={executiveSummary} />
          </ChatBubble>
          <Box padding={{ top: 's' }}>
            <Button onClick={() => { navigator.clipboard.writeText(executiveSummary); addNotification('success', 'Summary copied to clipboard'); }}>Copy Summary</Button>
          </Box>
        </Container>
      )}

      <Tabs tabs={[
        {
          id: 'frameworks',
          label: 'Framework Coverage',
          content: (
            <SpaceBetween size="m">
              {frameworkDetails.map(fw => (
                <Container key={fw.id} header={
                  <Header variant="h3">
                    <SpaceBetween direction="horizontal" size="xs" alignItems="center">
                      <Icon name={(fw.icon || 'security') as any} />
                      <span>{fw.name}</span>
                      <Badge color={fw.pct >= 80 ? 'green' : fw.pct >= 50 ? 'blue' : 'red'}>{fw.pct}%</Badge>
                    </SpaceBetween>
                  </Header>
                }>
                  <SpaceBetween size="s">
                    <Box variant="p" color="text-body-secondary">{fw.description}</Box>
                    <ProgressBar
                      value={fw.pct}
                      additionalInfo={`${fw.passing} of ${fw.total} controls passing`}
                      status={fw.pct >= 80 ? 'success' : fw.pct >= 50 ? 'in-progress' : 'error'}
                    />
                    <ColumnLayout columns={3} variant="text-grid">
                      <SpaceBetween size="xxs">
                        <Box variant="awsui-key-label">Controls</Box>
                        <Box>{fw.total} total</Box>
                      </SpaceBetween>
                      <SpaceBetween size="xxs">
                        <Box variant="awsui-key-label">Published Policies</Box>
                        <Box>{fw.policies.length}</Box>
                      </SpaceBetween>
                      <SpaceBetween size="xxs">
                        <Box variant="awsui-key-label">Audits</Box>
                        <Box>{fw.audits.length}</Box>
                      </SpaceBetween>
                    </ColumnLayout>
                  </SpaceBetween>
                </Container>
              ))}
            </SpaceBetween>
          ),
        },
        {
          id: 'policies',
          label: `Published Policies (${data.policies.length})`,
          content: (
            <Table
              columnDefinitions={[
                { id: 'title', header: 'Policy', cell: item => <Box fontWeight="bold">{item.title}</Box>, isRowHeader: true },
                { id: 'framework', header: 'Framework', cell: item => (item as any).frameworks?.name || 'General', width: 160 },
                { id: 'version', header: 'Version', cell: item => <Badge>{`v${item.version}`}</Badge>, width: 100 },
                {
                  id: 'reviewed', header: 'Last Reviewed', width: 150,
                  cell: item => item.last_reviewed_at ? new Date(item.last_reviewed_at).toLocaleDateString() : 'Not yet reviewed',
                },
                {
                  id: 'status', header: 'Status', width: 130,
                  cell: () => <StatusIndicator type="success">Published</StatusIndicator>,
                },
              ]}
              items={data.policies}
              trackBy="id"
              empty={<Box textAlign="center" padding="l">No published policies yet.</Box>}
            />
          ),
        },
        {
          id: 'audits',
          label: `Audit History (${data.audits.length})`,
          content: (
            <Table
              columnDefinitions={[
                { id: 'title', header: 'Audit', cell: item => item.title, isRowHeader: true },
                { id: 'framework', header: 'Framework', cell: item => (item as any).frameworks?.name || '-', width: 150 },
                {
                  id: 'status', header: 'Status', width: 140,
                  cell: item => (
                    <StatusIndicator type={item.status === 'completed' ? 'success' : item.status === 'in_progress' ? 'in-progress' : 'pending'}>
                      {item.status === 'completed' ? 'Completed' : item.status === 'in_progress' ? 'In Progress' : 'Not Started'}
                    </StatusIndicator>
                  ),
                },
                { id: 'start', header: 'Start', cell: item => item.start_date || '-', width: 120 },
                { id: 'end', header: 'End', cell: item => item.end_date || '-', width: 120 },
              ]}
              items={data.audits}
              trackBy="id"
              empty={<Box textAlign="center" padding="l">No audits recorded yet.</Box>}
            />
          ),
        },
        {
          id: 'vendors',
          label: `Vendor Security (${data.vendors.length})`,
          content: (
            <SpaceBetween size="m">
              <ColumnLayout columns={3} variant="text-grid">
                <Container>
                  <SpaceBetween size="xxs">
                    <Box variant="awsui-key-label">Total Vendors</Box>
                    <Box variant="h1">{data.vendors.length}</Box>
                  </SpaceBetween>
                </Container>
                <Container>
                  <SpaceBetween size="xxs">
                    <Box variant="awsui-key-label">Approved</Box>
                    <Box variant="h1" color="text-status-success">{approvedVendors}</Box>
                  </SpaceBetween>
                </Container>
                <Container>
                  <SpaceBetween size="xxs">
                    <Box variant="awsui-key-label">Avg. Risk Score</Box>
                    <Box variant="h1">
                      {data.vendors.length > 0 ? Math.round(data.vendors.reduce((s, v) => s + v.risk_score, 0) / data.vendors.length) : 0}
                    </Box>
                  </SpaceBetween>
                </Container>
              </ColumnLayout>
              <Table
                columnDefinitions={[
                  { id: 'name', header: 'Vendor', cell: item => item.name, isRowHeader: true },
                  {
                    id: 'status', header: 'Status', width: 140,
                    cell: item => (
                      <StatusIndicator type={item.status === 'approved' ? 'success' : item.status === 'flagged' ? 'error' : 'in-progress'}>
                        {item.status === 'approved' ? 'Approved' : item.status === 'flagged' ? 'Flagged' : 'Under Review'}
                      </StatusIndicator>
                    ),
                  },
                  {
                    id: 'risk', header: 'Risk Score', width: 120,
                    cell: item => <Badge color={item.risk_score >= 70 ? 'red' : item.risk_score >= 40 ? 'blue' : 'green'}>{item.risk_score}</Badge>,
                  },
                  {
                    id: 'reviewed', header: 'Last Reviewed', width: 140,
                    cell: item => item.last_reviewed_at ? new Date(item.last_reviewed_at).toLocaleDateString() : 'Never',
                  },
                ]}
                items={data.vendors}
                trackBy="id"
                empty={<Box textAlign="center" padding="l">No vendors tracked yet.</Box>}
              />
            </SpaceBetween>
          ),
        },
        {
          id: 'validation',
          label: 'Claim Validation',
          content: (
            <SpaceBetween size="m">
              <Alert type="info">
                Claim Validation cross-references your public compliance claims against actual evidence, controls, and audit records in Stakflo. Run it before publishing your Trust Center to catch unsupported claims.
              </Alert>
              <Container
                header={
                  <Header
                    variant="h2"
                    description="Validate that your compliance claims are backed by real evidence"
                    actions={
                      <Button variant="primary" iconName="gen-ai" loading={validating} onClick={validateClaims}>
                        Run Claim Validation
                      </Button>
                    }
                  >
                    Evidence-Backed Claim Analysis
                  </Header>
                }
              >
                <SpaceBetween size="m">
                  <ColumnLayout columns={3} variant="text-grid">
                    <SpaceBetween size="xxs">
                      <Box variant="awsui-key-label">Controls Claiming Passing</Box>
                      <Box variant="h2">{data.controls.filter(c => c.status === 'passing').length}</Box>
                    </SpaceBetween>
                    <SpaceBetween size="xxs">
                      <Box variant="awsui-key-label">With Approved Evidence</Box>
                      <Box variant="h2" color="text-status-success">
                        {data.evidence.filter(e => e.status === 'approved').length > 0
                          ? new Set(data.evidence.filter(e => e.status === 'approved').map(e => e.control_id)).size
                          : 0}
                      </Box>
                    </SpaceBetween>
                    <SpaceBetween size="xxs">
                      <Box variant="awsui-key-label">Without Approved Evidence</Box>
                      <Box variant="h2" color="text-status-error">
                        {(() => {
                          const approvedControlIds = new Set(data.evidence.filter(e => e.status === 'approved').map(e => e.control_id));
                          return data.controls.filter(c => c.status === 'passing' && !approvedControlIds.has(c.id)).length;
                        })()}
                      </Box>
                    </SpaceBetween>
                  </ColumnLayout>
                  {validationReport && (
                    <ChatBubble
                      type="incoming"
                      ariaLabel="Claim validation report"
                      avatar={<Avatar color="gen-ai" iconName="gen-ai" ariaLabel="Stakflo AI" />}
                    >
                      <MarkdownContent content={validationReport} maxHeight="500px" />
                    </ChatBubble>
                  )}
                  {validationReport && (
                    <Button
                      iconName="copy"
                      onClick={() => { navigator.clipboard.writeText(validationReport); addNotification('success', 'Validation report copied'); }}
                    >
                      Copy Report
                    </Button>
                  )}
                </SpaceBetween>
              </Container>
            </SpaceBetween>
          ),
        },
      ]} />

      <Modal visible={showPreview} onDismiss={() => setShowPreview(false)} header="Trust Center Preview" size="max">
        <SpaceBetween size="l">
          <Box textAlign="center" padding="l">
            <SpaceBetween size="xs" alignItems="center" direction="vertical">
              <div style={{
                width: 48, height: 48, borderRadius: awsui.borderRadiusContainer,
                background: awsui.colorBackgroundControlChecked,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name="security" size="big" variant="inverted" />
              </div>
              <Box variant="h1" fontSize="display-l">Stakflo Trust Center</Box>
              <Box variant="p" color="text-body-secondary" fontSize="heading-m">
                Transparency into our security, compliance, and data protection practices
              </Box>
            </SpaceBetween>
          </Box>

          <ColumnLayout columns={4} variant="text-grid">
            {frameworkDetails.map(fw => (
              <Container key={fw.id}>
                <SpaceBetween size="xs" alignItems="center" direction="vertical">
                  <CoverageRing value={fw.pct} label={fw.name} />
                  <StatusIndicator type={fw.pct >= 80 ? 'success' : fw.pct >= 50 ? 'in-progress' : 'error'}>
                    {fw.pct >= 80 ? 'Compliant' : fw.pct >= 50 ? 'In Progress' : 'In Development'}
                  </StatusIndicator>
                </SpaceBetween>
              </Container>
            ))}
          </ColumnLayout>

          {executiveSummary && (
            <Container header={<Header variant="h2">About Our Security Program</Header>}>
              <MarkdownContent content={executiveSummary} />
            </Container>
          )}

          <ColumnLayout columns={2}>
            <Container header={<Header variant="h2">Published Policies</Header>}>
              <SpaceBetween size="xs">
                {data.policies.length === 0 && <Box color="text-body-secondary">No published policies yet.</Box>}
                {data.policies.map(p => (
                  <SpaceBetween key={p.id} direction="horizontal" size="xs" alignItems="center">
                    <Icon name="file" />
                    <Box>{p.title}</Box>
                    <Badge>{`v${p.version}`}</Badge>
                  </SpaceBetween>
                ))}
              </SpaceBetween>
            </Container>
            <Container header={<Header variant="h2">Audit History</Header>}>
              <SpaceBetween size="xs">
                {completedAudits.length === 0 && <Box color="text-body-secondary">No completed audits yet.</Box>}
                {completedAudits.map(a => (
                  <SpaceBetween key={a.id} direction="horizontal" size="xs" alignItems="center">
                    <StatusIndicator type="success">{a.title}</StatusIndicator>
                    <Box variant="small" color="text-body-secondary">{(a as any).frameworks?.name}</Box>
                  </SpaceBetween>
                ))}
              </SpaceBetween>
            </Container>
          </ColumnLayout>
        </SpaceBetween>
      </Modal>
    </SpaceBetween>
  );
}

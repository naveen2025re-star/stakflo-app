import React, { useEffect, useState, useCallback, useMemo } from 'react';
import MarkdownContent from '../components/MarkdownContent';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import ColumnLayout from '@cloudscape-design/components/column-layout';
import Container from '@cloudscape-design/components/container';
import Header from '@cloudscape-design/components/header';
import SpaceBetween from '@cloudscape-design/components/space-between';
import StatusIndicator from '@cloudscape-design/components/status-indicator';
import Table from '@cloudscape-design/components/table';
import Icon from '@cloudscape-design/components/icon';
import Spinner from '@cloudscape-design/components/spinner';
import Link from '@cloudscape-design/components/link';
import Alert from '@cloudscape-design/components/alert';
import Grid from '@cloudscape-design/components/grid';
import PieChart from '@cloudscape-design/components/pie-chart';
import LineChart from '@cloudscape-design/components/line-chart';
import BarChart from '@cloudscape-design/components/bar-chart';
import ProgressBar from '@cloudscape-design/components/progress-bar';
import Badge from '@cloudscape-design/components/badge';
import Modal from '@cloudscape-design/components/modal';
import Avatar from '@cloudscape-design/chat-components/avatar';
import ChatBubble from '@cloudscape-design/chat-components/chat-bubble';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useNotifications } from '../contexts/NotificationContext';
import { useAI } from '../lib/useAI';
import { useAuth } from '../contexts/AuthContext';
import { INTEGRATION_PROVIDERS } from '../lib/integrationEngine';
import type { Control, Evidence, Framework, Audit, ComplianceSnapshot, Integration } from '../lib/types';
import * as awsui from '@cloudscape-design/design-tokens';

function KpiCard({ title, value, icon, variant, description }: {
  title: string;
  value: string | number;
  icon: string;
  variant: 'success' | 'error' | 'warning' | 'normal' | 'info';
  description?: string;
}) {
  const iconVariant = variant === 'success' ? 'success' : variant === 'error' ? 'error' : variant === 'warning' ? 'warning' : 'subtle';
  return (
    <Container>
      <SpaceBetween size="xxs">
        <Box variant="awsui-key-label">
          <SpaceBetween direction="horizontal" size="xs" alignItems="center">
            <Icon name={icon as any} variant={iconVariant} />
            <span>{title}</span>
          </SpaceBetween>
        </Box>
        <Box variant="h1" fontSize="display-l">{value}</Box>
        {description && <Box variant="small" color="text-body-secondary">{description}</Box>}
      </SpaceBetween>
    </Container>
  );
}

function GettingStartedChecklist({ navigate }: { navigate: (path: string) => void }) {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('stakflo-checklist-dismissed') === 'true');
  const [checks, setChecks] = useState({ framework: false, control: false, evidence: false, integration: false, team: false });

  useEffect(() => {
    Promise.all([
      supabase.from('frameworks').select('id').limit(1),
      supabase.from('controls').select('id').limit(1),
      supabase.from('evidence').select('id').limit(1),
    ]).then(([fw, ctrl, ev]) => {
      setChecks({
        framework: (fw.data?.length ?? 0) > 0,
        control: (ctrl.data?.length ?? 0) > 0,
        evidence: (ev.data?.length ?? 0) > 0,
        integration: false,
        team: false,
      });
    });
  }, []);

  if (dismissed) return null;

  const completedCount = Object.values(checks).filter(Boolean).length;
  const pct = Math.round((completedCount / 5) * 100);

  return (
    <Container
      header={
        <Header variant="h2" description={`${completedCount} of 5 steps completed`}
          actions={<Button variant="inline-link" onClick={() => { setDismissed(true); localStorage.setItem('stakflo-checklist-dismissed', 'true'); }}>Dismiss</Button>}
        >
          <SpaceBetween direction="horizontal" size="xs" alignItems="center">
            <Icon name="flag" variant="link" />
            Getting Started
          </SpaceBetween>
        </Header>
      }
    >
      <SpaceBetween size="m">
        <ProgressBar value={pct} />
        <ColumnLayout columns={5}>
          <SpaceBetween size="xxs">
            <StatusIndicator type={checks.framework ? 'success' : 'pending'}>{checks.framework ? 'Framework added' : 'Add a framework'}</StatusIndicator>
            {!checks.framework && <Button variant="inline-link" onClick={() => navigate('/frameworks')}>Add now</Button>}
          </SpaceBetween>
          <SpaceBetween size="xxs">
            <StatusIndicator type={checks.control ? 'success' : 'pending'}>{checks.control ? 'Controls mapped' : 'Map controls'}</StatusIndicator>
            {!checks.control && <Button variant="inline-link" onClick={() => navigate('/controls')}>Add now</Button>}
          </SpaceBetween>
          <SpaceBetween size="xxs">
            <StatusIndicator type={checks.evidence ? 'success' : 'pending'}>{checks.evidence ? 'Evidence uploaded' : 'Upload evidence'}</StatusIndicator>
            {!checks.evidence && <Button variant="inline-link" onClick={() => navigate('/evidence')}>Add now</Button>}
          </SpaceBetween>
          <SpaceBetween size="xxs">
            <StatusIndicator type={checks.integration ? 'success' : 'pending'}>{checks.integration ? 'Integration connected' : 'Connect a tool'}</StatusIndicator>
            {!checks.integration && <Button variant="inline-link" onClick={() => navigate('/integrations')}>Connect</Button>}
          </SpaceBetween>
          <SpaceBetween size="xxs">
            <StatusIndicator type={checks.team ? 'success' : 'pending'}>{checks.team ? 'Team invited' : 'Invite your team'}</StatusIndicator>
            {!checks.team && <Button variant="inline-link" onClick={() => navigate('/team')}>Invite</Button>}
          </SpaceBetween>
        </ColumnLayout>
      </SpaceBetween>
    </Container>
  );
}

function IntegrationHealthStrip({ integrations }: { integrations: Integration[] }) {
  const navigate = useNavigate();
  if (integrations.length === 0) {
    return (
      <Container header={<Header variant="h2" actions={<Link onFollow={() => navigate('/integrations')}>Connect</Link>}>Integration Health</Header>}>
        <Box textAlign="center" padding="s" color="text-body-secondary">
          No integrations connected yet. Connect tools for automated evidence collection.
        </Box>
      </Container>
    );
  }

  const healthy = integrations.filter(i => i.status === 'connected').length;
  const errored = integrations.filter(i => i.status === 'error').length;
  const syncing = integrations.filter(i => i.status === 'syncing').length;

  return (
    <Container header={<Header variant="h2" actions={<Link onFollow={() => navigate('/integrations')}>Manage</Link>}>Integration Health</Header>}>
      <SpaceBetween size="m">
        <ColumnLayout columns={3} variant="text-grid">
          <div>
            <Box variant="awsui-key-label">Healthy</Box>
            <SpaceBetween direction="horizontal" size="xs" alignItems="center">
              <Icon name="status-positive" variant="success" />
              <Box variant="h3">{healthy}</Box>
            </SpaceBetween>
          </div>
          <div>
            <Box variant="awsui-key-label">Syncing</Box>
            <SpaceBetween direction="horizontal" size="xs" alignItems="center">
              <Icon name="status-in-progress" variant="link" />
              <Box variant="h3">{syncing}</Box>
            </SpaceBetween>
          </div>
          <div>
            <Box variant="awsui-key-label">Errors</Box>
            <SpaceBetween direction="horizontal" size="xs" alignItems="center">
              <Icon name="status-negative" variant="error" />
              <Box variant="h3">{errored}</Box>
            </SpaceBetween>
          </div>
        </ColumnLayout>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {integrations.map(ig => {
            const provider = INTEGRATION_PROVIDERS.find(p => p.id === ig.provider);
            const color = ig.status === 'connected' ? awsui.colorTextStatusSuccess : ig.status === 'error' ? awsui.colorTextStatusError : awsui.colorTextStatusInfo;
            return (
              <div key={ig.id} style={{ padding: '4px 10px', borderRadius: '4px', border: `1px solid ${color}`, fontSize: '12px' }}>
                <SpaceBetween direction="horizontal" size="xxs" alignItems="center">
                  <span>{provider?.icon || '🔗'}</span>
                  <span>{provider?.name || ig.provider}</span>
                </SpaceBetween>
              </div>
            );
          })}
        </div>
      </SpaceBetween>
    </Container>
  );
}

function RiskHeatmap({ controls }: { controls: Control[] }) {
  const riskLevels = ['critical', 'high', 'medium', 'low'] as const;
  const statuses = ['failing', 'not_assessed', 'passing'] as const;

  const matrix = riskLevels.map(risk => ({
    risk,
    ...Object.fromEntries(statuses.map(status => [
      status,
      controls.filter(c => c.risk_level === risk && c.status === status).length,
    ])),
  }));

  const getHeatColor = (count: number, risk: string, status: string) => {
    if (count === 0) return awsui.colorBackgroundContainerContent;
    if (status === 'passing') return awsui.colorBackgroundNotificationGreen;
    if (risk === 'critical' || risk === 'high') return status === 'failing' ? '#d91515' : '#f89256';
    return status === 'failing' ? '#f89256' : '#f2d26e';
  };

  return (
    <Container header={<Header variant="h2">Risk Heatmap</Header>}>
      <SpaceBetween size="s">
        <div style={{ display: 'grid', gridTemplateColumns: '80px repeat(3, 1fr)', gap: '4px' }}>
          <div />
          {statuses.map(s => (
            <Box key={s} variant="small" textAlign="center" fontWeight="bold">
              {s === 'not_assessed' ? 'Unassessed' : s.charAt(0).toUpperCase() + s.slice(1)}
            </Box>
          ))}
          {matrix.map(row => (
            <React.Fragment key={row.risk}>
              <Box variant="small" fontWeight="bold" padding={{ top: 'xxs' }}>
                {row.risk.charAt(0).toUpperCase() + row.risk.slice(1)}
              </Box>
              {statuses.map(status => {
                const count = (row as any)[status] as number;
                return (
                  <div
                    key={status}
                    style={{
                      background: getHeatColor(count, row.risk, status),
                      borderRadius: '4px',
                      padding: '8px',
                      textAlign: 'center',
                      color: count > 0 && status !== 'passing' && (row.risk === 'critical' || row.risk === 'high') ? '#fff' : 'inherit',
                      fontWeight: count > 0 ? 'bold' : 'normal',
                      minHeight: '36px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {count > 0 ? count : '-'}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
        <Box variant="small" color="text-body-secondary">
          Rows = risk level, Columns = status. Red cells need immediate attention.
        </Box>
      </SpaceBetween>
    </Container>
  );
}

function ActivityFeed({ controls, evidence }: { controls: Control[]; evidence: Evidence[] }) {
  const recentItems = useMemo(() => {
    const items: { id: string; icon: string; text: string; time: string; type: 'control' | 'evidence' }[] = [];
    controls.slice(0, 5).forEach(c => {
      if (c.last_assessed_at) {
        items.push({
          id: `c-${c.id}`,
          icon: c.status === 'passing' ? 'status-positive' : c.status === 'failing' ? 'status-negative' : 'status-pending',
          text: `${c.control_ref} marked ${c.status}`,
          time: c.last_assessed_at,
          type: 'control',
        });
      }
    });
    evidence.slice(0, 5).forEach(e => {
      items.push({
        id: `e-${e.id}`,
        icon: e.status === 'approved' ? 'status-positive' : e.status === 'rejected' ? 'status-negative' : 'upload',
        text: `${e.title} - ${e.status}`,
        time: e.uploaded_at,
        type: 'evidence',
      });
    });
    return items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 8);
  }, [controls, evidence]);

  return (
    <Container header={<Header variant="h2">Recent Activity</Header>}>
      {recentItems.length === 0 ? (
        <Box textAlign="center" padding="s" color="text-body-secondary">No recent activity</Box>
      ) : (
        <SpaceBetween size="xs">
          {recentItems.map(item => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', borderBottom: `1px solid ${awsui.colorBorderDividerDefault}` }}>
              <Icon name={item.icon as any} variant={item.icon.includes('positive') ? 'success' : item.icon.includes('negative') ? 'error' : 'subtle'} />
              <Box variant="small" display="block" fontSize="body-s">{item.text}</Box>
              <div style={{ marginLeft: 'auto' }}>
                <Box variant="small" color="text-body-secondary" fontSize="body-s">{formatRelativeTime(item.time)}</Box>
              </div>
            </div>
          ))}
        </SpaceBetween>
      )}
    </Container>
  );
}

function AuditCountdown({ audits }: { audits: Audit[] }) {
  const navigate = useNavigate();
  const upcoming = audits
    .filter(a => a.status !== 'completed' && new Date(a.end_date) > new Date())
    .sort((a, b) => new Date(a.end_date).getTime() - new Date(b.end_date).getTime());

  if (upcoming.length === 0) return null;

  const next = upcoming[0];
  const daysLeft = Math.ceil((new Date(next.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <Container header={<Header variant="h2" actions={<Link onFollow={() => navigate('/audits')}>View audits</Link>}>Audit Countdown</Header>}>
      <SpaceBetween size="s">
        <div style={{ textAlign: 'center' }}>
          <Box variant="h1" fontSize="display-l" color={daysLeft <= 14 ? 'text-status-error' : daysLeft <= 30 ? 'text-status-warning' : 'text-status-success'}>
            {daysLeft}
          </Box>
          <Box variant="small" color="text-body-secondary">days until {next.title}</Box>
        </div>
        <ProgressBar
          value={Math.max(0, 100 - Math.round((daysLeft / 90) * 100))}
          status={daysLeft <= 14 ? 'error' : daysLeft <= 30 ? 'in-progress' : 'success'}
          additionalInfo={(next as any).frameworks?.name || ''}
        />
        {upcoming.length > 1 && (
          <Box variant="small" color="text-body-secondary">{upcoming.length - 1} more upcoming</Box>
        )}
      </SpaceBetween>
    </Container>
  );
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function EmptyDashboard({ onSeed, seeding }: { onSeed: () => void; seeding: boolean }) {
  return (
    <Box textAlign="center" padding="xxxl">
      <SpaceBetween size="l" alignItems="center" direction="vertical">
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: awsui.colorBackgroundControlChecked,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto',
        }}>
          <Icon name="security" size="large" variant="inverted" />
        </div>
        <SpaceBetween size="xs" alignItems="center" direction="vertical">
          <Box variant="h2">Welcome to Stakflo</Box>
          <Box variant="p" color="text-body-secondary" fontSize="body-m">
            Your compliance program is ready to set up. Load demo data to see the platform in action,
            or start by adding your frameworks and controls.
          </Box>
        </SpaceBetween>
        <SpaceBetween direction="horizontal" size="m">
          <Button variant="primary" loading={seeding} onClick={onSeed} iconName="add-plus">Load Demo Data</Button>
          <Button iconName="external" href="https://cloudscape.design" target="_blank">View Documentation</Button>
        </SpaceBetween>
        <ColumnLayout columns={3} variant="text-grid">
          <Container>
            <SpaceBetween size="xs" alignItems="center" direction="vertical">
              <Icon name="list-view" size="big" variant="link" />
              <Box variant="h4">Controls</Box>
              <Box variant="small" color="text-body-secondary" textAlign="center">Track compliance controls across SOC 2, ISO 27001, HIPAA, and GDPR</Box>
            </SpaceBetween>
          </Container>
          <Container>
            <SpaceBetween size="xs" alignItems="center" direction="vertical">
              <Icon name="gen-ai" size="big" variant="link" />
              <Box variant="h4">AI-Powered</Box>
              <Box variant="small" color="text-body-secondary" textAlign="center">Generate remediation plans, policy drafts, and gap analyses automatically</Box>
            </SpaceBetween>
          </Container>
          <Container>
            <SpaceBetween size="xs" alignItems="center" direction="vertical">
              <Icon name="status-positive" size="big" variant="link" />
              <Box variant="h4">Always Audit-Ready</Box>
              <Box variant="small" color="text-body-secondary" textAlign="center">Real-time compliance monitoring with evidence tracking and audit trails</Box>
            </SpaceBetween>
          </Container>
        </ColumnLayout>
      </SpaceBetween>
    </Box>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const [controls, setControls] = useState<Control[]>([]);
  const [frameworks, setFrameworks] = useState<Framework[]>([]);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [snapshots, setSnapshots] = useState<ComplianceSnapshot[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [showBoardReport, setShowBoardReport] = useState(false);
  const [boardReport, setBoardReport] = useState<string | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [allEvidence, setAllEvidence] = useState<{ control_id: string }[]>([]);

  const { sendMessage, clearMessages } = useAI({
    systemPrompt: `You are Stakflo AI, an expert at writing executive-level compliance board reports. Write clear, concise reports suitable for C-suite and board presentations. Use data-driven insights, highlight risks, and provide strategic recommendations. Format with clear sections and bullet points.`,
  });

  const controlsWithEvidence = useMemo(() => new Set(allEvidence.map(e => e.control_id)), [allEvidence]);

  const loadData = useCallback(async () => {
    const [cRes, fRes, eRes, aRes, sRes, iRes] = await Promise.all([
      supabase.from('controls').select('*'),
      supabase.from('frameworks').select('*'),
      supabase.from('evidence').select('*, controls(title, control_ref)').order('uploaded_at', { ascending: false }).limit(8),
      supabase.from('audits').select('*, frameworks(name)'),
      supabase.from('compliance_snapshots').select('*').order('snapshot_date', { ascending: true }).limit(30),
      supabase.from('integrations').select('*'),
    ]);
    setControls(cRes.data || []);
    setFrameworks(fRes.data || []);
    setEvidence(eRes.data || []);
    setAudits(aRes.data || []);
    setSnapshots(sRes.data || []);
    setIntegrations(iRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!loading && controls.length > 0) {
      supabase.from('evidence').select('control_id').eq('status', 'approved').then(({ data }) => {
        setAllEvidence(data || []);
      });
    }
  }, [loading, controls.length]);

  useEffect(() => {
    if (loading || !user || controls.length === 0) return;
    const today = new Date().toISOString().split('T')[0];
    const hasToday = snapshots.some(s => s.snapshot_date === today);
    if (!hasToday) {
      const total = controls.length;
      const passing = controls.filter(c => c.status === 'passing').length;
      const failing = controls.filter(c => c.status === 'failing').length;
      const notAss = controls.filter(c => c.status === 'not_assessed').length;
      const score = total > 0 ? Math.round((passing / total) * 100) : 0;
      const fwScores: Record<string, number> = {};
      frameworks.forEach(fw => {
        const fwC = controls.filter(c => c.framework_id === fw.id);
        const fwP = fwC.filter(c => c.status === 'passing').length;
        fwScores[fw.name] = fwC.length > 0 ? Math.round((fwP / fwC.length) * 100) : 0;
      });
      supabase.from('compliance_snapshots').upsert({
        user_id: user.id,
        snapshot_date: today,
        total_controls: total,
        passing_controls: passing,
        failing_controls: failing,
        not_assessed_controls: notAss,
        compliance_score: score,
        framework_scores: fwScores,
      }, { onConflict: 'user_id,snapshot_date' }).then(() => {});
    }
  }, [loading, user, controls, frameworks, snapshots]);

  const handleSeedData = async () => {
    if (!user) return;
    setSeeding(true);
    const { error } = await supabase.rpc('seed_user_data', { p_user_id: user.id });
    if (error) {
      addNotification('error', 'Failed to load demo data: ' + error.message);
    } else {
      addNotification('success', 'Demo data loaded! Your compliance program is ready.');
      await loadData();
    }
    setSeeding(false);
  };

  if (loading) {
    return <Box textAlign="center" padding="xxl"><Spinner size="large" /></Box>;
  }

  if (frameworks.length === 0) {
    return <EmptyDashboard onSeed={handleSeedData} seeding={seeding} />;
  }

  const totalControls = controls.length;
  const passingControls = controls.filter(c => c.status === 'passing').length;
  const failingControls = controls.filter(c => c.status === 'failing').length;
  const notAssessed = controls.filter(c => c.status === 'not_assessed').length;
  const complianceScore = totalControls > 0 ? Math.round((passingControls / totalControls) * 100) : 0;
  const highRiskControls = controls.filter(c => (c.risk_level === 'critical' || c.risk_level === 'high') && c.status !== 'passing');
  const activeAudits = audits.filter(a => a.status === 'in_progress');
  const criticalFailing = controls.filter(c => c.status === 'failing' && c.risk_level === 'critical');
  const evidenceCoverage = totalControls > 0 ? Math.round((controlsWithEvidence.size / totalControls) * 100) : 0;

  const criticalAlerts: { type: 'error' | 'warning' | 'info'; text: string }[] = [];
  if (criticalFailing.length > 0) {
    criticalAlerts.push({ type: 'error', text: `${criticalFailing.length} critical control${criticalFailing.length > 1 ? 's' : ''} failing: ${criticalFailing.map(c => c.control_ref).join(', ')}` });
  }
  if (activeAudits.length > 0) {
    criticalAlerts.push({ type: 'warning', text: `${activeAudits.length} audit${activeAudits.length > 1 ? 's' : ''} in progress` });
  }
  if (notAssessed > 3) {
    criticalAlerts.push({ type: 'info', text: `${notAssessed} controls have never been assessed` });
  }

  const statusData = [
    { title: 'Passing', value: passingControls },
    { title: 'Failing', value: failingControls },
    { title: 'Not Assessed', value: notAssessed },
  ].filter(d => d.value > 0);

  const trendData = snapshots.length > 1
    ? snapshots.map(s => ({ x: new Date(s.snapshot_date), y: Number(s.compliance_score) }))
    : generateMockTrend(complianceScore);

  const riskBreakdownData = [
    { x: 'Critical', y: controls.filter(c => c.risk_level === 'critical' && c.status === 'failing').length },
    { x: 'High', y: controls.filter(c => c.risk_level === 'high' && c.status === 'failing').length },
    { x: 'Medium', y: controls.filter(c => c.risk_level === 'medium' && c.status === 'failing').length },
    { x: 'Low', y: controls.filter(c => c.risk_level === 'low' && c.status === 'failing').length },
  ];

  const generateBoardReport = async () => {
    setGeneratingReport(true);
    setBoardReport(null);
    clearMessages();
    const fwBreakdown = frameworks.map(fw => {
      const fwC = controls.filter(c => c.framework_id === fw.id);
      const p = fwC.filter(c => c.status === 'passing').length;
      return `${fw.name}: ${fwC.length > 0 ? Math.round((p / fwC.length) * 100) : 0}% (${p}/${fwC.length} controls)`;
    }).join('\n');
    try {
      const result = await sendMessage(
        `Generate an executive board report for our compliance program. Use this real data:\n\nDate: ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}\nOverall Compliance Score: ${complianceScore}%\nTotal Controls: ${totalControls} (${passingControls} passing, ${failingControls} failing, ${notAssessed} not assessed)\nCritical Failing Controls: ${criticalFailing.length}\nActive Audits: ${activeAudits.length}\nEvidence Coverage: ${evidenceCoverage}%\nConnected Integrations: ${integrations.filter(i => i.status === 'connected').length}\n\nFramework Coverage:\n${fwBreakdown}\n\nWrite a professional board report with: Executive Summary, Compliance Scorecard, Critical Risk Items, Framework Progress, Audit Status, Strategic Recommendations, and 90-Day Outlook.`
      );
      setBoardReport(result);
      setShowBoardReport(true);
    } catch {
      setBoardReport('Failed to generate board report. Please ensure the OpenRouter API key is configured.');
      setShowBoardReport(true);
    } finally {
      setGeneratingReport(false);
    }
  };

  return (
    <SpaceBetween size="l">
      <Header
        variant="h1"
        description="Real-time compliance posture and audit readiness"
        actions={
          <SpaceBetween direction="horizontal" size="xs">
            <Badge color="green">Live</Badge>
            <Button iconName="gen-ai" loading={generatingReport} onClick={generateBoardReport}>Board Report</Button>
          </SpaceBetween>
        }
      >
        Compliance Dashboard
      </Header>

      {criticalAlerts.length > 0 && (
        <SpaceBetween size="xs">
          {criticalAlerts.map((alert, i) => (
            <Alert key={i} type={alert.type} action={<Button variant="inline-link" onClick={() => navigate(alert.type === 'error' ? '/remediation' : alert.type === 'warning' ? '/audits' : '/controls')}>View</Button>}>
              {alert.text}
            </Alert>
          ))}
        </SpaceBetween>
      )}

      <GettingStartedChecklist navigate={navigate} />

      <ColumnLayout columns={5} variant="text-grid">
        <KpiCard title="Total Controls" value={totalControls} icon="list-view" variant="normal" description={`across ${frameworks.length} frameworks`} />
        <KpiCard title="Passing" value={passingControls} icon="status-positive" variant="success" description={`${complianceScore}% compliance rate`} />
        <KpiCard title="Failing" value={failingControls} icon="status-negative" variant="error" description={`${criticalFailing.length} critical`} />
        <KpiCard
          title="Compliance Score"
          value={`${complianceScore}%`}
          icon="security"
          variant={complianceScore >= 80 ? 'success' : complianceScore >= 50 ? 'warning' : 'error'}
          description={complianceScore >= 80 ? 'Audit-ready' : complianceScore >= 50 ? 'Needs improvement' : 'Critical attention required'}
        />
        <KpiCard
          title="Evidence Coverage"
          value={`${evidenceCoverage}%`}
          icon="file-open"
          variant={evidenceCoverage >= 80 ? 'success' : evidenceCoverage >= 50 ? 'warning' : 'error'}
          description={`${controlsWithEvidence.size} of ${totalControls} controls covered`}
        />
      </ColumnLayout>

      <Grid gridDefinition={[{ colspan: { default: 12, s: 7 } }, { colspan: { default: 12, s: 5 } }]}>
        <Container header={<Header variant="h2">Compliance Score Trend <Badge color={trendData.length > 1 ? 'green' : 'grey'}>{snapshots.length > 1 ? 'Real data' : 'Demo trend'}</Badge></Header>}>
          <LineChart
            series={[
              { title: 'Compliance Score', type: 'line', data: trendData, valueFormatter: y => `${y}%` },
              { title: 'Target (80%)', type: 'threshold', y: 80 },
            ]}
            xScaleType="time"
            yDomain={[0, 100]}
            yTitle="Score (%)"
            height={220}
            ariaLabel="Compliance score trend"
            i18nStrings={{ filterLabel: 'Filter', filterPlaceholder: 'Filter', legendAriaLabel: 'Legend', chartAriaRoleDescription: 'line chart', xAxisAriaRoleDescription: 'x axis', yAxisAriaRoleDescription: 'y axis' }}
            empty={<Box textAlign="center" color="inherit">No trend data yet</Box>}
          />
        </Container>

        <Container header={<Header variant="h2">Control Status</Header>}>
          <PieChart
            data={statusData}
            detailPopoverContent={datum => [{ key: 'Count', value: `${datum.value}` }, { key: 'Percentage', value: `${totalControls > 0 ? Math.round((datum.value / totalControls) * 100) : 0}%` }]}
            segmentDescription={(datum, sum) => `${datum.value} controls, ${Math.round((datum.value / sum) * 100)}%`}
            ariaLabel="Control status distribution"
            ariaDescription="Pie chart showing passing, failing, and not assessed controls"
            innerMetricDescription="controls"
            innerMetricValue={`${totalControls}`}
            variant="donut"
            size="medium"
            hideFilter
            i18nStrings={{ detailsValue: 'Value', detailsPercentage: 'Percentage', filterLabel: 'Filter', filterPlaceholder: 'Filter', filterSelectedAriaLabel: 'selected', detailPopoverDismissAriaLabel: 'Dismiss', legendAriaLabel: 'Legend', chartAriaRoleDescription: 'pie chart', segmentAriaRoleDescription: 'segment' }}
            empty={<Box textAlign="center" color="inherit">No data available</Box>}
          />
        </Container>
      </Grid>

      <Grid gridDefinition={[{ colspan: { default: 12, s: 6 } }, { colspan: { default: 12, s: 6 } }]}>
        <Container header={<Header variant="h2">Failing Controls by Risk</Header>}>
          <BarChart
            series={[{ title: 'Failing Controls', type: 'bar', data: riskBreakdownData }]}
            xScaleType="categorical"
            yTitle="Count"
            height={180}
            ariaLabel="Failing controls by risk level"
            i18nStrings={{ filterLabel: 'Filter', filterPlaceholder: 'Filter', legendAriaLabel: 'Legend', chartAriaRoleDescription: 'bar chart', xAxisAriaRoleDescription: 'x axis', yAxisAriaRoleDescription: 'y axis' }}
            empty={<Box textAlign="center" color="inherit">No failing controls</Box>}
          />
        </Container>

        <RiskHeatmap controls={controls} />
      </Grid>

      <Grid gridDefinition={[{ colspan: { default: 12, s: 4 } }, { colspan: { default: 12, s: 4 } }, { colspan: { default: 12, s: 4 } }]}>
        <IntegrationHealthStrip integrations={integrations} />
        <AuditCountdown audits={audits} />
        <ActivityFeed controls={controls} evidence={evidence} />
      </Grid>

      <ColumnLayout columns={2}>
        <Container header={<Header variant="h2" actions={<Link onFollow={() => navigate('/frameworks')}>View all</Link>}>Framework Coverage</Header>}>
          <SpaceBetween size="m">
            {frameworks.map(fw => {
              const fwControls = controls.filter(c => c.framework_id === fw.id);
              const passing = fwControls.filter(c => c.status === 'passing').length;
              const total = fwControls.length;
              const pct = total > 0 ? Math.round((passing / total) * 100) : 0;
              return (
                <SpaceBetween key={fw.id} size="xxs">
                  <SpaceBetween direction="horizontal" size="xs" alignItems="center">
                    <Box variant="h4">{fw.name}</Box>
                    <Box variant="small" color="text-body-secondary">{passing}/{total} controls</Box>
                    <Badge color={pct >= 80 ? 'green' : pct >= 50 ? 'blue' : 'red'}>{pct}%</Badge>
                  </SpaceBetween>
                  <ProgressBar
                    value={pct}
                    additionalInfo={`${pct}% coverage`}
                    status={pct >= 80 ? 'success' : pct >= 50 ? 'in-progress' : 'error'}
                  />
                </SpaceBetween>
              );
            })}
          </SpaceBetween>
        </Container>

        <SpaceBetween size="l">
          <Container header={<Header variant="h2" actions={<Link onFollow={() => navigate('/remediation')}>Fix issues</Link>}>High Risk Controls</Header>}>
            {highRiskControls.length === 0 ? (
              <Box textAlign="center" padding="s"><StatusIndicator type="success">No high-risk controls failing</StatusIndicator></Box>
            ) : (
              <Table
                variant="borderless"
                columnDefinitions={[
                  { id: 'ref', header: 'Ref', cell: item => <Box fontWeight="bold">{item.control_ref}</Box>, width: 100 },
                  { id: 'title', header: 'Title', cell: item => item.title },
                  { id: 'risk', header: 'Risk', cell: item => <StatusIndicator type={item.risk_level === 'critical' ? 'error' : 'warning'}>{item.risk_level}</StatusIndicator>, width: 110 },
                  { id: 'status', header: 'Status', cell: item => <StatusIndicator type={item.status === 'failing' ? 'error' : 'pending'}>{item.status.replace('_', ' ')}</StatusIndicator>, width: 130 },
                ]}
                items={highRiskControls.slice(0, 5)}
                trackBy="id"
              />
            )}
          </Container>

          {activeAudits.length > 0 && (
            <Container header={<Header variant="h2" actions={<Link onFollow={() => navigate('/audits')}>View all</Link>}>Active Audits</Header>}>
              <SpaceBetween size="s">
                {activeAudits.map(audit => (
                  <SpaceBetween key={audit.id} direction="horizontal" size="s" alignItems="center">
                    <StatusIndicator type="in-progress">{audit.title}</StatusIndicator>
                    <Box variant="small" color="text-body-secondary">{(audit as any).frameworks?.name}</Box>
                  </SpaceBetween>
                ))}
              </SpaceBetween>
            </Container>
          )}
        </SpaceBetween>
      </ColumnLayout>

      <Container header={<Header variant="h2" actions={<Link onFollow={() => navigate('/evidence')}>View all</Link>}>Recent Evidence</Header>}>
        <Table
          variant="borderless"
          columnDefinitions={[
            { id: 'title', header: 'Evidence', cell: item => item.title, isRowHeader: true },
            { id: 'control', header: 'Control', cell: item => (item as any).controls ? `${(item as any).controls.control_ref} - ${(item as any).controls.title}` : '-' },
            { id: 'status', header: 'Status', cell: item => <StatusIndicator type={item.status === 'approved' ? 'success' : item.status === 'rejected' ? 'error' : 'pending'}>{item.status}</StatusIndicator>, width: 130 },
            { id: 'date', header: 'Uploaded', cell: item => new Date(item.uploaded_at).toLocaleDateString(), width: 120 },
          ]}
          items={evidence}
          trackBy="id"
          empty={<Box textAlign="center" padding="m" color="text-body-secondary">No recent evidence</Box>}
        />
      </Container>

      <Modal visible={showBoardReport} onDismiss={() => setShowBoardReport(false)} header="Board Compliance Report" size="max">
        {boardReport && (
          <SpaceBetween size="m">
            <SpaceBetween direction="horizontal" size="xs">
              <Badge color="blue">AI Generated</Badge>
              <Box variant="small" color="text-body-secondary">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</Box>
            </SpaceBetween>
            <ChatBubble type="incoming" ariaLabel="Board report" avatar={<Avatar color="gen-ai" iconName="gen-ai" ariaLabel="Stakflo AI" />}>
              <MarkdownContent content={boardReport} />
            </ChatBubble>
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="primary" onClick={() => { navigator.clipboard.writeText(boardReport); addNotification('success', 'Report copied to clipboard'); }}>Copy Report</Button>
              <Button onClick={() => setShowBoardReport(false)}>Close</Button>
            </SpaceBetween>
          </SpaceBetween>
        )}
      </Modal>
    </SpaceBetween>
  );
}

function generateMockTrend(currentScore: number) {
  const data = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const base = Math.max(30, currentScore - 15 + Math.floor(i * 0.5));
    const noise = Math.floor(Math.random() * 6) - 3;
    data.push({ x: date, y: Math.min(100, Math.max(0, base + noise)) });
  }
  return data;
}

import { useEffect, useState } from 'react';
import MarkdownContent from '../components/MarkdownContent';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import Cards from '@cloudscape-design/components/cards';
import ColumnLayout from '@cloudscape-design/components/column-layout';
import Container from '@cloudscape-design/components/container';
import Header from '@cloudscape-design/components/header';
import Icon from '@cloudscape-design/components/icon';
import ProgressBar from '@cloudscape-design/components/progress-bar';
import SpaceBetween from '@cloudscape-design/components/space-between';
import StatusIndicator from '@cloudscape-design/components/status-indicator';
import Spinner from '@cloudscape-design/components/spinner';
import Table from '@cloudscape-design/components/table';
import Tabs from '@cloudscape-design/components/tabs';
import Badge from '@cloudscape-design/components/badge';
import KeyValuePairs from '@cloudscape-design/components/key-value-pairs';
import Avatar from '@cloudscape-design/chat-components/avatar';
import ChatBubble from '@cloudscape-design/chat-components/chat-bubble';
import { supabase } from '../lib/supabase';
import { useAI } from '../lib/useAI';
import { useNotifications } from '../contexts/NotificationContext';
import type { Control, Framework, Policy, Audit, Evidence } from '../lib/types';

const RISK_COLORS: Record<string, 'red' | 'blue' | 'grey' | 'green'> = {
  critical: 'red', high: 'red', medium: 'blue', low: 'green',
};

export default function FrameworksPage() {
  const { addNotification } = useNotifications();
  const [frameworks, setFrameworks] = useState<Framework[]>([]);
  const [controls, setControls] = useState<Control[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFw, setSelectedFw] = useState<Framework | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const { sendMessage, clearMessages } = useAI({
    systemPrompt: `You are Stakflo AI, a compliance framework expert. You analyze framework coverage, identify gaps, and provide actionable recommendations to improve compliance posture. Be specific with control references and practical steps.`,
  });

  useEffect(() => {
    async function load() {
      const [fRes, cRes, pRes, aRes, eRes] = await Promise.all([
        supabase.from('frameworks').select('*').order('name'),
        supabase.from('controls').select('*, frameworks(name)'),
        supabase.from('policies').select('*'),
        supabase.from('audits').select('*, frameworks(name)'),
        supabase.from('evidence').select('*, controls(framework_id)'),
      ]);
      setFrameworks(fRes.data || []);
      setControls(cRes.data || []);
      setPolicies(pRes.data || []);
      setAudits(aRes.data || []);
      setEvidence(eRes.data || []);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <Box textAlign="center" padding="xxl"><Spinner size="large" /></Box>;

  const getStats = (fwId: string) => {
    const fwControls = controls.filter(c => c.framework_id === fwId);
    const passing = fwControls.filter(c => c.status === 'passing').length;
    const failing = fwControls.filter(c => c.status === 'failing').length;
    const notAssessed = fwControls.filter(c => c.status === 'not_assessed').length;
    const total = fwControls.length;
    const pct = total > 0 ? Math.round((passing / total) * 100) : 0;
    const fwPolicies = policies.filter(p => p.framework_id === fwId);
    const fwAudits = audits.filter(a => a.framework_id === fwId);
    const fwEvidence = evidence.filter(e => (e as any).controls?.framework_id === fwId);
    return { passing, failing, notAssessed, total, pct, fwPolicies, fwAudits, fwEvidence, fwControls };
  };

  const analyzeFramework = async (fw: Framework) => {
    setAnalyzing(true);
    setAiAnalysis(null);
    clearMessages();
    const stats = getStats(fw.id);
    try {
      const failingList = stats.fwControls
        .filter(c => c.status !== 'passing')
        .map(c => `${c.control_ref}: ${c.title} (${c.risk_level}, ${c.status})`)
        .join('\n');

      const result = await sendMessage(
        `Analyze the compliance posture for our ${fw.name} framework implementation:\n\nCoverage: ${stats.pct}% (${stats.passing}/${stats.total} controls passing)\nFailing: ${stats.failing} controls\nNot Assessed: ${stats.notAssessed} controls\nPublished Policies: ${stats.fwPolicies.filter(p => p.status === 'published').length}\nAudits: ${stats.fwAudits.length} (${stats.fwAudits.filter(a => a.status === 'completed').length} completed)\nEvidence Items: ${stats.fwEvidence.length}\n\nNon-passing controls:\n${failingList || 'None'}\n\nProvide:\n1. Gap analysis summary\n2. Priority remediation recommendations (top 3-5)\n3. Policy gaps\n4. Evidence collection recommendations\n5. Estimated timeline to reach 80% coverage\n6. Cross-framework synergies with other common frameworks`
      );
      setAiAnalysis(result);
    } catch {
      setAiAnalysis('Failed to analyze framework. Please check that the OpenRouter API key is configured.');
    } finally {
      setAnalyzing(false);
    }
  };

  if (selectedFw) {
    const stats = getStats(selectedFw.id);
    return (
      <SpaceBetween size="l">
        <Header
          variant="h1"
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Button iconName="gen-ai" loading={analyzing} onClick={() => analyzeFramework(selectedFw)}>AI Gap Analysis</Button>
              <Button variant="link" iconName="arrow-left" onClick={() => { setSelectedFw(null); setAiAnalysis(null); }}>Back to frameworks</Button>
            </SpaceBetween>
          }
          description={selectedFw.description}
        >
          <SpaceBetween direction="horizontal" size="xs" alignItems="center">
            <Icon name={(selectedFw.icon || 'security') as any} />
            <span>{selectedFw.name}</span>
          </SpaceBetween>
        </Header>

        <ColumnLayout columns={4} variant="text-grid">
          <Container>
            <SpaceBetween size="xxs">
              <Box variant="awsui-key-label">Coverage</Box>
              <Box variant="h1" fontSize="display-l" color={stats.pct >= 80 ? 'text-status-success' : 'text-status-warning'}>{stats.pct}%</Box>
            </SpaceBetween>
          </Container>
          <Container>
            <SpaceBetween size="xxs">
              <Box variant="awsui-key-label">Controls</Box>
              <Box variant="h1" fontSize="display-l">{stats.total}</Box>
            </SpaceBetween>
          </Container>
          <Container>
            <SpaceBetween size="xxs">
              <Box variant="awsui-key-label">Policies</Box>
              <Box variant="h1" fontSize="display-l">{stats.fwPolicies.length}</Box>
            </SpaceBetween>
          </Container>
          <Container>
            <SpaceBetween size="xxs">
              <Box variant="awsui-key-label">Evidence</Box>
              <Box variant="h1" fontSize="display-l">{stats.fwEvidence.length}</Box>
            </SpaceBetween>
          </Container>
        </ColumnLayout>

        {aiAnalysis && (
          <Container header={<Header variant="h2" actions={<Badge color="blue">AI Generated</Badge>}>AI Gap Analysis: {selectedFw.name}</Header>}>
            <ChatBubble type="incoming" ariaLabel="AI framework analysis" avatar={<Avatar color="gen-ai" iconName="gen-ai" ariaLabel="Stakflo AI" />}>
              <MarkdownContent content={aiAnalysis} />
            </ChatBubble>
          </Container>
        )}

        <Tabs tabs={[
          {
            id: 'controls',
            label: `Controls (${stats.total})`,
            content: (
              <Table
                variant="full-page"
                stickyHeader
                header={<Header variant="h2" counter={`(${stats.total})`}>Controls</Header>}
                columnDefinitions={[
                  { id: 'ref', header: 'Ref', cell: item => <Box fontWeight="bold">{item.control_ref}</Box>, width: 120, isRowHeader: true },
                  { id: 'title', header: 'Title', cell: item => item.title },
                  {
                    id: 'status', header: 'Status', width: 140,
                    cell: item => (
                      <StatusIndicator type={item.status === 'passing' ? 'success' : item.status === 'failing' ? 'error' : 'pending'}>
                        {item.status === 'not_assessed' ? 'Not Assessed' : item.status === 'passing' ? 'Passing' : 'Failing'}
                      </StatusIndicator>
                    ),
                  },
                  {
                    id: 'risk', header: 'Risk', width: 110,
                    cell: item => <Badge color={RISK_COLORS[item.risk_level] || 'grey'}>{item.risk_level}</Badge>,
                  },
                  { id: 'owner', header: 'Owner', cell: item => item.owner || '-', width: 140 },
                ]}
                items={stats.fwControls}
                trackBy="id"
                empty={<Box textAlign="center" padding="l">No controls for this framework.</Box>}
              />
            ),
          },
          {
            id: 'policies',
            label: `Policies (${stats.fwPolicies.length})`,
            content: (
              <Table
                header={<Header variant="h2">Policies</Header>}
                columnDefinitions={[
                  { id: 'title', header: 'Title', cell: item => item.title, isRowHeader: true },
                  { id: 'version', header: 'Version', cell: item => <Badge>{`v${item.version}`}</Badge>, width: 100 },
                  {
                    id: 'status', header: 'Status', width: 140,
                    cell: item => {
                      const typeMap: Record<string, 'success' | 'in-progress' | 'pending' | 'stopped'> = {
                        published: 'success', in_review: 'in-progress', draft: 'pending', archived: 'stopped',
                      };
                      return <StatusIndicator type={typeMap[item.status] || 'pending'}>{item.status.replace('_', ' ')}</StatusIndicator>;
                    },
                  },
                  {
                    id: 'reviewed', header: 'Last Reviewed', width: 140,
                    cell: item => item.last_reviewed_at ? new Date(item.last_reviewed_at).toLocaleDateString() : 'Never',
                  },
                ]}
                items={stats.fwPolicies}
                trackBy="id"
                empty={<Box textAlign="center" padding="l">No policies linked to this framework.</Box>}
              />
            ),
          },
          {
            id: 'audits',
            label: `Audits (${stats.fwAudits.length})`,
            content: (
              <Table
                header={<Header variant="h2">Audits</Header>}
                columnDefinitions={[
                  { id: 'title', header: 'Title', cell: item => item.title, isRowHeader: true },
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
                  { id: 'notes', header: 'Notes', cell: item => item.notes || '-' },
                ]}
                items={stats.fwAudits}
                trackBy="id"
                empty={<Box textAlign="center" padding="l">No audits for this framework.</Box>}
              />
            ),
          },
        ]} />
      </SpaceBetween>
    );
  }

  return (
    <SpaceBetween size="l">
      <Header variant="h1" description="Manage compliance frameworks and drill into coverage details" counter={`(${frameworks.length})`}>
        Frameworks
      </Header>
      <Cards
        cardDefinition={{
          header: item => (
            <Button variant="inline-link" onClick={() => setSelectedFw(item)}>
              <SpaceBetween direction="horizontal" size="xs" alignItems="center">
                <Icon name={(item.icon || 'security') as any} />
                <Box variant="h3">{item.name}</Box>
              </SpaceBetween>
            </Button>
          ),
          sections: [
            {
              id: 'description',
              content: item => <Box variant="p" color="text-body-secondary">{item.description}</Box>,
            },
            {
              id: 'progress',
              header: 'Coverage',
              content: item => {
                const stats = getStats(item.id);
                return (
                  <SpaceBetween size="s">
                    <ProgressBar
                      value={stats.pct}
                      additionalInfo={`${stats.passing} of ${stats.total} controls passing`}
                      status={stats.pct >= 80 ? 'success' : stats.pct >= 50 ? 'in-progress' : 'error'}
                    />
                    <SpaceBetween direction="horizontal" size="m">
                      <StatusIndicator type="success">{stats.passing} passing</StatusIndicator>
                      <StatusIndicator type="error">{stats.failing} failing</StatusIndicator>
                      <StatusIndicator type="pending">{stats.notAssessed} not assessed</StatusIndicator>
                    </SpaceBetween>
                  </SpaceBetween>
                );
              },
            },
            {
              id: 'details',
              content: item => {
                const stats = getStats(item.id);
                return (
                  <SpaceBetween direction="horizontal" size="m">
                    <Box variant="small">{stats.fwPolicies.length} policies</Box>
                    <Box variant="small">{stats.fwAudits.length} audits</Box>
                    <Box variant="small">{stats.fwEvidence.length} evidence items</Box>
                  </SpaceBetween>
                );
              },
            },
          ],
        }}
        items={frameworks}
        trackBy="id"
        empty={
          <Box textAlign="center" color="inherit" padding="xxl">
            <b>No frameworks</b>
            <Box padding={{ bottom: 's' }} variant="p" color="inherit">No frameworks to display.</Box>
          </Box>
        }
      />
    </SpaceBetween>
  );
}

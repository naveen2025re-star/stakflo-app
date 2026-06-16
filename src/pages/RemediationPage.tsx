import { useEffect, useState } from 'react';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import Header from '@cloudscape-design/components/header';
import SpaceBetween from '@cloudscape-design/components/space-between';
import StatusIndicator from '@cloudscape-design/components/status-indicator';
import Table from '@cloudscape-design/components/table';
import TextFilter from '@cloudscape-design/components/text-filter';
import Pagination from '@cloudscape-design/components/pagination';
import CollectionPreferences from '@cloudscape-design/components/collection-preferences';
import Spinner from '@cloudscape-design/components/spinner';
import Modal from '@cloudscape-design/components/modal';
import Container from '@cloudscape-design/components/container';
import Badge from '@cloudscape-design/components/badge';
import ColumnLayout from '@cloudscape-design/components/column-layout';
import ProgressBar from '@cloudscape-design/components/progress-bar';
import Avatar from '@cloudscape-design/chat-components/avatar';
import ChatBubble from '@cloudscape-design/chat-components/chat-bubble';
import { useCollection } from '@cloudscape-design/collection-hooks';
import { supabase } from '../lib/supabase';
import { useNotifications } from '../contexts/NotificationContext';
import { useAI, buildComplianceSystemPrompt } from '../lib/useAI';
import type { Control, Framework, RemediationPlan } from '../lib/types';

const RISK_COLORS: Record<string, 'red' | 'blue' | 'grey' | 'green'> = {
  critical: 'red',
  high: 'red',
  medium: 'blue',
  low: 'green',
};

export default function RemediationPage() {
  const { addNotification } = useNotifications();
  const [controls, setControls] = useState<Control[]>([]);
  const [frameworks, setFrameworks] = useState<Framework[]>([]);
  const [plans, setPlans] = useState<RemediationPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<RemediationPlan | null>(null);
  const [preferences, setPreferences] = useState({ pageSize: 10, wrapLines: false, stripedRows: true });

  const loadData = async () => {
    const [cRes, fRes, pRes] = await Promise.all([
      supabase.from('controls').select('*, frameworks(name)').order('control_ref'),
      supabase.from('frameworks').select('*'),
      supabase.from('remediation_plans').select('*, controls(control_ref, title, risk_level, status, frameworks(name))').order('created_at', { ascending: false }),
    ]);
    setControls(cRes.data || []);
    setFrameworks(fRes.data || []);
    setPlans(pRes.data || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const failingControls = controls.filter(c => c.status !== 'passing');
  const criticalCount = failingControls.filter(c => c.risk_level === 'critical').length;
  const highCount = failingControls.filter(c => c.risk_level === 'high').length;

  const { items, collectionProps, filterProps, paginationProps, filteredItemsCount } = useCollection(failingControls, {
    filtering: {
      empty: <Box textAlign="center" color="inherit" padding="xxl"><b>All controls passing</b><Box variant="p" color="inherit">Great work! No controls need remediation.</Box></Box>,
      noMatch: <Box textAlign="center" color="inherit" padding="xxl"><b>No matches</b></Box>,
    },
    pagination: { pageSize: preferences.pageSize },
    sorting: { defaultState: { sortingColumn: { sortingField: 'risk_level' }, isDescending: true } },
  });

  const complianceContext = {
    totalControls: controls.length,
    passingControls: controls.filter(c => c.status === 'passing').length,
    failingControls: controls.filter(c => c.status === 'failing').length,
    complianceScore: controls.length > 0 ? Math.round((controls.filter(c => c.status === 'passing').length / controls.length) * 100) : 0,
    frameworks: frameworks.map(f => f.name),
    failingControlsList: failingControls.map(c => `${c.control_ref}: ${c.title} (${c.risk_level})`),
  };

  const { sendMessage } = useAI({
    systemPrompt: buildComplianceSystemPrompt(complianceContext),
  });

  const generatePlan = async (control: Control) => {
    setGenerating(control.id);
    try {
      const prompt = `Generate a detailed remediation plan for the following failing compliance control:\n\nControl Reference: ${control.control_ref}\nTitle: ${control.title}\nDescription: ${control.description || 'No description provided'}\nRisk Level: ${control.risk_level}\nFramework: ${(control as any).frameworks?.name || 'Unknown'}\nCurrent Status: ${control.status}\n\nProvide a structured remediation plan with 3-5 specific, actionable steps. For each step, include:\n1. A clear title\n2. A detailed description of what needs to be done\n3. The type of evidence that would prove completion\n\nFormat your response as JSON with this structure:\n{\n  "title": "Remediation plan title",\n  "priority": "high|medium|low",\n  "steps": [\n    {"step": 1, "title": "Step title", "description": "Step description", "completed": false}\n  ]\n}\n\nReturn ONLY the JSON, no other text.`;

      const response = await sendMessage(prompt);

      let planData;
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        planData = JSON.parse(jsonMatch ? jsonMatch[0] : response);
      } catch {
        planData = {
          title: `Remediation: ${control.control_ref}`,
          priority: control.risk_level === 'critical' ? 'high' : control.risk_level === 'high' ? 'high' : 'medium',
          steps: [{ step: 1, title: 'Review control requirements', description: response.slice(0, 500), completed: false }],
        };
      }

      const { error } = await supabase.from('remediation_plans').insert({
        control_id: control.id,
        title: planData.title,
        ai_generated: true,
        steps: planData.steps,
        priority: planData.priority,
        status: 'draft',
      });

      if (error) {
        addNotification('error', error.message);
      } else {
        addNotification('success', `Remediation plan generated for ${control.control_ref}`);
        loadData();
      }
    } catch (err) {
      addNotification('error', 'Failed to generate remediation plan. Check that OpenRouter API key is configured.');
    } finally {
      setGenerating(null);
    }
  };

  if (loading) return <Box textAlign="center" padding="xxl"><Spinner size="large" /></Box>;

  return (
    <SpaceBetween size="l">
      <Header variant="h1" description="AI-powered remediation planning for failing and unassessed controls">
        Risk-to-Remediation Engine
      </Header>

      <ColumnLayout columns={3} variant="text-grid">
        <Container>
          <SpaceBetween size="xxs">
            <Box variant="awsui-key-label">Controls Needing Attention</Box>
            <Box variant="h1" fontSize="display-l">{failingControls.length}</Box>
          </SpaceBetween>
        </Container>
        <Container>
          <SpaceBetween size="xxs">
            <Box variant="awsui-key-label">Critical / High Risk</Box>
            <Box variant="h1" fontSize="display-l" color="text-status-error">{criticalCount + highCount}</Box>
          </SpaceBetween>
        </Container>
        <Container>
          <SpaceBetween size="xxs">
            <Box variant="awsui-key-label">Active Remediation Plans</Box>
            <Box variant="h1" fontSize="display-l">{plans.length}</Box>
          </SpaceBetween>
        </Container>
      </ColumnLayout>

      <Table
        {...collectionProps}
        variant="full-page"
        stickyHeader
        stripedRows={preferences.stripedRows}
        wrapLines={preferences.wrapLines}
        header={
          <Header variant="awsui-h1-sticky" counter={`(${failingControls.length})`} description="Controls that are failing or have not been assessed">
            Controls Requiring Remediation
          </Header>
        }
        filter={<TextFilter {...filterProps} countText={`${filteredItemsCount} match${filteredItemsCount === 1 ? '' : 'es'}`} filteringAriaLabel="Filter controls" filteringPlaceholder="Search controls" />}
        pagination={<Pagination {...paginationProps} />}
        preferences={
          <CollectionPreferences
            title="Preferences"
            confirmLabel="Confirm"
            cancelLabel="Cancel"
            preferences={preferences}
            onConfirm={({ detail }) => setPreferences(detail as typeof preferences)}
            pageSizePreference={{ options: [{ value: 10, label: '10 controls' }, { value: 15, label: '15 controls' }, { value: 25, label: '25 controls' }] }}
            wrapLinesPreference={{}}
            stripedRowsPreference={{}}
          />
        }
        columnDefinitions={[
          { id: 'ref', header: 'Ref', cell: item => <Box fontWeight="bold">{item.control_ref}</Box>, sortingField: 'control_ref', width: 120, isRowHeader: true },
          { id: 'title', header: 'Title', cell: item => item.title, sortingField: 'title' },
          { id: 'framework', header: 'Framework', cell: item => (item as any).frameworks?.name || '-', width: 140 },
          {
            id: 'risk', header: 'Risk', width: 110,
            cell: item => <Badge color={RISK_COLORS[item.risk_level] || 'grey'}>{item.risk_level}</Badge>,
            sortingField: 'risk_level',
          },
          {
            id: 'status', header: 'Status', width: 140,
            cell: item => (
              <StatusIndicator type={item.status === 'failing' ? 'error' : 'pending'}>
                {item.status === 'not_assessed' ? 'Not assessed' : 'Failing'}
              </StatusIndicator>
            ),
          },
          {
            id: 'plan', header: 'Remediation', width: 200,
            cell: item => {
              const existingPlan = plans.find(p => p.control_id === item.id);
              if (existingPlan) {
                const completedSteps = existingPlan.steps.filter(s => s.completed).length;
                return (
                  <Button variant="inline-link" onClick={() => setSelectedPlan(existingPlan)}>
                    Plan ({completedSteps}/{existingPlan.steps.length} steps)
                  </Button>
                );
              }
              return (
                <Button
                  variant="primary"
                  iconName="gen-ai"
                  loading={generating === item.id}
                  onClick={() => generatePlan(item)}
                >
                  Generate Plan
                </Button>
              );
            },
          },
        ]}
        items={items}
        trackBy="id"
      />

      {plans.length > 0 && (
        <Container header={<Header variant="h2" counter={`(${plans.length})`}>Remediation Plans</Header>}>
          <SpaceBetween size="m">
            {plans.slice(0, 5).map(plan => {
              const completedSteps = plan.steps.filter(s => s.completed).length;
              const progress = plan.steps.length > 0 ? Math.round((completedSteps / plan.steps.length) * 100) : 0;
              return (
                <SpaceBetween key={plan.id} size="xxs">
                  <SpaceBetween direction="horizontal" size="xs" alignItems="center">
                    <Button variant="inline-link" onClick={() => setSelectedPlan(plan)}>{plan.title}</Button>
                    {plan.ai_generated && <Badge color="blue">AI Generated</Badge>}
                    <Badge color={plan.priority === 'high' ? 'red' : plan.priority === 'medium' ? 'blue' : 'green'}>{plan.priority}</Badge>
                  </SpaceBetween>
                  <ProgressBar value={progress} additionalInfo={`${completedSteps}/${plan.steps.length} steps completed`} />
                </SpaceBetween>
              );
            })}
          </SpaceBetween>
        </Container>
      )}

      <Modal visible={!!selectedPlan} onDismiss={() => setSelectedPlan(null)} header={selectedPlan?.title || ''} size="large">
        {selectedPlan && (
          <SpaceBetween size="m">
            <SpaceBetween direction="horizontal" size="s">
              {selectedPlan.ai_generated && (
                <ChatBubble
                  type="incoming"
                  ariaLabel="AI generated plan"
                  avatar={<Avatar color="gen-ai" iconName="gen-ai" ariaLabel="Stakflo AI" />}
                >
                  <Box variant="small" color="text-body-secondary">
                    This remediation plan was generated by Stakflo AI
                  </Box>
                </ChatBubble>
              )}
            </SpaceBetween>
            <SpaceBetween direction="horizontal" size="m">
              <Badge color={selectedPlan.priority === 'high' ? 'red' : selectedPlan.priority === 'medium' ? 'blue' : 'green'}>
                Priority: {selectedPlan.priority}
              </Badge>
              <StatusIndicator type={selectedPlan.status === 'completed' ? 'success' : selectedPlan.status === 'in_progress' ? 'in-progress' : 'pending'}>
                {selectedPlan.status.replace('_', ' ')}
              </StatusIndicator>
            </SpaceBetween>
            <Table
              columnDefinitions={[
                { id: 'step', header: '#', cell: item => item.step, width: 50 },
                { id: 'title', header: 'Step', cell: item => <Box fontWeight="bold">{item.title}</Box>, isRowHeader: true },
                { id: 'desc', header: 'Description', cell: item => item.description },
                {
                  id: 'status', header: 'Done', width: 80,
                  cell: item => (
                    <StatusIndicator type={item.completed ? 'success' : 'pending'}>
                      {item.completed ? 'Yes' : 'No'}
                    </StatusIndicator>
                  ),
                },
              ]}
              items={selectedPlan.steps}
              trackBy="step"
            />
            <SpaceBetween direction="horizontal" size="xs">
              <Button
                variant="primary"
                onClick={async () => {
                  const { error } = await supabase.from('remediation_plans').update({ status: 'in_progress' }).eq('id', selectedPlan.id);
                  if (!error) { addNotification('success', 'Plan started'); setSelectedPlan(null); loadData(); }
                }}
              >
                Start Plan
              </Button>
              <Button
                onClick={async () => {
                  const completedSteps = selectedPlan.steps.map(s => ({ ...s, completed: true }));
                  const { error } = await supabase.from('remediation_plans').update({ steps: completedSteps, status: 'completed' }).eq('id', selectedPlan.id);
                  if (!error) { addNotification('success', 'Plan completed'); setSelectedPlan(null); loadData(); }
                }}
              >
                Mark Complete
              </Button>
            </SpaceBetween>
          </SpaceBetween>
        )}
      </Modal>
    </SpaceBetween>
  );
}

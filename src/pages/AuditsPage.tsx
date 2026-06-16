import { useEffect, useState } from 'react';
import MarkdownContent from '../components/MarkdownContent';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import Header from '@cloudscape-design/components/header';
import Pagination from '@cloudscape-design/components/pagination';
import SpaceBetween from '@cloudscape-design/components/space-between';
import StatusIndicator from '@cloudscape-design/components/status-indicator';
import Table from '@cloudscape-design/components/table';
import TextFilter from '@cloudscape-design/components/text-filter';
import Spinner from '@cloudscape-design/components/spinner';
import Modal from '@cloudscape-design/components/modal';
import Form from '@cloudscape-design/components/form';
import FormField from '@cloudscape-design/components/form-field';
import Input from '@cloudscape-design/components/input';
import Textarea from '@cloudscape-design/components/textarea';
import Select from '@cloudscape-design/components/select';
import DatePicker from '@cloudscape-design/components/date-picker';
import Container from '@cloudscape-design/components/container';
import ColumnLayout from '@cloudscape-design/components/column-layout';
import Badge from '@cloudscape-design/components/badge';
import ProgressBar from '@cloudscape-design/components/progress-bar';
import Tabs from '@cloudscape-design/components/tabs';
import CollectionPreferences from '@cloudscape-design/components/collection-preferences';
import Avatar from '@cloudscape-design/chat-components/avatar';
import ChatBubble from '@cloudscape-design/chat-components/chat-bubble';
import { useCollection } from '@cloudscape-design/collection-hooks';
import { supabase } from '../lib/supabase';
import { useNotifications } from '../contexts/NotificationContext';
import { useAI, buildComplianceSystemPrompt } from '../lib/useAI';
import type { Audit, Framework, Control, Evidence } from '../lib/types';

const STATUS_MAP: Record<string, { type: 'success' | 'in-progress' | 'not-started'; label: string }> = {
  completed: { type: 'success', label: 'Completed' },
  in_progress: { type: 'in-progress', label: 'In Progress' },
  not_started: { type: 'not-started', label: 'Not Started' },
};

export default function AuditsPage() {
  const { addNotification } = useNotifications();
  const [audits, setAudits] = useState<Audit[]>([]);
  const [frameworks, setFrameworks] = useState<Framework[]>([]);
  const [controls, setControls] = useState<Control[]>([]);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', framework_id: '', start_date: '', end_date: '', notes: '' });
  const [selectedAudit, setSelectedAudit] = useState<Audit | null>(null);
  const [readinessReport, setReadinessReport] = useState<string | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [preferences, setPreferences] = useState({ pageSize: 10, stripedRows: false });

  const loadData = async () => {
    const [aRes, fRes, cRes, eRes] = await Promise.all([
      supabase.from('audits').select('*, frameworks(name)').order('created_at', { ascending: false }),
      supabase.from('frameworks').select('*').order('name'),
      supabase.from('controls').select('*, frameworks(name)').order('control_ref'),
      supabase.from('evidence').select('*, controls(control_ref, title)'),
    ]);
    setAudits(aRes.data || []);
    setFrameworks(fRes.data || []);
    setControls(cRes.data || []);
    setEvidence(eRes.data || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const { items, collectionProps, filterProps, paginationProps, filteredItemsCount } = useCollection(audits, {
    filtering: {
      empty: (
        <Box textAlign="center" color="inherit" padding="xxl">
          <b>No audits</b>
          <Box variant="p" color="inherit">Create your first audit to start tracking compliance cycles.</Box>
        </Box>
      ),
      noMatch: <Box textAlign="center" color="inherit" padding="xxl"><b>No matches</b></Box>,
    },
    pagination: { pageSize: preferences.pageSize },
    sorting: {},
  });

  const updateStatus = async (audit: Audit, status: string) => {
    const { error } = await supabase.from('audits').update({ status }).eq('id', audit.id);
    if (error) addNotification('error', error.message);
    else {
      addNotification('success', `Audit status updated to ${status.replace('_', ' ')}`);
      if (selectedAudit?.id === audit.id) setSelectedAudit({ ...selectedAudit, status: status as Audit['status'] });
      loadData();
    }
  };

  const handleCreate = async () => {
    if (!form.title || !form.framework_id) {
      addNotification('error', 'Title and framework are required');
      return;
    }
    setCreating(true);
    const { error } = await supabase.from('audits').insert({
      title: form.title,
      framework_id: form.framework_id,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      notes: form.notes,
    });
    setCreating(false);
    if (error) addNotification('error', error.message);
    else {
      addNotification('success', 'Audit created');
      setShowCreate(false);
      setForm({ title: '', framework_id: '', start_date: '', end_date: '', notes: '' });
      loadData();
    }
  };

  const complianceContext = {
    totalControls: controls.length,
    passingControls: controls.filter(c => c.status === 'passing').length,
    failingControls: controls.filter(c => c.status === 'failing').length,
    complianceScore: controls.length > 0 ? Math.round((controls.filter(c => c.status === 'passing').length / controls.length) * 100) : 0,
    frameworks: frameworks.map(f => f.name),
    failingControlsList: controls.filter(c => c.status === 'failing').map(c => `${c.control_ref}: ${c.title} (${c.risk_level})`),
  };

  const { sendMessage, clearMessages } = useAI({ systemPrompt: buildComplianceSystemPrompt(complianceContext) });

  const generateReadinessReport = async (audit: Audit) => {
    setGeneratingReport(true);
    setReadinessReport(null);
    clearMessages();
    const auditFramework = frameworks.find(f => f.id === audit.framework_id);
    const frameworkControls = controls.filter(c => c.framework_id === audit.framework_id);
    const frameworkEvidence = evidence.filter(e => frameworkControls.some(c => c.id === e.control_id));
    const approvedEvidence = frameworkEvidence.filter(e => e.status === 'approved');
    const controlsWithEvidence = new Set(approvedEvidence.map(e => e.control_id));
    const passingControls = frameworkControls.filter(c => c.status === 'passing');
    const failingControls = frameworkControls.filter(c => c.status === 'failing');
    const coveragePct = frameworkControls.length > 0 ? Math.round((controlsWithEvidence.size / frameworkControls.length) * 100) : 0;

    try {
      const result = await sendMessage(
        `Generate an audit readiness assessment for the following audit:\n\nAudit: ${audit.title}\nFramework: ${auditFramework?.name || 'Unknown'}\nStatus: ${audit.status.replace('_', ' ')}\nStart Date: ${audit.start_date || 'Not set'}\nEnd Date: ${audit.end_date || 'Not set'}\n\nFramework Controls Overview:\n- Total controls: ${frameworkControls.length}\n- Passing: ${passingControls.length} (${frameworkControls.length > 0 ? Math.round((passingControls.length / frameworkControls.length) * 100) : 0}%)\n- Failing: ${failingControls.length}\n- Evidence coverage: ${coveragePct}% of controls have approved evidence\n\nFailing Controls (top 5):\n${failingControls.slice(0, 5).map(c => `- ${c.control_ref}: ${c.title} [${c.risk_level} risk]`).join('\n') || '- None'}\n\nProvide:\n1. Readiness Score (0-100) with rationale\n2. Critical gaps that must be fixed before the audit\n3. Evidence gaps (controls missing approved evidence)\n4. Risk areas the auditor will focus on\n5. 2-week action plan to achieve audit readiness\n6. Estimated likelihood of passing based on current state\n\nBe specific and actionable. Format clearly for compliance team review.`
      );
      setReadinessReport(result);
    } catch {
      setReadinessReport('Failed to generate readiness report. Check that the OpenRouter API key is configured.');
    } finally {
      setGeneratingReport(false);
    }
  };

  if (loading) return <Box textAlign="center" padding="xxl"><Spinner size="large" /></Box>;

  const WorkspacePanel = ({ audit }: { audit: Audit }) => {
    const auditFramework = frameworks.find(f => f.id === audit.framework_id);
    const frameworkControls = controls.filter(c => c.framework_id === audit.framework_id);
    const frameworkEvidence = evidence.filter(e => frameworkControls.some(c => c.id === e.control_id));
    const approvedEvidence = frameworkEvidence.filter(e => e.status === 'approved');
    const controlsWithEvidence = new Set(approvedEvidence.map(e => e.control_id));
    const passingControls = frameworkControls.filter(c => c.status === 'passing').length;
    const coveragePct = frameworkControls.length > 0 ? Math.round((controlsWithEvidence.size / frameworkControls.length) * 100) : 0;
    const passingPct = frameworkControls.length > 0 ? Math.round((passingControls / frameworkControls.length) * 100) : 0;
    const daysUntilEnd = audit.end_date
      ? Math.ceil((new Date(audit.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;

    return (
      <SpaceBetween size="l">
        <ColumnLayout columns={4} variant="text-grid">
          <Container>
            <SpaceBetween size="xxs">
              <Box variant="awsui-key-label">Framework</Box>
              <Box fontWeight="bold">{auditFramework?.name || 'Unknown'}</Box>
            </SpaceBetween>
          </Container>
          <Container>
            <SpaceBetween size="xxs">
              <Box variant="awsui-key-label">Controls in Scope</Box>
              <Box variant="h2">{frameworkControls.length}</Box>
              <Box variant="small" color={passingPct >= 80 ? 'text-status-success' : 'text-status-error'}>
                {passingControls} passing ({passingPct}%)
              </Box>
            </SpaceBetween>
          </Container>
          <Container>
            <SpaceBetween size="xxs">
              <Box variant="awsui-key-label">Evidence Coverage</Box>
              <Box variant="h2">{coveragePct}%</Box>
              <Box variant="small" color="text-body-secondary">{approvedEvidence.length} approved items</Box>
            </SpaceBetween>
          </Container>
          <Container>
            <SpaceBetween size="xxs">
              <Box variant="awsui-key-label">Days Remaining</Box>
              <Box variant="h2" color={daysUntilEnd !== null && daysUntilEnd < 14 ? 'text-status-error' : 'inherit'}>
                {daysUntilEnd !== null ? daysUntilEnd : '\u2014'}
              </Box>
              {audit.end_date && <Box variant="small" color="text-body-secondary">{new Date(audit.end_date).toLocaleDateString()}</Box>}
            </SpaceBetween>
          </Container>
        </ColumnLayout>

        <SpaceBetween direction="horizontal" size="xs">
          <ProgressBar
            value={passingPct}
            label="Control compliance"
            additionalInfo={`${passingControls}/${frameworkControls.length} passing`}
            status={passingPct >= 80 ? 'success' : passingPct >= 50 ? 'in-progress' : 'error'}
          />
        </SpaceBetween>

        <Tabs
          tabs={[
            {
              id: 'controls',
              label: `Controls (${frameworkControls.length})`,
              content: (
                <Table
                  variant="embedded"
                  columnDefinitions={[
                    { id: 'ref', header: 'Ref', cell: item => <Box fontWeight="bold">{item.control_ref}</Box>, width: 120 },
                    { id: 'title', header: 'Title', cell: item => item.title, isRowHeader: true },
                    {
                      id: 'status', header: 'Status', width: 150,
                      cell: item => (
                        <StatusIndicator type={item.status === 'passing' ? 'success' : item.status === 'failing' ? 'error' : 'pending'}>
                          {item.status === 'not_assessed' ? 'Not assessed' : item.status}
                        </StatusIndicator>
                      ),
                    },
                    {
                      id: 'evidence', header: 'Evidence', width: 140,
                      cell: item => {
                        const hasEvidence = controlsWithEvidence.has(item.id);
                        return hasEvidence
                          ? <StatusIndicator type="success">Covered</StatusIndicator>
                          : <StatusIndicator type="warning">Missing</StatusIndicator>;
                      },
                    },
                    { id: 'risk', header: 'Risk', width: 100, cell: item => <Badge color={item.risk_level === 'critical' || item.risk_level === 'high' ? 'red' : item.risk_level === 'medium' ? 'blue' : 'green'}>{item.risk_level}</Badge> },
                  ]}
                  items={frameworkControls}
                  trackBy="id"
                  empty={<Box textAlign="center" padding="m">No controls in this framework</Box>}
                />
              ),
            },
            {
              id: 'evidence',
              label: `Evidence (${approvedEvidence.length} approved)`,
              content: (
                <Table
                  variant="embedded"
                  columnDefinitions={[
                    { id: 'title', header: 'Evidence', cell: item => item.title, isRowHeader: true },
                    { id: 'control', header: 'Control', width: 160, cell: item => (item as any).controls?.control_ref || '\u2014' },
                    {
                      id: 'status', header: 'Status', width: 140,
                      cell: item => <StatusIndicator type={item.status === 'approved' ? 'success' : item.status === 'rejected' ? 'error' : 'pending'}>{item.status}</StatusIndicator>,
                    },
                    { id: 'date', header: 'Uploaded', width: 120, cell: item => new Date(item.uploaded_at).toLocaleDateString() },
                  ]}
                  items={frameworkEvidence}
                  trackBy="id"
                  empty={<Box textAlign="center" padding="m">No evidence linked to this framework's controls</Box>}
                />
              ),
            },
            {
              id: 'readiness',
              label: 'AI Readiness Report',
              content: (
                <SpaceBetween size="m">
                  <Button
                    variant="primary"
                    iconName="gen-ai"
                    loading={generatingReport}
                    onClick={() => generateReadinessReport(audit)}
                  >
                    Generate AI Readiness Report
                  </Button>
                  {readinessReport && (
                    <ChatBubble
                      type="incoming"
                      ariaLabel="AI readiness report"
                      avatar={<Avatar color="gen-ai" iconName="gen-ai" ariaLabel="Stakflo AI" />}
                    >
                      <MarkdownContent content={readinessReport} />
                    </ChatBubble>
                  )}
                </SpaceBetween>
              ),
            },
          ]}
        />

        <SpaceBetween direction="horizontal" size="xs">
          {audit.status === 'not_started' && (
            <Button variant="primary" onClick={() => updateStatus(audit, 'in_progress')}>Start Audit</Button>
          )}
          {audit.status === 'in_progress' && (
            <Button variant="primary" onClick={() => updateStatus(audit, 'completed')}>Mark Complete</Button>
          )}
          {audit.status === 'completed' && (
            <StatusIndicator type="success">Audit completed</StatusIndicator>
          )}
        </SpaceBetween>
      </SpaceBetween>
    );
  };

  return (
    <SpaceBetween size="l">
      <Table
        {...collectionProps}
        variant="full-page"
        stickyHeader
        stripedRows={preferences.stripedRows}
        header={
          <Header
            variant="awsui-h1-sticky"
            counter={`(${audits.length})`}
            actions={<Button variant="primary" onClick={() => setShowCreate(true)}>Create audit</Button>}
            description="Track audit cycles across compliance frameworks"
          >
            Audits
          </Header>
        }
        filter={
          <TextFilter
            {...filterProps}
            countText={`${filteredItemsCount} match${filteredItemsCount === 1 ? '' : 'es'}`}
            filteringAriaLabel="Filter audits"
            filteringPlaceholder="Search audits"
          />
        }
        pagination={<Pagination {...paginationProps} />}
        preferences={
          <CollectionPreferences
            title="Preferences"
            confirmLabel="Confirm"
            cancelLabel="Cancel"
            preferences={preferences}
            onConfirm={({ detail }) => setPreferences(detail as typeof preferences)}
            pageSizePreference={{
              options: [
                { value: 5, label: '5 audits' },
                { value: 10, label: '10 audits' },
                { value: 20, label: '20 audits' },
              ],
            }}
            stripedRowsPreference={{}}
          />
        }
        columnDefinitions={[
          {
            id: 'title', header: 'Title', cell: item => (
              <Button variant="inline-link" onClick={() => setSelectedAudit(item)}>
                {item.title}
              </Button>
            ), sortingField: 'title', isRowHeader: true,
          },
          {
            id: 'framework', header: 'Framework', width: 160,
            cell: item => (item as any).frameworks?.name || '\u2014',
          },
          {
            id: 'status', header: 'Status', width: 150,
            cell: item => {
              const s = STATUS_MAP[item.status];
              return s ? <StatusIndicator type={s.type}>{s.label}</StatusIndicator> : item.status;
            },
          },
          { id: 'start', header: 'Start Date', width: 130, cell: item => item.start_date ? new Date(item.start_date + 'T00:00:00').toLocaleDateString() : '\u2014' },
          {
            id: 'end', header: 'End Date', width: 130,
            cell: item => {
              if (!item.end_date) return '\u2014';
              const d = new Date(item.end_date + 'T00:00:00');
              const days = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              return (
                <Box color={days < 14 && item.status !== 'completed' ? 'text-status-error' : 'inherit'}>
                  {d.toLocaleDateString()}{days < 14 && days >= 0 && item.status !== 'completed' ? ` (${days}d)` : ''}
                </Box>
              );
            },
          },
          {
            id: 'actions', header: 'Actions', width: 160,
            cell: item => (
              <SpaceBetween direction="horizontal" size="xxs">
                <Button variant="inline-link" onClick={() => setSelectedAudit(item)}>Open workspace</Button>
              </SpaceBetween>
            ),
          },
        ]}
        items={items}
        trackBy="id"
      />

      <Modal
        visible={!!selectedAudit}
        onDismiss={() => { setSelectedAudit(null); setReadinessReport(null); }}
        header={selectedAudit?.title || 'Audit workspace'}
        size="max"
      >
        {selectedAudit && <WorkspacePanel audit={selectedAudit} />}
      </Modal>

      <Modal visible={showCreate} onDismiss={() => setShowCreate(false)} header="Create audit" size="medium">
        <Form
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button variant="primary" loading={creating} onClick={handleCreate}>Create</Button>
            </SpaceBetween>
          }
        >
          <SpaceBetween size="m">
            <FormField label="Title" constraintText="Required">
              <Input value={form.title} onChange={({ detail }) => setForm(p => ({ ...p, title: detail.value }))} placeholder="e.g. SOC 2 Type II Annual Audit 2026" />
            </FormField>
            <FormField label="Framework" constraintText="Required">
              <Select
                selectedOption={form.framework_id ? { value: form.framework_id, label: frameworks.find(f => f.id === form.framework_id)?.name } : null}
                onChange={({ detail }) => setForm(p => ({ ...p, framework_id: detail.selectedOption.value || '' }))}
                options={frameworks.map(f => ({ value: f.id, label: f.name }))}
                placeholder="Select framework"
              />
            </FormField>
            <ColumnLayout columns={2}>
              <FormField label="Start date">
                <DatePicker value={form.start_date} onChange={({ detail }) => setForm(p => ({ ...p, start_date: detail.value }))} placeholder="YYYY/MM/DD" />
              </FormField>
              <FormField label="End date">
                <DatePicker value={form.end_date} onChange={({ detail }) => setForm(p => ({ ...p, end_date: detail.value }))} placeholder="YYYY/MM/DD" />
              </FormField>
            </ColumnLayout>
            <FormField label="Notes">
              <Textarea value={form.notes} onChange={({ detail }) => setForm(p => ({ ...p, notes: detail.value }))} rows={3} placeholder="Audit scope, auditor name, special requirements..." />
            </FormField>
          </SpaceBetween>
        </Form>
      </Modal>
    </SpaceBetween>
  );
}

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
import CollectionPreferences from '@cloudscape-design/components/collection-preferences';
import Spinner from '@cloudscape-design/components/spinner';
import Modal from '@cloudscape-design/components/modal';
import Form from '@cloudscape-design/components/form';
import FormField from '@cloudscape-design/components/form-field';
import Input from '@cloudscape-design/components/input';
import Textarea from '@cloudscape-design/components/textarea';
import Select from '@cloudscape-design/components/select';
import Badge from '@cloudscape-design/components/badge';
import Alert from '@cloudscape-design/components/alert';
import Container from '@cloudscape-design/components/container';
import ColumnLayout from '@cloudscape-design/components/column-layout';
import Avatar from '@cloudscape-design/chat-components/avatar';
import ChatBubble from '@cloudscape-design/chat-components/chat-bubble';
import { useCollection } from '@cloudscape-design/collection-hooks';
import { supabase } from '../lib/supabase';
import { useNotifications } from '../contexts/NotificationContext';
import { useAI } from '../lib/useAI';
import type { Policy, Framework } from '../lib/types';

const STATUS_MAP: Record<string, { type: 'success' | 'in-progress' | 'pending' | 'stopped'; label: string }> = {
  published: { type: 'success', label: 'Published' },
  in_review: { type: 'in-progress', label: 'In Review' },
  draft: { type: 'pending', label: 'Draft' },
  archived: { type: 'stopped', label: 'Archived' },
};

export default function PoliciesPage() {
  const { addNotification } = useNotifications();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [frameworks, setFrameworks] = useState<Framework[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', framework_id: '', version: '1.0', content: '' });
  const [viewPolicy, setViewPolicy] = useState<Policy | null>(null);
  const [showAIDraft, setShowAIDraft] = useState(false);
  const [aiDraftTopic, setAiDraftTopic] = useState('');
  const [aiDraftFramework, setAiDraftFramework] = useState('');
  const [aiDraft, setAiDraft] = useState('');
  const [drafting, setDrafting] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [analyzingPolicy, setAnalyzingPolicy] = useState<string | null>(null);
  const [showPolicyIntelligence, setShowPolicyIntelligence] = useState(false);
  const [legacyPolicyText, setLegacyPolicyText] = useState('');
  const [legacyPolicyTitle, setLegacyPolicyTitle] = useState('');
  const [intelligenceResult, setIntelligenceResult] = useState<string | null>(null);
  const [runningIntelligence, setRunningIntelligence] = useState(false);
  const [preferences, setPreferences] = useState({ pageSize: 15, wrapLines: false, stripedRows: true });

  const { sendMessage, clearMessages } = useAI({
    systemPrompt: `You are Stakflo AI, an expert compliance policy writer. You draft clear, audit-ready policies that meet regulatory requirements for SOC 2, ISO 27001, HIPAA, and GDPR frameworks. Write in professional, formal language suitable for enterprise use.`,
  });

  const loadData = async () => {
    const [pRes, fRes] = await Promise.all([
      supabase.from('policies').select('*, frameworks(name)').order('title'),
      supabase.from('frameworks').select('*').order('name'),
    ]);
    setPolicies(pRes.data || []);
    setFrameworks(fRes.data || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const { items, collectionProps, filterProps, paginationProps, filteredItemsCount } = useCollection(policies, {
    filtering: {
      empty: <Box textAlign="center" color="inherit" padding="xxl"><b>No policies</b><Box variant="p" color="inherit">Create your first policy or use AI to draft one.</Box></Box>,
      noMatch: <Box textAlign="center" color="inherit" padding="xxl"><b>No matches</b></Box>,
    },
    pagination: { pageSize: preferences.pageSize },
    sorting: {},
  });

  const updateStatus = async (policy: Policy, status: string) => {
    const { error } = await supabase.from('policies').update({ status, last_reviewed_at: new Date().toISOString() }).eq('id', policy.id);
    if (error) addNotification('error', error.message);
    else { addNotification('success', 'Policy status updated'); loadData(); }
  };

  const handleCreate = async () => {
    setCreating(true);
    const { error } = await supabase.from('policies').insert({
      title: form.title,
      framework_id: form.framework_id || null,
      version: form.version,
      content: form.content,
    });
    setCreating(false);
    if (error) addNotification('error', error.message);
    else {
      addNotification('success', 'Policy created');
      setShowCreate(false);
      setForm({ title: '', framework_id: '', version: '1.0', content: '' });
      loadData();
    }
  };

  const generateDraft = async () => {
    setDrafting(true);
    setAiDraft('');
    clearMessages();
    try {
      const fw = frameworks.find(f => f.id === aiDraftFramework);
      const result = await sendMessage(
        `Draft a comprehensive compliance policy for the following:
Topic: ${aiDraftTopic}
Framework: ${fw?.name || 'General'}

The policy should include:
1. Purpose and scope
2. Policy statement
3. Roles and responsibilities
4. Procedures and controls
5. Compliance requirements
6. Review and update schedule

Make it audit-ready and suitable for a ${fw?.name || 'general compliance'} assessment. Write in a professional, formal tone.`
      );
      setAiDraft(result);
    } catch {
      setAiDraft('Failed to generate draft. Please check that the OpenRouter API key is configured.');
    } finally {
      setDrafting(false);
    }
  };

  const saveDraftAsPolicy = async () => {
    const { error } = await supabase.from('policies').insert({
      title: aiDraftTopic,
      framework_id: aiDraftFramework || null,
      version: '1.0',
      content: aiDraft,
    });
    if (error) addNotification('error', error.message);
    else {
      addNotification('success', 'AI-drafted policy saved');
      setShowAIDraft(false);
      setAiDraftTopic('');
      setAiDraftFramework('');
      setAiDraft('');
      loadData();
    }
  };

  const analyzePolicy = async (policy: Policy) => {
    setAnalyzingPolicy(policy.id);
    setAiAnalysis(null);
    clearMessages();
    try {
      const result = await sendMessage(
        `Analyze this compliance policy and identify gaps, improvements, and control mappings:

Title: ${policy.title}
Framework: ${(policy as any).frameworks?.name || 'General'}
Version: ${policy.version}
Status: ${policy.status}
Content: ${(policy.content || '').slice(0, 2000)}

Provide:
1. Overall assessment
2. Identified gaps or weaknesses
3. Suggested improvements
4. Control requirements this policy covers
5. Cross-framework applicability (SOC 2, ISO 27001, HIPAA, GDPR)`
      );
      setAiAnalysis(result);
    } catch {
      setAiAnalysis('Failed to analyze policy.');
    } finally {
      setAnalyzingPolicy(null);
    }
  };

  const runPolicyIntelligence = async () => {
    if (!legacyPolicyText.trim()) {
      addNotification('error', 'Paste a policy document to analyze');
      return;
    }
    setRunningIntelligence(true);
    setIntelligenceResult(null);
    clearMessages();
    try {
      const fwList = frameworks.map(f => f.name).join(', ') || 'SOC 2, ISO 27001, HIPAA, GDPR';
      const result = await sendMessage(
        `You are the Stakflo Policy Intelligence Engine. Parse the following policy document, extract its control intent, and automatically map requirements to compliance frameworks.

Policy Title: ${legacyPolicyTitle || 'Unnamed policy'}
Active Frameworks in this account: ${fwList}

---
POLICY TEXT:
${legacyPolicyText.slice(0, 4000)}
---

Produce a **Policy Intelligence Report** with these sections:

## Policy Summary
In 2-3 sentences, describe what this policy governs and its scope.

## Extracted Control Intent
List 5-10 specific compliance controls implied or required by this policy. For each:
- **Control**: Short title
- **Requirement**: What the policy requires
- **Type**: (technical / administrative / physical)

## Cross-Framework Mapping
Map each extracted control to relevant framework requirements:

| Control | SOC 2 | ISO 27001 | HIPAA | GDPR |
|---|---|---|---|---|

(Use the control IDs/clauses. Mark N/A where not applicable.)

## Coverage Gaps
Identify compliance areas that are **missing** from this policy but required by the active frameworks. List the top 5 gaps.

## Rewrite Recommendations
What specific additions or changes would make this policy fully audit-ready across the mapped frameworks?

## Suggested Policy Modernization Steps
3-5 actionable steps to update this policy for current regulatory requirements.

Be thorough and specific with framework references (e.g., CC6.1, A.9.2.1, 164.312(a)(2)(i), Art. 32).`
      );
      setIntelligenceResult(result);
    } catch {
      setIntelligenceResult('Failed to run policy intelligence. Please check that the OpenRouter API key is configured.');
    } finally {
      setRunningIntelligence(false);
    }
  };

  if (loading) return <Box textAlign="center" padding="xxl"><Spinner size="large" /></Box>;

  return (
    <SpaceBetween size="l">
      <Table
        {...collectionProps}
        variant="full-page"
        stickyHeader
        stripedRows={preferences.stripedRows}
        wrapLines={preferences.wrapLines}
        header={
          <Header variant="awsui-h1-sticky" counter={`(${policies.length})`}
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <Button iconName="gen-ai" onClick={() => { setShowPolicyIntelligence(true); setIntelligenceResult(null); }}>Policy Intelligence</Button>
                <Button iconName="gen-ai" onClick={() => setShowAIDraft(true)}>AI Draft Policy</Button>
                <Button variant="primary" onClick={() => setShowCreate(true)}>Create policy</Button>
              </SpaceBetween>
            }
            description="Manage organizational policies and their lifecycle"
          >
            Policies
          </Header>
        }
        filter={<TextFilter {...filterProps} countText={`${filteredItemsCount} match${filteredItemsCount === 1 ? '' : 'es'}`} filteringAriaLabel="Filter policies" />}
        pagination={<Pagination {...paginationProps} />}
        preferences={
          <CollectionPreferences
            title="Preferences"
            confirmLabel="Confirm"
            cancelLabel="Cancel"
            preferences={preferences}
            onConfirm={({ detail }) => setPreferences(detail as typeof preferences)}
            pageSizePreference={{ options: [{ value: 10, label: '10 policies' }, { value: 15, label: '15 policies' }, { value: 25, label: '25 policies' }] }}
            wrapLinesPreference={{}}
            stripedRowsPreference={{}}
          />
        }
        columnDefinitions={[
          { id: 'title', header: 'Title', cell: item => <Button variant="inline-link" onClick={() => setViewPolicy(item)}>{item.title}</Button>, sortingField: 'title', isRowHeader: true },
          { id: 'framework', header: 'Framework', cell: item => (item as any).frameworks?.name || 'General', width: 150 },
          { id: 'version', header: 'Version', cell: item => <Badge>{`v${item.version}`}</Badge>, width: 100 },
          {
            id: 'status', header: 'Status', width: 140,
            cell: item => {
              const s = STATUS_MAP[item.status];
              return s ? <StatusIndicator type={s.type}>{s.label}</StatusIndicator> : item.status;
            },
          },
          {
            id: 'reviewed', header: 'Last Reviewed', width: 140,
            cell: item => item.last_reviewed_at ? new Date(item.last_reviewed_at).toLocaleDateString() : 'Never',
          },
          {
            id: 'actions', header: 'Actions', width: 300,
            cell: item => (
              <SpaceBetween direction="horizontal" size="xxs">
                <Button variant="inline-link" iconName="gen-ai" loading={analyzingPolicy === item.id} onClick={() => analyzePolicy(item)}>Analyze</Button>
                {item.status === 'draft' && <Button variant="inline-link" onClick={() => updateStatus(item, 'in_review')}>Submit</Button>}
                {item.status === 'in_review' && <Button variant="inline-link" onClick={() => updateStatus(item, 'published')}>Publish</Button>}
                {item.status === 'published' && <Button variant="inline-link" onClick={() => updateStatus(item, 'archived')}>Archive</Button>}
              </SpaceBetween>
            ),
          },
        ]}
        items={items}
        trackBy="id"
      />

      {aiAnalysis && (
        <ChatBubble type="incoming" ariaLabel="AI policy analysis" avatar={<Avatar color="gen-ai" iconName="gen-ai" ariaLabel="Stakflo AI" />}>
          <MarkdownContent content={aiAnalysis} />
        </ChatBubble>
      )}

      <Modal visible={showCreate} onDismiss={() => setShowCreate(false)} header="Create policy" size="large">
        <Form actions={<SpaceBetween direction="horizontal" size="xs"><Button variant="link" onClick={() => setShowCreate(false)}>Cancel</Button><Button variant="primary" loading={creating} onClick={handleCreate}>Create</Button></SpaceBetween>}>
          <SpaceBetween size="m">
            <FormField label="Title"><Input value={form.title} onChange={({ detail }) => setForm(p => ({ ...p, title: detail.value }))} /></FormField>
            <FormField label="Framework">
              <Select
                selectedOption={form.framework_id ? { value: form.framework_id, label: frameworks.find(f => f.id === form.framework_id)?.name } : null}
                onChange={({ detail }) => setForm(p => ({ ...p, framework_id: detail.selectedOption.value || '' }))}
                options={[{ value: '', label: 'General (no framework)' }, ...frameworks.map(f => ({ value: f.id, label: f.name }))]}
                placeholder="Select framework"
              />
            </FormField>
            <FormField label="Version"><Input value={form.version} onChange={({ detail }) => setForm(p => ({ ...p, version: detail.value }))} /></FormField>
            <FormField label="Content"><Textarea value={form.content} onChange={({ detail }) => setForm(p => ({ ...p, content: detail.value }))} rows={10} /></FormField>
          </SpaceBetween>
        </Form>
      </Modal>

      <Modal visible={!!viewPolicy} onDismiss={() => setViewPolicy(null)} header={viewPolicy?.title || ''} size="large">
        {viewPolicy && (
          <SpaceBetween size="m">
            <SpaceBetween direction="horizontal" size="m">
              <Badge>{`v${viewPolicy.version}`}</Badge>
              <StatusIndicator type={STATUS_MAP[viewPolicy.status]?.type || 'pending'}>
                {STATUS_MAP[viewPolicy.status]?.label || viewPolicy.status}
              </StatusIndicator>
              {(viewPolicy as any).frameworks?.name && <Badge color="blue">{(viewPolicy as any).frameworks.name}</Badge>}
            </SpaceBetween>
            <MarkdownContent content={viewPolicy.content || 'No content.'} maxHeight="60vh" />
          </SpaceBetween>
        )}
      </Modal>

      <Modal visible={showAIDraft} onDismiss={() => setShowAIDraft(false)} header="AI Policy Drafting" size="large">
        <SpaceBetween size="m">
          <FormField label="Policy topic" description="What policy should the AI draft?">
            <Input value={aiDraftTopic} onChange={({ detail }) => setAiDraftTopic(detail.value)} placeholder="e.g., Data Retention Policy, Incident Response Plan" />
          </FormField>
          <FormField label="Target framework">
            <Select
              selectedOption={aiDraftFramework ? { value: aiDraftFramework, label: frameworks.find(f => f.id === aiDraftFramework)?.name } : null}
              onChange={({ detail }) => setAiDraftFramework(detail.selectedOption.value || '')}
              options={[{ value: '', label: 'General' }, ...frameworks.map(f => ({ value: f.id, label: f.name }))]}
              placeholder="Select framework"
            />
          </FormField>
          <Button variant="primary" iconName="gen-ai" loading={drafting} onClick={generateDraft} disabled={!aiDraftTopic.trim()}>
            Generate Policy Draft
          </Button>
          {aiDraft && (
            <>
              <ChatBubble type="incoming" ariaLabel="AI drafted policy" avatar={<Avatar color="gen-ai" iconName="gen-ai" ariaLabel="Stakflo AI" />}>
                <MarkdownContent content={aiDraft} maxHeight="400px" />
              </ChatBubble>
              <SpaceBetween direction="horizontal" size="xs">
                <Button variant="primary" onClick={saveDraftAsPolicy}>Save as Draft Policy</Button>
                <Button onClick={() => { navigator.clipboard.writeText(aiDraft); addNotification('success', 'Copied to clipboard'); }}>Copy</Button>
              </SpaceBetween>
            </>
          )}
        </SpaceBetween>
      </Modal>

      <Modal
        visible={showPolicyIntelligence}
        onDismiss={() => setShowPolicyIntelligence(false)}
        header="Policy Intelligence Engine"
        size="max"
      >
        <SpaceBetween size="m">
          <Alert type="info">
            Paste any legacy policy document. The AI will parse its control intent, map requirements across SOC 2, ISO 27001, HIPAA, and GDPR, and identify rewrite gaps — turning weeks of manual mapping into minutes.
          </Alert>
          <ColumnLayout columns={2}>
            <FormField label="Policy title" description="Optional — helps the AI produce better output">
              <Input
                value={legacyPolicyTitle}
                onChange={({ detail }) => setLegacyPolicyTitle(detail.value)}
                placeholder="e.g., Access Control Policy v2.3"
              />
            </FormField>
          </ColumnLayout>
          <FormField
            label="Policy document text"
            description="Paste the full text of the legacy policy (up to 4,000 characters analyzed)"
            constraintText={`${legacyPolicyText.length} characters`}
          >
            <Textarea
              value={legacyPolicyText}
              onChange={({ detail }) => setLegacyPolicyText(detail.value)}
              rows={12}
              placeholder="Paste your policy document here..."
            />
          </FormField>
          <SpaceBetween direction="horizontal" size="xs">
            <Button
              variant="primary"
              iconName="gen-ai"
              loading={runningIntelligence}
              onClick={runPolicyIntelligence}
              disabled={!legacyPolicyText.trim()}
            >
              Extract Controls & Map Frameworks
            </Button>
            {intelligenceResult && (
              <Button
                iconName="copy"
                onClick={() => { navigator.clipboard.writeText(intelligenceResult); addNotification('success', 'Intelligence report copied'); }}
              >
                Copy Report
              </Button>
            )}
          </SpaceBetween>
          {intelligenceResult && (
            <Container header={<Header variant="h3" actions={<Badge color="blue">AI Generated</Badge>}>Intelligence Report</Header>}>
              <ChatBubble
                type="incoming"
                ariaLabel="Policy intelligence report"
                avatar={<Avatar color="gen-ai" iconName="gen-ai" ariaLabel="Stakflo AI" />}
              >
                <MarkdownContent content={intelligenceResult} maxHeight="500px" />
              </ChatBubble>
            </Container>
          )}
        </SpaceBetween>
      </Modal>
    </SpaceBetween>
  );
}

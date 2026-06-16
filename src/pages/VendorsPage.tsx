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
import Container from '@cloudscape-design/components/container';
import ColumnLayout from '@cloudscape-design/components/column-layout';
import KeyValuePairs from '@cloudscape-design/components/key-value-pairs';
import Tabs from '@cloudscape-design/components/tabs';
import Checkbox from '@cloudscape-design/components/checkbox';
import Alert from '@cloudscape-design/components/alert';
import Avatar from '@cloudscape-design/chat-components/avatar';
import ChatBubble from '@cloudscape-design/chat-components/chat-bubble';
import { useCollection } from '@cloudscape-design/collection-hooks';
import { supabase } from '../lib/supabase';
import { useNotifications } from '../contexts/NotificationContext';
import { useAI } from '../lib/useAI';
import type { Vendor } from '../lib/types';

interface VendorArtifacts {
  soc2Url: string;
  trustCenterUrl: string;
  isoEvidence: string;
  questionnaire: string;
  additionalNotes: string;
  certifications: string[];
}

const CERT_OPTIONS = ['SOC 2 Type I', 'SOC 2 Type II', 'ISO 27001', 'ISO 27017', 'ISO 27018', 'HIPAA BAA', 'PCI DSS', 'FedRAMP', 'GDPR DPA', 'CSA STAR'];

function ArtifactIntakeForm({
  vendor,
  onAnalyze,
  analyzing,
}: {
  vendor: Vendor;
  onAnalyze: (artifacts: VendorArtifacts) => void;
  analyzing: boolean;
}) {
  const [artifacts, setArtifacts] = useState<VendorArtifacts>({
    soc2Url: '',
    trustCenterUrl: '',
    isoEvidence: '',
    questionnaire: '',
    additionalNotes: vendor.notes || '',
    certifications: [],
  });

  const toggleCert = (cert: string) => {
    setArtifacts(a => ({
      ...a,
      certifications: a.certifications.includes(cert)
        ? a.certifications.filter(c => c !== cert)
        : [...a.certifications, cert],
    }));
  };

  return (
    <SpaceBetween size="m">
      <Alert type="info">
        Provide any available artifacts for {vendor.name}. The AI will analyze them to produce an auditable vendor risk intelligence report.
      </Alert>
      <ColumnLayout columns={2}>
        <FormField
          label="SOC 2 Report URL or reference"
          description="Link to the SOC 2 report or shared report notes"
        >
          <Input
            value={artifacts.soc2Url}
            onChange={({ detail }) => setArtifacts(a => ({ ...a, soc2Url: detail.value }))}
            placeholder="https://... or 'provided via email'"
          />
        </FormField>
        <FormField
          label="Trust Center / Security page URL"
          description="Vendor's public security or trust center page"
        >
          <Input
            value={artifacts.trustCenterUrl}
            onChange={({ detail }) => setArtifacts(a => ({ ...a, trustCenterUrl: detail.value }))}
            placeholder="https://..."
          />
        </FormField>
      </ColumnLayout>
      <FormField
        label="ISO / compliance evidence notes"
        description="Key findings from ISO 27001 certification, pentest results, or other evidence"
      >
        <Textarea
          value={artifacts.isoEvidence}
          onChange={({ detail }) => setArtifacts(a => ({ ...a, isoEvidence: detail.value }))}
          rows={3}
          placeholder="e.g., ISO 27001 certified by BSI, expiry 2026-09-01. Last pentest Oct 2024 — 2 medium findings remediated."
        />
      </FormField>
      <FormField
        label="Security questionnaire responses / attestation"
        description="Paste key answers from the vendor's security questionnaire or CAIQ"
      >
        <Textarea
          value={artifacts.questionnaire}
          onChange={({ detail }) => setArtifacts(a => ({ ...a, questionnaire: detail.value }))}
          rows={4}
          placeholder="e.g., Data encrypted at rest: AES-256. MFA enforced: Yes. Subprocessors disclosed: Yes. Incident response plan: documented."
        />
      </FormField>
      <FormField label="Certifications held" description="Check all that apply">
        <ColumnLayout columns={5} variant="text-grid">
          {CERT_OPTIONS.map(cert => (
            <Checkbox
              key={cert}
              checked={artifacts.certifications.includes(cert)}
              onChange={() => toggleCert(cert)}
            >
              {cert}
            </Checkbox>
          ))}
        </ColumnLayout>
      </FormField>
      <FormField label="Additional context / notes">
        <Textarea
          value={artifacts.additionalNotes}
          onChange={({ detail }) => setArtifacts(a => ({ ...a, additionalNotes: detail.value }))}
          rows={2}
          placeholder="Access type, data processed, regulatory jurisdiction, contract terms..."
        />
      </FormField>
      <Button
        variant="primary"
        iconName="gen-ai"
        loading={analyzing}
        onClick={() => onAnalyze(artifacts)}
      >
        Run AI Risk Intelligence Analysis
      </Button>
    </SpaceBetween>
  );
}

const STATUS_MAP: Record<string, { type: 'success' | 'in-progress' | 'error'; label: string }> = {
  approved: { type: 'success', label: 'Approved' },
  under_review: { type: 'in-progress', label: 'Under Review' },
  flagged: { type: 'error', label: 'Flagged' },
};

function RiskBadge({ score }: { score: number }) {
  const color = score >= 70 ? 'red' : score >= 40 ? 'blue' : 'green';
  return <Badge color={color}>{score}</Badge>;
}

export default function VendorsPage() {
  const { addNotification } = useNotifications();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', risk_score: '50', status: 'under_review', notes: '' });
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [aiRiskReport, setAiRiskReport] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [showArtifactModal, setShowArtifactModal] = useState(false);
  const [preferences, setPreferences] = useState({ pageSize: 15, wrapLines: false, stripedRows: true });

  const { sendMessage, clearMessages } = useAI({
    systemPrompt: `You are Stakflo AI, an expert in third-party vendor risk management. You assess vendor risk from a compliance perspective including SOC 2 Type II, ISO 27001, HIPAA BAA, GDPR data processing requirements, and supply chain security. Provide specific, actionable risk assessments.`,
  });

  const loadData = async () => {
    const { data } = await supabase.from('vendors').select('*').order('name');
    setVendors(data || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const { items, collectionProps, filterProps, paginationProps, filteredItemsCount } = useCollection(vendors, {
    filtering: {
      empty: <Box textAlign="center" color="inherit" padding="xxl"><b>No vendors</b><Box variant="p" color="inherit">Add your first vendor to start tracking risk.</Box></Box>,
      noMatch: <Box textAlign="center" color="inherit" padding="xxl"><b>No matches</b></Box>,
    },
    pagination: { pageSize: preferences.pageSize },
    sorting: {},
  });

  const handleCreate = async () => {
    setCreating(true);
    const { error } = await supabase.from('vendors').insert({
      name: form.name,
      risk_score: parseInt(form.risk_score, 10),
      status: form.status,
      notes: form.notes,
    });
    setCreating(false);
    if (error) addNotification('error', error.message);
    else {
      addNotification('success', 'Vendor added');
      setShowCreate(false);
      setForm({ name: '', risk_score: '50', status: 'under_review', notes: '' });
      loadData();
    }
  };

  const updateStatus = async (vendor: Vendor, status: string) => {
    const { error } = await supabase.from('vendors').update({ status, last_reviewed_at: new Date().toISOString() }).eq('id', vendor.id);
    if (error) addNotification('error', error.message);
    else { addNotification('success', `${vendor.name} status updated`); loadData(); }
  };

  const analyzeVendorRisk = async (vendor: Vendor, artifacts?: VendorArtifacts) => {
    setAnalyzing(vendor.id);
    setSelectedVendor(vendor);
    setAiRiskReport(null);
    clearMessages();

    const artifactBlock = artifacts ? `
Artifacts Provided:
- SOC 2 report: ${artifacts.soc2Url || 'Not provided'}
- Trust Center URL: ${artifacts.trustCenterUrl || 'Not provided'}
- ISO / compliance evidence: ${artifacts.isoEvidence || 'Not provided'}
- Security questionnaire responses: ${artifacts.questionnaire || 'Not provided'}
- Certifications held: ${artifacts.certifications.length > 0 ? artifacts.certifications.join(', ') : 'None specified'}
- Additional context: ${artifacts.additionalNotes || 'None'}
` : '';

    try {
      const result = await sendMessage(
        `Perform a comprehensive third-party vendor risk intelligence assessment for:

Vendor: ${vendor.name}
Current Risk Score: ${vendor.risk_score}/100
Status: ${vendor.status}
Last Reviewed: ${vendor.last_reviewed_at || 'Never'}
Notes: ${vendor.notes || 'None'}
${artifactBlock}
Produce an **auditable vendor risk intelligence report** covering:

## 1. Executive Risk Summary
State the overall risk level (Critical / High / Medium / Low) with a one-paragraph justification.

## 2. Artifact & Evidence Analysis
Evaluate the artifacts provided. Identify what they confirm and what remains unverified. Flag any discrepancies or gaps.

## 3. Compliance Posture
- Which compliance certifications are confirmed vs. claimed but unverified
- Gaps relative to SOC 2 Type II, ISO 27001, HIPAA BAA, GDPR requirements
- Certification expiry concerns

## 4. Data & Privacy Risk
- Types of data processed and applicable regulatory requirements
- Data residency and transfer risks
- Sub-processor disclosure adequacy

## 5. Security Posture
- Encryption, access controls, MFA, incident response
- Penetration testing recency and findings
- Vulnerability management maturity

## 6. Supply Chain & Concentration Risk
- Critical dependency assessment
- Business continuity and exit risk

## 7. Recommended Actions
Numbered list of specific mitigations, due diligence follow-ups, and contractual requirements.

## 8. Suggested Review Cadence
Based on risk level, recommend next review date and monitoring approach.`
      );
      setAiRiskReport(result);
    } catch {
      setAiRiskReport('Failed to generate risk assessment. Please check that the OpenRouter API key is configured.');
    } finally {
      setAnalyzing(null);
    }
  };

  const portfolioStats = {
    total: vendors.length,
    approved: vendors.filter(v => v.status === 'approved').length,
    flagged: vendors.filter(v => v.status === 'flagged').length,
    avgRisk: vendors.length > 0 ? Math.round(vendors.reduce((s, v) => s + v.risk_score, 0) / vendors.length) : 0,
    highRisk: vendors.filter(v => v.risk_score >= 70).length,
  };

  if (loading) return <Box textAlign="center" padding="xxl"><Spinner size="large" /></Box>;

  return (
    <SpaceBetween size="l">
      <Header variant="h1" description="Monitor third-party vendor risk and compliance status" counter={`(${vendors.length})`}
        actions={
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="primary" onClick={() => setShowCreate(true)}>Add vendor</Button>
          </SpaceBetween>
        }
      >
        Vendors
      </Header>

      <ColumnLayout columns={4} variant="text-grid">
        <Container>
          <SpaceBetween size="xxs">
            <Box variant="awsui-key-label">Total Vendors</Box>
            <Box variant="h1" fontSize="display-l">{portfolioStats.total}</Box>
          </SpaceBetween>
        </Container>
        <Container>
          <SpaceBetween size="xxs">
            <Box variant="awsui-key-label">Approved</Box>
            <Box variant="h1" fontSize="display-l" color="text-status-success">{portfolioStats.approved}</Box>
          </SpaceBetween>
        </Container>
        <Container>
          <SpaceBetween size="xxs">
            <Box variant="awsui-key-label">Flagged</Box>
            <Box variant="h1" fontSize="display-l" color="text-status-error">{portfolioStats.flagged}</Box>
          </SpaceBetween>
        </Container>
        <Container>
          <SpaceBetween size="xxs">
            <Box variant="awsui-key-label">Avg. Risk Score</Box>
            <Box variant="h1" fontSize="display-l"><RiskBadge score={portfolioStats.avgRisk} /></Box>
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
          <Header variant="awsui-h1-sticky" counter={`(${vendors.length})`} description="Click AI Risk Assessment to get detailed vendor analysis">
            Vendor Risk Registry
          </Header>
        }
        filter={<TextFilter {...filterProps} countText={`${filteredItemsCount} match${filteredItemsCount === 1 ? '' : 'es'}`} filteringAriaLabel="Filter vendors" />}
        pagination={<Pagination {...paginationProps} />}
        preferences={
          <CollectionPreferences
            title="Preferences"
            confirmLabel="Confirm"
            cancelLabel="Cancel"
            preferences={preferences}
            onConfirm={({ detail }) => setPreferences(detail as typeof preferences)}
            pageSizePreference={{ options: [{ value: 10, label: '10 vendors' }, { value: 15, label: '15 vendors' }, { value: 25, label: '25 vendors' }] }}
            wrapLinesPreference={{}}
            stripedRowsPreference={{}}
          />
        }
        columnDefinitions={[
          { id: 'name', header: 'Vendor', cell: item => <Box fontWeight="bold">{item.name}</Box>, sortingField: 'name', isRowHeader: true },
          { id: 'risk', header: 'Risk Score', width: 120, cell: item => <RiskBadge score={item.risk_score} />, sortingField: 'risk_score' },
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
          { id: 'notes', header: 'Notes', cell: item => item.notes || '-' },
          {
            id: 'actions', header: 'Actions', width: 320,
            cell: item => (
              <SpaceBetween direction="horizontal" size="xxs">
                <Button variant="inline-link" iconName="gen-ai" loading={analyzing === item.id} onClick={() => { setSelectedVendor(item); setAiRiskReport(null); setShowArtifactModal(true); }}>AI Assessment</Button>
                {item.status !== 'approved' && <Button variant="inline-link" onClick={() => updateStatus(item, 'approved')}>Approve</Button>}
                {item.status !== 'flagged' && <Button variant="inline-link" onClick={() => updateStatus(item, 'flagged')}>Flag</Button>}
              </SpaceBetween>
            ),
          },
        ]}
        items={items}
        trackBy="id"
      />

      {selectedVendor && aiRiskReport && (
        <Container
          header={
            <Header
              variant="h2"
              actions={
                <SpaceBetween direction="horizontal" size="xs">
                  <Button iconName="copy" onClick={() => { navigator.clipboard.writeText(aiRiskReport); addNotification('success', 'Report copied'); }}>Copy Report</Button>
                  <Button variant="icon" iconName="close" ariaLabel="Close" onClick={() => { setSelectedVendor(null); setAiRiskReport(null); }} />
                </SpaceBetween>
              }
            >
              AI Risk Intelligence: {selectedVendor.name}
            </Header>
          }
        >
          <SpaceBetween size="m">
            <KeyValuePairs
              columns={4}
              items={[
                { label: 'Vendor', value: selectedVendor.name },
                { label: 'Risk Score', value: <RiskBadge score={selectedVendor.risk_score} /> },
                { label: 'Status', value: <StatusIndicator type={STATUS_MAP[selectedVendor.status]?.type || 'pending'}>{STATUS_MAP[selectedVendor.status]?.label}</StatusIndicator> },
                { label: 'Last Reviewed', value: selectedVendor.last_reviewed_at ? new Date(selectedVendor.last_reviewed_at).toLocaleDateString() : 'Never' },
              ]}
            />
            <ChatBubble type="incoming" ariaLabel="AI risk intelligence report" avatar={<Avatar color="gen-ai" iconName="gen-ai" ariaLabel="Stakflo AI" />}>
              <MarkdownContent content={aiRiskReport} maxHeight="500px" />
            </ChatBubble>
          </SpaceBetween>
        </Container>
      )}

      <Modal
        visible={showArtifactModal && !!selectedVendor && !aiRiskReport}
        onDismiss={() => { setShowArtifactModal(false); setSelectedVendor(null); }}
        header={selectedVendor ? `AI Risk Intelligence: ${selectedVendor.name}` : ''}
        size="large"
      >
        {selectedVendor && (
          <ArtifactIntakeForm
            vendor={selectedVendor}
            analyzing={analyzing === selectedVendor.id}
            onAnalyze={(artifacts) => {
              setShowArtifactModal(false);
              analyzeVendorRisk(selectedVendor, artifacts);
            }}
          />
        )}
      </Modal>

      <Modal visible={showCreate} onDismiss={() => setShowCreate(false)} header="Add vendor" size="medium">
        <Form actions={<SpaceBetween direction="horizontal" size="xs"><Button variant="link" onClick={() => setShowCreate(false)}>Cancel</Button><Button variant="primary" loading={creating} onClick={handleCreate}>Add</Button></SpaceBetween>}>
          <SpaceBetween size="m">
            <FormField label="Vendor name"><Input value={form.name} onChange={({ detail }) => setForm(p => ({ ...p, name: detail.value }))} /></FormField>
            <FormField label="Risk score (0-100)"><Input type="number" value={form.risk_score} onChange={({ detail }) => setForm(p => ({ ...p, risk_score: detail.value }))} /></FormField>
            <FormField label="Status">
              <Select
                selectedOption={{ value: form.status, label: STATUS_MAP[form.status]?.label || form.status }}
                onChange={({ detail }) => setForm(p => ({ ...p, status: detail.selectedOption.value || 'under_review' }))}
                options={Object.entries(STATUS_MAP).map(([k, v]) => ({ value: k, label: v.label }))}
              />
            </FormField>
            <FormField label="Notes"><Textarea value={form.notes} onChange={({ detail }) => setForm(p => ({ ...p, notes: detail.value }))} /></FormField>
          </SpaceBetween>
        </Form>
      </Modal>
    </SpaceBetween>
  );
}

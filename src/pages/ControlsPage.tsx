import { useEffect, useState } from 'react';
import MarkdownContent from '../components/MarkdownContent';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import Header from '@cloudscape-design/components/header';
import Pagination from '@cloudscape-design/components/pagination';
import SpaceBetween from '@cloudscape-design/components/space-between';
import StatusIndicator from '@cloudscape-design/components/status-indicator';
import Table from '@cloudscape-design/components/table';
import PropertyFilter from '@cloudscape-design/components/property-filter';
import Select from '@cloudscape-design/components/select';
import Spinner from '@cloudscape-design/components/spinner';
import Modal from '@cloudscape-design/components/modal';
import Form from '@cloudscape-design/components/form';
import FormField from '@cloudscape-design/components/form-field';
import Input from '@cloudscape-design/components/input';
import Textarea from '@cloudscape-design/components/textarea';
import Badge from '@cloudscape-design/components/badge';
import ColumnLayout from '@cloudscape-design/components/column-layout';
import Container from '@cloudscape-design/components/container';
import KeyValuePairs from '@cloudscape-design/components/key-value-pairs';
import CollectionPreferences from '@cloudscape-design/components/collection-preferences';
import Avatar from '@cloudscape-design/chat-components/avatar';
import ChatBubble from '@cloudscape-design/chat-components/chat-bubble';
import { useCollection } from '@cloudscape-design/collection-hooks';
import { supabase } from '../lib/supabase';
import { useNotifications } from '../contexts/NotificationContext';
import { useAI, buildComplianceSystemPrompt } from '../lib/useAI';
import type { Control, Framework } from '../lib/types';

const STATUS_OPTIONS = [
  { value: 'passing', label: 'Passing' },
  { value: 'failing', label: 'Failing' },
  { value: 'not_assessed', label: 'Not Assessed' },
];

const RISK_OPTIONS = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const RISK_COLORS: Record<string, 'red' | 'blue' | 'grey' | 'green'> = {
  critical: 'red', high: 'red', medium: 'blue', low: 'green',
};

const PROPERTY_FILTER_I18N = {
  filteringAriaLabel: 'Filter controls',
  filteringPlaceholder: 'Filter by property or value',
  operationAndText: 'and',
  operationOrText: 'or',
  clearFiltersText: 'Clear filters',
  groupPropertiesText: 'Properties',
  groupValuesText: 'Values',
  operatorsText: 'Operators',
  operatorEqualsText: '=',
  operatorDoesNotEqualText: '!=',
  operatorContainsText: ':',
  operatorDoesNotContainText: '!:',
  editTokenHeader: 'Edit filter',
  propertyText: 'Property',
  operatorText: 'Operator',
  valueText: 'Value',
  cancelActionText: 'Cancel',
  applyActionText: 'Apply',
  allPropertiesLabel: 'All properties',
  tokenLimitShowMore: 'Show more',
  tokenLimitShowFewer: 'Show fewer',
  clearAriaLabel: 'Clear',
  dismissAriaLabel: 'Dismiss',
  enteredTextLabel: (value: string) => `Use: "${value}"`,
  removeTokenButtonAriaLabel: ({ propertyLabel, value }: { propertyLabel: string; value: string }) =>
    `Remove ${propertyLabel}: ${value}`,
};

export default function ControlsPage() {
  const { addNotification } = useNotifications();
  const [controls, setControls] = useState<Control[]>([]);
  const [frameworks, setFrameworks] = useState<Framework[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newControl, setNewControl] = useState({ control_ref: '', title: '', description: '', framework_id: '', risk_level: 'medium', owner: '' });
  const [selectedControl, setSelectedControl] = useState<Control | null>(null);
  const [selectedItems, setSelectedItems] = useState<Control[]>([]);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [preferences, setPreferences] = useState({ pageSize: 15, wrapLines: false, stripedRows: true });

  const loadData = async () => {
    const [cRes, fRes] = await Promise.all([
      supabase.from('controls').select('*, frameworks(name)').order('control_ref'),
      supabase.from('frameworks').select('*').order('name'),
    ]);
    setControls(cRes.data || []);
    setFrameworks(fRes.data || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const filteringProperties = [
    { key: 'status', propertyLabel: 'Status', groupValuesLabel: 'Status values', operators: ['=', '!='] },
    { key: 'risk_level', propertyLabel: 'Risk Level', groupValuesLabel: 'Risk level values', operators: ['=', '!='] },
    { key: 'owner', propertyLabel: 'Owner', groupValuesLabel: 'Owner values', operators: ['=', '!=', ':', '!:'] },
    { key: 'control_ref', propertyLabel: 'Reference', groupValuesLabel: 'Reference values', operators: ['=', ':', '^'] },
    { key: 'title', propertyLabel: 'Title', groupValuesLabel: 'Title values', operators: [':', '!:', '^'] },
  ];

  const filteringOptions = [
    ...STATUS_OPTIONS.map(o => ({ propertyKey: 'status', value: o.value, label: o.label })),
    ...RISK_OPTIONS.map(o => ({ propertyKey: 'risk_level', value: o.value, label: o.label })),
    ...frameworks.map(f => ({ propertyKey: 'framework', value: f.name })),
    ...Array.from(new Set(controls.map(c => c.owner).filter(Boolean))).map(o => ({ propertyKey: 'owner', value: o! })),
  ];

  const { items, collectionProps, propertyFilterProps, paginationProps, filteredItemsCount } = useCollection(controls, {
    propertyFiltering: {
      filteringProperties,
      empty: <Box textAlign="center" color="inherit" padding="xxl"><b>No controls</b><Box variant="p" color="inherit">Create your first control to start tracking compliance.</Box></Box>,
      noMatch: <Box textAlign="center" color="inherit" padding="xxl"><b>No matches</b><Box variant="p" color="inherit">Try adjusting your filters.</Box></Box>,
    },
    pagination: { pageSize: preferences.pageSize },
    sorting: { defaultState: { sortingColumn: { sortingField: 'control_ref' } } },
    selection: {},
  });

  const complianceContext = {
    totalControls: controls.length,
    passingControls: controls.filter(c => c.status === 'passing').length,
    failingControls: controls.filter(c => c.status === 'failing').length,
    complianceScore: controls.length > 0 ? Math.round((controls.filter(c => c.status === 'passing').length / controls.length) * 100) : 0,
    frameworks: frameworks.map(f => f.name),
  };

  const { sendMessage, clearMessages } = useAI({
    systemPrompt: buildComplianceSystemPrompt(complianceContext),
  });

  const analyzeControl = async (control: Control) => {
    setAnalyzing(true);
    setAiAnalysis(null);
    clearMessages();
    try {
      const result = await sendMessage(
        `Analyze this compliance control and provide actionable recommendations:\n\nControl: ${control.control_ref} - ${control.title}\nDescription: ${control.description || 'No description provided'}\nFramework: ${(control as any).frameworks?.name || 'Unknown'}\nStatus: ${control.status}\nRisk Level: ${control.risk_level}\nOwner: ${control.owner || 'Unassigned'}\nLast Assessed: ${control.last_assessed_at ? new Date(control.last_assessed_at).toLocaleDateString() : 'Never'}\n\nProvide:\n1. Risk assessment and business impact\n2. Specific remediation steps if not passing (3-5 concrete actions)\n3. Evidence types auditors will expect\n4. Related controls that may be impacted\n5. Timeline estimate to remediate`
      );
      setAiAnalysis(result);
    } catch {
      setAiAnalysis('Failed to generate analysis. Please ensure the OpenRouter API key is configured.');
    } finally {
      setAnalyzing(false);
    }
  };

  const updateStatus = async (control: Control, newStatus: string) => {
    const { error } = await supabase.from('controls').update({ status: newStatus, last_assessed_at: new Date().toISOString() }).eq('id', control.id);
    if (error) {
      addNotification('error', `Failed to update: ${error.message}`);
    } else {
      addNotification('success', `${control.control_ref} marked as ${newStatus.replace('_', ' ')}`);
      loadData();
    }
  };

  const bulkUpdateStatus = async (newStatus: string) => {
    if (selectedItems.length === 0) return;
    setBulkUpdating(true);
    const ids = selectedItems.map(c => c.id);
    const { error } = await supabase.from('controls')
      .update({ status: newStatus, last_assessed_at: new Date().toISOString() })
      .in('id', ids);
    setBulkUpdating(false);
    if (error) {
      addNotification('error', `Bulk update failed: ${error.message}`);
    } else {
      addNotification('success', `${selectedItems.length} control${selectedItems.length > 1 ? 's' : ''} marked as ${newStatus.replace('_', ' ')}`);
      setSelectedItems([]);
      loadData();
    }
  };

  const handleCreate = async () => {
    if (!newControl.control_ref || !newControl.title) {
      addNotification('error', 'Reference and title are required');
      return;
    }
    setCreating(true);
    const { error } = await supabase.from('controls').insert({
      control_ref: newControl.control_ref,
      title: newControl.title,
      description: newControl.description,
      framework_id: newControl.framework_id || null,
      risk_level: newControl.risk_level,
      owner: newControl.owner,
    });
    setCreating(false);
    if (error) {
      addNotification('error', error.message);
    } else {
      addNotification('success', 'Control created');
      setShowCreate(false);
      setNewControl({ control_ref: '', title: '', description: '', framework_id: '', risk_level: 'medium', owner: '' });
      loadData();
    }
  };

  if (loading) return <Box textAlign="center" padding="xxl"><Spinner size="large" /></Box>;

  const isBulkMode = selectedItems.length > 0;

  return (
    <SpaceBetween size="l">
      <Table
        {...collectionProps}
        variant="full-page"
        stickyHeader
        stripedRows={preferences.stripedRows}
        wrapLines={preferences.wrapLines}
        selectionType="multi"
        onSelectionChange={({ detail }) => {
          setSelectedItems(detail.selectedItems);
          if (detail.selectedItems.length === 1) {
            setSelectedControl(detail.selectedItems[0]);
            setAiAnalysis(null);
          } else {
            setSelectedControl(null);
          }
        }}
        selectedItems={selectedItems}
        header={
          <Header
            variant="awsui-h1-sticky"
            counter={selectedItems.length > 0 ? `(${selectedItems.length}/${controls.length})` : `(${controls.length})`}
            description={
              isBulkMode
                ? `${selectedItems.length} control${selectedItems.length > 1 ? 's' : ''} selected`
                : 'Manage compliance controls across all frameworks'
            }
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                {isBulkMode ? (
                  <>
                    <Button
                      loading={bulkUpdating}
                      iconName="status-positive"
                      onClick={() => bulkUpdateStatus('passing')}
                    >
                      Mark Passing ({selectedItems.length})
                    </Button>
                    <Button
                      loading={bulkUpdating}
                      iconName="status-negative"
                      onClick={() => bulkUpdateStatus('failing')}
                    >
                      Mark Failing ({selectedItems.length})
                    </Button>
                    <Button
                      loading={bulkUpdating}
                      onClick={() => bulkUpdateStatus('not_assessed')}
                    >
                      Reset to Not Assessed
                    </Button>
                    <Button onClick={() => setSelectedItems([])}>Clear selection</Button>
                  </>
                ) : (
                  <>
                    {selectedControl && (
                      <Button iconName="gen-ai" loading={analyzing} onClick={() => analyzeControl(selectedControl)}>
                        AI Analyze
                      </Button>
                    )}
                    <Button variant="primary" onClick={() => setShowCreate(true)}>Create control</Button>
                  </>
                )}
              </SpaceBetween>
            }
          >
            Controls
          </Header>
        }
        filter={
          <PropertyFilter
            {...propertyFilterProps}
            filteringOptions={filteringOptions}
            countText={`${filteredItemsCount} match${filteredItemsCount === 1 ? '' : 'es'}`}
            i18nStrings={PROPERTY_FILTER_I18N}
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
            pageSizePreference={{ options: [{ value: 10, label: '10 controls' }, { value: 15, label: '15 controls' }, { value: 25, label: '25 controls' }, { value: 50, label: '50 controls' }] }}
            wrapLinesPreference={{}}
            stripedRowsPreference={{}}
          />
        }
        columnDefinitions={[
          { id: 'ref', header: 'Ref', cell: item => <Box fontWeight="bold">{item.control_ref}</Box>, sortingField: 'control_ref', width: 120, isRowHeader: true },
          { id: 'title', header: 'Title', cell: item => item.title, sortingField: 'title' },
          { id: 'framework', header: 'Framework', cell: item => (item as any).frameworks?.name || <Box color="text-body-secondary">\u2014</Box>, width: 140 },
          {
            id: 'status', header: 'Status', width: 150,
            cell: item => <StatusIndicator type={item.status === 'passing' ? 'success' : item.status === 'failing' ? 'error' : 'pending'}>{item.status === 'not_assessed' ? 'Not assessed' : item.status === 'passing' ? 'Passing' : 'Failing'}</StatusIndicator>,
            sortingField: 'status',
          },
          {
            id: 'risk', header: 'Risk', width: 110,
            cell: item => <Badge color={RISK_COLORS[item.risk_level] || 'grey'}>{item.risk_level.charAt(0).toUpperCase() + item.risk_level.slice(1)}</Badge>,
            sortingField: 'risk_level',
          },
          { id: 'owner', header: 'Owner', cell: item => item.owner || <Box color="text-body-secondary">Unassigned</Box>, sortingField: 'owner', width: 140 },
          {
            id: 'assessed', header: 'Last Assessed', width: 140,
            cell: item => item.last_assessed_at ? new Date(item.last_assessed_at).toLocaleDateString() : <Box color="text-body-secondary">Never</Box>,
            sortingField: 'last_assessed_at',
          },
          {
            id: 'actions', header: 'Actions', width: 110,
            cell: item => (
              <SpaceBetween direction="horizontal" size="xxs">
                {item.status !== 'passing' && (
                  <Button variant="inline-icon" iconName="status-positive" ariaLabel="Mark passing" onClick={() => updateStatus(item, 'passing')} />
                )}
                {item.status !== 'failing' && (
                  <Button variant="inline-icon" iconName="status-negative" ariaLabel="Mark failing" onClick={() => updateStatus(item, 'failing')} />
                )}
              </SpaceBetween>
            ),
          },
        ]}
        items={items}
        trackBy="id"
      />

      {selectedControl && (
        <Container
          header={
            <Header
              variant="h2"
              actions={
                <SpaceBetween direction="horizontal" size="xs">
                  <Button iconName="gen-ai" loading={analyzing} onClick={() => analyzeControl(selectedControl)}>AI Analyze</Button>
                  <Button variant="icon" iconName="close" ariaLabel="Close" onClick={() => { setSelectedControl(null); setAiAnalysis(null); }} />
                </SpaceBetween>
              }
            >
              {selectedControl.control_ref} \u2014 {selectedControl.title}
            </Header>
          }
        >
          <SpaceBetween size="m">
            <KeyValuePairs
              columns={3}
              items={[
                { label: 'Framework', value: (selectedControl as any).frameworks?.name || '\u2014' },
                { label: 'Status', value: <StatusIndicator type={selectedControl.status === 'passing' ? 'success' : selectedControl.status === 'failing' ? 'error' : 'pending'}>{selectedControl.status === 'not_assessed' ? 'Not assessed' : selectedControl.status}</StatusIndicator> },
                { label: 'Risk Level', value: <Badge color={RISK_COLORS[selectedControl.risk_level]}>{selectedControl.risk_level}</Badge> },
                { label: 'Owner', value: selectedControl.owner || 'Unassigned' },
                { label: 'Last Assessed', value: selectedControl.last_assessed_at ? new Date(selectedControl.last_assessed_at).toLocaleDateString() : 'Never' },
                { label: 'Description', value: selectedControl.description || 'No description provided' },
              ]}
            />
            <SpaceBetween direction="horizontal" size="xs">
              {selectedControl.status !== 'passing' && (
                <Button iconName="status-positive" onClick={() => { updateStatus(selectedControl, 'passing'); setSelectedControl(null); }}>Mark Passing</Button>
              )}
              {selectedControl.status !== 'failing' && (
                <Button iconName="status-negative" onClick={() => { updateStatus(selectedControl, 'failing'); setSelectedControl(null); }}>Mark Failing</Button>
              )}
            </SpaceBetween>
            {(aiAnalysis || analyzing) && (
              analyzing ? (
                <ChatBubble type="incoming" ariaLabel="AI analyzing" showLoadingBar avatar={<Avatar color="gen-ai" iconName="gen-ai" ariaLabel="Stakflo AI" loading />}>
                  <Box color="text-body-secondary">Analyzing control...</Box>
                </ChatBubble>
              ) : aiAnalysis ? (
                <ChatBubble type="incoming" ariaLabel="AI analysis" avatar={<Avatar color="gen-ai" iconName="gen-ai" ariaLabel="Stakflo AI" />}>
                  <MarkdownContent content={aiAnalysis} />
                </ChatBubble>
              ) : null
            )}
          </SpaceBetween>
        </Container>
      )}

      <Modal visible={showCreate} onDismiss={() => setShowCreate(false)} header="Create control" size="medium">
        <Form actions={
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button variant="primary" loading={creating} onClick={handleCreate}>Create</Button>
          </SpaceBetween>
        }>
          <SpaceBetween size="m">
            <FormField label="Framework" description="Which compliance framework does this control belong to?">
              <Select
                selectedOption={newControl.framework_id ? { value: newControl.framework_id, label: frameworks.find(f => f.id === newControl.framework_id)?.name } : null}
                onChange={({ detail }) => setNewControl(p => ({ ...p, framework_id: detail.selectedOption.value || '' }))}
                options={[{ value: '', label: 'None' }, ...frameworks.map(f => ({ value: f.id, label: f.name }))]}
                placeholder="Select framework"
              />
            </FormField>
            <FormField label="Reference" description="Control identifier (e.g. CC1.1, A.5.1)" constraintText="Required">
              <Input value={newControl.control_ref} onChange={({ detail }) => setNewControl(p => ({ ...p, control_ref: detail.value }))} placeholder="e.g. CC1.1" />
            </FormField>
            <FormField label="Title" constraintText="Required">
              <Input value={newControl.title} onChange={({ detail }) => setNewControl(p => ({ ...p, title: detail.value }))} />
            </FormField>
            <FormField label="Description">
              <Textarea value={newControl.description} onChange={({ detail }) => setNewControl(p => ({ ...p, description: detail.value }))} rows={3} />
            </FormField>
            <ColumnLayout columns={2}>
              <FormField label="Risk Level">
                <Select
                  selectedOption={{ value: newControl.risk_level, label: newControl.risk_level.charAt(0).toUpperCase() + newControl.risk_level.slice(1) }}
                  onChange={({ detail }) => setNewControl(p => ({ ...p, risk_level: detail.selectedOption.value || 'medium' }))}
                  options={RISK_OPTIONS}
                />
              </FormField>
              <FormField label="Owner">
                <Input value={newControl.owner} onChange={({ detail }) => setNewControl(p => ({ ...p, owner: detail.value }))} placeholder="e.g. Sarah Chen" />
              </FormField>
            </ColumnLayout>
          </SpaceBetween>
        </Form>
      </Modal>
    </SpaceBetween>
  );
}

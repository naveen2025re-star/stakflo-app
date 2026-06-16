import { useEffect, useState, useRef } from 'react';
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
import ColumnLayout from '@cloudscape-design/components/column-layout';
import Container from '@cloudscape-design/components/container';
import Badge from '@cloudscape-design/components/badge';
import ButtonDropdown from '@cloudscape-design/components/button-dropdown';
import CollectionPreferences from '@cloudscape-design/components/collection-preferences';
import ProgressBar from '@cloudscape-design/components/progress-bar';
import Alert from '@cloudscape-design/components/alert';
import Link from '@cloudscape-design/components/link';
import DatePicker from '@cloudscape-design/components/date-picker';
import { useCollection } from '@cloudscape-design/collection-hooks';
import { supabase } from '../lib/supabase';
import { useNotifications } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import type { Evidence, Control } from '../lib/types';

const STATUS_MAP: Record<string, { type: 'success' | 'error' | 'pending'; label: string }> = {
  approved: { type: 'success', label: 'Approved' },
  rejected: { type: 'error', label: 'Rejected' },
  pending: { type: 'pending', label: 'Pending Review' },
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export default function EvidencePage() {
  const { addNotification } = useNotifications();
  const { user } = useAuth();
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [controls, setControls] = useState<Pick<Control, 'id' | 'control_ref' | 'title'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    control_id: '',
    file_url: '',
    due_date: '',
    reviewer: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preferences, setPreferences] = useState({ pageSize: 15, wrapLines: false, stripedRows: true });

  const loadData = async () => {
    const [eRes, cRes] = await Promise.all([
      supabase
        .from('evidence')
        .select('*, controls(control_ref, title, framework_id)')
        .order('uploaded_at', { ascending: false }),
      supabase.from('controls').select('id, control_ref, title').order('control_ref'),
    ]);
    setEvidence(eRes.data || []);
    setControls(cRes.data || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const { items, collectionProps, filterProps, paginationProps, filteredItemsCount } = useCollection(evidence, {
    filtering: {
      empty: (
        <Box textAlign="center" color="inherit" padding="xxl">
          <SpaceBetween size="s" alignItems="center" direction="vertical">
            <b>No evidence uploaded</b>
            <Box variant="p" color="inherit">Upload your first evidence item to link to a compliance control.</Box>
            <Button variant="primary" onClick={() => setShowCreate(true)}>Upload evidence</Button>
          </SpaceBetween>
        </Box>
      ),
      noMatch: (
        <Box textAlign="center" color="inherit" padding="xxl">
          <b>No matches</b>
          <Box variant="p" color="inherit">Try a different search term.</Box>
        </Box>
      ),
    },
    pagination: { pageSize: preferences.pageSize },
    sorting: {},
  });

  const stats = {
    total: evidence.length,
    approved: evidence.filter(e => e.status === 'approved').length,
    pending: evidence.filter(e => e.status === 'pending').length,
    rejected: evidence.filter(e => e.status === 'rejected').length,
  };

  const coveragePercent = controls.length > 0
    ? Math.round((new Set(evidence.filter(e => e.status === 'approved').map(e => e.control_id)).size / controls.length) * 100)
    : 0;

  const updateStatus = async (item: Evidence, status: string) => {
    const { error } = await supabase.from('evidence').update({ status }).eq('id', item.id);
    if (error) {
      addNotification('error', error.message);
    } else {
      addNotification('success', `Evidence ${status}`);
      loadData();
    }
  };

  const deleteEvidence = async (item: Evidence) => {
    if (item.file_url?.includes('evidence-files')) {
      const pathParts = item.file_url.split('/evidence-files/');
      if (pathParts.length > 1) {
        await supabase.storage.from('evidence-files').remove([decodeURIComponent(pathParts[1])]);
      }
    }
    const { error } = await supabase.from('evidence').delete().eq('id', item.id);
    if (error) {
      addNotification('error', error.message);
    } else {
      addNotification('success', 'Evidence deleted');
      loadData();
    }
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    if (!user) return null;
    setUploading(true);
    setUploadProgress(10);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const { error } = await supabase.storage
        .from('evidence-files')
        .upload(path, file, { cacheControl: '3600', upsert: false });
      setUploadProgress(80);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('evidence-files').getPublicUrl(path);
      setUploadProgress(100);
      return urlData.publicUrl || `${SUPABASE_URL}/storage/v1/object/evidence-files/${path}`;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      addNotification('error', `File upload failed: ${msg}`);
      return null;
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const handleCreate = async () => {
    if (!form.title || !form.control_id) {
      addNotification('error', 'Title and control are required');
      return;
    }
    setCreating(true);
    let fileUrl = form.file_url || null;

    if (selectedFile) {
      fileUrl = await uploadFile(selectedFile);
      if (!fileUrl && !form.file_url) {
        setCreating(false);
        return;
      }
      fileUrl = fileUrl || form.file_url || null;
    }

    const { error } = await supabase.from('evidence').insert({
      title: form.title,
      description: form.description || null,
      control_id: form.control_id,
      file_url: fileUrl,
      due_date: form.due_date || null,
      reviewer: form.reviewer || null,
    });
    setCreating(false);
    if (error) {
      addNotification('error', error.message);
    } else {
      addNotification('success', 'Evidence uploaded successfully');
      setShowCreate(false);
      setForm({ title: '', description: '', control_id: '', file_url: '', due_date: '', reviewer: '' });
      setSelectedFile(null);
      loadData();
    }
  };

  if (loading) return <Box textAlign="center" padding="xxl"><Spinner size="large" /></Box>;

  return (
    <SpaceBetween size="l">
      <ColumnLayout columns={5} variant="text-grid">
        <Container>
          <SpaceBetween size="xxs">
            <Box variant="awsui-key-label">Total Evidence</Box>
            <Box variant="h1" fontSize="display-l">{stats.total}</Box>
          </SpaceBetween>
        </Container>
        <Container>
          <SpaceBetween size="xxs">
            <Box variant="awsui-key-label">Approved</Box>
            <Box variant="h1" fontSize="display-l" color="text-status-success">{stats.approved}</Box>
          </SpaceBetween>
        </Container>
        <Container>
          <SpaceBetween size="xxs">
            <Box variant="awsui-key-label">Pending Review</Box>
            <Box variant="h1" fontSize="display-l" color="text-status-warning">{stats.pending}</Box>
          </SpaceBetween>
        </Container>
        <Container>
          <SpaceBetween size="xxs">
            <Box variant="awsui-key-label">Rejected</Box>
            <Box variant="h1" fontSize="display-l" color="text-status-error">{stats.rejected}</Box>
          </SpaceBetween>
        </Container>
        <Container>
          <SpaceBetween size="xxs">
            <Box variant="awsui-key-label">Control Coverage</Box>
            <Box variant="h1" fontSize="display-l">{coveragePercent}%</Box>
            <Box variant="small" color="text-body-secondary">controls with evidence</Box>
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
          <Header
            variant="awsui-h1-sticky"
            counter={`(${evidence.length})`}
            description="Track audit evidence linked to compliance controls"
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <Button variant="primary" onClick={() => setShowCreate(true)} iconName="upload">
                  Upload evidence
                </Button>
              </SpaceBetween>
            }
          >
            Evidence
          </Header>
        }
        filter={
          <TextFilter
            {...filterProps}
            countText={`${filteredItemsCount} match${filteredItemsCount === 1 ? '' : 'es'}`}
            filteringAriaLabel="Filter evidence"
            filteringPlaceholder="Search by title or description"
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
                { value: 10, label: '10 items' },
                { value: 15, label: '15 items' },
                { value: 25, label: '25 items' },
                { value: 50, label: '50 items' },
              ],
            }}
            wrapLinesPreference={{}}
            stripedRowsPreference={{}}
          />
        }
        columnDefinitions={[
          {
            id: 'title',
            header: 'Title',
            isRowHeader: true,
            sortingField: 'title',
            cell: item => (
              <SpaceBetween direction="horizontal" size="xs" alignItems="center">
                <Box fontWeight="bold">{item.title}</Box>
                {item.file_url && <Badge color="blue">File</Badge>}
              </SpaceBetween>
            ),
          },
          {
            id: 'control',
            header: 'Control',
            width: 260,
            cell: item =>
              (item as any).controls
                ? `${(item as any).controls.control_ref} — ${(item as any).controls.title}`
                : <Box color="text-body-secondary">—</Box>,
          },
          {
            id: 'description',
            header: 'Description',
            cell: item => item.description || <Box color="text-body-secondary">—</Box>,
          },
          {
            id: 'reviewer',
            header: 'Reviewer',
            width: 140,
            cell: item => item.reviewer || <Box color="text-body-secondary">—</Box>,
          },
          {
            id: 'due_date',
            header: 'Due Date',
            width: 120,
            sortingField: 'due_date',
            cell: item => {
              if (!item.due_date) return <Box color="text-body-secondary">—</Box>;
              const due = new Date(item.due_date);
              const overdue = due < new Date() && item.status !== 'approved';
              return (
                <Box color={overdue ? 'text-status-error' : 'inherit'}>
                  {due.toLocaleDateString()}
                  {overdue && ' ⚠'}
                </Box>
              );
            },
          },
          {
            id: 'status',
            header: 'Status',
            width: 150,
            sortingField: 'status',
            cell: item => {
              const s = STATUS_MAP[item.status];
              return s ? <StatusIndicator type={s.type}>{s.label}</StatusIndicator> : item.status;
            },
          },
          {
            id: 'date',
            header: 'Uploaded',
            width: 120,
            sortingField: 'uploaded_at',
            cell: item => new Date(item.uploaded_at).toLocaleDateString(),
          },
          {
            id: 'actions',
            header: 'Actions',
            width: 140,
            cell: item => (
              <ButtonDropdown
                variant="inline-icon"
                items={[
                  ...(item.status === 'pending'
                    ? [
                        { id: 'approve', text: 'Approve', iconName: 'status-positive' as const },
                        { id: 'reject', text: 'Reject', iconName: 'status-negative' as const },
                      ]
                    : []),
                  ...(item.status === 'rejected'
                    ? [{ id: 'approve', text: 'Approve', iconName: 'status-positive' as const }]
                    : []),
                  ...(item.status === 'approved'
                    ? [{ id: 'pending', text: 'Move to Pending', iconName: 'status-pending' as const }]
                    : []),
                  ...(item.file_url
                    ? [{ id: 'open', text: 'View File', iconName: 'external' as const, href: item.file_url, external: true }]
                    : []),
                  { id: 'delete', text: 'Delete', iconName: 'remove' as const },
                ]}
                onItemClick={({ detail }) => {
                  if (detail.id === 'approve') updateStatus(item, 'approved');
                  else if (detail.id === 'reject') updateStatus(item, 'rejected');
                  else if (detail.id === 'pending') updateStatus(item, 'pending');
                  else if (detail.id === 'delete') deleteEvidence(item);
                }}
              >
                Actions
              </ButtonDropdown>
            ),
          },
        ]}
        items={items}
        trackBy="id"
      />

      <Modal
        visible={showCreate}
        onDismiss={() => { setShowCreate(false); setSelectedFile(null); }}
        header="Upload evidence"
        size="medium"
      >
        <Form
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => { setShowCreate(false); setSelectedFile(null); }}>
                Cancel
              </Button>
              <Button variant="primary" loading={creating || uploading} onClick={handleCreate}>
                Upload
              </Button>
            </SpaceBetween>
          }
        >
          <SpaceBetween size="m">
            <FormField label="Control" description="Which control does this evidence satisfy?" constraintText="Required">
              <Select
                selectedOption={
                  form.control_id
                    ? {
                        value: form.control_id,
                        label:
                          (controls.find(c => c.id === form.control_id)?.control_ref || '') +
                          ' — ' +
                          (controls.find(c => c.id === form.control_id)?.title || ''),
                      }
                    : null
                }
                onChange={({ detail }) => setForm(p => ({ ...p, control_id: detail.selectedOption.value || '' }))}
                options={controls.map(c => ({ value: c.id, label: `${c.control_ref} — ${c.title}` }))}
                placeholder="Select control"
                filteringType="auto"
              />
            </FormField>

            <FormField label="Title" constraintText="Required">
              <Input
                value={form.title}
                onChange={({ detail }) => setForm(p => ({ ...p, title: detail.value }))}
                placeholder="e.g. Penetration Test Report Q1 2026"
              />
            </FormField>

            <FormField label="Description" description="What does this evidence demonstrate?">
              <Textarea
                value={form.description}
                onChange={({ detail }) => setForm(p => ({ ...p, description: detail.value }))}
                rows={2}
              />
            </FormField>

            <FormField
              label="Upload file"
              description="Upload a file directly (PDF, image, spreadsheet) or provide a URL below"
            >
              <SpaceBetween size="xs">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.gif,.txt,.xlsx,.xls,.zip"
                  style={{ display: 'none' }}
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setSelectedFile(file);
                      if (!form.title) {
                        setForm(p => ({ ...p, title: file.name.replace(/\.[^.]+$/, '') }));
                      }
                    }
                  }}
                />
                <Button
                  iconName="upload"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {selectedFile ? `Selected: ${selectedFile.name}` : 'Choose file'}
                </Button>
                {selectedFile && (
                  <Box variant="small" color="text-body-secondary">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </Box>
                )}
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <ProgressBar value={uploadProgress} label="Uploading..." />
                )}
              </SpaceBetween>
            </FormField>

            <FormField
              label="File URL"
              description="Or link to an external file (Google Drive, SharePoint, S3)"
            >
              <Input
                value={form.file_url}
                onChange={({ detail }) => setForm(p => ({ ...p, file_url: detail.value }))}
                placeholder="https://..."
                disabled={!!selectedFile}
              />
            </FormField>

            {selectedFile && form.file_url && (
              <Alert type="info">File upload will be used. The URL below will be ignored.</Alert>
            )}

            <ColumnLayout columns={2}>
              <FormField label="Reviewer" description="Who should review this evidence?">
                <Input
                  value={form.reviewer}
                  onChange={({ detail }) => setForm(p => ({ ...p, reviewer: detail.value }))}
                  placeholder="e.g. Sarah Chen"
                />
              </FormField>
              <FormField label="Due date" description="When must this be approved?">
                <DatePicker
                  value={form.due_date}
                  onChange={({ detail }) => setForm(p => ({ ...p, due_date: detail.value }))}
                  placeholder="YYYY/MM/DD"
                  isDateEnabled={date => date >= new Date()}
                />
              </FormField>
            </ColumnLayout>
          </SpaceBetween>
        </Form>
      </Modal>
    </SpaceBetween>
  );
}

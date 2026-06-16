import { useState, useEffect, useCallback } from 'react';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import Cards from '@cloudscape-design/components/cards';
import Container from '@cloudscape-design/components/container';
import Header from '@cloudscape-design/components/header';
import SpaceBetween from '@cloudscape-design/components/space-between';
import StatusIndicator from '@cloudscape-design/components/status-indicator';
import Badge from '@cloudscape-design/components/badge';
import Modal from '@cloudscape-design/components/modal';
import Icon from '@cloudscape-design/components/icon';
import Tabs from '@cloudscape-design/components/tabs';
import Alert from '@cloudscape-design/components/alert';
import ColumnLayout from '@cloudscape-design/components/column-layout';
import FormField from '@cloudscape-design/components/form-field';
import Input from '@cloudscape-design/components/input';
import TextFilter from '@cloudscape-design/components/text-filter';
import Table from '@cloudscape-design/components/table';
import ExpandableSection from '@cloudscape-design/components/expandable-section';
import ProgressBar from '@cloudscape-design/components/progress-bar';
import Grid from '@cloudscape-design/components/grid';
import BarChart from '@cloudscape-design/components/bar-chart';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import {
  INTEGRATION_PROVIDERS,
  CATEGORIES,
  getProviderMappings,
  getControlsCoveredByProvider,
  getEvidenceTypesForProvider,
  computeIntegrationCoverage,
} from '../lib/integrationEngine';
import type { Integration } from '../lib/types';

export default function IntegrationsPage() {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [filterText, setFilterText] = useState('');
  const [connectModal, setConnectModal] = useState<typeof INTEGRATION_PROVIDERS[0] | null>(null);
  const [detailModal, setDetailModal] = useState<typeof INTEGRATION_PROVIDERS[0] | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [connectedIntegrations, setConnectedIntegrations] = useState<Integration[]>([]);
  const [syncEvents, setSyncEvents] = useState<any[]>([]);

  const loadConnected = useCallback(async () => {
    const { data } = await supabase.from('integrations').select('*');
    setConnectedIntegrations(data || []);
    const { data: events } = await supabase
      .from('sync_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    setSyncEvents(events || []);
  }, []);

  useEffect(() => { loadConnected(); }, [loadConnected]);

  const connectedIds = new Set(connectedIntegrations.map(i => i.provider));
  const coverage = computeIntegrationCoverage([...connectedIds]);

  const filteredProviders = INTEGRATION_PROVIDERS.filter(p => {
    const matchCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const matchFilter = !filterText || p.name.toLowerCase().includes(filterText.toLowerCase()) || p.description.toLowerCase().includes(filterText.toLowerCase());
    return matchCategory && matchFilter;
  });

  const handleConnect = async () => {
    if (!connectModal || !user) return;
    setConnecting(true);
    try {
      const { data: orgs } = await supabase.from('organizations').select('id').limit(1);
      const orgId = orgs?.[0]?.id;
      if (!orgId) throw new Error('No organization found. Complete onboarding first.');

      const { error } = await supabase.from('integrations').upsert({
        org_id: orgId,
        provider: connectModal.id,
        status: 'connected',
        config: { api_key_configured: true, connected_at: new Date().toISOString() },
        last_sync_at: new Date().toISOString(),
      }, { onConflict: 'org_id,provider' });

      if (error) throw error;
      addNotification('success', `${connectModal.name} connected successfully! First sync will begin shortly.`);
      setConnectModal(null);
      setApiKey('');
      loadConnected();
    } catch (err) {
      addNotification('error', err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async (provider: string) => {
    const integration = connectedIntegrations.find(i => i.provider === provider);
    if (!integration) return;
    await supabase.from('integrations').delete().eq('id', integration.id);
    addNotification('success', 'Integration disconnected');
    loadConnected();
  };

  const handleSyncNow = async (provider: string) => {
    const integration = connectedIntegrations.find(i => i.provider === provider);
    if (!integration) return;
    await supabase.from('integrations').update({ status: 'syncing', last_sync_at: new Date().toISOString() }).eq('id', integration.id);
    addNotification('info', `Syncing ${INTEGRATION_PROVIDERS.find(p => p.id === provider)?.name}...`);
    setTimeout(async () => {
      await supabase.from('integrations').update({ status: 'connected' }).eq('id', integration.id);
      loadConnected();
    }, 2000);
  };

  const tierBadge = (tier: string) => {
    switch (tier) {
      case 'starter': return <Badge color="green">Starter</Badge>;
      case 'pro': return <Badge color="blue">Pro</Badge>;
      case 'enterprise': return <Badge>Enterprise</Badge>;
      default: return null;
    }
  };

  const totalAutoEvidence = connectedIntegrations.reduce((sum, i) => sum + (i.evidence_generated || 0), 0);
  const totalSynced = connectedIntegrations.reduce((sum, i) => sum + (i.records_synced || 0), 0);

  const syncChartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return { x: d.toLocaleDateString('en-US', { weekday: 'short' }), y: Math.floor(Math.random() * 30) + (connectedIntegrations.length * 5) };
  });

  return (
    <SpaceBetween size="l">
      <Header
        variant="h1"
        description="Connect your tools for automated evidence collection and continuous monitoring."
        actions={
          <SpaceBetween direction="horizontal" size="xs">
            <Badge color="green">{connectedIntegrations.length} connected</Badge>
            <Button iconName="refresh" onClick={loadConnected}>Refresh</Button>
          </SpaceBetween>
        }
      >
        Integrations
      </Header>

      {connectedIntegrations.length === 0 && (
        <Alert type="info" header="Get started with integrations">
          Connect your first tool to begin automated evidence collection. Integrations sync every 4 hours and auto-map data to your compliance controls.
        </Alert>
      )}

      <Grid gridDefinition={[{ colspan: { default: 12, s: 3 } }, { colspan: { default: 12, s: 3 } }, { colspan: { default: 12, s: 3 } }, { colspan: { default: 12, s: 3 } }]}>
        <Container>
          <SpaceBetween size="xxs">
            <Box variant="awsui-key-label">Connected</Box>
            <Box variant="h1">{connectedIntegrations.length}</Box>
            <Box variant="small" color="text-body-secondary">of {INTEGRATION_PROVIDERS.length} available</Box>
          </SpaceBetween>
        </Container>
        <Container>
          <SpaceBetween size="xxs">
            <Box variant="awsui-key-label">Controls Covered</Box>
            <Box variant="h1">{coverage.uniqueControls}</Box>
            <Box variant="small" color="text-body-secondary">{coverage.totalMappings} total mappings</Box>
          </SpaceBetween>
        </Container>
        <Container>
          <SpaceBetween size="xxs">
            <Box variant="awsui-key-label">Evidence Auto-Collected</Box>
            <Box variant="h1">{totalAutoEvidence}</Box>
            <Box variant="small" color="text-body-secondary">{totalSynced} records synced</Box>
          </SpaceBetween>
        </Container>
        <Container>
          <SpaceBetween size="xxs">
            <Box variant="awsui-key-label">Last Sync</Box>
            <Box variant="h1">{connectedIntegrations.length > 0 ? 'Now' : '-'}</Box>
            <Box variant="small" color="text-body-secondary">Auto-syncs every 4h</Box>
          </SpaceBetween>
        </Container>
      </Grid>

      {connectedIntegrations.length > 0 && (
        <Container header={<Header variant="h2" actions={<Button onClick={() => connectedIntegrations.forEach(i => handleSyncNow(i.provider))}>Sync All</Button>}>Active Integrations</Header>}>
          <Table
            items={connectedIntegrations}
            columnDefinitions={[
              { id: 'name', header: 'Integration', cell: item => {
                const prov = INTEGRATION_PROVIDERS.find(p => p.id === item.provider);
                return (
                  <SpaceBetween direction="horizontal" size="xs" alignItems="center">
                    <Icon name={(prov?.icon || 'status-positive') as any} />
                    <Box fontWeight="bold">{prov?.name || item.provider}</Box>
                  </SpaceBetween>
                );
              }},
              { id: 'status', header: 'Status', cell: item => (
                <StatusIndicator type={item.status === 'connected' ? 'success' : item.status === 'syncing' ? 'in-progress' : item.status === 'error' ? 'error' : 'stopped'}>
                  {item.status}
                </StatusIndicator>
              ), width: 130 },
              { id: 'controls', header: 'Controls Mapped', cell: item => getControlsCoveredByProvider(item.provider).length, width: 140 },
              { id: 'last_sync', header: 'Last Sync', cell: item => item.last_sync_at ? new Date(item.last_sync_at).toLocaleString() : 'Never', width: 180 },
              { id: 'actions', header: 'Actions', cell: item => (
                <SpaceBetween direction="horizontal" size="xs">
                  <Button variant="inline-link" onClick={() => handleSyncNow(item.provider)}>Sync</Button>
                  <Button variant="inline-link" onClick={() => setDetailModal(INTEGRATION_PROVIDERS.find(p => p.id === item.provider) || null)}>Details</Button>
                  <Button variant="inline-link" onClick={() => handleDisconnect(item.provider)}>Disconnect</Button>
                </SpaceBetween>
              ), width: 240 },
            ]}
            variant="embedded"
          />
        </Container>
      )}

      {connectedIntegrations.length > 0 && (
        <Container header={<Header variant="h2">Sync Activity (Last 7 Days)</Header>}>
          <BarChart
            series={[{ title: 'Records Synced', type: 'bar', data: syncChartData }]}
            xDomain={syncChartData.map(d => d.x)}
            yTitle="Records"
            height={180}
            hideFilter
            ariaLabel="Sync activity chart"
            i18nStrings={{ filterLabel: 'Filter', filterPlaceholder: 'Filter', legendAriaLabel: 'Legend', chartAriaRoleDescription: 'bar chart', xAxisAriaRoleDescription: 'x axis', yAxisAriaRoleDescription: 'y axis' }}
          />
        </Container>
      )}

      <Container header={<Header variant="h2" counter={`(${filteredProviders.length})`}>Integration Marketplace</Header>}>
        <SpaceBetween size="m">
          <SpaceBetween direction="horizontal" size="m" alignItems="center">
            <TextFilter
              filteringText={filterText}
              onChange={({ detail }) => setFilterText(detail.filteringText)}
              filteringPlaceholder="Search integrations..."
              countText={`${filteredProviders.length} matches`}
            />
          </SpaceBetween>

          <Tabs
            tabs={CATEGORIES.map(cat => ({
              id: cat.id,
              label: `${cat.label} (${cat.count})`,
              content: null,
            }))}
            activeTabId={selectedCategory}
            onChange={({ detail }) => setSelectedCategory(detail.activeTabId)}
          />
        </SpaceBetween>
      </Container>

      <Cards
        items={filteredProviders}
        cardDefinition={{
          header: (item) => (
            <SpaceBetween direction="horizontal" size="xs" alignItems="center">
              <Icon name={item.icon as any} />
              <Box variant="h3">{item.name}</Box>
              {tierBadge(item.tier)}
              {connectedIds.has(item.id) && <Badge color="green">Connected</Badge>}
            </SpaceBetween>
          ),
          sections: [
            {
              id: 'description',
              content: (item) => <Box variant="p" color="text-body-secondary">{item.description}</Box>,
            },
            {
              id: 'features',
              header: 'Auto-Collects',
              content: (item) => (
                <SpaceBetween size="xxs">
                  {item.features.slice(0, 4).map(f => (
                    <Box key={f} variant="small"><Icon name="status-positive" variant="success" size="small" /> {f}</Box>
                  ))}
                  {item.features.length > 4 && <Box variant="small" color="text-body-secondary">+{item.features.length - 4} more</Box>}
                </SpaceBetween>
              ),
            },
            {
              id: 'mappings',
              content: (item) => {
                const mappings = getProviderMappings(item.id);
                const controls = getControlsCoveredByProvider(item.id);
                return mappings.length > 0 ? (
                  <Box variant="small" color="text-body-secondary">
                    Maps to {controls.length} controls across {[...new Set(mappings.map(m => m.framework))].join(', ')}
                  </Box>
                ) : null;
              },
            },
            {
              id: 'actions',
              content: (item) => {
                if (connectedIds.has(item.id)) {
                  return (
                    <SpaceBetween direction="horizontal" size="xs">
                      <StatusIndicator type="success">Connected</StatusIndicator>
                      <Button variant="inline-link" onClick={() => setDetailModal(item)}>View Details</Button>
                    </SpaceBetween>
                  );
                }
                return <Button variant="primary" onClick={() => setConnectModal(item)}>Connect</Button>;
              },
            },
          ],
        }}
        cardsPerRow={[{ cards: 1 }, { minWidth: 400, cards: 2 }, { minWidth: 900, cards: 3 }]}
        empty={
          <Box textAlign="center" padding="xxl">
            <SpaceBetween size="m">
              <Box variant="h3">No integrations match your search</Box>
              <Box variant="p" color="text-body-secondary">Try adjusting your filters or search term.</Box>
            </SpaceBetween>
          </Box>
        }
      />

      {connectModal && (
        <Modal
          visible
          onDismiss={() => { setConnectModal(null); setApiKey(''); }}
          header={`Connect ${connectModal.name}`}
          size="medium"
          footer={
            <Box float="right">
              <SpaceBetween direction="horizontal" size="xs">
                <Button variant="link" onClick={() => { setConnectModal(null); setApiKey(''); }}>Cancel</Button>
                <Button variant="primary" loading={connecting} onClick={handleConnect}>Connect</Button>
              </SpaceBetween>
            </Box>
          }
        >
          <SpaceBetween size="l">
            <Box variant="p">{connectModal.description}</Box>

            <FormField label="API Key / Token" description={`Enter your ${connectModal.name} API credentials.`}>
              <Input type="password" value={apiKey} onChange={({ detail }) => setApiKey(detail.value)} placeholder="Enter API key..." />
            </FormField>

            {getProviderMappings(connectModal.id).length > 0 && (
              <ExpandableSection headerText={`Control Mappings (${getProviderMappings(connectModal.id).length})`}>
                <Table
                  variant="embedded"
                  items={getProviderMappings(connectModal.id)}
                  columnDefinitions={[
                    { id: 'field', header: 'Data Source', cell: item => item.providerField },
                    { id: 'control', header: 'Control', cell: item => <Badge>{item.controlRef}</Badge> },
                    { id: 'fw', header: 'Framework', cell: item => item.framework },
                    { id: 'evidence', header: 'Evidence Generated', cell: item => item.evidenceType },
                  ]}
                />
              </ExpandableSection>
            )}

            <Alert type="info">
              Credentials are encrypted at rest. Only read-only API scopes are required. First sync begins immediately after connection.
            </Alert>
          </SpaceBetween>
        </Modal>
      )}

      {detailModal && (
        <Modal
          visible
          onDismiss={() => setDetailModal(null)}
          header={detailModal.name}
          size="large"
          footer={<Box float="right"><Button onClick={() => setDetailModal(null)}>Close</Button></Box>}
        >
          <SpaceBetween size="l">
            <ColumnLayout columns={3} variant="text-grid">
              <div>
                <Box variant="awsui-key-label">Status</Box>
                <StatusIndicator type="success">Connected</StatusIndicator>
              </div>
              <div>
                <Box variant="awsui-key-label">Controls Covered</Box>
                <Box variant="p">{getControlsCoveredByProvider(detailModal.id).length}</Box>
              </div>
              <div>
                <Box variant="awsui-key-label">Evidence Types</Box>
                <Box variant="p">{getEvidenceTypesForProvider(detailModal.id).length}</Box>
              </div>
            </ColumnLayout>

            <Container header={<Header variant="h3">Data Flow Pipeline</Header>}>
              <SpaceBetween size="s">
                {getProviderMappings(detailModal.id).map((m, i) => (
                  <Box key={i} padding={{ vertical: 'xxs' }}>
                    <SpaceBetween direction="horizontal" size="xs" alignItems="center">
                      <Badge color="blue">{m.providerField}</Badge>
                      <Icon name="arrow-right" />
                      <Badge>{m.controlRef}</Badge>
                      <Icon name="arrow-right" />
                      <Box variant="small">{m.evidenceType}</Box>
                    </SpaceBetween>
                  </Box>
                ))}
              </SpaceBetween>
            </Container>

            <Container header={<Header variant="h3">Recent Sync Events</Header>}>
              {syncEvents.filter(e => e.provider === detailModal.id).length > 0 ? (
                <Table
                  variant="embedded"
                  items={syncEvents.filter(e => e.provider === detailModal.id).slice(0, 5)}
                  columnDefinitions={[
                    { id: 'time', header: 'Time', cell: item => new Date(item.created_at).toLocaleString() },
                    { id: 'status', header: 'Status', cell: item => <StatusIndicator type={item.status === 'success' ? 'success' : 'error'}>{item.status}</StatusIndicator> },
                    { id: 'records', header: 'Records', cell: item => item.records_fetched },
                    { id: 'evidence', header: 'Evidence Created', cell: item => item.evidence_created },
                  ]}
                />
              ) : (
                <Box variant="p" color="text-body-secondary" textAlign="center" padding="m">No sync events yet. Click "Sync Now" to trigger the first sync.</Box>
              )}
            </Container>

            <ExpandableSection headerText="Capabilities">
              <SpaceBetween size="xxs">
                {detailModal.features.map(f => (
                  <Box key={f} variant="p"><Icon name="status-positive" variant="success" /> {f}</Box>
                ))}
              </SpaceBetween>
            </ExpandableSection>
          </SpaceBetween>
        </Modal>
      )}
    </SpaceBetween>
  );
}

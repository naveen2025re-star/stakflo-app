import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Box from '@cloudscape-design/components/box';
import Badge from '@cloudscape-design/components/badge';
import Button from '@cloudscape-design/components/button';
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
import * as awsui from '@cloudscape-design/design-tokens';
import { supabase } from '../lib/supabase';
import type { Framework, Control, Policy, Audit } from '../lib/types';

interface OrgPrefs {
  org_name: string | null;
  trust_center_enabled: boolean;
  user_id: string;
}

interface TrustData {
  frameworks: Framework[];
  controls: Control[];
  policies: Policy[];
  audits: Audit[];
}

function ScoreRing({ value, label }: { value: number; label: string }) {
  const color = value >= 80 ? awsui.colorTextStatusSuccess : value >= 50 ? awsui.colorTextStatusWarning : awsui.colorTextStatusError;
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: 88, height: 88, borderRadius: '50%', margin: '0 auto',
        border: `5px solid ${color}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column',
      }}>
        <Box variant="h2" color="inherit">{value}%</Box>
      </div>
      <Box variant="small" color="text-body-secondary" padding={{ top: 'xs' }}>{label}</Box>
    </div>
  );
}

export default function TrustCenterPublicPage() {
  const { slug } = useParams<{ slug: string }>();
  const [prefs, setPrefs] = useState<OrgPrefs | null>(null);
  const [data, setData] = useState<TrustData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!slug) { setNotFound(true); setLoading(false); return; }

      const { data: prefData } = await supabase
        .from('user_preferences')
        .select('user_id, org_name, trust_center_enabled')
        .eq('org_slug', slug)
        .maybeSingle();

      if (!prefData || !prefData.trust_center_enabled) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setPrefs(prefData as OrgPrefs);
      const uid = prefData.user_id;

      const [fRes, cRes, pRes, aRes] = await Promise.all([
        supabase.from('frameworks').select('*').eq('user_id', uid).order('name'),
        supabase.from('controls').select('*, frameworks(name)').eq('user_id', uid),
        supabase.from('policies').select('*, frameworks(name)').eq('user_id', uid).eq('status', 'published'),
        supabase.from('audits').select('*, frameworks(name)').eq('user_id', uid).eq('status', 'completed').order('end_date', { ascending: false }),
      ]);

      setData({
        frameworks: fRes.data || [],
        controls: cRes.data || [],
        policies: pRes.data || [],
        audits: aRes.data || [],
      });
      setLoading(false);
    }
    load();
  }, [slug]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size="large" />
      </div>
    );
  }

  if (notFound || !data || !prefs) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
        <Icon name="lock-private" size="big" />
        <Box variant="h2">Trust Center Not Found</Box>
        <Box variant="p" color="text-body-secondary">
          This trust center page does not exist or is not publicly accessible.
        </Box>
      </div>
    );
  }

  const totalControls = data.controls.length;
  const passingControls = data.controls.filter(c => c.status === 'passing').length;
  const overallScore = totalControls > 0 ? Math.round((passingControls / totalControls) * 100) : 0;
  const orgName = prefs.org_name || 'This Organization';

  const frameworkDetails = data.frameworks.map(fw => {
    const fwControls = data.controls.filter(c => c.framework_id === fw.id);
    const passing = fwControls.filter(c => c.status === 'passing').length;
    const total = fwControls.length;
    const pct = total > 0 ? Math.round((passing / total) * 100) : 0;
    const fwPolicies = data.policies.filter(p => p.framework_id === fw.id);
    const fwAudits = data.audits.filter(a => a.framework_id === fw.id);
    return { ...fw, passing, total, pct, policies: fwPolicies, audits: fwAudits };
  });

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 16px' }}>
      <SpaceBetween size="xl">
        <div style={{ textAlign: 'center', padding: '48px 0 32px' }}>
          <SpaceBetween size="s" alignItems="center" direction="vertical">
            <div style={{
              width: 56, height: 56, borderRadius: awsui.borderRadiusContainer,
              background: awsui.colorBackgroundControlChecked,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto',
            }}>
              <Icon name="security" size="big" variant="inverted" />
            </div>
            <Box variant="h1" fontSize="display-l">{orgName} Trust Center</Box>
            <Box variant="p" color="text-body-secondary" fontSize="heading-m">
              Transparency into our security, compliance, and data protection practices
            </Box>
            <SpaceBetween direction="horizontal" size="s">
              <Badge color="green">Live Data</Badge>
              <Box variant="small" color="text-body-secondary">Last updated: {new Date().toLocaleDateString()}</Box>
            </SpaceBetween>
          </SpaceBetween>
        </div>

        <Container header={<Header variant="h2">Compliance Overview</Header>}>
          <SpaceBetween size="l">
            <ColumnLayout columns={Math.min(frameworkDetails.length + 1, 5)} variant="text-grid">
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: 88, height: 88, borderRadius: '50%', margin: '0 auto',
                  background: overallScore >= 80 ? awsui.colorBackgroundNotificationGreen : overallScore >= 50 ? awsui.colorBackgroundNotificationYellow : awsui.colorBackgroundNotificationRed,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexDirection: 'column',
                }}>
                  <Box variant="h2">{overallScore}%</Box>
                </div>
                <Box variant="small" color="text-body-secondary" padding={{ top: 'xs' }}>Overall Score</Box>
              </div>
              {frameworkDetails.map(fw => (
                <ScoreRing key={fw.id} value={fw.pct} label={fw.name} />
              ))}
            </ColumnLayout>

            <ColumnLayout columns={4} variant="text-grid">
              <SpaceBetween size="xxs">
                <Box variant="awsui-key-label">Total Controls</Box>
                <Box variant="h3">{totalControls}</Box>
              </SpaceBetween>
              <SpaceBetween size="xxs">
                <Box variant="awsui-key-label">Passing Controls</Box>
                <Box variant="h3" color="text-status-success">{passingControls}</Box>
              </SpaceBetween>
              <SpaceBetween size="xxs">
                <Box variant="awsui-key-label">Published Policies</Box>
                <Box variant="h3">{data.policies.length}</Box>
              </SpaceBetween>
              <SpaceBetween size="xxs">
                <Box variant="awsui-key-label">Completed Audits</Box>
                <Box variant="h3">{data.audits.length}</Box>
              </SpaceBetween>
            </ColumnLayout>
          </SpaceBetween>
        </Container>

        {frameworkDetails.length > 0 && (
          <SpaceBetween size="m">
            <Header variant="h2">Framework Coverage</Header>
            {frameworkDetails.map(fw => (
              <Container key={fw.id} header={
                <Header variant="h3">
                  <SpaceBetween direction="horizontal" size="xs" alignItems="center">
                    <Icon name={(fw.icon || 'security') as any} />
                    <span>{fw.name}</span>
                    <Badge color={fw.pct >= 80 ? 'green' : fw.pct >= 50 ? 'blue' : 'red'}>{fw.pct}%</Badge>
                    {fw.pct >= 80 && <StatusIndicator type="success">Compliant</StatusIndicator>}
                  </SpaceBetween>
                </Header>
              }>
                <SpaceBetween size="s">
                  {fw.description && <Box variant="p" color="text-body-secondary">{fw.description}</Box>}
                  <ProgressBar
                    value={fw.pct}
                    additionalInfo={`${fw.passing} of ${fw.total} controls passing`}
                    status={fw.pct >= 80 ? 'success' : fw.pct >= 50 ? 'in-progress' : 'error'}
                  />
                  <ColumnLayout columns={3} variant="text-grid">
                    <SpaceBetween size="xxs">
                      <Box variant="awsui-key-label">Controls</Box>
                      <Box>{fw.total} total, {fw.passing} passing</Box>
                    </SpaceBetween>
                    <SpaceBetween size="xxs">
                      <Box variant="awsui-key-label">Published Policies</Box>
                      <Box>{fw.policies.length}</Box>
                    </SpaceBetween>
                    <SpaceBetween size="xxs">
                      <Box variant="awsui-key-label">Completed Audits</Box>
                      <Box>{fw.audits.length}</Box>
                    </SpaceBetween>
                  </ColumnLayout>
                </SpaceBetween>
              </Container>
            ))}
          </SpaceBetween>
        )}

        <Tabs tabs={[
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
                    cell: item => item.last_reviewed_at ? new Date(item.last_reviewed_at).toLocaleDateString() : 'Not reviewed',
                  },
                  {
                    id: 'status', header: 'Status', width: 120,
                    cell: () => <StatusIndicator type="success">Published</StatusIndicator>,
                  },
                ]}
                items={data.policies}
                trackBy="id"
                empty={<Box textAlign="center" padding="l" color="text-body-secondary">No published policies yet.</Box>}
              />
            ),
          },
          {
            id: 'audits',
            label: `Completed Audits (${data.audits.length})`,
            content: (
              <Table
                columnDefinitions={[
                  { id: 'title', header: 'Audit', cell: item => item.title, isRowHeader: true },
                  { id: 'framework', header: 'Framework', cell: item => (item as any).frameworks?.name || '\u2014', width: 150 },
                  {
                    id: 'status', header: 'Status', width: 130,
                    cell: () => <StatusIndicator type="success">Completed</StatusIndicator>,
                  },
                  { id: 'start', header: 'Start Date', cell: item => item.start_date || '\u2014', width: 120 },
                  { id: 'end', header: 'End Date', cell: item => item.end_date || '\u2014', width: 120 },
                ]}
                items={data.audits}
                trackBy="id"
                empty={<Box textAlign="center" padding="l" color="text-body-secondary">No completed audits yet.</Box>}
              />
            ),
          },
        ]} />

        <div style={{ textAlign: 'center', padding: '24px 0', borderTop: `1px solid ${awsui.colorBorderDividerDefault}` }}>
          <SpaceBetween size="xs" alignItems="center" direction="vertical">
            <Box variant="small" color="text-body-secondary">
              This trust center is powered by Stakflo \u2014 AI-native compliance automation
            </Box>
            <Button variant="link" iconName="external" href="https://stakflo.com" target="_blank">
              Learn about Stakflo
            </Button>
          </SpaceBetween>
        </div>
      </SpaceBetween>
    </div>
  );
}

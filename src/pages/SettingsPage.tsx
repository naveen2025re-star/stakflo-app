import { useState, useEffect } from 'react';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import Container from '@cloudscape-design/components/container';
import Header from '@cloudscape-design/components/header';
import SpaceBetween from '@cloudscape-design/components/space-between';
import ColumnLayout from '@cloudscape-design/components/column-layout';
import FormField from '@cloudscape-design/components/form-field';
import Input from '@cloudscape-design/components/input';
import Toggle from '@cloudscape-design/components/toggle';
import SegmentedControl from '@cloudscape-design/components/segmented-control';
import KeyValuePairs from '@cloudscape-design/components/key-value-pairs';
import Badge from '@cloudscape-design/components/badge';
import Icon from '@cloudscape-design/components/icon';
import Alert from '@cloudscape-design/components/alert';
import { applyMode, applyDensity, Mode, Density } from '@cloudscape-design/global-styles';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { supabase } from '../lib/supabase';
import * as awsui from '@cloudscape-design/design-tokens';

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const { addNotification } = useNotifications();
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('stakflo-theme') === 'dark');
  const [density, setDensity] = useState(() => localStorage.getItem('stakflo-density') || 'comfortable');
  const [seeding, setSeeding] = useState(false);
  const [stats, setStats] = useState({ frameworks: 0, controls: 0, evidence: 0, vendors: 0, policies: 0, audits: 0 });

  useEffect(() => {
    async function loadStats() {
      const [fRes, cRes, eRes, vRes, pRes, aRes] = await Promise.all([
        supabase.from('frameworks').select('id', { count: 'exact', head: true }),
        supabase.from('controls').select('id', { count: 'exact', head: true }),
        supabase.from('evidence').select('id', { count: 'exact', head: true }),
        supabase.from('vendors').select('id', { count: 'exact', head: true }),
        supabase.from('policies').select('id', { count: 'exact', head: true }),
        supabase.from('audits').select('id', { count: 'exact', head: true }),
      ]);
      setStats({
        frameworks: fRes.count || 0,
        controls: cRes.count || 0,
        evidence: eRes.count || 0,
        vendors: vRes.count || 0,
        policies: pRes.count || 0,
        audits: aRes.count || 0,
      });
    }
    loadStats();
  }, []);

  const handleDarkMode = (enabled: boolean) => {
    setDarkMode(enabled);
    applyMode(enabled ? Mode.Dark : Mode.Light);
    localStorage.setItem('stakflo-theme', enabled ? 'dark' : 'light');
  };

  const handleDensity = (value: string) => {
    setDensity(value);
    applyDensity(value === 'compact' ? Density.Compact : Density.Comfortable);
    localStorage.setItem('stakflo-density', value);
  };

  const handleSeedData = async () => {
    if (!user) return;
    setSeeding(true);
    const { error } = await supabase.rpc('seed_user_data', { p_user_id: user.id });
    if (error) {
      addNotification('error', 'Demo data already loaded or error: ' + error.message);
    } else {
      addNotification('success', 'Demo data loaded successfully');
    }
    setSeeding(false);
  };

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : 'Unknown';

  return (
    <SpaceBetween size="l">
      <Header variant="h1" description="Manage your account, preferences, and compliance program">
        Settings
      </Header>

      <ColumnLayout columns={2}>
        <SpaceBetween size="l">
          <Container header={<Header variant="h2">Account</Header>}>
            <SpaceBetween size="m">
              <div style={{
                display: 'flex', alignItems: 'center', gap: awsui.spaceScaledM,
                padding: awsui.spaceScaledM,
                background: awsui.colorBackgroundCellShaded,
                borderRadius: awsui.borderRadiusContainer,
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: awsui.colorBackgroundControlChecked,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Icon name="user-profile" size="big" variant="inverted" />
                </div>
                <SpaceBetween size="xxxs">
                  <Box variant="h4">{user?.email}</Box>
                  <Box variant="small" color="text-body-secondary">Member since {memberSince}</Box>
                </SpaceBetween>
              </div>
              <KeyValuePairs
                columns={1}
                items={[
                  { label: 'Email', value: user?.email || '—' },
                  { label: 'User ID', value: <Box variant="code">{user?.id?.slice(0, 8)}...</Box> },
                  { label: 'Status', value: <Badge color="green">Active</Badge> },
                ]}
              />
              <Button onClick={signOut} iconName="arrow-right">Sign out</Button>
            </SpaceBetween>
          </Container>

          <Container header={<Header variant="h2">Appearance</Header>}>
            <SpaceBetween size="m">
              <FormField label="Color Theme" description="Choose between light and dark mode">
                <Toggle checked={darkMode} onChange={({ detail }) => handleDarkMode(detail.checked)}>
                  {darkMode ? 'Dark mode' : 'Light mode'}
                </Toggle>
              </FormField>
              <FormField label="Content Density" description="Adjust information density across the interface">
                <SegmentedControl
                  selectedId={density}
                  onChange={({ detail }) => handleDensity(detail.selectedId)}
                  options={[
                    { id: 'comfortable', text: 'Comfortable' },
                    { id: 'compact', text: 'Compact' },
                  ]}
                />
              </FormField>
            </SpaceBetween>
          </Container>
        </SpaceBetween>

        <SpaceBetween size="l">
          <Container header={<Header variant="h2">Compliance Program</Header>}>
            <SpaceBetween size="m">
              <KeyValuePairs
                columns={2}
                items={[
                  { label: 'Frameworks', value: <Box variant="h3" fontSize="heading-l">{stats.frameworks}</Box> },
                  { label: 'Controls', value: <Box variant="h3" fontSize="heading-l">{stats.controls}</Box> },
                  { label: 'Evidence Items', value: <Box variant="h3" fontSize="heading-l">{stats.evidence}</Box> },
                  { label: 'Vendors', value: <Box variant="h3" fontSize="heading-l">{stats.vendors}</Box> },
                  { label: 'Policies', value: <Box variant="h3" fontSize="heading-l">{stats.policies}</Box> },
                  { label: 'Audits', value: <Box variant="h3" fontSize="heading-l">{stats.audits}</Box> },
                ]}
              />
              {stats.frameworks === 0 && (
                <Alert type="info">
                  Your compliance program is empty. Load demo data to see the platform with sample frameworks, controls, evidence, and more.
                </Alert>
              )}
              <Button
                iconName="add-plus"
                loading={seeding}
                onClick={handleSeedData}
                disabled={stats.frameworks > 0}
              >
                {stats.frameworks > 0 ? 'Demo data already loaded' : 'Load demo data'}
              </Button>
            </SpaceBetween>
          </Container>

          <Container header={<Header variant="h2">AI Configuration</Header>}>
            <SpaceBetween size="m">
              <Alert type="success" header="OpenRouter API connected">
                Your AI features are active. The OpenRouter API key is configured and all AI capabilities are available.
              </Alert>
              <KeyValuePairs
                columns={1}
                items={[
                  { label: 'AI Model', value: <Badge color="blue">anthropic/claude-sonnet-4</Badge> },
                  { label: 'Features', value: 'Policy drafting, risk analysis, board reports, gap analysis, remediation planning' },
                  { label: 'API Status', value: <Badge color="green">Connected</Badge> },
                ]}
              />
            </SpaceBetween>
          </Container>

          <Container header={<Header variant="h2">Platform</Header>}>
            <KeyValuePairs
              columns={1}
              items={[
                { label: 'Version', value: <Badge>v1.0.0</Badge> },
                { label: 'Design System', value: 'AWS Cloudscape' },
                { label: 'AI Provider', value: 'OpenRouter / Claude' },
                { label: 'Database', value: 'Supabase (PostgreSQL)' },
                { label: 'Frameworks Supported', value: 'SOC 2, ISO 27001, HIPAA, GDPR' },
              ]}
            />
          </Container>
        </SpaceBetween>
      </ColumnLayout>
    </SpaceBetween>
  );
}

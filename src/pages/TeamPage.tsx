import { useState, useEffect, useCallback } from 'react';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import Container from '@cloudscape-design/components/container';
import FormField from '@cloudscape-design/components/form-field';
import Header from '@cloudscape-design/components/header';
import Input from '@cloudscape-design/components/input';
import Modal from '@cloudscape-design/components/modal';
import Select from '@cloudscape-design/components/select';
import SpaceBetween from '@cloudscape-design/components/space-between';
import StatusIndicator from '@cloudscape-design/components/status-indicator';
import Table from '@cloudscape-design/components/table';
import Badge from '@cloudscape-design/components/badge';
import Alert from '@cloudscape-design/components/alert';
import ColumnLayout from '@cloudscape-design/components/column-layout';
import Tabs from '@cloudscape-design/components/tabs';
import Icon from '@cloudscape-design/components/icon';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import type { OrgMember, OrgInvitation, Organization } from '../lib/types';

const ROLE_OPTIONS = [
  { label: 'Viewer', value: 'viewer', description: 'Can view compliance status' },
  { label: 'Auditor', value: 'auditor', description: 'Can view and comment on evidence' },
  { label: 'Compliance Lead', value: 'compliance_lead', description: 'Can manage controls and evidence' },
  { label: 'Admin', value: 'admin', description: 'Full access including settings and billing' },
];

export default function TeamPage() {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [invitations, setInvitations] = useState<OrgInvitation[]>([]);
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<{ label: string; value: string } | null>(ROLE_OPTIONS[0]);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: orgData } = await supabase
        .from('organizations')
        .select('*')
        .limit(1)
        .single();

      if (orgData) {
        setOrg(orgData);
        const { data: memberData } = await supabase
          .from('org_members')
          .select('*')
          .eq('org_id', orgData.id);
        setMembers(memberData || []);

        const { data: inviteData } = await supabase
          .from('org_invitations')
          .select('*')
          .eq('org_id', orgData.id)
          .is('accepted_at', null);
        setInvitations(inviteData || []);
      }
    } catch (err) {
      // silently handle
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleInvite = async () => {
    if (!org || !user || !inviteEmail.trim()) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('org_invitations').insert({
        org_id: org.id,
        email: inviteEmail.trim(),
        role: inviteRole?.value || 'viewer',
        invited_by: user.id,
      });
      if (error) throw error;
      addNotification('success', `Invitation sent to ${inviteEmail}`);
      setShowInviteModal(false);
      setInviteEmail('');
      fetchData();
    } catch (err) {
      addNotification('error', err instanceof Error ? err.message : 'Failed to send invite');
    } finally {
      setSubmitting(false);
    }
  };

  const roleBadge = (role: string) => {
    switch (role) {
      case 'owner': return <Badge color="blue">Owner</Badge>;
      case 'admin': return <Badge color="blue">Admin</Badge>;
      case 'compliance_lead': return <Badge color="green">Compliance Lead</Badge>;
      case 'auditor': return <Badge>Auditor</Badge>;
      default: return <Badge>Viewer</Badge>;
    }
  };

  return (
    <SpaceBetween size="l">
      <Header
        variant="h1"
        description="Manage your team members and their access levels."
        actions={
          <Button variant="primary" iconName="add-plus" onClick={() => setShowInviteModal(true)}>
            Invite Member
          </Button>
        }
      >
        Team Management
      </Header>

      <Container>
        <ColumnLayout columns={4} variant="text-grid">
          <div>
            <Box variant="awsui-key-label">Organization</Box>
            <Box variant="p">{org?.name || 'Not set up'}</Box>
          </div>
          <div>
            <Box variant="awsui-key-label">Plan</Box>
            <Box variant="p">{(org?.plan_tier || 'Trial').charAt(0).toUpperCase() + (org?.plan_tier || 'trial').slice(1)}</Box>
          </div>
          <div>
            <Box variant="awsui-key-label">Members</Box>
            <Box variant="p">{members.length}</Box>
          </div>
          <div>
            <Box variant="awsui-key-label">Pending Invites</Box>
            <Box variant="p">{invitations.length}</Box>
          </div>
        </ColumnLayout>
      </Container>

      <Tabs
        tabs={[
          {
            id: 'members',
            label: `Members (${members.length})`,
            content: (
              <Table
                items={members}
                loading={loading}
                columnDefinitions={[
                  {
                    id: 'user',
                    header: 'User',
                    cell: (item) => (
                      <SpaceBetween direction="horizontal" size="xs" alignItems="center">
                        <Icon name="user-profile" />
                        <Box variant="p">{item.user_id === user?.id ? 'You' : item.user_id.slice(0, 8) + '...'}</Box>
                      </SpaceBetween>
                    ),
                    width: 250,
                  },
                  {
                    id: 'role',
                    header: 'Role',
                    cell: (item) => roleBadge(item.role),
                    width: 180,
                  },
                  {
                    id: 'joined',
                    header: 'Joined',
                    cell: (item) => new Date(item.joined_at).toLocaleDateString(),
                    width: 150,
                  },
                  {
                    id: 'actions',
                    header: 'Actions',
                    cell: (item) => item.user_id === user?.id
                      ? <Box variant="small" color="text-body-secondary">-</Box>
                      : <Button variant="inline-link" iconName="edit">Change role</Button>,
                    width: 150,
                  },
                ]}
                empty={
                  <Box textAlign="center" padding="l">
                    <SpaceBetween size="m">
                      <Box variant="h3">No team members yet</Box>
                      <Box variant="p" color="text-body-secondary">
                        Invite team members to collaborate on compliance.
                      </Box>
                      <Button onClick={() => setShowInviteModal(true)}>Invite Member</Button>
                    </SpaceBetween>
                  </Box>
                }
              />
            ),
          },
          {
            id: 'invitations',
            label: `Pending Invites (${invitations.length})`,
            content: (
              <Table
                items={invitations}
                loading={loading}
                columnDefinitions={[
                  {
                    id: 'email',
                    header: 'Email',
                    cell: (item) => item.email,
                    width: 300,
                  },
                  {
                    id: 'role',
                    header: 'Role',
                    cell: (item) => roleBadge(item.role),
                    width: 180,
                  },
                  {
                    id: 'sent',
                    header: 'Sent',
                    cell: (item) => new Date(item.created_at).toLocaleDateString(),
                    width: 150,
                  },
                  {
                    id: 'expires',
                    header: 'Expires',
                    cell: (item) => (
                      <StatusIndicator type={new Date(item.expires_at) > new Date() ? 'success' : 'error'}>
                        {new Date(item.expires_at).toLocaleDateString()}
                      </StatusIndicator>
                    ),
                    width: 150,
                  },
                  {
                    id: 'actions',
                    header: 'Actions',
                    cell: () => <Button variant="inline-link" iconName="remove">Revoke</Button>,
                    width: 120,
                  },
                ]}
                empty={
                  <Box textAlign="center" padding="l">
                    <Box variant="p" color="text-body-secondary">No pending invitations.</Box>
                  </Box>
                }
              />
            ),
          },
        ]}
      />

      <Container header={<Header variant="h3">Role Permissions</Header>}>
        <Table
          items={[
            { capability: 'View dashboard & reports', viewer: true, auditor: true, lead: true, admin: true },
            { capability: 'View controls & evidence', viewer: true, auditor: true, lead: true, admin: true },
            { capability: 'Comment on evidence', viewer: false, auditor: true, lead: true, admin: true },
            { capability: 'Approve/reject evidence', viewer: false, auditor: true, lead: true, admin: true },
            { capability: 'Create/edit controls', viewer: false, auditor: false, lead: true, admin: true },
            { capability: 'Manage policies', viewer: false, auditor: false, lead: true, admin: true },
            { capability: 'Use AI copilot', viewer: false, auditor: false, lead: true, admin: true },
            { capability: 'Manage integrations', viewer: false, auditor: false, lead: false, admin: true },
            { capability: 'Invite/remove members', viewer: false, auditor: false, lead: false, admin: true },
            { capability: 'Billing & settings', viewer: false, auditor: false, lead: false, admin: true },
          ]}
          columnDefinitions={[
            { id: 'capability', header: 'Capability', cell: (item) => item.capability, width: 250 },
            { id: 'viewer', header: 'Viewer', cell: (item) => item.viewer ? <Icon name="status-positive" variant="success" /> : <Icon name="close" variant="subtle" />, width: 100 },
            { id: 'auditor', header: 'Auditor', cell: (item) => item.auditor ? <Icon name="status-positive" variant="success" /> : <Icon name="close" variant="subtle" />, width: 100 },
            { id: 'lead', header: 'Lead', cell: (item) => item.lead ? <Icon name="status-positive" variant="success" /> : <Icon name="close" variant="subtle" />, width: 100 },
            { id: 'admin', header: 'Admin', cell: (item) => item.admin ? <Icon name="status-positive" variant="success" /> : <Icon name="close" variant="subtle" />, width: 100 },
          ]}
          variant="embedded"
        />
      </Container>

      {showInviteModal && (
        <Modal
          visible
          onDismiss={() => setShowInviteModal(false)}
          header="Invite Team Member"
          footer={
            <Box float="right">
              <SpaceBetween direction="horizontal" size="xs">
                <Button variant="link" onClick={() => setShowInviteModal(false)}>Cancel</Button>
                <Button variant="primary" loading={submitting} onClick={handleInvite}>
                  Send Invitation
                </Button>
              </SpaceBetween>
            </Box>
          }
        >
          <SpaceBetween size="l">
            <FormField label="Email address">
              <Input
                type="email"
                value={inviteEmail}
                onChange={({ detail }) => setInviteEmail(detail.value)}
                placeholder="colleague@company.com"
              />
            </FormField>
            <FormField label="Role" description="Determines what the member can access.">
              <Select
                selectedOption={inviteRole}
                onChange={({ detail }) => setInviteRole(detail.selectedOption as any)}
                options={ROLE_OPTIONS}
              />
            </FormField>
            <Alert type="info">
              The invitee will receive an email with a link to join your organization.
            </Alert>
          </SpaceBetween>
        </Modal>
      )}
    </SpaceBetween>
  );
}

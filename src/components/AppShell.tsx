import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import TopNavigation from '@cloudscape-design/components/top-navigation';
import AppLayoutToolbar from '@cloudscape-design/components/app-layout-toolbar';
import SideNavigation from '@cloudscape-design/components/side-navigation';
import BreadcrumbGroup from '@cloudscape-design/components/breadcrumb-group';
import Flashbar from '@cloudscape-design/components/flashbar';
import Modal from '@cloudscape-design/components/modal';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import StatusIndicator from '@cloudscape-design/components/status-indicator';
import Badge from '@cloudscape-design/components/badge';
import Link from '@cloudscape-design/components/link';
import { applyMode, applyDensity, Mode, Density } from '@cloudscape-design/global-styles';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { supabase } from '../lib/supabase';
import AIDrawer from './AIDrawer';

interface LiveAlert {
  type: 'error' | 'warning' | 'info';
  title: string;
  description: string;
  href: string;
}

const BREADCRUMB_MAP: Record<string, string> = {
  '/': 'Dashboard',
  '/frameworks': 'Frameworks',
  '/controls': 'Controls',
  '/evidence': 'Evidence',
  '/audits': 'Audits',
  '/vendors': 'Vendors',
  '/policies': 'Policies',
  '/remediation': 'Remediation',
  '/trust-center': 'Trust Center',
  '/integrations': 'Integrations',
  '/team': 'Team',
  '/settings': 'Settings',
};

function computeLiveAlerts(data: {
  controls: { status: string; risk_level: string; control_ref: string }[];
  evidence: { control_id: string; status: string }[];
  policies: { last_reviewed_at: string | null; title: string }[];
  vendors: { last_reviewed_at: string | null; name: string }[];
  audits: { end_date: string | null; title: string; status: string }[];
}): LiveAlert[] {
  const alerts: LiveAlert[] = [];
  const now = new Date();

  const criticalFailing = data.controls.filter(
    c => c.status === 'failing' && (c.risk_level === 'critical' || c.risk_level === 'high')
  );
  if (criticalFailing.length > 0) {
    alerts.push({
      type: 'error',
      title: `${criticalFailing.length} critical/high control${criticalFailing.length > 1 ? 's' : ''} failing`,
      description: criticalFailing.slice(0, 3).map(c => c.control_ref).join(', ') + (criticalFailing.length > 3 ? ` +${criticalFailing.length - 3} more` : ''),
      href: '/remediation',
    });
  }

  const controlIds = data.controls.map(c => (c as any).id).filter(Boolean);
  const controlsWithEvidence = new Set(data.evidence.filter(e => e.status === 'approved').map(e => e.control_id));
  const controlsMissingEvidence = controlIds.filter((id: string) => !controlsWithEvidence.has(id));
  if (controlsMissingEvidence.length > 0) {
    alerts.push({
      type: 'warning',
      title: `${controlsMissingEvidence.length} control${controlsMissingEvidence.length > 1 ? 's' : ''} missing approved evidence`,
      description: 'Upload and approve evidence to satisfy audit requirements',
      href: '/evidence',
    });
  }

  const overdueVendors = data.vendors.filter(v => {
    if (!v.last_reviewed_at) return true;
    const reviewedAt = new Date(v.last_reviewed_at);
    const daysSince = Math.floor((now.getTime() - reviewedAt.getTime()) / (1000 * 60 * 60 * 24));
    return daysSince > 90;
  });
  if (overdueVendors.length > 0) {
    alerts.push({
      type: 'warning',
      title: `${overdueVendors.length} vendor${overdueVendors.length > 1 ? 's' : ''} overdue for review`,
      description: 'Annual vendor risk assessments are past due',
      href: '/vendors',
    });
  }

  const overduePolicies = data.policies.filter(p => {
    if (!p.last_reviewed_at) return false;
    const reviewedAt = new Date(p.last_reviewed_at);
    const daysSince = Math.floor((now.getTime() - reviewedAt.getTime()) / (1000 * 60 * 60 * 24));
    return daysSince > 365;
  });
  if (overduePolicies.length > 0) {
    alerts.push({
      type: 'info',
      title: `${overduePolicies.length} polic${overduePolicies.length > 1 ? 'ies' : 'y'} overdue for annual review`,
      description: 'Regular policy reviews are required for compliance',
      href: '/policies',
    });
  }

  const upcomingAudits = data.audits.filter(a => {
    if (a.status === 'completed' || !a.end_date) return false;
    const endDate = new Date(a.end_date);
    const daysUntil = Math.floor((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntil >= 0 && daysUntil <= 30;
  });
  if (upcomingAudits.length > 0) {
    alerts.push({
      type: 'info',
      title: `${upcomingAudits.length} audit${upcomingAudits.length > 1 ? 's' : ''} approaching deadline`,
      description: upcomingAudits.map(a => a.title).join(', '),
      href: '/audits',
    });
  }

  return alerts;
}

export default function AppShell() {
  const { user, signOut } = useAuth();
  const { notifications } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();
  const [navOpen, setNavOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem('stakflo-theme') === 'dark'
  );
  const [liveAlerts, setLiveAlerts] = useState<LiveAlert[]>([]);
  const [showAlerts, setShowAlerts] = useState(false);

  useEffect(() => {
    applyMode(darkMode ? Mode.Dark : Mode.Light);
    localStorage.setItem('stakflo-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    const density = localStorage.getItem('stakflo-density');
    if (density === 'compact') applyDensity(Density.Compact);
    else applyDensity(Density.Comfortable);
  }, []);

  const loadAlerts = useCallback(async () => {
    const [cRes, eRes, pRes, vRes, aRes] = await Promise.all([
      supabase.from('controls').select('id, status, risk_level, control_ref'),
      supabase.from('evidence').select('control_id, status'),
      supabase.from('policies').select('title, last_reviewed_at'),
      supabase.from('vendors').select('name, last_reviewed_at'),
      supabase.from('audits').select('title, end_date, status'),
    ]);
    const alerts = computeLiveAlerts({
      controls: (cRes.data || []) as any[],
      evidence: eRes.data || [],
      policies: pRes.data || [],
      vendors: vRes.data || [],
      audits: aRes.data || [],
    });
    setLiveAlerts(alerts);
  }, []);

  useEffect(() => {
    if (user) loadAlerts();
  }, [user, loadAlerts]);

  const breadcrumbs = [
    { text: 'Stakflo', href: '/' },
    ...(location.pathname !== '/'
      ? [{ text: BREADCRUMB_MAP[location.pathname] || 'Page', href: location.pathname }]
      : []),
  ];

  const navItems = [
    { type: 'link' as const, text: 'Dashboard', href: '/' },
    { type: 'divider' as const },
    {
      type: 'section' as const,
      text: 'Compliance',
      items: [
        { type: 'link' as const, text: 'Frameworks', href: '/frameworks' },
        { type: 'link' as const, text: 'Controls', href: '/controls' },
        { type: 'link' as const, text: 'Evidence', href: '/evidence' },
      ],
    },
    {
      type: 'section' as const,
      text: 'Operations',
      items: [
        { type: 'link' as const, text: 'Audits', href: '/audits' },
        { type: 'link' as const, text: 'Vendors', href: '/vendors' },
        { type: 'link' as const, text: 'Policies', href: '/policies' },
      ],
    },
    { type: 'divider' as const },
    {
      type: 'section' as const,
      text: 'AI & Automation',
      items: [
        { type: 'link' as const, text: 'Remediation', href: '/remediation' },
        { type: 'link' as const, text: 'Integrations', href: '/integrations' },
        { type: 'link' as const, text: 'Trust Center', href: '/trust-center' },
      ],
    },
    { type: 'divider' as const },
    {
      type: 'section' as const,
      text: 'Organization',
      items: [
        { type: 'link' as const, text: 'Team', href: '/team' },
        { type: 'link' as const, text: 'Settings', href: '/settings' },
      ],
    },
  ];

  const drawers = [
    {
      id: 'ai-assistant',
      ariaLabels: {
        drawerName: 'Stakflo AI Assistant',
        closeButton: 'Close AI Assistant',
        triggerButton: 'Open AI Assistant',
      },
      badge: true,
      resizable: true,
      defaultSize: 420,
      content: <AIDrawer pathname={location.pathname} />,
      trigger: { iconName: 'gen-ai' as const },
    },
  ];

  const alertCount = liveAlerts.length;
  const hasNotifications = notifications.length > 0 || alertCount > 0;

  return (
    <>
      <div id="h" style={{ position: 'sticky', top: 0, zIndex: 1002 }}>
        <TopNavigation
          identity={{
            href: '/',
            title: 'Stakflo',
            onFollow: (e) => { e.preventDefault(); navigate('/'); },
          }}
          utilities={[
            {
              type: 'button',
              iconName: 'notification',
              ariaLabel: `Notifications (${alertCount} active)`,
              badge: hasNotifications,
              onClick: () => setShowAlerts(true),
            },
            {
              type: 'button',
              iconName: 'light-dark',
              ariaLabel: darkMode ? 'Switch to light mode' : 'Switch to dark mode',
              onClick: () => setDarkMode(d => !d),
            },
            {
              type: 'menu-dropdown',
              text: user?.email || '',
              iconName: 'user-profile',
              items: [{ id: 'settings', text: 'Settings' }, { id: 'signout', text: 'Sign out' }],
              onItemClick: ({ detail }) => {
                if (detail.id === 'signout') signOut();
                if (detail.id === 'settings') navigate('/settings');
              },
            },
          ]}
          i18nStrings={{ overflowMenuTriggerText: 'More', overflowMenuTitleText: 'All' }}
        />
      </div>

      <Modal
        visible={showAlerts}
        onDismiss={() => setShowAlerts(false)}
        header={
          <SpaceBetween direction="horizontal" size="xs" alignItems="center">
            <span>Compliance Alerts</span>
            {alertCount > 0 && <Badge color="red">{alertCount}</Badge>}
          </SpaceBetween>
        }
        size="medium"
      >
        <SpaceBetween size="m">
          {liveAlerts.length === 0 ? (
            <Box textAlign="center" padding="l">
              <SpaceBetween size="s" alignItems="center" direction="vertical">
                <StatusIndicator type="success">All compliance checks passing</StatusIndicator>
                <Box variant="p" color="text-body-secondary">No active alerts. Keep up the good work!</Box>
              </SpaceBetween>
            </Box>
          ) : (
            liveAlerts.map((alert, i) => (
              <Box key={i} padding={{ vertical: 'xs' }}>
                <SpaceBetween size="xxs">
                  <SpaceBetween direction="horizontal" size="xs" alignItems="center">
                    <StatusIndicator type={alert.type === 'error' ? 'error' : alert.type === 'warning' ? 'warning' : 'info'}>
                      {alert.title}
                    </StatusIndicator>
                  </SpaceBetween>
                  <Box variant="small" color="text-body-secondary">{alert.description}</Box>
                  <Link
                    onFollow={() => { setShowAlerts(false); navigate(alert.href); }}
                    fontSize="body-s"
                  >
                    View and resolve &rarr;
                  </Link>
                </SpaceBetween>
              </Box>
            ))
          )}
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="primary" onClick={() => { setShowAlerts(false); navigate('/'); }}>
              View Dashboard
            </Button>
            <Button variant="link" onClick={() => { loadAlerts(); }}>
              Refresh
            </Button>
          </SpaceBetween>
        </SpaceBetween>
      </Modal>

      <AppLayoutToolbar
        headerSelector="#h"
        navigationOpen={navOpen}
        onNavigationChange={({ detail }) => setNavOpen(detail.open)}
        navigation={
          <SideNavigation
            activeHref={location.pathname}
            onFollow={(e) => { e.preventDefault(); navigate(e.detail.href); }}
            header={{ text: 'Stakflo', href: '/' }}
            items={navItems}
          />
        }
        breadcrumbs={
          <BreadcrumbGroup
            items={breadcrumbs}
            onFollow={(e) => { e.preventDefault(); navigate(e.detail.href); }}
          />
        }
        notifications={<Flashbar items={notifications} />}
        content={<Outlet />}
        drawers={drawers as any}
        ariaLabels={{
          navigation: 'Navigation',
          navigationClose: 'Close navigation',
          navigationToggle: 'Open navigation',
        }}
      />
    </>
  );
}

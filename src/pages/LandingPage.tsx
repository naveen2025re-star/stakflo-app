import { useNavigate } from 'react-router-dom';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import Container from '@cloudscape-design/components/container';
import Grid from '@cloudscape-design/components/grid';
import Header from '@cloudscape-design/components/header';
import Icon from '@cloudscape-design/components/icon';
import SpaceBetween from '@cloudscape-design/components/space-between';
import ColumnLayout from '@cloudscape-design/components/column-layout';
import Badge from '@cloudscape-design/components/badge';
import * as awsui from '@cloudscape-design/design-tokens';

const FEATURES = [
  {
    icon: 'security' as const,
    title: 'Framework Coverage',
    description: 'SOC 2, ISO 27001, HIPAA, GDPR, PCI-DSS, and custom frameworks with automated control mapping.',
  },
  {
    icon: 'gen-ai' as const,
    title: 'AI Compliance Copilot',
    description: 'AI-powered remediation plans, evidence classification, and natural language compliance queries.',
  },
  {
    icon: 'status-positive' as const,
    title: 'Continuous Monitoring',
    description: 'Real-time drift detection, automated alerts, and evidence freshness tracking.',
  },
  {
    icon: 'group' as const,
    title: 'Team Collaboration',
    description: 'Role-based access, control ownership, evidence review workflows, and team activity feeds.',
  },
  {
    icon: 'share' as const,
    title: 'Integrations',
    description: 'Connect AWS, GitHub, Okta, and 20+ tools for automated evidence collection.',
  },
  {
    icon: 'globe' as const,
    title: 'Public Trust Center',
    description: 'Shareable compliance posture page for prospects, customers, and partners.',
  },
];

const PRICING = [
  {
    name: 'Starter',
    price: '$299',
    period: '/month',
    description: 'For small teams starting their compliance journey',
    features: ['1 framework', 'Up to 50 controls', '3 team members', 'Basic AI assistant', 'Email support'],
    cta: 'Start Free Trial',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$799',
    period: '/month',
    description: 'For growing companies managing multiple frameworks',
    features: ['4 frameworks', 'Unlimited controls', '15 team members', 'Advanced AI copilot', 'Integrations', 'Trust Center', 'Priority support'],
    cta: 'Start Free Trial',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For organizations with advanced compliance needs',
    features: ['Unlimited frameworks', 'Unlimited controls', 'Unlimited members', 'SSO / SAML', 'Custom integrations', 'Dedicated CSM', 'SLA guarantee'],
    cta: 'Contact Sales',
    highlighted: false,
  },
];

const STATS = [
  { value: '73%', label: 'Faster audit preparation' },
  { value: '12x', label: 'Evidence collection speed' },
  { value: '99.2%', label: 'Audit pass rate' },
  { value: '4.8/5', label: 'Customer satisfaction' },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={{ background: awsui.colorBackgroundLayoutMain }}>
      <div style={{
        padding: `${awsui.spaceScaledM} ${awsui.spaceScaledXxl}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: `1px solid ${awsui.colorBorderDividerDefault}`,
        position: 'sticky',
        top: 0,
        background: awsui.colorBackgroundLayoutMain,
        zIndex: 1000,
      }}>
        <Box variant="h2" padding={{ vertical: 'n' }}>
          <span style={{ color: awsui.colorTextAccent }}>Stakflo</span>
        </Box>
        <SpaceBetween direction="horizontal" size="m">
          <Button variant="link" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>Features</Button>
          <Button variant="link" onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}>Pricing</Button>
          <Button variant="normal" onClick={() => navigate('/auth')}>Sign In</Button>
          <Button variant="primary" onClick={() => navigate('/auth?mode=signup')}>Start Free Trial</Button>
        </SpaceBetween>
      </div>

      <div style={{ padding: `${awsui.spaceScaledXxl} ${awsui.spaceScaledXxl}`, textAlign: 'center', maxWidth: '960px', margin: '0 auto' }}>
        <SpaceBetween size="l">
          <Badge color="blue">Now with AI Copilot</Badge>
          <Box variant="h1" fontSize="display-l" fontWeight="bold">
            Compliance on autopilot.
          </Box>
          <Box variant="p" fontSize="heading-m" color="text-body-secondary">
            Stakflo automates SOC 2, ISO 27001, HIPAA, and GDPR compliance so your team can focus on building, not paperwork. AI-powered monitoring, evidence collection, and audit preparation in one platform.
          </Box>
          <SpaceBetween direction="horizontal" size="m" alignItems="center">
            <div style={{ display: 'flex', gap: awsui.spaceScaledM, justifyContent: 'center' }}>
              <Button variant="primary" iconName="arrow-right" iconAlign="right" onClick={() => navigate('/auth?mode=signup')}>
                Start 14-Day Free Trial
              </Button>
              <Button variant="normal" iconName="play" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>
                See How It Works
              </Button>
            </div>
          </SpaceBetween>
          <Box variant="small" color="text-body-secondary">No credit card required. Setup in under 5 minutes.</Box>
        </SpaceBetween>
      </div>

      <div style={{ padding: `${awsui.spaceScaledXl} ${awsui.spaceScaledXxl}`, background: awsui.colorBackgroundContainerHeader }}>
        <ColumnLayout columns={4}>
          {STATS.map((stat) => (
            <div key={stat.label} style={{ textAlign: 'center' }}>
              <Box variant="h1" color="text-status-info">{stat.value}</Box>
              <Box variant="small" color="text-body-secondary">{stat.label}</Box>
            </div>
          ))}
        </ColumnLayout>
      </div>

      <div id="features" style={{ padding: `${awsui.spaceScaledXxl} ${awsui.spaceScaledXxl}`, maxWidth: '1200px', margin: '0 auto' }}>
        <SpaceBetween size="xl">
          <div style={{ textAlign: 'center' }}>
            <Box variant="h2" fontSize="heading-xl">Everything you need for audit readiness</Box>
            <Box variant="p" color="text-body-secondary" padding={{ top: 's' }}>
              From framework mapping to evidence collection, Stakflo handles the entire compliance lifecycle.
            </Box>
          </div>
          <Grid gridDefinition={[
            { colspan: { default: 12, xs: 6, s: 4 } },
            { colspan: { default: 12, xs: 6, s: 4 } },
            { colspan: { default: 12, xs: 6, s: 4 } },
            { colspan: { default: 12, xs: 6, s: 4 } },
            { colspan: { default: 12, xs: 6, s: 4 } },
            { colspan: { default: 12, xs: 6, s: 4 } },
          ]}>
            {FEATURES.map((feature) => (
              <Container key={feature.title}>
                <SpaceBetween size="s">
                  <Icon name={feature.icon} size="big" variant="subtle" />
                  <Box variant="h3">{feature.title}</Box>
                  <Box variant="p" color="text-body-secondary">{feature.description}</Box>
                </SpaceBetween>
              </Container>
            ))}
          </Grid>
        </SpaceBetween>
      </div>

      <div style={{ padding: `${awsui.spaceScaledXxl} ${awsui.spaceScaledXxl}`, background: awsui.colorBackgroundContainerHeader, maxWidth: '100%' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <SpaceBetween size="xl">
            <div style={{ textAlign: 'center' }}>
              <Box variant="h2" fontSize="heading-xl">Get audit-ready in 3 steps</Box>
            </div>
            <ColumnLayout columns={3}>
              <SpaceBetween size="s">
                <Box variant="h1" color="text-status-info">1</Box>
                <Box variant="h3">Connect your tools</Box>
                <Box variant="p" color="text-body-secondary">
                  Link your cloud, code, and identity providers. Stakflo maps your existing controls automatically.
                </Box>
              </SpaceBetween>
              <SpaceBetween size="s">
                <Box variant="h1" color="text-status-info">2</Box>
                <Box variant="h3">AI fills the gaps</Box>
                <Box variant="p" color="text-body-secondary">
                  Our AI copilot identifies missing evidence, generates policies, and creates remediation plans.
                </Box>
              </SpaceBetween>
              <SpaceBetween size="s">
                <Box variant="h1" color="text-status-info">3</Box>
                <Box variant="h3">Pass your audit</Box>
                <Box variant="p" color="text-body-secondary">
                  Share your Trust Center with auditors. Real-time monitoring ensures continuous compliance.
                </Box>
              </SpaceBetween>
            </ColumnLayout>
          </SpaceBetween>
        </div>
      </div>

      <div id="pricing" style={{ padding: `${awsui.spaceScaledXxl} ${awsui.spaceScaledXxl}`, maxWidth: '1200px', margin: '0 auto' }}>
        <SpaceBetween size="xl">
          <div style={{ textAlign: 'center' }}>
            <Box variant="h2" fontSize="heading-xl">Simple, transparent pricing</Box>
            <Box variant="p" color="text-body-secondary" padding={{ top: 's' }}>
              Start free. Scale as your compliance program grows.
            </Box>
          </div>
          <Grid gridDefinition={[
            { colspan: { default: 12, s: 4 } },
            { colspan: { default: 12, s: 4 } },
            { colspan: { default: 12, s: 4 } },
          ]}>
            {PRICING.map((plan) => (
              <Container
                key={plan.name}
                header={
                  <Header
                    variant="h3"
                    description={plan.description}
                  >
                    <SpaceBetween direction="horizontal" size="xs" alignItems="center">
                      {plan.name}
                      {plan.highlighted && <Badge color="blue">Most Popular</Badge>}
                    </SpaceBetween>
                  </Header>
                }
              >
                <SpaceBetween size="l">
                  <div>
                    <Box variant="h1" display="inline">{plan.price}</Box>
                    <Box variant="small" display="inline" color="text-body-secondary">{plan.period}</Box>
                  </div>
                  <SpaceBetween size="xs">
                    {plan.features.map((f) => (
                      <Box key={f} variant="p">
                        <Icon name="status-positive" variant="success" /> {f}
                      </Box>
                    ))}
                  </SpaceBetween>
                  <Button
                    variant={plan.highlighted ? 'primary' : 'normal'}
                    fullWidth
                    onClick={() => navigate('/auth?mode=signup')}
                  >
                    {plan.cta}
                  </Button>
                </SpaceBetween>
              </Container>
            ))}
          </Grid>
        </SpaceBetween>
      </div>

      <div style={{ padding: `${awsui.spaceScaledXxl} ${awsui.spaceScaledXxl}`, textAlign: 'center', background: awsui.colorBackgroundContainerHeader }}>
        <SpaceBetween size="l">
          <Box variant="h2" fontSize="heading-xl">Ready to automate your compliance?</Box>
          <Box variant="p" color="text-body-secondary">
            Join hundreds of companies that trust Stakflo for continuous compliance.
          </Box>
          <Button variant="primary" iconName="arrow-right" iconAlign="right" onClick={() => navigate('/auth?mode=signup')}>
            Start Your Free Trial
          </Button>
        </SpaceBetween>
      </div>

      <div style={{ padding: `${awsui.spaceScaledL} ${awsui.spaceScaledXxl}`, borderTop: `1px solid ${awsui.colorBorderDividerDefault}` }}>
        <Box variant="small" color="text-body-secondary" textAlign="center">
          2026 Stakflo. All rights reserved. Built for compliance teams that ship.
        </Box>
      </div>
    </div>
  );
}

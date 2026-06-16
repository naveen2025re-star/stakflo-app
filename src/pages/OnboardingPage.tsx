import { useState, useCallback } from 'react';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import Container from '@cloudscape-design/components/container';
import FormField from '@cloudscape-design/components/form-field';
import Header from '@cloudscape-design/components/header';
import Input from '@cloudscape-design/components/input';
import Select from '@cloudscape-design/components/select';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Tiles from '@cloudscape-design/components/tiles';
import Wizard from '@cloudscape-design/components/wizard';
import Alert from '@cloudscape-design/components/alert';
import ColumnLayout from '@cloudscape-design/components/column-layout';
import Checkbox from '@cloudscape-design/components/checkbox';
import Icon from '@cloudscape-design/components/icon';
import ProgressBar from '@cloudscape-design/components/progress-bar';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';

const INDUSTRIES = [
  { label: 'Technology / SaaS', value: 'saas' },
  { label: 'Healthcare', value: 'healthcare' },
  { label: 'Financial Services', value: 'fintech' },
  { label: 'E-Commerce', value: 'ecommerce' },
  { label: 'Education', value: 'education' },
  { label: 'Government', value: 'government' },
  { label: 'Other', value: 'other' },
];

const SIZES = [
  { label: '1-10 employees', value: '1-10' },
  { label: '11-50 employees', value: '11-50' },
  { label: '51-200 employees', value: '51-200' },
  { label: '201-1000 employees', value: '201-1000' },
  { label: '1000+ employees', value: '1000+' },
];

const FRAMEWORKS = [
  { id: 'soc2', name: 'SOC 2 Type II', description: 'Security, availability, confidentiality', icon: 'security', recommended: ['saas', 'fintech'] },
  { id: 'iso27001', name: 'ISO 27001', description: 'Information security management', icon: 'lock-private', recommended: ['saas', 'fintech', 'government'] },
  { id: 'hipaa', name: 'HIPAA', description: 'Health information protection', icon: 'heart', recommended: ['healthcare'] },
  { id: 'gdpr', name: 'GDPR', description: 'EU data protection regulation', icon: 'globe', recommended: ['saas', 'ecommerce'] },
  { id: 'pci-dss', name: 'PCI-DSS', description: 'Payment card data security', icon: 'key', recommended: ['fintech', 'ecommerce'] },
  { id: 'nist', name: 'NIST CSF', description: 'Cybersecurity framework', icon: 'status-positive', recommended: ['government', 'fintech'] },
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const [activeStep, setActiveStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [orgName, setOrgName] = useState('');
  const [industry, setIndustry] = useState<{ label: string; value: string } | null>(null);
  const [companySize, setCompanySize] = useState<{ label: string; value: string } | null>(null);
  const [selectedFrameworks, setSelectedFrameworks] = useState<string[]>([]);
  const [inviteEmails, setInviteEmails] = useState('');

  const recommendedFrameworks = FRAMEWORKS.filter(
    (f) => industry && f.recommended.includes(industry.value)
  );

  const handleSubmit = useCallback(async () => {
    if (!user) return;
    setSubmitting(true);

    try {
      const slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: orgName,
          slug,
          industry: industry?.value || null,
          company_size: companySize?.value || null,
        })
        .select()
        .single();

      if (orgError) throw orgError;

      await supabase.from('org_members').insert({
        org_id: org.id,
        user_id: user.id,
        role: 'owner',
      });

      await supabase.from('onboarding_progress').insert({
        org_id: org.id,
        completed_steps: ['org_created', 'frameworks_selected'],
        current_step: 3,
      });

      for (const fwId of selectedFrameworks) {
        const fw = FRAMEWORKS.find((f) => f.id === fwId);
        if (fw) {
          await supabase.from('frameworks').insert({
            user_id: user.id,
            name: fw.name,
            description: fw.description,
            icon: fw.icon,
          });
        }
      }

      if (inviteEmails.trim()) {
        const emails = inviteEmails.split(',').map((e) => e.trim()).filter(Boolean);
        for (const email of emails) {
          await supabase.from('org_invitations').insert({
            org_id: org.id,
            email,
            role: 'viewer',
            invited_by: user.id,
          });
        }
      }

      await supabase.from('user_preferences').upsert({
        user_id: user.id,
        org_name: orgName,
        org_slug: slug,
        theme: 'light',
        density: 'comfortable',
        trust_center_enabled: false,
      }, { onConflict: 'user_id' });

      addNotification(
        'success',
        `Welcome to Stakflo! ${orgName} is ready to go.`,
      );
      navigate('/');
    } catch (err) {
      addNotification(
        'error',
        err instanceof Error ? err.message : 'Failed to complete setup',
      );
    } finally {
      setSubmitting(false);
    }
  }, [user, orgName, industry, companySize, selectedFrameworks, inviteEmails, navigate, addNotification]);

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 20px' }}>
      <SpaceBetween size="l">
        <Box variant="h1" textAlign="center">
          <span>Welcome to <span style={{ color: '#006ce0' }}>Stakflo</span></span>
        </Box>
        <Wizard
          i18nStrings={{
            stepNumberLabel: (n) => `Step ${n}`,
            collapsedStepsLabel: (n, total) => `Step ${n} of ${total}`,
            submitButton: 'Launch Stakflo',
            previousButton: 'Back',
            nextButton: 'Next',
            cancelButton: 'Skip Setup',
            optional: 'optional',
          }}
          activeStepIndex={activeStep}
          onNavigate={({ detail }) => setActiveStep(detail.requestedStepIndex)}
          onCancel={() => navigate('/')}
          onSubmit={handleSubmit}
          isLoadingNextStep={submitting}
          steps={[
            {
              title: 'Your Organization',
              description: 'Tell us about your company so we can tailor Stakflo to your needs.',
              content: (
                <Container header={<Header variant="h3">Organization Details</Header>}>
                  <SpaceBetween size="l">
                    <FormField label="Organization name" constraintText="This will appear in your Trust Center.">
                      <Input
                        value={orgName}
                        onChange={({ detail }) => setOrgName(detail.value)}
                        placeholder="Acme Corp"
                      />
                    </FormField>
                    <FormField label="Industry">
                      <Select
                        selectedOption={industry}
                        onChange={({ detail }) => setIndustry(detail.selectedOption as { label: string; value: string })}
                        options={INDUSTRIES}
                        placeholder="Select your industry"
                      />
                    </FormField>
                    <FormField label="Company size">
                      <Select
                        selectedOption={companySize}
                        onChange={({ detail }) => setCompanySize(detail.selectedOption as { label: string; value: string })}
                        options={SIZES}
                        placeholder="Select team size"
                      />
                    </FormField>
                  </SpaceBetween>
                </Container>
              ),
            },
            {
              title: 'Choose Frameworks',
              description: 'Select the compliance frameworks relevant to your business.',
              content: (
                <SpaceBetween size="l">
                  {recommendedFrameworks.length > 0 && (
                    <Alert type="info" header="Recommended for your industry">
                      Based on {industry?.label}, we recommend: {recommendedFrameworks.map((f) => f.name).join(', ')}
                    </Alert>
                  )}
                  <ColumnLayout columns={2}>
                    {FRAMEWORKS.map((fw) => {
                      const isSelected = selectedFrameworks.includes(fw.id);
                      const isRecommended = industry ? fw.recommended.includes(industry.value) : false;
                      return (
                        <Container
                          key={fw.id}
                          header={
                            <Header
                              variant="h3"
                              actions={isRecommended ? <Box variant="small" color="text-status-info">Recommended</Box> : undefined}
                            >
                              <Checkbox
                                checked={isSelected}
                                onChange={({ detail }) => {
                                  if (detail.checked) {
                                    setSelectedFrameworks([...selectedFrameworks, fw.id]);
                                  } else {
                                    setSelectedFrameworks(selectedFrameworks.filter((id) => id !== fw.id));
                                  }
                                }}
                              >
                                <Icon name={fw.icon as any} /> {fw.name}
                              </Checkbox>
                            </Header>
                          }
                        >
                          <Box variant="p" color="text-body-secondary">{fw.description}</Box>
                        </Container>
                      );
                    })}
                  </ColumnLayout>
                </SpaceBetween>
              ),
            },
            {
              title: 'Invite Your Team',
              description: 'Compliance is a team effort. Invite colleagues to collaborate.',
              isOptional: true,
              content: (
                <Container header={<Header variant="h3">Team Invitations</Header>}>
                  <SpaceBetween size="l">
                    <FormField
                      label="Email addresses"
                      description="Comma-separated list of email addresses to invite."
                      constraintText="They'll receive an invitation to join your organization."
                    >
                      <Input
                        value={inviteEmails}
                        onChange={({ detail }) => setInviteEmails(detail.value)}
                        placeholder="alice@company.com, bob@company.com"
                      />
                    </FormField>
                    <Tiles
                      value="viewer"
                      items={[
                        { value: 'viewer', label: 'Viewer', description: 'Can view compliance status and reports' },
                        { value: 'auditor', label: 'Auditor', description: 'Can view and comment on evidence' },
                        { value: 'compliance_lead', label: 'Compliance Lead', description: 'Can manage controls, evidence, and policies' },
                      ]}
                    />
                  </SpaceBetween>
                </Container>
              ),
            },
            {
              title: 'Review & Launch',
              description: 'Review your setup and launch Stakflo.',
              content: (
                <Container header={<Header variant="h3">Setup Summary</Header>}>
                  <SpaceBetween size="l">
                    <ColumnLayout columns={2} variant="text-grid">
                      <div>
                        <Box variant="awsui-key-label">Organization</Box>
                        <Box variant="p">{orgName || '(not set)'}</Box>
                      </div>
                      <div>
                        <Box variant="awsui-key-label">Industry</Box>
                        <Box variant="p">{industry?.label || '(not set)'}</Box>
                      </div>
                      <div>
                        <Box variant="awsui-key-label">Company Size</Box>
                        <Box variant="p">{companySize?.label || '(not set)'}</Box>
                      </div>
                      <div>
                        <Box variant="awsui-key-label">Frameworks</Box>
                        <Box variant="p">
                          {selectedFrameworks.length > 0
                            ? FRAMEWORKS.filter((f) => selectedFrameworks.includes(f.id)).map((f) => f.name).join(', ')
                            : '(none selected)'}
                        </Box>
                      </div>
                    </ColumnLayout>
                    <ProgressBar
                      value={100}
                      label="Setup progress"
                      description="Everything looks good! Click 'Launch Stakflo' to get started."
                      variant="standalone"
                    />
                    <Alert type="success">
                      Our AI copilot will automatically generate controls and policies for your selected frameworks after setup.
                    </Alert>
                  </SpaceBetween>
                </Container>
              ),
            },
          ]}
        />
      </SpaceBetween>
    </div>
  );
}

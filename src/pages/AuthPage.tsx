import { useState } from 'react';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import Container from '@cloudscape-design/components/container';
import Form from '@cloudscape-design/components/form';
import FormField from '@cloudscape-design/components/form-field';
import Header from '@cloudscape-design/components/header';
import Input from '@cloudscape-design/components/input';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Alert from '@cloudscape-design/components/alert';
import Link from '@cloudscape-design/components/link';
import Icon from '@cloudscape-design/components/icon';
import ColumnLayout from '@cloudscape-design/components/column-layout';
import { useAuth } from '../contexts/AuthContext';
import * as awsui from '@cloudscape-design/design-tokens';

function FeatureHighlight({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <SpaceBetween size="xxs" alignItems="center" direction="vertical">
      <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(0, 108, 224, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon as any} variant="link" />
      </div>
      <Box variant="h4" color="text-status-info" textAlign="center">{title}</Box>
      <Box variant="small" color="text-status-inactive" textAlign="center">{description}</Box>
    </SpaceBetween>
  );
}

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      if (isSignUp) {
        const { error: err } = await signUp(email, password);
        if (err) { setError(err.message); } else { setSignUpSuccess(true); }
      } else {
        const { error: err } = await signIn(email, password);
        if (err) setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: `linear-gradient(135deg, ${awsui.colorBackgroundHomeHeader} 0%, #0a1628 100%)` }}>
      <div style={{ width: '100%', maxWidth: 520, padding: awsui.spaceScaledXl }}>
        <SpaceBetween size="l">
          <Box textAlign="center" padding={{ bottom: 's' }}>
            <SpaceBetween size="xxs" alignItems="center" direction="vertical">
              <div style={{ width: 56, height: 56, borderRadius: awsui.borderRadiusContainer, background: awsui.colorBackgroundControlChecked, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="security" size="big" variant="inverted" />
              </div>
              <Box variant="h1" color="text-status-info" fontSize="display-l" fontWeight="bold">Stakflo</Box>
              <Box variant="p" color="text-status-inactive" fontSize="body-m">AI-Powered Continuous Compliance. Always Audit-Ready.</Box>
            </SpaceBetween>
          </Box>
          <Container header={<Header variant="h2">{isSignUp ? 'Create account' : 'Sign in'}</Header>}>
            <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
              <Form actions={<Button variant="primary" loading={loading} fullWidth onClick={handleSubmit}>{isSignUp ? 'Create account' : 'Sign in'}</Button>}>
                <SpaceBetween size="m">
                  {error ? <Alert key="error" type="error">{error}</Alert> : null}
                  {signUpSuccess ? <Alert key="success" type="success">Account created. You are now signed in.</Alert> : null}
                  <FormField key="email" label="Email"><Input type="email" value={email} onChange={({ detail }) => setEmail(detail.value)} placeholder="you@company.com" /></FormField>
                  <FormField key="password" label="Password"><Input type="password" value={password} onChange={({ detail }) => setPassword(detail.value)} placeholder="Enter password" /></FormField>
                  <Box key="link" textAlign="center"><Link onFollow={() => { setIsSignUp(!isSignUp); setError(''); setSignUpSuccess(false); }}>{isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up'}</Link></Box>
                </SpaceBetween>
              </Form>
            </form>
          </Container>
          <div style={{ padding: `0 ${awsui.spaceScaledM}` }}>
            <ColumnLayout columns={3} variant="text-grid">
              <FeatureHighlight icon="gen-ai" title="AI-Powered" description="Automated risk analysis, policy drafting, and remediation planning" />
              <FeatureHighlight icon="security" title="Always Audit-Ready" description="Real-time compliance monitoring across SOC 2, ISO 27001, HIPAA, GDPR" />
              <FeatureHighlight icon="status-positive" title="Unified Operations" description="Controls, evidence, vendors, and policies in one platform" />
            </ColumnLayout>
          </div>
        </SpaceBetween>
      </div>
    </div>
  );
}

import { Component, type ReactNode } from 'react';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import Container from '@cloudscape-design/components/container';
import Header from '@cloudscape-design/components/header';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Icon from '@cloudscape-design/components/icon';
import * as awsui from '@cloudscape-design/design-tokens';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <Box padding="xxl" textAlign="center">
          <SpaceBetween size="l" alignItems="center" direction="vertical">
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: awsui.colorBackgroundNotificationRed,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto',
            }}>
              <Icon name="status-negative" size="big" variant="inverted" />
            </div>
            <Container header={<Header variant="h2">Something went wrong</Header>}>
              <SpaceBetween size="m">
                <Box variant="p" color="text-body-secondary">
                  An unexpected error occurred loading this page. Your data is safe.
                </Box>
                {this.state.error && (
                  <Box variant="code" color="text-status-error" fontSize="body-s">
                    {this.state.error.message}
                  </Box>
                )}
                <SpaceBetween direction="horizontal" size="xs">
                  <Button variant="primary" onClick={this.handleReset}>Try again</Button>
                  <Button onClick={() => window.location.reload()}>Reload page</Button>
                </SpaceBetween>
              </SpaceBetween>
            </Container>
          </SpaceBetween>
        </Box>
      );
    }
    return this.props.children;
  }
}

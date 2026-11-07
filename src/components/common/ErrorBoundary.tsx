import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ShieldAlert } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[PerPay ErrorBoundary caught an unhandled error]:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.hash = '';
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || 'An unexpected rendering error occurred.';
      const isNetworkOrCors = /network|cors|fetch|failed to fetch/i.test(errorMessage);

      return (
        <div
          role="alert"
          style={{
            maxWidth: '820px',
            margin: '48px auto',
            padding: '0 20px',
            position: 'relative',
            zIndex: 10,
          }}
        >
          <div
            className="fin-card"
            style={{
              padding: '40px 36px',
              backgroundColor: '#FFFFFF',
              border: '2px solid #DC2626',
              boxShadow: '0 10px 30px rgba(220, 38, 38, 0.12)',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '12px',
                  backgroundColor: '#FEE2E2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <ShieldAlert size={30} color="#DC2626" />
              </div>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#991B1B', margin: 0 }}>
                  {this.props.fallbackTitle || 'Workspace Interface Recovered from Error'}
                </h2>
                <p style={{ fontSize: '15px', color: '#64748B', marginTop: '4px', margin: 0 }}>
                  A component error was safely caught by the PerPay Error Boundary to prevent a blank screen.
                </p>
              </div>
            </div>

            {/* Error Message Box */}
            <div
              style={{
                backgroundColor: '#FEF2F2',
                border: '1.5px solid #FCA5A5',
                padding: '18px 20px',
                marginBottom: '24px',
                fontSize: '15px',
                color: '#7F1D1D',
                lineHeight: 1.6,
                wordBreak: 'break-word',
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={18} color="#DC2626" />
                <span>Error Diagnostic Details:</span>
              </div>
              <code
                style={{
                  fontFamily: '"Courier New", Courier, monospace',
                  fontSize: '14px',
                  color: '#991B1B',
                  display: 'block',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {errorMessage}
              </code>
              {isNetworkOrCors && (
                <div style={{ marginTop: '10px', fontSize: '13px', color: '#B91C1C' }}>
                  <strong>Tip:</strong> This may be caused by an unreachable AI Gateway or browser CORS restriction. You can continue using local fallback simulation.
                </div>
              )}
            </div>

            {/* Recovery Action Buttons */}
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={this.handleReset}
                className="fin-btn fin-btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '16px',
                  padding: '12px 24px',
                  border: '2px solid #0F172A',
                  fontWeight: 700,
                }}
              >
                <Home size={18} />
                <span>Reset & Return to Workspace</span>
              </button>

              <button
                type="button"
                onClick={this.handleReload}
                className="fin-btn fin-btn-secondary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '16px',
                  padding: '12px 24px',
                  border: '2px solid #CBD5E1',
                  fontWeight: 700,
                }}
              >
                <RefreshCw size={18} />
                <span>Reload Application</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}


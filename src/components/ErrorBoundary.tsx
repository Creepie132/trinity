'use client';

import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div style={{
          padding: '20px',
          margin: '20px',
          backgroundColor: '#fee',
          border: '2px solid #f00',
          borderRadius: '8px',
          fontFamily: 'monospace',
        }}>
          <h2 style={{ color: '#d00', marginBottom: '10px' }}>
            Something went wrong
          </h2>
          <details style={{ whiteSpace: 'pre-wrap', color: '#600' }}>
            <summary style={{ cursor: 'pointer', marginBottom: '10px' }}>
              Error details
            </summary>
            <p><strong>Message:</strong> {this.state.error.message}</p>
            <p><strong>Stack:</strong></p>
            <pre style={{ fontSize: '12px', overflow: 'auto' }}>
              {this.state.error.stack}
            </pre>
          </details>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '10px',
              padding: '8px 16px',
              backgroundColor: '#d00',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[UI ErrorBoundary Caught]:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, textAlign: 'center', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, margin: 20 }}>
          <div style={{ fontSize: 42, marginBottom: 12 }}>⚠️</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#991B1B', marginBottom: 8 }}>Component Render Notice</h3>
          <p style={{ fontSize: 13, color: '#B91C1C', marginBottom: 16 }}>
            {this.state.error?.message || 'An unexpected rendering error occurred in this view.'}
          </p>
          <button
            onClick={this.handleReset}
            style={{
              background: '#DC2626',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 8,
              padding: '8px 18px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            🔄 Reload Subsystem
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('Error caught by boundary:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: 'var(--bg)',
          color: 'var(--text)',
          fontFamily: 'var(--font-mono)',
          padding: '40px',
          textAlign: 'center'
        }}>
          <h1 style={{ fontSize: '24px', marginBottom: '20px', color: 'var(--accent2)' }}>⚠️ ERROR</h1>
          <p style={{ fontSize: '14px', marginBottom: '20px', opacity: 0.8 }}>
            An unexpected error occurred. Please refresh the page.
          </p>
          <details style={{ 
            maxWidth: '600px', 
            background: 'var(--bg2)', 
            padding: '16px', 
            borderRadius: '2px', 
            border: '1px solid var(--border)',
            textAlign: 'left',
            fontSize: '11px',
            fontFamily: 'monospace'
          }}>
            <summary style={{ cursor: 'pointer', marginBottom: '10px', color: 'var(--accent)' }}>
              Error Details
            </summary>
            <pre style={{ overflow: 'auto', margin: 0, color: 'var(--text-muted)' }}>
              {this.state.error?.toString()}
            </pre>
          </details>
        </div>
      )
    }

    return this.props.children
  }
}

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

/** 单页崩溃时不白整站，给出可恢复的提示 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 48, textAlign: 'center', color: '#8b949e' }}>
          <h2 style={{ color: '#e6edf3' }}>页面出错了</h2>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{String(this.state.error)}</pre>
          <button className="btn" onClick={() => this.setState({ error: null })}>重试</button>
          <button className="btn" style={{ marginLeft: 8 }} onClick={() => location.reload()}>刷新页面</button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

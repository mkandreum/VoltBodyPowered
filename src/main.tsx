import {StrictMode, Component, type ReactNode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

console.log('[VoltBody] main.tsx loaded');

// Error Boundary to catch any React crash
class ErrorBoundary extends Component<{children: ReactNode}, {error: Error | null}> {
  constructor(props: {children: ReactNode}) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: any) {
    console.error('[VoltBody] React crash:', error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{padding: '2rem', color: 'white', background: '#050505', minHeight: '100vh', fontFamily: 'sans-serif'}}>
          <h1 style={{color: '#ff4444', marginBottom: '1rem'}}>Error en VoltBody</h1>
          <pre style={{color: '#ff9999', whiteSpace: 'pre-wrap', wordBreak: 'break-all'}}>
            {this.state.error.message}
          </pre>
          <button 
            onClick={() => { localStorage.clear(); window.location.reload(); }}
            style={{marginTop: '1rem', padding: '0.5rem 1rem', background: '#39ff14', color: 'black', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold'}}
          >
            Reiniciar App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

try {
  const root = document.getElementById('root');
  console.log('[VoltBody] Root element:', root);
  
  if (root) {
    createRoot(root).render(
      <StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </StrictMode>,
    );
    console.log('[VoltBody] React mounted successfully');
  } else {
    console.error('[VoltBody] Root element not found!');
  }
} catch (err) {
  console.error('[VoltBody] Fatal error mounting app:', err);
  document.body.innerHTML = `<div style="padding:2rem;color:white;background:#050505;min-height:100vh;font-family:sans-serif"><h1 style="color:#ff4444">Error Fatal</h1><pre style="color:#ff9999">${err}</pre></div>`;
}

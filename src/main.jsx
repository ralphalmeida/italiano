import { Component } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="login">
        <div className="card login-card">
          <h1>Ops! 😅</h1>
          <p className="muted">Algo deu errado. Seu progresso está salvo.</p>
          <button className="btn btn-primary btn-block" onClick={() => location.reload()}>Recarregar</button>
        </div>
      </div>
    );
  }
}

createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);

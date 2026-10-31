import { useEffect, useState } from 'react';
import { api } from './lib/api.js';
import { ProgressProvider, useProgress } from './lib/store.jsx';
import { units, lessonById } from './data/index.js';
import { dueCards } from './lib/progress.js';
import { Path } from './components/Path.jsx';
import { LessonIntro, LessonPlayer } from './components/Lesson.jsx';
import { ReviewHome, ReviewSession } from './components/Review.jsx';
import { ReadingList, ReadingPlayer } from './components/Readings.jsx';
import { Profile } from './components/Profile.jsx';
import { StatsBar, Toasts } from './components/ui.jsx';

export default function App() {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    api.me().then((d) => setUser(d.email)).catch(() => setUser(null));
  }, []);

  if (user === undefined) return <div className="splash">🇮🇹</div>;
  if (!user) return <Login onLogin={setUser} />;
  return (
    <ProgressProvider email={user}>
      <Main onLogout={() => api.logout().finally(() => setUser(null))} />
    </ProgressProvider>
  );
}

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const d = await api.login(email, password);
      onLogin(d.email);
    } catch (err) {
      setError(err.status === 401 ? 'E-mail ou senha incorretos.' : 'Não foi possível entrar. Tente de novo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <form className="card login-card" onSubmit={submit}>
        <div className="flag"><i /><i /><i /></div>
        <h1>Italiano B1</h1>
        <p className="muted">Preparação para a prova de cidadania</p>
        <label>E-mail<input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <label>Senha<input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        {error && <p className="error">{error}</p>}
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
      </form>
    </div>
  );
}

const TABS = [
  { id: 'path', icon: '🗺️', label: 'Trilha' },
  { id: 'review', icon: '🧠', label: 'Revisão' },
  { id: 'reading', icon: '📰', label: 'Leitura' },
  { id: 'profile', icon: '👤', label: 'Perfil' },
];

function Main({ onLogout }) {
  const { progress } = useProgress();
  const [tab, setTab] = useState('path');
  const [view, setView] = useState(null); // { kind, id }
  const due = dueCards(progress).length;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tab, view]);

  // botão "voltar" do navegador/celular fecha a tela aberta
  useEffect(() => {
    if (!view) return;
    history.pushState({ view: true }, '');
    const onPop = () => setView(null);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [view?.kind, view?.id]); // eslint-disable-line

  const close = () => {
    if (history.state?.view) history.back();
    else setView(null);
  };

  let screen = null;
  if (view?.kind === 'intro') {
    const lesson = lessonById[view.id];
    const unit = units.find((u) => u.id === lesson.unitId);
    screen = <LessonIntro lesson={lesson} unit={unit} onBack={close} onStart={() => setView({ kind: 'play', id: view.id })} />;
  } else if (view?.kind === 'play') {
    screen = <LessonPlayer lesson={lessonById[view.id]} onExit={close} />;
  } else if (view?.kind === 'review') {
    screen = <ReviewSession onExit={close} />;
  } else if (view?.kind === 'reading') {
    screen = <ReadingPlayer id={view.id} onExit={close} />;
  }

  return (
    <>
      <Toasts />
      {screen || (
        <div className="app">
          <header className="app-head">
            <div className="brand"><div className="flag sm"><i /><i /><i /></div>Italiano B1</div>
            <StatsBar />
          </header>
          <main className="app-main">
            {tab === 'path' && <Path onOpen={(id) => setView({ kind: 'intro', id })} />}
            {tab === 'review' && <ReviewHome onStart={() => setView({ kind: 'review' })} />}
            {tab === 'reading' && <ReadingList onOpen={(id) => setView({ kind: 'reading', id })} />}
            {tab === 'profile' && <Profile onLogout={onLogout} />}
          </main>
          <nav className="tabbar">
            {TABS.map((t) => (
              <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
                <span className="tab-icon">{t.icon}{t.id === 'review' && due > 0 && <em className="badge">{due}</em>}</span>
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}

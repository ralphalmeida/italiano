import { useEffect, useMemo, useState } from 'react';
import { useProgress } from '../lib/store.jsx';
import { addXp, dueCards, gradeCard, masteredCount } from '../lib/progress.js';
import { sfx } from '../lib/sfx.js';
import { Confetti } from './ui.jsx';

const SESSION = 20;

export function ReviewHome({ onStart }) {
  const { progress } = useProgress();
  const due = dueCards(progress);
  const all = Object.values(progress.srs);
  const boxes = [0, 0, 0, 0];
  for (const c of all) boxes[c.box >= 5 ? 3 : c.box >= 3 ? 2 : c.box >= 1 ? 1 : 0]++;
  const labels = ['Novas', 'Aprendendo', 'Fixando', 'Dominadas'];

  return (
    <div className="stack">
      <div className="card hero-card">
        <div className="hero-emoji">🧠</div>
        <h1>Revisão espaçada</h1>
        <p className="muted">
          Cada palavra volta no momento certo: se você acerta, ela demora mais para voltar; se erra, volta logo.
          Poucos minutos por dia fixam o vocabulário de vez.
        </p>
        {all.length === 0 ? (
          <p className="empty">Conclua uma lição para adicionar as primeiras palavras.</p>
        ) : due.length ? (
          <button className="btn btn-primary btn-block" onClick={onStart}>
            Revisar {Math.min(SESSION, due.length)} {due.length > SESSION ? `de ${due.length} ` : ''}palavras
          </button>
        ) : (
          <p className="empty">🎉 Tudo revisado por hoje! Volte amanhã.</p>
        )}
      </div>
      {all.length > 0 && (
        <div className="card">
          <h3>Seu vocabulário · {all.length} palavras</h3>
          <div className="boxes">
            {boxes.map((n, i) => (
              <div key={i} className={`box box-${i}`}>
                <b>{n}</b>
                <span>{labels[i]}</span>
              </div>
            ))}
          </div>
          <p className="muted small">{masteredCount(progress)} palavras dominadas (revisadas com sucesso por 2+ semanas).</p>
        </div>
      )}
    </div>
  );
}

export function ReviewSession({ onExit }) {
  const { progress, update } = useProgress();
  // Fixa as cartas da sessão no início; erros voltam para o fim da fila.
  const initial = useMemo(() => dueCards(progress).slice(0, SESSION).map((c) => ({ ...c, dir: Math.random() < 0.5 ? 'it' : 'pt' })), []); // eslint-disable-line
  const [queue, setQueue] = useState(initial);
  const [pos, setPos] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [stats, setStats] = useState({ right: 0, wrong: 0, xp: 0 });
  const [done, setDone] = useState(false);
  const card = queue[pos];

  function grade(g) {
    const firstTime = !card.again;
    if (firstTime) update((p) => gradeCard(p, card.id, g));
    if (g === 0) {
      sfx.wrong();
      setQueue((q) => [...q, { ...card, again: true }]);
      setStats((s) => ({ ...s, wrong: s.wrong + 1 }));
    } else {
      sfx.correct();
      setStats((s) => ({ ...s, right: s.right + 1, xp: s.xp + (firstTime ? 3 : 1) }));
    }
    setFlipped(false);
    if (pos + 1 >= queue.length + (g === 0 ? 1 : 0)) finish(g === 0 ? stats.xp : stats.xp + (firstTime ? 3 : 1));
    else setPos(pos + 1);
  }

  function finish(xp) {
    update((p) => addXp(p, xp + 5));
    sfx.finish();
    setDone(true);
  }

  useEffect(() => {
    const onKey = (e) => {
      if (done || !card) return;
      if (!flipped && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        setFlipped(true);
      } else if (flipped && ['1', '2', '3'].includes(e.key)) grade(Number(e.key) - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!card && !done) return <div className="screen center"><p>Nada para revisar.</p><button className="btn btn-primary" onClick={onExit}>Voltar</button></div>;

  if (done)
    return (
      <div className="screen results">
        <Confetti />
        <div className="results-inner">
          <div className="hero-emoji">🧠</div>
          <h1>Revisão concluída!</h1>
          <div className="result-stats">
            <div className="stat"><b>+{stats.xp + 5}</b><span>XP</span></div>
            <div className="stat"><b>{initial.length}</b><span>palavras</span></div>
            <div className="stat"><b>{stats.wrong}</b><span>para reforçar</span></div>
          </div>
          <button className="btn btn-primary btn-block" onClick={onExit}>Continuar</button>
        </div>
      </div>
    );

  const front = card.dir === 'it' ? card.it : card.pt;
  const back = card.dir === 'it' ? card.pt : card.it;

  return (
    <div className="screen player">
      <header className="player-top">
        <button className="icon-btn" onClick={onExit} aria-label="Sair">✕</button>
        <div className="bar"><div className="bar-fill" style={{ width: `${(stats.right / initial.length) * 100}%` }} /></div>
        <div className="combo">{stats.right}/{initial.length}</div>
      </header>
      <main className="player-body">
        <span className="eyebrow">{card.dir === 'it' ? 'O que significa?' : 'Como se diz em italiano?'}{card.again ? ' · 🔁' : ''}</span>
        <button className={`flashcard ${flipped ? 'flipped' : ''}`} onClick={() => setFlipped(true)}>
          <div className="fc-inner">
            <div className="fc-face fc-front">
              <span className="fc-lang">{card.dir === 'it' ? '🇮🇹' : '🇧🇷'}</span>
              <b>{front}</b>
              <span className="muted small">Pense na resposta e toque para virar</span>
            </div>
            <div className="fc-face fc-back">
              <span className="fc-lang">{card.dir === 'it' ? '🇧🇷' : '🇮🇹'}</span>
              <b>{back}</b>
              <span className="muted small">{front}</span>
            </div>
          </div>
        </button>
      </main>
      <footer className="check-bar">
        {flipped ? (
          <div className="grade-row">
            <button className="btn btn-danger" onClick={() => grade(0)}>Errei<small>1</small></button>
            <button className="btn btn-primary" onClick={() => grade(1)}>Acertei<small>2</small></button>
            <button className="btn btn-blue" onClick={() => grade(2)}>Fácil<small>3</small></button>
          </div>
        ) : (
          <button className="btn btn-primary btn-block" onClick={() => setFlipped(true)}>Mostrar resposta</button>
        )}
      </footer>
    </div>
  );
}

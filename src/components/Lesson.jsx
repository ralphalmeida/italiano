import { useCallback, useEffect, useState } from 'react';
import { Exercise, TYPE_LABEL, buildSession, canCheck, evaluate } from './Exercises.jsx';
import { useProgress } from '../lib/store.jsx';
import { addXp, completeLesson, starsFor } from '../lib/progress.js';
import { richParts } from '../lib/text.js';
import { sfx } from '../lib/sfx.js';
import { Confetti } from './ui.jsx';

export function Rich({ text }) {
  return richParts(text).map((p, i) => (p.b ? <strong key={i}>{p.b}</strong> : <span key={i}>{p.t}</span>));
}

export function Theory({ blocks }) {
  return blocks.map((b, i) => {
    if (b.type === 'p') return <p key={i} className="t-p"><Rich text={b.text} /></p>;
    if (b.type === 'tip') return <div key={i} className="t-tip">💡 <Rich text={b.text} /></div>;
    if (b.type === 'examples')
      return (
        <ul key={i} className="t-examples">
          {b.items.map(([it, pt], j) => (
            <li key={j}><span className="it">{it}</span><span className="pt">{pt}</span></li>
          ))}
        </ul>
      );
    if (b.type === 'table')
      return (
        <div key={i} className="t-table-wrap">
          <table className="t-table">
            <thead><tr>{b.head.map((h, j) => <th key={j}>{h}</th>)}</tr></thead>
            <tbody>{b.rows.map((r, j) => <tr key={j}>{r.map((c, k) => <td key={k}><Rich text={c} /></td>)}</tr>)}</tbody>
          </table>
        </div>
      );
    return null;
  });
}

export function LessonIntro({ lesson, unit, onStart, onBack }) {
  return (
    <div className="screen">
      <header className="topbar">
        <button className="icon-btn" onClick={onBack} aria-label="Voltar">←</button>
        <div className="topbar-title">{unit.emoji} {unit.title}</div>
      </header>
      <article className="card theory">
        <span className="eyebrow">Lição</span>
        <h1>{lesson.title}</h1>
        <Theory blocks={lesson.theory} />
        {lesson.vocab?.length > 0 && (
          <>
            <h2>Vocabulário</h2>
            <ul className="vocab-list">
              {lesson.vocab.map(([it, pt]) => (
                <li key={it}><span className="it">{it}</span><span className="pt">{pt}</span></li>
              ))}
            </ul>
            <p className="muted small">Essas palavras vão para a sua revisão espaçada ao concluir a lição.</p>
          </>
        )}
      </article>
      <div className="sticky-cta">
        <button className="btn btn-primary btn-block" onClick={onStart}>Praticar 💪</button>
      </div>
    </div>
  );
}

export function LessonPlayer({ lesson, onExit }) {
  const { update } = useProgress();
  const [queue, setQueue] = useState(() => buildSession(lesson).map((ex, i) => ({ ex, key: i, retry: false })));
  const [total] = useState(queue.length);
  const [pos, setPos] = useState(0);
  const [value, setValue] = useState(null);
  const [result, setResult] = useState(null);
  const [stats, setStats] = useState({ first: 0, wrong: 0, xp: 0, combo: 0, bestCombo: 0 });
  const [finished, setFinished] = useState(null);
  const [confirmExit, setConfirmExit] = useState(false);

  const item = queue[pos];
  const solved = pos - queue.slice(0, pos).filter((q) => q.retry).length;

  const submit = useCallback(() => {
    if (result) return next();
    if (!item || !canCheck(item.ex, value)) return;
    const r = evaluate(item.ex, value);
    r.word = r.ok ? pick(['Ottimo!', 'Bravo!', 'Perfetto!', 'Esatto!', 'Bene!']) : 'Quase!';
    setResult(r);
    if (r.ok) {
      sfx.correct();
      setStats((s) => {
        const combo = s.combo + 1;
        const gain = (item.retry ? 5 : 10) + (combo >= 5 ? 5 : combo >= 3 ? 2 : 0);
        return { ...s, first: s.first + (item.retry ? 0 : 1), xp: s.xp + gain, combo, bestCombo: Math.max(s.bestCombo, combo) };
      });
    } else {
      sfx.wrong();
      setStats((s) => ({ ...s, wrong: s.wrong + 1, combo: 0 }));
      setQueue((q) => [...q, { ...item, key: `${item.key}r${q.length}`, retry: true }]);
    }
  }, [result, item, value]);

  function next() {
    setResult(null);
    setValue(null);
    if (pos + 1 >= queue.length) return finish();
    setPos(pos + 1);
  }

  function finish() {
    const accuracy = stats.first / total;
    const bonus = 20 + (accuracy === 1 ? 10 : 0);
    const xp = stats.xp + bonus;
    update((p) => completeLesson(addXp(p, xp), lesson, accuracy));
    sfx.finish();
    setFinished({ accuracy, xp, stars: starsFor(accuracy), bonus });
  }

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Enter' && (result || item?.ex.type === 'mc' || item?.ex.type === 'vocab' || item?.ex.type === 'order')) {
        e.preventDefault();
        submit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [submit, result, item]);

  if (finished) return <Results lesson={lesson} {...finished} combo={stats.bestCombo} onDone={onExit} />;

  return (
    <div className="screen player">
      <header className="player-top">
        <button className="icon-btn" onClick={() => setConfirmExit(true)} aria-label="Sair">✕</button>
        <div className="bar"><div className="bar-fill" style={{ width: `${(solved / total) * 100}%` }} /></div>
        <div className={`combo ${stats.combo >= 3 ? 'hot' : ''}`} title="Acertos seguidos">🔥 {stats.combo}</div>
      </header>

      <main className="player-body" key={item.key}>
        <span className="eyebrow">{item.retry ? '🔁 Tente de novo · ' : ''}{TYPE_LABEL[item.ex.type]}</span>
        <Exercise ex={item.ex} value={value} onChange={setValue} locked={Boolean(result)} onSubmit={submit} />
      </main>

      <footer className={`check-bar ${result ? (result.ok ? 'ok' : 'ko') : ''}`}>
        {result && (
          <div className="feedback">
            <strong>{result.word}</strong>
            {!result.ok && result.solution && <p>Resposta: <b>{result.solution}</b></p>}
            {result.note && <p>{result.note}</p>}
            {item.ex.explain && (!result.ok || result.note) && <p className="muted-on">{item.ex.explain}</p>}
          </div>
        )}
        {item.ex.type !== 'match' || result ? (
          <button className={`btn btn-block ${result ? (result.ok ? 'btn-primary' : 'btn-danger') : 'btn-primary'}`} disabled={!result && !canCheck(item.ex, value)} onClick={submit}>
            {result ? 'Continuar' : 'Verificar'}
          </button>
        ) : (
          <button className="btn btn-primary btn-block" disabled={value !== 'done'} onClick={submit}>Verificar</button>
        )}
      </footer>

      {confirmExit && (
        <div className="modal-bg" onClick={() => setConfirmExit(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Sair da lição?</h3>
            <p className="muted">Você vai perder o progresso desta lição.</p>
            <button className="btn btn-primary btn-block" onClick={() => setConfirmExit(false)}>Continuar estudando</button>
            <button className="btn btn-ghost btn-block" onClick={onExit}>Sair</button>
          </div>
        </div>
      )}
    </div>
  );
}

const pick = (a) => a[Math.floor(Math.random() * a.length)];

function Results({ lesson, accuracy, xp, stars, combo, onDone }) {
  return (
    <div className="screen results">
      <Confetti />
      <div className="results-inner">
        <div className="stars-big">
          {[1, 2, 3].map((s) => (
            <span key={s} className={s <= stars ? 'on' : ''} style={{ animationDelay: `${s * 0.18}s` }}>★</span>
          ))}
        </div>
        <h1>{stars === 3 ? 'Fantastico!' : stars === 2 ? 'Molto bene!' : 'Lição concluída!'}</h1>
        <p className="muted">{lesson.title}</p>
        <div className="result-stats">
          <div className="stat"><b>+{xp}</b><span>XP</span></div>
          <div className="stat"><b>{Math.round(accuracy * 100)}%</b><span>de primeira</span></div>
          <div className="stat"><b>{combo}</b><span>melhor combo</span></div>
        </div>
        {stars < 3 && <p className="muted small">Acerte 90% de primeira para ganhar 3 estrelas.</p>}
        <button className="btn btn-primary btn-block" onClick={onDone}>Continuar</button>
      </div>
    </div>
  );
}

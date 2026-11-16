import { useCallback, useEffect, useMemo, useState } from 'react';
import { Exercise, TYPE_LABEL, buildSession, canCheck, evaluate, hintFor } from './Exercises.jsx';
import { useProgress } from '../lib/store.jsx';
import { addCards, addXp, completeLesson, starsFor } from '../lib/progress.js';
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

const STEP_N = { vocab: 1, learn: 2, practice: 3 };

export function LessonIntro({ lesson, unit, onStart, onBack }) {
  return (
    <div className="screen">
      <header className="topbar">
        <button className="icon-btn" onClick={onBack} aria-label="Voltar">←</button>
        <div className="topbar-title">{unit.emoji} {unit.title}</div>
      </header>
      <article className="card theory">
        <span className="eyebrow">{lesson.review ? 'Revisão da unidade' : `${lesson.step.icon} Etapa ${STEP_N[lesson.step.key]} de 3 · ${lesson.step.label}`}</span>
        <h1>{lesson.review ? lesson.title : lesson.lessonTitle}</h1>
        <Theory blocks={lesson.theory} />
        {lesson.recap && (
          <details className="recap">
            <summary>📘 Rever a explicação</summary>
            <Theory blocks={lesson.recap} />
          </details>
        )}
        {lesson.step?.key === 'vocab' && (
          <>
            <h2>Vocabulário</h2>
            <ul className="vocab-list">
              {lesson.vocab.map(([it, pt]) => (
                <li key={it}><span className="it">{it}</span><span className="pt">{pt}</span></li>
              ))}
            </ul>
            <p className="muted small">Essas palavras vão para a sua revisão espaçada ao concluir esta etapa.</p>
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
  const [queue, setQueue] = useState(() => buildSession(lesson).map((ex, i) => ({ ex, key: i, base: i, retry: false })));
  const [fails, setFails] = useState({}); // erros por questão (base)
  const [askedHint, setAskedHint] = useState(0); // dicas pedidas na tentativa atual
  const [hard, setHard] = useState([]); // frases que foram para a Revisão
  const [total] = useState(queue.length);
  const [pos, setPos] = useState(0);
  const [value, setValue] = useState(null);
  const [result, setResult] = useState(null);
  const [stats, setStats] = useState({ first: 0, wrong: 0, xp: 0, combo: 0, bestCombo: 0 });
  const [finished, setFinished] = useState(null);
  const [confirmExit, setConfirmExit] = useState(false);

  const item = queue[pos];
  const solved = pos - queue.slice(0, pos).filter((q) => q.retry).length;
  const failCount = item ? fails[item.base] || 0 : 0;
  // múltipla escolha sem regra escrita só tem um nível de dica (tirar alternativas)
  const maxHint = !item || item.ex.type === 'match' ? 0 : item.ex.type === 'vocab' || (item.ex.type === 'mc' && !item.ex.explain) ? 1 : 2;
  const hintLevel = Math.min(maxHint, failCount + askedHint);
  const hint = useMemo(() => (item ? hintFor(item.ex, hintLevel) : null), [item?.key, hintLevel]); // eslint-disable-line
  const canAskHint = hintLevel < maxHint;

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
        const gain = (item.retry || hintLevel > 0 ? 5 : 10) + (combo >= 5 ? 5 : combo >= 3 ? 2 : 0);
        return { ...s, first: s.first + (item.retry ? 0 : 1), xp: s.xp + gain, combo, bestCombo: Math.max(s.bestCombo, combo) };
      });
    } else {
      sfx.wrong();
      const n = failCount + 1;
      setFails((f) => ({ ...f, [item.base]: n }));
      setStats((s) => ({ ...s, wrong: s.wrong + 1, combo: 0 }));
      // até 3 tentativas; depois a frase vai para a Revisão em vez de voltar de novo
      if (n < 3) setQueue((q) => [...q, { ...item, key: `${item.key}r${q.length}`, retry: true }]);
      else {
        r.parked = true;
        const card = cardFor(item.ex);
        if (card) setHard((h) => [...h, card]);
      }
    }
  }, [result, item, value, failCount, hintLevel]);

  function next() {
    setResult(null);
    setValue(null);
    setAskedHint(0);
    if (pos + 1 >= queue.length) return finish();
    setPos(pos + 1);
  }

  function finish() {
    const accuracy = stats.first / total;
    const bonus = 20 + (accuracy === 1 ? 10 : 0);
    const xp = stats.xp + bonus;
    update((p) => addCards(completeLesson(addXp(p, xp), lesson, accuracy), hard, lesson.id));
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
        <span className="eyebrow">{item.retry ? `🔁 Tentativa ${failCount + 1} de 3 · ` : ''}{TYPE_LABEL[item.ex.reverse ? 'vocabRev' : item.ex.type]}</span>
        <Exercise ex={item.ex} value={value} onChange={setValue} locked={Boolean(result)} onSubmit={submit} hint={result ? null : hint} />
        {!result && hint && <div className="hint-box">💡 {hint.text}</div>}
        {!result && canAskHint && (
          <button className="hint-btn" onClick={() => setAskedHint((h) => h + 1)}>💡 {hintLevel === 0 ? 'Quero uma dica' : 'Mais uma dica'}</button>
        )}
      </main>

      <footer className={`check-bar ${result ? (result.ok ? 'ok' : 'ko') : ''}`}>
        {result && (
          <div className="feedback">
            <strong>{result.word}</strong>
            {!result.ok && result.solution && <p>Resposta: <b>{result.solution}</b></p>}
            {result.note && <p>{result.note}</p>}
            {item.ex.explain && (!result.ok || result.note) && <p className="muted-on">{item.ex.explain}</p>}
            {result.parked && <p className="muted-on">🧠 {cardFor(item.ex) ? 'Essa frase foi para a sua Revisão para você treinar com calma.' : 'Vamos seguir — ela volta na próxima vez.'}</p>}
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

// Vira flashcard [italiano, português] quando a questão é errada 3 vezes.
function cardFor(ex) {
  if (ex.type === 'order') return [ex.answer, ex.pt];
  if (ex.type === 'translate') return [ex.answer[0], ex.pt];
  if (ex.type === 'fill') return [ex.prompt.replace('___', ex.answer[0]), ex.explain || ex.hint || 'complete a frase'];
  return null;
}

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

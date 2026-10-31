import { useMemo, useState } from 'react';
import { readings } from '../data/index.js';
import { useProgress } from '../lib/store.jsx';
import { addXp } from '../lib/progress.js';
import { sfx } from '../lib/sfx.js';
import { shuffle } from '../lib/text.js';
import { Confetti } from './ui.jsx';

export function ReadingList({ onOpen }) {
  const { progress } = useProgress();
  return (
    <div className="stack">
      <div className="card hero-card">
        <div className="hero-emoji">📰</div>
        <h1>Comprensione della lettura</h1>
        <p className="muted">
          Textos no estilo da prova B1: anúncios, avisos, e-mails e artigos. Leia com calma, depois responda.
          Você pode voltar ao texto durante as perguntas.
        </p>
      </div>
      {readings.map((r) => {
        const rec = progress.readings[r.id];
        return (
          <button key={r.id} className="card reading-row" onClick={() => onOpen(r.id)}>
            <span className="tag">{r.kind}</span>
            <b>{r.title}</b>
            <span className="muted small">{r.questions.length} perguntas</span>
            {rec && <span className="score">{rec.best}/{r.questions.length} ✓</span>}
          </button>
        );
      })}
    </div>
  );
}

export function ReadingPlayer({ id, onExit }) {
  const r = useMemo(() => {
    const base = readings.find((x) => x.id === id);
    // embaralha as alternativas (exceto Vero/Falso) para a posição da certa não virar padrão
    const questions = base.questions.map((q) => {
      if (q.options.length <= 2) return q;
      const options = shuffle(q.options);
      return { ...q, options, answer: options.indexOf(q.options[q.answer]) };
    });
    return { ...base, questions };
  }, [id]);
  const { update } = useProgress();
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const score = r.questions.filter((q, i) => answers[i] === q.answer).length;
  const complete = Object.keys(answers).length === r.questions.length;

  function submit() {
    setSubmitted(true);
    const xp = score * 8 + 10;
    update((p) => {
      const prev = p.readings[r.id];
      return { ...addXp(p, xp), readings: { ...p.readings, [r.id]: { best: Math.max(prev?.best || 0, score), at: Date.now() } } };
    });
    score === r.questions.length ? sfx.finish() : sfx.correct();
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }

  return (
    <div className="screen">
      {submitted && score === r.questions.length && <Confetti />}
      <header className="topbar">
        <button className="icon-btn" onClick={onExit} aria-label="Voltar">←</button>
        <div className="topbar-title">📰 {r.kind}</div>
      </header>
      <article className="card reading-text">
        <h1>{r.title}</h1>
        {r.text.split(/\n\n+/).map((para, i) => <p key={i}>{para}</p>)}
      </article>
      <div className="stack">
        {r.questions.map((q, i) => (
          <div key={i} className="card question">
            <p className="prompt-sm"><b>{i + 1}.</b> {q.prompt}</p>
            <div className={`options ${q.options.length === 2 ? 'options-row' : ''}`}>
              {q.options.map((o, j) => {
                const cls = submitted ? (j === q.answer ? 'right' : answers[i] === j ? 'wrong' : '') : answers[i] === j ? 'selected' : '';
                return (
                  <button key={j} className={`option ${cls}`} disabled={submitted} onClick={() => setAnswers((a) => ({ ...a, [i]: j }))}>{o}</button>
                );
              })}
            </div>
            {submitted && q.explain && <p className="explain">{answers[i] === q.answer ? '✅' : '❌'} {q.explain}</p>}
          </div>
        ))}
      </div>
      <div className="sticky-cta">
        {submitted ? (
          <div className="reading-result">
            <b>{score}/{r.questions.length} corretas · +{score * 8 + 10} XP</b>
            <button className="btn btn-primary btn-block" onClick={onExit}>Voltar aos textos</button>
          </div>
        ) : (
          <button className="btn btn-primary btn-block" disabled={!complete} onClick={submit}>
            {complete ? 'Corrigir' : `Responda todas (${Object.keys(answers).length}/${r.questions.length})`}
          </button>
        )}
      </div>
    </div>
  );
}

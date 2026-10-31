import { useEffect, useMemo, useRef, useState } from 'react';
import { check, normalize, shuffle } from '../lib/text.js';
import { sfx } from '../lib/sfx.js';

export const TYPE_LABEL = {
  mc: 'Escolha a resposta certa',
  vocab: 'O que significa?',
  fill: 'Complete a frase',
  order: 'Monte a frase em italiano',
  translate: 'Traduza para o italiano',
  match: 'Ligue os pares',
};

// Gera exercícios de vocabulário a partir da lista da lição.
export function buildSession(lesson) {
  const vocab = lesson.vocab || [];
  const extra = [];
  if (vocab.length >= 4) {
    extra.push({ type: 'match', pairs: shuffle(vocab).slice(0, 5) });
    for (const [it, pt] of shuffle(vocab).slice(0, 2)) {
      const wrong = shuffle(vocab.filter((v) => v[0] !== it)).slice(0, 3).map((v) => v[1]);
      const options = shuffle([pt, ...wrong]);
      extra.push({ type: 'vocab', prompt: it, options, answer: options.indexOf(pt), explain: `${it} = ${pt}` });
    }
  }
  const own = lesson.exercises.map((ex) => {
    if (ex.type !== 'mc') return ex;
    const options = shuffle(ex.options);
    return { ...ex, options, answer: options.indexOf(ex.options[ex.answer]) };
  });
  return [extra[0], ...shuffle([...extra.slice(1), ...own])].filter(Boolean);
}

// Avalia a resposta. Retorna { ok, note, solution }
export function evaluate(ex, value) {
  switch (ex.type) {
    case 'mc':
    case 'vocab':
      return { ok: value === ex.answer, solution: ex.options[ex.answer] };
    case 'fill': {
      const r = check(value, ex.answer);
      return { ok: Boolean(r), note: r === 'accents' ? `Atenção ao acento: ${ex.answer[0]}` : null, solution: ex.answer[0] };
    }
    case 'order': {
      const given = normalize(value.map((t) => t.w).join(' '));
      const ok = [ex.answer, ...(ex.alt || [])].some((a) => normalize(a) === given);
      return { ok, solution: ex.answer };
    }
    case 'translate': {
      const r = check(value, ex.answer);
      return { ok: Boolean(r), note: r === 'accents' ? `Atenção aos acentos: ${ex.answer[0]}` : null, solution: ex.answer[0] };
    }
    case 'match':
      return { ok: true };
    default:
      return { ok: false };
  }
}

export function canCheck(ex, value) {
  if (ex.type === 'mc' || ex.type === 'vocab') return value !== null && value !== undefined;
  if (ex.type === 'order') return Array.isArray(value) && value.length > 0;
  if (ex.type === 'match') return value === 'done';
  return typeof value === 'string' && value.trim().length > 0;
}

export function Exercise({ ex, value, onChange, locked, onSubmit }) {
  switch (ex.type) {
    case 'mc':
    case 'vocab':
      return <Choice ex={ex} value={value} onChange={onChange} locked={locked} />;
    case 'fill':
      return <Fill ex={ex} value={value} onChange={onChange} locked={locked} onSubmit={onSubmit} />;
    case 'order':
      return <Order ex={ex} value={value} onChange={onChange} locked={locked} />;
    case 'translate':
      return <Translate ex={ex} value={value} onChange={onChange} locked={locked} onSubmit={onSubmit} />;
    case 'match':
      return <Match ex={ex} onChange={onChange} />;
    default:
      return null;
  }
}

function Choice({ ex, value, onChange, locked }) {
  useEffect(() => {
    const onKey = (e) => {
      const n = Number(e.key);
      if (!locked && n >= 1 && n <= ex.options.length) onChange(n - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ex, locked, onChange]);

  return (
    <div>
      <p className={ex.type === 'vocab' ? 'prompt prompt-big' : 'prompt'}>{ex.prompt}</p>
      <div className="options">
        {ex.options.map((o, i) => (
          <button
            key={i}
            className={`option ${value === i ? 'selected' : ''} ${locked && i === ex.answer ? 'right' : ''} ${locked && value === i && i !== ex.answer ? 'wrong' : ''}`}
            disabled={locked}
            onClick={() => onChange(i)}
          >
            <span className="kbd">{i + 1}</span>
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

function Fill({ ex, value: raw, onChange, locked, onSubmit }) {
  const value = raw ?? '';
  const ref = useRef();
  useEffect(() => {
    ref.current?.focus();
  }, [ex]);
  const [before, after] = ex.prompt.split('___');
  return (
    <div>
      <p className="prompt fill-line">
        {before}
        <input
          ref={ref}
          className="fill-input"
          value={value}
          disabled={locked}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          size={Math.max(4, (value || '').length + 1)}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            e.stopPropagation(); // evita que o atalho global também avance
            onSubmit();
          }}
        />
        {after}
      </p>
      {ex.hint && <p className="hint">Dica: {ex.hint}</p>}
      <AccentBar onInsert={(ch) => onChange((value || '') + ch)} disabled={locked} />
    </div>
  );
}

function Translate({ ex, value: raw, onChange, locked, onSubmit }) {
  const value = raw ?? '';
  const ref = useRef();
  useEffect(() => {
    ref.current?.focus();
  }, [ex]);
  return (
    <div>
      <p className="prompt">“{ex.pt}”</p>
      <textarea
        ref={ref}
        className="answer-box"
        rows={3}
        value={value}
        disabled={locked}
        placeholder="Escreva em italiano…"
        autoCapitalize="sentences"
        autoCorrect="off"
        spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            e.stopPropagation(); // evita que o atalho global também avance
            onSubmit();
          }
        }}
      />
      <AccentBar onInsert={(ch) => onChange((value || '') + ch)} disabled={locked} />
    </div>
  );
}

function AccentBar({ onInsert, disabled }) {
  return (
    <div className="accents">
      {['à', 'è', 'é', 'ì', 'ò', 'ù', "'"].map((ch) => (
        <button key={ch} type="button" disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={() => onInsert(ch)}>
          {ch}
        </button>
      ))}
    </div>
  );
}

function Order({ ex, value: raw, onChange, locked }) {
  const value = raw ?? [];
  const tiles = useMemo(() => {
    const words = [...ex.answer.split(' '), ...(ex.extra || [])];
    return shuffle(words.map((w, i) => ({ w, i })));
  }, [ex]);
  const used = new Set(value.map((v) => v.i));
  return (
    <div>
      <p className="prompt">“{ex.pt}”</p>
      <div className="order-answer">
        {value.length === 0 && <span className="placeholder">Toque nas palavras abaixo</span>}
        {value.map((t) => (
          <button key={t.i} className="tile" disabled={locked} onClick={() => onChange(value.filter((v) => v.i !== t.i))}>
            {t.w}
          </button>
        ))}
      </div>
      <div className="order-bank">
        {tiles.map((t) => (
          <button key={t.i} className={`tile ${used.has(t.i) ? 'ghost' : ''}`} disabled={locked || used.has(t.i)} onClick={() => onChange([...value, t])}>
            {t.w}
          </button>
        ))}
      </div>
    </div>
  );
}

function Match({ ex, onChange }) {
  const left = useMemo(() => shuffle(ex.pairs.map((p) => p[0])), [ex]);
  const right = useMemo(() => shuffle(ex.pairs.map((p) => p[1])), [ex]);
  const [pick, setPick] = useState(null); // { side, text }
  const [done, setDone] = useState([]);
  const [bad, setBad] = useState(null);

  function choose(side, text) {
    if (done.includes(text)) return;
    if (!pick || pick.side === side) return setPick({ side, text });
    const it = side === 'it' ? text : pick.text;
    const pt = side === 'pt' ? text : pick.text;
    if (ex.pairs.some((p) => p[0] === it && p[1] === pt)) {
      sfx.correct();
      const next = [...done, it, pt];
      setDone(next);
      if (next.length === ex.pairs.length * 2) onChange('done');
    } else {
      sfx.wrong();
      setBad([it, pt]);
      setTimeout(() => setBad(null), 500);
    }
    setPick(null);
  }

  const cls = (side, t) =>
    `option match ${done.includes(t) ? 'matched' : ''} ${pick?.side === side && pick.text === t ? 'selected' : ''} ${bad?.includes(t) ? 'shake wrong' : ''}`;

  return (
    <div className="match-grid">
      <div>
        {left.map((t) => (
          <button key={t} className={cls('it', t)} disabled={done.includes(t)} onClick={() => choose('it', t)}>
            {t}
          </button>
        ))}
      </div>
      <div>
        {right.map((t) => (
          <button key={t} className={cls('pt', t)} disabled={done.includes(t)} onClick={() => choose('pt', t)}>
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}

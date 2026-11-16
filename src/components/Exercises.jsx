import { useEffect, useMemo, useRef, useState } from 'react';
import { check, normalize, shuffle } from '../lib/text.js';
import { sfx } from '../lib/sfx.js';

export const TYPE_LABEL = {
  mc: 'Escolha a resposta certa',
  vocab: 'O que significa?',
  vocabRev: 'Como se diz em italiano?',
  fill: 'Complete a frase',
  order: 'Monte a frase em italiano',
  translate: 'Traduza para o italiano',
  match: 'Ligue os pares',
};

const ROUND = 8; // exercícios sorteados por etapa (revisão de unidade: 15)

// Sorteia exercícios equilibrando os tipos (mc, fill, order, translate).
function sample(pool, n) {
  const groups = {};
  for (const ex of shuffle(pool)) (groups[ex.type] ||= []).push(ex);
  const lists = shuffle(Object.values(groups));
  const out = [];
  while (out.length < n && lists.some((l) => l.length)) for (const l of lists) if (l.length && out.length < n) out.push(l.pop());
  return out;
}

function meaning(vocab, [it, pt], reverse) {
  const others = shuffle(vocab.filter((v) => v[0] !== it && v[1] !== pt)).slice(0, 3);
  const right = reverse ? it : pt;
  const options = shuffle([right, ...others.map((v) => (reverse ? v[0] : v[1]))]);
  return reverse
    ? { type: 'vocab', reverse: true, prompt: pt, options, answer: options.indexOf(right), explain: `${pt} = ${it}` }
    : { type: 'vocab', prompt: it, options, answer: options.indexOf(right), explain: `${it} = ${pt}` };
}

// Monta a rodada da etapa (ou da revisão de unidade).
export function buildSession(lesson) {
  // sem pares repetidos/ambíguos (a revisão junta o vocabulário de várias lições)
  const seen = new Set();
  const vocab = (lesson.vocab || []).filter(([it, pt]) => it !== pt && !seen.has(it) && !seen.has(pt) && seen.add(it) && seen.add(pt));

  if (lesson.step?.key === 'vocab') {
    const words = shuffle(vocab);
    const half = Math.ceil(words.length / 2);
    const rounds = [
      { type: 'match', pairs: words.slice(0, Math.min(5, half)) },
      ...words.slice(0, 4).map((v) => meaning(vocab, v, false)),
      { type: 'match', pairs: words.slice(half, half + 5) },
      ...words.slice(half, half + 3).map((v) => meaning(vocab, v, true)),
    ];
    return rounds.filter((r) => r.type !== 'match' || r.pairs.length >= 3);
  }

  const mixMc = (ex) => {
    if (ex.type !== 'mc') return ex;
    const options = shuffle(ex.options);
    return { ...ex, options, answer: options.indexOf(ex.options[ex.answer]) };
  };
  if (!lesson.review) return sample(lesson.exercises, ROUND).map(mixMc);

  const extra = vocab.length >= 4 ? [{ type: 'match', pairs: shuffle(vocab).slice(0, 5) }, ...shuffle(vocab).slice(0, 2).map((v) => meaning(vocab, v, false))] : [];
  const own = sample(lesson.exercises, ROUND + 7).map(mixMc);
  return [extra[0], ...shuffle([...extra.slice(1), ...own])].filter(Boolean);
}

// Dica progressiva: nível 1 lembra a regra, nível 2 entrega parte da resposta.
export function hintFor(ex, level) {
  if (level <= 0 || ex.type === 'match') return null;
  const rule = ex.explain && ex.type !== 'vocab' ? `Lembre: ${ex.explain}` : null;
  if (level === 1 && rule) return { text: rule };
  if (ex.type === 'mc' || ex.type === 'vocab') {
    const wrong = shuffle(ex.options.map((_, i) => i).filter((i) => i !== ex.answer));
    return { text: 'Tirei duas alternativas erradas para você.', removed: wrong.slice(0, 2) };
  }
  const answer = ex.type === 'order' ? ex.answer : ex.answer[0];
  if (ex.type === 'fill') {
    const shown = answer.slice(0, Math.max(1, Math.ceil(answer.length / 2)));
    return { text: `${rule ? rule + ' ' : ''}A resposta começa com “${shown}…” (${answer.length} letras).` };
  }
  const words = answer.replace(/[.?!]$/, '').split(' ');
  const shown = words.slice(0, Math.max(1, Math.ceil(words.length / 3))).join(' ');
  return { text: `${rule ? rule + ' ' : ''}Começa com “${shown}…” (${words.length} palavras).` };
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

export function Exercise({ ex, value, onChange, locked, onSubmit, hint }) {
  switch (ex.type) {
    case 'mc':
    case 'vocab':
      return <Choice ex={ex} value={value} onChange={onChange} locked={locked} removed={hint?.removed} />;
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

function Choice({ ex, value, onChange, locked, removed = [] }) {
  useEffect(() => {
    const onKey = (e) => {
      const n = Number(e.key);
      if (!locked && n >= 1 && n <= ex.options.length && !removed.includes(n - 1)) onChange(n - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ex, locked, onChange, removed]);

  return (
    <div>
      <p className={ex.type === 'vocab' ? 'prompt prompt-big' : 'prompt'}>{ex.prompt}</p>
      <div className="options">
        {ex.options.map((o, i) => (
          <button
            key={i}
            className={`option ${value === i ? 'selected' : ''} ${locked && i === ex.answer ? 'right' : ''} ${locked && value === i && i !== ex.answer ? 'wrong' : ''} ${removed.includes(i) && !locked ? 'removed' : ''}`}
            disabled={locked || removed.includes(i)}
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

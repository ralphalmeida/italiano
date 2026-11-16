import { useMemo } from 'react';
import { useProgress } from '../lib/store.jsx';
import { currentStreak, dueCards, goalSeconds, levelInfo, today, todaySeconds } from '../lib/progress.js';

export function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        dur: 1.8 + Math.random() * 1.4,
        color: ['#0f9d58', '#ffffff', '#d93025', '#f4b400', '#4285f4'][i % 5],
        rot: Math.random() * 360,
      })),
    [],
  );
  return (
    <div className="confetti" aria-hidden>
      {pieces.map((p, i) => (
        <i key={i} style={{ left: `${p.left}%`, background: p.color, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s`, transform: `rotate(${p.rot}deg)` }} />
      ))}
    </div>
  );
}

export function Toasts() {
  const { toasts } = useProgress();
  return (
    <div className="toasts">
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          <span className="toast-icon">{t.icon}</span>
          <div><b>{t.title}</b><div>{t.text}</div></div>
        </div>
      ))}
    </div>
  );
}

export function StatsBar() {
  const { progress } = useProgress();
  const streak = currentStreak(progress);
  const lvl = levelInfo(progress.xp);
  const done = todaySeconds(progress);
  const goal = goalSeconds(progress);
  const due = dueCards(progress).length;
  return (
    <div className="statsbar">
      <div className={`chip ${progress.streak.last === today() ? 'chip-fire' : ''}`} title="Dias seguidos">🔥 {streak}</div>
      <div className="chip" title="Revisões pendentes">🧠 {due}</div>
      <div className="chip" title={`Nível ${lvl.level}`}>⚡ {progress.xp}</div>
      <div className="goal" title={`Meta de hoje: ${Math.floor(done / 60)} de ${goal / 60} min`}>
        <Ring pct={Math.min(1, done / goal)} />
      </div>
    </div>
  );
}

export function Ring({ pct, size = 34 }) {
  const r = size / 2 - 4;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="ring">
      <circle cx={size / 2} cy={size / 2} r={r} className="ring-bg" />
      <circle cx={size / 2} cy={size / 2} r={r} className="ring-fg" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} />
      <text x="50%" y="54%" textAnchor="middle" dominantBaseline="middle">{pct >= 1 ? '✓' : '🎯'}</text>
    </svg>
  );
}

export function SyncBadge() {
  const { sync } = useProgress();
  const map = {
    loading: ['⏳', 'Carregando…'],
    ok: ['☁️', 'Sincronizado'],
    saving: ['🔄', 'Salvando…'],
    offline: ['⚠️', 'Sem conexão — salvo neste aparelho'],
    local: ['💾', 'Servidor sem banco configurado — salvo só neste aparelho'],
  };
  const [icon, text] = map[sync];
  return <span className={`sync sync-${sync}`} title={text}>{icon} {text}</span>;
}

const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// Cartão da meta diária no topo da trilha.
export function DailyCard({ onStart }) {
  const { progress } = useProgress();
  const done = todaySeconds(progress);
  const goal = goalSeconds(progress);
  const streak = currentStreak(progress);
  const met = done >= goal;
  const left = Math.max(0, goal - done);
  const hour = new Date().getHours();
  const atRisk = !met && streak > 0 && hour >= 18;
  return (
    <div className={`card daily ${met ? 'daily-met' : atRisk ? 'daily-risk' : ''}`}>
      <div className="daily-top">
        <div>
          <span className="eyebrow">Meta de hoje · {goal / 60} min</span>
          <h3>
            {met
              ? 'Meta cumprida! Bravissimo 🎉'
              : atRisk
                ? `🔥 Sua sequência de ${streak} ${streak === 1 ? 'dia' : 'dias'} está em risco!`
                : done > 0
                  ? `Faltam ${Math.ceil(left / 60)} min para a meta`
                  : `${goal / 60} minutinhos de italiano hoje?`}
          </h3>
        </div>
        <div className="daily-time">{mmss(Math.min(done, goal))}<small>/{goal / 60}:00</small></div>
      </div>
      <div className="bar"><div className="bar-fill" style={{ width: `${Math.min(100, (done / goal) * 100)}%` }} /></div>
      {!met && onStart && (
        <button className="btn btn-primary btn-block" onClick={onStart}>{done > 0 ? 'Continuar estudando' : 'Começar agora'}</button>
      )}
      {met && <p className="muted small">Sequência garantida. Quer continuar? Cada minuto a mais ajuda na prova.</p>}
    </div>
  );
}

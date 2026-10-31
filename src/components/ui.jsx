import { useMemo } from 'react';
import { useProgress } from '../lib/store.jsx';
import { currentStreak, dueCards, levelInfo, today } from '../lib/progress.js';

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
  const todayXp = progress.daily[today()] || 0;
  const goal = progress.settings.dailyGoal;
  const due = dueCards(progress).length;
  return (
    <div className="statsbar">
      <div className={`chip ${progress.streak.last === today() ? 'chip-fire' : ''}`} title="Dias seguidos">🔥 {streak}</div>
      <div className="chip" title="Revisões pendentes">🧠 {due}</div>
      <div className="chip" title={`Nível ${lvl.level}`}>⚡ {progress.xp}</div>
      <div className="goal" title={`Meta diária: ${todayXp}/${goal} XP`}>
        <Ring pct={Math.min(1, todayXp / goal)} />
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

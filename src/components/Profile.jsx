import { useProgress } from '../lib/store.jsx';
import { ACHIEVEMENTS, currentStreak, levelInfo, masteredCount, today } from '../lib/progress.js';
import { lessons } from '../data/index.js';
import { SyncBadge } from './ui.jsx';

function lastDays(n) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - i));
    return { key: today(d), label: d.toLocaleDateString('pt-BR', { weekday: 'narrow' }) };
  });
}

export function Profile({ onLogout }) {
  const { progress, update, email } = useProgress();
  const lvl = levelInfo(progress.xp);
  const days = lastDays(7);
  const max = Math.max(progress.settings.dailyGoal, ...days.map((d) => progress.daily[d.key] || 0));
  const stars = Object.values(progress.lessons).reduce((s, l) => s + l.stars, 0);
  const setSetting = (k, v) => update((p) => ({ ...p, settings: { ...p.settings, [k]: v } }));

  return (
    <div className="stack">
      <div className="card level-card">
        <div className="level-badge">{lvl.level}</div>
        <div className="grow">
          <span className="eyebrow">Nível {lvl.level}</span>
          <h2>{lvl.title}</h2>
          <div className="bar"><div className="bar-fill" style={{ width: `${lvl.pct * 100}%` }} /></div>
          <p className="muted small">{lvl.into}/{lvl.need} XP para o próximo nível</p>
        </div>
      </div>

      <div className="grid-stats">
        <div className="card stat-card"><b>🔥 {currentStreak(progress)}</b><span>dias seguidos</span><small>recorde {progress.streak.best || 0}</small></div>
        <div className="card stat-card"><b>⚡ {progress.xp}</b><span>XP total</span></div>
        <div className="card stat-card"><b>📘 {Object.keys(progress.lessons).length}/{lessons.length}</b><span>lições</span><small>{stars} ★</small></div>
        <div className="card stat-card"><b>🎓 {masteredCount(progress)}</b><span>palavras dominadas</span><small>{Object.keys(progress.srs).length} no total</small></div>
      </div>

      <div className="card">
        <h3>Últimos 7 dias</h3>
        <div className="week">
          {days.map((d) => {
            const v = progress.daily[d.key] || 0;
            return (
              <div key={d.key} className="week-col">
                <div className="week-bar"><div className={v >= progress.settings.dailyGoal ? 'met' : ''} style={{ height: `${(v / max) * 100}%` }} /></div>
                <span>{d.label}</span>
              </div>
            );
          })}
        </div>
        <p className="muted small">Meta diária: {progress.settings.dailyGoal} XP</p>
      </div>

      <div className="card">
        <h3>Conquistas · {Object.keys(progress.achievements).length}/{ACHIEVEMENTS.length}</h3>
        <div className="achievements">
          {ACHIEVEMENTS.map((a) => (
            <div key={a.id} className={`ach ${progress.achievements[a.id] ? 'got' : ''}`} title={a.desc}>
              <span className="ach-icon">{a.icon}</span>
              <b>{a.name}</b>
              <small>{a.desc}</small>
            </div>
          ))}
        </div>
      </div>

      <div className="card settings">
        <h3>Configurações</h3>
        <label className="setting">
          <span>Meta diária</span>
          <select value={progress.settings.dailyGoal} onChange={(e) => setSetting('dailyGoal', Number(e.target.value))}>
            <option value={30}>Leve · 30 XP</option>
            <option value={50}>Normal · 50 XP</option>
            <option value={100}>Séria · 100 XP</option>
            <option value={200}>Intensa · 200 XP</option>
          </select>
        </label>
        <label className="setting">
          <span>Efeitos sonoros</span>
          <input type="checkbox" checked={progress.settings.sound} onChange={(e) => setSetting('sound', e.target.checked)} />
        </label>
        <label className="setting">
          <span>Desbloquear todas as lições<small>para pular o que você já sabe</small></span>
          <input type="checkbox" checked={progress.settings.unlockAll} onChange={(e) => setSetting('unlockAll', e.target.checked)} />
        </label>
        <div className="setting"><span>Conta<small>{email}</small></span><SyncBadge /></div>
        <button className="btn btn-ghost btn-block" onClick={onLogout}>Sair</button>
      </div>
    </div>
  );
}

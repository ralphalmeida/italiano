import { units, lessons } from '../data/index.js';
import { useProgress } from '../lib/store.jsx';
import { isUnlocked } from '../lib/progress.js';

export function Path({ onOpen }) {
  const { progress } = useProgress();
  const order = lessons;
  const nextIndex = order.findIndex((l) => !progress.lessons[l.id]);

  return (
    <div className="path">
      {units.map((u, ui) => {
        const done = u.lessons.filter((l) => progress.lessons[l.id]).length;
        return (
          <section key={u.id} className={`unit unit-c${ui % 6}`}>
            <header className="unit-head">
              <div>
                <span className="eyebrow">Unidade {ui + 1}</span>
                <h2>{u.emoji} {u.title}</h2>
                <p>{u.subtitle}</p>
              </div>
              <div className="unit-count">{done}/{u.lessons.length}</div>
            </header>
            <div className="nodes">
              {u.lessons.map((l) => {
                const idx = order.findIndex((x) => x.id === l.id);
                const unlocked = isUnlocked(progress, order, idx);
                const rec = progress.lessons[l.id];
                const current = idx === nextIndex;
                const offset = [0, 1, 0, -1][idx % 4];
                return (
                  <div key={l.id} className="node-wrap" style={{ transform: `translateX(${offset * 52}px)` }}>
                    {current && <div className="node-start">COMEÇAR</div>}
                    <button
                      className={`node ${rec ? 'done' : ''} ${current ? 'current' : ''} ${unlocked ? '' : 'locked'}`}
                      disabled={!unlocked}
                      onClick={() => onOpen(l.id)}
                      aria-label={l.title}
                    >
                      {rec ? '✓' : unlocked ? '★' : '🔒'}
                    </button>
                    <div className="node-label">
                      {l.title}
                      {rec && <span className="node-stars">{'★'.repeat(rec.stars)}{'☆'.repeat(3 - rec.stars)}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
      <p className="muted center small">Mais unidades em breve. Use “Revisão” e “Leitura” todos os dias!</p>
    </div>
  );
}

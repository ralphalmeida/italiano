import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api } from './api.js';
import { addStudyTime, checkAchievements, emptyProgress, goalMet, merge, migrateSteps } from './progress.js';
import { lessons, readings } from '../data/index.js';
import { sfx } from './sfx.js';

const Ctx = createContext(null);
const ctxInfo = { coreLessons: lessons.filter((l) => !l.review).map((l) => l.id), totalReadings: readings.length };

const localKey = (email) => `italiano:progress:${email}`;

function readLocal(email) {
  try {
    return JSON.parse(localStorage.getItem(localKey(email)));
  } catch {
    return null;
  }
}

function writeLocal(email, p) {
  try {
    localStorage.setItem(localKey(email), JSON.stringify(p));
  } catch {
    /* armazenamento indisponível */
  }
}

export function ProgressProvider({ email, children }) {
  const [progress, setProgress] = useState(() => migrateSteps(merge(emptyProgress(), readLocal(email))));
  const [sync, setSync] = useState('loading'); // loading | ok | saving | offline | local
  const [toasts, setToasts] = useState([]);
  const timer = useRef();
  const loaded = useRef(false);

  useEffect(() => {
    let alive = true;
    api
      .getProgress()
      .then(({ progress: remote, store }) => {
        if (!alive) return;
        setProgress((p) => migrateSteps(merge(merge(emptyProgress(), remote), p)));
        setSync(store === 'redis' ? 'ok' : 'local');
      })
      .catch(() => alive && setSync('offline'))
      .finally(() => (loaded.current = true));
    return () => (alive = false);
  }, []);

  useEffect(() => {
    sfx.enabled = progress.settings.sound;
    writeLocal(email, progress);
    if (!loaded.current) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setSync((s) => (s === 'local' ? s : 'saving'));
      api
        .putProgress(progress)
        .then(({ store }) => setSync(store === 'redis' ? 'ok' : 'local'))
        .catch(() => setSync('offline'));
    }, 1200);
  }, [progress, email]);

  const toast = useCallback((t) => {
    const id = Math.random();
    setToasts((list) => [...list, { ...t, id }]);
    setTimeout(() => setToasts((list) => list.filter((x) => x.id !== id)), 3500);
  }, []);

  const update = useCallback(
    (fn) =>
      setProgress((p) => {
        const [next, fresh] = checkAchievements({ ...fn(p), updatedAt: Date.now() }, ctxInfo);
        // toasts fora do setState
        if (fresh.length) setTimeout(() => fresh.forEach((a) => toast({ icon: a.icon, title: 'Conquista!', text: a.name })));
        return next;
      }),
    [toast],
  );

  return <Ctx.Provider value={{ progress, update, sync, toast, toasts, email }}>{children}</Ctx.Provider>;
}

export const useProgress = () => useContext(Ctx);

// Conta o tempo de estudo enquanto uma tela de estudo está aberta, a aba está visível
// e houve interação no último minuto e meio. Grava a cada 15 s e ao sair.
export function useStudyClock(active) {
  const { update, toast } = useProgress();
  useEffect(() => {
    if (!active) return undefined;
    let lastTouch = Date.now();
    let pending = 0;
    const touch = () => {
      lastTouch = Date.now();
    };
    const flush = () => {
      if (!pending) return;
      const secs = pending;
      pending = 0;
      update((p) => {
        const next = addStudyTime(p, secs);
        if (!goalMet(p) && goalMet(next)) setTimeout(() => toast({ icon: '🎯', title: 'Meta de hoje cumprida!', text: `+1 dia na sequência 🔥` }));
        return next;
      });
    };
    const tick = setInterval(() => {
      if (document.visibilityState === 'visible' && Date.now() - lastTouch < 90000) pending += 1;
      if (pending >= 15) flush();
    }, 1000);
    const onVisibility = () => document.visibilityState === 'hidden' && flush();
    const events = ['pointerdown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((e) => window.addEventListener(e, touch, { passive: true }));
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(tick);
      flush();
      events.forEach((e) => window.removeEventListener(e, touch));
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [active, update, toast]);
}

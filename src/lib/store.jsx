import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api } from './api.js';
import { checkAchievements, emptyProgress, merge } from './progress.js';
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
  const [progress, setProgress] = useState(() => merge(emptyProgress(), readLocal(email)));
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
        setProgress((p) => merge(merge(emptyProgress(), remote), p));
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

import { hashId } from './text.js';

export const DAY = 86400000;

export function today(d = new Date()) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}

function dayDiff(a, b) {
  return Math.round((new Date(`${b}T12:00:00`) - new Date(`${a}T12:00:00`)) / DAY);
}

export function emptyProgress() {
  return {
    v: 1,
    updatedAt: 0,
    xp: 0,
    daily: {},
    streak: { count: 0, last: null, best: 0 },
    lessons: {},
    readings: {},
    srs: {},
    reviews: 0,
    perfect: 0,
    achievements: {},
    settings: { dailyGoal: 50, sound: true, unlockAll: false },
  };
}

// ---------- Níveis ----------
const TITLES = ['Principiante', 'Turista', 'Studente', 'Viaggiatore', 'Conversatore', 'Residente', 'Quasi italiano', 'Cittadino', 'Maestro'];

export function levelInfo(xp) {
  let level = 1;
  let need = 100;
  let floor = 0;
  while (xp >= floor + need) {
    floor += need;
    level += 1;
    need = Math.round(need * 1.25);
  }
  return {
    level,
    title: TITLES[Math.min(TITLES.length - 1, Math.floor((level - 1) / 2))],
    into: xp - floor,
    need,
    pct: (xp - floor) / need,
  };
}

// ---------- Sequência ----------
export function currentStreak(p) {
  const { count, last } = p.streak;
  if (!last) return 0;
  return dayDiff(last, today()) <= 1 ? count : 0;
}

function touchStreak(p) {
  const t = today();
  const { last, count, best } = p.streak;
  if (last === t) return p.streak;
  const next = last && dayDiff(last, t) === 1 ? count + 1 : 1;
  return { count: next, last: t, best: Math.max(best || 0, next) };
}

export function addXp(p, amount) {
  const t = today();
  return {
    ...p,
    xp: p.xp + amount,
    daily: { ...p.daily, [t]: (p.daily[t] || 0) + amount },
    streak: touchStreak(p),
  };
}

// ---------- Revisão espaçada (Leitner) ----------
const INTERVALS = [0, 1, 2, 4, 7, 15, 30, 60, 120]; // dias por caixa

export const cardId = (it) => hashId(it);

export function addCards(p, vocab, source) {
  const srs = { ...p.srs };
  for (const [it, pt] of vocab) {
    const id = cardId(it);
    if (!srs[id]) srs[id] = { it, pt, src: source, box: 0, due: Date.now(), last: 0, lapses: 0 };
  }
  return { ...p, srs };
}

// grade: 0 errei, 1 acertei, 2 fácil
export function gradeCard(p, id, grade) {
  const c = p.srs[id];
  if (!c) return p;
  const box = grade === 0 ? 1 : Math.min(INTERVALS.length - 1, c.box + grade);
  const due = grade === 0 ? Date.now() + 10 * 60000 : startOfDay(Date.now() + INTERVALS[box] * DAY);
  return {
    ...p,
    reviews: (p.reviews || 0) + 1,
    srs: { ...p.srs, [id]: { ...c, box, due, last: Date.now(), lapses: c.lapses + (grade === 0 ? 1 : 0) } },
  };
}

function startOfDay(ts) {
  const d = new Date(ts);
  d.setHours(4, 0, 0, 0);
  return d.getTime();
}

export function dueCards(p, now = Date.now()) {
  return Object.entries(p.srs)
    .filter(([, c]) => c.due <= now)
    .sort((a, b) => a[1].due - b[1].due)
    .map(([id, c]) => ({ id, ...c }));
}

export function masteredCount(p) {
  return Object.values(p.srs).filter((c) => c.box >= 5).length;
}

// ---------- Lições ----------
export function starsFor(accuracy) {
  return accuracy >= 0.9 ? 3 : accuracy >= 0.7 ? 2 : 1;
}

export function completeLesson(p, lesson, accuracy) {
  const stars = starsFor(accuracy);
  const prev = p.lessons[lesson.id] || { stars: 0, done: 0 };
  let next = {
    ...p,
    lessons: { ...p.lessons, [lesson.id]: { stars: Math.max(prev.stars, stars), done: prev.done + 1, at: Date.now() } },
    perfect: (p.perfect || 0) + (accuracy === 1 ? 1 : 0),
  };
  return addCards(next, lesson.vocab, lesson.id);
}

export function isUnlocked(p, lessonsInOrder, index) {
  if (index === 0 || p.settings.unlockAll) return true;
  return Boolean(p.lessons[lessonsInOrder[index - 1].id]);
}

// ---------- Conquistas ----------
export const ACHIEVEMENTS = [
  { id: 'first', icon: '🌱', name: 'Primo passo', desc: 'Conclua sua primeira lição', test: (p) => Object.keys(p.lessons).length >= 1 },
  { id: 'five', icon: '📚', name: 'Studente', desc: 'Conclua 5 lições', test: (p) => Object.keys(p.lessons).length >= 5 },
  { id: 'all', icon: '🏛️', name: 'Pronto per la prova', desc: 'Conclua todas as lições', test: (p, ctx) => Object.keys(p.lessons).length >= ctx.totalLessons },
  { id: 'perfect', icon: '💯', name: 'Perfetto!', desc: 'Faça uma lição sem errar', test: (p) => p.perfect >= 1 },
  { id: 'stars', icon: '⭐', name: 'Collezionista', desc: 'Junte 30 estrelas', test: (p) => Object.values(p.lessons).reduce((s, l) => s + l.stars, 0) >= 30 },
  { id: 's3', icon: '🔥', name: 'Tre giorni', desc: 'Sequência de 3 dias', test: (p) => (p.streak.best || 0) >= 3 },
  { id: 's7', icon: '🚀', name: 'Una settimana', desc: 'Sequência de 7 dias', test: (p) => (p.streak.best || 0) >= 7 },
  { id: 's30', icon: '👑', name: 'Un mese', desc: 'Sequência de 30 dias', test: (p) => (p.streak.best || 0) >= 30 },
  { id: 'xp500', icon: '⚡', name: '500 XP', desc: 'Some 500 XP', test: (p) => p.xp >= 500 },
  { id: 'xp2000', icon: '💎', name: '2000 XP', desc: 'Some 2000 XP', test: (p) => p.xp >= 2000 },
  { id: 'rev50', icon: '🧠', name: 'Memoria di ferro', desc: 'Faça 50 revisões', test: (p) => (p.reviews || 0) >= 50 },
  { id: 'master25', icon: '🎓', name: 'Vocabolario', desc: 'Domine 25 palavras', test: (p) => masteredCount(p) >= 25 },
  { id: 'read1', icon: '📰', name: 'Lettore', desc: 'Conclua um texto de leitura', test: (p) => Object.keys(p.readings).length >= 1 },
  { id: 'readAll', icon: '🗞️', name: 'Lettore esperto', desc: 'Conclua todos os textos', test: (p, ctx) => Object.keys(p.readings).length >= ctx.totalReadings },
];

// Retorna [progressoAtualizado, conquistasNovas]
export function checkAchievements(p, ctx) {
  const fresh = ACHIEVEMENTS.filter((a) => !p.achievements[a.id] && a.test(p, ctx));
  if (!fresh.length) return [p, []];
  const achievements = { ...p.achievements };
  for (const a of fresh) achievements[a.id] = Date.now();
  return [{ ...p, achievements }, fresh];
}

// ---------- Sincronização: mescla dois estados sem perder progresso ----------
export function merge(a, b) {
  if (!a) return b;
  if (!b) return a;
  const newer = (a.updatedAt || 0) >= (b.updatedAt || 0) ? a : b;
  const out = { ...emptyProgress(), ...newer };
  out.xp = Math.max(a.xp || 0, b.xp || 0);
  out.reviews = Math.max(a.reviews || 0, b.reviews || 0);
  out.perfect = Math.max(a.perfect || 0, b.perfect || 0);
  out.daily = { ...a.daily };
  for (const [d, v] of Object.entries(b.daily || {})) out.daily[d] = Math.max(out.daily[d] || 0, v);
  const sa = a.streak || {};
  const sb = b.streak || {};
  out.streak = (sa.last || '') >= (sb.last || '') ? { ...sa } : { ...sb };
  out.streak.best = Math.max(sa.best || 0, sb.best || 0);
  out.lessons = { ...a.lessons };
  for (const [id, l] of Object.entries(b.lessons || {})) {
    const o = out.lessons[id];
    out.lessons[id] = o ? { ...l, stars: Math.max(o.stars, l.stars), done: Math.max(o.done, l.done) } : l;
  }
  out.readings = { ...a.readings };
  for (const [id, r] of Object.entries(b.readings || {})) {
    const o = out.readings[id];
    out.readings[id] = o && o.best >= r.best ? o : r;
  }
  out.srs = { ...a.srs };
  for (const [id, c] of Object.entries(b.srs || {})) {
    const o = out.srs[id];
    out.srs[id] = !o || (c.last || 0) > (o.last || 0) ? c : o;
  }
  out.achievements = { ...b.achievements, ...a.achievements };
  out.settings = { ...emptyProgress().settings, ...newer.settings };
  out.updatedAt = Math.max(a.updatedAt || 0, b.updatedAt || 0);
  return out;
}

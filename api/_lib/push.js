import webpush from 'web-push';

export const pushKey = (email) => `italiano:push:${email}`;
export const progressKey = (email) => `italiano:progress:${email}`;

export function vapidPublicKey() {
  return process.env.VAPID_PUBLIC_KEY || null;
}

// Envia uma notificação; retorna 'ok', 'gone' (inscrição expirada) ou 'error'.
export async function sendPush(subscription, payload) {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return 'error';
  webpush.setVapidDetails('https://italiano-ochre.vercel.app', process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload), { TTL: 6 * 3600 });
    return 'ok';
  } catch (err) {
    return err.statusCode === 404 || err.statusCode === 410 ? 'gone' : 'error';
  }
}

// Data e hora locais no fuso do usuário.
export function localNow(timeZone, now = new Date()) {
  let tz = timeZone;
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz });
  } catch {
    tz = 'America/Sao_Paulo';
  }
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) };
}

// Texto do lembrete conforme o quanto falta e a sequência.
export function reminderMessage(progress, date) {
  const goal = (progress?.settings?.dailyMinutes || 5) * 60;
  const done = progress?.seconds?.[date] || 0;
  if (done >= goal) return null;
  const left = Math.max(1, Math.ceil((goal - done) / 60));
  const streak = progress?.streak || {};
  const alive = streak.last && streak.count > 0 && streak.last !== date && daysBetween(streak.last, date) === 1;
  if (alive) {
    return { title: `🔥 ${streak.count} ${streak.count === 1 ? 'dia' : 'dias'} seguidos em risco!`, body: `Faltam ${left} min para manter sua sequência. Dai, è veloce!` };
  }
  return done > 0
    ? { title: 'Quase lá! 🇮🇹', body: `Faltam só ${left} min para a meta de hoje.` }
    : { title: 'Ciao! 🇮🇹', body: `${goal / 60} minutinhos de italiano hoje? A prova agradece.` };
}

function daysBetween(a, b) {
  return Math.round((new Date(`${b}T12:00:00Z`) - new Date(`${a}T12:00:00Z`)) / 86400000);
}

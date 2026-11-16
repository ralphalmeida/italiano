import { getSession, json } from './_lib/auth.js';
import { load, remove, save } from './_lib/store.js';
import { localNow, progressKey, pushKey, reminderMessage, sendPush, vapidPublicKey } from './_lib/push.js';

// GET: estado do lembrete · POST: ativa/atualiza · DELETE: desativa · POST ?test=1: envia um teste
export async function GET(request) {
  const session = getSession(request);
  if (!session) return json({ error: 'unauthenticated' }, 401);
  const cfg = await load(pushKey(session.email));
  return json({ publicKey: vapidPublicKey(), enabled: Boolean(cfg), hour: cfg?.hour ?? 20 });
}

export async function POST(request) {
  const session = getSession(request);
  if (!session) return json({ error: 'unauthenticated' }, 401);
  const url = new URL(request.url);
  if (url.searchParams.get('test')) {
    const cfg = await load(pushKey(session.email));
    if (!cfg) return json({ error: 'Lembrete não está ativo.' }, 400);
    const progress = await load(progressKey(session.email));
    const msg = reminderMessage(progress, localNow(cfg.tz).date) || { title: 'Meta de hoje cumprida ✅', body: 'É assim que os lembretes vão aparecer.' };
    const r = await sendPush(cfg.subscription, msg);
    return r === 'ok' ? json({ ok: true }) : json({ error: 'Não foi possível enviar a notificação.' }, 502);
  }
  const body = await request.json().catch(() => ({}));
  const hour = Number(body.hour);
  if (!body.subscription?.endpoint || !(hour >= 0 && hour <= 23)) return json({ error: 'invalid' }, 400);
  await save(pushKey(session.email), { subscription: body.subscription, hour, tz: String(body.tz || 'America/Sao_Paulo'), lastSent: null });
  return json({ ok: true });
}

export async function DELETE(request) {
  const session = getSession(request);
  if (!session) return json({ error: 'unauthenticated' }, 401);
  await remove(pushKey(session.email));
  return json({ ok: true });
}

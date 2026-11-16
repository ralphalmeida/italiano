import { users, json } from './_lib/auth.js';
import { load, remove, save } from './_lib/store.js';
import { localNow, progressKey, pushKey, reminderMessage, sendPush } from './_lib/push.js';

// Chamado de hora em hora (GitHub Actions). Para cada usuário com lembrete ativo,
// se já passou do horário escolhido e a meta de hoje não foi cumprida, envia uma notificação por dia.
export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) return json({ error: 'unauthorized' }, 401);
  const report = [];
  for (const { email } of users()) {
    const cfg = await load(pushKey(email));
    if (!cfg) continue;
    const { date, hour } = localNow(cfg.tz);
    // janela de 3 h a partir do horário escolhido, para tolerar atrasos do agendador
    if (cfg.lastSent === date || hour < cfg.hour || hour > cfg.hour + 2) {
      report.push({ status: 'skip' });
      continue;
    }
    const msg = reminderMessage(await load(progressKey(email)), date);
    if (!msg) {
      await save(pushKey(email), { ...cfg, lastSent: date });
      report.push({ status: 'goal-met' });
      continue;
    }
    const r = await sendPush(cfg.subscription, msg);
    if (r === 'gone') await remove(pushKey(email));
    else if (r === 'ok') await save(pushKey(email), { ...cfg, lastSent: date });
    report.push({ status: r });
  }
  return json({ ok: true, report });
}

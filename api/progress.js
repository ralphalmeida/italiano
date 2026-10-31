import { getSession, json } from './_lib/auth.js';
import { load, save, storeMode } from './_lib/store.js';

const key = (email) => `italiano:progress:${email}`;

export async function GET(request) {
  const session = getSession(request);
  if (!session) return json({ error: 'unauthenticated' }, 401);
  return json({ progress: await load(key(session.email)), store: storeMode() });
}

export async function PUT(request) {
  const session = getSession(request);
  if (!session) return json({ error: 'unauthenticated' }, 401);
  const body = await request.json().catch(() => null);
  if (!body?.progress || typeof body.progress !== 'object') return json({ error: 'invalid' }, 400);
  if (JSON.stringify(body.progress).length > 500_000) return json({ error: 'too large' }, 413);
  await save(key(session.email), body.progress);
  return json({ ok: true, store: storeMode() });
}

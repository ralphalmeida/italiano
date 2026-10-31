import { checkLogin, clearCookie, createCookie, credentials, getSession, json } from './_lib/auth.js';

export async function GET(request) {
  const session = getSession(request);
  return session ? json({ email: session.email }) : json({ error: 'unauthenticated' }, 401);
}

export async function POST(request) {
  const { email, password } = await request.json().catch(() => ({}));
  if (!checkLogin(email, password)) return json({ error: 'E-mail ou senha incorretos.' }, 401);
  const user = credentials().email;
  return json({ email: user }, 200, { 'set-cookie': createCookie(user) });
}

export async function DELETE() {
  return json({ ok: true }, 200, { 'set-cookie': clearCookie() });
}

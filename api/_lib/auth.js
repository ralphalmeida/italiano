import { createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE = 'sess';
const MAX_AGE = 60 * 60 * 24 * 60; // 60 dias

// Em produção (Vercel) não há valores padrão: sem as variáveis, ninguém entra.
const isDeployed = Boolean(process.env.VERCEL_ENV);

function secret() {
  return process.env.SESSION_SECRET || (isDeployed ? null : 'dev-secret');
}

function sign(data) {
  if (!secret()) throw new Error('SESSION_SECRET não configurado');
  return createHmac('sha256', secret()).update(data).digest('base64url');
}

function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}

// Usuário principal (APP_EMAIL/APP_PASSWORD) + extras em APP_USERS no formato "email:senha;email:senha".
export function users() {
  if (!secret()) return [];
  const list = [];
  const email = process.env.APP_EMAIL || (isDeployed ? '' : 'demo@italiano.app');
  const password = process.env.APP_PASSWORD || (isDeployed ? '' : 'ciao1234');
  if (email && password) list.push({ email, password });
  for (const entry of (process.env.APP_USERS || '').split(';')) {
    const i = entry.indexOf(':');
    if (i > 0) list.push({ email: entry.slice(0, i), password: entry.slice(i + 1) });
  }
  return list.map((u) => ({ email: u.email.trim().toLowerCase(), password: u.password }));
}

// Retorna o e-mail do usuário se a senha confere; senão null.
export function checkLogin(email, password) {
  const given = String(email || '').trim().toLowerCase();
  const user = users().find((u) => safeEqual(given, u.email));
  return user && safeEqual(password || '', user.password) ? user.email : null;
}

export function createCookie(email) {
  const payload = Buffer.from(JSON.stringify({ email, exp: Date.now() + MAX_AGE * 1000 })).toString('base64url');
  const token = `${payload}.${sign(payload)}`;
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_AGE}`;
}

export function clearCookie() {
  return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function getSession(request) {
  const raw = request.headers.get('cookie') || '';
  const match = raw.split(/;\s*/).find((c) => c.startsWith(`${COOKIE}=`));
  if (!match || !secret()) return null;
  const [payload, sig] = match.slice(COOKIE.length + 1).split('.');
  if (!payload || !sig || !safeEqual(sig, sign(payload))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (data.exp < Date.now() || !users().some((u) => u.email === data.email)) return null;
    return data;
  } catch {
    return null;
  }
}

export function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers },
  });
}

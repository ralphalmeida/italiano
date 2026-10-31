// Armazenamento do progresso: Upstash Redis via REST. Sem configuração, usa memória (só para dev).
const memory = globalThis.__italianoMemory || (globalThis.__italianoMemory = new Map());

function config() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

export function storeMode() {
  return config() ? 'redis' : 'memory';
}

async function redis(command) {
  const { url, token } = config();
  const res = await fetch(url, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(command),
  });
  if (!res.ok) throw new Error(`Redis ${res.status}`);
  return (await res.json()).result;
}

export async function load(key) {
  if (!config()) return memory.get(key) ?? null;
  const raw = await redis(['GET', key]);
  return raw ? JSON.parse(raw) : null;
}

export async function save(key, value) {
  if (!config()) return void memory.set(key, value);
  await redis(['SET', key, JSON.stringify(value)]);
}

async function call(path, options = {}) {
  const res = await fetch(path, {
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || `Erro ${res.status}`), { status: res.status });
  return data;
}

export const api = {
  me: () => call('/api/session'),
  login: (email, password) => call('/api/session', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => call('/api/session', { method: 'DELETE' }),
  getProgress: () => call('/api/progress'),
  putProgress: (progress) => call('/api/progress', { method: 'PUT', body: JSON.stringify({ progress }) }),
};

const stripAccents = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

export function normalize(s, { accents = true } = {}) {
  let out = String(s)
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/[.,!?;:"«»“”()¿¡…]/g, ' ')
    .replace(/'\s+/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  return accents ? out : stripAccents(out);
}

// 'exact' | 'accents' (certo, mas com acento faltando/errado) | false
export function check(input, answers) {
  const list = Array.isArray(answers) ? answers : [answers];
  const value = normalize(input);
  if (!value) return false;
  if (list.some((a) => normalize(a) === value)) return 'exact';
  const loose = normalize(input, { accents: false });
  if (list.some((a) => normalize(a, { accents: false }) === loose)) return 'accents';
  return false;
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function hashId(s) {
  let h = 5381;
  for (const ch of s) h = ((h << 5) + h + ch.charCodeAt(0)) >>> 0;
  return h.toString(36);
}

// Converte **negrito** em partes para renderizar sem innerHTML.
export function richParts(text) {
  return String(text)
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((p) => (p.startsWith('**') ? { b: p.slice(2, -2) } : { t: p }));
}

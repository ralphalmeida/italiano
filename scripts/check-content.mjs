// Valida o conteúdo das unidades e leituras: `npm run check-content`
import { readdirSync } from 'node:fs';

const dir = new URL('../src/data/units/', import.meta.url);
const errors = [];
const ids = new Set();
let lessons = 0;
let exercises = 0;

for (const f of readdirSync(dir).filter((f) => /^u\d+\.js$/.test(f)).sort()) {
  const u = (await import(new URL(f, dir))).default;
  if (ids.has(u.id)) errors.push(`${u.id}: id de unidade repetido`);
  ids.add(u.id);
  for (const l of u.lessons) {
    lessons++;
    if (l.exercises.length < 18) errors.push(`${l.id}: só ${l.exercises.length} exercícios (mínimo 18)`);
    const seen = new Set();
    for (const [it, pt] of l.vocab) if (it === pt) errors.push(`${l.id}: vocabulário "${it}" igual nas duas línguas`);
    if (ids.has(l.id)) errors.push(`${l.id}: id repetido`);
    ids.add(l.id);
    l.exercises.forEach((ex, i) => {
      exercises++;
      const at = `${l.id}#${i}`;
      const sig = `${ex.type}|${ex.prompt || ex.pt}`;
      if (seen.has(sig)) errors.push(`${at}: exercício repetido na lição`);
      seen.add(sig);
      if (ex.type === 'mc' && new Set(ex.options).size !== ex.options.length) errors.push(`${at}: opções repetidas`);
      if (ex.type === 'fill' && ex.answer.some((a) => a !== a.toLowerCase())) errors.push(`${at}: resposta de fill deve ser minúscula`);
      if (ex.type === 'order' && (ex.extra || []).some((w) => ex.answer.split(' ').includes(w))) errors.push(`${at}: distrator igual a palavra da resposta`);
      if (['mc', 'fill', 'translate'].includes(ex.type) && !ex.explain) errors.push(`${at}: falta explain`);
      if (ex.type === 'mc' && !(ex.options?.length >= 2 && ex.options[ex.answer] !== undefined)) errors.push(`${at}: mc inválido`);
      if (ex.type === 'fill' && ex.prompt.split('___').length !== 2) errors.push(`${at}: fill precisa de um ___`);
      if (['fill', 'translate'].includes(ex.type) && !(Array.isArray(ex.answer) && ex.answer.length)) errors.push(`${at}: answer deve ser lista`);
      if (ex.type === 'order' && typeof ex.answer !== 'string') errors.push(`${at}: order.answer deve ser texto`);
      if (!['mc', 'fill', 'order', 'translate'].includes(ex.type)) errors.push(`${at}: tipo desconhecido ${ex.type}`);
    });
  }
}
const readings = (await import('../src/data/readings.js')).default;
const rids = new Set();
for (const r of readings) {
  if (rids.has(r.id)) errors.push(`${r.id}: id de leitura repetido`);
  rids.add(r.id);
  r.questions.forEach((q, i) => q.options[q.answer] === undefined && errors.push(`${r.id}#${i}: resposta inválida`));
}

console.log(`${lessons} lições, ${exercises} exercícios, ${readings.length} leituras`);
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

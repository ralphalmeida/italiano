// Valida o conteúdo das unidades e leituras: `npm run check-content`
import { readdirSync } from 'node:fs';

const dir = new URL('../src/data/units/', import.meta.url);
const errors = [];
const ids = new Set();
let lessons = 0;
let exercises = 0;

for (const f of readdirSync(dir).filter((f) => /^u\d+\.js$/.test(f)).sort()) {
  const u = (await import(new URL(f, dir))).default;
  for (const l of u.lessons) {
    lessons++;
    if (ids.has(l.id)) errors.push(`${l.id}: id repetido`);
    ids.add(l.id);
    l.exercises.forEach((ex, i) => {
      exercises++;
      const at = `${l.id}#${i}`;
      if (ex.type === 'mc' && !(ex.options?.length >= 2 && ex.options[ex.answer] !== undefined)) errors.push(`${at}: mc inválido`);
      if (ex.type === 'fill' && ex.prompt.split('___').length !== 2) errors.push(`${at}: fill precisa de um ___`);
      if (['fill', 'translate'].includes(ex.type) && !(Array.isArray(ex.answer) && ex.answer.length)) errors.push(`${at}: answer deve ser lista`);
      if (ex.type === 'order' && typeof ex.answer !== 'string') errors.push(`${at}: order.answer deve ser texto`);
      if (!['mc', 'fill', 'order', 'translate'].includes(ex.type)) errors.push(`${at}: tipo desconhecido ${ex.type}`);
    });
  }
}
const readings = (await import('../src/data/readings.js')).default;
for (const r of readings) r.questions.forEach((q, i) => q.options[q.answer] === undefined && errors.push(`${r.id}#${i}: resposta inválida`));

console.log(`${ids.size} lições, ${exercises} exercícios, ${readings.length} leituras`);
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

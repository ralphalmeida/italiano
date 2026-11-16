import readings from './readings.js';

const modules = import.meta.glob('./units/u*.js', { eager: true });

// Cada lição do conteúdo vira 3 etapas curtas, do reconhecimento à produção:
//   a) Vocabulário: só as palavras novas (ligar pares, significado)
//   b) Entender: a explicação + múltipla escolha e completar
//   c) Praticar: montar e traduzir frases
export const STEPS = [
  { suffix: 'a', key: 'vocab', label: 'Vocabulário', icon: '📖' },
  { suffix: 'b', key: 'learn', label: 'Entender', icon: '💡' },
  { suffix: 'c', key: 'practice', label: 'Praticar', icon: '✍️' },
];

function splitLesson(l) {
  const base = { parent: l.id, lessonTitle: l.title, vocab: l.vocab };
  const learn = l.exercises.filter((e) => e.type === 'mc' || e.type === 'fill');
  let practice = l.exercises.filter((e) => e.type === 'order' || e.type === 'translate');
  // garante uma rodada razoável mesmo em lições com poucos exercícios de produção
  if (practice.length < 6) practice = [...practice, ...learn.filter((e) => e.type === 'fill').slice(0, 6 - practice.length)];
  return [
    {
      ...base,
      id: `${l.id}a`,
      step: STEPS[0],
      title: `${l.title} · Vocabulário`,
      theory: [{ type: 'p', text: 'Comece pelas palavras desta lição. Leia a lista com calma; depois você vai ligar pares e reconhecer os significados.' }],
      exercises: [],
    },
    { ...base, id: `${l.id}b`, step: STEPS[1], title: `${l.title} · Entender`, theory: l.theory, exercises: learn },
    {
      ...base,
      id: `${l.id}c`,
      step: STEPS[2],
      title: `${l.title} · Praticar`,
      theory: [{ type: 'p', text: 'Agora é com você: monte e traduza frases usando o que aprendeu. Se travar, abra a explicação abaixo ou peça uma dica.' }],
      recap: l.theory,
      exercises: practice,
    },
  ];
}

// Cada unidade ganha no fim uma lição de revisão ("Ripasso") que sorteia exercícios de todas as suas lições.
function buildUnit(u) {
  const review = {
    id: `${u.id}rev`,
    title: `Ripasso: ${u.title}`,
    review: true,
    theory: [
      { type: 'p', text: `Revisão da unidade **${u.title}**: exercícios sorteados de todas as lições. Cada vez que você fizer, vêm perguntas diferentes.` },
      { type: 'examples', items: u.lessons.map((l, i) => [l.title, `Lição ${i + 1}`]) },
    ],
    vocab: u.lessons.flatMap((l) => l.vocab || []),
    exercises: u.lessons.flatMap((l) => l.exercises),
  };
  return { ...u, topics: u.lessons, lessons: [...u.lessons.flatMap(splitLesson), review] };
}

export const units = Object.keys(modules)
  .sort((a, b) => Number(a.match(/u(\d+)/)[1]) - Number(b.match(/u(\d+)/)[1]))
  .map((k) => buildUnit(modules[k].default));

export const lessons = units.flatMap((u) => u.lessons.map((l) => ({ ...l, unitId: u.id })));

export const lessonById = Object.fromEntries(lessons.map((l) => [l.id, l]));

export { readings };

import readings from './readings.js';

const modules = import.meta.glob('./units/u*.js', { eager: true });

// Cada unidade ganha no fim uma lição de revisão ("Ripasso") que sorteia exercícios de todas as suas lições.
function withReview(u) {
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
  return { ...u, lessons: [...u.lessons, review] };
}

export const units = Object.keys(modules)
  .sort((a, b) => Number(a.match(/u(\d+)/)[1]) - Number(b.match(/u(\d+)/)[1]))
  .map((k) => withReview(modules[k].default));

export const lessons = units.flatMap((u) => u.lessons.map((l) => ({ ...l, unitId: u.id })));

export const lessonById = Object.fromEntries(lessons.map((l) => [l.id, l]));

export { readings };

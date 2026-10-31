import readings from './readings.js';

const modules = import.meta.glob('./units/u*.js', { eager: true });

export const units = Object.keys(modules)
  .sort()
  .map((k) => modules[k].default);

export const lessons = units.flatMap((u) => u.lessons.map((l) => ({ ...l, unitId: u.id })));

export const lessonById = Object.fromEntries(lessons.map((l) => [l.id, l]));

export { readings };

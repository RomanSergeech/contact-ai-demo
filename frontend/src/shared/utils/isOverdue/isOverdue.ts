// Дедлайн считается просроченным, если он строго раньше полуночи сегодняшнего дня (по локальному времени)
export const isOverdue = (deadline: string): boolean =>
  new Date(deadline) < new Date(new Date().toDateString())

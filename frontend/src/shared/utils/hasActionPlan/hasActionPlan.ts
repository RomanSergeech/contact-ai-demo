export const hasActionPlan = (text: string): boolean =>
  /^\s*\d+[.)]\s+\S/m.test(text)

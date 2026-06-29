export const parseJson = <T>(val: T | string | null | undefined, fallback: T): T => {
  if (val === null || val === undefined) return fallback
  if (typeof val === 'string') {
    try { return JSON.parse(val) } catch { return fallback }
  }
  return val ?? fallback
}

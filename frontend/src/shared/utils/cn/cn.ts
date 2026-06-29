export function cn(...args: (string | undefined | boolean)[]): string {
  const classes = []
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (!arg) continue
    classes.push(arg)
  }
  return classes.join(' ')
}

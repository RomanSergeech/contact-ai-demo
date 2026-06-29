export const deadlineTime = (deadline: string): string | null => {
  const time = deadline.slice(11, 16)
  return time && time !== '00:00' ? time : null
}

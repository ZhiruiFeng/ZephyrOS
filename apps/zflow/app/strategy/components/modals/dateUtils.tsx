export const formatDisplayDate = (dateStr: string) => {
  const date = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const todayStr = today.toISOString().split('T')[0]
  const yesterdayStr = yesterday.toISOString().split('T')[0]
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  if (dateStr === todayStr) return 'Today'
  if (dateStr === yesterdayStr) return 'Yesterday'
  if (dateStr === tomorrowStr) return 'Tomorrow'

  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })
}
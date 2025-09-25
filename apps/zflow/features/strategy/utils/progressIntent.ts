// Helper: Progress Bar Color
export function progressIntent(p: number) {
  if (p >= 90) return 'bg-gradient-to-r from-green-500 to-green-600'
  if (p >= 75) return 'bg-gradient-to-r from-green-400 to-green-500'
  if (p >= 50) return 'bg-gradient-to-r from-blue-400 to-blue-500'
  if (p >= 25) return 'bg-gradient-to-r from-yellow-400 to-yellow-500'
  if (p >= 10) return 'bg-gradient-to-r from-orange-400 to-orange-500'
  return 'bg-gradient-to-r from-gray-300 to-gray-400'
}

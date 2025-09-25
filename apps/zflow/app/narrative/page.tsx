import { Metadata } from 'next'
import { NarrativePage } from '@/narrative'

export const metadata: Metadata = {
  title: 'Life Narrative - ZephyrOS',
  description: 'Live your life as a story composed of seasons and episodes. Capture highlights, track moods, and reflect on your journey.',
  keywords: ['life story', 'personal narrative', 'journaling', 'seasons', 'episodes', 'reflection', 'mood tracking'],
}

export default function NarrativeRoute() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <NarrativePage />
    </div>
  )
}
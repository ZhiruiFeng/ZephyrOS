import type { Meta, StoryObj } from '@storybook/react'
import { EventCard } from './EventCard'

const meta: Meta<typeof EventCard> = {
  title: 'Timeline/EventCard',
  component: EventCard,
}
export default meta
type Story = StoryObj<typeof EventCard>

const categories = [
  { id: 'c1', name: 'Work', color: '#059669' },
  { id: 'c2', name: 'Personal', color: '#6366F1' },
]

const baseEvent = {
  id: 'e1',
  title: 'Write product spec and review with team',
  start: new Date().toISOString(),
  end: new Date(Date.now() + 45 * 60000).toISOString(),
  type: 'activity',
  categoryId: 'c1',
  source: 'ZephyrOS',
  meta: {
    note: 'Focus block for key sections. Ensure scope and success criteria are clear.',
    tags: ['spec', 'review', 'focus']
  }
} as any

export const Default: Story = {
  args: {
    ev: baseEvent,
    categories,
  },
}

export const WithLongTitle: Story = {
  args: {
    ev: {
      ...baseEvent,
      title: 'A very long title that should clamp nicely on mobile and not overflow into other areas of the card when space is constrained',
    },
    categories,
  },
}

export const MemoryPoint: Story = {
  args: {
    ev: {
      ...baseEvent,
      id: 'e2',
      type: 'memory',
      end: baseEvent.start, // point-in-time
      meta: { note: 'Short bookmark note', tags: ['bookmark'] },
    },
    categories,
  },
}

export const NoteFilteredZero: Story = {
  args: {
    ev: {
      ...baseEvent,
      id: 'e3',
      meta: { note: '0', tags: ['edge'] },
    },
    categories,
  },
}


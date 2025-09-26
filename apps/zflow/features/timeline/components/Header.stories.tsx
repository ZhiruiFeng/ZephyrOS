import type { Meta, StoryObj } from '@storybook/react'
import { Header } from './Header'

const meta: Meta<typeof Header> = {
  title: 'Timeline/Header',
  component: Header,
}
export default meta
type Story = StoryObj<typeof Header>

const mockEvents: any[] = [
  { id: 'e1', title: 'Task', start: new Date().toISOString(), end: new Date(Date.now() + 30*60000).toISOString(), type: 'task' },
  { id: 'e2', title: 'Activity', start: new Date().toISOString(), end: new Date(Date.now() + 60*60000).toISOString(), type: 'activity' },
]

const t: any = {
  ui: { recorded: 'Recorded' },
  common: { search: 'Search', create: 'New' },
}

export const Default: Story = {
  args: {
    day: new Date(),
    events: mockEvents,
    t,
    lang: 'en' as any,
  },
}


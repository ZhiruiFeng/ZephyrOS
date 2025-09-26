import type { Meta, StoryObj } from '@storybook/react'
import { Gap } from './Gap'

const meta: Meta<typeof Gap> = {
  title: 'Timeline/Gap',
  component: Gap,
}
export default meta
type Story = StoryObj<typeof Gap>

const t: any = {
  ui: { noData: 'No records', minutes: 'm' },
  common: { create: 'New' },
}

export const ShortGap: Story = {
  args: {
    from: new Date(),
    to: new Date(Date.now() + 10 * 60000),
    t,
  },
}

export const LongGap: Story = {
  args: {
    from: new Date(),
    to: new Date(Date.now() + 75 * 60000),
    t,
  },
}


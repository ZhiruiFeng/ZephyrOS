import React from 'react'
import { PenLine, Plus, Bot } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Textarea } from '../ui'

interface ScratchpadProps {
  scratch: string
  onScratchChange: (content: string) => void
  onPromoteToTask: () => void
  onShowAgentModal: () => void
}

export const Scratchpad = ({
  scratch,
  onScratchChange,
  onPromoteToTask,
  onShowAgentModal
}: ScratchpadProps) => {
  return (
    <Card className="rounded-2xl shadow-lg bg-gradient-to-br from-white via-yellow-50/30 to-white border-0 hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <PenLine className="h-5 w-5" />
          Scratchpad
        </CardTitle>
        <CardDescription>
          Drop thoughts → promote to task or send to agent.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Textarea
          placeholder="Jot an idea, plan, or memory…"
          value={scratch}
          onChange={(e) => onScratchChange(e.target.value)}
          className="min-h-[110px]"
        />
        <div className="mt-3 flex flex-col sm:grid sm:grid-cols-2 gap-2">
          <Button
            variant="secondary"
            onClick={onPromoteToTask}
            disabled={!scratch.trim()}
            className="w-full justify-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden xs:inline">Promote to Task</span>
            <span className="xs:hidden">To Task</span>
          </Button>
          <Button
            disabled={!scratch.trim()}
            onClick={onShowAgentModal}
            className="w-full justify-center"
          >
            <Bot className="h-4 w-4 mr-2" />
            <span className="hidden xs:inline">Send to Agent</span>
            <span className="xs:hidden">To Agent</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

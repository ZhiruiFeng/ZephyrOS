import React from 'react'
import { PenLine, Plus, Bot, Maximize2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Textarea } from '../ui'
import { FullscreenModal, useFullscreenModal } from '../modals/FullscreenModal'

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
  const fullscreen = useFullscreenModal()

  return (
    <>
      <Card className="rounded-2xl shadow-lg bg-gradient-to-br from-white via-yellow-50/30 to-white border-0 hover:shadow-xl transition-shadow duration-300">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <PenLine className="h-5 w-5" />
                Scratchpad
              </CardTitle>
              <CardDescription>
                Drop thoughts → promote to task or send to agent.
              </CardDescription>
            </div>
            <button
              onClick={fullscreen.open}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="View fullscreen"
              aria-label="View fullscreen"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
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

    <FullscreenModal
      isOpen={fullscreen.isOpen}
      onClose={fullscreen.close}
      title="Strategy Scratchpad"
      icon={<PenLine className="w-6 h-6 text-yellow-600" />}
    >
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Strategic Brainstorming Space</h3>
          <p className="text-gray-600">Capture ideas, plans, and thoughts. Transform them into actionable tasks or delegate to AI agents.</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Your thoughts and ideas</label>
              <Textarea
                placeholder="Jot down ideas, strategic thoughts, planning notes, or anything that comes to mind..."
                value={scratch}
                onChange={(e) => onScratchChange(e.target.value)}
                className="min-h-[300px] text-base"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="secondary"
                onClick={onPromoteToTask}
                disabled={!scratch.trim()}
                className="flex-1 justify-center h-12"
              >
                <Plus className="h-5 w-5 mr-2" />
                Promote to Task
              </Button>
              <Button
                disabled={!scratch.trim()}
                onClick={onShowAgentModal}
                className="flex-1 justify-center h-12"
              >
                <Bot className="h-5 w-5 mr-2" />
                Send to Agent
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
            <h4 className="text-lg font-semibold text-blue-800 mb-3">💡 Pro Tips</h4>
            <ul className="space-y-2 text-sm text-blue-700">
              <li>• Use this space for strategic brainstorming</li>
              <li>• Capture meeting insights and action items</li>
              <li>• Note down ideas for future initiatives</li>
              <li>• Plan your approach to complex problems</li>
            </ul>
          </div>

          <div className="bg-green-50 rounded-xl p-6 border border-green-200">
            <h4 className="text-lg font-semibold text-green-800 mb-3">🎯 Quick Actions</h4>
            <ul className="space-y-2 text-sm text-green-700">
              <li>• <strong>Promote to Task:</strong> Convert ideas into trackable work items</li>
              <li>• <strong>Send to Agent:</strong> Delegate implementation to AI</li>
              <li>• <strong>Save draft:</strong> Content is automatically saved</li>
              <li>• <strong>Full screen:</strong> Distraction-free writing mode</li>
            </ul>
          </div>
        </div>
      </div>
    </FullscreenModal>
  </>
  )
}

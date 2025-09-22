import React from 'react'
import { Network, Maximize2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge } from '../ui'
import { TreeNode } from '../business'
import { FullscreenModal, useFullscreenModal } from '../modals/FullscreenModal'

interface Season {
  id: string
  title?: string
}

interface Initiative {
  id: string
  title: string
  progress: number
  tasks: Array<{
    id: string
    title: string
    status: string
    assignee?: string
  }>
}

interface StrategicMapCardProps {
  season: any
  initiatives: any
}

export const StrategicMapCard = ({ season, initiatives }: StrategicMapCardProps) => {
  const fullscreen = useFullscreenModal()

  const renderMapContent = () => (
    <TreeNode
      label={
        <span>
          <span className="font-medium">Season:</span> {season?.title || 'No Active Season'}
        </span>
      }
    >
      {initiatives?.map((initiative: any) => (
        <TreeNode
          key={initiative.id}
          label={
            <div className="flex items-center gap-2">
              <span className="font-medium">{initiative.title}</span>
              <Badge variant="outline">{initiative.progress}%</Badge>
            </div>
          }
        >
          {initiative.tasks.slice(0, 5).map((task: any) => (
            <TreeNode
              key={task.id}
              label={
                <div className="flex items-center gap-2">
                  <span>{task.title}</span>
                  <Badge variant="outline">{task.status}</Badge>
                  {task.assignee && task.assignee !== 'me' && (
                    <Badge variant="secondary">{task.assignee}</Badge>
                  )}
                </div>
              }
            />
          ))}
          {initiative.tasks.length > 5 && (
            <TreeNode
              label={
                <span className="text-slate-500">
                  +{initiative.tasks.length - 5} more tasks...
                </span>
              }
            />
          )}
        </TreeNode>
      ))}
      {!initiatives?.length && (
        <TreeNode
          label={<span className="text-slate-500">No initiatives yet</span>}
        />
      )}
    </TreeNode>
  )

  return (
    <>
      <Card className="rounded-2xl shadow-lg bg-gradient-to-br from-white via-green-50/20 to-white border-0 hover:shadow-xl transition-shadow duration-300">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Network className="h-5 w-5" />
                Strategic Map
              </CardTitle>
              <CardDescription>Goals → Initiatives → Tasks → Agents</CardDescription>
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
          {renderMapContent()}
        </CardContent>
      </Card>

      <FullscreenModal
        isOpen={fullscreen.isOpen}
        onClose={fullscreen.close}
        title="Strategic Map"
        icon={<Network className="w-6 h-6 text-green-600" />}
      >
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Strategic Hierarchy Overview</h3>
            <p className="text-gray-600">Complete view of your strategic structure from season goals down to individual tasks.</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Full Strategic Map</h4>
            {renderMapContent()}
          </div>

          {/* Additional insights in fullscreen */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <h4 className="text-lg font-semibold text-gray-900 mb-3">Initiative Summary</h4>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-green-600">{initiatives?.length || 0}</div>
                <div className="text-sm text-gray-600">Active Initiatives</div>
                {initiatives?.length > 0 && (
                  <div className="text-sm text-gray-500">
                    Avg Progress: {Math.round(initiatives.reduce((acc: number, init: any) => acc + init.progress, 0) / initiatives.length)}%
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <h4 className="text-lg font-semibold text-gray-900 mb-3">Task Overview</h4>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-blue-600">
                  {initiatives?.reduce((acc: number, init: any) => acc + init.tasks.length, 0) || 0}
                </div>
                <div className="text-sm text-gray-600">Total Tasks</div>
                <div className="text-sm text-gray-500">
                  Across {initiatives?.length || 0} initiatives
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <h4 className="text-lg font-semibold text-gray-900 mb-3">Delegation Status</h4>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-purple-600">
                  {initiatives?.reduce((acc: number, init: any) =>
                    acc + init.tasks.filter((task: any) => task.assignee && task.assignee !== 'me').length, 0
                  ) || 0}
                </div>
                <div className="text-sm text-gray-600">Delegated Tasks</div>
                <div className="text-sm text-gray-500">
                  AI-assisted execution
                </div>
              </div>
            </div>
          </div>
        </div>
      </FullscreenModal>
    </>
  )
}

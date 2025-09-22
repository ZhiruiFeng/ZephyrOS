import React from 'react'
import { Network } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge } from '../ui'
import { TreeNode } from '../business'

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
  return (
    <Card className="rounded-2xl shadow-lg bg-gradient-to-br from-white via-green-50/20 to-white border-0 hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Network className="h-5 w-5" />
          Strategic Map
        </CardTitle>
        <CardDescription>Goals → Initiatives → Tasks → Agents</CardDescription>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  )
}

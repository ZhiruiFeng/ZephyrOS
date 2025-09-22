import React from 'react'
import { Wand2, Maximize2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button } from '../ui'
import { FullscreenModal, useFullscreenModal } from '../modals/FullscreenModal'

export const QuickActions = () => {
  const fullscreen = useFullscreenModal()

  const quickActions = [
    { title: 'Break down selected goal', description: 'Decompose high-level goals into actionable initiatives', category: 'Planning' },
    { title: 'Draft OKRs for season', description: 'Create Objectives and Key Results for the current season', category: 'Goal Setting' },
    { title: 'Create weekly cadence', description: 'Establish recurring meetings and check-ins', category: 'Operations' },
    { title: 'Spin up research docket', description: 'Set up a research pipeline for strategic decisions', category: 'Research' },
    { title: 'Review team capacity', description: 'Analyze current team workload and availability', category: 'Resource Management' },
    { title: 'Update stakeholder brief', description: 'Prepare communication for key stakeholders', category: 'Communication' },
    { title: 'Schedule strategic review', description: 'Plan next strategic assessment session', category: 'Review' },
    { title: 'Identify skill gaps', description: 'Assess team capabilities vs. strategic needs', category: 'Development' }
  ]

  return (
    <>
      <Card className="rounded-2xl shadow-lg bg-gradient-to-br from-white via-orange-50/30 to-white border-0 hover:shadow-xl transition-shadow duration-300">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Wand2 className="h-5 w-5" />
                Quick Actions
              </CardTitle>
              <CardDescription>Pre-baked CEO moves.</CardDescription>
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
        <CardContent className="grid gap-2">
          <Button variant="secondary">Break down selected goal</Button>
          <Button variant="secondary">Draft OKRs for season</Button>
          <Button variant="secondary">Create weekly cadence</Button>
          <Button variant="secondary">Spin up research docket</Button>
        </CardContent>
      </Card>

      <FullscreenModal
        isOpen={fullscreen.isOpen}
        onClose={fullscreen.close}
        title="Quick Actions"
        icon={<Wand2 className="w-6 h-6 text-orange-600" />}
      >
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Strategic Quick Actions</h3>
            <p className="text-gray-600">Pre-configured actions to accelerate your strategic execution and planning processes.</p>
          </div>

          <div className="space-y-6">
            {['Planning', 'Goal Setting', 'Operations', 'Research', 'Resource Management', 'Communication', 'Review', 'Development'].map(category => {
              const categoryActions = quickActions.filter(action => action.category === category)
              if (categoryActions.length === 0) return null

              return (
                <div key={category} className="bg-white rounded-xl p-6 shadow-sm border">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">{category}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {categoryActions.map((action, index) => (
                      <div key={index} className="group">
                        <Button
                          variant="secondary"
                          className="w-full h-auto p-4 text-left flex flex-col items-start justify-start hover:bg-orange-50 hover:border-orange-200 transition-all"
                        >
                          <div className="font-medium text-gray-900 group-hover:text-orange-700">
                            {action.title}
                          </div>
                          <div className="text-sm text-gray-600 mt-1 group-hover:text-orange-600">
                            {action.description}
                          </div>
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
            <h4 className="text-lg font-semibold text-orange-800 mb-3">💡 How Quick Actions Work</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-orange-700">
              <div>
                <div className="font-medium mb-2">Automated Workflows</div>
                <p>Each action triggers a pre-configured workflow that guides you through the necessary steps and decision points.</p>
              </div>
              <div>
                <div className="font-medium mb-2">Context-Aware</div>
                <p>Actions adapt based on your current season, active initiatives, and team configuration for relevant guidance.</p>
              </div>
            </div>
          </div>
        </div>
      </FullscreenModal>
    </>
  )
}

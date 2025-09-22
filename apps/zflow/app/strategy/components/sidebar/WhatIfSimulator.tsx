import React from 'react'
import { Shuffle, Maximize2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button } from '../ui'
import { FullscreenModal, useFullscreenModal } from '../modals/FullscreenModal'
import type { WhatIfScenario } from '../../../../lib/types/strategy'

interface WhatIfSimulatorProps {
  whatIfAutoRebalance: boolean
  onAutoRebalanceChange: (enabled: boolean) => void
  whatIfScenarios: WhatIfScenario[]
  selectedScenario: WhatIfScenario | null
  onScenarioSelect: (scenario: WhatIfScenario) => void
}

export const WhatIfSimulator = ({
  whatIfAutoRebalance,
  onAutoRebalanceChange,
  whatIfScenarios,
  selectedScenario,
  onScenarioSelect
}: WhatIfSimulatorProps) => {
  const fullscreen = useFullscreenModal()

  return (
    <>
      <Card className="rounded-2xl shadow-lg bg-gradient-to-br from-white via-indigo-50/30 to-white border-0 hover:shadow-xl transition-shadow duration-300">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shuffle className="h-5 w-5" />
                What‑If Simulator
              </CardTitle>
              <CardDescription>Drop an initiative → see rebalanced focus.</CardDescription>
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
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label htmlFor="rebalance" className="text-sm font-medium">Auto‑rebalance</label>
            <input
              type="checkbox"
              id="rebalance"
              checked={whatIfAutoRebalance}
              onChange={(e) => onAutoRebalanceChange(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </div>

          {whatIfScenarios.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Pre-built Scenarios</label>
              {whatIfScenarios.map((scenario: WhatIfScenario, i: number) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => onScenarioSelect(scenario)}
                >
                  {scenario.name}
                </Button>
              ))}
            </div>
          )}

          {selectedScenario && (
            <div className="border rounded-lg p-3 text-sm">
              <div className="font-medium">{selectedScenario.name}</div>
              <div className="text-gray-600 mt-1">{selectedScenario.description}</div>
              {selectedScenario.results.riskFactors.length > 0 && (
                <div className="mt-2">
                  <div className="text-xs font-medium text-red-600">Risks:</div>
                  <ul className="text-xs text-red-600 mt-1">
                    {selectedScenario.results.riskFactors.map((risk: string, i: number) => (
                      <li key={i}>• {risk}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>

    <FullscreenModal
      isOpen={fullscreen.isOpen}
      onClose={fullscreen.close}
      title="What-If Simulator"
      icon={<Shuffle className="w-6 h-6 text-indigo-600" />}
    >
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Strategic Scenario Planning</h3>
          <p className="text-gray-600">Explore different strategic scenarios and understand their implications on your initiatives.</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <label htmlFor="rebalance-full" className="text-base font-medium text-gray-900">Auto-rebalance</label>
                <p className="text-sm text-gray-600">Automatically adjust initiative priorities based on scenarios</p>
              </div>
              <input
                type="checkbox"
                id="rebalance-full"
                checked={whatIfAutoRebalance}
                onChange={(e) => onAutoRebalanceChange(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-5 h-5"
              />
            </div>

            {whatIfScenarios.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Available Scenarios</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {whatIfScenarios.map((scenario: WhatIfScenario, i: number) => (
                    <div
                      key={i}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedScenario?.name === scenario.name
                          ? 'border-indigo-300 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => onScenarioSelect(scenario)}
                    >
                      <div className="font-medium text-gray-900">{scenario.name}</div>
                      <div className="text-sm text-gray-600 mt-1">{scenario.description}</div>
                      {scenario.results.riskFactors.length > 0 && (
                        <div className="mt-2 text-xs text-red-600">
                          {scenario.results.riskFactors.length} risk factors identified
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedScenario && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6">
                <h4 className="text-lg font-semibold text-indigo-900 mb-3">Selected Scenario</h4>
                <div className="space-y-4">
                  <div>
                    <div className="font-medium text-indigo-800">{selectedScenario.name}</div>
                    <div className="text-indigo-700 mt-1">{selectedScenario.description}</div>
                  </div>

                  {selectedScenario.results.riskFactors.length > 0 && (
                    <div>
                      <div className="text-sm font-medium text-red-700 mb-2">Risk Factors</div>
                      <ul className="space-y-1">
                        {selectedScenario.results.riskFactors.map((risk: string, i: number) => (
                          <li key={i} className="text-sm text-red-600 flex items-start gap-2">
                            <span className="text-red-500 mt-1">•</span>
                            <span>{risk}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h4 className="text-lg font-semibold text-gray-900 mb-3">How to Use</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <div className="font-medium text-gray-900 mb-2">🎯 Scenario Selection</div>
              <ul className="space-y-1">
                <li>• Click on a scenario to analyze its impact</li>
                <li>• Review risk factors and opportunities</li>
                <li>• Compare multiple scenarios side by side</li>
              </ul>
            </div>
            <div>
              <div className="font-medium text-gray-900 mb-2">⚖️ Auto-Rebalancing</div>
              <ul className="space-y-1">
                <li>• Enable to automatically adjust priorities</li>
                <li>• See how initiatives would be rebalanced</li>
                <li>• Understand resource allocation changes</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </FullscreenModal>
  </>
  )
}

import React from 'react'
import { Shuffle } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button } from '../ui'
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
  return (
    <Card className="rounded-2xl shadow-lg bg-gradient-to-br from-white via-indigo-50/30 to-white border-0 hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Shuffle className="h-5 w-5" />
          What‑If Simulator
        </CardTitle>
        <CardDescription>Drop an initiative → see rebalanced focus.</CardDescription>
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
  )
}

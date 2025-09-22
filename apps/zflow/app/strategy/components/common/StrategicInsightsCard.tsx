import React from 'react'
import { TrendingUp, Maximize2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui'
import { FullscreenModal, useFullscreenModal } from '../modals/FullscreenModal'

interface StrategicInsights {
  positiveIndicators: string[]
  riskAlerts: string[]
  actionableRecommendations: string[]
}

interface StrategicInsightsCardProps {
  insights: StrategicInsights | null
}

export const StrategicInsightsCard = ({ insights }: StrategicInsightsCardProps) => {
  const fullscreen = useFullscreenModal()

  if (!insights) return null

  const renderInsights = () => (
    <div className="space-y-3">
      {insights.positiveIndicators.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-green-700 mb-2">✅ Positive Indicators</h4>
          <ul className="text-sm space-y-1">
            {insights.positiveIndicators.map((indicator: string, i: number) => (
              <li key={i} className="text-green-600">• {indicator}</li>
            ))}
          </ul>
        </div>
      )}

      {insights.riskAlerts.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-red-700 mb-2">⚠️ Risk Alerts</h4>
          <ul className="text-sm space-y-1">
            {insights.riskAlerts.map((alert: string, i: number) => (
              <li key={i} className="text-red-600">• {alert}</li>
            ))}
          </ul>
        </div>
      )}

      {insights.actionableRecommendations.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-blue-700 mb-2">💡 Recommendations</h4>
          <ul className="text-sm space-y-1">
            {insights.actionableRecommendations.map((rec: string, i: number) => (
              <li key={i} className="text-blue-600">• {rec}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )

  return (
    <>
      <Card className="rounded-2xl shadow-lg bg-gradient-to-br from-white via-blue-50/30 to-white border-0 hover:shadow-xl transition-shadow duration-300">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Strategic Insights
              </CardTitle>
              <CardDescription>AI-powered analysis of your strategic progress</CardDescription>
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
          {renderInsights()}
        </CardContent>
      </Card>

      <FullscreenModal
        isOpen={fullscreen.isOpen}
        onClose={fullscreen.close}
        title="Strategic Insights"
        icon={<TrendingUp className="w-6 h-6 text-blue-600" />}
      >
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">AI-Powered Strategic Analysis</h3>
            <p className="text-gray-600">Comprehensive insights into your strategic progress and recommendations for optimization.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {insights.positiveIndicators.length > 0 && (
              <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                <h4 className="text-lg font-semibold text-green-800 mb-4 flex items-center gap-2">
                  <span className="text-xl">✅</span>
                  Positive Indicators
                </h4>
                <ul className="space-y-2">
                  {insights.positiveIndicators.map((indicator: string, i: number) => (
                    <li key={i} className="text-green-700 flex items-start gap-2">
                      <span className="text-green-500 mt-1">•</span>
                      <span>{indicator}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {insights.riskAlerts.length > 0 && (
              <div className="bg-red-50 rounded-xl p-6 border border-red-200">
                <h4 className="text-lg font-semibold text-red-800 mb-4 flex items-center gap-2">
                  <span className="text-xl">⚠️</span>
                  Risk Alerts
                </h4>
                <ul className="space-y-2">
                  {insights.riskAlerts.map((alert: string, i: number) => (
                    <li key={i} className="text-red-700 flex items-start gap-2">
                      <span className="text-red-500 mt-1">•</span>
                      <span>{alert}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {insights.actionableRecommendations.length > 0 && (
              <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                <h4 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
                  <span className="text-xl">💡</span>
                  Recommendations
                </h4>
                <ul className="space-y-2">
                  {insights.actionableRecommendations.map((rec: string, i: number) => (
                    <li key={i} className="text-blue-700 flex items-start gap-2">
                      <span className="text-blue-500 mt-1">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <h4 className="text-lg font-semibold text-gray-900 mb-3">Summary</h4>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{insights.positiveIndicators.length}</div>
                <div className="text-sm text-green-700">Positive Signals</div>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{insights.riskAlerts.length}</div>
                <div className="text-sm text-red-700">Risk Areas</div>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{insights.actionableRecommendations.length}</div>
                <div className="text-sm text-blue-700">Action Items</div>
              </div>
            </div>
          </div>
        </div>
      </FullscreenModal>
    </>
  )
}

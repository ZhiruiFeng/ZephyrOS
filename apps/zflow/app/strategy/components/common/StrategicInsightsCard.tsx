import React from 'react'
import { TrendingUp } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui'

interface StrategicInsights {
  positiveIndicators: string[]
  riskAlerts: string[]
  actionableRecommendations: string[]
}

interface StrategicInsightsCardProps {
  insights: StrategicInsights | null
}

export const StrategicInsightsCard = ({ insights }: StrategicInsightsCardProps) => {
  if (!insights) return null

  return (
    <Card className="rounded-2xl shadow-lg bg-gradient-to-br from-white via-blue-50/30 to-white border-0 hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Strategic Insights
        </CardTitle>
        <CardDescription>AI-powered analysis of your strategic progress</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
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
      </CardContent>
    </Card>
  )
}

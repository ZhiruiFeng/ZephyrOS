import React from 'react'
import { Wand2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button } from '../ui'

export const QuickActions = () => {
  return (
    <Card className="rounded-2xl shadow-lg bg-gradient-to-br from-white via-orange-50/30 to-white border-0 hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Wand2 className="h-5 w-5" />
          Quick Actions
        </CardTitle>
        <CardDescription>Pre-baked CEO moves.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2">
        <Button variant="secondary">Break down selected goal</Button>
        <Button variant="secondary">Draft OKRs for season</Button>
        <Button variant="secondary">Create weekly cadence</Button>
        <Button variant="secondary">Spin up research docket</Button>
      </CardContent>
    </Card>
  )
}

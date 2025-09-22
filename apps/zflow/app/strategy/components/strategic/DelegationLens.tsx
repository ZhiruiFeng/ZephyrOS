import React from 'react'
import { AgentCard } from '../business'

interface DelegationLensProps {
  agents: any
}

export const DelegationLens = ({ agents }: DelegationLensProps) => {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">Monitor agent capacity and queue.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {agents?.map((agent: any) => (
          <AgentCard
            key={agent.id}
            agent={agent}
          />
        ))}
        {!agents?.length && (
          <div className="col-span-3 text-center py-8 text-gray-500">
            No agents available
          </div>
        )}
      </div>
    </div>
  )
}

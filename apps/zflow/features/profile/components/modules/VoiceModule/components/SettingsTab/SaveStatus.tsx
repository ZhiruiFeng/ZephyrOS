import { CheckCircle, AlertCircle } from 'lucide-react'

interface SaveStatusProps {
  status: 'idle' | 'saving' | 'saved' | 'error'
}

export function SaveStatus({ status }: SaveStatusProps) {
  if (status === 'idle') return null

  const statusConfig = {
    saving: {
      color: 'blue',
      icon: null,
      text: 'Saving...',
      spinner: true
    },
    saved: {
      color: 'green',
      icon: CheckCircle,
      text: 'Saved',
      spinner: false
    },
    error: {
      color: 'red',
      icon: AlertCircle,
      text: 'Error saving configuration',
      spinner: false
    }
  }

  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <div className={`flex items-center gap-2 text-${config.color}-600`}>
      {config.spinner && (
        <div className={`w-4 h-4 border-2 border-${config.color}-600 border-t-transparent rounded-full animate-spin`} />
      )}
      {Icon && <Icon className="w-4 h-4" />}
      <span className="text-sm">{config.text}</span>
    </div>
  )
}

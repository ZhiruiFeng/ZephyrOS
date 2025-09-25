import { useEffect, useRef, useState } from 'react'

export type AutoSaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error'

export interface UseAutoSaveOptions {
  /** Delay in milliseconds after user stops typing before auto-save triggers */
  delay?: number
  /** Whether auto-save is enabled */
  enabled?: boolean
  /** Function to call when saving */
  onSave: () => Promise<void>
  /** Function to check if content has changed from last saved state */
  hasChanges: () => boolean
}

export function useAutoSave({
  delay = 3000, // 3 seconds after user stops typing
  enabled = true,
  onSave,
  hasChanges
}: UseAutoSaveOptions) {
  const [status, setStatus] = useState<AutoSaveStatus>('idle')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pendingRef = useRef(false)

  // Clear any pending timeouts on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const triggerAutoSave = () => {
    if (!enabled || !hasChanges() || pendingRef.current) {
      return
    }

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Set status to pending
    setStatus('pending')

    // Set new timeout
    timeoutRef.current = setTimeout(async () => {
      if (!hasChanges()) {
        setStatus('idle')
        return
      }

      try {
        pendingRef.current = true
        setStatus('saving')
        
        await onSave()
        
        setStatus('saved')
        setLastSaved(new Date())
        
        // Reset to idle after showing "saved" for a longer moment
        setTimeout(() => {
          setStatus('idle')
        }, 5000)
        
      } catch (error) {
        setStatus('error')
        
        // Reset to idle after showing error for a moment
        setTimeout(() => {
          setStatus('idle')
        }, 3000)
      } finally {
        pendingRef.current = false
      }
    }, delay)
  }

  const cancelAutoSave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    if (status === 'pending') {
      setStatus('idle')
    }
  }

  const forceAutoSave = async () => {
    cancelAutoSave()
    if (!hasChanges() || pendingRef.current) {
      return
    }

    try {
      pendingRef.current = true
      setStatus('saving')
      
      await onSave()
      
      setStatus('saved')
      setLastSaved(new Date())
      
      setTimeout(() => {
        setStatus('idle')
      }, 5000)
      
    } catch (error) {
      setStatus('error')
      
      setTimeout(() => {
        setStatus('idle')
      }, 3000)
    } finally {
      pendingRef.current = false
    }
  }

  const resetAutoSave = () => {
    cancelAutoSave()
    setStatus('idle')
    setLastSaved(null)
  }

  return {
    status,
    lastSaved,
    triggerAutoSave,
    cancelAutoSave,
    forceAutoSave,
    resetAutoSave
  }
}
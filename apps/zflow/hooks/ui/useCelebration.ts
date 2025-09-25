'use client'

import { useState, useCallback } from 'react'

export function useCelebration() {
  const [isVisible, setIsVisible] = useState(false)

  const triggerCelebration = useCallback(() => {
    setIsVisible(true)
  }, [])

  const hideCelebration = useCallback(() => {
    setIsVisible(false)
  }, [])

  return {
    isVisible,
    triggerCelebration,
    hideCelebration
  }
}
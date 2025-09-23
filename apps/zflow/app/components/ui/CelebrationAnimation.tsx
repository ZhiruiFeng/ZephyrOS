'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'

interface CelebrationAnimationProps {
  isVisible: boolean
  onComplete?: () => void
}

interface Confetti {
  id: number
  x: number
  y: number
  rotation: number
  color: string
  size: number
  delay: number
}

const COLORS = [
  '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57',
  '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3', '#ff9f43'
]

const generateConfetti = (count: number): Confetti[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: -10,
    rotation: Math.random() * 360,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    size: Math.random() * 8 + 4,
    delay: Math.random() * 0.5
  }))
}

export function CelebrationAnimation({ isVisible, onComplete }: CelebrationAnimationProps) {
  const [confetti, setConfetti] = useState<Confetti[]>([])

  useEffect(() => {
    if (isVisible) {
      setConfetti(generateConfetti(50))

      const timer = setTimeout(() => {
        onComplete?.()
      }, 3000)

      return () => clearTimeout(timer)
    }
  }, [isVisible, onComplete])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 pointer-events-none z-50 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Confetti particles */}
          {confetti.map((particle) => (
            <motion.div
              key={particle.id}
              className="absolute rounded-sm"
              style={{
                backgroundColor: particle.color,
                width: particle.size,
                height: particle.size,
                left: `${particle.x}%`,
              }}
              initial={{
                y: particle.y,
                rotate: particle.rotation,
                opacity: 1
              }}
              animate={{
                y: window.innerHeight + 20,
                rotate: particle.rotation + 360,
                opacity: 0
              }}
              transition={{
                duration: 3,
                delay: particle.delay,
                ease: "easeOut"
              }}
            />
          ))}

          {/* Central celebration message */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              className="text-center"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 20,
                delay: 0.1
              }}
            >
              {/* Celebration emoji */}
              <motion.div
                className="text-8xl mb-4"
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, 10, -10, 0]
                }}
                transition={{
                  duration: 0.6,
                  repeat: 2,
                  repeatType: "reverse"
                }}
              >
                🎉
              </motion.div>

              {/* Success message */}
              <motion.div
                className="bg-green-100 border-2 border-green-300 rounded-lg px-6 py-4 shadow-lg"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <h2 className="text-2xl font-bold text-green-800 mb-2">
                  Task Completed! 🎊
                </h2>
                <p className="text-green-600">
                  Great job! You&apos;re making progress!
                </p>
              </motion.div>
            </motion.div>
          </div>

          {/* Sparkle effects */}
          {Array.from({ length: 8 }).map((_, i) => (
            <motion.div
              key={`sparkle-${i}`}
              className="absolute text-2xl"
              style={{
                left: `${20 + i * 10}%`,
                top: `${30 + (i % 3) * 20}%`,
              }}
              initial={{ scale: 0, rotate: 0 }}
              animate={{
                scale: [0, 1, 0],
                rotate: [0, 180, 360],
                opacity: [0, 1, 0]
              }}
              transition={{
                duration: 2,
                delay: 0.5 + i * 0.1,
                repeat: 1,
                repeatType: "reverse"
              }}
            >
              ✨
            </motion.div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
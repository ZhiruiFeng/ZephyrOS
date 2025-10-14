import type { ParsedTeacherNotes } from '../types'

export function parseTeacherNotes(text: string): ParsedTeacherNotes {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0)

  let score: string | undefined
  const bulletPoints: string[] = []

  for (const line of lines) {
    // Extract score
    const scoreMatch = line.match(/^Score:\s*(.+)$/i)
    if (scoreMatch) {
      score = scoreMatch[1]
      continue
    }

    // Extract bullet points
    if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*')) {
      bulletPoints.push(line.replace(/^[•\-*]\s*/, ''))
    } else if (line.match(/^\d+\./)) {
      bulletPoints.push(line.replace(/^\d+\.\s*/, ''))
    }
  }

  return {
    score,
    bulletPoints: bulletPoints.length > 0 ? bulletPoints : [],
    rawText: text
  }
}

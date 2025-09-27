/**
 * Transcript Refinement Module
 *
 * This module provides AI-powered transcript refinement capabilities to:
 * - Remove filler words (um, uh, like, you know, etc.)
 * - Fix grammatical issues
 * - Improve overall readability
 * - Maintain the original meaning and intent
 */

interface RefinementOptions {
  removeFillersOnly?: boolean
  preserveStyle?: boolean
  model?: string
}

interface RefinementResult {
  refinedText: string
  originalText: string
  changes: {
    fillersRemoved: number
    grammaticalFixes: number
  }
}

/**
 * Refines a transcript by removing filler words and improving readability
 */
export async function refineTranscript(
  rawTranscript: string,
  options: RefinementOptions = {}
): Promise<RefinementResult> {
  const {
    removeFillersOnly = false,
    preserveStyle = true,
    model = 'gpt-4o-mini'
  } = options

  if (!rawTranscript.trim()) {
    return {
      refinedText: rawTranscript,
      originalText: rawTranscript,
      changes: { fillersRemoved: 0, grammaticalFixes: 0 }
    }
  }

  try {
    // Import auth helpers
    const { getAuthHeader } = await import('../../../lib/supabase')
    const authHeaders = await getAuthHeader()

    const systemPrompt = removeFillersOnly
      ? `You are a transcript editor. Your job is to remove filler words and unnecessary repetitions while preserving the exact meaning and style.

Remove these common filler words: um, uh, er, ah, like (when used as filler), you know, so, well (when used as filler), right (when used as confirmation seeking), okay, basically, actually (when overused), literally (when misused).

IMPORTANT RULES:
- Keep the exact same meaning and intent
- Preserve the speaker's natural style and vocabulary
- Don't change technical terms or proper nouns
- Don't rephrase or restructure sentences beyond removing fillers
- Maintain the same level of formality
- Keep punctuation and capitalization style consistent
- If unsure whether something is a filler, keep it

Output only the cleaned transcript, nothing else.`
      : `You are a transcript editor. Your job is to refine speech-to-text output by removing filler words and making minor grammatical improvements while preserving the speaker's intent and style.

Tasks:
1. Remove filler words: um, uh, er, ah, like (when used as filler), you know, so, well (when used as filler), right (when used as confirmation seeking), okay, basically, actually (when overused), literally (when misused)
2. Fix obvious grammatical errors and improve sentence structure
3. Correct punctuation and capitalization
4. Remove unnecessary repetitions

IMPORTANT RULES:
- Keep the exact same meaning and intent
- ${preserveStyle ? 'Preserve the speaker\'s natural style and vocabulary' : 'Improve clarity while maintaining professional tone'}
- Don't change technical terms or proper nouns
- Don't add new information or significantly rephrase content
- Maintain appropriate level of formality for the context
- If unsure about a change, keep the original

Output only the refined transcript, nothing else.`

    const response = await fetch('/api/openai/chat', {
      method: 'POST',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: `Please refine this transcript:\n\n${rawTranscript}`
          }
        ],
        max_tokens: Math.min(4000, rawTranscript.length * 2),
        temperature: 0.1, // Low temperature for consistent output
      }),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      throw new Error(`OpenAI refinement failed: ${response.status} ${response.statusText} ${errorText}`)
    }

    const data = await response.json()
    const refinedText = data.choices?.[0]?.message?.content?.trim() || rawTranscript

    // Calculate approximate changes
    const originalWords = rawTranscript.toLowerCase().split(/\s+/)
    const refinedWords = refinedText.toLowerCase().split(/\s+/)
    const fillersRemoved = Math.max(0, originalWords.length - refinedWords.length)

    // Simple heuristic for grammatical fixes (changes in word order, punctuation, etc.)
    const grammaticalFixes = Math.abs(refinedText.length - rawTranscript.length) > fillersRemoved * 3 ? 1 : 0

    return {
      refinedText,
      originalText: rawTranscript,
      changes: {
        fillersRemoved,
        grammaticalFixes
      }
    }

  } catch (error) {
    console.error('Transcript refinement failed:', error)

    // Fallback: Basic filler word removal using regex
    const basicRefinedText = removeBasicFillers(rawTranscript)
    const fillersRemoved = (rawTranscript.match(/\b(um|uh|er|ah|like|you know|so|well|right|okay|basically)\b/gi) || []).length

    return {
      refinedText: basicRefinedText,
      originalText: rawTranscript,
      changes: {
        fillersRemoved,
        grammaticalFixes: 0
      }
    }
  }
}

/**
 * Basic filler word removal as fallback when AI refinement fails
 */
function removeBasicFillers(text: string): string {
  const fillerPatterns = [
    /\b(um|uh|er|ah)\b/gi,
    /\b(you know)\b/gi,
    /\blike\b(?!\s+(this|that|it|[a-z]+ing))/gi, // Remove "like" but not when it's meaningful
    /\b(so|well|right|okay|basically)\b(?=\s|$)/gi, // Only at word boundaries
  ]

  let refined = text
  for (const pattern of fillerPatterns) {
    refined = refined.replace(pattern, ' ')
  }

  // Clean up extra spaces
  refined = refined.replace(/\s+/g, ' ').trim()

  // Fix capitalization after sentence endings
  refined = refined.replace(/([.!?]\s+)([a-z])/g, (match, punct, letter) =>
    punct + letter.toUpperCase()
  )

  return refined
}

/**
 * Quick check if text likely contains filler words that could benefit from refinement
 */
export function hasFillerWords(text: string): boolean {
  const fillerRegex = /\b(um|uh|er|ah|like|you know|so|well|right|okay|basically|actually|literally)\b/gi
  const matches = text.match(fillerRegex) || []
  return matches.length > 0
}

/**
 * Estimate refinement processing time based on text length
 */
export function estimateRefinementTime(text: string): number {
  const words = text.split(/\s+/).length
  // Rough estimate: ~1-2 seconds for every 100 words
  return Math.max(1000, Math.min(8000, words * 15))
}
/**
 * Prompt Improvement Module
 *
 * This module provides AI-powered prompt enhancement capabilities to:
 * - Improve clarity and engagement of AI task prompts
 * - Maintain all original requirements and constraints
 * - Add helpful structure and guidance
 * - Optimize for better AI assistant performance
 */

interface TaskData {
  objective?: string | null
  deliverables?: string | null
  context?: string | null
  acceptance_criteria?: string | null
  mode: string
  metadata?: {
    priority?: string
  }
  guardrails?: {
    timeCapMin?: number | null
    costCapUSD?: number | null
    requiresHumanApproval?: boolean
    dataScopes?: string[]
  }
}

interface PromptImprovementOptions {
  model?: string
  temperature?: number
  includeExamples?: boolean
  tone?: 'professional' | 'casual' | 'technical'
}

interface PromptImprovementResult {
  improvedPrompt: string
  originalPrompt: string
  improvements: {
    clarityEnhancements: number
    structureImprovements: number
    guidanceAdded: boolean
  }
}

/**
 * Generates a basic AI prompt from task data
 */
export function generateBasicPrompt(task: TaskData): string {
  return [
    `You are an AI assistant tasked with helping complete the following task:`,
    '',
    `## Task Objective`,
    task.objective || 'Please specify the main objective of this task.',
    '',
    ...(task.deliverables ? [
      `## Required Deliverables`,
      task.deliverables,
      ''
    ] : []),
    ...(task.context ? [
      `## Context & Background`,
      task.context,
      ''
    ] : []),
    ...(task.acceptance_criteria ? [
      `## Success Criteria`,
      `The task will be considered complete when:`,
      task.acceptance_criteria,
      ''
    ] : []),
    `## Guidelines`,
    `- Work mode: ${task.mode}`,
    task.metadata?.priority && `- Priority level: ${task.metadata.priority}`,
    task.guardrails?.timeCapMin && `- Time constraint: Complete within ${task.guardrails.timeCapMin} minutes`,
    task.guardrails?.costCapUSD && `- Budget constraint: Stay within $${task.guardrails.costCapUSD}`,
    task.guardrails?.requiresHumanApproval && '- Human approval required before implementation',
    task.guardrails?.dataScopes && task.guardrails.dataScopes.length > 0 &&
      `- Data access limited to: ${task.guardrails.dataScopes.join(', ')}`,
    '',
    'Please approach this task systematically and provide detailed explanations for your approach. Ask clarifying questions if any requirements are unclear.',
  ].filter(line => line !== undefined && line !== null).join('\n')
}

/**
 * Improves an AI prompt using ChatGPT to make it more effective and engaging
 */
export async function improvePrompt(
  task: TaskData,
  options: PromptImprovementOptions = {}
): Promise<PromptImprovementResult> {
  const {
    model = 'gpt-4',
    temperature = 0.7,
    includeExamples = true,
    tone = 'professional'
  } = options

  const originalPrompt = generateBasicPrompt(task)

  if (!originalPrompt.trim()) {
    return {
      improvedPrompt: originalPrompt,
      originalPrompt,
      improvements: {
        clarityEnhancements: 0,
        structureImprovements: 0,
        guidanceAdded: false
      }
    }
  }

  try {
    // Import auth helpers
    const { getAuthHeader } = await import('../../../lib/supabase')
    const authHeaders = await getAuthHeader()

    const systemPrompt = createImprovementSystemPrompt(tone, includeExamples)
    const userPrompt = createImprovementUserPrompt(originalPrompt, task)

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
            content: userPrompt
          }
        ],
        max_tokens: Math.min(2000, originalPrompt.length * 2),
        temperature,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      throw new Error(`OpenAI prompt improvement failed: ${response.status} ${response.statusText} ${errorText}`)
    }

    const data = await response.json()
    const improvedPrompt = data.choices?.[0]?.message?.content?.trim() || originalPrompt

    // Analyze improvements made
    const improvements = analyzeImprovements(originalPrompt, improvedPrompt)

    return {
      improvedPrompt,
      originalPrompt,
      improvements
    }

  } catch (error) {
    console.error('Prompt improvement failed:', error)

    // Fallback: Return basic prompt with minimal enhancements
    const enhancedPrompt = enhancePromptBasic(originalPrompt)

    return {
      improvedPrompt: enhancedPrompt,
      originalPrompt,
      improvements: {
        clarityEnhancements: enhancedPrompt !== originalPrompt ? 1 : 0,
        structureImprovements: 0,
        guidanceAdded: false
      }
    }
  }
}

/**
 * Creates the system prompt for prompt improvement
 */
function createImprovementSystemPrompt(tone: string, includeExamples: boolean): string {
  const basePrompt = `You are an expert prompt engineer specializing in creating effective AI task prompts. Your job is to improve the given prompt to be more engaging, clear, and effective while preserving all original requirements.

IMPROVEMENT GOALS:
1. Make the prompt more engaging and motivating
2. Improve clarity and structure
3. Add helpful guidance and best practices
4. Ensure optimal AI assistant performance
5. Maintain ${tone} tone throughout

CRITICAL REQUIREMENTS:
- Preserve ALL original task requirements, constraints, and specifications
- Maintain the exact same objective, deliverables, and success criteria
- Keep all time, budget, and approval constraints intact
- Do not add new requirements or change the scope
- Ensure the improved prompt would produce the same end result

ENHANCEMENT TECHNIQUES:
- Use clear, actionable language
- Add logical structure and flow
- Include helpful context where appropriate
- Provide guidance on approach and methodology
- Use formatting to improve readability
- Add motivational elements without changing requirements`

  if (includeExamples) {
    return basePrompt + `

EXAMPLE IMPROVEMENTS:
- "Complete this task" → "Let's work together to successfully complete this task"
- "Fix the bugs" → "Systematically identify and resolve the bugs, documenting your approach"
- Add step-by-step guidance where helpful
- Include quality checkpoints and validation steps`
  }

  return basePrompt
}

/**
 * Creates the user prompt for improvement request
 */
function createImprovementUserPrompt(originalPrompt: string, task: TaskData): string {
  return `Please improve the following AI task prompt to be more effective, engaging, and comprehensive. The task mode is "${task.mode}" so tailor the improvements accordingly.

Original prompt:
${originalPrompt}

Please provide an improved version that maintains all requirements while being more engaging and effective. Return only the improved prompt without any explanation or meta-commentary.`
}

/**
 * Analyzes what improvements were made to the prompt
 */
function analyzeImprovements(original: string, improved: string): {
  clarityEnhancements: number
  structureImprovements: number
  guidanceAdded: boolean
} {
  const originalLength = original.length
  const improvedLength = improved.length

  // Simple heuristics for analyzing improvements
  const clarityEnhancements = Math.abs(improvedLength - originalLength) > originalLength * 0.1 ? 1 : 0
  const structureImprovements = (improved.match(/#+|•|-|\d+\./g) || []).length >
                               (original.match(/#+|•|-|\d+\./g) || []).length ? 1 : 0
  const guidanceAdded = improved.toLowerCase().includes('step') ||
                       improved.toLowerCase().includes('approach') ||
                       improved.toLowerCase().includes('methodology')

  return {
    clarityEnhancements,
    structureImprovements,
    guidanceAdded
  }
}

/**
 * Basic prompt enhancement as fallback when AI improvement fails
 */
function enhancePromptBasic(prompt: string): string {
  // Add some basic enhancements
  let enhanced = prompt

  // Make the opening more engaging
  enhanced = enhanced.replace(
    'You are an AI assistant tasked with helping complete the following task:',
    'You are an AI assistant ready to help successfully complete the following task. Let\'s work together to achieve the best possible outcome:'
  )

  // Add encouragement at the end
  if (!enhanced.includes('Let me know if you need any clarification')) {
    enhanced += '\n\nLet me know if you need any clarification or have questions about any aspect of this task. I\'m here to ensure we deliver excellent results!'
  }

  return enhanced
}

/**
 * Quick check if a task prompt would benefit from AI improvement
 */
export function shouldImprovePrompt(task: TaskData): boolean {
  const basicPrompt = generateBasicPrompt(task)

  // Check for signs that improvement would be beneficial
  const hasMinimalContent = basicPrompt.length < 200
  const lacksStructure = !basicPrompt.includes('##') && !basicPrompt.includes('- ')
  const hasGenericLanguage = basicPrompt.includes('Please specify') ||
                            basicPrompt.includes('Not specified')

  return hasMinimalContent || lacksStructure || hasGenericLanguage
}

/**
 * Estimate prompt improvement processing time based on prompt complexity
 */
export function estimateImprovementTime(prompt: string): number {
  const words = prompt.split(/\s+/).length
  // Rough estimate: ~2-4 seconds for every 100 words
  return Math.max(2000, Math.min(10000, words * 25))
}
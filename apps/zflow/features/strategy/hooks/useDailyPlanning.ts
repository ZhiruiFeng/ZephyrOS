import { useState, useCallback, useMemo } from 'react'
import useSWR from 'swr'
import { memoriesApi } from '@/lib/api/memories-api'
import { strategyApi } from '../api/strategy-api'
import type { StrategyTask, StrategyMemory } from '@/strategy'

// =====================================================
// Daily Planning Hook
// =====================================================

export interface DailyPlan {
  id: string
  date: string
  planMemory?: StrategyMemory
  adventureMemory?: StrategyMemory
  priorityTasks: StrategyTask[]
  completionRate: number
  energyLevel?: 'low' | 'medium' | 'high'
  dailyIntention?: string
}

export interface DailyPlanningForm {
  dailyIntention: string
  priorityTaskIds: string[]
  energyLevel: 'low' | 'medium' | 'high'
  dailyAdventure?: string
  createAdventureMemory: boolean
}

export interface DailyReflectionData {
  planMemory?: StrategyMemory
  priorityTasks: StrategyTask[]
  completedTasks: StrategyTask[]
  completionRate: number
}

export function useDailyPlanning(date?: string) {
  const targetDate = date || new Date().toISOString().split('T')[0]
  const [isLoading, setIsLoading] = useState(false)

  // Fetch today's daily plan
  const { data: dailyPlan, error, mutate } = useSWR(
    `daily-plan-${targetDate}`,
    () => getDailyPlan(targetDate),
    {
      revalidateOnFocus: false,
      refreshInterval: 300000, // 5 minutes
    }
  )

  const getDailyPlan = async (planDate: string): Promise<DailyPlan | null> => {
    try {
      // Get planning memories for the date
      const planningResult = await memoriesApi.search({
        tags: ['daily-planning'],
        date_from: planDate,
        date_to: planDate,
        limit: 1
      })

      if (planningResult.memories.length === 0) {
        return null
      }

      const planMemory = planningResult.memories[0] as StrategyMemory

      // Get adventure memory if it exists
      const adventureResult = await memoriesApi.search({
        tags: ['daily-adventure'],
        date_from: planDate,
        date_to: planDate,
        limit: 1
      })

      const adventureMemory = adventureResult.memories.length > 0
        ? adventureResult.memories[0] as StrategyMemory
        : undefined

      // Get anchored priority tasks
      const anchors = await memoriesApi.getAnchors(planMemory.id, {
        relation_type: 'about',
        anchor_item_type: 'task'
      })

      // Get task details
      const taskIds = anchors.map(anchor => anchor.anchor_item_id)
      const allTasks = await strategyApi.getStrategyTasks()
      const priorityTasks = Array.isArray(allTasks)
        ? allTasks.filter((task: any) => taskIds.includes(task.task_id || task.id))
        : []

      // Calculate completion rate
      const completedTasks = priorityTasks.filter((task: any) => task.status === 'completed')
      const completionRate = priorityTasks.length > 0
        ? Math.round((completedTasks.length / priorityTasks.length) * 100)
        : 0

      // Extract metadata from plan content
      const planContent = planMemory.note || planMemory.context || ''
      const energyMatch = planContent.match(/ENERGY LEVEL: (\w+)/i)
      const energyLevel = energyMatch ? energyMatch[1].toLowerCase() as 'low' | 'medium' | 'high' : undefined
      const intentionMatch = planContent.match(/DAILY INTENTION:\s*\n([^\n]+)/i)
      const dailyIntention = intentionMatch ? intentionMatch[1].trim() : undefined

      return {
        id: planMemory.id,
        date: planDate,
        planMemory,
        adventureMemory,
        priorityTasks,
        completionRate,
        energyLevel,
        dailyIntention
      }
    } catch (error) {
      console.warn('Failed to load daily plan:', error)
      return null
    }
  }

  const createDailyPlan = useCallback(async (
    formData: DailyPlanningForm,
    seasonId?: string,
    availableTasks: StrategyTask[] = []
  ) => {
    setIsLoading(true)
    try {
      const priorityTasks = availableTasks.filter(task =>
        formData.priorityTaskIds.includes(task.id)
      )

      const today = new Date().toLocaleDateString()

      // Create daily plan content
      const planContent = `Daily Plan - ${today}

DAILY INTENTION:
${formData.dailyIntention}

TOP 3 PRIORITIES:
${priorityTasks.map((task, index) => `${index + 1}. ${task.title}`).join('\\n')}

ENERGY LEVEL: ${formData.energyLevel.toUpperCase()}${formData.dailyAdventure ? `

DAILY ADVENTURE:
${formData.dailyAdventure}` : ''}`

      // Create the daily plan strategic memory
      const dailyPlanMemory = await strategyApi.createStrategyMemory({
        title: `Daily Plan - ${today}`,
        content: planContent,
        memory_type: 'planning_note',
        importance_level: 'medium',
        is_highlight: false,
        is_shareable: false,
        season_id: seasonId,
        tags: ['daily-planning', 'morning-ritual', ...(formData.createAdventureMemory ? ['daily-adventure'] : [])],
        context_data: {
          actionable: true,
          source: 'daily_planning_modal',
          energy_level: formData.energyLevel,
          priority_task_count: priorityTasks.length
        }
      })

      // Create memory anchors for priority tasks
      if (priorityTasks.length > 0 && dailyPlanMemory && (dailyPlanMemory as any).id) {
        for (const task of priorityTasks) {
          try {
            await memoriesApi.addAnchor((dailyPlanMemory as any).id, {
              anchor_item_id: task.id,
              relation_type: 'about',
              weight: 2.0,
              notes: `Priority task for ${today}`
            })
          } catch (anchorError) {
            console.warn('Failed to create anchor for task:', task.id, anchorError)
          }
        }
      }

      // Create separate adventure memory if requested
      let adventureMemory = null
      if (formData.createAdventureMemory && formData.dailyAdventure?.trim()) {
        try {
          adventureMemory = await memoriesApi.create({
            title: `Daily Adventure - ${today}`,
            note: formData.dailyAdventure,
            memory_type: 'insight',
            importance_level: 'high',
            is_highlight: true,
            tags: ['daily-adventure', 'goal', 'intention'],
          })

          // Link adventure memory to plan memory
          if (adventureMemory.id && (dailyPlanMemory as any).id) {
            await memoriesApi.addAnchor(adventureMemory.id, {
              anchor_item_id: (dailyPlanMemory as any).id,
              relation_type: 'context_of',
              weight: 3.0,
              notes: `Main adventure goal for ${today}`
            })
          }
        } catch (adventureError) {
          console.warn('Failed to create adventure memory:', adventureError)
        }
      }

      // Refresh the plan
      await mutate()

      return {
        planMemory: dailyPlanMemory,
        adventureMemory,
        priorityTasks
      }
    } catch (error) {
      console.error('Error creating daily plan:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [mutate])

  const getDailyReflectionData = useCallback(async (
    reflectionDate?: string
  ): Promise<DailyReflectionData> => {
    const date = reflectionDate || new Date().toISOString().split('T')[0]

    try {
      // Get today's plan
      const plan = await getDailyPlan(date)

      if (!plan) {
        return {
          priorityTasks: [],
          completedTasks: [],
          completionRate: 0
        }
      }

      const completedTasks = plan.priorityTasks.filter(task => task.status === 'completed')

      return {
        planMemory: plan.planMemory,
        priorityTasks: plan.priorityTasks,
        completedTasks,
        completionRate: plan.completionRate
      }
    } catch (error) {
      console.warn('Failed to get reflection data:', error)
      return {
        priorityTasks: [],
        completedTasks: [],
        completionRate: 0
      }
    }
  }, [])

  return {
    dailyPlan,
    loading: isLoading,
    error: error?.message || null,
    createDailyPlan,
    getDailyReflectionData,
    refetch: () => mutate()
  }
}

// =====================================================
// Weekly Planning Summary Hook
// =====================================================

export function useWeeklyPlanningSummary(weekStart?: string) {
  const startDate = weekStart || getWeekStart(new Date()).toISOString().split('T')[0]

  const { data: weeklyData, error, isLoading } = useSWR(
    `weekly-planning-${startDate}`,
    () => getWeeklyPlanningSummary(startDate),
    {
      revalidateOnFocus: false,
      refreshInterval: 600000, // 10 minutes
    }
  )

  const getWeeklyPlanningSummary = async (week: string) => {
    try {
      const endDate = new Date(week)
      endDate.setDate(endDate.getDate() + 6)
      const endDateStr = endDate.toISOString().split('T')[0]

      // Get all planning memories for the week
      const planningResult = await memoriesApi.search({
        tags: ['daily-planning'],
        date_from: week,
        date_to: endDateStr,
        limit: 7
      })

      // Get all adventure memories for the week
      const adventureResult = await memoriesApi.search({
        tags: ['daily-adventure'],
        date_from: week,
        date_to: endDateStr,
        limit: 7
      })

      const plans = planningResult.memories
      const adventures = adventureResult.memories

      // Calculate weekly metrics
      const totalDaysPlanned = plans.length
      const totalAdventures = adventures.length

      return {
        weekStart: week,
        totalDaysPlanned,
        totalAdventures,
        planningMemories: plans,
        adventureMemories: adventures,
        averagePlanningConsistency: totalDaysPlanned / 7 * 100
      }
    } catch (error) {
      console.warn('Failed to load weekly planning summary:', error)
      return null
    }
  }

  return {
    weeklyData,
    loading: isLoading,
    error: error?.message || null
  }
}

// =====================================================
// Utility Functions
// =====================================================

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day
  return new Date(d.setDate(diff))
}

export function formatDailyPlanContent(
  intention: string,
  priorityTasks: StrategyTask[],
  energyLevel: 'low' | 'medium' | 'high',
  adventure?: string
): string {
  const today = new Date().toLocaleDateString()

  return `Daily Plan - ${today}

DAILY INTENTION:
${intention}

TOP 3 PRIORITIES:
${priorityTasks.map((task, index) => `${index + 1}. ${task.title}`).join('\\n')}

ENERGY LEVEL: ${energyLevel.toUpperCase()}${adventure ? `

DAILY ADVENTURE:
${adventure}` : ''}`
}
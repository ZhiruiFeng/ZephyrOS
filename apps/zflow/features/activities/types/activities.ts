// Activity Feature Types

export interface ActivityFormValue {
  title: string
  description: string
  activity_type: string
  categoryId: string
}

export const ACTIVITY_TYPES = [
  { value: 'exercise', labelKey: 'typeExercise', icon: '🏃‍♂️' },
  { value: 'meditation', labelKey: 'typeMeditation', icon: '🧘‍♀️' },
  { value: 'reading', labelKey: 'typeReading', icon: '📚' },
  { value: 'music', labelKey: 'typeMusic', icon: '🎵' },
  { value: 'socializing', labelKey: 'typeSocial', icon: '👥' },
  { value: 'gaming', labelKey: 'typeGaming', icon: '🎮' },
  { value: 'walking', labelKey: 'typeWalking', icon: '🚶‍♀️' },
  { value: 'cooking', labelKey: 'typeCooking', icon: '👨‍🍳' },
  { value: 'rest', labelKey: 'typeRest', icon: '😴' },
  { value: 'creative', labelKey: 'typeCreative', icon: '🎨' },
  { value: 'learning', labelKey: 'typeLearning', icon: '📖' },
  { value: 'other', labelKey: 'typeOther', icon: '✨' },
] as const

export type ActivityType = typeof ACTIVITY_TYPES[number]['value']
export type ActivityStatus = 'active' | 'completed' | 'cancelled'

export interface Activity {
  id: string
  title: string
  description?: string
  activity_type: ActivityType
  status: ActivityStatus
  category_id?: string
  created_at: string
  updated_at: string
  completed_at?: string
}

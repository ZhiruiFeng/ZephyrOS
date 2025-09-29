// Activity Analytics Types
export interface ActivityStats {
  total_activities: number;
  completion_rate: number;
  average_satisfaction: number;
  mood_improvement: {
    average_change: number;
    positive_sessions: number;
    negative_sessions: number;
  };
  energy_analysis: {
    average_before: number;
    average_after: number;
    energy_gain: number;
  };
  by_type: Record<string, {
    count: number;
    avg_satisfaction: number;
    avg_duration: number;
    completion_rate: number;
  }>;
  trends: {
    satisfaction_trend: number; // positive = improving
    frequency_trend: number;
    duration_trend: number;
  };
}

export interface MoodAnalysis {
  overall_improvement: number;
  best_activities: Array<{
    activity_type: string;
    improvement_score: number;
    session_count: number;
  }>;
  mood_patterns: Array<{
    time_period: string;
    average_before: number;
    average_after: number;
    activity_count: number;
  }>;
}

export interface ActivityInsight {
  type: 'positive' | 'negative' | 'neutral' | 'recommendation';
  title: string;
  description: string;
  confidence: number;
  supporting_data: Record<string, any>;
  action_suggestions?: string[];
}
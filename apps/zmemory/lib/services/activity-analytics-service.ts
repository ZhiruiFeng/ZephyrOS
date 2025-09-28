import { BaseServiceImpl } from './base-service';
import type {
  ServiceContext,
  ServiceDependencies,
  ServiceResult,
  ActivityStats,
  MoodAnalysis,
  ActivityInsight
} from './types';
import type { Activity, ActivityFilterParams } from '@/database';

export interface ActivityAnalyticsService {
  calculateActivityStats(dateRange?: { from: string; to: string }): Promise<ServiceResult<ActivityStats>>;
  analyzeMoodPatterns(dateRange?: { from: string; to: string }): Promise<ServiceResult<MoodAnalysis>>;
  generateInsights(dateRange?: { from: string; to: string }): Promise<ServiceResult<ActivityInsight[]>>;
  calculateSatisfactionTrends(period: 'week' | 'month' | 'quarter'): Promise<ServiceResult<number[]>>;
  findBestActivitiesForMood(targetMood: number): Promise<ServiceResult<Array<{ activity_type: string; effectiveness: number }>>>;
}

export class ActivityAnalyticsServiceImpl extends BaseServiceImpl implements ActivityAnalyticsService {

  constructor(context: ServiceContext, dependencies: ServiceDependencies) {
    super(context, dependencies);
  }

  /**
   * Calculate comprehensive activity statistics
   */
  async calculateActivityStats(dateRange?: { from: string; to: string }): Promise<ServiceResult<ActivityStats>> {
    return this.safeOperation(async () => {
      this.validateUserAccess();

      const filters: ActivityFilterParams = {
        limit: 1000 // Get all activities for analysis
      };

      if (dateRange) {
        this.validateDateRange(dateRange.from, dateRange.to);
        filters.start_date = dateRange.from;
        filters.end_date = dateRange.to;
      }

      const { data: activities } = await this.dependencies.activityRepository.findActivitiesAdvanced(
        this.context.userId,
        filters
      );

      if (!activities) {
        throw new Error('Failed to fetch activities for statistics');
      }

      const stats = this.calculateBasicStats(activities);
      const moodStats = this.calculateMoodStats(activities);
      const energyStats = this.calculateEnergyStats(activities);
      const typeStats = this.calculateTypeStats(activities);
      const trends = this.calculateTrends(activities);

      const result: ActivityStats = {
        total_activities: stats.total,
        completion_rate: stats.completionRate,
        average_satisfaction: stats.avgSatisfaction,
        mood_improvement: moodStats,
        energy_analysis: energyStats,
        by_type: typeStats,
        trends
      };

      this.logOperation('info', 'calculateActivityStats', {
        dateRange,
        totalActivities: result.total_activities,
        completionRate: result.completion_rate
      });

      return result;
    });
  }

  /**
   * Analyze mood patterns and improvements
   */
  async analyzeMoodPatterns(dateRange?: { from: string; to: string }): Promise<ServiceResult<MoodAnalysis>> {
    return this.safeOperation(async () => {
      this.validateUserAccess();

      const filters: ActivityFilterParams = {
        limit: 1000
      };

      if (dateRange) {
        this.validateDateRange(dateRange.from, dateRange.to);
        filters.start_date = dateRange.from;
        filters.end_date = dateRange.to;
      }

      const { data: activities } = await this.dependencies.activityRepository.findActivitiesAdvanced(
        this.context.userId,
        filters
      );

      if (!activities) {
        throw new Error('Failed to fetch activities for mood analysis');
      }

      // Filter activities with valid mood data
      const moodActivities = activities.filter(activity =>
        activity.mood_before !== null && activity.mood_after !== null
      );

      if (moodActivities.length === 0) {
        return {
          overall_improvement: 0,
          best_activities: [],
          mood_patterns: []
        };
      }

      const overallImprovement = this.calculateOverallMoodImprovement(moodActivities);
      const bestActivities = this.findBestActivitiesForMoodImprovement(moodActivities);
      const moodPatterns = this.analyzeMoodPatternsByTime(moodActivities);

      const result: MoodAnalysis = {
        overall_improvement: overallImprovement,
        best_activities: bestActivities,
        mood_patterns: moodPatterns
      };

      this.logOperation('info', 'analyzeMoodPatterns', {
        dateRange,
        activitiesAnalyzed: moodActivities.length,
        overallImprovement
      });

      return result;
    });
  }

  /**
   * Generate actionable insights from activity data
   */
  async generateInsights(dateRange?: { from: string; to: string }): Promise<ServiceResult<ActivityInsight[]>> {
    return this.safeOperation(async () => {
      this.validateUserAccess();

      const filters: ActivityFilterParams = {
        limit: 1000
      };

      if (dateRange) {
        this.validateDateRange(dateRange.from, dateRange.to);
        filters.start_date = dateRange.from;
        filters.end_date = dateRange.to;
      }

      const { data: activities } = await this.dependencies.activityRepository.findActivitiesAdvanced(
        this.context.userId,
        filters
      );

      if (!activities) {
        throw new Error('Failed to fetch activities for insights');
      }

      const insights: ActivityInsight[] = [];

      // Insight 1: Most effective activities for mood improvement
      const moodInsights = this.generateMoodInsights(activities);
      insights.push(...moodInsights);

      // Insight 2: Energy patterns and recommendations
      const energyInsights = this.generateEnergyInsights(activities);
      insights.push(...energyInsights);

      // Insight 3: Completion rate insights
      const completionInsights = this.generateCompletionInsights(activities);
      insights.push(...completionInsights);

      // Insight 4: Time-based patterns
      const timeInsights = this.generateTimeBasedInsights(activities);
      insights.push(...timeInsights);

      // Sort by confidence and return top insights
      insights.sort((a, b) => b.confidence - a.confidence);

      this.logOperation('info', 'generateInsights', {
        dateRange,
        totalInsights: insights.length,
        activitiesAnalyzed: activities.length
      });

      return insights.slice(0, 10); // Return top 10 insights
    });
  }

  /**
   * Calculate satisfaction trends over time
   */
  async calculateSatisfactionTrends(period: 'week' | 'month' | 'quarter'): Promise<ServiceResult<number[]>> {
    return this.safeOperation(async () => {
      this.validateUserAccess();

      const periodDays = { week: 7, month: 30, quarter: 90 }[period];
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - (periodDays * 8)); // Get extra data for trend calculation

      const filters: ActivityFilterParams = {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        limit: 1000
      };

      const { data: activities } = await this.dependencies.activityRepository.findActivitiesAdvanced(
        this.context.userId,
        filters
      );

      if (!activities) {
        throw new Error('Failed to fetch activities for trend analysis');
      }

      const trends = this.calculatePeriodTrends(activities, period, 8); // 8 periods

      this.logOperation('info', 'calculateSatisfactionTrends', {
        period,
        periodsCalculated: trends.length,
        activitiesAnalyzed: activities.length
      });

      return trends;
    });
  }

  /**
   * Find best activities for improving to target mood
   */
  async findBestActivitiesForMood(targetMood: number): Promise<ServiceResult<Array<{ activity_type: string; effectiveness: number }>>> {
    return this.safeOperation(async () => {
      this.validateUserAccess();
      this.validateNumericRange(targetMood, 'targetMood', 1, 10);

      // Get activities from last 6 months for better analysis
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(endDate.getMonth() - 6);

      const filters: ActivityFilterParams = {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        limit: 1000
      };

      const { data: activities } = await this.dependencies.activityRepository.findActivitiesAdvanced(
        this.context.userId,
        filters
      );

      if (!activities) {
        throw new Error('Failed to fetch activities for mood targeting');
      }

      const recommendations = this.calculateMoodTargetingEffectiveness(activities, targetMood);

      this.logOperation('info', 'findBestActivitiesForMood', {
        targetMood,
        recommendationsGenerated: recommendations.length,
        activitiesAnalyzed: activities.length
      });

      return recommendations.slice(0, 5); // Top 5 recommendations
    });
  }

  // Private helper methods for calculations

  private calculateBasicStats(activities: Activity[]) {
    const total = activities.length;
    const completed = activities.filter(a => a.status === 'completed').length;
    const satisfactionRatings = activities
      .filter(a => a.satisfaction_rating !== null)
      .map(a => a.satisfaction_rating!);

    return {
      total,
      completionRate: total > 0 ? completed / total : 0,
      avgSatisfaction: satisfactionRatings.length > 0
        ? satisfactionRatings.reduce((sum, rating) => sum + rating, 0) / satisfactionRatings.length
        : 0
    };
  }

  private calculateMoodStats(activities: Activity[]) {
    const moodActivities = activities.filter(a =>
      a.mood_before !== null && a.mood_after !== null
    );

    if (moodActivities.length === 0) {
      return {
        average_change: 0,
        positive_sessions: 0,
        negative_sessions: 0
      };
    }

    const moodChanges = moodActivities.map(a => a.mood_after! - a.mood_before!);
    const averageChange = moodChanges.reduce((sum, change) => sum + change, 0) / moodChanges.length;
    const positiveSessions = moodChanges.filter(change => change > 0).length;
    const negativeSessions = moodChanges.filter(change => change < 0).length;

    return {
      average_change: averageChange,
      positive_sessions: positiveSessions,
      negative_sessions: negativeSessions
    };
  }

  private calculateEnergyStats(activities: Activity[]) {
    const energyActivities = activities.filter(a =>
      a.energy_before !== null && a.energy_after !== null
    );

    if (energyActivities.length === 0) {
      return {
        average_before: 0,
        average_after: 0,
        energy_gain: 0
      };
    }

    const avgBefore = energyActivities.reduce((sum, a) => sum + a.energy_before!, 0) / energyActivities.length;
    const avgAfter = energyActivities.reduce((sum, a) => sum + a.energy_after!, 0) / energyActivities.length;

    return {
      average_before: avgBefore,
      average_after: avgAfter,
      energy_gain: avgAfter - avgBefore
    };
  }

  private calculateTypeStats(activities: Activity[]) {
    const typeGroups = activities.reduce((groups, activity) => {
      const type = activity.activity_type;
      if (!groups[type]) {
        groups[type] = {
          activities: [],
          count: 0,
          avg_satisfaction: 0,
          avg_duration: 0,
          completion_rate: 0
        };
      }
      groups[type].activities.push(activity);
      groups[type].count++;
      return groups;
    }, {} as Record<string, { activities: Activity[]; count: number; avg_satisfaction: number; avg_duration: number; completion_rate: number }>);

    // Calculate stats for each type
    Object.keys(typeGroups).forEach(type => {
      const group = typeGroups[type];
      const activities = group.activities;

      // Satisfaction
      const satisfactionRatings = activities
        .filter(a => a.satisfaction_rating !== null)
        .map(a => a.satisfaction_rating!);
      group.avg_satisfaction = satisfactionRatings.length > 0
        ? satisfactionRatings.reduce((sum, rating) => sum + rating, 0) / satisfactionRatings.length
        : 0;

      // Duration
      const durations = activities
        .filter(a => a.actual_duration !== null)
        .map(a => a.actual_duration!);
      group.avg_duration = durations.length > 0
        ? durations.reduce((sum, duration) => sum + duration, 0) / durations.length
        : 0;

      // Completion rate
      const completed = activities.filter(a => a.status === 'completed').length;
      group.completion_rate = activities.length > 0 ? completed / activities.length : 0;

      // Remove the activities array to clean up the result
      delete (group as any).activities;
    });

    return typeGroups;
  }

  private calculateTrends(activities: Activity[]) {
    // Sort activities by date
    const sortedActivities = activities
      .filter(a => a.started_at)
      .sort((a, b) => new Date(a.started_at!).getTime() - new Date(b.started_at!).getTime());

    if (sortedActivities.length < 2) {
      return {
        satisfaction_trend: 0,
        frequency_trend: 0,
        duration_trend: 0
      };
    }

    // Split into first and second half to calculate trends
    const midpoint = Math.floor(sortedActivities.length / 2);
    const firstHalf = sortedActivities.slice(0, midpoint);
    const secondHalf = sortedActivities.slice(midpoint);

    // Satisfaction trend
    const firstHalfSatisfaction = this.getAverageSatisfaction(firstHalf);
    const secondHalfSatisfaction = this.getAverageSatisfaction(secondHalf);
    const satisfactionTrend = secondHalfSatisfaction - firstHalfSatisfaction;

    // Frequency trend (activities per day)
    const firstHalfDays = this.getDaySpan(firstHalf);
    const secondHalfDays = this.getDaySpan(secondHalf);
    const firstHalfFreq = firstHalfDays > 0 ? firstHalf.length / firstHalfDays : 0;
    const secondHalfFreq = secondHalfDays > 0 ? secondHalf.length / secondHalfDays : 0;
    const frequencyTrend = secondHalfFreq - firstHalfFreq;

    // Duration trend
    const firstHalfDuration = this.getAverageDuration(firstHalf);
    const secondHalfDuration = this.getAverageDuration(secondHalf);
    const durationTrend = secondHalfDuration - firstHalfDuration;

    return {
      satisfaction_trend: satisfactionTrend,
      frequency_trend: frequencyTrend,
      duration_trend: durationTrend
    };
  }

  private calculateOverallMoodImprovement(activities: Activity[]): number {
    const moodChanges = activities.map(a => a.mood_after! - a.mood_before!);
    return moodChanges.reduce((sum, change) => sum + change, 0) / moodChanges.length;
  }

  private findBestActivitiesForMoodImprovement(activities: Activity[]) {
    const typeGroups = activities.reduce((groups, activity) => {
      const type = activity.activity_type;
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(activity.mood_after! - activity.mood_before!);
      return groups;
    }, {} as Record<string, number[]>);

    return Object.entries(typeGroups)
      .map(([type, improvements]) => ({
        activity_type: type,
        improvement_score: improvements.reduce((sum, imp) => sum + imp, 0) / improvements.length,
        session_count: improvements.length
      }))
      .filter(item => item.session_count >= 2) // Need at least 2 sessions for reliability
      .sort((a, b) => b.improvement_score - a.improvement_score)
      .slice(0, 5);
  }

  private analyzeMoodPatternsByTime(activities: Activity[]) {
    // Group by hour of day
    const hourGroups = activities.reduce((groups, activity) => {
      if (!activity.started_at) return groups;

      const hour = new Date(activity.started_at).getHours();
      const period = hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening';

      if (!groups[period]) {
        groups[period] = [];
      }
      groups[period].push({
        before: activity.mood_before!,
        after: activity.mood_after!
      });
      return groups;
    }, {} as Record<string, Array<{ before: number; after: number }>>);

    return Object.entries(hourGroups).map(([period, moods]) => ({
      time_period: period,
      average_before: moods.reduce((sum, m) => sum + m.before, 0) / moods.length,
      average_after: moods.reduce((sum, m) => sum + m.after, 0) / moods.length,
      activity_count: moods.length
    }));
  }

  private generateMoodInsights(activities: Activity[]): ActivityInsight[] {
    const insights: ActivityInsight[] = [];

    const moodActivities = activities.filter(a =>
      a.mood_before !== null && a.mood_after !== null
    );

    if (moodActivities.length > 0) {
      const bestActivities = this.findBestActivitiesForMoodImprovement(moodActivities);

      if (bestActivities.length > 0 && bestActivities[0].improvement_score > 0.5) {
        insights.push({
          type: 'positive',
          title: 'Mood Booster Identified',
          description: `${bestActivities[0].activity_type} activities consistently improve your mood by an average of ${bestActivities[0].improvement_score.toFixed(1)} points.`,
          confidence: Math.min(0.9, bestActivities[0].session_count / 10),
          supporting_data: { best_activity: bestActivities[0] },
          action_suggestions: [`Consider scheduling more ${bestActivities[0].activity_type} activities when feeling low`]
        });
      }
    }

    return insights;
  }

  private generateEnergyInsights(activities: Activity[]): ActivityInsight[] {
    const insights: ActivityInsight[] = [];

    const energyActivities = activities.filter(a =>
      a.energy_before !== null && a.energy_after !== null
    );

    if (energyActivities.length > 0) {
      const energyGain = energyActivities.reduce((sum, a) => sum + (a.energy_after! - a.energy_before!), 0) / energyActivities.length;

      if (energyGain < -0.5) {
        insights.push({
          type: 'negative',
          title: 'Energy Drain Pattern',
          description: `Your activities are consistently draining energy by an average of ${Math.abs(energyGain).toFixed(1)} points.`,
          confidence: 0.8,
          supporting_data: { average_energy_change: energyGain },
          action_suggestions: ['Consider adding more energizing activities to your routine', 'Review timing of activities that drain energy']
        });
      }
    }

    return insights;
  }

  private generateCompletionInsights(activities: Activity[]): ActivityInsight[] {
    const insights: ActivityInsight[] = [];

    const completionRate = activities.filter(a => a.status === 'completed').length / activities.length;

    if (completionRate < 0.7) {
      insights.push({
        type: 'recommendation',
        title: 'Low Completion Rate',
        description: `You're completing only ${(completionRate * 100).toFixed(0)}% of planned activities.`,
        confidence: 0.9,
        supporting_data: { completion_rate: completionRate },
        action_suggestions: ['Consider setting more realistic activity durations', 'Break larger activities into smaller, manageable chunks']
      });
    }

    return insights;
  }

  private generateTimeBasedInsights(activities: Activity[]): ActivityInsight[] {
    const insights: ActivityInsight[] = [];

    // Analyze time patterns
    const timeActivities = activities.filter(a => a.started_at);
    if (timeActivities.length > 0) {
      const hourCounts = timeActivities.reduce((counts, activity) => {
        const hour = new Date(activity.started_at!).getHours();
        counts[hour] = (counts[hour] || 0) + 1;
        return counts;
      }, {} as Record<number, number>);

      const peakHour = Object.entries(hourCounts)
        .sort(([,a], [,b]) => b - a)[0];

      if (peakHour && parseInt(peakHour[0]) < 6) {
        insights.push({
          type: 'neutral',
          title: 'Late Night Activity Pattern',
          description: `Your most active hour is ${peakHour[0]}:00, which may impact sleep quality.`,
          confidence: 0.7,
          supporting_data: { peak_hour: parseInt(peakHour[0]), activity_count: peakHour[1] },
          action_suggestions: ['Consider shifting activities to earlier hours for better sleep hygiene']
        });
      }
    }

    return insights;
  }

  private calculatePeriodTrends(activities: Activity[], period: 'week' | 'month' | 'quarter', periods: number): number[] {
    const periodDays = { week: 7, month: 30, quarter: 90 }[period];
    const trends: number[] = [];
    const endDate = new Date();

    for (let i = periods - 1; i >= 0; i--) {
      const periodEnd = new Date(endDate);
      periodEnd.setDate(endDate.getDate() - (i * periodDays));
      const periodStart = new Date(periodEnd);
      periodStart.setDate(periodEnd.getDate() - periodDays);

      const periodActivities = activities.filter(a => {
        if (!a.started_at) return false;
        const activityDate = new Date(a.started_at);
        return activityDate >= periodStart && activityDate <= periodEnd;
      });

      const avgSatisfaction = this.getAverageSatisfaction(periodActivities);
      trends.push(avgSatisfaction);
    }

    return trends;
  }

  private calculateMoodTargetingEffectiveness(activities: Activity[], targetMood: number) {
    const moodActivities = activities.filter(a =>
      a.mood_before !== null && a.mood_after !== null
    );

    const typeGroups = moodActivities.reduce((groups, activity) => {
      const type = activity.activity_type;
      if (!groups[type]) {
        groups[type] = [];
      }

      // Calculate how effective this activity is at reaching target mood
      const startingDistance = Math.abs(activity.mood_before! - targetMood);
      const endingDistance = Math.abs(activity.mood_after! - targetMood);
      const effectiveness = startingDistance > 0 ? (startingDistance - endingDistance) / startingDistance : 0;

      groups[type].push(effectiveness);
      return groups;
    }, {} as Record<string, number[]>);

    return Object.entries(typeGroups)
      .map(([type, effectivenessScores]) => ({
        activity_type: type,
        effectiveness: effectivenessScores.reduce((sum, score) => sum + score, 0) / effectivenessScores.length
      }))
      .filter(item => item.effectiveness > 0)
      .sort((a, b) => b.effectiveness - a.effectiveness);
  }

  // Utility methods
  private getAverageSatisfaction(activities: Activity[]): number {
    const ratings = activities
      .filter(a => a.satisfaction_rating !== null)
      .map(a => a.satisfaction_rating!);
    return ratings.length > 0 ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : 0;
  }

  private getAverageDuration(activities: Activity[]): number {
    const durations = activities
      .filter(a => a.actual_duration !== null)
      .map(a => a.actual_duration!);
    return durations.length > 0 ? durations.reduce((sum, duration) => sum + duration, 0) / durations.length : 0;
  }

  private getDaySpan(activities: Activity[]): number {
    if (activities.length === 0) return 0;

    const dates = activities
      .filter(a => a.started_at)
      .map(a => new Date(a.started_at!).getTime())
      .sort((a, b) => a - b);

    if (dates.length === 0) return 0;

    const daysDiff = (dates[dates.length - 1] - dates[0]) / (1000 * 60 * 60 * 24);
    return Math.max(1, daysDiff); // At least 1 day
  }
}
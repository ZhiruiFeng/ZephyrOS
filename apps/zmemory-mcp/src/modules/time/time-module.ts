import { AxiosInstance } from 'axios';
import {
  GetDayTimeEntriesParams,
  GetTaskTimeEntriesParams,
  StartTaskTimerParams,
  StopTaskTimerParams,
  TimeEntry,
  DayTimeSpending,
  OAuthError,
  AuthState,
} from '../../types.js';

export class TimeModule {
  constructor(
    private client: AxiosInstance,
    private authState: AuthState
  ) {}

  /**
   * Get the server's timezone for API calls
   */
  private getServerTimezone(): string {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (error) {
      // Silently fallback to UTC to avoid JSON parsing issues in MCP
      return 'UTC';
    }
  }

  async getDayTimeEntries(params: GetDayTimeEntriesParams): Promise<DayTimeSpending> {
    if (!this.isAuthenticated()) {
      throw new OAuthError('需要认证', 'authentication_required', '请先进行OAuth认证');
    }

    // Build URL with timezone parameter
    const searchParams = new URLSearchParams({ date: params.date });
    const timezone = params.timezone || this.getServerTimezone();
    searchParams.set('timezone', timezone);
    const response = await this.client.get(`/api/time-entries/day?${searchParams.toString()}`);
    return this.processDayTimeEntries(response.data, params.date);
  }

  async getTaskTimeEntries(params: GetTaskTimeEntriesParams): Promise<TimeEntry[]> {
    if (!this.isAuthenticated()) {
      throw new OAuthError('需要认证', 'authentication_required', '请先进行OAuth认证');
    }

    const searchParams = new URLSearchParams();
    if (params.start_date) searchParams.set('start_date', params.start_date);
    if (params.end_date) searchParams.set('end_date', params.end_date);
    
    // Add timezone if date parameters are provided
    if (params.start_date || params.end_date) {
      const timezone = params.timezone || this.getServerTimezone();
      searchParams.set('timezone', timezone);
    }

    const response = await this.client.get(`/api/tasks/${params.task_id}/time-entries?${searchParams.toString()}`);
    return response.data;
  }

  async startTaskTimer(params: StartTaskTimerParams): Promise<TimeEntry> {
    if (!this.isAuthenticated()) {
      throw new OAuthError('需要认证', 'authentication_required', '请先进行OAuth认证');
    }

    const response = await this.client.post(`/api/tasks/${params.task_id}/timer/start`, {
      description: params.description,
    });
    return response.data;
  }

  async stopTaskTimer(params: StopTaskTimerParams): Promise<TimeEntry> {
    if (!this.isAuthenticated()) {
      throw new OAuthError('需要认证', 'authentication_required', '请先进行OAuth认证');
    }

    const response = await this.client.post(`/api/tasks/${params.task_id}/timer/stop`);
    return response.data;
  }

  async getRunningTimer(): Promise<TimeEntry | null> {
    if (!this.isAuthenticated()) {
      throw new OAuthError('需要认证', 'authentication_required', '请先进行OAuth认证');
    }

    try {
      const response = await this.client.get('/api/time-entries/running');
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null; // No running timer
      }
      throw error;
    }
  }

  private processDayTimeEntries(entries: TimeEntry[], date: string): DayTimeSpending {
    const taskBreakdown = new Map<string, { task_id: string; task_title: string; total_time: number; entries: TimeEntry[] }>();
    let totalTime = 0;

    entries.forEach(entry => {
      const duration = entry.duration || 0;
      totalTime += duration;

      if (!taskBreakdown.has(entry.task_id)) {
        taskBreakdown.set(entry.task_id, {
          task_id: entry.task_id,
          task_title: `Task ${entry.task_id}`, // Will be populated from task data if available
          total_time: 0,
          entries: [],
        });
      }

      const taskData = taskBreakdown.get(entry.task_id)!;
      taskData.total_time += duration;
      taskData.entries.push(entry);
    });

    return {
      date,
      total_time: totalTime,
      entries,
      task_breakdown: Array.from(taskBreakdown.values()),
    };
  }

  private isAuthenticated(): boolean {
    if (!this.authState.isAuthenticated || !this.authState.tokens) {
      return false;
    }

    if (this.authState.expiresAt && Date.now() >= this.authState.expiresAt) {
      return false;
    }

    return true;
  }
}
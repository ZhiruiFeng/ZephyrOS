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

    // Convert date and timezone to from/to parameters
    const timezone = params.timezone || this.getServerTimezone();
    const { from, to } = this.getDayBoundaries(params.date, timezone);

    // Build URL with from/to parameters (not date/timezone)
    const searchParams = new URLSearchParams({ from, to });
    const response = await this.client.get(`/api/time-entries/day?${searchParams.toString()}`);
    return this.processDayTimeEntries(response.data.entries || [], params.date);
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
      return response.data.entry || null; // 返回 entry 字段，而不是整个 response.data
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
      const duration = entry.duration_minutes || 0;
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

  /**
   * Get day boundaries (from/to) for a given date and timezone
   * Converts the specified date in the given timezone to UTC boundaries
   * Similar to ZFlow's getDayBoundariesInTimezone implementation
   */
  private getDayBoundaries(dateString: string, timezone: string): { from: string; to: string } {
    try {
      // Always use createDateInTimezone for consistent timezone handling
      const startOfDay = this.createDateInTimezone(dateString, timezone);
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1);
      
      return {
        from: startOfDay.toISOString(),
        to: endOfDay.toISOString()
      };
    } catch (error) {
      console.error('Error creating day boundaries:', error);
      
      // Fallback to local timezone
      const startOfDay = new Date(`${dateString}T00:00:00`);
      const endOfDay = new Date(`${dateString}T23:59:59.999`);
      
      return {
        from: startOfDay.toISOString(),
        to: endOfDay.toISOString()
      };
    }
  }

  /**
   * Create a date in a specific timezone at start of day (00:00:00)
   * This function creates a Date object that represents the start of day in the specified timezone
   * The returned Date object will have the correct UTC time that corresponds to 00:00:00 in the target timezone
   */
  private createDateInTimezone(dateString: string, timezone: string): Date {
    try {
      // Create a temporary date to get the right date components
      const tempDate = new Date(`${dateString}T12:00:00`); // Use noon to avoid DST issues
      
      // Get the date components
      const year = tempDate.getFullYear();
      const month = tempDate.getMonth();
      const day = tempDate.getDate();
      
      // Create date at start of day in local timezone first
      const localStartOfDay = new Date(year, month, day, 0, 0, 0, 0);
      
      if (timezone === this.getServerTimezone()) {
        // If the target timezone is the same as local, return as-is
        return localStartOfDay;
      }
      
      // For different timezones, we need to calculate the offset
      try {
        // Create formatter for the target timezone
        const formatter = new Intl.DateTimeFormat('en-CA', {
          timeZone: timezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        });
        
        // Format the target date in the target timezone
        const targetDate = new Date(`${dateString}T00:00:00`);
        const formattedInTarget = formatter.format(targetDate);
        
        // Parse the formatted string back to a Date object
        // This gives us the UTC time that corresponds to 00:00:00 in the target timezone
        const utcStartOfDay = new Date(formattedInTarget.replace(/(\d{4})-(\d{2})-(\d{2}), (\d{2}):(\d{2}):(\d{2})/, '$1-$2-$3T$4:$5:$6'));
        
        return utcStartOfDay;
      } catch (error) {
        console.warn('Timezone conversion failed, falling back to local timezone:', error);
        return localStartOfDay;
      }
    } catch (error) {
      console.warn('Date creation failed, falling back to simple parsing:', error);
      return new Date(`${dateString}T00:00:00`);
    }
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
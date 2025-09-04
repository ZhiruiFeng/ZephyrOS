/**
 * ZMemory API Client
 * 
 * 负责与ZMemory API通信的客户端
 */

import axios, { AxiosInstance } from 'axios';
import {
  Memory,
  MemoryStats,
  ZMemoryConfig,
  AddMemoryParams,
  SearchMemoriesParams,
  UpdateMemoryParams,
  CreateActivityParams,
  SearchActivitiesParams,
  UpdateActivityParams,
  ActivityStats,
  GetTimelineItemsParams,
  CreateTimelineItemParams,
  GetTimelineInsightsParams,
  SearchAcrossTimelineParams,
  OAuthTokens,
  UserInfo,
  AuthState,
  AuthenticateParams,
} from './types.js';
import { AuthModule } from './modules/auth/auth-module.js';
import { MemoryModule } from './modules/memory/memory-module.js';
import { SearchModule } from './modules/search/search-module.js';
import { StatsModule } from './modules/stats/stats-module.js';
import { TaskModule } from './modules/task/task-module.js';
import { TimeModule } from './modules/time/time-module.js';
import { CategoryModule } from './modules/category/category-module.js';
import { ActivityModule } from './modules/activity/activity-module.js';
import { TimelineModule } from './modules/timeline/timeline-module.js';
import { setupResponseInterceptor, setupRequestInterceptor } from './modules/utils/http-utils.js';

export class ZMemoryClient {
  private client: AxiosInstance;
  private authState: AuthState = { isAuthenticated: false };
  private authModule: AuthModule;
  private memoryModule: MemoryModule;
  private searchModule: SearchModule;
  private statsModule: StatsModule;
  private taskModule: TaskModule;
  private timeModule: TimeModule;
  private categoryModule: CategoryModule;
  private activityModule: ActivityModule;
  private timelineModule: TimelineModule;

  constructor(private config: ZMemoryConfig) {
    this.client = axios.create({
      baseURL: config.apiUrl,
      timeout: config.timeout || 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Setup interceptors using utility functions
    setupResponseInterceptor(this.client);
    setupRequestInterceptor(
      this.client,
      () => this.authState.tokens?.access_token,
      () => this.config.apiKey
    );

    // Initialize modules
    this.authModule = new AuthModule(this.client, this.config, this.authState);
    this.memoryModule = new MemoryModule(this.client, this.authState);
    this.searchModule = new SearchModule(this.client, this.authState);
    this.statsModule = new StatsModule(
      this.client,
      this.authState,
      (params) => this.searchModule.searchMemories(params)
    );
    this.taskModule = new TaskModule(this.client, this.authState);
    this.timeModule = new TimeModule(this.client, this.authState);
    this.categoryModule = new CategoryModule(this.client, this.authState);
    this.activityModule = new ActivityModule(this.client, this.authState);
    this.timelineModule = new TimelineModule(this.client, this.authState);
  }

  // Authentication methods - delegated to AuthModule
  async authenticate(params: AuthenticateParams): Promise<{ authUrl: string; state: string }> {
    return this.authModule.authenticate(params);
  }

  async exchangeCodeForToken(code: string, redirectUri: string, codeVerifier?: string): Promise<OAuthTokens> {
    return this.authModule.exchangeCodeForToken(code, redirectUri, codeVerifier);
  }

  async refreshToken(refreshToken: string): Promise<OAuthTokens> {
    return this.authModule.refreshToken(refreshToken);
  }

  async getUserInfo(): Promise<UserInfo> {
    return this.authModule.getUserInfo();
  }

  isAuthenticated(): boolean {
    return this.authModule.isAuthenticated();
  }

  getAuthState(): AuthState {
    return this.authModule.getAuthState();
  }

  setAccessToken(accessToken: string): void {
    this.authModule.setAccessToken(accessToken);
  }

  clearAuth(): void {
    this.authModule.clearAuth();
  }

  // Memory management methods - delegated to MemoryModule
  async addMemory(params: AddMemoryParams): Promise<Memory> {
    return this.memoryModule.addMemory(params);
  }

  // Search methods - delegated to SearchModule
  async searchMemories(params: Partial<SearchMemoriesParams> = {}): Promise<Memory[]> {
    return this.searchModule.searchMemories(params);
  }

  async getMemory(id: string): Promise<Memory> {
    return this.memoryModule.getMemory(id);
  }

  async updateMemory(params: UpdateMemoryParams): Promise<Memory> {
    return this.memoryModule.updateMemory(params);
  }

  async deleteMemory(id: string): Promise<void> {
    return this.memoryModule.deleteMemory(id);
  }

  // Statistics and health methods - delegated to StatsModule
  async getStats(): Promise<MemoryStats> {
    return this.statsModule.getStats();
  }

  async healthCheck(): Promise<boolean> {
    return this.statsModule.healthCheck();
  }

  // Task management methods - delegated to TaskModule
  async createTask(params: any): Promise<any> {
    return this.taskModule.createTask(params);
  }

  async searchTasks(params: any): Promise<any> {
    return this.taskModule.searchTasks(params);
  }

  async getTask(id: string): Promise<any> {
    return this.taskModule.getTask(id);
  }

  async updateTask(params: any): Promise<any> {
    return this.taskModule.updateTask(params);
  }

  async getTaskStats(): Promise<any> {
    return this.taskModule.getTaskStats();
  }

  async getTaskUpdatesForToday(timezone?: string): Promise<any> {
    return this.taskModule.getTaskUpdatesForToday(timezone);
  }

  async getTaskUpdatesForDate(date: string, timezone?: string): Promise<any> {
    return this.taskModule.getTaskUpdatesForDate(date, timezone);
  }

  // Time tracking methods - delegated to TimeModule
  async getDayTimeEntries(params: any): Promise<any> {
    return this.timeModule.getDayTimeEntries(params);
  }

  async getTaskTimeEntries(params: any): Promise<any> {
    return this.timeModule.getTaskTimeEntries(params);
  }

  async startTaskTimer(params: any): Promise<any> {
    return this.timeModule.startTaskTimer(params);
  }

  async stopTaskTimer(params: any): Promise<any> {
    return this.timeModule.stopTaskTimer(params);
  }

  async getRunningTimer(): Promise<any> {
    return this.timeModule.getRunningTimer();
  }

  // Category management methods - delegated to CategoryModule
  async getCategories(params?: any): Promise<any> {
    return this.categoryModule.getCategories(params);
  }

  async createCategory(params: any): Promise<any> {
    return this.categoryModule.createCategory(params);
  }

  async getCategory(id: string): Promise<any> {
    return this.categoryModule.getCategory(id);
  }

  async updateCategory(id: string, updates: any): Promise<any> {
    return this.categoryModule.updateCategory(id, updates);
  }

  // Activity management methods - delegated to ActivityModule
  async createActivity(params: CreateActivityParams): Promise<any> {
    return this.activityModule.createActivity(params);
  }

  async searchActivities(params: Partial<SearchActivitiesParams> = {}): Promise<any[]> {
    return this.activityModule.searchActivities(params);
  }

  async getActivity(id: string): Promise<any> {
    return this.activityModule.getActivity(id);
  }

  async updateActivity(params: UpdateActivityParams): Promise<any> {
    return this.activityModule.updateActivity(params);
  }

  async getActivityStats(): Promise<ActivityStats> {
    return this.activityModule.getActivityStats();
  }

  // Timeline system methods - delegated to TimelineModule
  async getTimelineItems(params: Partial<GetTimelineItemsParams> = {}): Promise<any[]> {
    return this.timelineModule.getTimelineItems(params);
  }

  async createTimelineItem(params: CreateTimelineItemParams): Promise<any> {
    return this.timelineModule.createTimelineItem(params);
  }

  async getTimelineInsights(params: Partial<GetTimelineInsightsParams> = {}): Promise<any> {
    return this.timelineModule.getTimelineInsights(params);
  }

  async searchAcrossTimeline(params: SearchAcrossTimelineParams): Promise<any[]> {
    return this.timelineModule.searchAcrossTimeline(params);
  }
}

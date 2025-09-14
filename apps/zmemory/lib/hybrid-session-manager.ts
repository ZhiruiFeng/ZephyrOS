import { ChatSession, AgentMessage } from '../types/agents'
import { supabaseSessionManager } from './supabase-session-manager'

// Mock Redis manager types - you'll import from your zflow app
interface RedisSessionManager {
  createSession(userId: string, agentId: string): Promise<ChatSession>
  getSession(sessionId: string): Promise<ChatSession | null>
  saveSession(session: ChatSession): Promise<void>
  addMessage(sessionId: string, message: AgentMessage): Promise<void>
  updateMessage(sessionId: string, messageId: string, updates: Partial<AgentMessage>): Promise<void>
  getUserSessions(userId: string, limit?: number): Promise<ChatSession[]>
  deleteSession(sessionId: string): Promise<void>
  extendSessionTTL(sessionId: string): Promise<void>
  generateSessionId(): string
  generateMessageId(): string
}

export interface HybridSessionConfig {
  redisManager: RedisSessionManager
  hotStorageRetentionMinutes?: number // How long to keep sessions in Redis (default: 120 min)
  archiveAfterIdleMinutes?: number // Archive to Supabase after this much idle time (default: 30 min)
  maxHotStorageMessages?: number // Max messages to keep in Redis (default: 50)
}

/**
 * Hybrid Session Manager - Uses Redis for hot storage and Supabase for persistent storage
 * 
 * Strategy:
 * - Active sessions stay in Redis for fast access
 * - Auto-archive to Supabase when sessions become idle
 * - Load from Supabase when user accesses old sessions
 * - Keep only recent messages in Redis to reduce memory pressure
 */
export class HybridSessionManager {
  private config: Required<HybridSessionConfig>
  private archivalInProgress = new Set<string>()

  constructor(config: HybridSessionConfig) {
    this.config = {
      redisManager: config.redisManager,
      hotStorageRetentionMinutes: config.hotStorageRetentionMinutes || 120,
      archiveAfterIdleMinutes: config.archiveAfterIdleMinutes || 30,
      maxHotStorageMessages: config.maxHotStorageMessages || 50
    }
  }

  generateSessionId(): string {
    return this.config.redisManager.generateSessionId()
  }

  generateMessageId(): string {
    return this.config.redisManager.generateMessageId()
  }

  /**
   * Create a new session - starts in Redis (hot storage)
   */
  async createSession(userId: string, agentId: string): Promise<ChatSession> {
    const session = await this.config.redisManager.createSession(userId, agentId)
    
    // Optionally pre-populate in Supabase for immediate backup
    try {
      await supabaseSessionManager.saveSession(session)
    } catch (error) {
      console.warn('Failed to backup new session to Supabase:', error)
    }

    return session
  }

  /**
   * Get session - try Redis first, then Supabase
   */
  async getSession(sessionId: string): Promise<ChatSession | null> {
    // Try Redis first (hot storage)
    let session = await this.config.redisManager.getSession(sessionId)
    
    if (session) {
      // Extend TTL for active access
      await this.config.redisManager.extendSessionTTL(sessionId)
      return session
    }

    // Try Supabase (cold storage)
    session = await supabaseSessionManager.getSession(sessionId)
    
    if (session) {
      // Restore to Redis for fast access, but trim messages if too many
      const trimmedSession = this.trimSessionForHotStorage(session)
      try {
        await this.config.redisManager.saveSession(trimmedSession)
      } catch (error) {
        console.warn('Failed to restore session to Redis:', error)
        // Continue anyway, return the full session from Supabase
      }
      return session
    }

    return null
  }

  /**
   * Save session - save to both Redis and optionally to Supabase
   */
  async saveSession(session: ChatSession): Promise<void> {
    // Always save to Redis for immediate access
    const trimmedSession = this.trimSessionForHotStorage(session)
    await this.config.redisManager.saveSession(trimmedSession)

    // Archive to Supabase in background
    this.archiveSessionInBackground(session)
  }

  /**
   * Add message - goes to Redis first
   */
  async addMessage(sessionId: string, message: AgentMessage): Promise<void> {
    await this.config.redisManager.addMessage(sessionId, message)
    
    // Archive to Supabase in background for backup
    this.syncMessageToSupabaseInBackground(sessionId, message)
  }

  /**
   * Update message - update Redis first
   */
  async updateMessage(sessionId: string, messageId: string, updates: Partial<AgentMessage>): Promise<void> {
    await this.config.redisManager.updateMessage(sessionId, messageId, updates)
    
    // Sync update to Supabase in background
    this.syncMessageUpdateToSupabaseInBackground(sessionId, messageId, updates)
  }

  /**
   * Get user sessions - combine Redis and Supabase
   */
  async getUserSessions(userId: string, limit = 50): Promise<ChatSession[]> {
    const [redisSessions, supabaseSessions] = await Promise.all([
      this.config.redisManager.getUserSessions(userId, limit),
      supabaseSessionManager.getUserSessions(userId, limit)
    ])

    // Merge sessions, Redis takes priority for duplicates
    const sessionMap = new Map<string, ChatSession>()
    
    // Add Supabase sessions first
    supabaseSessions.forEach(session => {
      sessionMap.set(session.id, session)
    })
    
    // Override with Redis sessions (more recent)
    redisSessions.forEach(session => {
      sessionMap.set(session.id, session)
    })

    // Sort by updated date and limit
    return Array.from(sessionMap.values())
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, limit)
  }

  /**
   * Delete session - remove from both stores
   */
  async deleteSession(sessionId: string): Promise<void> {
    await Promise.all([
      this.config.redisManager.deleteSession(sessionId),
      supabaseSessionManager.deleteSession(sessionId)
    ])
  }

  /**
   * Archive sessions that have been idle for too long
   */
  async archiveIdleSessions(): Promise<void> {
    try {
      const allRedisSessions = await this.config.redisManager.getUserSessions('*', 1000) // Get all
      const idleThreshold = new Date(Date.now() - this.config.archiveAfterIdleMinutes * 60 * 1000)

      for (const session of allRedisSessions) {
        if (session.updatedAt < idleThreshold && !this.archivalInProgress.has(session.id)) {
          this.archiveSessionInBackground(session, true) // Force archive
        }
      }
    } catch (error) {
      console.warn('Failed to archive idle sessions:', error)
    }
  }

  /**
   * Get conversation history from Supabase with search
   */
  async searchConversationHistory(userId: string, query: string, limit = 20): Promise<{
    sessionId: string
    sessionTitle: string
    message: AgentMessage
  }[]> {
    return await supabaseSessionManager.searchMessages(userId, query, limit)
  }

  /**
   * Get session statistics
   */
  async getSessionStats(userId: string): Promise<{
    totalSessions: number
    totalMessages: number
    archivedSessions: number
    activeSessions: number
  }> {
    const [supabaseStats, redisSessions] = await Promise.all([
      supabaseSessionManager.getSessionStats(userId),
      this.config.redisManager.getUserSessions(userId, 1000)
    ])

    return {
      ...supabaseStats,
      activeSessions: redisSessions.length
    }
  }

  // Private helper methods

  private trimSessionForHotStorage(session: ChatSession): ChatSession {
    if (session.messages.length <= this.config.maxHotStorageMessages) {
      return session
    }

    // Keep only the most recent messages in Redis
    const recentMessages = session.messages.slice(-this.config.maxHotStorageMessages)
    
    return {
      ...session,
      messages: recentMessages,
      metadata: {
        ...session.metadata,
        trimmedForHotStorage: true,
        originalMessageCount: session.messages.length
      }
    }
  }

  private archiveSessionInBackground(session: ChatSession, forceArchive = false): void {
    if (this.archivalInProgress.has(session.id)) {
      return // Already archiving
    }

    this.archivalInProgress.add(session.id)
    
    // Archive in background without blocking
    supabaseSessionManager.saveSession(session)
      .then(() => {
        if (forceArchive) {
          // Remove from Redis after successful archival
          return this.config.redisManager.deleteSession(session.id)
        }
      })
      .catch(error => {
        console.warn(`Failed to archive session ${session.id}:`, error)
      })
      .finally(() => {
        this.archivalInProgress.delete(session.id)
      })
  }

  private syncMessageToSupabaseInBackground(sessionId: string, message: AgentMessage): void {
    supabaseSessionManager.addMessage(sessionId, message)
      .catch(error => {
        console.warn(`Failed to sync message ${message.id} to Supabase:`, error)
      })
  }

  private syncMessageUpdateToSupabaseInBackground(
    sessionId: string, 
    messageId: string, 
    updates: Partial<AgentMessage>
  ): void {
    supabaseSessionManager.updateMessage(sessionId, messageId, updates)
      .catch(error => {
        console.warn(`Failed to sync message update ${messageId} to Supabase:`, error)
      })
  }
}

// Factory function to create hybrid manager
export function createHybridSessionManager(redisManager: RedisSessionManager): HybridSessionManager {
  return new HybridSessionManager({
    redisManager,
    hotStorageRetentionMinutes: 120, // 2 hours
    archiveAfterIdleMinutes: 30,     // 30 minutes idle
    maxHotStorageMessages: 50        // Keep last 50 messages in Redis
  })
}
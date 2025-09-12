import { getRedisClient } from '../redis'
import { ChatSession, AgentMessage } from './types'
import { MemorySessionManager } from './memory-session-manager'
import { randomBytes } from 'crypto'

export class SessionManager {
  private redis: any = null
  private memoryManager = new MemorySessionManager()
  private readonly SESSION_TTL = 24 * 60 * 60 // 24 hours in seconds
  private useRedis = false
  private initPromise: Promise<void> | null = null

  constructor() {
    this.initPromise = this.initializeRedis()
  }

  private async initializeRedis() {
    try {
      this.redis = getRedisClient()
      // 测试连接
      await this.redis.ping()
      this.useRedis = true
      console.log('SessionManager: Using Redis for session storage')
    } catch (error) {
      console.warn('SessionManager: Redis unavailable, falling back to memory storage:', error)
      this.useRedis = false
      if (process.env.NODE_ENV === 'production') {
        console.warn('SessionManager: In production without Redis; sessions will not be shared across serverless invocations. Set REDIS_URL.')
      }
    }
  }

  private async ensureReady() {
    if (this.initPromise) {
      try {
        await this.initPromise
      } catch {
        // ignore, fallback already set
      }
    }
  }

  generateSessionId(): string {
    return this.useRedis ? randomBytes(16).toString('hex') : this.memoryManager.generateSessionId()
  }

  generateMessageId(): string {
    return this.useRedis ? randomBytes(12).toString('hex') : this.memoryManager.generateMessageId()
  }

  async createSession(userId: string, agentId: string): Promise<ChatSession> {
    await this.ensureReady()
    if (!this.useRedis) {
      return await this.memoryManager.createSession(userId, agentId)
    }

    const sessionId = this.generateSessionId()
    const now = new Date()
    
    const session: ChatSession = {
      id: sessionId,
      userId,
      agentId,
      createdAt: now,
      updatedAt: now,
      messages: []
    }

    await this.saveSession(session)
    return session
  }

  async getSession(sessionId: string): Promise<ChatSession | null> {
    await this.ensureReady()
    if (!this.useRedis) {
      return await this.memoryManager.getSession(sessionId)
    }

    try {
      const sessionData = await this.redis.get(`session:${sessionId}`)
      if (!sessionData) {
        return null
      }

      const session = JSON.parse(sessionData) as ChatSession
      // Convert date strings back to Date objects
      session.createdAt = new Date(session.createdAt)
      session.updatedAt = new Date(session.updatedAt)
      session.messages = session.messages.map(msg => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }))

      return session
    } catch (error) {
      console.error('Error getting session:', error)
      return null
    }
  }

  async saveSession(session: ChatSession): Promise<void> {
    await this.ensureReady()
    if (!this.useRedis) {
      return await this.memoryManager.saveSession(session)
    }

    try {
      await this.redis.setex(
        `session:${session.id}`,
        this.SESSION_TTL,
        JSON.stringify(session)
      )
    } catch (error) {
      console.error('Error saving session:', error)
      throw error
    }
  }

  async addMessage(sessionId: string, message: AgentMessage): Promise<void> {
    await this.ensureReady()
    if (!this.useRedis) {
      return await this.memoryManager.addMessage(sessionId, message)
    }

    const session = await this.getSession(sessionId)
    if (!session) {
      throw new Error(`Session ${sessionId} not found`)
    }

    session.messages.push(message)
    session.updatedAt = new Date()
    await this.saveSession(session)
  }

  async updateMessage(sessionId: string, messageId: string, updates: Partial<AgentMessage>): Promise<void> {
    await this.ensureReady()
    if (!this.useRedis) {
      return await this.memoryManager.updateMessage(sessionId, messageId, updates)
    }

    const session = await this.getSession(sessionId)
    if (!session) {
      throw new Error(`Session ${sessionId} not found`)
    }

    const messageIndex = session.messages.findIndex(msg => msg.id === messageId)
    if (messageIndex === -1) {
      throw new Error(`Message ${messageId} not found in session`)
    }

    session.messages[messageIndex] = {
      ...session.messages[messageIndex],
      ...updates
    }
    
    session.updatedAt = new Date()
    await this.saveSession(session)
  }

  async getUserSessions(userId: string, limit = 50): Promise<ChatSession[]> {
    await this.ensureReady()
    if (!this.useRedis) {
      return await this.memoryManager.getUserSessions(userId, limit)
    }

    try {
      // Get all session keys for the user
      const keys = await this.redis.keys(`session:*`)
      const sessions: ChatSession[] = []

      for (const key of keys) {
        const sessionData = await this.redis.get(key)
        if (sessionData) {
          try {
            const session = JSON.parse(sessionData) as ChatSession
            if (session.userId === userId) {
              // Convert date strings back to Date objects
              session.createdAt = new Date(session.createdAt)
              session.updatedAt = new Date(session.updatedAt)
              sessions.push(session)
            }
          } catch (parseError) {
            console.warn(`Failed to parse session data for key ${key}`)
          }
        }
      }

      // Sort by updatedAt descending and limit
      return sessions
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
        .slice(0, limit)
    } catch (error) {
      console.error('Error getting user sessions:', error)
      return []
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.ensureReady()
    if (!this.useRedis) {
      return await this.memoryManager.deleteSession(sessionId)
    }

    try {
      await this.redis.del(`session:${sessionId}`)
    } catch (error) {
      console.error('Error deleting session:', error)
      throw error
    }
  }

  async extendSessionTTL(sessionId: string): Promise<void> {
    await this.ensureReady()
    if (!this.useRedis) {
      return await this.memoryManager.extendSessionTTL(sessionId)
    }

    try {
      await this.redis.expire(`session:${sessionId}`, this.SESSION_TTL)
    } catch (error) {
      console.error('Error extending session TTL:', error)
    }
  }
}

// Singleton instance
export const sessionManager = new SessionManager()

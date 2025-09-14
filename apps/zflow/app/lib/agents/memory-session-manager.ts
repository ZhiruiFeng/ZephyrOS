import { ChatSession, AgentMessage } from './types'
import { randomBytes } from 'crypto'

/**
 * 内存会话管理器
 * 当 Redis 不可用时作为后备方案
 */
export class MemorySessionManager {
  private sessions = new Map<string, ChatSession>()
  private readonly SESSION_TTL = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

  generateSessionId(): string {
    return randomBytes(16).toString('hex')
  }

  generateMessageId(): string {
    return randomBytes(12).toString('hex')
  }

  async createSession(userId: string, agentId: string): Promise<ChatSession> {
    const sessionId = this.generateSessionId()
    return this.createSessionWithId(sessionId, userId, agentId)
  }

  async createSessionWithId(sessionId: string, userId: string, agentId: string): Promise<ChatSession> {
    const now = new Date()

    const session: ChatSession = {
      id: sessionId,
      userId,
      agentId,
      createdAt: now,
      updatedAt: now,
      messages: []
    }

    this.sessions.set(sessionId, session)
    this.scheduleCleanup(sessionId)
    return session
  }

  async getSession(sessionId: string): Promise<ChatSession | null> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return null
    }

    // 检查会话是否过期
    const now = new Date()
    const isExpired = (now.getTime() - session.updatedAt.getTime()) > this.SESSION_TTL
    
    if (isExpired) {
      this.sessions.delete(sessionId)
      return null
    }

    return { ...session } // 返回副本
  }

  async saveSession(session: ChatSession): Promise<void> {
    this.sessions.set(session.id, { ...session })
    this.scheduleCleanup(session.id)
  }

  async addMessage(sessionId: string, message: AgentMessage): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      throw new Error(`Session ${sessionId} not found`)
    }

    session.messages.push(message)
    session.updatedAt = new Date()
    this.sessions.set(sessionId, session)
    this.scheduleCleanup(sessionId)
  }

  async updateMessage(sessionId: string, messageId: string, updates: Partial<AgentMessage>): Promise<void> {
    const session = this.sessions.get(sessionId)
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
    this.sessions.set(sessionId, session)
    this.scheduleCleanup(sessionId)
  }

  async getUserSessions(userId: string, limit = 50): Promise<ChatSession[]> {
    const userSessions: ChatSession[] = []
    const now = new Date()

    const sessionIds = Array.from(this.sessions.keys())
    for (const sessionId of sessionIds) {
      const session = this.sessions.get(sessionId)!
      // 检查会话是否过期
      const isExpired = (now.getTime() - session.updatedAt.getTime()) > this.SESSION_TTL
      
      if (isExpired) {
        this.sessions.delete(sessionId)
        continue
      }

      if (session.userId === userId) {
        userSessions.push({ ...session })
      }
    }

    // 按更新时间降序排序并限制数量
    return userSessions
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, limit)
  }

  async deleteSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId)
  }

  async extendSessionTTL(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.updatedAt = new Date()
      this.sessions.set(sessionId, session)
      this.scheduleCleanup(sessionId)
    }
  }

  private scheduleCleanup(sessionId: string): void {
    // 简单的清理机制：在 TTL 后删除会话
    setTimeout(() => {
      const session = this.sessions.get(sessionId)
      if (session) {
        const now = new Date()
        const isExpired = (now.getTime() - session.updatedAt.getTime()) > this.SESSION_TTL
        
        if (isExpired) {
          this.sessions.delete(sessionId)
        }
      }
    }, this.SESSION_TTL)
  }

  // 清理所有过期会话
  cleanupExpiredSessions(): void {
    const now = new Date()
    const sessionIds = Array.from(this.sessions.keys())
    for (const sessionId of sessionIds) {
      const session = this.sessions.get(sessionId)!
      const isExpired = (now.getTime() - session.updatedAt.getTime()) > this.SESSION_TTL
      if (isExpired) {
        this.sessions.delete(sessionId)
      }
    }
  }

  // 获取统计信息
  getStats(): { totalSessions: number; activeSessions: number } {
    const now = new Date()
    let activeSessions = 0

    const sessionIds = Array.from(this.sessions.keys())
    for (const sessionId of sessionIds) {
      const session = this.sessions.get(sessionId)!
      const isExpired = (now.getTime() - session.updatedAt.getTime()) > this.SESSION_TTL
      if (!isExpired) {
        activeSessions++
      }
    }

    return {
      totalSessions: this.sessions.size,
      activeSessions
    }
  }
}

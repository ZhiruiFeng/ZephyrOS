import { NextResponse } from 'next/server'
import { sessionManager } from '../../../lib/agents/session-manager'
import { StreamingService } from '../../../lib/agents/streaming'
import { getRedisClient } from '../../../lib/redis'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    const streaming = new StreamingService()
    const modeSession = await sessionManager.getMode()
    const modeStreaming = await streaming.getMode()

    // Test Redis connectivity if available
    let redisHealth = null
    if (process.env.REDIS_URL) {
      try {
        const redis = getRedisClient()
        const startTime = Date.now()
        const pingResult = await redis.ping()
        const latency = Date.now() - startTime
        
        redisHealth = {
          connected: pingResult === 'PONG',
          latency,
          mode: modeSession
        }
      } catch (redisError) {
        redisHealth = {
          connected: false,
          error: redisError instanceof Error ? redisError.message : 'Unknown Redis error',
          mode: modeSession
        }
      }
    }

    return NextResponse.json({
      ok: true,
      redis_url_present: Boolean(process.env.REDIS_URL),
      session_mode: modeSession,
      streaming_mode: modeStreaming,
      redis_health: redisHealth,
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({ 
      ok: false, 
      error: (error as Error).message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}


import { NextRequest, NextResponse } from 'next/server'
import { getRedisClient } from '@/app/lib/redis'

export async function GET(request: NextRequest) {
  try {
    const redis = getRedisClient()
    
    // Test Redis connectivity and basic operations
    const startTime = Date.now()
    
    // Basic ping test
    const pingResult = await redis.ping()
    const pingLatency = Date.now() - startTime
    
    // Test set/get operations
    const testKey = `health_check:${Date.now()}`
    const testValue = 'test_value'
    
    const setStartTime = Date.now()
    await redis.setex(testKey, 60, testValue) // 60 second TTL
    const setLatency = Date.now() - setStartTime
    
    const getStartTime = Date.now()
    const retrievedValue = await redis.get(testKey)
    const getLatency = Date.now() - getStartTime
    
    // Clean up test key
    await redis.del(testKey)
    
    // Get Redis info
    const info = await redis.info('server')
    const memory = await redis.info('memory')
    const stats = await redis.info('stats')
    
    // Parse version from info
    const versionMatch = info.match(/redis_version:([^\r\n]+)/)
    const version = versionMatch ? versionMatch[1] : 'unknown'
    
    // Parse memory usage
    const memoryMatch = memory.match(/used_memory_human:([^\r\n]+)/)
    const memoryUsage = memoryMatch ? memoryMatch[1] : 'unknown'
    
    // Parse connection count
    const connectionsMatch = stats.match(/connected_clients:([^\r\n]+)/)
    const connections = connectionsMatch ? parseInt(connectionsMatch[1]) : 0
    
    const healthData = {
      status: 'healthy',
      redis: {
        connected: pingResult === 'PONG',
        version,
        memoryUsage,
        connections,
        latency: {
          ping: pingLatency,
          set: setLatency,
          get: getLatency
        }
      },
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      testResult: retrievedValue === testValue ? 'pass' : 'fail'
    }
    
    return NextResponse.json(healthData)
    
  } catch (error) {
    console.error('Redis health check failed:', error)
    
    const errorResponse = {
      status: 'unhealthy',
      redis: {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    }
    
    return NextResponse.json(errorResponse, { status: 503 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body
    
    if (action === 'flush_test_keys') {
      const redis = getRedisClient()
      
      // Remove any lingering health check test keys
      const keys = await redis.keys('health_check:*')
      if (keys.length > 0) {
        await redis.del(...keys)
      }
      
      return NextResponse.json({
        status: 'success',
        message: `Flushed ${keys.length} health check test keys`,
        timestamp: new Date().toISOString()
      })
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    
  } catch (error) {
    console.error('Redis health check POST failed:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
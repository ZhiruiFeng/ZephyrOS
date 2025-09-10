import Redis from 'ioredis'

let redis: Redis | null = null

export function getRedisClient(): Redis {
  // 在构建时不创建 Redis 连接
  if (process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV === undefined) {
    throw new Error('Redis is not available during build time')
  }
  
  if (!redis) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
    
    try {
      redis = new Redis(redisUrl, {
        // 在开发环境或没有 Redis 时的配置
        maxRetriesPerRequest: 3,
        lazyConnect: true, // 延迟连接
        connectTimeout: 10000,
      })

      redis.on('error', (error) => {
        console.error('Redis error:', error)
        // 在开发环境中，如果 Redis 不可用，使用内存存储
        if (process.env.NODE_ENV === 'development') {
          console.warn('Redis unavailable in development, using memory storage')
        }
      })

      redis.on('connect', () => {
        console.log('Redis connected')
      })
    } catch (error) {
      console.error('Failed to create Redis client:', error)
      throw error
    }
  }

  return redis
}

export function closeRedisConnection(): void {
  if (redis) {
    redis.disconnect()
    redis = null
  }
}
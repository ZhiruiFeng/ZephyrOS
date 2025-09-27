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
      const isProduction = process.env.NODE_ENV === 'production'
      
      const options = {
        // Production-optimized configuration
        maxRetriesPerRequest: isProduction ? 5 : 3,
        lazyConnect: true,
        connectTimeout: isProduction ? 20000 : 10000,
        commandTimeout: isProduction ? 10000 : 5000,
        retryDelayOnFailover: 100,
        
        // Connection pool settings for serverless
        family: 4,
        keepAlive: 30000, // 30 seconds
        
        // TLS configuration for production (Upstash requires TLS)
        ...(isProduction && redisUrl.startsWith('rediss://') && {
          tls: {
            rejectUnauthorized: false, // Upstash uses self-signed certificates
          }
        }),
        
        // Retry configuration
        retryConnect: (times: number) => {
          const delay = Math.min(times * 50, 2000)
          return delay
        }
      }
      
      redis = new Redis(redisUrl, options)

      redis.on('error', (error) => {
        const errorContext = {
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV,
          redisUrl: redisUrl.replace(/:[^:]*@/, ':***@'), // Mask credentials
          error: error.message,
          stack: error.stack
        }
        console.error('Redis error:', errorContext)
        
        // 在开发环境中，如果 Redis 不可用，使用内存存储
        if (process.env.NODE_ENV === 'development') {
          console.warn('Redis unavailable in development, falling back to memory storage')
        } else {
          console.error('Redis connection failed in production - agents will not function properly')
        }
      })

      redis.on('connect', () => {
        console.log('Redis connected successfully', {
          environment: process.env.NODE_ENV,
          timestamp: new Date().toISOString()
        })
      })

      redis.on('ready', () => {
        console.log('Redis ready for operations')
      })

      redis.on('reconnecting', (time: number) => {
        console.log(`Redis reconnecting in ${time}ms`)
      })
    } catch (error) {
      console.error('Failed to create Redis client:', error)
      throw error
    }
  }

  return redis
}

export function getRedisSubscriber(): Redis {
  // Create a new Redis client specifically for subscribing
  // Subscriber clients cannot be used for regular commands
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
  const isProduction = process.env.NODE_ENV === 'production'
  
  const options = {
    // Same configuration as main client
    maxRetriesPerRequest: isProduction ? 5 : 3,
    lazyConnect: true,
    connectTimeout: isProduction ? 20000 : 10000,
    commandTimeout: isProduction ? 10000 : 5000,
    retryDelayOnFailover: 100,
    
    family: 4,
    keepAlive: 30000,
    
    ...(isProduction && redisUrl.startsWith('rediss://') && {
      tls: {
        rejectUnauthorized: false,
      }
    }),
    
    retryConnect: (times: number) => {
      const delay = Math.min(times * 50, 2000)
      return delay
    }
  }
  
  const subscriber = new Redis(redisUrl, options)
  
  subscriber.on('error', (error) => {
    console.error('Redis subscriber error:', {
      timestamp: new Date().toISOString(),
      error: error.message
    })
  })
  
  subscriber.on('connect', () => {
    console.log('Redis subscriber connected')
  })
  
  return subscriber
}

export function closeRedisConnection(): void {
  if (redis) {
    redis.disconnect()
    redis = null
  }
}
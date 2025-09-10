import Redis from 'ioredis'

let redis: Redis | null = null

export function getRedisClient(): Redis {
  if (!redis) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
    redis = new Redis(redisUrl)

    redis.on('error', (error) => {
      console.error('Redis error:', error)
    })

    redis.on('connect', () => {
      console.log('Redis connected')
    })
  }

  return redis
}

export function closeRedisConnection(): void {
  if (redis) {
    redis.disconnect()
    redis = null
  }
}
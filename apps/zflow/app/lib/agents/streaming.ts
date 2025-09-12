import { getRedisClient } from '../redis'
import { StreamingResponse } from './types'
import { MemoryStreamingService } from './memory-streaming'

function getSharedMemoryStreamingService(): MemoryStreamingService {
  const g = globalThis as unknown as { __zflowMemoryStreamingService?: MemoryStreamingService }
  if (!g.__zflowMemoryStreamingService) {
    g.__zflowMemoryStreamingService = new MemoryStreamingService()
  }
  return g.__zflowMemoryStreamingService
}

export class StreamingService {
  private redis: any = null
  private memoryService = getSharedMemoryStreamingService()
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
      console.log('StreamingService: Using Redis for streaming')
    } catch (error) {
      console.warn('StreamingService: Redis unavailable, falling back to memory streaming:', error)
      this.useRedis = false
      if (process.env.NODE_ENV === 'production') {
        console.warn('StreamingService: In production without Redis; SSE in serverless will not function across requests. Set REDIS_URL.')
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

  async publishStreamEvent(sessionId: string, event: StreamingResponse): Promise<void> {
    await this.ensureReady()
    if (!this.useRedis) {
      return await this.memoryService.publishStreamEvent(sessionId, event)
    }

    const channel = `agent_stream:${sessionId}`
    await this.redis.publish(channel, JSON.stringify(event))
  }

  async subscribeToStream(sessionId: string, callback: (event: StreamingResponse) => void): Promise<() => void> {
    await this.ensureReady()
    if (!this.useRedis) {
      return await this.memoryService.subscribeToStream(sessionId, callback)
    }

    const subscriber = getRedisClient()
    const channel = `agent_stream:${sessionId}`

    subscriber.subscribe(channel, (err, count) => {
      if (err) {
        console.error('Failed to subscribe:', err)
        return
      }
      console.log(`Subscribed to ${count} channels`)
    })

    subscriber.on('message', (receivedChannel, message) => {
      if (receivedChannel === channel) {
        try {
          const event = JSON.parse(message) as StreamingResponse
          callback(event)
        } catch (error) {
          console.error('Error parsing stream event:', error)
        }
      }
    })

    // Return unsubscribe function
    return () => {
      subscriber.unsubscribe(channel)
      subscriber.disconnect()
    }
  }

  createSSEStream(sessionId: string): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder()
    let unsubscribe: (() => void) | null = null

    return new ReadableStream({
      start: async (controller) => {
        await this.ensureReady()

        // Send initial connection event
        const greeting = `data: ${JSON.stringify({ type: 'connected', sessionId })}\n\n`
        controller.enqueue(encoder.encode(greeting))

        // Subscribe to appropriate stream (Redis or memory)
        unsubscribe = await this.subscribeToStream(sessionId, (event) => {
          try {
            const data = `data: ${JSON.stringify(event)}\n\n`
            controller.enqueue(encoder.encode(data))

            // Close stream on end or error
            if (event.type === 'end' || event.type === 'error') {
              controller.close()
            }
          } catch (error) {
            console.error('Error sending SSE event:', error)
            controller.error(error)
          }
        })

        // Keep connection alive with heartbeat
        const heartbeat = setInterval(() => {
          try {
            const data = `data: ${JSON.stringify({ type: 'heartbeat' })}\n\n`
            controller.enqueue(encoder.encode(data))
          } catch (error) {
            clearInterval(heartbeat)
          }
        }, 30000)

        // Clean up heartbeat when stream closes
        const originalClose = controller.close.bind(controller)
        controller.close = () => {
          clearInterval(heartbeat)
          originalClose()
        }
      },
      cancel: () => {
        if (unsubscribe) {
          unsubscribe()
        }
      }
    })
  }

  async cancelStream(sessionId: string): Promise<void> {
    await this.ensureReady()
    if (!this.useRedis) {
      return await this.memoryService.cancelStream(sessionId)
    }

    await this.publishStreamEvent(sessionId, {
      sessionId,
      messageId: '',
      type: 'error',
      error: 'Stream cancelled by user'
    })
  }

  async getMode(): Promise<'redis' | 'memory'> {
    await this.ensureReady()
    return this.useRedis ? 'redis' : 'memory'
  }
}

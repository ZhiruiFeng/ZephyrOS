import { getRedisClient, getRedisSubscriber } from '@/app/lib/redis'
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

    // Use a separate subscriber client to avoid "subscriber mode" conflicts
    const subscriber = getRedisSubscriber()
    const channel = `agent_stream:${sessionId}`

    try {
      // Ensure connection before subscribing (lazyConnect is enabled)
      // ioredis connect() returns a promise; ignore if already connected
      // @ts-ignore
      if (typeof (subscriber as any).connect === 'function') {
        // @ts-ignore
        await (subscriber as any).connect()
      }
    } catch (connectErr) {
      console.error('Failed to connect Redis subscriber:', connectErr)
    }

    subscriber.on('error', (err: any) => {
      console.error('Redis subscriber error during stream:', err)
    })
    subscriber.on('end', () => {
      console.log('Redis subscriber ended')
    })

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
      try {
        subscriber.unsubscribe(channel)
      } catch (e) {
        console.warn('Error during Redis unsubscribe:', e)
      }
      try {
        subscriber.disconnect()
      } catch (e) {
        console.warn('Error during Redis subscriber disconnect:', e)
      }
    }
  }

  createSSEStream(sessionId: string): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder()
    let unsubscribe: (() => void) | null = null
    let heartbeatActive = true
    let heartbeat: NodeJS.Timeout | null = null
    let controllerClosed = false

    console.log(`Creating SSE stream for session: ${sessionId}`)

    return new ReadableStream({
      start: async (controller) => {
        try {
          await this.ensureReady()
          console.log(`SSE stream ready for session: ${sessionId}, mode: ${this.useRedis ? 'redis' : 'memory'}`)

          // Send initial connection event
          const greeting = `data: ${JSON.stringify({ type: 'connected', sessionId })}\n\n`
          controller.enqueue(encoder.encode(greeting))
        
        // Subscribe to appropriate stream (Redis or memory)
        unsubscribe = await this.subscribeToStream(sessionId, (event) => {
          // Early return if controller is already marked as closed
          if (controllerClosed) {
            console.log(`SSE controller marked closed, skipping event: ${event.type}`)
            return
          }
          
          try {
            // Double-check controller state before writing
            if (controller.desiredSize === null) {
              console.log(`SSE controller closed, skipping event: ${event.type}`)
              controllerClosed = true
              return
            }

            const data = `data: ${JSON.stringify(event)}\n\n`
            controller.enqueue(encoder.encode(data))

            // Close stream on end or error with slight delay to ensure data is sent
            if (event.type === 'end' || event.type === 'error') {
              console.log(`SSE stream ending for session: ${sessionId}, type: ${event.type}`)
              setTimeout(() => {
                try {
                  if (!controllerClosed && controller.desiredSize !== null) {
                    controllerClosed = true
                    controller.close()
                  }
                } catch (closeError) {
                  console.warn('Error closing SSE controller:', closeError)
                  controllerClosed = true
                }
              }, 100) // Small delay to ensure data is flushed
            }
          } catch (error) {
            console.error('Error sending SSE event:', error)
            controllerClosed = true
            try {
              if (controller.desiredSize !== null && !controllerClosed) {
                controller.error(error)
              }
            } catch (errorError) {
              console.warn('Error reporting SSE error:', errorError)
            }
          }
        })

        // Keep connection alive with heartbeat
        heartbeat = setInterval(() => {
          if (!heartbeatActive || controllerClosed) {
            if (heartbeat) clearInterval(heartbeat)
            return
          }
          
          try {
            // Double-check controller state
            if (controller.desiredSize !== null && !controllerClosed) {
              const data = `data: ${JSON.stringify({ type: 'heartbeat' })}\n\n`
              controller.enqueue(encoder.encode(data))
            } else {
              heartbeatActive = false
              controllerClosed = true
              if (heartbeat) clearInterval(heartbeat)
            }
          } catch (error) {
            console.warn('Heartbeat failed, clearing interval:', error)
            heartbeatActive = false
            controllerClosed = true
            if (heartbeat) clearInterval(heartbeat)
          }
        }, 30000)

        // Clean up heartbeat when stream closes
        const originalClose = controller.close.bind(controller)
        controller.close = () => {
          heartbeatActive = false
          controllerClosed = true
          if (heartbeat) clearInterval(heartbeat)
          originalClose()
        }
        
        } catch (initError) {
          console.error(`Failed to initialize SSE stream for session: ${sessionId}`, initError)
          heartbeatActive = false
          controllerClosed = true
          if (heartbeat) clearInterval(heartbeat)
          try {
            controller.error(initError)
          } catch (errorError) {
            console.warn('Error reporting SSE init error:', errorError)
          }
        }
      },
      cancel: () => {
        heartbeatActive = false
        controllerClosed = true
        if (heartbeat) clearInterval(heartbeat)
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

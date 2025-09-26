import { StreamingResponse } from './types'
import { EventEmitter } from 'events'

/**
 * 内存流式服务
 * 当 Redis 不可用时作为后备方案
 */
export class MemoryStreamingService {
  private eventEmitter = new EventEmitter()

  async publishStreamEvent(sessionId: string, event: StreamingResponse): Promise<void> {
    const channel = `agent_stream:${sessionId}`
    this.eventEmitter.emit(channel, event)
  }

  async subscribeToStream(sessionId: string, callback: (event: StreamingResponse) => void): Promise<() => void> {
    const channel = `agent_stream:${sessionId}`

    this.eventEmitter.on(channel, callback)

    // Return unsubscribe function
    return () => {
      this.eventEmitter.removeListener(channel, callback)
    }
  }

  createSSEStream(sessionId: string): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder()
    let unsubscribe: (() => void) | null = null

    return new ReadableStream({
      start: async (controller) => {
        // Send initial connection event
        const data = `data: ${JSON.stringify({ type: 'connected', sessionId })}\n\n`
        controller.enqueue(encoder.encode(data))

        // Subscribe to memory stream
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
        }, 30000) // 30 seconds

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
    await this.publishStreamEvent(sessionId, {
      sessionId,
      messageId: '',
      type: 'error',
      error: 'Stream cancelled by user'
    })
  }

  // 清理方法
  removeAllListeners(sessionId?: string): void {
    if (sessionId) {
      const channel = `agent_stream:${sessionId}`
      this.eventEmitter.removeAllListeners(channel)
    } else {
      this.eventEmitter.removeAllListeners()
    }
  }

  // 获取统计信息
  getStats(): { totalListeners: number; channels: string[] } {
    const channels = this.eventEmitter.eventNames().map(name => String(name))
    const totalListeners = channels.reduce((sum, channel) => {
      return sum + this.eventEmitter.listenerCount(channel)
    }, 0)

    return {
      totalListeners,
      channels
    }
  }
}

import { getRedisClient } from '../redis'
import { StreamingResponse } from './types'

export class StreamingService {
  private redis = getRedisClient()

  async publishStreamEvent(sessionId: string, event: StreamingResponse): Promise<void> {
    const channel = `agent_stream:${sessionId}`
    await this.redis.publish(channel, JSON.stringify(event))
  }

  async subscribeToStream(sessionId: string, callback: (event: StreamingResponse) => void): Promise<() => void> {
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
        // Send initial connection event
        const data = `data: ${JSON.stringify({ type: 'connected', sessionId })}\n\n`
        controller.enqueue(encoder.encode(data))

        // Subscribe to Redis stream
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
}
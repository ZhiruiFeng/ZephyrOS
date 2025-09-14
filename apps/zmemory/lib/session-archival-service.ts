import { HybridSessionManager } from './hybrid-session-manager'

export interface ArchivalConfig {
  intervalMinutes?: number // How often to run archival (default: 15 min)
  batchSize?: number       // How many sessions to process per batch (default: 10)
  enabled?: boolean        // Enable/disable archival service (default: true)
}

/**
 * Background service that periodically archives idle sessions from Redis to Supabase
 */
export class SessionArchivalService {
  private config: Required<ArchivalConfig>
  private hybridManager: HybridSessionManager
  private intervalId: NodeJS.Timeout | null = null
  private isRunning = false

  constructor(hybridManager: HybridSessionManager, config: ArchivalConfig = {}) {
    this.hybridManager = hybridManager
    this.config = {
      intervalMinutes: config.intervalMinutes || 15,
      batchSize: config.batchSize || 10,
      enabled: config.enabled !== false
    }
  }

  /**
   * Start the archival service
   */
  start(): void {
    if (!this.config.enabled || this.intervalId) {
      return
    }

    console.log(`Starting session archival service - running every ${this.config.intervalMinutes} minutes`)
    
    this.intervalId = setInterval(() => {
      this.runArchival()
    }, this.config.intervalMinutes * 60 * 1000)

    // Run immediately on start
    this.runArchival()
  }

  /**
   * Stop the archival service
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
      console.log('Session archival service stopped')
    }
  }

  /**
   * Manually trigger archival process
   */
  async runArchival(): Promise<void> {
    if (this.isRunning) {
      console.log('Archival already running, skipping...')
      return
    }

    this.isRunning = true
    
    try {
      console.log('Starting session archival process...')
      await this.hybridManager.archiveIdleSessions()
      console.log('Session archival completed successfully')
    } catch (error) {
      console.error('Session archival failed:', error)
    } finally {
      this.isRunning = false
    }
  }

  /**
   * Get service status
   */
  getStatus(): {
    enabled: boolean
    running: boolean
    intervalMinutes: number
    batchSize: number
  } {
    return {
      enabled: this.config.enabled && this.intervalId !== null,
      running: this.isRunning,
      intervalMinutes: this.config.intervalMinutes,
      batchSize: this.config.batchSize
    }
  }
}

// Singleton service instance
let archivalService: SessionArchivalService | null = null

/**
 * Initialize the global archival service
 */
export function initializeArchivalService(
  hybridManager: HybridSessionManager, 
  config?: ArchivalConfig
): SessionArchivalService {
  if (archivalService) {
    archivalService.stop()
  }
  
  archivalService = new SessionArchivalService(hybridManager, config)
  
  // Start service automatically in production
  if (process.env.NODE_ENV === 'production') {
    archivalService.start()
  }
  
  return archivalService
}

/**
 * Get the global archival service instance
 */
export function getArchivalService(): SessionArchivalService | null {
  return archivalService
}

/**
 * Graceful shutdown handler
 */
export function setupArchivalShutdown(): void {
  const gracefulShutdown = () => {
    if (archivalService) {
      console.log('Shutting down session archival service...')
      archivalService.stop()
    }
  }

  process.on('SIGTERM', gracefulShutdown)
  process.on('SIGINT', gracefulShutdown)
  process.on('SIGUSR2', gracefulShutdown) // Nodemon restart
}
/**
 * Performance monitoring utilities for tracking bundle sizes and render performance
 */
import React from 'react'

interface PerformanceMetrics {
  bundleSize: number
  renderTime: number
  componentName: string
  timestamp: number
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = []
  private renderStartTimes = new Map<string, number>()

  // Track component render start
  startRender(componentName: string) {
    if (typeof window === 'undefined') return
    this.renderStartTimes.set(componentName, performance.now())
  }

  // Track component render end and log metrics
  endRender(componentName: string) {
    if (typeof window === 'undefined') return

    const startTime = this.renderStartTimes.get(componentName)
    if (!startTime) return

    const renderTime = performance.now() - startTime
    this.renderStartTimes.delete(componentName)

    // Only log slow renders (>16ms for 60fps)
    if (renderTime > 16) {
      console.warn(`🐌 Slow render: ${componentName} took ${renderTime.toFixed(2)}ms`)
    }

    this.addMetric({
      bundleSize: 0, // Will be set by bundle analyzer
      renderTime,
      componentName,
      timestamp: Date.now()
    })
  }

  // Track bundle load performance
  trackBundleLoad(bundleName: string, size: number) {
    if (typeof window === 'undefined') return

    this.addMetric({
      bundleSize: size,
      renderTime: 0,
      componentName: bundleName,
      timestamp: Date.now()
    })

    console.log(`📦 Bundle loaded: ${bundleName} (${(size / 1024).toFixed(1)} KB)`)
  }

  // Log Core Web Vitals
  trackWebVitals() {
    if (typeof window === 'undefined') return

    // Track Largest Contentful Paint (LCP)
    new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach((entry) => {
        console.log(`🎯 LCP: ${entry.startTime.toFixed(2)}ms`)
      })
    }).observe({ entryTypes: ['largest-contentful-paint'] })

    // Track First Input Delay (FID)
    new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach((entry) => {
        const eventEntry = entry as any // Type assertion for first-input entries
        console.log(`⚡ FID: ${eventEntry.processingStart - eventEntry.startTime}ms`)
      })
    }).observe({ entryTypes: ['first-input'] })

    // Track Cumulative Layout Shift (CLS)
    let clsValue = 0
    new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach((entry) => {
        const layoutEntry = entry as any // Type assertion for layout-shift entries
        if (!layoutEntry.hadRecentInput) {
          clsValue += layoutEntry.value
        }
      })
      console.log(`📐 CLS: ${clsValue.toFixed(4)}`)
    }).observe({ entryTypes: ['layout-shift'] })
  }

  private addMetric(metric: PerformanceMetrics) {
    this.metrics.push(metric)

    // Keep only last 100 metrics to prevent memory leaks
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100)
    }
  }

  // Get performance summary
  getSummary() {
    const renderMetrics = this.metrics.filter(m => m.renderTime > 0)
    const bundleMetrics = this.metrics.filter(m => m.bundleSize > 0)

    return {
      avgRenderTime: renderMetrics.length > 0
        ? renderMetrics.reduce((sum, m) => sum + m.renderTime, 0) / renderMetrics.length
        : 0,
      slowRenders: renderMetrics.filter(m => m.renderTime > 16).length,
      totalBundleSize: bundleMetrics.reduce((sum, m) => sum + m.bundleSize, 0),
      bundleCount: bundleMetrics.length
    }
  }

  // Clear all metrics
  clear() {
    this.metrics = []
    this.renderStartTimes.clear()
  }
}

// Global instance
export const performanceMonitor = new PerformanceMonitor()

// React hook for component performance tracking
export function usePerformanceTracking(componentName: string) {
  if (typeof window !== 'undefined') {
    // Track render start
    performanceMonitor.startRender(componentName)

    // Track render end on next tick
    setTimeout(() => {
      performanceMonitor.endRender(componentName)
    }, 0)
  }
}

// High-order component for automatic performance tracking
export function withPerformanceTracking<T extends Record<string, any>>(
  WrappedComponent: React.ComponentType<T>,
  componentName?: string
): React.ComponentType<T> {
  const displayName = componentName || WrappedComponent.displayName || WrappedComponent.name || 'Component'

  const PerformanceTrackedComponent = (props: T) => {
    usePerformanceTracking(displayName)
    return React.createElement(WrappedComponent, props)
  }

  PerformanceTrackedComponent.displayName = `withPerformanceTracking(${displayName})`
  return PerformanceTrackedComponent
}

// Initialize performance monitoring
if (typeof window !== 'undefined') {
  // Start Web Vitals tracking
  performanceMonitor.trackWebVitals()

  // Track initial page load time
  window.addEventListener('load', () => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    console.log(`🚀 Page load: ${navigation.loadEventEnd - navigation.fetchStart}ms`)
  })
}
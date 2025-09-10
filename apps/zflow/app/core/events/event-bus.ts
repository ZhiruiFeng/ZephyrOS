// Lightweight, typed event bus built on top of window CustomEvent
// Centralizes event names and payload types for safer cross-tree communication.

export type ZflowAddTaskPayload = { categoryId?: string } | undefined
export type ZflowAddTaskFromPagePayload = undefined
export type ZflowTimerStoppedPayload = { entry?: any }

type EventMap = {
  'zflow:addTask': ZflowAddTaskPayload
  'zflow:addTaskFromPage': ZflowAddTaskFromPagePayload
  'zflow:timerStopped': ZflowTimerStoppedPayload
}

type EventKey = keyof EventMap

function emit<E extends EventKey>(type: E, detail: EventMap[E]) {
  if (typeof window === 'undefined') return
  const ev = new CustomEvent(type, { detail })
  window.dispatchEvent(ev)
}

function on<E extends EventKey>(type: E, handler: (detail: EventMap[E]) => void) {
  if (typeof window === 'undefined') return () => {}
  const wrapped = (e: Event) => {
    const ce = e as CustomEvent<EventMap[E]>
    handler(ce.detail)
  }
  window.addEventListener(type, wrapped as EventListener)
  return () => window.removeEventListener(type, wrapped as EventListener)
}

// Convenience wrappers for specific events
export const eventBus = {
  emitAddTask: (payload?: ZflowAddTaskPayload) => emit('zflow:addTask', payload),
  onAddTask: (handler: (detail: ZflowAddTaskPayload) => void) => on('zflow:addTask', handler),

  emitAddTaskFromPage: () => emit('zflow:addTaskFromPage', undefined),
  onAddTaskFromPage: (handler: () => void) => on('zflow:addTaskFromPage', () => handler()),

  emitTimerStopped: (payload: ZflowTimerStoppedPayload) => emit('zflow:timerStopped', payload),
  onTimerStopped: (handler: (detail: ZflowTimerStoppedPayload) => void) => on('zflow:timerStopped', handler),
}

export default eventBus


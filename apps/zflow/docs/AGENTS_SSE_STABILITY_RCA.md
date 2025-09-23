# Agents SSE Stability Fix – RCA and Follow-ups

Date: 2025-09-23
Component: apps/zflow (Agents page + streaming)

Summary
- Fixed an aggressive SSE reconnect loop on the Agents page that caused the server to receive frequent /api/agents/stream and /api/agents/sessions requests (every ~0.5–1s), and triggered Redis subscriber errors.
- Implemented a stable EventSource lifecycle, narrowed effect dependencies, added exponential backoff reconnection, de-duplicated session creation in dev/StrictMode, and hardened Redis subscriber teardown.

Symptoms observed
- Repeating log pattern while viewing /agents:
  - GET /api/agents/sessions?sessionId=... (verification) every second
  - Creating SSE stream for session ... followed by GET /api/agents/stream ... 200, repeatedly
  - Redis subscriber errors: "Failed to subscribe: [Error: Connection is closed.]" and unhandled rejections
- Multiple POST /api/agents/sessions on initial mount in development.

Impact
- Unnecessary server load from repeated session checks and stream creations
- Noisy Redis errors due to rapid subscribe/unsubscribe cycles
- Flaky user experience during streaming initialization in dev

Root cause
- EventSource connection stored in component state and included in useEffect dependencies. The effect created a new EventSource and also called setEventSource, which updated state and re-ran the effect, closing and reopening the connection in a loop.
- Broad dependency array (including eventSource, selectedAgent, sessionManager object reference, streamEndedNormally) caused reconnections on incidental state changes.
- React 18 StrictMode double-invocation of effects in development led to duplicate POST /api/agents/sessions unless guarded.
- Redis subscriber occasionally attempted unsubscribe/disconnect while the connection had ended or never fully established, surfacing "Connection is closed" errors during teardown.

Changes implemented
Client (apps/zflow/app/agents/page.tsx)
- Use ref for EventSource instead of state to avoid re-renders triggering effect:
  - Added: eventSourceRef; Removed stateful eventSource
- Narrowed SSE effect dependencies to only sessionId + userId + isActive:
  - Prevents reconnection on unrelated state changes (e.g., UI state, selectedAgent)
- One-time per-session verification/restore:
  - verifiedSessionIdRef ensures /api/agents/sessions check and restore run once per sessionId
- Exponential backoff reconnection in onerror:
  - 3s, 6s, 12s, capped at 30s; clears timer on cleanup
- Debounced/Idempotent session creation in dev/StrictMode:
  - sessionCreationInFlightRef and sessionCreatedKeyRef (userId:agentId) prevent duplicate POSTs
- Cleanup hardening:
  - Close existing EventSource and clear reconnect timers on unmount/session change

Server (apps/zflow/app/lib/agents/streaming.ts)
- Redis subscriber hardening:
  - Ensure connect() before subscribe when lazyConnect is enabled
  - Wrap unsubscribe() and disconnect() in try/catch to avoid noisy errors on teardown
  - Added error/end logging for better diagnostics

Files touched
- apps/zflow/app/agents/page.tsx
- apps/zflow/app/lib/agents/streaming.ts

Verification
- Load http://localhost:3000/agents in development:
  - Expect exactly one POST /api/agents/sessions on initial mount
  - Exactly one GET /api/agents/sessions?sessionId=... to verify/restore per session
  - One long-lived GET /api/agents/stream?sessionId=...; heartbeats every 30s
  - No repeated stream creations or frequent session checks
  - No recurring "Failed to subscribe: [Error: Connection is closed.]" logs
- Simulate transient network issues (DevTools → Offline/Online):
  - Observe reconnection with exponential backoff (3s → 6s → 12s ... capped at 30s)

Best practices documented
- Maintain a single EventSource per session; reconnect only on error/close with backoff
- Keep connection state in refs to avoid render-triggered reconnect loops
- Narrow effect dependencies to the minimal identity signals: sessionId and userId
- Send periodic heartbeat (30s) to keep SSE alive
- Guard idempotent flows (e.g., session creation) in dev/StrictMode
- Harden teardown of streaming resources (Redis subscriber unsubscribe/disconnect)

Follow-ups (recommended)
- [ ] Server idempotency for POST /api/agents/sessions
  - Accept client idempotency key (e.g., X-Idempotency-Key) and return existing session for the same key
- [ ] Telemetry/metrics for streaming
  - Counters: active SSE connections, reconnect attempts, average stream duration, error rates
  - Log rate-limited and backoff scenarios
- [ ] Add jitter to reconnection backoff (+/- 10%) to reduce thundering herd in multi-tab cases
- [ ] Add an automated test for SSE stability in dev
  - Ensure a single long-lived connection; verify backoff under simulated failures
- [ ] Consider a shared subscriber optimization (optional)
  - Reuse a subscriber or multiplex channels per connection under high load; evaluate trade-offs vs isolation
- [ ] Document StrictMode dev behavior in contributor docs and ensure idempotency in other agent flows

Lessons learned
- Storing EventSource in state combined with effect dependency on that state can create tight reconnect loops
- React StrictMode in dev will surface idempotency issues early; guard side effects accordingly
- Redis Pub/Sub teardown should be resilient to abrupt client state changes during streaming

References
- SSE API route: apps/zflow/app/api/agents/stream/route.ts
- Streaming service: apps/zflow/app/lib/agents/streaming.ts
- Agents page (client): apps/zflow/app/agents/page.tsx
- Related guides: guidance/AGENTS_STREAMING_GUIDE.md, guidance/AGENTS_TROUBLESHOOTING.md

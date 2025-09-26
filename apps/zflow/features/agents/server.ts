/**
 * Agents Feature - Server-only API Exports
 * 
 * This module exports server-side agents infrastructure that should not be
 * bundled on the client side (Redis, MCP, Node.js modules, etc.)
 * 
 * Import from '@/agents/server' in API routes and server-side code only.
 */

export * from './api'